import { useMemo, useState } from 'react';
import { Chevron, Search } from './Icons';

const SEV_COLOR = {
  LOW: 'var(--low)',
  MEDIUM: 'var(--medium)',
  HIGH: 'var(--high)',
  CRITICAL: 'var(--critical)',
};

function Highlighted({ text, findings }) {
  const spans = useMemo(() => {
    const list = (findings || [])
      .filter((f) => f.local_start != null && f.local_end > f.local_start)
      .map((f) => [f.local_start, Math.min(f.local_end, text.length)])
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    list.forEach(([s, e]) => {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    });
    return merged;
  }, [text, findings]);

  if (!spans.length) return <span>{text}</span>;
  const out = [];
  let cur = 0;
  spans.forEach(([s, e], i) => {
    if (s > cur) out.push(<span key={`t${i}`}>{text.slice(cur, s)}</span>);
    out.push(<mark className="evidence" key={`m${i}`}>{text.slice(s, e)}</mark>);
    cur = e;
  });
  if (cur < text.length) out.push(<span key="end">{text.slice(cur)}</span>);
  return <>{out}</>;
}

function ClauseDetail({ clause }) {
  const f = clause.risk;
  return (
    <div className="clause-body fade-in">
      <div className="row" style={{ marginTop: 12 }}>
        <span className={`pill pill-${f.severity}`}><span className="d" />{f.severity}</span>
        <span className="tag-type">Risk score {f.score}</span>
        <span className="tag-type">{clause.clause_label}</span>
        <span className="small muted">
          {clause.classification_engine} classifier score {(clause.classification_confidence * 100).toFixed(0)}% · not calibrated
        </span>
      </div>

      <div className="clause-text">
        <Highlighted text={clause.text} findings={f.findings} />
      </div>

      {f.findings.length > 0 ? (
        <>
          <div className="section-h" style={{ margin: '16px 0 4px' }}>
            Findings &amp; suggested redlines ({f.findings.length})
          </div>
          {f.findings.map((fd, i) => (
            <div key={`${fd.pattern_id}-${i}`} className={`finding finding-${fd.severity}`}>
              <div className="top">
                <span className={`pill pill-${fd.severity}`}><span className="d" />{fd.severity}</span>
                <span className="bucket">{fd.bucket_label}</span>
                <span className="pts">+{fd.points} risk pts</span>
              </div>
              <div className="quote">“{fd.evidence}”</div>
              <div className="why">{fd.rationale}</div>
              <div className="fix">
                <strong>Suggested redline: </strong>{fd.suggestion}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="section-h" style={{ margin: '16px 0 4px' }}>No risk patterns matched this clause.</div>
      )}

      {f.imbalance_ratio && f.imbalance_ratio !== 'balanced' && (
        <div className="small muted" style={{ marginTop: 12 }}>
          Obligation balance: {f.imbalance_ratio} (a large imbalance suggests one-sided duties).
        </div>
      )}
    </div>
  );
}

export default function ClauseReview({ clauses, focusId, focusKey }) {
  const [query, setQuery] = useState('');
  const [sev, setSev] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [sort, setSort] = useState('document');
  const [openId, setOpenId] = useState(null);
  const [handledKey, setHandledKey] = useState(-1);

  // jump from Findings / Ask tabs (once per request, even for the same clause)
  if (focusId && focusKey != null && focusKey !== handledKey) {
    setHandledKey(focusKey);
    setOpenId(focusId);
  }

  const types = useMemo(() => {
    const map = new Map();
    (clauses || []).forEach((c) => map.set(c.clause_type, c.clause_label));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [clauses]);

  const list = useMemo(() => {
    let out = [...(clauses || [])];
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((c) =>
        c.text.toLowerCase().includes(q)
        || c.heading.toLowerCase().includes(q)
        || c.clause_label.toLowerCase().includes(q));
    }
    if (sev !== 'ALL') out = out.filter((c) => c.risk.severity === sev);
    if (type !== 'ALL') out = out.filter((c) => c.clause_type === type);
    if (sort === 'risk') out.sort((a, b) => b.risk.score - a.risk.score);
    if (sort === 'findings') out.sort((a, b) => b.risk.findings.length - a.risk.findings.length);
    return out;
  }, [clauses, query, sev, type, sort]);

  return (
    <div>
      <div className="filters">
        <div className="search-wrap">
          <Search />
          <input
            className="field search"
            placeholder="Search clauses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clauses"
          />
        </div>
        <select className="field sel" value={sev} onChange={(e) => setSev(e.target.value)} aria-label="Filter by severity">
          <option value="ALL">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select className="field sel" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="ALL">All clause types</option>
          {types.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select className="field sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort clauses">
          <option value="document">Document order</option>
          <option value="risk">Highest risk</option>
          <option value="findings">Most findings</option>
        </select>
        <span className="spacer" />
        <span className="small muted nowrap">{list.length} of {clauses?.length || 0} clauses</span>
      </div>

      <div
        className="minimap"
        role="img"
        aria-label="Risk distribution across the document, in document order"
        title="Risk distribution — click any segment to open that clause"
      >
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className="mm-seg"
            style={{
              background: SEV_COLOR[c.risk.severity],
              flexGrow: Math.max(c.word_count, 8),
              animationDelay: `${Math.min(c.index * 35, 500)}ms`,
            }}
            title={`${c.id} · ${c.heading} · ${c.risk.severity}`}
            onClick={() => {
              setOpenId(c.id);
              document.getElementById(`clause-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        ))}
      </div>
      <div className="mm-legend small muted">
        <span className="mm-cap">risk map →</span>
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
          <span key={s} className="row" style={{ gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: SEV_COLOR[s], display: 'inline-block' }} />
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="spacer" />
        <span>click a segment to jump</span>
      </div>

      <div className="clause-list">
        {list.map((c, i) => {
          const open = openId === c.id;
          return (
            <div
              key={c.id}
              className={`clause-item ${open ? 'open' : ''}`}
              id={`clause-${c.id}`}
              style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}
            >
              <button
                type="button"
                className="clause-head"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : c.id)}
              >
                <span className="chev"><Chevron /></span>
                <span className="main">
                  <span className="title-row">
                    <span className="title">{c.heading}</span>
                    <span className="tag-type">{c.clause_label}</span>
                    <span className={`pill pill-${c.risk.severity}`}><span className="d" />{c.risk.severity}</span>
                  </span>
                  <span className="snip">{c.text.slice(0, 120)}</span>
                </span>
                <span className="side">
                  <span className="flag-count">
                    {c.risk.findings.length} flag{c.risk.findings.length === 1 ? '' : 's'}
                  </span>
                  <span className="risk-num" style={{ color: SEV_COLOR[c.risk.severity] }}>
                    {c.risk.score}
                  </span>
                </span>
              </button>
              <div className="clause-body-wrap">
                <div className="clause-body-clip">
                  {open && <ClauseDetail clause={c} />}
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="panel panel-pad muted small">No clauses match the current filters.</div>
        )}
      </div>
    </div>
  );
}
