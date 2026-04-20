import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function ScoreBar({ score }) {
  // score: -1 to +1; center at 50%
  const pct = Math.round((score + 1) / 2 * 100);
  const color = score >= 0.15 ? '#22c55e' : score > -0.15 ? '#94a3b8' : '#f87171';
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{
        height: 10, background: 'var(--surface-3)',
        borderRadius: 6, overflow: 'hidden', position: 'relative',
      }}>
        {/* center line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'var(--border)', zIndex: 1 }} />
        <div style={{
          position: 'absolute',
          left: score >= 0 ? '50%' : `${pct}%`,
          width: score >= 0 ? `${pct - 50}%` : `${50 - pct}%`,
          height: '100%',
          background: color,
          borderRadius: 6,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>Very Bearish</span>
        <span>Neutral</span>
        <span>Very Bullish</span>
      </div>
    </div>
  );
}

function SentimentBadge({ label, color }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      background: `${color}18`,
      border: `1px solid ${color}40`,
      color,
      fontSize: 10,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

export default function SentimentTab({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/sentiment`, { params: { symbol } });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  if (!symbol) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Run an analysis first to see sentiment.
    </div>
  );

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Fetching news sentiment...
    </div>
  );

  if (error) return (
    <div style={{ padding: 20, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>
      {error}
    </div>
  );

  if (!data) return null;

  const { overallScore, overallLabel, overallColor, headlines, fetchedAt } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Overall score card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              News Sentiment
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: overallColor }}>
                {overallScore >= 0 ? '+' : ''}{overallScore.toFixed(2)}
              </span>
              <SentimentBadge label={overallLabel} color={overallColor} />
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
            <div>{headlines.length} headlines analysed</div>
            <div>via Google News</div>
            <div style={{ marginTop: 2, opacity: 0.7 }}>
              {new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <ScoreBar score={overallScore} />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Bullish', count: headlines.filter(h => h.score > 0.14).length, color: '#22c55e' },
            { label: 'Neutral', count: headlines.filter(h => h.score >= -0.14 && h.score <= 0.14).length, color: '#94a3b8' },
            { label: 'Bearish', count: headlines.filter(h => h.score < -0.14).length, color: '#f87171' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color }}>{count}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={load}
          style={{
            padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Headlines list */}
      {headlines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Latest Headlines
          </div>
          {headlines.map((h, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              borderLeft: `3px solid ${h.color}`,
              transition: 'var(--transition)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={h.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    textDecoration: 'none', lineHeight: 1.4,
                    display: 'block',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                >
                  {h.title}
                </a>
                {h.pubDate && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(h.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <SentimentBadge label={h.label} color={h.color} />
            </div>
          ))}
        </div>
      )}

      {headlines.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
          No headlines found for this symbol.
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 8 }}>
        Sentiment scored using finance-domain keyword lexicon. Educational use only.
      </div>
    </div>
  );
}
