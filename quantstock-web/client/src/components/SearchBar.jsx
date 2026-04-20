import React, { useState, useRef, useEffect, useCallback } from 'react';

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export default function SearchBar({ onSearch, onSelect, results, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce((q) => { if (q.trim().length > 1) onSearch(q); }, 350),
    [onSearch]
  );

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.trim().length > 1) {
      debouncedSearch(v);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleSelect = (item) => {
    setQuery(item.name ? `${item.name} (${item.symbol})` : item.symbol);
    setOpen(false);
    onSelect(item.symbol);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false);
      // If query looks like a symbol, use directly
      const sym = query.trim().toUpperCase();
      if (results.length > 0) {
        handleSelect(results[0]);
      } else {
        onSelect(sym.includes('.') ? sym : sym + '.NS');
      }
    }
    if (e.key === 'Escape') setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: open && results.length > 0 ? '12px 12px 0 0' : 'var(--radius-md)',
          padding: '0 16px',
          transition: 'var(--transition)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search NSE / BSE stocks… (e.g. TCS, Reliance)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            padding: '14px 0',
          }}
        />
        {loading && (
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid var(--surface-3)', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite', flexShrink: 0,
          }} />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', padding: 2,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--accent)',
            borderTop: '1px solid var(--border)',
            borderRadius: '0 0 12px 12px',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {results.map((item, i) => (
            <div
              key={item.symbol}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name || item.symbol}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 1 }}>
                  {item.exchange}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'var(--accent-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  flexShrink: 0,
                  fontFamily: 'monospace',
                }}
              >
                {item.symbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
