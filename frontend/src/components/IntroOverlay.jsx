import { useEffect, useState } from 'react';

const STEPS = [
  { kicker: '01 · INGEST', title: 'A contract becomes a map.', sub: 'Drop in the agreement. The system turns its structure into navigable clauses.' },
  { kicker: '02 · UNDERSTAND', title: 'Find the terms that matter.', sub: 'Classify provisions, obligations and dates—then surface patterns worth checking.' },
  { kicker: '03 · EXPLAIN', title: 'Every flag has a reason.', sub: 'Trace a review signal to the exact words, scoring factors, and limits of the analysis.' },
  { kicker: '04 · CONNECT', title: 'Read clauses in context.', sub: 'Spot potential interactions—like a liability cap and an indemnity carve-out.' },
  { kicker: '05 · ASK', title: 'Then ask it in your own words.', sub: 'Follow the evidence across clauses; weak matches are called out instead of treated as certainty.' },
];

export default function IntroOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;

  useEffect(() => {
    // Keep the introduction sequence on every page load. Reduced-motion users still see
    // each scene, while the global CSS removes the movement effects.
    const timer = window.setTimeout(() => {
      if (step < last) setStep((n) => Math.min(last, n + 1));
      else onDone();
    }, step < last ? 1650 : 1900);
    return () => window.clearTimeout(timer);
  }, [step, last, onDone]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const next = () => {
    if (step === last) onDone();
    else setStep((n) => Math.min(last, n + 1));
  };

  return (
    <div className="cin-overlay" role="dialog" aria-modal="true" aria-label="ClauseRisk product introduction">
      <div className="cin-card">
        <div className="cin-topbar">
          <div className="cin-brand"><span className="cin-brandmark">CR</span><span>CLAUSERISK <i>INTELLIGENCE</i></span></div>
          <button type="button" className="cin-skip" onClick={onDone}>Skip story <span>↗</span></button>
        </div>

        <div className="cin-layout">
          <section className="cin-copy" aria-live="polite">
            <span className="cin-kicker">{STEPS[step].kicker}</span>
            <div className="cin-heads">
              {STEPS.map((s, i) => (
                <div key={s.kicker} className={`cin-head ${i === step ? 'active' : ''}`}>
                  <h1>{s.title}</h1><p>{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="cin-controls">
              <div className="cin-dots" role="group" aria-label="Introduction scenes">
                {STEPS.map((s, i) => (
                  <button key={s.kicker} type="button" className={`cin-dot ${i === step ? 'active' : ''}`} onClick={() => setStep(i)} aria-label={`Go to scene ${i + 1}`} aria-current={i === step ? 'step' : undefined} />
                ))}
              </div>
              <button type="button" className="cin-next" onClick={next}>{step === last ? 'Explore the report' : 'Next'} <span>→</span></button>
            </div>
            <div className="cin-tiny">An explainable, evidence-first contract review prototype · Not legal advice</div>
          </section>

          <div className="cin-stage" data-scene={step} aria-hidden="true">
            <div className="cin-grid" />
            <div className="cin-orbit orbit-a" /><div className="cin-orbit orbit-b" />
            <div className="cin-scene cin-scene-0">
              <div className="cin-upload-ring"><span>DROP</span><b>PDF</b><i>DOCX</i></div>
              <div className="cin-paper paper-back"><span /><span /><span /><span /></div>
              <div className="cin-paper paper-front"><div className="paper-label">MASTER SERVICE AGREEMENT</div><span /><span /><mark /><span /><span /></div>
              <div className="cin-filetag">contract.pdf <em>· ready</em></div>
              <div className="cin-spark spark-one">✳</div><div className="cin-spark spark-two">✦</div>
            </div>
            <div className="cin-scene cin-scene-1">
              <div className="cin-doc-tilt">
                <div className="cin-doc-head"><b>AGREEMENT</b><small>16 clauses</small></div>
                {[['01','Payment & fees','mint'],['02','Term & renewal','amber'],['03','Liability','coral'],['04','Confidentiality','blue']].map(([n, label, tone]) => <div key={n} className={`cin-clause ${tone}`}><i>{n}</i><span>{label}<small>identified provision</small></span><b>✓</b></div>)}
              </div>
              <div className="cin-scanline" />
              <div className="cin-type-chip">FAST RULES <span>· clause triage</span></div>
            </div>
            <div className="cin-scene cin-scene-2">
              <div className="cin-explain-doc"><b>LIMITATION OF LIABILITY</b><p>Customer liability shall be <mark>without limitation</mark> of liability...</p><div className="cin-underline" /></div>
              <svg className="cin-connectors" viewBox="0 0 440 300" preserveAspectRatio="none" aria-hidden="true"><path d="M155 108 C 195 108, 204 80, 246 80"/><path d="M155 108 C 195 108, 204 220, 246 220"/></svg>
              <div className="cin-callout callout-rule"><i>01</i><span><b>Detected signal</b><small>uncapped customer exposure</small></span></div>
              <div className="cin-callout callout-score"><i>02</i><span><b>Risk contribution</b><small>HIGH · rule-based triage</small></span></div>
              <div className="cin-evidence-chip">EVIDENCE · exact text linked</div>
            </div>
            <div className="cin-scene cin-scene-3">
              <div className="cin-link-node node-liab"><i>§</i><span>Liability cap</span></div>
              <div className="cin-link-line" aria-hidden="true" />
              <div className="cin-link-node node-indem"><i>¶</i><span>Indemnity</span></div>
              <div className="cin-review-card"><span className="review-eyebrow">CROSS-CLAUSE CHECK</span><b>Do indemnity claims sit outside the cap?</b><small>Two source clauses · reviewer verification needed</small></div>
              <div className="cin-review-badge">HUMAN REVIEW PROMPT</div>
            </div>
            <div className="cin-scene cin-scene-4">
              <div className="cin-chat-user">Does the cap cover indemnity?</div>
              <div className="cin-chat-answer"><div className="cin-answer-mark">CR</div><p>The liability clause sets a cap, but the indemnity clause may carve out some claims. Review both provisions together.</p><div className="cin-cites"><span>§ C010 · Liability</span><span>§ C011 · Indemnification</span></div></div>
              <div className="cin-chat-foot"><i /><span>ANSWER GROUNDED IN DOCUMENT</span><b>✓</b></div>
              <div className="cin-orbit-label">RETRIEVE <b>·</b> EXPLAIN <b>·</b> CITE</div>
            </div>
            <div className="cin-stage-index"><span>0{step + 1}</span> / 05</div>
          </div>
        </div>
      </div>
    </div>
  );
}
