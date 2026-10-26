import { analyzeStatic, askStatic, staticSample, staticSampleList } from './staticEngine.js';

const VITE_ENV = import.meta.env || {};
const STATIC_BUILD = VITE_ENV.MODE === 'static';
const BASE = (VITE_ENV.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const OFFLINE_HEALTH = {
  status: 'ok',
  runtime_mode: 'offline-fallback',
  engine: { transformers_available: false, resident: [], mode: 'browser-fallback' },
  generation: { available: false, provider: null, reason: 'Backend API is not reachable.' },
  message: 'Backend unavailable. Browser-side fallback is active.',
};

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (Array.isArray(body.detail)) detail = body.detail.map((d) => d.msg || d.type || 'Invalid input').join('; ');
      else detail = body.detail || JSON.stringify(body);
    } catch (_) { /* keep statusText */ }
    const error = new Error(typeof detail === 'string' ? detail : 'Request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function shouldFallback(error) {
  return !error?.status || error.status === 404 || error.status >= 500;
}

async function request(path, options) {
  const response = await fetch(`${BASE}${path}`, options);
  return handle(response);
}

export async function analyzeText({ text, filename = 'pasted-text', engine = 'auto' }) {
  if (STATIC_BUILD) return analyzeStatic(text, filename);
  try {
    return await request('/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, filename, engine }),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return analyzeStatic(text, filename);
  }
}

export async function analyzeFile(file, engine = 'auto') {
  if (STATIC_BUILD) return analyzeBrowserFile(file);
  const form = new FormData();
  form.append('file', file);
  form.append('engine', engine);
  try {
    return await request('/analyze/upload', { method: 'POST', body: form });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return analyzeBrowserFile(file);
  }
}

async function analyzeBrowserFile(file) {
  if (!/\.(txt|md)$/i.test(file.name)) {
    throw new Error('Browser-only mode can read .txt and .md files. PDF and DOCX extraction requires the backend; paste the text or use the full backend app.');
  }
  return analyzeStatic(await file.text(), file.name);
}

export async function askQuestion({ question, clauses, engine = 'auto', scope = 'contract', history = [] }) {
  if (STATIC_BUILD) return askStatic({ question, clauses, scope, history });
  try {
    return await request('/qa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, clauses, engine, scope, history }),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return askStatic({ question, clauses, scope, history });
  }
}

export async function fetchSamples() {
  if (STATIC_BUILD) return { samples: staticSampleList() };
  try { return await request('/samples'); }
  catch (_) { return { samples: staticSampleList() }; }
}

export async function fetchSampleText(id) {
  if (STATIC_BUILD) return staticSample(id);
  try { return await request(`/samples/${encodeURIComponent(id)}`); }
  catch (error) {
    if (!shouldFallback(error)) throw error;
    return staticSample(id);
  }
}

export async function fetchHealth() {
  if (STATIC_BUILD) return { ...OFFLINE_HEALTH, runtime_mode: 'static' };
  try { return await request('/health'); }
  catch (_) { return OFFLINE_HEALTH; }
}

export async function loadModel(model) {
  if (STATIC_BUILD) throw new Error('Transformer models require the separately hosted Python backend. Static mode uses a lightweight in-browser rules engine.');
  return request('/models/load', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
}
