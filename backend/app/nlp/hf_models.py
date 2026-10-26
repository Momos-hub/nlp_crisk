"""Lazy, budget-aware Hugging Face model manager.

* No model is downloaded or loaded at import time.
* Transformers/torch are OPTIONAL at runtime — deterministic fallbacks remain.
* LRU eviction caps resident models for small CPU-only environments.
"""
import threading
import time
from collections import OrderedDict

MODEL_SPECS = {
    "zeroshot": {"id": "typeform/distilbert-base-uncased-mnli", "task": "zero-shot-classification", "description": "Zero-shot clause classification (DistilBERT-MNLI)"},
    "ner": {"id": "dslim/distilbert-NER", "task": "token-classification", "description": "Named entity recognition (DistilBERT-NER)"},
    "summarizer": {"id": "sshleifer/distilbart-cnn-12-3", "task": "summarization", "description": "Abstractive summarization (DistilBART-CNN)"},
    "qa": {"id": "deepset/minilm-uncased-squad2", "task": "question-answering", "description": "Extractive question answering (MiniLM-SQuAD2)"},
    "embedder": {"id": "sentence-transformers/all-MiniLM-L6-v2", "task": "sentence-embedding", "description": "Semantic retrieval embeddings (all-MiniLM-L6-v2)"},
}

MAX_RESIDENT = 2


class _SentenceEncoder:
    """Mean-pool contextual token vectors to produce normalized sentence embeddings."""
    def __init__(self, model_id: str):
        from transformers import AutoModel, AutoTokenizer
        self.torch = __import__("torch")
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModel.from_pretrained(model_id)
        self.model.eval()

    def __call__(self, texts: list[str]):
        torch = self.torch
        batch = self.tokenizer(texts, padding=True, truncation=True, max_length=256, return_tensors="pt")
        with torch.no_grad():
            hidden = self.model(**batch).last_hidden_state
            mask = batch["attention_mask"].unsqueeze(-1).to(hidden.dtype)
            pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)
        return pooled.cpu()


class _ExtractiveQA:
    """Manual span inference for transformers releases without a QA pipeline."""
    def __init__(self, model_id: str):
        from transformers import AutoModelForQuestionAnswering, AutoTokenizer
        import torch
        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForQuestionAnswering.from_pretrained(model_id)
        self.model.eval()

    def __call__(self, question: str, context: str, handle_impossible_answer: bool = True, **_kw):
        torch = self.torch
        enc = self.tokenizer(question, context, return_tensors="pt", truncation=True, max_length=512, return_offsets_mapping=True)
        enc.pop("offset_mapping")
        input_ids = enc["input_ids"][0]
        if "token_type_ids" in enc:
            ctx_mask = enc["token_type_ids"][0] == 1
        else:
            sep_pos = (input_ids == self.tokenizer.sep_token_id).nonzero(as_tuple=True)[0]
            start_tok = (sep_pos[0].item() + 1) if len(sep_pos) else 1
            ctx_mask = torch.arange(len(input_ids)) >= start_tok
        with torch.no_grad():
            out = self.model(**enc)
        start_logits, end_logits = out.start_logits[0], out.end_logits[0]
        start_probs, end_probs = torch.softmax(start_logits, dim=-1), torch.softmax(end_logits, dim=-1)
        bad = ~ctx_mask
        start_logits = start_logits.masked_fill(bad, -1e9)
        end_logits = end_logits.masked_fill(bad, -1e9)
        outer = torch.softmax(start_logits, dim=-1).unsqueeze(1) * torch.softmax(end_logits, dim=-1).unsqueeze(0)
        mask = torch.triu(torch.ones_like(outer), diagonal=0) * torch.tril(torch.ones_like(outer), diagonal=29)
        flat = torch.argmax(outer * mask).item()
        s, e = divmod(flat, len(input_ids))
        score = float(start_probs[s] * end_probs[e])
        answer = self.tokenizer.decode(input_ids[s:e + 1], skip_special_tokens=True).strip()
        if handle_impossible_answer and (not answer or score < 0.04):
            return {"score": 1.0 - score, "answer": "", "start": 0, "end": 0}
        return {"score": score, "answer": answer, "start": s, "end": e}


class ModelManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._cache: OrderedDict = OrderedDict()
        self._status = {k: {"state": "cold", "seconds": 0.0, "error": None} for k in MODEL_SPECS}
        self._tf_available = None

    def transformers_available(self) -> bool:
        if self._tf_available is None:
            try:
                import transformers  # noqa: F401
                import torch  # noqa: F401
                self._tf_available = True
            except Exception:
                self._tf_available = False
        return self._tf_available

    def get(self, key: str):
        """Return a lazily initialized model; return None on download/runtime failure."""
        if key not in MODEL_SPECS or not self.transformers_available():
            return None
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            spec = MODEL_SPECS[key]
            self._status[key] = {"state": "loading", "seconds": 0.0, "error": None}
            t0 = time.time()
            try:
                import torch
                device = 0 if torch.cuda.is_available() else -1
                if spec["task"] == "sentence-embedding":
                    model = _SentenceEncoder(spec["id"])
                elif spec["task"] == "question-answering":
                    from transformers import pipeline
                    try:
                        model = pipeline(spec["task"], model=spec["id"], tokenizer=spec["id"], device=device)
                    except Exception:
                        model = _ExtractiveQA(spec["id"])
                else:
                    from transformers import pipeline
                    model = pipeline(spec["task"], model=spec["id"], tokenizer=spec["id"], device=device)
                elapsed = round(time.time() - t0, 2)
                self._cache[key] = model
                while len(self._cache) > MAX_RESIDENT:
                    evicted, _ = self._cache.popitem(last=False)
                    self._status[evicted] = {"state": "evicted", "seconds": self._status[evicted]["seconds"], "error": None}
                self._status[key] = {"state": "resident", "seconds": elapsed, "error": None}
                return model
            except Exception as exc:
                self._status[key] = {"state": "error", "seconds": round(time.time() - t0, 2), "error": str(exc)[:300]}
                return None

    def preload(self, key: str) -> bool:
        return self.get(key) is not None

    def status(self) -> dict:
        with self._lock:
            return {
                "transformers_available": self.transformers_available(),
                "models": {
                    k: {"model_id": MODEL_SPECS[k]["id"], "task": MODEL_SPECS[k]["task"],
                        "description": MODEL_SPECS[k]["description"], **self._status[k]}
                    for k in MODEL_SPECS
                },
                "resident": list(self._cache.keys()),
            }


manager = ModelManager()
