import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function InfoTooltip({ title, desc, formula, range, inline = true }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // null until measured
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const leaveTimer = useRef(null);

  const openTooltip = () => { clearTimeout(leaveTimer.current); setOpen(true); };
  const closeTooltip = () => { leaveTimer.current = setTimeout(() => setOpen(false), 150); };

  // Measure and position AFTER panel mounts
  const measurePanel = useCallback((node) => {
    panelRef.current = node;
    if (!node || !btnRef.current) return;

    const btn = btnRef.current.getBoundingClientRect();
    const pw = node.offsetWidth || 260;
    const ph = node.offsetHeight || 100;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = btn.left + btn.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, vw - pw - 8));

    const spaceAbove = btn.top - 8;
    const showBelow = spaceAbove < ph && (vh - btn.bottom - 8) >= ph;
    const top = showBelow ? btn.bottom + 8 : btn.top - ph - 8;

    setPos({ top, left, showBelow });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset pos when closed so stale position doesn't flash on next open
  useEffect(() => { if (!open) setPos(null); }, [open]);

  const panel = open ? createPortal(
    <div
      ref={measurePanel}
      role="tooltip"
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      style={{
        position: 'fixed',
        // Hidden until measured to avoid flash at wrong position
        visibility: pos ? 'visible' : 'hidden',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 999999,
        width: 260,
        background: 'rgba(12,12,20,0.98)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.9)',
        pointerEvents: 'auto',
      }}
    >
      {/* Arrow */}
      {pos && (
        <div style={{
          position: 'absolute',
          [pos.showBelow ? 'top' : 'bottom']: -5,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 8, height: 8,
          background: 'rgba(12,12,20,0.98)',
          borderTop: pos.showBelow ? 'none' : '1px solid rgba(99,102,241,0.4)',
          borderLeft: pos.showBelow ? 'none' : '1px solid rgba(99,102,241,0.4)',
          borderBottom: pos.showBelow ? '1px solid rgba(99,102,241,0.4)' : 'none',
          borderRight: pos.showBelow ? '1px solid rgba(99,102,241,0.4)' : 'none',
        }} />
      )}

      {title && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          {title}
        </div>
      )}
      {desc && (
        <div style={{ fontSize: 11.5, color: 'rgba(241,245,249,0.88)', lineHeight: 1.6, marginBottom: formula || range ? 8 : 0 }}>
          {desc}
        </div>
      )}
      {formula && (
        <div style={{ marginBottom: range ? 8 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(99,102,241,0.9)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Formula
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 11, color: '#a5b4fc',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 6, padding: '5px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {formula}
          </div>
        </div>
      )}
      {range && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(74,222,128,0.9)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interpretation
          </div>
          <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.72)', lineHeight: 1.6 }}>
            {range}
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <span style={{
      display: inline ? 'inline-flex' : 'flex',
      alignItems: 'center',
      marginLeft: 5,
      verticalAlign: 'middle',
    }}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onClick={() => setOpen(o => !o)}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        style={{
          width: 15, height: 15,
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.5)',
          background: open ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.12)',
          color: '#818cf8',
          fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'help', padding: 0, lineHeight: 1, flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        i
      </button>
      {panel}
    </span>
  );
}
