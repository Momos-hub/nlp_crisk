/* SSR smoke test: renders every top-level component with renderToString.
   Catches render-time crashes (undefined vars, bad prop access) without a browser. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
// resolve esbuild from the frontend dependency tree (vite's dependency)
const require = createRequire(join(root, 'package.json'));
const esbuild = require('esbuild');
// entry MUST live inside frontend/ so bare imports (react) resolve from node_modules
const outDir = root;
const entry = join(root, '.smoke-entry.jsx');

writeFileSync(entry, `
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '${root.replace(/\\/g, '/')}/src/App.jsx';
import IntroOverlay from '${root.replace(/\\/g, '/')}/src/components/IntroOverlay.jsx';
import Header from '${root.replace(/\\/g, '/')}/src/components/Header.jsx';
import InputPanel from '${root.replace(/\\/g, '/')}/src/components/InputPanel.jsx';
import SummaryStrip from '${root.replace(/\\/g, '/')}/src/components/SummaryStrip.jsx';
import ClauseReview from '${root.replace(/\\/g, '/')}/src/components/ClauseReview.jsx';
import FindingsTab from '${root.replace(/\\/g, '/')}/src/components/FindingsTab.jsx';
import SummaryTab from '${root.replace(/\\/g, '/')}/src/components/SummaryTab.jsx';
import AskTab from '${root.replace(/\\/g, '/')}/src/components/AskTab.jsx';
import HeroPreview from '${root.replace(/\\/g, '/')}/src/components/HeroPreview.jsx';
import AnalyzingCard from '${root.replace(/\\/g, '/')}/src/components/AnalyzingCard.jsx';
import HfModelsPanel from '${root.replace(/\\/g, '/')}/src/components/HfModelsPanel.jsx';
import ExplainabilityTab from '${root.replace(/\\/g, '/')}/src/components/ExplainabilityTab.jsx';

const fakeReport = {
  meta: { filename: 'test.txt', engine: 'fast', processing_ms: 12 },
  summary: { abstract: 'Test summary.', key_sentences: 'Test summary.', engine: 'fast' },
  risk_index: { index: 50, severity: 'HIGH', gap_factor: 1.1, weighted_clause_risk: 40, top_clause_concentration: 60 },
  clauses: [{
    id: 'C001', heading: 'Payment Terms', text: 'Customer shall pay all fees.', char_start: 0, char_end: 30,
    word_count: 5, sentences: ['Customer shall pay all fees.'],
    clause_type: 'payment', clause_label: 'Payment & Fees', classification_confidence: 0.9,
    classification_top_k: {}, classification_engine: 'fast-lexical',
    risk: { score: 50, severity: 'HIGH', worst_finding_severity: 'HIGH',
      findings: [{ pattern_id: 'x', bucket: 'b', bucket_label: 'B', severity: 'HIGH', points: 8,
        evidence: 'all fees', char_start: 15, char_end: 23, local_start: 15, local_end: 23,
        rationale: 'why', suggestion: 'fix' }],
      imbalance_ratio: 'balanced', ambiguity_flags: 0, base_risk: 4,
      components: { pattern_points: 8, type_base: 4, imbalance_penalty: 0 } },
  }],
  entities: { entities: [{ label: 'PARTY', value: 'Acme', char_start: 0, char_end: 4 }], by_type: { PARTY: [{ label: 'PARTY', value: 'Acme' }] }, engine: 'fast' },
  gaps: [{ clause_type: 'force_majeure', label: 'Force Majeure', description: 'missing', severity: 'MEDIUM' }],
  top_risks: [{ clause_id: 'C001', heading: 'Payment Terms', severity: 'HIGH', score: 50, top_finding: 'why', top_finding_evidence: 'all fees' }],
  recommendations: [{ priority: 'HIGH', title: 'Fix', detail: 'Do it' }],
  stats: { word_count: 5, char_count: 28, clause_count: 1, finding_count: 1,
    type_distribution: { payment: 1 }, severity_distribution: { HIGH: 1 }, reading_time_min: 1, engine_mode: 'fast' },
};

const checks = [];
function t(name, el) {
  const html = renderToString(el);
  if (typeof html !== 'string' || html.length < 10) throw new Error(name + ' rendered empty');
  checks.push(name + ' OK (' + html.length + ' chars)');
}

t('App', React.createElement(App));
t('IntroOverlay', React.createElement(IntroOverlay, { onDone: () => {} }));
t('Header', React.createElement(Header, { engineInfo: { label: 'x' }, hasReport: true, onNew: () => {}, onExport: () => {} }));
t('InputPanel', React.createElement(InputPanel, {
  text: 'hello world '.repeat(10), setText: () => {}, engine: 'auto', setEngine: () => {},
  samples: [{ id: 's', title: 'T', description: 'D', word_count: 5 }],
  onAnalyze: () => {}, onUpload: () => {}, onSample: () => {}, busy: false,
}));
t('SummaryStrip', React.createElement(SummaryStrip, { report: fakeReport }));
t('ClauseReview', React.createElement(ClauseReview, { clauses: fakeReport.clauses, focusId: null, focusKey: 0 }));
t('FindingsTab', React.createElement(FindingsTab, { clauses: fakeReport.clauses, onOpenClause: () => {} }));
t('SummaryTab', React.createElement(SummaryTab, { report: fakeReport }));
t('AskTab', React.createElement(AskTab, { clauses: fakeReport.clauses, engine: 'auto', onOpenClause: () => {}, generation: { available: false } }));
t('ExplainabilityTab', React.createElement(ExplainabilityTab, { report: fakeReport, onOpenClause: () => {} }));
t('HeroPreview', React.createElement(HeroPreview));
t('AnalyzingCard', React.createElement(AnalyzingCard));
t('HfModelsPanel', React.createElement(HfModelsPanel, { health: { engine: { transformers_available: true, models: { qa: { model_id: 'deepset/minilm-uncased-squad2', task: 'question-answering', state: 'cold', seconds: 0, error: null } } } }, onRefresh: () => {} }));

console.log(checks.join('\\n'));
console.log('SMOKE_OK');
`);

const outfile = join(outDir, '.smoke-bundle.mjs');
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  absWorkingDir: root,
  loader: { '.css': 'empty', '.js': 'jsx' },
  external: [],
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  logLevel: 'silent',
});
try {
  await import(pathToFileURL(outfile).href);
} finally {
  const fs = await import('node:fs');
  fs.rmSync(entry, { force: true });
  fs.rmSync(outfile, { force: true });
}
