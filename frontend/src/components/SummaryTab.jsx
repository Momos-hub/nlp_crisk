/** Summary + recommendations + coverage gaps + entities in one simple reading view. */
export default function SummaryTab({ report }) {
  const { summary, recommendations, gaps, entities, stats, meta } = report;

  return (
    <div>
      <div className="panel panel-pad">
        <div className="panel-title">Executive summary</div>
        <div className="prose" style={{ marginTop: 10 }}>{summary?.abstract || 'No summary available.'}</div>
        <div className="row small muted" style={{ marginTop: 12 }}>
          <span className="tag-type">{summary?.engine || 'n/a'}</span>
          {meta?.processing_ms != null && <span className="tag-type">{meta.processing_ms} ms</span>}
          {stats?.word_count != null && <span className="tag-type">{stats.word_count.toLocaleString()} words</span>}
          {stats?.reading_time_min != null && <span className="tag-type">~{stats.reading_time_min} min read</span>}
        </div>
      </div>

      {gaps?.length > 0 && (
        <>
          <div className="section-h">Missing protective clauses ({gaps.length})</div>
          <div className="gap-list">
            {gaps.map((g) => (
              <div key={g.clause_type} className="gap-item">
                <span className={`pill pill-${g.severity}`} style={{ marginTop: 2 }}><span className="d" />{g.severity}</span>
                <div>
                  <div className="g-t">{g.label}</div>
                  <div className="g-d">{g.description}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {recommendations?.length > 0 && (
        <>
          <div className="section-h">Recommended actions</div>
          <ul className="list-plain">
            {recommendations.map((r, i) => (
              <li key={i}>
                <span className={`pill pill-${r.priority} p`} style={{ marginTop: 2 }}>
                  <span className="d" />{r.priority}
                </span>
                <span>
                  <strong style={{ fontWeight: 650 }}>{r.title}</strong>
                  <span style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.88rem' }}>{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="section-h">Entities found</div>
      <div className="ent-grid">
        {Object.entries(entities?.by_type || {}).map(([label, list]) => (
          <div key={label} className="ent-group">
            <h4>{label} · {list.length}</h4>
            <div className="chip-wrap">
              {[...new Set(list.map((e) => e.value))].map((v, i) => (
                <span key={`${v}-${i}`} className="chip" title={v}>{v}</span>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(entities?.by_type || {}).length === 0 && (
          <div className="muted small">No entities detected.</div>
        )}
      </div>
    </div>
  );
}
