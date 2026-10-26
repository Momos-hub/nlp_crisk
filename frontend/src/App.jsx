import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import InputPanel from './components/InputPanel';
import AnalyzingCard from './components/AnalyzingCard';
import IntroOverlay from './components/IntroOverlay';
import SummaryStrip from './components/SummaryStrip';
import ClauseReview from './components/ClauseReview';
import FindingsTab from './components/FindingsTab';
import SummaryTab from './components/SummaryTab';
import AskTab from './components/AskTab';
import ExplainabilityTab from './components/ExplainabilityTab';
import HfModelsPanel from './components/HfModelsPanel';
import { analyzeText, analyzeFile, fetchHealth, fetchSamples, fetchSampleText } from './api';
import { Alert, Check } from './components/Icons';

export default function App() {
  const [engine, setEngine] = useState('fast');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('clauses');
  const [focus, setFocus] = useState({ id: null, n: 0 });
  const [health, setHealth] = useState(null);
  const [samples, setSamples] = useState([]);
  const [view, setView] = useState('home');
  // The story intentionally runs on every fresh app load/refresh.
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (!showIntro) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showIntro]);

  const closeIntro = useCallback(() => setShowIntro(false), []);
  const refreshHealth = useCallback(() => {
    fetchHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    refreshHealth();
    fetchSamples().then((result) => setSamples(result.samples || [])).catch(() => {});
  }, [refreshHealth]);

  const scrollTo = (id) => {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const runAnalysis = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      const result = payload.file
        ? await analyzeFile(payload.file, engine)
        : await analyzeText({ text: payload.text, filename: payload.filename, engine });
      setReport(result);
      setTab('clauses');
      setFocus({ id: null, n: 0 });
      setView('report');
      scrollTo('report');
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onSample = async (id) => {
    try {
      const sample = await fetchSampleText(id);
      setText(sample.text);
      await runAnalysis({ text: sample.text, filename: sample.filename });
    } catch (err) {
      setError(err.message || 'Could not load that sample.');
    }
  };

  const onNew = () => {
    setReport(null);
    setError(null);
    setText('');
    setFocus({ id: null, n: 0 });
    setView('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onHome = () => {
    setReport(null);
    setError(null);
    setText('');
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(report.meta?.filename || 'contract').replace(/\.[^.]+$/, '')}-risk-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openClause = (clauseId) => {
    setFocus((current) => ({ id: clauseId, n: current.n + 1 }));
    setTab('clauses');
    scrollTo('report-tabs');
  };

  const staticMode = health?.runtime_mode === 'static' || health?.runtime_mode === 'offline-fallback';
  const engineInfo = useMemo(() => {
    const deep = health?.engine?.transformers_available;
    const resident = health?.engine?.resident?.length || 0;
    if (!health) return { label: 'Connecting…', title: 'Checking the application server' };
    if (health.runtime_mode === 'static') return { label: 'Browser mode', title: 'Lightweight local rules; no API connection' };
    if (health.runtime_mode === 'offline-fallback') return { label: 'Offline fallback', title: 'Backend unavailable; browser rules are active' };
    return deep
      ? { label: 'API connected', title: `Single-server API · ${resident} model(s) warm` }
      : { label: 'API connected', title: 'Single-server API · fast local analysis' };
  }, [health]);

  const findingCount = report?.stats?.finding_count ?? 0;
  const tabs = [
    { id: 'clauses', label: 'Clause review', count: report?.stats?.clause_count ?? 0 },
    { id: 'findings', label: 'Risk findings', count: findingCount },
    { id: 'summary', label: 'Summary' },
    { id: 'explain', label: 'Explainability' },
    { id: 'ask', label: 'Ask the contract' },
  ];

  return (
    <>
      {view === 'home' ? (
        <LandingPage engineInfo={engineInfo} onEnter={() => { setView('input'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      ) : (
        <div id="top">
          <Header engineInfo={engineInfo} hasReport={!!report && view === 'report'} onNew={onNew} onHome={onHome} onExport={onExport} />
          <main className="wrap workspace-wrap">
            <section className="workspace-heading">
              <div className="eyebrow">CONTRACT WORKSPACE <span className="workspace-slash">/</span> {view === 'report' ? 'REVIEW' : 'NEW REVIEW'}</div>
              <div className="workspace-title-row">
                <div>
                  <h1>{view === 'report' ? 'Review the evidence.' : 'Bring a contract into focus.'}</h1>
                  <p>{view === 'report' ? 'Your analysis is ready. Explore the clause findings, trace the score, or ask a source-linked question.' : 'Add your document once. The analysis and review stay together in this application.'}</p>
                </div>
                <div className="workspace-stepper" aria-label={view === 'report' ? 'Step 2 of 2' : 'Step 1 of 2'}>
                  <span className={view === 'input' ? 'current' : 'complete'}>{view === 'report' ? <Check /> : '01'}</span>
                  <i />
                  <span className={view === 'report' ? 'current' : ''}>02</span>
                </div>
              </div>
              <div className="workspace-step-labels"><span>{view === 'report' ? 'Contract added' : 'Add contract'}</span><span>{view === 'report' ? 'Review findings' : 'Review findings'}</span></div>
            </section>

            {staticMode && (
              <div className="scope-note static-mode-note">
                <Alert /> <span><strong>{health.runtime_mode === 'static' ? 'Static browser mode.' : 'Backend API not detected.'}</strong> Browser-side rules are active. For PDF/DOCX parsing and model-backed features, run this frontend with its FastAPI backend on the same server.</span>
              </div>
            )}

            {view === 'input' && (
              <>
                <InputPanel
                  staticMode={staticMode}
                  hfAvailable={health?.engine?.transformers_available === true}
                  text={text}
                  setText={setText}
                  engine={engine}
                  setEngine={setEngine}
                  samples={samples}
                  busy={busy}
                  onAnalyze={() => {
                    if (text.trim().length < 40) {
                      setError('Please paste a contract of at least ~40 characters, or use Upload / Samples.');
                      return;
                    }
                    runAnalysis({ text, filename: 'pasted-text' });
                  }}
                  onUpload={(file) => runAnalysis({ file })}
                  onSample={onSample}
                />
                {!staticMode && <HfModelsPanel health={health} onRefresh={refreshHealth} />}
                {error && <div className="banner banner-error" role="alert"><Alert /> {error}</div>}
                {busy && <div style={{ marginTop: 14 }}><AnalyzingCard /></div>}
                <div className="workspace-privacy"><span className="privacy-dot" /> One application server handles the interface and API; no external database is required.</div>
              </>
            )}

            {view === 'report' && report && !busy && (
              <div id="report">
                <SummaryStrip report={report} />
                <div className="tabs" id="report-tabs" role="tablist" aria-label="Report sections">
                  {tabs.map((item) => (
                    <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
                      {item.label}{item.count != null && <span className="count">{item.count}</span>}
                    </button>
                  ))}
                </div>
                <div className="tab-body" role="tabpanel" key={tab}>
                  {tab === 'clauses' && <ClauseReview clauses={report.clauses} focusId={focus.id} focusKey={focus.n} />}
                  {tab === 'findings' && <FindingsTab clauses={report.clauses} onOpenClause={openClause} />}
                  {tab === 'summary' && <SummaryTab report={report} />}
                  {tab === 'explain' && <ExplainabilityTab report={report} onOpenClause={openClause} />}
                  {tab === 'ask' && <AskTab clauses={report.clauses} report={report} engine={engine} onOpenClause={openClause} generation={health?.generation} staticMode={staticMode} />}
                </div>
              </div>
            )}

            <footer className="footer workspace-footer">
              <span>ClauseRisk · Evidence-first contract review</span>
              <button type="button" className="linkish" onClick={() => setShowIntro(true)}>Replay introduction</button>
            </footer>
          </main>
        </div>
      )}
      {showIntro && <IntroOverlay onDone={closeIntro} />}
    </>
  );
}
