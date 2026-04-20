import React from 'react';
import MetricCard from './ui/MetricCard';
import InfoTooltip from './ui/InfoTooltip';

function formatVolume(v) {
  if (!v) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return String(v);
}

function rsiColor(rsi) {
  if (rsi == null) return 'var(--text-primary)';
  if (rsi >= 70) return 'var(--danger)';
  if (rsi <= 30) return 'var(--success)';
  return 'var(--text-primary)';
}

function trendColor(score) {
  if (score >= 4) return 'var(--success)';
  if (score >= 3) return 'var(--warning)';
  return 'var(--danger)';
}

function LabelWithInfo({ label, ...tip }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {label}
      <InfoTooltip {...tip} />
    </span>
  );
}

export default function MetricsRow({ data }) {
  const { price, lastBar } = data;
  const ret1d = lastBar?.ret1d;
  const retColor = ret1d >= 0 ? 'var(--success)' : 'var(--danger)';
  const retSign = ret1d >= 0 ? '+' : '';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }} className="metrics-row">
      <style>{`
        @media (max-width: 768px) { .metrics-row { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 480px) { .metrics-row { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      <MetricCard
        label={<LabelWithInfo label="Price"
          title="Last Close Price"
          desc="The last traded closing price of the stock for the most recent session."
          formula="Close Price (last bar)"
          range="Compare with MA20/50/200 to judge trend direction." />}
        value={price != null ? `₹${price.toFixed(2)}` : '—'}
        sub={ret1d != null ? `${retSign}${ret1d.toFixed(2)}% today` : undefined}
        valueColor={ret1d != null ? retColor : undefined}
        icon="₹"
      />
      <MetricCard
        label={<LabelWithInfo label="Volume"
          title="Trading Volume"
          desc="Total number of shares traded during the last session. High volume confirms price moves."
          range="Above 20-day avg volume = strong conviction. Below = weak signal." />}
        value={formatVolume(lastBar?.volume)}
        icon="📊"
      />
      <MetricCard
        label={<LabelWithInfo label="RSI (14)"
          title="Relative Strength Index (14)"
          desc="Measures momentum by comparing average gains vs losses over 14 periods. Oscillates 0–100."
          formula={"RSI = 100 - (100 / (1 + RS))\nRS = Avg Gain(14) / Avg Loss(14)"}
          range="< 30 = Oversold (bullish indication)\n30–70 = Neutral\n> 70 = Overbought (bearish indication)" />}
        value={lastBar?.rsi != null ? lastBar.rsi.toFixed(1) : '—'}
        sub={lastBar?.rsi >= 70 ? 'Overbought' : lastBar?.rsi <= 30 ? 'Oversold' : 'Neutral'}
        valueColor={rsiColor(lastBar?.rsi)}
        icon="⚡"
      />
      <MetricCard
        label={<LabelWithInfo label="ATR (14)"
          title="Average True Range (14)"
          desc="Average daily price range over 14 periods. Measures volatility — how much the stock typically moves per day."
          formula={"TR = max(H-L, |H-prevC|, |L-prevC|)\nATR = EWM(TR, span=14)"}
          range="Higher ATR = more volatile. Use for stop-loss sizing: SL = Price - (ATR × multiplier)." />}
        value={lastBar?.atr != null ? `₹${lastBar.atr.toFixed(2)}` : '—'}
        sub="Daily range"
        icon="📐"
      />
      <MetricCard
        label={<LabelWithInfo label="Trend Score"
          title="Trend Score (0–5)"
          desc="Composite 5-point score based on five technical conditions. Each passed condition adds 1 point."
          formula={"Score = Σ(conditions met)\n1. Price > MA20\n2. Price > MA50\n3. Price > MA200\n4. RSI < 75\n5. MACD > Signal"}
          range="4–5 = Strong uptrend\n3 = Moderate\n0–2 = Weak / bearish" />}
        value={data.trend != null ? `${data.trend.score} / 5` : '—'}
        sub={data.trend?.score >= 4 ? 'Strong' : data.trend?.score >= 3 ? 'Moderate' : 'Weak'}
        valueColor={trendColor(data.trend?.score)}
        icon="📈"
      />
    </div>
  );
}
