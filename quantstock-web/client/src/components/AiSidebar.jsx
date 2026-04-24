import React, { useState, useEffect, useRef, useCallback } from 'react';

const PROVIDERS = [
  { id: 'ollama',    label: 'Ollama (Local)',  placeholder: 'Model name, e.g. kimi-k2.5:cloud' },
  { id: 'openai',    label: 'OpenAI',          placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic',       placeholder: 'sk-ant-...' },
  { id: 'gemini',    label: 'Google Gemini',   placeholder: 'AIza...' },
];

const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4o',              label: 'GPT-4o (Most capable)' },
    { value: 'gpt-4o-mini',         label: 'GPT-4o Mini (Fast · cheap)' },
    { value: 'gpt-4-turbo',         label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo',       label: 'GPT-3.5 Turbo (Fastest)' },
    { value: 'o1-mini',             label: 'o1 Mini (Reasoning)' },
    { value: 'o3-mini',             label: 'o3 Mini (Reasoning)' },
  ],
  anthropic: [
    { value: 'claude-opus-4-7',              label: 'Claude Opus 4.7 (Most capable)' },
    { value: 'claude-sonnet-4-6',            label: 'Claude Sonnet 4.6 (Balanced)' },
    { value: 'claude-haiku-4-5-20251001',    label: 'Claude Haiku 4.5 (Fast · cheap)' },
  ],
  gemini: [
    { value: 'gemini-3.1-pro-preview',        label: 'Gemini 3.1 Pro Preview (Latest)' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview (Fast · cheap)' },
    { value: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash Preview' },
    { value: 'gemini-2.5-pro',                label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash (Stable · recommended)' },
    { value: 'gemini-2.5-flash-lite',         label: 'Gemini 2.5 Flash Lite (Cheapest)' },
  ],
};

const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('qs_ai_settings') || '{}'); }
  catch { return {}; }
}
function saveSettings(s) {
  localStorage.setItem('qs_ai_settings', JSON.stringify(s));
}

function buildSystemPrompt(data) {
  if (!data) return 'You are a helpful Indian stock market analyst.';
  const { name, symbol, price, decision, trend, markov, rangeLevels: rl, tradePlan: tp, ml, fundamentals, cagrData, lastBar } = data;
  const fmt = (v, d = 2) => v == null ? 'N/A' : Number(v).toFixed(d);
  const fmtPct = (v, d = 1) => v == null ? 'N/A' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(d)}%`;

  const maLines = [
    `MA20 ₹${fmt(lastBar?.ma20)} (price ${price > lastBar?.ma20 ? 'above' : 'below'})`,
    `MA50 ₹${fmt(lastBar?.ma50)} (price ${price > lastBar?.ma50 ? 'above' : 'below'})`,
    `MA200 ₹${fmt(lastBar?.ma200)} (price ${price > lastBar?.ma200 ? 'above' : 'below'})`,
  ].join(' | ');

  const returnLines = [
    `1D ${fmtPct(lastBar?.ret1d)}`,
    `5D ${fmtPct(lastBar?.ret5d)}`,
    `1M ${fmtPct(lastBar?.ret1m)}`,
    `3M ${fmtPct(lastBar?.ret3m)}`,
    `6M ${fmtPct(lastBar?.ret6m)}`,
  ].join(' | ');

  const rangeLines = rl ? [
    `Pivot ₹${fmt(rl.pivot)} (price ${rl.pivotPct >= 0 ? 'above' : 'below'} by ${fmt(Math.abs(rl.pivotPct))}%)`,
    `R1 ₹${fmt(rl.r1)} (${fmt(rl.r1Pct, 1)}% away) | S1 ₹${fmt(rl.s1)} (${fmt(rl.s1Pct, 1)}% away)`,
    `Exp. High ₹${fmt(rl.expH)} | Exp. Low ₹${fmt(rl.expL)} | ATR ₹${fmt(rl.atr)}`,
    `Bias: ${rl.bias}`,
  ].join(' | ') : 'N/A';

  const markovLines = markov
    ? `State: ${markov.current} | Up ${fmt(markov.bullP * 100, 1)}% | Down ${fmt(markov.bearP * 100, 1)}% | Bias: ${markov.bias}`
    : 'N/A';

  const mlLine = ml
    ? `${fmt(ml.latestP * 100, 1)}% UP (Acc ${ml.acc != null ? fmt(ml.acc * 100, 1) + '%' : 'N/A'} | Prec ${ml.prec != null ? fmt(ml.prec * 100, 1) + '%' : 'N/A'} | Rec ${ml.rec != null ? fmt(ml.rec * 100, 1) + '%' : 'N/A'}) | ${ml.models ? Object.entries(ml.models).map(([k, v]) => `${k.toUpperCase()} ${fmt(v * 100, 1)}%`).join(' ') : 'N/A'}`
    : 'not run';

  const cagrLine = cagrData?.cagr != null
    ? `Historical CAGR ${fmt(cagrData.cagr * 100, 1)}%/yr | Projections: 1M ₹${fmt(cagrData.projections?.['1M'])} | 6M ₹${fmt(cagrData.projections?.['6M'])} | 1Y ₹${fmt(cagrData.projections?.['12M'])} | 3Y ₹${fmt(cagrData.projections?.['36M'])}`
    : 'N/A';

  const fundLines = fundamentals ? [
    `P/E ${fmt(fundamentals.pe, 1)}`,
    `ROE ${fundamentals.roe != null ? fmt(fundamentals.roe * 100, 1) + '%' : 'N/A'}`,
    `Debt/Equity ${fmt(fundamentals.debtToEquity)}`,
    `Market Cap ${fundamentals.marketCapCr ? fmt(fundamentals.marketCapCr, 0) + ' Cr' : 'N/A'}`,
  ].join(' | ') : 'N/A';

  return `You are a sharp, experienced Indian stock market analyst. The user is analysing ${name} (${symbol}).

