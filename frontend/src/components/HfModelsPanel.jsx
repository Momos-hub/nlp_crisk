import { useState } from 'react';
import { loadModel } from '../api';
import { Check } from './Icons';

const STATE_PILL = {
  resident: 'pill-LOW',
  loading: 'pill-MEDIUM',
  cold: '',
  evicted: '',
  error: 'pill-CRITICAL',
};

/**
 * HfModelsPanel — LIVE Hugging Face integration, made visible.
 * Shows the real HF Hub model IDs, their live state (cold / loading / resident / error),
 * load times, and lets the user warm any model on demand (POST /api/models/load).
 */
export default function HfModelsPanel({ health, onRefresh }) {
  const [busyKey, setBusyKey] = useState(null);
  const models = health?.engine?.models || {};
  const keys = Object.keys(models);
  const available = health?.engine?.transformers_available;
  const generation = health?.generation;
  const localMode = health?.runtime_mode === 'static' || health?.runtime_mode === 'offline-fallback';

  const warm = async (key) => {
    setBusyKey(key);
    try {
      await loadModel(key);
      onRefresh?.();
    } catch (e) {
      // state will show the error after refresh
      onRefresh?.();
    } finally {
      setBusyKey(null);
    }
  };

  if (localMode) return (
    <div className="panel panel-pad hf-panel static-capability-card">
      <div className="eyebrow">Runtime capability</div>
      <div className="panel-title">{health.runtime_mode === 'static' ? 'Standalone static package' : 'Browser fallback active'}</div>
      <p className="panel-sub">No model downloads or backend are used in this mode. Contract review uses lightweight local patterns and a bundled concept glossary. PDF/DOCX extraction, transformer classifiers and hosted answer generation require the separate Python API.</p>
      <div className="small muted">{health.runtime_mode === 'static' ? 'Static build · app and samples work under a subpath.' : 'The API could not be reached. You can still paste text, analyze TXT/MD, use samples, and ask local questions.'}</div>
    </div>
  );

  return (
    <details className="panel panel-pad hf-panel">
      <summary>
          <span className="hf-hub-mark">ML</span>
          <span className="panel-title" style={{ marginBottom: 0 }}>Optional model runtime</span>
        <span className="panel-sub" style={{ margin: 0 }}>
          {available ? 'task models · Hugging Face Hub' : 'transformers not loaded on this server'}
        </span>
        <span className="spacer" />
        <span className="small muted">{keys.length} models</span>
      </summary>

      <div className="hf-list">
        {keys.map((k) => {
          const m = models[k];
          const state = m.state || 'cold';
          const isBusy = busyKey === k || state === 'loading';
          return (
            <div key={k} className="hf-model-row">
              <div className="flex1">
                <div className="hf-id">{m.model_id}</div>
                <div className="small muted">
                  {m.task}
                  {m.seconds > 0 && state === 'resident' ? ` · loaded in ${m.seconds}s` : ''}
                  {state === 'error' && m.error ? ` · ${String(m.error).slice(0, 90)}` : ''}
                </div>
              </div>
              <span className={`pill ${STATE_PILL[state] || ''}`}>
                {state === 'resident' && <Check />}
                <span className="d" />{state}
              </span>
              {state === 'cold' || state === 'evicted' || state === 'error' ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={isBusy || !available}
                  onClick={() => warm(k)}
                >
                  {isBusy ? 'Loading…' : 'Load model'}
                </button>
              ) : (
                <span className="small muted nowrap" style={{ width: 96, textAlign: 'right' }}>
                  {state === 'resident' ? 'warm ✓' : '…'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="hf-generation-row">
        <div className="flex1">
          <div className="hf-id">{generation?.model || 'Qwen/Qwen2.5-7B-Instruct'}</div>
          <div className="small muted">Conversational answer generation · optional hosted inference</div>
        </div>
        <span className={`pill ${generation?.available ? 'pill-LOW' : ''}`}>
          <span className="d" />{generation?.available ? 'configured' : 'needs HF_TOKEN'}
        </span>
      </div>
      {!available && <div className="scope-note model-capability-note"><span><strong>Lightweight mode is active.</strong> This server does not have PyTorch + Transformers installed, so the report uses the built-in deterministic analysis stages. Add the optional model runtime only if the host has enough RAM and you want to manage model downloads.</span></div>}
      <div className="small muted" style={{ marginTop: 10 }}>
        Model weights download only after an explicit Load model action; the cache keeps at most two models resident. Hosted answer generation is separately opt-in. Do not send confidential contract text to an external provider without approval.
      </div>
    </details>
  );
}
