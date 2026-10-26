import { useEffect, useState } from 'react';
import { Check } from './Icons';

const SEV_COLOR = {
  LOW: 'var(--low)',
  MEDIUM: 'var(--medium)',
  HIGH: 'var(--high)',
  CRITICAL: 'var(--critical)',
};

/** Smooth count-up (cubic ease-out) for score + stats. */
function useCountUp(target, dur = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setV(target); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

/** Score ring + key stats — the single summary block above the tabs. */
export default function SummaryStrip({ report }) {
  const idx = report.risk_index?.index ?? 0;
  const severity = report.risk_index?.severity ?? 'LOW';
  const [drawn, setDrawn] = useState(false);
  const shownScore = useCountUp(idx, 1100);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const R = 36;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, idx / 100));
  const color = SEV_COLOR[severity];

  const criticals = (report.stats?.severity_distribution?.CRITICAL || 0)
    + (report.stats?.severity_distribution?.HIGH || 0);

  const stats = [
    { k: 'Clauses', v: report.stats?.clause_count ?? 0 },
    { k: 'Risk flags', v: report.stats?.finding_count ?? 0 },
    { k: 'High / critical', v: criticals },
    { k: 'Entities', v: (report.entities?.entities || []).length },
  ];

  return (
    <div className="report-head fade-in">
      <div className="panel score-card panel-acc">
        <div className="score-ring">
          <svg width="86" height="86" viewBox="0 0 86 86">
            <circle cx="43" cy="43" r={R} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="43" cy="43" r={R} fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={drawn ? CIRC * (1 - pct) : CIRC}
              style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </svg>
          <div className="val" style={{ color }}>{shownScore.toFixed(0)}</div>
        </div>
        <div className="score-meta">
          <div className="label">Document risk</div>
          <div className="sev" style={{ color }}>{severity}</div>
          <div className="sub">
            {severity === 'LOW' ? (
              <><Check /> Well-balanced document · </> 
            ) : null}
            Risk score {idx.toFixed(1)} / 100
            {report.risk_index?.gap_factor > 1 && report.gaps?.length
              ? ` · ${report.gaps.length} missing protection${report.gaps.length > 1 ? 's' : ''}`
              : ''}
          </div>
        </div>
      </div>

      <div className="panel stats-card">
        {stats.map((s) => (
          <Stat key={s.k} label={s.k} value={s.v} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  const v = useCountUp(Number(value) || 0, 900);
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v">{Math.round(v)}</div>
    </div>
  );
}
