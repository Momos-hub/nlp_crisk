import { useMemo, useState } from 'react';
import { Check } from './Icons';

const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** All risk findings across the document, flat and sortable — click to open the clause. */
export default function FindingsTab({ clauses, onOpenClause }) {
  const [sev, setSev] = useState('ALL');

  const findings = useMemo(() => {
    const out = [];
    (clauses || []).forEach((c) => {
      (c.risk?.findings || []).forEach((f) => {
        out.push({ ...f, clause_id: c.id, heading: c.heading, clause_score: c.risk.score });
      });
    });
    out.sort((a, b) =>
      (SEV_RANK[a.severity] - SEV_RANK[b.severity]) || (a.clause_id < b.clause_id ? -1 : 1));
    return sev === 'ALL' ? out : out.filter((f) => f.severity === sev);
  }, [clauses, sev]);

  const counts = useMemo(() => {
    const m = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    (clauses || []).forEach((c) => (c.risk?.findings || []).forEach((f) => { m[f.severity] = (m[f.severity] || 0) + 1; }));
    return m;
  }, [clauses]);

  return (
    <div>
      <div className="filters">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
          <button
            key={s}
            type="button"
            className={`sug ${sev === s ? 'active' : ''}`}
            onClick={() => setSev(s)}
          >
            {s === 'ALL' ? `All (${Object.values(counts).reduce((a, b) => a + b, 0)})`
              : `${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {findings.map((f, i) => (
        <button
          key={`${f.clause_id}-${f.pattern_id}-${i}`}
          type="button"
          className={`f-row finding-${f.severity}`}
          style={{ borderLeftColor: `var(--${f.severity === 'CRITICAL' ? 'critical' : f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : 'low'})` }}
          onClick={() => onOpenClause(f.clause_id)}
        >
          <span className={`pill pill-${f.severity}`}><span className="d" />{f.severity}</span>
          <span className="ref">{f.clause_id}</span>
          <span className="tag-type">{f.bucket_label}</span>
          <span className="ev">“{f.evidence}”</span>
          <span className="sug"><strong>Suggested redline: </strong>{f.suggestion}</span>
        </button>
      ))}
      {findings.length === 0 && (
        <div className="panel panel-pad muted small">
          <Check /> No findings at this severity — switch filters above to see others.
        </div>
      )}
    </div>
  );
}
