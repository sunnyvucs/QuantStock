import React, { useState, useMemo } from 'react';

const COLS = [
  { key: 'date',       label: 'Date',        fmt: v => v },
  { key: 'open',       label: 'Open',        fmt: v => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'high',       label: 'High',        fmt: v => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'low',        label: 'Low',         fmt: v => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'close',      label: 'Close',       fmt: v => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'volume',     label: 'Volume',      fmt: v => v != null ? Number(v).toLocaleString() : '—' },
  { key: 'ma20',       label: 'MA20',        fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'ma50',       label: 'MA50',        fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'ma200',      label: 'MA200',       fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'rsi',        label: 'RSI',         fmt: v => v != null ? Number(v).toFixed(1) : '—' },
  { key: 'macd',       label: 'MACD',        fmt: v => v != null ? Number(v).toFixed(3) : '—' },
  { key: 'macdSignal', label: 'Signal',      fmt: v => v != null ? Number(v).toFixed(3) : '—' },
  { key: 'atr',        label: 'ATR',         fmt: v => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'ret1d',      label: 'Ret 1D%',     fmt: v => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—' },
  { key: 'ret5d',      label: 'Ret 5D%',     fmt: v => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—' },
  { key: 'ret1m',      label: 'Ret 1M%',     fmt: v => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—' },
];

function downloadCsv(history, name) {
  const headers = COLS.map(c => c.label).join(',');
  const rows = history.map(row =>
    COLS.map(c => {
      const v = row[c.key];
      return v != null ? String(v).replace(/,/g, '') : '';
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'quantstock'}_data.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 50;

export default function RawDataTab({ data }) {
  const { history, name } = data;
  const [page, setPage] = useState(0);

  if (!history || history.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No raw data available.</div>;
  }

  // Show latest first
  const reversed = useMemo(() => [...history].reverse(), [history]);
  const totalPages = Math.ceil(reversed.length / PAGE_SIZE);
  const pageData = reversed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {reversed.length} bars total | Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, reversed.length)}
        </div>
        <button
          onClick={() => downloadCsv(history, name)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: 'var(--accent-soft)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
              {COLS.map(c => (
                <th key={c.key} style={{
                  padding: '10px 12px', textAlign: c.key === 'date' ? 'left' : 'right',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const ret = row.ret1d;
              const rowBg = ret != null ? (ret >= 0 ? 'rgba(74,222,128,0.02)' : 'rgba(248,113,113,0.02)') : 'transparent';
              return (
                <tr
                  key={row.date || i}
                  style={{ background: rowBg, transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                >
                  {COLS.map(c => {
                    const v = row[c.key];
                    const isReturn = c.key.startsWith('ret');
                    const numV = isReturn ? parseFloat(v) : null;
                    const color = isReturn && numV != null
                      ? (numV >= 0 ? 'var(--success)' : 'var(--danger)')
                      : 'var(--text-primary)';
                    return (
                      <td key={c.key} style={{
                        padding: '8px 12px',
                        textAlign: c.key === 'date' ? 'left' : 'right',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        color,
                        fontFamily: c.key !== 'date' ? 'monospace' : undefined,
                        whiteSpace: 'nowrap',
                      }}>
                        {c.fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page === 0 ? 'default' : 'pointer', fontSize: 12,
            }}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${p === page ? 'var(--accent)' : 'var(--border)'}`,
                  background: p === page ? 'var(--accent-soft)' : 'transparent',
                  color: p === page ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400,
                }}
              >
                {p + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: page === totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: page === totalPages - 1 ? 'default' : 'pointer', fontSize: 12,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
