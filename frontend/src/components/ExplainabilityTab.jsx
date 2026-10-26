import { Check, Alert } from './Icons';

const FACTORS = [
  ['pattern_points', 'Matched risk patterns'],
  ['type_base', 'Clause-type baseline'],
  ['imbalance_penalty', 'Obligation imbalance'],
  ['length_penalty', 'Long-clause complexity'],
];

/** Transparent view of the deterministic risk score and cross-clause prompts. */
export default function ExplainabilityTab({ report, onOpenClause }) {
  const risk = report.risk_index || {};
  const clauses = report.clauses || [];
  const flagged = clauses.filter((c) => c.risk?.findings?.length).length;
  const interactions = report.interactions || [];
  const staticRules = report.meta?.runtime_mode === 'static' || report.stats?.engine_mode === 'static';

  return (
    <div className="explain-stack">
      <section className="panel panel-pad">
        <div className="eyebrow">Decision transparency</div>
        <h2 className="panel-title">How the document score is built</h2>
        <p className="panel-sub explain-lede">
          This is a deterministic triage score—not a legal-risk probability or a model confidence score.
          Each finding is linked to a phrase in the contract and a visible rule rationale.
        </p>
        <div className="formula-box">
          {staticRules ? (
            <>
              <span>Browser rules: clause score =</span>
              <strong>clause-type baseline + matched pattern points + visible length / wording adjustments</strong>
              <span>Document index =</span>
              <strong>(0.55 × word-weighted clause scores + 0.45 × top-three mean) × gap factor</strong>
            </>
          ) : (
            <>
              <span>Document index =</span>
              <strong>0.55 × length-weighted clause risk</strong>
              <span>+</span>
              <strong>0.45 × mean of top three clause scores</strong>
              <span>then adjusted by</span>
              <strong>missing-protection gap factor</strong>
            </>
          )}
        </div>
        {staticRules && <div className="small muted explain-foot">Static mode uses pattern matches and simple section heuristics. A missing term creates a review prompt; it does not prove a protection is absent from the deal or that the agreement is legally risky.</div>}
        <div className="explain-metrics">
          <Metric label="Length-weighted risk" value={risk.weighted_clause_risk ?? '—'} />
          <Metric label="Top-clause concentration" value={risk.top_clause_concentration ?? '—'} />
          <Metric label="Gap multiplier" value={risk.gap_factor ?? '—'} />
          <Metric label="Clauses with matched flags" value={`${flagged} / ${clauses.length}`} />
        </div>
        <div className="small muted explain-foot">
          The index prioritizes review; it is not calibrated against legal outcomes. Always verify the cited text.
        </div>
      </section>

      {interactions.length > 0 && (
        <section className="panel panel-pad">
          <div className="eyebrow">Cross-clause review prompts</div>
          <h2 className="panel-title">Relationships worth checking</h2>
          <p className="panel-sub explain-lede">
            These are explicit text-pattern matches across clauses, not conclusions about legal effect.
          </p>
          <div className="interaction-list">
            {interactions.map((item) => (
              <article className="interaction-card" key={item.id}>
                <div className="row-between">
                  <span className={`pill pill-${item.severity}`}><span className="d" />{item.severity}</span>
                  <span className="small muted">{item.method}</span>
                </div>
                <h3>{item.label}</h3>
                <p>{item.why}</p>
                <div className="interaction-sources">
                  {item.evidence.map((ev) => (
                    <button
                      key={`${item.id}-${ev.clause_id}`}
                      type="button"
                      className="interaction-source"
                      onClick={() => onOpenClause(ev.clause_id)}
                    >
                      <b>{ev.clause_id}</b><span>{ev.text}</span><span className="source-arrow">↗</span>
                    </button>
                  ))}
                </div>
                <div className="small muted interaction-note"><Alert /> {item.confidence_note}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel panel-pad">
        <div className="eyebrow">Clause-level explanation</div>
        <h2 className="panel-title">What drives each clause score</h2>
        <p className="panel-sub explain-lede">
          Open a clause in Clause review to see quoted evidence and its pattern rationale. Here is the score-component view:
        </p>
        <div className="component-list">
          {clauses.filter((c) => c.risk?.findings?.length || c.risk?.score > 0)
            .sort((a, b) => b.risk.score - a.risk.score).slice(0, 8).map((c) => (
              <button className="component-row" key={c.id} onClick={() => onOpenClause(c.id)} type="button">
                <span className={`pill pill-${c.risk.severity}`}><span className="d" />{c.risk.severity}</span>
                <span className="component-name"><b>{c.id} · {c.heading}</b><small>{c.clause_label} · {c.classification_engine} classifier</small></span>
                <span className="component-score">{c.risk.score}</span>
                <span className="component-expand">
                  {FACTORS.map(([key, label]) => {
                    const value = c.risk.components?.[key] || 0;
                    if (!value) return null;
                    return <small key={key}>{label}: +{value}</small>;
                  })}
                  {c.risk.components?.severity_floor_applied && <small>Minimum severity floor applied</small>}
                  {Object.entries(c.classification_top_k || {}).filter(([key]) => key !== c.clause_type).length > 0 && (
                    <small>Other candidate labels: {Object.entries(c.classification_top_k || {}).filter(([key]) => key !== c.clause_type).slice(0, 3).map(([key]) => key.replaceAll('_', ' ')).join(', ')}</small>
                  )}
                </span>
              </button>
            ))}
        </div>
        {clauses.length === 0 && <div className="muted small"><Check /> No analysis report loaded.</div>}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="explain-metric"><span>{label}</span><b>{value}</b></div>;
}
