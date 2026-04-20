import React from 'react';

const icons = {
  overview: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  trade: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  range: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  markov: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
      <line x1="7" y1="11.5" x2="17" y2="6.5"/><line x1="7" y1="12.5" x2="17" y2="17.5"/>
    </svg>
  ),
  ml: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V12h2l-2 4-2-4h2V9.5A4 4 0 0 1 12 2z"/>
      <path d="M6.3 15a6 6 0 1 0 11.4 0"/>
    </svg>
  ),
  decision: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  rawdata: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
};

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'trade',       label: 'Trade Calculator' },
  { id: 'range',       label: 'Range Levels' },
  { id: 'markov',      label: 'Markov' },
  { id: 'ml',          label: 'Statistical Model' },
  { id: 'decision',    label: 'Signal Summary' },
  { id: 'rawdata',     label: 'Raw Data' },
];

export default function TabNav({ active, onChange, hasML }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        padding: '4px',
        width: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .tabnav-wrap::-webkit-scrollbar { display: none; }
        @media (max-width: 600px) {
          .tabnav-btn span { display: none; }
        }
      `}</style>
      {TABS.filter(t => t.id !== 'ml' || hasML).map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="tabnav-btn"
          style={{
            flex: 1,
            padding: '7px 8px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: active === tab.id ? 600 : 500,
            whiteSpace: 'nowrap',
            transition: 'var(--transition)',
            background: active === tab.id ? 'var(--accent)' : 'transparent',
            color: active === tab.id ? 'white' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            minWidth: 0,
          }}
          onMouseEnter={e => {
            if (active !== tab.id) e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            if (active !== tab.id) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {icons[tab.id]}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