CURRENT DATA SNAPSHOT:
Price: ₹${fmt(price)}
Composite Score: ${fmt(decision?.score, 1)}/100 → ${decision?.label}

TECHNICALS:
- Trend: ${trend?.score}/5 bullish conditions (${trend?.reasons?.join(' | ') || 'N/A'})
- RSI: ${fmt(lastBar?.rsi)} | MACD: ${lastBar?.macd > lastBar?.macdSignal ? 'Bullish' : 'Bearish'} crossover (${fmt(lastBar?.macd, 4)} vs signal ${fmt(lastBar?.macdSignal, 4)})
- Moving Averages: ${maLines}
- Returns: ${returnLines}

RANGE LEVELS: ${rangeLines}
MARKOV MODEL: ${markovLines}
ML ENSEMBLE: ${mlLine}

TRADE PLAN:
- Target ₹${fmt(tp?.targetPrice)} (+${fmt((tp?.targetPrice - price) / price * 100)}%) | Stop-loss ₹${fmt(tp?.slPrice)} (-${fmt((price - tp?.slPrice) / price * 100)}%) | R:R ${fmt(tp?.rr)}:1

CAGR: ${cagrLine}
FUNDAMENTALS: ${fundLines}

Answer every question clearly in plain English. Reference actual numbers. Be direct and opinionated. Never give generic disclaimers unless specifically asked. End ONLY when the user asks with: "⚠️ Educational purposes only — not financial advice."`;
}

async function callOllama(messages) {
  const settings = loadSettings();
  const model = settings.ollamaModel || 'kimi-k2.5:cloud';
  const res = await fetch(`${SERVER}/ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'ollama', model, messages }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const d = await res.json();
  return d.content;
}

async function callOpenAI(messages, apiKey) {
  const settings = loadSettings();
  const model = settings.openaiModel || PROVIDER_MODELS.openai[1].value; // gpt-4o-mini
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.4 }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `OpenAI ${res.status}`); }
  const d = await res.json();
  return d.choices[0].message.content;
}

