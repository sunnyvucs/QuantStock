import React from 'react';

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    transition: 'var(--transition)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  label: {
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
  },
  value: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
};

export default function MetricCard({ label, value, sub, valueColor, icon }) {
  return (
    <div
      style={styles.card}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ fontSize: 14, opacity: 0.7 }}>{icon}</span>}
        <span style={styles.label}>{label}</span>
      </div>
      <span style={{ ...styles.value, color: valueColor || 'var(--text-primary)' }}>
        {value ?? '—'}
      </span>
      {sub && <span style={styles.sub}>{sub}</span>}
    </div>
  );
}
