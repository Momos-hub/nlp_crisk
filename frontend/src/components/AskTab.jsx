import { useEffect, useRef, useState } from 'react';
import { Send, Alert, Check } from './Icons';
import { askQuestion } from '../api';

/** Conversational Q&A: contract-grounded by default, general explanations explicitly separated. */
export default function AskTab({ clauses, report, engine, onOpenClause, generation, staticMode = false }) {
  const rankedClauses = [...(clauses || [])].filter((c) => c.risk).sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));
  const topRisk = report?.top_risks?.[0] || (rankedClauses[0] ? {
    clause_id: rankedClauses[0].id,
    heading: rankedClauses[0].heading,
    severity: rankedClauses[0].risk?.severity,
    score: rankedClauses[0].risk?.score,
    top_finding: rankedClauses[0].risk?.findings?.[0]?.rationale,
    top_finding_evidence: rankedClauses[0].risk?.findings?.[0]?.evidence,
  } : null);
  const highPriorityCount = (clauses || []).filter((c) => ['HIGH', 'CRITICAL'].includes(c.risk?.severity)).length;
  const interactions = report?.interactions || [];
  const gaps = report?.gaps || [];
  const prompts = [
    { label: 'Explain the top review signal', query: topRisk ? `What wording in the ${topRisk.heading} clause triggered this review signal?` : 'Which clauses should I read first, and why?' },
    { label: interactions[0] ? 'Check a clause interaction' : 'Compare related clauses', query: interactions[0] ? `What should I verify about ${interactions[0].label}? Please cite both clauses.` : 'Do any clauses qualify or limit another clause? Show the source wording.' },
    { label: 'Find dates and deadlines', query: 'Which dates, renewal windows, notice periods, or deadlines should I track?' },
  ];
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState('contract');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (value = question) => {
    const query = value.trim();
    if (!query || busy) return;
    if (query.length > 2000) { setError('Please keep a question under 2,000 characters.'); return; }
    setError('');
    const priorHistory = messages.map((m) => ({ role: m.role === 'q' ? 'user' : 'assistant', text: m.text }));
    const current = { role: 'q', text: query, scope };
    setMessages((old) => [...old, current]);
    setQuestion('');
    setBusy(true);
    try {
      const res = await askQuestion({ question: query, clauses, engine, scope, history: priorHistory });
      setMessages((old) => [...old, {
        role: 'a',
        text: res.answer,
        scope: res.scope || scope,
        answerMode: res.answer_mode,
        supportLevel: res.support_level,
        why: res.why_this_answer,
        citationValid: res.citation_valid,
        sources: res.sources || [],
        pipeline: res.pipeline,
      }]);
    } catch (err) {
      setMessages((old) => [...old, { role: 'a', text: err.message || 'Could not answer that question.', error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="ask-shell">
      <section className="panel panel-pad copilot-panel">
        <div className="copilot-head">
          <div>
            <div className="eyebrow">Evidence-first assistant</div>
            <h2 className="panel-title">Ask about this contract</h2>
            <p className="panel-sub explain-lede">
              Ask in your own words, follow up naturally, and inspect the evidence behind each response.
            </p>
          </div>
          <button type="button" className="btn btn-sm" disabled={!messages.length || busy} onClick={() => setMessages([])}>
            New conversation
          </button>
        </div>

        <div className="scope-switch" role="group" aria-label="Answer scope">
          <button className={scope === 'contract' ? 'active' : ''} type="button" onClick={() => setScope('contract')}>
            <span className="scope-dot doc-dot" /> This contract
          </button>
          <button className={scope === 'general' ? 'active' : ''} type="button" onClick={() => setScope('general')}>
            <span className="scope-dot general-dot" /> General explanation
          </button>
        </div>
        {scope === 'general' && (
          <div className="scope-note"><Alert /> {staticMode ? 'General explanations use a small built-in legal-concept glossary, separate from this contract; no external model is called. Not legal advice.' : <>General mode is separate from contract evidence. It uses the optional hosted Hugging Face generator{generation?.available ? ' (connected)' : ' (not configured)'} and is not legal advice.</>}</div>
        )}

        {scope === 'contract' && messages.length === 0 && (
          <div className="insight-start">
            <section className="insight-board" aria-label="Quick review insights">
              <div className="insight-board-head">
                <div><span className="insight-kicker">QUICK READ · FROM THIS REPORT</span><h3>Three useful places to start</h3></div>
                <span className="insight-caveat">Pattern-based cues · verify the clause text</span>
              </div>
              <div className="insight-grid">
                <button type="button" className="insight-card insight-primary" onClick={() => topRisk?.clause_id && onOpenClause(topRisk.clause_id)} disabled={!topRisk?.clause_id}>
                  <span className="insight-label">HIGHEST-SCORED CLAUSE</span>
                  <b>{topRisk?.heading || 'No clause score available'}</b>
                  <span className="insight-score">{topRisk ? `${topRisk.severity || 'REVIEW'} · ${topRisk.score}/100` : 'No matched signal'}</span>
                  <small>{topRisk?.top_finding_evidence ? `“${topRisk.top_finding_evidence}” · ${topRisk.top_finding || 'matched wording'}` : 'No configured risk-pattern finding matched here; treat this as a low-priority reading cue.'}</small>
                </button>
                <article className="insight-card">
                  <span className="insight-label">CROSS-CLAUSE PROMPTS</span>
                  <b>{interactions.length} to verify</b>
                  <small>{interactions[0]?.label || 'No explicit interaction pattern was flagged. That is not proof that clauses cannot affect each other.'}</small>
                </article>
                <article className="insight-card">
                  <span className="insight-label">PROTECTION CHECKS</span>
                  <b>{gaps.length} review prompt{gaps.length === 1 ? '' : 's'}</b>
                  <small>{gaps.slice(0, 2).map((g) => g.label).join(' · ') || 'No missing-protection prompt surfaced in the configured checklist.'}</small>
                </article>
              </div>
              <div className="insight-foot">{highPriorityCount} high/critical clause(s) · review scores prioritize reading; they are not legal probabilities or conclusions.</div>
            </section>
            <div className="prompt-row">
              <span>Ask a focused follow-up</span>
              <div className="ask-sugs">
                {prompts.map((prompt) => <button key={prompt.label} type="button" className="sug" onClick={() => ask(prompt.query)}>{prompt.label}</button>)}
              </div>
            </div>
          </div>
        )}

        <div className="chat-log copilot-log" ref={logRef} aria-live="polite" aria-label="Conversation">
          {messages.length === 0 && (
            <div className="empty-chat">
              <div className="empty-chat-orbit" aria-hidden="true"><span /><i /><b /></div>
              <div><strong>Start with evidence, then ask.</strong><p>Choose a report-specific prompt above or ask your own question. Answers show source clauses when they match.</p></div>
            </div>
          )}
          {messages.map((m, i) => m.role === 'q' ? (
            <div className="chat-turn user-turn" key={`q-${i}`}>
              <span className="turn-label">YOU · {m.scope === 'general' ? 'GENERAL' : 'CONTRACT'}</span>
              <div className="msg-q">{m.text}</div>
            </div>
          ) : (
            <article className={`chat-turn assistant-turn ${m.error ? 'turn-error' : ''}`} key={`a-${i}`}>
              <span className="turn-label">CLAUSERISK ASSISTANT</span>
              <div className="msg-a">
                <div className="answer-text">{m.text}</div>
                {m.scope === 'general' && <div className="scope-note answer-note"><Alert /> General information only—not advice about this contract or a legal opinion.</div>}
                {m.citationValid === false && <div className="scope-note answer-note"><Alert /> The generated answer did not provide verifiable inline clause citations. Check the source passages before relying on it.</div>}
                {m.sources?.length > 0 && (
                  <div className="src-list">
                    <div className="src-heading"><span>Evidence retrieved</span><span className="small muted">{m.supportLevel}</span></div>
                    {m.sources.map((s, j) => (
                      <button key={`${s.clause_id}-${j}`} type="button" className="src-item" onClick={() => s.clause_id && onOpenClause(s.clause_id)}>
                        <b>{s.clause_id}{s.heading ? ` · ${s.heading}` : ''}</b>
                        <span className="sn">{s.snippet}</span>
                      </button>
                    ))}
                  </div>
                )}
                {m.why && (
                  <details className="why-answer">
                    <summary><Check /> Why this answer?</summary>
                    <p>{m.why}</p>
                    {m.pipeline && <small>{m.pipeline}</small>}
                  </details>
                )}
              </div>
            </article>
          ))}
          {busy && <div className="thinking"><span>Retrieving evidence and preparing a supported answer</span><i /><i /><i /></div>}
        </div>

        {error && <div className="banner banner-error" role="alert">{error}</div>}
        <form className="ask-composer" onSubmit={(e) => { e.preventDefault(); ask(); }}>
          <textarea
            ref={inputRef}
            className="field composer-field"
            placeholder={scope === 'contract' ? 'Ask about a term, compare clauses, or ask a follow-up…' : 'Ask for a plain-language explanation of a legal concept…'}
            value={question}
            rows={2}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask();
              }
            }}
            aria-label="Your question"
          />
          <button className="btn btn-primary send-btn" type="submit" disabled={busy || !question.trim()}>
            <Send /> <span>{busy ? 'Working…' : 'Ask'}</span>
          </button>
        </form>
        <div className="composer-foot"><span>Enter to send · Shift + Enter for a new line</span><span>Answers should be verified against the cited text.</span></div>
      </section>
    </div>
  );
}
