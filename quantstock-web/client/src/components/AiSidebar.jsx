import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const spinnerStyle = {
  width: 16, height: 16, borderRadius: '50%',
  border: '2px solid var(--border)',
  borderTopColor: 'var(--accent)',
  animation: 'spin 0.8s linear infinite',
  flexShrink: 0,
};

export default function AiSidebar({ data }) {
  const [available, setAvailable] = useState(null); // null=checking, true, false
  const [verdict, setVerdict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [ran, setRan] = useState(false);

  // Health-check: ping the server to see if Ollama is reachable
  useEffect(() => {
    setAvailable(null);
    setVerdict('');
    setError('');
    setRan(false);
    setSentiment(null);

    axios.get(`${API}/ai-ping`, { timeout: 8000 })
      .then(r => setAvailable(r.data?.available === true))
      .catch(() => setAvailable(false));
  }, [data?.symbol]);

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    setVerdict('');
    setRan(true);

    let sent = sentiment;
    if (!sent && data?.symbol) {
      setSentimentLoading(true);
      try {
        const r = await axios.get(`${API}/sentiment`, { params: { symbol: data.symbol } });
        sent = r.data;
        setSentiment(sent);
      } catch {
        // non-fatal
      } finally {
        setSentimentLoading(false);
      }
    }

    try {
      const r = await axios.post(`${API}/ai-analyse`, { analysisData: data, sentiment: sent }, { timeout: 60000 });
      setVerdict(r.data.verdict);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      if (msg.includes('ECONNREFUSED') || msg.includes('timed out')) {
        setAvailable(false);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [data, sentiment]);

  // ── Coming Soon state ───────────────────────────────────────────────────────
  if (available === false) {
    return (
      <aside style={sidebarWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={sidebarHeader}>
          <span style={{ fontSize: 15 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Analysis</span>
        </div>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '24px 16px', textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            🚀
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Coming Soon
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              AI-powered analysis requires a local AI model. Available when running the app locally.
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // ── Checking state ──────────────────────────────────────────────────────────
  if (available === null) {
    return (
      <aside style={sidebarWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={sidebarHeader}>
          <span style={{ fontSize: 15 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Analysis</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
          <div style={spinnerStyle} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Checking AI availability...</span>
        </div>
      </aside>
    );
  }

  // ── Available state ─────────────────────────────────────────────────────────
  return (
    <aside style={sidebarWrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={sidebarHeader}>
        <span style={{ fontSize: 15 }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Analysis</span>
        <span style={{
          marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 6px var(--success)',
          flexShrink: 0,
        }} title="AI connected" />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 14px 12px', lineHeight: 1.5 }}>
        Reasons across all technical signals and live news sentiment together.
      </div>

      {/* Ask / Re-analyse button */}
      <div style={{ padding: '0 14px 14px' }}>
        <button
          onClick={run}
          disabled={loading}
          style={{
            width: '100%', padding: '9px 0',
            background: loading ? 'var(--surface-3)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
            transition: 'var(--transition)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {loading ? (
            <>
              <div style={spinnerStyle} />
              {sentimentLoading ? 'Fetching news...' : 'Thinking...'}
            </>
          ) : ran ? '↺ Re-analyse' : 'Ask AI'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 14px 12px', padding: '10px 12px',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8, color: 'var(--danger)', fontSize: 11, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Verdict */}
      {verdict && (
        <div style={{ margin: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {verdict.split(/\n(?=\*\*)|\n\n/).filter(p => p.trim()).map((para, i) => {
            const headingMatch = para.match(/^\*\*(.+?)\*\*\n?([\s\S]*)/);
            if (headingMatch) {
              return (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'rgba(99,102,241,0.05)',
                  border: '1px solid rgba(99,102,241,0.12)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                    {headingMatch[1]}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                    {headingMatch[2].trim()}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.7, color: 'var(--text-muted)', padding: '0 2px' }}>
                {para.trim()}
              </div>
            );
          })}
        </div>
      )}

      {verdict && (
        <div style={{ padding: '10px 14px', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          AI-generated analysis. For educational purposes only — not financial advice.
        </div>
      )}

      {/* Idle hint */}
      {!ran && !loading && (
        <div style={{
          margin: '0 14px', padding: '12px 14px',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          Click <strong style={{ color: 'var(--text-secondary)' }}>Ask AI</strong> to get a plain-English interpretation of all signals including live news sentiment for <strong style={{ color: 'var(--text-secondary)' }}>{data?.symbol}</strong>.
        </div>
      )}
    </aside>
  );
}

const sidebarWrap = {
  width: 260,
  flexShrink: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  alignSelf: 'flex-start',
  position: 'sticky',
  top: 76,
  maxHeight: 'calc(100vh - 96px)',
  overflowY: 'auto',
};

const sidebarHeader = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '14px 14px 10px',
  borderBottom: '1px solid var(--border)',
  marginBottom: 12,
};
