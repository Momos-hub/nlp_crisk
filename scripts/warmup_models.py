"""Warm the two most valuable HF models (QA + zero-shot) in the background."""
import json, time, sys
sys.path.insert(0, "/home/user/legal-doc-intel/backend")
from app.nlp.hf_models import manager

print("transformers_available:", manager.transformers_available(), flush=True)
for key in ("qa", "zeroshot"):
    t0 = time.time()
    ok = manager.preload(key)
    print(f"{key}: loaded={ok} in {time.time()-t0:.1f}s", flush=True)
print(json.dumps(manager.status()["models"], indent=2), flush=True)
print("WARMUP_DONE", flush=True)
