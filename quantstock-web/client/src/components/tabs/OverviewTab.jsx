import React from 'react';
import MetricsRow from '../MetricsRow';
import PriceChart from '../PriceChart';
import InfoTooltip from '../ui/InfoTooltip';

function fmtNum(v, dec = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

// v is raw INR value (price × shares) OR already-in-Cr if marketCapInCr flag set
function fmtMktCap(v, inCr = false) {
  if (v == null || v === 0) return '—';
  const cr = inCr ? v : v / 1e7;            // convert raw INR → Crores
  if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)} L.Cr`;   // Lakh Crore (≥ 1L Cr)
  if (cr >= 1)   return `₹${cr.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Cr`;
  return `₹${(cr * 100).toFixed(0)} L`;     // sub-crore: show in lakhs
}

function ReturnBadge({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pos = value >= 0;
  const abs = Math.abs(value);
  // bar width: 0–5% = 0–100%
  const barW = Math.min(abs * 10, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden', minWidth: 40 }}>
        <div style={{
          height: '100%', width: `${barW}%`,
          background: pos ? 'var(--success)' : 'var(--danger)',
          borderRadius: 2, opacity: 0.75,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: pos ? 'var(--success)' : 'var(--danger)', width: 56, textAlign: 'right' }}>
        {pos ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
}

const RETURN_TIPS = {
  '1D':  { title: '1-Day Return', desc: 'Price change from previous close to today\'s close.', formula: '(Close − PrevClose) / PrevClose × 100' },
  '5D':  { title: '5-Day Return', desc: 'Price change over the last 5 trading sessions (~1 week).', formula: '(Close[0] − Close[−5]) / Close[−5] × 100' },
  '1M':  { title: '1-Month Return', desc: 'Price change over ~21 trading sessions (1 calendar month).', formula: '(Close[0] − Close[−21]) / Close[−21] × 100' },
  '3M':  { title: '3-Month Return', desc: 'Price change over ~63 trading sessions (1 quarter).', formula: '(Close[0] − Close[−63]) / Close[−63] × 100' },
  '6M':  { title: '6-Month Return', desc: 'Price change over ~126 trading sessions (half a year).', formula: '(Close[0] − Close[−126]) / Close[−126] × 100' },
};

const LEVEL_TIPS = {
  'Current Price': { title: 'Current Price', desc: 'Last traded closing price.' },
  'Open':   { title: 'Open', desc: 'First traded price of the most recent session.' },
  'High':   { title: 'Session High', desc: 'Highest price during the most recent session.' },
  'Low':    { title: 'Session Low', desc: 'Lowest price during the most recent session.' },
  'MA 20':  { title: 'MA 20', desc: 'Simple 20-period moving average. Short-term trend.', formula: 'MA20 = Σ Close[i] / 20', range: 'Price > MA20 = short-term bullish.' },
  'MA 50':  { title: 'MA 50', desc: 'Simple 50-period moving average. Medium-term trend.', formula: 'MA50 = Σ Close[i] / 50', range: 'Price > MA50 = medium-term bullish.' },
  'MA 200': { title: 'MA 200', desc: '200-period moving average. The long-term trend benchmark.', formula: 'MA200 = Σ Close[i] / 200', range: 'Price > MA200 = secular bull market.' },
  'MACD':   { title: 'MACD', desc: 'EMA(12) − EMA(26). Momentum indicator.', formula: 'MACD = EMA12 − EMA26', range: 'Positive = bullish momentum.' },
  'MACD Signal': { title: 'MACD Signal', desc: '9-period EMA of MACD. Trigger line.', formula: 'Signal = EMA(MACD, 9)', range: 'MACD > Signal = bullish crossover.' },
  'MACD Hist':   { title: 'MACD Histogram', desc: 'MACD − Signal. Momentum acceleration.', formula: 'Hist = MACD − Signal' },
};

const FUND_TIPS = {
  'Market Cap':    { title: 'Market Cap', desc: 'Total market value of outstanding shares.', formula: 'Price × Shares Outstanding', range: '> ₹20,000 Cr = Large cap.' },
  'P/E Ratio':     { title: 'P/E Ratio', desc: 'Price investors pay per ₹1 of earnings.', formula: 'Price / EPS', range: 'Lower than peers may indicate undervaluation.' },
  'ROE':           { title: 'Return on Equity', desc: 'Profit generated per ₹1 of shareholders equity.', formula: 'Net Income / Equity × 100', range: '> 15% = Good. > 20% = Excellent.' },
  'Debt / Equity': { title: 'Debt / Equity', desc: 'Proportion of debt vs equity financing.', formula: 'Total Debt / Total Equity', range: '< 1 = Conservative. > 2 = High risk.' },
};

function KvRow({ label, value, tip }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>
        {label}
        {tip && <InfoTooltip {...tip} />}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function OverviewTab({ data }) {
  const { lastBar, history, fundamentals } = data;

  const returns = [
    { label: '1D',  v: lastBar.ret1d,  full: '1 Day' },
    { label: '5D',  v: lastBar.ret5d,  full: '5 Days' },
    { label: '1M',  v: lastBar.ret1m,  full: '1 Month' },
    { label: '3M',  v: lastBar.ret3m,  full: '3 Months' },
    { label: '6M',  v: lastBar.ret6m,  full: '6 Months' },
  ];

  const levels = [
    { label: 'Current Price', value: `₹${fmtNum(lastBar.close)}` },
    { label: 'Open',          value: `₹${fmtNum(lastBar.open)}` },
    { label: 'High',          value: `₹${fmtNum(lastBar.high)}` },
    { label: 'Low',           value: `₹${fmtNum(lastBar.low)}` },
    { label: 'MA 20',         value: lastBar.ma20  ? `₹${fmtNum(lastBar.ma20)}`  : '—' },
    { label: 'MA 50',         value: lastBar.ma50  ? `₹${fmtNum(lastBar.ma50)}`  : '—' },
    { label: 'MA 200',        value: lastBar.ma200 ? `₹${fmtNum(lastBar.ma200)}` : '—' },
    { label: 'MACD',          value: lastBar.macd      != null ? fmtNum(lastBar.macd, 3)       : '—' },
    { label: 'MACD Signal',   value: lastBar.macdSignal != null ? fmtNum(lastBar.macdSignal, 3) : '—' },
    { label: 'MACD Hist',     value: lastBar.macdHist   != null ? fmtNum(lastBar.macdHist, 3)   : '—' },
  ];

  const fundRows = fundamentals ? [
    { label: 'Market Cap',    value: fmtMktCap(fundamentals.marketCapCr ?? fundamentals.marketCap, !!fundamentals.marketCapCr) },
    { label: 'P/E Ratio',     value: fundamentals.pe != null ? fmtNum(fundamentals.pe, 1) : 'N/A' },
    { label: 'ROE',           value: fundamentals.roe != null ? `${fmtNum(fundamentals.roe * 100, 1)}%` : 'N/A' },
    { label: 'Debt / Equity', value: fundamentals.debtToEquity != null ? fmtNum(fundamentals.debtToEquity, 2) : 'N/A' },
    { label: '52W High',      value: fundamentals.fiftyTwoWeekHigh != null ? `₹${fmtNum(fundamentals.fiftyTwoWeekHigh)}` : 'N/A' },
    { label: '52W Low',       value: fundamentals.fiftyTwoWeekLow  != null ? `₹${fmtNum(fundamentals.fiftyTwoWeekLow)}`  : 'N/A' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <MetricsRow data={data} />
      <PriceChart history={history} />

      {/* Returns + Key Levels side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

        {/* Returns compact card */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Returns
            <InfoTooltip
              title="Price Returns"
              desc="Percentage change in closing price over each lookback period."
              formula="Return = (Close[today] − Close[N days ago]) / Close[N days ago] × 100"
            />
          </div>
          {returns.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 28, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {r.label}
                <InfoTooltip {...RETURN_TIPS[r.label]} />
              </span>
              <div style={{ flex: 1 }}>
                <ReturnBadge value={r.v} />
              </div>
            </div>
          ))}
        </div>

        {/* Key Levels compact card */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Key Levels
            <InfoTooltip title="Key Levels" desc="Price vs key moving averages and momentum indicators." />
          </div>
          {levels.map(l => (
            <KvRow key={l.label} label={l.label} value={l.value} tip={LEVEL_TIPS[l.label]} />
          ))}
        </div>
      </div>

      {/* Fundamentals */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Fundamentals
          <InfoTooltip title="Fundamental Data" desc="Company financial metrics sourced from Yahoo Finance and NSE." />
        </div>

        {/* Sector / Industry pills */}
        {(fundamentals?.sector || fundamentals?.industry) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {fundamentals.sector && (
              <span style={{
                padding: '3px 12px', borderRadius: 'var(--radius-pill)',
                background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
                fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              }}>
                {fundamentals.sector}
              </span>
            )}
            {fundamentals.industry && (
              <span style={{
                padding: '3px 12px', borderRadius: 'var(--radius-pill)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-secondary)',
              }}>
                {fundamentals.industry}
              </span>
            )}
          </div>
        )}

        {fundRows.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {fundRows.map(f => (
              <div key={f.label} style={{
                padding: '10px 12px', background: 'var(--surface-2)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {f.label}
                  {FUND_TIPS[f.label] && <InfoTooltip {...FUND_TIPS[f.label]} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{f.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            Fundamental data is only available for Yahoo Finance stocks (not CSV uploads).
          </div>
        )}
      </div>
    </div>
  );
}
