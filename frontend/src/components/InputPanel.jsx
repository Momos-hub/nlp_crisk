import { useRef, useState } from 'react';
import { Upload, Doc, Check } from './Icons';

const ENGINES = [
  { id: 'auto', label: 'Hybrid — available models + deterministic checks' },
  { id: 'fast', label: 'Fast — deterministic checks (no model downloads)' },
  { id: 'deep', label: 'Deep — task models (may download weights; higher RAM)' },
];

export default function InputPanel({
  text, setText, engine, setEngine, samples,
  onAnalyze, onUpload, onSample, busy, staticMode = false, hfAvailable = false,
}) {
  const [tab, setTab] = useState('paste');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const takeFile = (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Please choose a file under 8 MB.'); return; }
    if (staticMode ? /\.(txt|md)$/i.test(file.name) : /\.(txt|md|pdf|docx)$/i.test(file.name)) onUpload(file);
    else alert(staticMode ? 'Browser-only mode supports .txt and .md. PDF and DOCX need the Python backend.' : 'Please upload a .txt, .md, .pdf or .docx file.');
  };

  return (
    <section className="panel panel-pad" id="analyze">
      <div className="panel-title">Analyze a contract</div>
      <div className="panel-sub">{staticMode ? 'Paste contract text or try a bundled sample. TXT/MD uploads are supported in browser-only mode.' : 'Paste text, upload a document, or start from a sample.'}</div>

      <div className="input-row">
        <div className="seg" role="tablist" aria-label="Input method">
          {[
            { id: 'paste', label: 'Paste text' },
            { id: 'upload', label: 'Upload file' },
            { id: 'samples', label: 'Samples' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`seg-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'paste' && (
          <textarea
            className="field"
            placeholder="Paste a contract, NDA, SLA, MSA, policy…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck="false"
            aria-label="Contract text"
          />
        )}

        {tab === 'upload' && (
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              takeFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <Upload />
            <strong>Click or drag a file here</strong>
            <div className="hint">{staticMode ? 'TXT or MD only — analyzed locally in your browser; PDF/DOCX require the backend.' : 'PDF, DOCX, TXT or MD — up to 8 MB. The file is parsed and analyzed immediately.'}</div>
            <input
              ref={fileRef}
              type="file"
              accept={staticMode ? '.txt,.md' : '.pdf,.docx,.txt,.md'}
              hidden
              onChange={(e) => takeFile(e.target.files?.[0])}
            />
          </div>
        )}

        {tab === 'samples' && (
          <div className="sample-list">
            {(samples.length ? samples : [
              { id: 'saas-msa', title: 'SaaS Master Services Agreement', description: 'Heavily one-sided vendor contract' },
            ]).map((s) => (
              <button key={s.id} type="button" className="sample-item" onClick={() => onSample(s.id)}>
                <span>
                  <span className="t">{s.title}</span>
                  <span className="d" style={{ display: 'block' }}>{s.description}</span>
                </span>
                <span className="tag">
                  <Doc /> {s.word_count ? `${s.word_count} words` : 'sample'}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="input-actions">
          <div className="small muted">
            {staticMode
              ? <><Check /> Local heuristic review; do not treat scores as legal probabilities or advice.</>
              : tab === 'upload' || tab === 'samples'
                ? <><Check /> Selections are analyzed immediately.</>
                : 'Multi-stage review: clause segmentation, local classification, risk patterns, cross-clause checks, entities, summary and source-grounded retrieval.'}
          </div>
          <div className="right">
            <select
              className="field engine-select"
              value={staticMode ? 'fast' : engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={staticMode}
              aria-label="NLP engine"
            >
              {staticMode
                ? <option value="fast">Browser-side rules only</option>
                : hfAvailable
                  ? ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)
                  : <option value="fast">Fast — rules only (instant)</option>}
            </select>
            {tab === 'paste' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || text.trim().length < 40}
                title={text.trim().length < 40 ? 'Paste at least ~40 characters' : 'Analyze the pasted contract'}
                onClick={onAnalyze}
              >
                {busy ? 'Analyzing…' : 'Analyze document'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
