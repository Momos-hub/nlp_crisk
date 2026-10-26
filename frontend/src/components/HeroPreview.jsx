/**
 * HeroPreview — animated mock of the report, shown beside the headline.
 * Decorative (aria-hidden) but honest: mirrors the real report structure.
 * Pure CSS motion, respects prefers-reduced-motion via the global rule.
 */
export default function HeroPreview() {
  return (
    <div className="hero-preview panel" aria-hidden="true">
      <div className="hp-top">
        <span className="hp-file">Illustrative sample · sample-saas-msa</span>
        <span className="pill pill-HIGH"><span className="d" />HIGH RISK</span>
      </div>

      <div className="hp-score">
        <div className="hp-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke="var(--high)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * 0.28}
              transform="rotate(-90 32 32)"
              className="hp-ring-val"
            />
          </svg>
          <span className="hp-ring-n">72</span>
        </div>
        <div>
          <div className="hp-label">Document risk index</div>
          <div className="hp-sub">16 clauses · 26 findings · 4 entities</div>
        </div>
      </div>

      {[
        { t: 'Payment & Fees', sev: 'HIGH', w: '78%', d: '0.15s' },
        { t: 'Termination', sev: 'HIGH', w: '66%', d: '0.28s' },
        { t: 'Confidentiality', sev: 'LOW', w: '18%', d: '0.41s' },
      ].map((r) => (
        <div key={r.t} className="hp-row" style={{ animationDelay: r.d }}>
          <span className={`hp-dot ${r.sev}`} />
          <span className="hp-row-t">{r.t}</span>
          <span className="hp-bar">
            <i
              className={r.sev}
              style={{ width: r.w, animationDelay: r.d }}
            />
          </span>
          <span className={`pill pill-${r.sev}`}><span className="d" />{r.sev}</span>
        </div>
      ))}

      <div className="hp-chat">
        <div className="hp-q">What is the liability cap?</div>
        <div className="hp-a">
          Customer liability is <b>without limitation</b>…
          <span className="hp-src">↗ C010 · Limitation of Liability</span>
        </div>
      </div>
    </div>
  );
}
