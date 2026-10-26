import { useEffect, useState } from 'react';

const STATUS_LINES = [
  'Parsing and normalizing the document…',
  'Segmenting clauses from the structure…',
  'Classifying clause types (Hugging Face zero-shot)…',
  'Scanning the weighted risk lexicon…',
  'Extracting legal entities…',
  'Scoring, summarizing and grounding evidence…',
];

/** Skeleton loader shown while the NLP pipeline runs — smoother than a bare bar. */
export default function AnalyzingCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % STATUS_LINES.length), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel panel-pad fade-in" aria-live="polite">
      <div className="row-between">
        <div className="panel-title">Analyzing contract</div>
        <span className="pill pill-MEDIUM"><span className="d" />working</span>
      </div>

      <div className="progress-bar" style={{ marginTop: 12 }}>
        <div className="progress-fill" />
      </div>
      <div className="progress-text">{STATUS_LINES[i]}</div>

      <div className="skeleton-wrap" aria-hidden="true">
        <div className="skeleton-row w40" />
        <div className="skeleton-row w90" />
        <div className="skeleton-row w75" />
        <div className="skeleton-row w85" />
        <div className="skeleton-row w60" />
      </div>
    </div>
  );
}
