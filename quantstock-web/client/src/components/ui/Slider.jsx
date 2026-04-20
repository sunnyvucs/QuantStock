import React from 'react';

export default function Slider({ label, value, min, max, step = 1, onChange, unit = '', format }) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : `${value}${unit}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {label}
        </label>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {display}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            appearance: 'none',
            background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`,
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg);
          transition: var(--transition);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: var(--accent-hover);
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg);
        }
      `}</style>
    </div>
  );
}
