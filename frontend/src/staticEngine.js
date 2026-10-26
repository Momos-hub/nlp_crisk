import { STATIC_SAMPLES } from './staticSamples.js';

const RULES = [
  { id: 'uncapped_liability', label: 'Unlimited / uncapped exposure wording', bucket: 'Liability', points: 26, severity: 'CRITICAL', re: /(?:unlimited|uncapped|without (?:any )?limit|without limitation|not subject to (?:the )?(?:liability )?cap|shall not be limited)/i, why: 'This wording may leave an obligation or exposure without an express monetary ceiling. Check the surrounding clause, liability caps, exclusions, and carve-outs together.', fix: 'Confirm exactly which obligation the wording modifies; consider a clearly stated aggregate cap and narrowly defined carve-outs where appropriate.' },
  { id: 'unilateral_change', label: 'Unilateral change right', bucket: 'Control', points: 18, severity: 'HIGH', re: /(?:sole discretion|unilaterally|without (?:prior )?notice|may modify.{0,45}(?:at any time|from time to time))/i, why: 'One party appears able to change terms or service conditions without a matching approval right.', fix: 'Add advance notice, a material-change threshold, and a termination right if changes are unacceptable.' },
  { id: 'auto_renewal', label: 'Automatic renewal / notice window', bucket: 'Renewal', points: 12, severity: 'MEDIUM', re: /(?:automatically renew|auto(?:matic)?ally renew|renewal term|renew for successive)/i, why: 'Automatic renewal can extend the commitment unless notice is given within the stated window.', fix: 'Calendar the notice deadline and consider a shorter renewal or opt-in renewal.' },
  { id: 'termination_lockin', label: 'Restricted termination right', bucket: 'Termination', points: 15, severity: 'HIGH', re: /(?:may not terminate for convenience|no right to terminate|non.?cancellable|terminate only for cause|sole remedy.{0,35}termination)/i, why: 'The text may limit the ability to exit even when the relationship is no longer workable.', fix: 'Consider a mutual termination-for-convenience right with reasonable notice and transition terms.' },
  { id: 'one_sided_indemnity', label: 'One-sided indemnity', bucket: 'Indemnity', points: 16, severity: 'HIGH', re: /(?:customer|client|buyer|recipient).{0,100}indemnif(?:y|ies|ication)|(?:indemnif(?:y|ies|ication).{0,100}(?:customer|client|buyer|recipient))/i, why: 'The indemnity language appears to place a protection or defense obligation on one party; check whether reciprocal protection is appropriate.', fix: 'Define covered claims, defense control, notice/cooperation, and reciprocal protection where appropriate.' },
  { id: 'late_payment', label: 'Late-payment charges', bucket: 'Payment', points: 8, severity: 'MEDIUM', re: /(?:late fee|interest at|past due|overdue amount|suspend.{0,35}nonpayment)/i, why: 'Late charges or service suspension can materially increase the cost of a payment dispute.', fix: 'Check the rate, any grace period, notice, and whether disputed amounts are excluded.' },
  { id: 'data_transfer', label: 'Data handling / transfer obligation', bucket: 'Data protection', points: 12, severity: 'MEDIUM', re: /(?:personal data|personal information|process(?:ing)? of data|data processing|cross.border transfer)/i, why: 'The clause refers to personal or processed data; privacy safeguards and allocation of responsibilities should be checked.', fix: 'Confirm roles, security measures, breach notice, subprocessors, deletion, and transfer safeguards.' },
  { id: 'ip_assignment', label: 'Broad intellectual-property transfer', bucket: 'Intellectual property', points: 16, severity: 'HIGH', re: /(?:hereby assigns|all right, title and interest|work made for hire|ownership of.{0,40}(?:deliverable|work product|materials))/i, why: 'The wording may transfer ownership broadly; distinguish pre-existing materials from project-specific work.', fix: 'Carve out background IP and define the scope of any project-specific assignment or license.' },
  { id: 'confidentiality', label: 'Confidentiality obligation', bucket: 'Confidentiality', points: 4, severity: 'LOW', re: /(?:confidential information|keep.{0,30}confidential|non.?disclosure)/i, why: 'Confidentiality duties are present; verify exclusions, permitted disclosures, duration, and return or deletion.', fix: 'Check standard exclusions, legal-compulsion procedure, survival period, and data return/deletion.' },
  { id: 'broad_warranty', label: 'Warranty disclaimer / limited remedy', bucket: 'Warranties', points: 12, severity: 'MEDIUM', re: /(?:as is|as available|disclaim(?:s|er).{0,45}warrant|no warranty|sole and exclusive remedy)/i, why: 'The clause may narrow promised performance or available remedies.', fix: 'Identify any express service commitments and ensure the remedy is meaningful for material failures.' },
];

