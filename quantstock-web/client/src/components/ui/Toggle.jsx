import React from 'react';

export default function Toggle({ label, checked, onChange, description }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
      onClick={() => onChange(!checked)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? 'var(--accent)' : 'var(--surface-3)',
          border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
          position: 'relative',
          transition: 'var(--transition)',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 17 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'white',
            transition: 'var(--transition)',
          }}
        />
      </div>
    </div>
  );
}
