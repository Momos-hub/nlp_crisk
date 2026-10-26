import { Chevron, Check, Scale } from './Icons';

export default function LandingPage({ onEnter, engineInfo }) {
  const live = engineInfo?.label && !/offline|loading|static/i.test(engineInfo.label);
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" onClick={(event) => event.preventDefault()}>
          <span className="landing-mark"><Scale /></span>
          <span>CLAUSERISK <i>INTELLIGENCE</i></span>
        </a>
        <span className={`landing-status ${live ? 'is-live' : ''}`}>
          <i /> {engineInfo?.label || 'Checking service'}
        </span>
      </header>

      <main className="landing-main" id="top">
        <section className="landing-copy">
          <div className="landing-eyebrow"><span>CONTRACT REVIEW WORKSPACE</span><i /></div>
          <h1>A clearer first read of every contract.</h1>
          <p className="landing-lede">Turn dense agreements into a focused review: see the wording behind each flag, follow questions across clauses, and keep the work in one place.</p>
          <button className="landing-cta" type="button" onClick={onEnter}>
            Enter the workspace <Chevron />
          </button>
          <div className="landing-assurance"><Check /> One application · one server · no separate database</div>
        </section>

        <section className="landing-visual" aria-label="Contract review steps">
          <div className="visual-glow" />
          <div className="visual-topline"><span>THE REVIEW FLOW</span><span>01 — 03</span></div>
          <div className="review-sheet">
            <div className="sheet-head"><span className="sheet-icon"><Scale /></span><span><b>Agreement review</b><small>Evidence before conclusions</small></span><i className="sheet-status">READY</i></div>
            <div className="sheet-rule" />
            <div className="flow-step"><span className="flow-num">01</span><span className="flow-text"><b>Add a contract</b><small>Paste text or upload a document</small></span><span className="flow-node done"><Check /></span></div>
            <div className="flow-connector" />
            <div className="flow-step"><span className="flow-num">02</span><span className="flow-text"><b>Inspect the evidence</b><small>Review clauses, flags, and rationale</small></span><span className="flow-node">02</span></div>
            <div className="flow-connector" />
            <div className="flow-step"><span className="flow-num">03</span><span className="flow-text"><b>Ask a follow-up</b><small>Get answers linked to source clauses</small></span><span className="flow-node">03</span></div>
            <div className="sheet-foot"><span className="foot-orb" />Documents are processed by this application server</div>
          </div>
          <div className="visual-index"><b>01</b><span> / START HERE</span></div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>ClauseRisk · Evidence-first contract review</span>
        <span>Educational prototype · Not legal advice</span>
      </footer>
    </div>
  );
}