async function callAnthropic(messages, apiKey) {
  const settings = loadSettings();
  const model = settings.anthropicModel || PROVIDER_MODELS.anthropic[2].value; // haiku
  const system = messages.find(m => m.role === 'system')?.content || '';
  const userMsgs = messages.filter(m => m.role !== 'system');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, system, messages: userMsgs, max_tokens: 1200 }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Anthropic ${res.status}`); }
  const d = await res.json();
  return d.content[0].text;
}

async function callGemini(messages, apiKey) {
  const settings = loadSettings();
  const model = settings.geminiModel || PROVIDER_MODELS.gemini[4].value; // gemini-2.5-flash
  const system = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Gemini ${res.status}`); }
  const d = await res.json();
  return d.candidates[0].content.parts[0].text;
}

async function sendToAI(messages) {
  const settings = loadSettings();
  const provider = settings.provider || 'ollama';
  const key = settings.apiKey || '';
  if (provider === 'openai')    return callOpenAI(messages, key);
  if (provider === 'anthropic') return callAnthropic(messages, key);
  if (provider === 'gemini')    return callGemini(messages, key);
  return callOllama(messages);
}

// ── Settings Panel ─────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }) {
  const [s, setS] = useState(loadSettings);

  const update = (k, v) => setS(prev => ({ ...prev, [k]: v }));

  const save = () => { saveSettings(s); onClose(); };

  const providerInfo = PROVIDERS.find(p => p.id === (s.provider || 'ollama'));

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--surface)',
      borderRadius: 'var(--radius-md)', zIndex: 10,
      display: 'flex', flexDirection: 'column', padding: 16, gap: 14,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Settings</span>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      {/* Provider */}
      <label style={labelStyle}>AI Provider</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PROVIDERS.map(p => (
          <label key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            background: (s.provider || 'ollama') === p.id ? 'var(--accent-soft)' : 'var(--surface-2)',
            border: `1px solid ${(s.provider || 'ollama') === p.id ? 'var(--accent)' : 'var(--border)'}`,
            fontSize: 12, color: 'var(--text-primary)',
          }}>
            <input type="radio" name="provider" value={p.id}
              checked={(s.provider || 'ollama') === p.id}
              onChange={() => update('provider', p.id)}
              style={{ accentColor: 'var(--accent)' }} />
            {p.label}
          </label>
        ))}
      </div>

      {/* API Key / Model */}
      {(s.provider || 'ollama') === 'ollama' ? (
        <>
          <label style={labelStyle}>Model Name</label>
          <input
            value={s.ollamaModel || ''}
            onChange={e => update('ollamaModel', e.target.value)}
            placeholder={providerInfo.placeholder}
            style={inputStyle}
          />
        </>
      ) : (
        <>
          <label style={labelStyle}>API Key</label>
          <input
            type="password"
            value={s.apiKey || ''}
            onChange={e => update('apiKey', e.target.value)}
            placeholder={providerInfo.placeholder}
            style={inputStyle}
          />
          <label style={labelStyle}>Model</label>
          {PROVIDER_MODELS[s.provider] ? (
            <select
              value={s[`${s.provider}Model`] || PROVIDER_MODELS[s.provider][0].value}
              onChange={e => update(`${s.provider}Model`, e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {PROVIDER_MODELS[s.provider].map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          ) : (
            <input
              value={s[`${s.provider}Model`] || ''}
              onChange={e => update(`${s.provider}Model`, e.target.value)}
              placeholder="Model name"
              style={inputStyle}
            />
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            API key stored in your browser only — never sent to our server.
          </div>
        </>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>Cancel</button>
        <button onClick={save} style={{ ...primaryBtn, flex: 1 }}>Save</button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiSidebar({ data, open, onToggle }) {
  const [messages, setMessages] = useState([]); // { role, content, ts }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Reset chat when stock changes
  useEffect(() => {
    setMessages([]);
    setInput('');
    setLoading(false);
    setShowSettings(false);
  }, [data?.symbol]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const systemPrompt = buildSystemPrompt(data);

  const send = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: userText, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    const apiMessages = [{ role: 'system', content: systemPrompt }, ...history];

    try {
      const reply = await sendToAI(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: `⚠️ Error: ${err.message}`, ts: Date.now(), isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, systemPrompt]);

  const analyseStock = useCallback(() => {
    if (!data) return;
    send(`Please analyse ${data.name} (${data.symbol}) for me based on all the current data. Give me your full assessment across technicals, risk, and a practical takeaway.`);
  }, [data, send]);

  const downloadChat = useCallback(() => {
    if (!messages.length) return;
    const lines = [`QuantStock AI Chat — ${data?.name || 'Unknown'} (${data?.symbol || ''})\n`,
      `Downloaded: ${new Date().toLocaleString()}\n`,
      '='.repeat(60) + '\n',
      ...messages.map(m =>
        `[${m.role === 'user' ? 'You' : 'AI'}] ${new Date(m.ts).toLocaleTimeString()}\n${m.content}\n`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `quantstock-ai-${data?.symbol || 'chat'}-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }, [messages, data]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Toggle button (always visible) ─────────────────────────────────────────
  const toggleBtn = (
    <button
      onClick={onToggle}
      title={open ? 'Close AI Chat' : 'Open AI Chat'}
      style={{
        position: 'fixed', right: open ? 397 : 0, top: '50%',
        transform: 'translateY(-50%)',
        width: 28, height: 64,
        background: 'var(--accent)',
        border: 'none',
        borderRadius: open ? '8px 0 0 8px' : '8px 0 0 8px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 14,
        zIndex: 200,
        transition: 'right 0.3s ease',
        boxShadow: '-2px 0 12px rgba(99,102,241,0.3)',
      }}
    >
      {open ? '›' : '‹'}
    </button>
  );

  if (!open) return toggleBtn;

  return (
    <>
      {toggleBtn}
      <aside style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 400,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        zIndex: 199,
        transition: 'transform 0.3s ease',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Analysis Chat</div>
            {data?.symbol && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{data.name} · {data.symbol}</div>
            )}
          </div>
          {messages.length > 0 && (
            <button onClick={downloadChat} title="Download chat (.txt)" style={iconBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
          <button onClick={() => setShowSettings(true)} title="Settings" style={iconBtn}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        {/* ── Analyse button ── */}
        {data && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={analyseStock}
              disabled={loading}
              style={{
                width: '100%', padding: '9px 0',
                background: loading ? 'var(--surface-3)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: loading ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {loading ? (
                <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Thinking...</>
              ) : (
                <><span style={{ fontSize: 15 }}>📊</span> Analyse {data.symbol}</>
              )}
            </button>
          </div>
        )}

        {/* ── Chat messages ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {messages.length === 0 && !loading && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Ask anything about {data?.symbol || 'this stock'}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                Click <strong style={{ color: 'var(--accent)' }}>Analyse {data?.symbol}</strong> for a full breakdown, or type your own question below.
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                Examples: "Is RSI 72 dangerous here?" · "Explain the Markov result" · "Should I wait for a pullback?"
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              gap: 8, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: m.role === 'user' ? '#fff' : 'var(--text-secondary)',
              }}>
                {m.role === 'user' ? 'U' : '🤖'}
              </div>
              <div style={{
                maxWidth: '82%',
                padding: '10px 12px',
                borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                  : m.isError ? 'rgba(248,113,113,0.08)' : 'var(--surface-2)',
                border: m.isError ? '1px solid rgba(248,113,113,0.2)' : '1px solid var(--border)',
                fontSize: 12, lineHeight: 1.7,
                color: m.role === 'user' ? '#fff' : m.isError ? 'var(--danger)' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.content}
                <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: 'right' }}>
                  {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>🤖</div>
              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px', display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Legal disclaimer ── */}
        <div style={{
          padding: '6px 14px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0,
          fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center',
        }}>
          ⚠️ For educational purposes only. Not financial advice. Consult a SEBI-registered advisor before investing.
        </div>

        {/* ── Input area ── */}
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-end',
          background: 'var(--surface)',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={loading}
            style={{
              flex: 1, resize: 'none', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-primary)', fontSize: 12, padding: '9px 12px',
              outline: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface-3)',
              color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* Settings overlay */}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </aside>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const iconBtn = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, flexShrink: 0, transition: 'all 0.15s',
};
const labelStyle = { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle = {
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 7, color: 'var(--text-primary)', fontSize: 12,
  padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const primaryBtn = {
  padding: '8px 0', background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
};
const secondaryBtn = {
  padding: '8px 0', background: 'var(--surface-2)', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer',
};
