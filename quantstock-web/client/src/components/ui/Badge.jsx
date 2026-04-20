import React from 'react';

const VARIANTS = {
  success: { bg: 'var(--success-soft)', color: 'var(--success)', border: 'rgba(74,222,128,0.2)' },
  warning: { bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'rgba(251,191,36,0.2)' },
  danger:  { bg: 'var(--danger-soft)',  color: 'var(--danger)',  border: 'rgba(248,113,113,0.2)' },
  info:    { bg: 'var(--info-soft)',    color: 'var(--info)',    border: 'rgba(56,189,248,0.2)' },
  accent:  { bg: 'var(--accent-soft)', color: 'var(--accent)',  border: 'rgba(99,102,241,0.2)' },
  neutral: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'var(--border)' },
};

export default function Badge({ children, variant = 'neutral', style: extraStyle }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...extraStyle,
      }}
    >
      {children}
    </span>
  );
}
