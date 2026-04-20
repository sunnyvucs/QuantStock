import React, { useState, useRef } from 'react';
import { useAnalysis } from './hooks/useAnalysis';
import SearchBar from './components/SearchBar';
import AnimatedBackground from './components/AnimatedBackground';
import TabNav from './components/TabNav';
import LoadingOverlay from './components/ui/LoadingOverlay';
import OverviewTab from './components/tabs/OverviewTab';
import TradePlanTab from './components/tabs/TradePlanTab';
import RangeLevelsTab from './components/tabs/RangeLevelsTab';
import MarkovTab from './components/tabs/MarkovTab';
import MLTab from './components/tabs/MLTab';
import DecisionTab from './components/tabs/DecisionTab';
import RawDataTab from './components/tabs/RawDataTab';

const QUICK_SYMBOLS = [
  { symbol: 'TCS.NS', label: 'TCS' },
  { symbol: 'RELIANCE.NS', label: 'Reliance' },
  { symbol: 'INFY.NS', label: 'Infosys' },
  { symbol: 'HDFCBANK.NS', label: 'HDFC Bank' },
  { symbol: 'ICICIBANK.NS', label: 'ICICI Bank' },
  { symbol: 'WIPRO.NS', label: 'Wipro' },
];

function DecisionBadge({ decision }) {
  if (!decision) return null;
  return (
    <span style={{
      padding: '4px 14px',
      borderRadius: 'var(--radius-pill)',
      background: `${decision.color}18`,
      border: `1px solid ${decision.color}40`,
      color: decision.color,
      fontSize: 12, fontWeight: 700,
      letterSpacing: '0.03em',
    }}>
      {decision.label} · {decision.score.toFixed(0)}
    </span>
  );
}

function ParamInput({ label, prefix, value, min, max, step, onChange }) {
  const dec = step < 1 ? String(step).split('.')[1]?.length || 1 : 0;
  const clamp = v => Math.min(max, Math.max(min, parseFloat(v.toFixed(dec))));

  const btnStyle = {
    width: 26, height: 26, borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface-3)',
    color: 'var(--text-secondary)',
    fontSize: 15, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    transition: 'var(--transition)',
    lineHeight: 1, padding: 0,
    userSelect: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '3px 5px',
        transition: 'var(--transition)',
      }}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <button type="button" style={btnStyle}
          onClick={() => onChange(clamp(value - step))}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >−</button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          {prefix && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{prefix}</span>}
          <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clamp(v)); }}
            style={{
              width: prefix ? 72 : 52,
              background: 'transparent', border: 'none',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
              outline: 'none', textAlign: 'center',
              MozAppearance: 'textfield',
            }}
          />
        </div>

        <button type="button" style={btnStyle}
          onClick={() => onChange(clamp(value + step))}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >+</button>
      </div>
    </div>
  );
}

