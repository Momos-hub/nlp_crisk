import { Scale, Plus, Download } from './Icons';

export default function Header({ engineInfo, hasReport, onNew, onHome, onExport }) {
  return (
    <header className="header">
      <div className="wrap header-in">
        <a href="#top" className="brand" onClick={(event) => { event.preventDefault(); onHome?.(); }}>
          <span className="brand-mark"><Scale /></span>
          ClauseRisk
        </a>
        <div className="header-actions">
          <span className="engine-pill" title={engineInfo?.title || 'NLP engine'}>
            <span className="dot" />
            {engineInfo?.label || 'Engine'}
          </span>
          {hasReport && (
            <>
              <button type="button" className="btn btn-sm" onClick={onExport}>
                <Download /> <span className="hidden-xs">Export</span>
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={onNew}>
                <Plus /> New
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
