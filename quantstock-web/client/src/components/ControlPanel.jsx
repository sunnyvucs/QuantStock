import React, { useState, useRef } from 'react';
import Slider from './ui/Slider';
import Toggle from './ui/Toggle';

const fmt = (v, d = 1) => Number(v).toFixed(d);

export default function ControlPanel({ params, onUpdate, onCsvUpload }) {
  const [open, setOpen] = useState(true);
  const fileRef = useRef(null);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'var(--transition)',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Parameters
          </span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-secondary)" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'var(--transition)' }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {/* Body */}
      {open && (
        <div
          style={{
            padding: '0 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Investment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Investment Amount
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
              }}>₹</span>
              <input
                type="number"
                value={params.investment}
                min={1000}
                step={1000}
                onChange={e => onUpdate('investment', parseFloat(e.target.value) || 100000)}
                style={{
                  width: '100%', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px 10px 28px', color: 'var(--text-primary)',
                  fontSize: '13px', outline: 'none', transition: 'var(--transition)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border)' }} />

          <Slider
            label="Target Return"
            value={params.targetPct}
            min={1} max={50} step={0.5}
            unit="%"
            onChange={v => onUpdate('targetPct', v)}
          />

          <Slider
            label="Stop Loss"
            value={params.slPct}
            min={1} max={20} step={0.5}
            unit="%"
            onChange={v => onUpdate('slPct', v)}
          />

          <Slider
            label="ATR Multiplier"
            value={params.atrMult}
            min={0.5} max={3.0} step={0.1}
            format={v => fmt(v, 1) + '×'}
            onChange={v => onUpdate('atrMult', v)}
          />

          <div style={{ height: '1px', background: 'var(--border)' }} />

          <Toggle
            label="Enable ML Model"
            description="RandomForest classifier (adds ~5–15s)"
            checked={params.enableMl}
            onChange={v => onUpdate('enableMl', v)}
          />

          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* CSV Upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0]) onCsvUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '10px', background: 'var(--surface-2)',
                border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload CSV
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
              Columns: Date, Open, High, Low, Close, Volume
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