const TYPES = [
  ['indemnity', /\b(?:indemnity|indemnification|indemnify|defend|hold harmless)\b/i, 'Indemnity'],
  ['liability', /\b(?:liability|liabilities|cap|caps|damages)\b|limitation of liability/i, 'Limitation of liability'],
  ['termination', /\b(?:termination|terminate|suspend|expiry|expiration)\b/i, 'Termination'],
  ['renewal', /\b(?:renew|renewal|subscription term|initial term)\b/i, 'Term and renewal'],
  ['confidentiality', /\bconfidential(?:ity| information)?\b|non.?disclosure/i, 'Confidentiality'],
  ['data_protection', /\bdata\b|\bprivacy\b|personal information|\bsecurity\b/i, 'Data protection'],
  ['payment', /\b(?:payment|invoice|fee|fees|price|late charge)\b/i, 'Payment'],
  ['intellectual_property', /intellectual property|work product|\bownership\b|\blicense\b/i, 'Intellectual property'],
  ['warranty', /\bwarrant(?:y|ies)?\b|service level|\buptime\b/i, 'Warranties and service levels'],
  ['governing_law', /governing law|jurisdiction|arbitration|venue/i, 'Governing law and disputes'],
  ['force_majeure', /force majeure|act of god|beyond (?:a|their) control/i, 'Force majeure'],
];

const GLOSSARY = [
  [/\b(indemnity|indemnification|indemnify)\b/i, 'Indemnity generally means one party must cover specified losses, claims, or costs suffered by the other. The practical scope depends on which claims are covered, any exclusions, control of the defence, notice/cooperation duties, and interaction with liability caps.'],
  [/\b(liability cap|cap on liability|limitation of liability|liability limit)\b/i, 'A liability cap sets a ceiling on specified monetary exposure. Check whether it is aggregate or per claim, which losses are excluded, whether indemnities sit inside or outside it, and whether the cap is mutual.'],
  [/\b(automatic renewal|auto.?renew|renewal)\b/i, 'An automatic-renewal clause extends an agreement for another term unless a party gives notice by a deadline. The notice period, delivery method, renewal length, and any price change mechanism matter.'],
  [/\b(termination for convenience|terminate for convenience)\b/i, 'Termination for convenience allows a party to end an agreement without proving breach, usually after advance notice. Check whether the right is mutual and what fees, transition help, refunds, or accrued obligations remain.'],
  [/\b(force majeure|act of god)\b/i, 'A force-majeure clause may excuse or delay performance when specified events outside a party’s control prevent it. Review the event list, notice and mitigation duties, payment treatment, and whether prolonged disruption permits termination.'],
  [/\b(confidentiality|confidential information|nda)\b/i, 'Confidentiality provisions restrict use or disclosure of defined information. Review exclusions, permitted recipients and disclosures, security duties, duration, and what happens to the information at the end.'],
  [/\b(governing law|choice of law|jurisdiction|venue)\b/i, 'A governing-law clause selects the law used to interpret the agreement; a forum or jurisdiction clause identifies where disputes may be heard. They are related but distinct, and practical cost and enforceability depend on the parties and context.'],
  [/\b(arbitration|mediation|dispute resolution)\b/i, 'Dispute-resolution terms set the route for resolving disagreements. Check whether negotiation or mediation is mandatory first, the arbitration rules and seat, cost allocation, available remedies, and any court carve-outs.'],
  [/\b(data processing|personal data|privacy|data protection)\b/i, 'Data-protection terms allocate responsibilities for personal data. Common checks include each party’s role, permitted purposes, security, breach notice, subprocessors, individual-rights support, deletion, and international transfers.'],
  [/\b(intellectual property|work product|ip ownership|background ip)\b/i, 'Intellectual-property terms decide who owns existing materials and new work, and what licenses each party receives. Separate background IP, deliverables, feedback, third-party materials, and any rights needed to use the service.'],
  [/\b(warranty|as is|as available)\b/i, 'A warranty is a contractual promise about a product, service, or performance. A disclaimer may narrow those promises; compare it with express commitments, service levels, remedies, and applicable law.'],
  [/\b(non.?compete|non.?solicit|restrictive covenant)\b/i, 'A non-compete or non-solicit restricts specified competitive or hiring activity. Scope, duration, geography, covered people, exceptions, and enforceability vary significantly by jurisdiction.'],
  [/\b(payment terms|late fee|late payment|invoice)\b/i, 'Payment terms set invoice timing, due dates, dispute procedures, late charges, taxes, and possible suspension rights. Check whether a party must pay disputed amounts and whether notice or a cure period applies.'],
];