export default function App() {
  const {
    params, updateParam,
    analysisData, loading, error,
    searchResults, searchLoading,
    activeTab, setActiveTab,
    runAnalysis, runCsvAnalysis,
    rerun, paramsChanged, hasSymbol,
    search, clearSearch,
  } = useAnalysis();

  const [pendingSymbol, setPendingSymbol] = useState(null);
  const fileRef = useRef(null);
  const hasML = !!analysisData?.ml;

  const handleSymbolSelect = (sym) => {
    clearSearch();
    setPendingSymbol(sym);
  };

  const handleAnalyse = () => {
    if (pendingSymbol) {
      runAnalysis(pendingSymbol);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>

      {/* ─── Ambient animated background ────────────────────────────────────── */}
      <AnimatedBackground />

      {loading && <LoadingOverlay message={`Analysing${analysisData ? ' again' : ''}...`} />}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,15,0.75)',
        backdropFilter: 'blur(20px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            📈
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              QuantStock
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1 }}>
              Indian Stock Analysis
            </div>
          </div>
        </div>

        {/* Header search — only shown after first analysis */}
        {analysisData && (
          <div style={{ flex: 1, maxWidth: 480, display: 'flex', justifyContent: 'center' }}>
            <SearchBar
              onSearch={search}
              onSelect={(sym) => { clearSearch(); runAnalysis(sym); }}
              results={searchResults}
              loading={searchLoading}
            />
          </div>
        )}
        {/* CSV upload button in header */}
        {!analysisData && (
          <div style={{ flexShrink: 0 }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) { runCsvAnalysis(e.target.files[0]); e.target.value = ''; } }} />
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              CSV
            </button>
          </div>
        )}

        {analysisData?.decision && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'none' }} className="hide-sm">
              {analysisData.name}
            </span>
            <DecisionBadge decision={analysisData.decision} />
          </div>
        )}
      </header>

      {/* ─── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>
        <style>{`.hide-sm { display: none !important; } @media (max-width: 600px) { .params-bar { flex-wrap: wrap !important; } }`}</style>

        {/* ─── Main content ─────────────────────────────────────────────────── */}
        <main style={{ minWidth: 0 }}>

          {/* Error */}
          {error && (
            <div style={{
              padding: '14px 20px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" flexShrink="0">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* Welcome / Hero state */}
          {!analysisData && !loading && !error && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 28, padding: '80px 24px 60px',
              textAlign: 'center',
            }}>
              <div>
                <h1 style={{
                  fontSize: 48, fontWeight: 900, color: 'var(--text-primary)',
                  lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 12,
                }}>
                  Indian Stock<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>Analysis Platform</span>
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                  NSE · BSE · Educational purposes only
                </p>
              </div>

              {/* Search */}
              <div style={{ width: '100%', maxWidth: 560 }}>
                <SearchBar
                  onSearch={search}
                  onSelect={handleSymbolSelect}
                  results={searchResults}
                  loading={searchLoading}
                />
              </div>

              {/* ── Params bar — slides in after stock selected ── */}
              {pendingSymbol && (
                <div style={{
                  width: '100%', maxWidth: 560,
                  background: 'var(--surface)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
                  animation: 'fadeIn 0.3s ease',
                  boxShadow: '0 0 24px rgba(99,102,241,0.08)',
                }}
                  className="params-bar"
                >
                  <ParamInput
                    label="Investment Amount"
                    prefix="₹"
                    value={params.investment}
                    min={1000} max={10000000} step={1000}
                    onChange={v => updateParam('investment', v)}
                  />
                  <ParamInput
                    label="Target Return %"
                    value={params.targetPct}
                    min={1} max={50} step={0.5}
                    onChange={v => updateParam('targetPct', v)}
                  />
                  <button
                    onClick={handleAnalyse}
                    style={{
                      padding: '8px 24px', background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', transition: 'var(--transition)', marginLeft: 'auto',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Analyse →
                  </button>
                </div>
              )}

              {/* Quick chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {QUICK_SYMBOLS.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => { setPendingSymbol(s.symbol); }}
                    style={{
                      padding: '5px 14px', borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${pendingSymbol === s.symbol ? 'var(--accent)' : 'var(--border)'}`,
                      background: pendingSymbol === s.symbol ? 'var(--accent-soft)' : 'transparent',
                      color: pendingSymbol === s.symbol ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => { if (pendingSymbol !== s.symbol) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
                    onMouseLeave={e => { if (pendingSymbol !== s.symbol) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis result */}
          {analysisData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>

              {/* Stock header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2, letterSpacing: '-0.01em' }}>
                    {analysisData.name}
                  </h2>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {analysisData.lastBar?.date}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{analysisData.price?.toFixed(2)}
                  </span>
                  {analysisData.lastBar?.ret1d != null && (
                    <span style={{
                      color: analysisData.lastBar.ret1d >= 0 ? 'var(--success)' : 'var(--danger)',
                      fontSize: 13, fontWeight: 700,
                      background: analysisData.lastBar.ret1d >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                      padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                    }}>
                      {analysisData.lastBar.ret1d >= 0 ? '+' : ''}{analysisData.lastBar.ret1d.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* ── Adjustable params strip ── */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
              }}
                className="params-bar"
              >
                <ParamInput label="Investment" prefix="₹" value={params.investment} min={1000} max={10000000} step={1000} onChange={v => { updateParam('investment', v); }} />
                <ParamInput label="Target Return %" value={params.targetPct} min={1} max={50} step={0.5} onChange={v => updateParam('targetPct', v)} />
                <ParamInput label="Stop Loss %" value={params.slPct} min={0.5} max={25} step={0.5} onChange={v => updateParam('slPct', v)} />
                <ParamInput label="ATR Multiplier" value={params.atrMult} min={0.5} max={3} step={0.1} onChange={v => updateParam('atrMult', v)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={params.enableMl} onChange={e => updateParam('enableMl', e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                    ML Model
                  </label>
                  <button
                    onClick={rerun}
                    disabled={!paramsChanged || loading}
                    style={{
                      padding: '7px 18px', background: paramsChanged ? 'var(--accent)' : 'var(--surface-3)',
                      color: paramsChanged ? '#fff' : 'var(--text-muted)',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: paramsChanged ? 'pointer' : 'default', transition: 'var(--transition)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (paramsChanged) e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {loading ? '...' : 'Re-analyse'}
                  </button>
                </div>
              </div>

              {/* SL auto-derived hint */}
              {!params.slManual && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -8 }}>
                  Stop loss auto-set to 50% of target return ({params.slPct}%). Edit to override.
                </div>
              )}

              {/* Tab Navigation */}
              <TabNav active={activeTab} onChange={setActiveTab} hasML={hasML} />

              {/* Tab content */}
              <div className="tab-content" style={{ animation: 'fadeIn 0.25s ease', width: '100%' }} key={activeTab}>
                {activeTab === 'overview'  && <OverviewTab data={analysisData} />}
                {activeTab === 'trade'     && <TradePlanTab data={analysisData} />}
                {activeTab === 'range'     && <RangeLevelsTab data={analysisData} />}
                {activeTab === 'markov'    && <MarkovTab data={analysisData} />}
                {activeTab === 'ml'        && <MLTab data={analysisData} />}
                {activeTab === 'decision'  && <DecisionTab data={analysisData} />}
                {activeTab === 'rawdata'   && <RawDataTab data={analysisData} />}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 40,
        lineHeight: 1.7,
        maxWidth: 800,
        margin: '40px auto 0',
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>QuantStock</strong> — All data and statistical outputs are provided for <strong>educational and informational purposes only</strong>. Nothing on this platform constitutes financial advice, investment recommendations, or solicitation to buy or sell any security. Statistical model outputs do not guarantee future results. Always consult a <strong>SEBI-registered investment advisor</strong> before making any investment decisions.
      </footer>
    </div>
  );
}
