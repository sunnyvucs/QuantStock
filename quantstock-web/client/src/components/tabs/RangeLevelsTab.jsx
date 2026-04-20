import React from 'react';
import Badge from '../ui/Badge';
import InfoTooltip from '../ui/InfoTooltip';

function fmt(v, dec = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

function LevelRow({ label, price, pct, color, tip }) {
  const isAbove = pct >= 0;
  const barW = Math.min(Math.abs(pct) * 5, 100);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: 'var(--surface)',
      border: `1px solid ${color ? `${color}30` : 'var(--border)'}`,
      borderRadius: 8,
    }}>
      {/* Label + tooltip */}
      <div style={{ width: 120, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {tip && <InfoTooltip {...tip} />}
      </div>

      {/* Bar */}
      <div style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${barW}%`,
          background: color || (isAbove ? 'var(--success)' : 'var(--danger)'),
          borderRadius: 2, opacity: 0.75,
        }} />
      </div>

      {/* Price */}
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text-primary)', width: 80, textAlign: 'right' }}>
        ₹{fmt(price)}
      </span>

      {/* Pct badge */}
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: isAbove ? 'var(--success)' : 'var(--danger)',
        background: isAbove ? 'var(--success-soft)' : 'var(--danger-soft)',
        padding: '2px 8px', borderRadius: 'var(--radius-pill)',
        width: 56, textAlign: 'center', flexShrink: 0,
      }}>
        {isAbove ? '+' : ''}{fmt(pct)}%
      </span>
    </div>
  );
}

const LEVEL_DEFS = {
  'R1 (Resistance)': {
    title: 'R1 — First Resistance',
    desc: 'Nearest resistance above pivot. Price often stalls or reverses near R1.',
    formula: 'R1 = (2 × Pivot) − Low',
    range: 'Approaching R1 = potential take-profit zone.',
  },
  'Expected High': {
    title: 'Expected Session High',
    desc: 'Upper ATR band above pivot. Statistically unlikely to be exceeded in a normal session.',
    formula: 'Expected High = Pivot + (ATR × Multiplier)',
    range: 'Breakout above = unusually strong bullish move.',
  },
  'Pivot': {
    title: 'Pivot Point',
    desc: 'Average of previous session\'s H, L, C. Central reference — above = bullish, below = bearish.',
    formula: 'Pivot = (High + Low + Close) / 3',
  },
  'Current Price': {
    title: 'Current Price',
    desc: 'Last traded closing price. Reference point within the price ladder.',
  },
  'Expected Low': {
    title: 'Expected Session Low',
    desc: 'Lower ATR band below pivot. Statistically unlikely to be breached in a normal session.',
    formula: 'Expected Low = Pivot − (ATR × Multiplier)',
    range: 'Breakdown below = unusually strong bearish move.',
  },
  'S1 (Support)': {
    title: 'S1 — First Support',
    desc: 'Nearest support below pivot. Price often bounces near S1.',
    formula: 'S1 = (2 × Pivot) − High',
    range: 'Price near S1 = potential support/stop-loss zone.',
  },
};

export default function RangeLevelsTab({ data }) {
  const { rangeLevels: rl, price } = data;

  if (!rl) return <div style={{ color: 'var(--text-secondary)' }}>No range levels data.</div>;

  const biasBadge = rl.bias === 'Bullish' ? 'success' : 'danger';

  const levels = [
    { label: 'R1 (Resistance)', price: rl.r1,    pct: rl.r1Pct,    color: '#4ade80' },
    { label: 'Expected High',   price: rl.expH,   pct: rl.exphPct,  color: '#86efac' },
    { label: 'Pivot',           price: rl.pivot,  pct: rl.pivotPct, color: '#6366f1' },
    { label: 'Current Price',   price,            pct: 0,           color: '#f1f5f9' },
    { label: 'Expected Low',    price: rl.expL,   pct: rl.explPct,  color: '#fca5a5' },
    { label: 'S1 (Support)',    price: rl.s1,     pct: rl.s1Pct,    color: '#f87171' },
  ].sort((a, b) => b.price - a.price);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>

      {/* Horizon label */}
      <div style={{
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 8,
        fontSize: 12, color: 'var(--text-secondary)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>⏱ Time Horizon:</span>
        Next Trading Session (1 Day)
      </div>

      {/* Bias + stats row */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            Range Bias
            <InfoTooltip
              title="Range Bias"
              desc="Bullish if current price is above the pivot; Bearish if below."
              formula="Bias = 'Bullish' if Price > Pivot else 'Bearish'"
            />
          </span>
          <Badge variant={biasBadge} style={{ fontSize: 12, padding: '4px 12px' }}>{rl.bias}</Badge>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'ATR (14)', value: `₹${fmt(rl.atr)}`, tip: { title: 'ATR-14', desc: 'Average daily range over 14 sessions. Used to set Expected High/Low bands.', formula: 'TR = max(H−L, |H−prevC|, |L−prevC|)\nATR = EWM(TR, span=14)', range: 'Higher = more volatile.' } },
            { label: 'Pivot',    value: `₹${fmt(rl.pivot)}`, tip: { title: 'Pivot Point', desc: 'Central reference: (H+L+C)/3 of the previous session.', formula: 'Pivot = (High + Low + Close) / 3' } },
            { label: 'vs Pivot', value: `${rl.pivotPct >= 0 ? '+' : ''}${fmt(rl.pivotPct)}%`, tip: { title: 'Price vs Pivot', desc: 'Percentage distance above or below the pivot.', formula: '(Price − Pivot) / Pivot × 100' }, color: rl.pivotPct >= 0 ? 'var(--success)' : 'var(--danger)' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {s.label}<InfoTooltip {...s.tip} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color || 'var(--accent)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Ladder — compact rows */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          Price Ladder
          <InfoTooltip
            title="Price Ladder"
            desc="Key price levels sorted highest to lowest. Shows where price sits relative to resistance (above) and support (below)."
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {levels.map(l => (
            <LevelRow key={l.label} {...l} tip={LEVEL_DEFS[l.label]} />
          ))}
        </div>
      </div>

      {/* ATR Band Detail — compact grid */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ATR Band Details
          <InfoTooltip
            title="ATR Bands"
            desc="Expected session range derived from ATR × Multiplier around the pivot."
            formula={'Expected High = Pivot + (ATR × Mult)\nExpected Low  = Pivot − (ATR × Mult)'}
            range="Price outside bands = high-momentum breakout."
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { label: 'ATR × Mult', value: `₹${fmt(rl.atr)} × ${data.params?.atrMult ?? 1.5}`, tip: { title: 'ATR Multiplier', desc: 'Multiplier applied to ATR for band width. Higher = wider bands.' } },
            { label: 'Band Width', value: `₹${fmt((rl.expH || 0) - (rl.expL || 0))}`, tip: { title: 'Band Width', desc: 'Total distance between Expected High and Low.', formula: '2 × ATR × Multiplier' } },
            { label: 'Upper Band', value: `+${fmt(rl.exphPct)}%`, tip: { title: 'Upper Band %', desc: '% distance from current price to Expected High.' } },
            { label: 'Lower Band', value: `${fmt(rl.explPct)}%`, tip: { title: 'Lower Band %', desc: '% distance from current price to Expected Low.' } },
          ].map(f => (
            <div key={f.label} style={{
              padding: '8px 12px', background: 'var(--surface-2)',
              borderRadius: 8, border: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {f.label}<InfoTooltip {...f.tip} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