const SEVERITY_WEIGHT = { LOW: 8, MEDIUM: 22, HIGH: 48, CRITICAL: 78 };
const severityFor = (score) => score >= 76 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 22 ? 'MEDIUM' : 'LOW';
const escRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function splitClauses(text) {
  const chunks = [];
  let current = '';
  let heading = '';
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const match = line.match(/^\s*(?:(?:section\s+)?(\d+(?:\.\d+)*|[IVX]+)[.)]?\s+)(.{3,})$/i);
    if (match && /[a-z]/i.test(match[2])) {
      if (current.trim()) chunks.push({ heading: heading || 'Preamble', text: current.trim() });
      heading = match[2].trim();
      current = `${match[1]}. ${match[2].trim()}\n`;
    } else {
      current += `${line}\n`;
      if (!heading && !current.trim()) heading = 'Preamble';
    }
  }
  if (current.trim()) chunks.push({ heading: heading || 'Contract text', text: current.trim() });
  if (chunks.length <= 1) {
    const paragraphs = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (paragraphs.length > 1) return paragraphs.map((part, i) => ({ heading: i === 0 ? 'Opening terms' : `Section ${i}`, text: part }));
  }
  return chunks.length ? chunks : [{ heading: 'Contract text', text }];
}

function classify(text) {
  const found = TYPES.find(([, re]) => re.test(text));
  return found ? { type: found[0], label: found[2], confidence: 0.62 } : { type: 'general', label: 'General terms', confidence: 0.4 };
}

function analyzeClause(part, id, start) {
  const headingClass = classify(part.heading);
  const cls = headingClass.type !== 'general' ? headingClass : classify(`${part.heading}\n${part.text}`);
  const findings = [];
  RULES.forEach((rule) => {
    const match = rule.re.exec(part.text);
    if (!match) return;
    const excerpt = part.text.slice(Math.max(0, match.index - 35), Math.min(part.text.length, match.index + match[0].length + 55)).replace(/\s+/g, ' ').trim();
    findings.push({
      pattern_id: rule.id, label: rule.label, bucket: rule.bucket, bucket_label: rule.bucket,
      points: rule.points, severity: rule.severity, evidence: excerpt || match[0],
      rationale: rule.why, suggestion: rule.fix, local_start: match.index,
      local_end: match.index + match[0].length,
    });
  });
  const base = cls.type === 'general' ? 4 : 8;
  const patternPoints = Math.min(70, findings.reduce((sum, f) => sum + f.points, 0));
  const lengthPenalty = part.text.length > 1800 ? 6 : part.text.length > 1000 ? 3 : 0;
  const imbalancePenalty = /\b(?:sole discretion|only the (?:customer|client)|customer shall|recipient shall)\b/i.test(part.text) ? 5 : 0;
  const raw = Math.min(100, base + patternPoints + lengthPenalty + imbalancePenalty);
  const severity = severityFor(raw);
  const uniqueTypes = [...new Set(findings.map((f) => f.bucket.toLowerCase().replace(/\s+/g, '_')))];
  return {
    id, heading: part.heading, text: part.text, char_start: start, char_end: start + part.text.length,
    word_count: (part.text.match(/\b[\w'-]+\b/g) || []).length,
    clause_type: cls.type, clause_label: cls.label, classification_engine: 'static-rules', classification_confidence: cls.confidence,
    classification_top_k: { [cls.type]: cls.confidence },
    risk: {
      score: raw, severity, findings, pattern_count: findings.length, worst_finding_severity: findings[0]?.severity || 'LOW',
      imbalance_ratio: imbalancePenalty ? 'one-sided wording detected' : 'balanced / not detected',
      components: { type_base: base, pattern_points: patternPoints, imbalance_penalty: imbalancePenalty, length_penalty: lengthPenalty, severity_floor_applied: false },
      pattern_categories: uniqueTypes,
    },
  };
}

function entitiesFrom(text) {
  const byType = {};
  const add = (type, regex) => {
    const matches = [...text.matchAll(regex)].map((m) => ({ value: m[0].trim() }));
    if (matches.length) byType[type] = matches;
  };
  add('Date', /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi);
  add('Email', /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g);
  add('Money', /\$\s?\d[\d,]*(?:\.\d{2})?|\b(?:USD|INR|EUR|GBP)\s?\d[\d,]*(?:\.\d{2})?/gi);
  add('Notice period', /\b\d+\s+(?:business\s+)?days' notice\b|\b(?:at least|within)\s+\d+\s+days\b/gi);
  return { by_type: byType, entities: Object.entries(byType).flatMap(([type, items]) => items.map((item) => ({ ...item, type }))) };
}

function gapsFor(clauses) {
  const present = new Set(clauses.map((c) => c.clause_type));
  const candidates = [
    ['liability', 'Limitation of liability', 'Check for an express, mutual cap and understand the defined exclusions.'],
    ['termination', 'Termination rights', 'Check notice, cure periods, exit rights, and post-termination duties.'],
    ['confidentiality', 'Confidentiality', 'Check permitted use, exclusions, duration, and return or deletion.'],
    ['data_protection', 'Data protection', 'Check security, breach notice, subprocessors, and transfer provisions.'],
    ['indemnity', 'Indemnity', 'Check which claims are covered and who controls defence and settlement.'],
    ['governing_law', 'Governing law / disputes', 'Check applicable law, forum, and dispute-resolution process.'],
  ];
  return candidates.filter(([type]) => !present.has(type)).slice(0, 4).map(([clause_type, label, description]) => ({ clause_type, label, description, severity: 'MEDIUM' }));
}

function interactionsFor(clauses) {
  const indemnity = clauses.find((c) => c.clause_type === 'indemnity' || /indemnif/i.test(c.text));
  const liability = clauses.find((c) => c.clause_type === 'liability' || /liability cap|limitation of liability/i.test(c.text));
  if (!indemnity || !liability || indemnity.id === liability.id) return [];
  return [{
    id: 'cap-indemnity-review', label: 'Check how the liability cap applies to indemnity claims', severity: 'MEDIUM',
    method: 'Cross-clause text cue', why: 'The document has separate indemnity and liability-limit language. Their legal interaction is not inferred here; verify the exact carve-outs and wording.',
    evidence: [indemnity, liability].map((c) => ({ clause_id: c.id, text: c.text.slice(0, 220).replace(/\s+/g, ' ') })),
    confidence_note: 'A review prompt based on clause presence only; not a conclusion that the indemnity is capped or uncapped.',
  }];
}

export function analyzeStatic(text, filename = 'pasted-text') {
  const clean = String(text || '').trim();
  if (clean.length < 40) throw new Error('Please provide at least 40 characters of contract text.');
  const parts = splitClauses(clean);
  let cursor = 0;
  const clauses = parts.map((part, i) => {
    const start = clean.indexOf(part.text, cursor);
    const actual = start >= 0 ? start : cursor;
    cursor = actual + part.text.length;
    return analyzeClause(part, `C${String(i + 1).padStart(3, '0')}`, actual);
  });
  const gaps = gapsFor(clauses);
  const weighted = clauses.reduce((sum, c) => sum + c.risk.score * Math.max(c.word_count, 1), 0) / Math.max(1, clauses.reduce((s, c) => s + c.word_count, 0));
  const top3 = [...clauses].map((c) => c.risk.score).sort((a, b) => b - a).slice(0, 3);
  const topMean = top3.reduce((a, b) => a + b, 0) / Math.max(1, top3.length);
  const gapFactor = 1 + Math.min(0.25, gaps.length * 0.04);
  const index = Math.min(100, Math.round((0.55 * weighted + 0.45 * topMean) * gapFactor * 10) / 10);
  const dist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  clauses.forEach((c) => { dist[c.risk.severity] += 1; });
  const findings = clauses.flatMap((c) => c.risk.findings.map((f) => ({ ...f, clause_id: c.id, clause_heading: c.heading })));
  const entityInfo = entitiesFrom(clean);
  const wordCount = (clean.match(/\b[\w'-]+\b/g) || []).length;
  const highRisks = [...clauses].sort((a, b) => b.risk.score - a.risk.score).slice(0, 3).filter((c) => c.risk.score >= 22);
  const recommendations = highRisks.map((c) => ({ priority: c.risk.severity, title: `Review ${c.clause_label.toLowerCase()} wording`, detail: c.risk.findings[0]?.fix || `Check this clause for balance and alignment with the parties' intended allocation of risk.` }));
  return {
    meta: { filename, processing_ms: 0, engine: 'static-rules', runtime_mode: 'static', disclaimer: 'Browser-only heuristic review; not legal advice.' },
    clauses, risk_index: { index, severity: severityFor(index), weighted_clause_risk: Math.round(weighted * 10) / 10, top_clause_concentration: Math.round(topMean * 10) / 10, gap_factor: Number(gapFactor.toFixed(2)) },
    gaps, interactions: interactionsFor(clauses), entities: entityInfo,
    summary: { abstract: `${clauses.length} text section${clauses.length === 1 ? '' : 's'} reviewed using lightweight browser-side rules. ${findings.length} possible issue pattern${findings.length === 1 ? '' : 's'} matched; these are review prompts, not legal conclusions.`, engine: 'Browser static rules' },
    recommendations,
    stats: { clause_count: clauses.length, finding_count: findings.length, severity_distribution: dist, word_count: wordCount, reading_time_min: Math.max(1, Math.ceil(wordCount / 200)), engine_mode: 'static', classifier_count: clauses.length },
  };
}

export function staticSampleList() {
  return STATIC_SAMPLES.map(({ id, title, description, text }) => ({ id, title, description, word_count: (text.match(/\b[\w'-]+\b/g) || []).length }));
}

export function staticSample(id) {
  const sample = STATIC_SAMPLES.find((item) => item.id === id);
  if (!sample) throw new Error('That sample was not found in this static package.');
  return { ...sample };
}

function topicMatch(query) {
  const q = query.toLowerCase();
  const aliases = [
    ['liability', /liabilit|cap|damages|exposure/], ['indemnity', /indemnif|indemnity|defend/],
    ['termination', /terminat|exit|end the (?:agreement|contract)|cancel/], ['renewal', /renew|roll over/],
    ['confidentiality', /confidential|nda/], ['data_protection', /data|privacy|security/],
    ['force_majeure', /force majeure|act of god|beyond (?:a|their) control/],
    ['governing_law', /governing law|jurisdiction|arbitration|dispute resolution|venue/],
    ['payment', /payment|invoice|late fee|interest/], ['intellectual_property', /intellectual property|\bip\b|work product|ownership/],
    ['warranty', /warrant|uptime|service level/],
  ];
  return aliases.find(([, re]) => re.test(q))?.[0] || null;
}

function glossaryAnswer(query) {
  return GLOSSARY.find(([re]) => re.test(query))?.[1] || null;
}

function snippet(text, query) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  let idx = -1;
  for (const word of words) { idx = text.toLowerCase().indexOf(word); if (idx >= 0) break; }
  if (idx < 0) idx = 0;
  return `${idx > 0 ? '…' : ''}${text.slice(Math.max(0, idx - 95), Math.min(text.length, idx + 230)).replace(/\s+/g, ' ').trim()}${idx + 230 < text.length ? '…' : ''}`;
}

export function askStatic({ question, clauses = [], scope = 'contract', history = [] }) {
  let q = question.trim();
  if (/^(and|also|what about|why|how about|does (?:it|that|the|this)|what if|is that|can they|can i|how does it)\b/i.test(q) && history.length) {
    const previous = [...history].reverse().find((turn) => turn.role === 'user' || turn.role === 'q');
    if (previous?.text) q = `${previous.text} ${q}`;
  }
  const topic = topicMatch(q);
  const tokens = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !['what','does','this','that','with','from','about','could','would','should','there','their','have','will','when','where','which','explain','tell','please'].includes(w));
  let ranked = clauses.map((clause) => {
    const haystack = `${clause.heading} ${clause.clause_label} ${clause.text}`.toLowerCase();
    let score = tokens.reduce((n, t) => n + (haystack.includes(t) ? (clause.heading.toLowerCase().includes(t) ? 4 : 1) : 0), 0);
    const topicMatchHere = topic && (clause.clause_type === topic || (topic === 'liability' && /liability|cap|indemnif/i.test(haystack)) || (topic === 'intellectual_property' && /intellectual property|work product|ownership|license/i.test(haystack)) || (topic === 'force_majeure' && /force majeure|act of god/i.test(haystack)));
    if (topicMatchHere) score += 6;
    if (/most important|highest risk|key risk|main risk|biggest risk/i.test(q)) score += clause.risk.score / 10;
    return { clause, score, topicMatchHere };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
  if (topic && !ranked.some((item) => item.topicMatchHere)) ranked = [];
  const sources = ranked.slice(0, 3).map(({ clause }) => ({ clause_id: clause.id, heading: clause.heading, snippet: snippet(clause.text, q) }));
  const general = glossaryAnswer(q);
  const isSummary = /\b(summar|overview|what does this|what is in this|explain this agreement|help me understand|key terms|most important risk|highest risk|key risk|main risk|biggest risk)\b/i.test(q);
  let answer = '';
  let why = '';
  if (scope === 'general') {
    answer = general || 'I can provide a plain-language overview of common contract concepts such as liability caps, indemnities, renewals, termination, privacy, and dispute resolution. Ask about a specific term for a focused explanation.';
    why = 'This is a general legal-information explanation from a built-in glossary. It is not drawn from the uploaded contract and is not legal advice.';
    return { answer, scope: 'general', answer_mode: 'static-glossary', support_level: 'General explanation', sources: [], citation_valid: true, why_this_answer: why, pipeline: 'Browser glossary · no external model or network request' };
  }
  if (/liabilit/i.test(q) && /indemn/i.test(q)) {
    const indemnityClause = clauses.find((c) => c.clause_type === 'indemnity' || /indemnif/i.test(c.text));
    const liabilityClause = clauses.find((c) => c.clause_type === 'liability' || /limitation of liability|liability cap|cap on liability/i.test(`${c.heading} ${c.text}`));
    if (indemnityClause && liabilityClause && indemnityClause.id !== liabilityClause.id) {
      const related = [liabilityClause, indemnityClause];
      return {
        answer: `The document has liability-limit wording in [${liabilityClause.id}] and separate indemnity wording in [${indemnityClause.id}]. That relationship deserves review, but this browser-only pattern check cannot tell whether indemnity claims are inside or outside the cap or determine the legal effect. Check the exact cap, carve-outs, definitions, and defence obligations together.`,
        scope: 'contract', answer_mode: 'static-cross-clause-prompt', support_level: 'Clause-presence prompt · human verification required',
        sources: related.map((c) => ({ clause_id: c.id, heading: c.heading, snippet: snippet(c.text, q) })), citation_valid: true,
        why_this_answer: 'Matched one liability-limit section and one indemnity section by clause type and wording. This is a review prompt, not a conclusion that the indemnity is capped or uncapped.',
        pipeline: 'Browser-side clause matching → explicit cross-clause review prompt',
      };
    }
  }
  if (isSummary) {
    const top = [...clauses].sort((a, b) => b.risk.score - a.risk.score).slice(0, 3);
    const summary = top.map((c) => `${c.id} (${c.clause_label}, score ${c.risk.score}/100)${c.risk.findings[0] ? `: ${c.risk.findings[0].label}` : ''}`).join('; ');
    answer = `I reviewed ${clauses.length} sections with browser-side rules. The document triage index is shown above in the report; the highest-scoring sections are ${summary || 'not strongly differentiated by these simple rules'}. Treat these as prompts to inspect, not conclusions about legal effect.`;
    why = 'This overview is generated from the current report’s section labels, deterministic rule scores, and matched findings.';
    const reportSources = top.map((clause) => ({ clause_id: clause.id, heading: clause.heading, snippet: snippet(clause.text, q) }));
    return { answer, scope: 'contract', answer_mode: 'static-report-summary', support_level: 'Current report · heuristic scores', sources: reportSources, citation_valid: true, why_this_answer: why, pipeline: 'Report findings and visible browser-side rule scores' };
  } else if (ranked.length) {
    const best = ranked[0].clause;
    const firstFinding = best.risk.findings[0];
    if (firstFinding) {
      answer = `${best.id} (“${best.heading}”) is the most relevant section I found. The matched wording is “${firstFinding.evidence}.” ${firstFinding.rationale} ${firstFinding.suggestion}`;
      why = `Retrieved ${ranked.length} section(s) using heading, clause-type, and keyword matches. The answer quotes the top section and uses the visible rule rationale; it does not infer legal effect.`;
    } else {
      answer = `${best.id} (“${best.heading}”) appears relevant. In plain language, this section says: “${snippet(best.text, q).replace(/^…|…$/g, '')}” I did not match a specific risk rule here, so verify the full wording and surrounding provisions.`;
      why = `Retrieved the section through keyword and clause-type matching. No specific risk pattern matched it.`;
    }
  } else if (general) {
    answer = `${general} I did not find a section that clearly matches this topic in the analyzed text, so this is a general explanation rather than a contract-specific conclusion.`;
    why = 'The question matched a built-in legal-concept glossary, but no sufficiently relevant contract section was retrieved.';
  } else {
    const topics = [...new Set(clauses.map((c) => c.clause_label).filter((x) => x && x !== 'General terms'))].slice(0, 8);
    answer = `I can help with this, but I could not confidently match the wording to a section or a built-in concept yet. Try a follow-up using a clause heading, a party name, or a synonym. ${topics.length ? `Topics identified in this document include: ${topics.join(', ')}.` : ''} You can also switch to General explanation and ask about liability caps, indemnity, renewal, termination, confidentiality, data protection, IP, warranties, or dispute resolution.`;
    why = 'No answer is fabricated when retrieval is weak. This is a clarification prompt; try alternate terminology or ask about a listed topic.';
  }
  return { answer, scope: 'contract', answer_mode: 'static-retrieval', support_level: ranked.length ? 'Rule / keyword retrieval' : general ? 'General concept; no contract match' : 'Clarification needed', sources, citation_valid: true, why_this_answer: why, pipeline: 'Browser-side rules + keyword retrieval · no external model or network request' };
}
