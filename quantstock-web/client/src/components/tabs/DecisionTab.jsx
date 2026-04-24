import React, { useEffect, useState } from 'react';
import axios from 'axios';
import InfoTooltip from '../ui/InfoTooltip';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Animated circular arc for score display
function ScoreRing({ score, color, size = 180 }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (animated / 100) * circ;
  const gap = circ - filled;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--surface-3)" strokeWidth="10"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${color}60)` }}
      />
      <text
        x={size / 2} y={size / 2 - 8}
        textAnchor="middle" dominantBaseline="middle"
        fill={color}
        fontSize="36"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {Math.round(animated)}
      </text>
      <text
        x={size / 2} y={size / 2 + 20}
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}

const WEIGHT_TIPS = {
  'Trend':        { title: 'Trend Score Weight (30%)', desc: 'Contribution of the 5-point technical trend score. Checks Price vs MA20/50/200, RSI < 75, and MACD > Signal. Each condition adds 20 points to the sub-score (max 100).', formula: 'Contribution = (trendScore / 5) × 100 × 0.30' },
  'Range Levels': { title: 'Range Levels Weight (10%)', desc: 'Contribution of the pivot point analysis. If price is above the pivot (bullish bias), this sub-score is ~62. If below (bearish), ~38.', formula: 'Contribution = rangeBiasScore × 0.10' },
  'Markov':       { title: 'Markov Chain Weight (20%)', desc: 'Contribution of the Markov chain transition model. Bullish bias contributes 65, neutral 50, bearish 35 — scaled by the 20% weight.', formula: 'Contribution = markovBiasScore × 0.20' },
  'ML Model':     { title: 'ML Model Weight (40%)', desc: 'Contribution of the Random Forest up-probability. The model\'s predicted probability of an up session is used directly as the sub-score. Highest weight as it is the most data-driven signal.', formula: 'Contribution = ml.upProbability × 100 × 0.40' },
};

// ─── Next Day Forecast card ───────────────────────────────────────────────────
function NextDayForecast({ forecast, mlProb }) {
  if (!forecast) return null;

  const dirColor =
    forecast.direction === 'Up'   ? 'var(--success)' :
    forecast.direction === 'Down' ? 'var(--danger)'  : 'var(--warning)';

  const dirArrow =
    forecast.direction === 'Up'   ? '▲' :
    forecast.direction === 'Down' ? '▼' : '▶';

  const confColor =
    forecast.confidence === 'High'   ? 'var(--success)' :
    forecast.confidence === 'Medium' ? 'var(--warning)'  : 'var(--danger)';

  // Synthesise ML signal into direction text
  let mlLabel = null;
  if (mlProb != null) {
    if      (mlProb >= 0.65) mlLabel = { text: `${(mlProb * 100).toFixed(0)}% UP probability`, color: 'var(--success)' };
    else if (mlProb <= 0.35) mlLabel = { text: `${((1 - mlProb) * 100).toFixed(0)}% DOWN probability`, color: 'var(--danger)' };
    else                     mlLabel = { text: `${(mlProb * 100).toFixed(0)}% (neutral zone)`, color: 'var(--warning)' };
  }

  return (
    <div className="card" style={{
      padding: 20,
      border: `1px solid ${dirColor}30`,
      background: `linear-gradient(135deg, var(--surface), ${dirColor}06)`,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        Tomorrow's Outlook
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700,
          color: confColor,
          background: `${confColor}18`,
          border: `1px solid ${confColor}40`,
          padding: '2px 10px', borderRadius: 'var(--radius-pill)',
        }}>
          {forecast.confidence} Confidence
        </span>
      </h3>

      {/* Main direction row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: dirColor, lineHeight: 1 }}>
            {dirArrow}
          </span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: dirColor }}>{forecast.direction}</div>
            {forecast.expRet != null && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Expected: {forecast.expRet > 0 ? '+' : ''}{forecast.expRet.toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        {forecast.expClose != null && (
          <div style={{ padding: '10px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Markov Expected Close</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{forecast.expClose.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* ML + Range row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
        {mlLabel && (
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>ML Model</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: mlLabel.color }}>{mlLabel.text}</div>
          </div>
        )}
        {forecast.expH != null && forecast.expL != null && (
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Expected Range (ATR)</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--danger)' }}>L ₹{forecast.expL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>—</span>
              <span style={{ color: 'var(--success)' }}>H ₹{forecast.expH.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        {forecast.bullP != null && (
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Markov Probabilities</div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Bull {(forecast.bullP * 100).toFixed(0)}%</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Bear {(forecast.bearP * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Signal agreement bar */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Signal Agreement</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Markov', bias: forecast.markovBias },
            { label: 'Range',  bias: forecast.rangeBias  },
            { label: 'ML',     bias: mlProb != null ? (mlProb > 0.5 ? 'Bullish' : 'Bearish') : null },
          ].map(({ label, bias }) => {
            const c = bias === 'Bullish' ? 'var(--success)' : bias === 'Bearish' ? 'var(--danger)' : 'var(--text-muted)';
            return (
              <div key={label} style={{
                flex: 1, padding: '6px 10px', borderRadius: 8, textAlign: 'center',
                background: bias ? `${c}18` : 'var(--surface-2)',
                border: `1px solid ${bias ? `${c}40` : 'var(--border)'}`,
                fontSize: 11, fontWeight: 600, color: bias ? c : 'var(--text-muted)',
              }}>
                <div style={{ marginBottom: 2, color: 'var(--text-secondary)', fontWeight: 400 }}>{label}</div>
                {bias ?? '—'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Goal Score card ──────────────────────────────────────────────────────────
function GoalScoreCard({ goalScore }) {
  if (!goalScore) return null;
  const { score, label, color, factors } = goalScore;
  return (
    <div className="card" style={{
      padding: 20,
      border: `1px solid ${color}30`,
      background: `linear-gradient(135deg, var(--surface), ${color}06)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>
          Goal Assessment
        </h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/ 100</span>
          <span style={{
            padding: '3px 12px', borderRadius: 'var(--radius-pill)',
            background: `${color}18`, border: `1px solid ${color}40`,
            fontSize: 12, fontWeight: 700, color,
          }}>{label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {factors.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 130, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{f.label}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.max(0, Math.min(100, f.score))}%`,
                background: f.score >= 60 ? 'var(--success)' : f.score >= 40 ? 'var(--warning)' : 'var(--danger)',
                borderRadius: 3, opacity: 0.8, transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ width: 50, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>{f.value}</span>
            <span style={{
              width: 36, fontSize: 11, color: 'var(--accent)',
              background: 'var(--accent-soft)', padding: '1px 6px',
              borderRadius: 'var(--radius-pill)', textAlign: 'center',
            }}>{f.weight}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 8px',
              borderRadius: 'var(--radius-pill)',
              color: f.score >= 60 ? 'var(--success)' : f.score >= 40 ? 'var(--warning)' : 'var(--danger)',
              background: f.score >= 60 ? 'rgba(74,222,128,0.1)' : f.score >= 40 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
            }}>{f.verdict}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DecisionTab({ data, mlStatus }) {
  const { decision, trend, rangeLevels, markov, ml } = data;
  const mlPending = mlStatus && mlStatus !== 'done' && mlStatus !== 'error';
  const mlStatusLabel = mlStatus?.startsWith('running: ')
    ? mlStatus.slice(9)
    : 'Awaiting ML models…';
  const [sentimentBadge, setSentimentBadge] = useState(null);

  useEffect(() => {
    if (!data.symbol) return;
    setSentimentBadge(null);
    axios.get(`${API}/sentiment`, { params: { symbol: data.symbol } })
      .then(r => setSentimentBadge({ label: r.data.overallLabel, color: r.data.overallColor, score: r.data.overallScore }))
      .catch(() => {});
  }, [data.symbol]);

  if (!decision) return <div style={{ color: 'var(--text-secondary)' }}>No decision data.</div>;

  const { score, label, color, explanations } = decision;
  const { nextDayForecast, goalScore } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Large decision display */}
      <div
        className="card"
        style={{
          padding: '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          border: `1px solid ${color}30`,
          background: `linear-gradient(135deg, var(--surface), ${color}08)`,
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start' }}>
          <ScoreRing score={score} color={color} size={180} />
          <span style={{ position: 'absolute', top: 0, right: -24 }}>
            <InfoTooltip
              title="Composite Decision Score"
              desc="A weighted combination of four models: Trend (30%), Range Levels (10%), Markov Chain (20%), and ML Model (40%). Each model contributes a sub-score from 0–100, multiplied by its weight."
              formula="Score = Trend×0.30 + Range×0.10 + Markov×0.20 + ML×0.40"
              range="≥ 70 = Bullish Conviction. 57–70 = Moderately Bullish. 43–57 = Neutral. < 43 = Bearish."
            />
          </span>
        </div>

        {/* ML pending banner */}
        {mlPending && (
          <div style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12, color: 'var(--accent)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1.2s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>{mlStatusLabel}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              Score updates when complete
            </span>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: color,
              letterSpacing: '-0.02em',
              textShadow: `0 0 20px ${color}40`,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Composite Score: {score.toFixed(1)} / 100{mlPending ? ' · without ML' : ''}
          </div>
          {/* Sentiment badge — loads async, shown when ready */}
          <div style={{ marginTop: 10, minHeight: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>News Sentiment:</span>
            {sentimentBadge ? (
              <span style={{
                padding: '3px 12px', borderRadius: 'var(--radius-pill)',
                background: `${sentimentBadge.color}18`,
                border: `1px solid ${sentimentBadge.color}40`,
                color: sentimentBadge.color,
                fontSize: 11, fontWeight: 700,
              }}>
                {sentimentBadge.label}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>fetching...</span>
            )}
          </div>
        </div>

        {/* Signal label pill */}
        <div style={{
          padding: '8px 28px',
          borderRadius: 'var(--radius-pill)',
          background: `${color}18`,
          border: `1px solid ${color}40`,
          fontSize: 14,
          fontWeight: 700,
          color: color,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {score >= 70 ? 'Strong Bullish Signal' :
           score >= 57 ? 'Moderate Bullish Signal' :
           score >= 43 ? 'Neutral Signal' :
                         'Bearish Signal'}
        </div>
      </div>

      {/* Next Day Forecast */}
      <NextDayForecast forecast={nextDayForecast} mlProb={ml?.latestP ?? null} />

      {/* Goal Assessment */}
      <GoalScoreCard goalScore={goalScore} />

      {/* Disclaimer */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 8,
        fontSize: 11,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'rgba(251,191,36,0.8)' }}>Disclaimer:</strong> This signal summary is generated by statistical models for <strong>educational and informational purposes only</strong>. It does not constitute financial advice, investment recommendations, or solicitation to buy or sell any security. Past model performance does not guarantee future results. Consult a SEBI-registered investment advisor before making any investment decisions.
      </div>

      {/* Score breakdown */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Score Breakdown
          <InfoTooltip
            title="Score Breakdown"
            desc="Each row shows one model's contribution. The bar shows the model's sub-score (0–100). The badge on the right shows its weight in the composite score."
            formula="Composite Score = Σ(sub-score × weight)"
          />
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {explanations.map((e, i) => {
            const val = parseFloat(e.value) || 0;
            const tip = WEIGHT_TIPS[e.label];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 110, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {e.label}
                  {tip && <InfoTooltip {...tip} />}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.max(0, Math.min(100, val))}%`,
                    background: val >= 60 ? 'var(--success)' : val >= 40 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: 3, opacity: 0.8, transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{ width: 44, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {e.value}
                </span>
                <span style={{
                  width: 36, fontSize: 11, color: 'var(--accent)',
                  background: 'var(--accent-soft)', padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)', textAlign: 'center',
                }}>
                  {e.weight}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model contributions table */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Model Signals
          <InfoTooltip
            title="Model Signals Table"
            desc="Summary of each model's key signal, numeric value, and directional bias. Each model feeds into the composite score with a different weight."
          />
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Model', 'Signal', 'Value', 'Bias'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                model: 'Trend',
                signal: `${trend?.score ?? '—'} / 5`,
                value: `${((trend?.score / 5) * 100 || 0).toFixed(1)}`,
                bias: trend?.score >= 3 ? 'Bullish' : 'Bearish',
                biasColor: trend?.score >= 3 ? 'var(--success)' : 'var(--danger)',
              },
              {
                model: 'Range Levels',
                signal: `Pivot: ₹${rangeLevels?.pivot?.toFixed(2) ?? '—'}`,
                value: rangeLevels?.bias === 'Bullish' ? '62.0' : '38.0',
                bias: rangeLevels?.bias ?? '—',
                biasColor: rangeLevels?.bias === 'Bullish' ? 'var(--success)' : 'var(--danger)',
              },
              {
                model: 'Markov',
                signal: `State: ${markov?.current ?? '—'}`,
                value: markov?.bias === 'Bullish' ? '65.0' : markov?.bias === 'Bearish' ? '35.0' : '50.0',
                bias: markov?.bias ?? '—',
                biasColor: markov?.bias === 'Bullish' ? 'var(--success)' : markov?.bias === 'Bearish' ? 'var(--danger)' : 'var(--warning)',
              },
              ...(ml ? [{
                model: 'ML Model',
                signal: `${ml.name}`,
                value: `${(ml.latestP * 100).toFixed(1)}`,
                bias: ml.latestP > 0.5 ? 'Bullish' : 'Bearish',
                biasColor: ml.latestP > 0.5 ? 'var(--success)' : 'var(--danger)',
              }] : []),
            ].map((row, i) => (
              <tr key={i}
                style={{ transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{row.model}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{row.signal}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.value}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{
                    color: row.biasColor,
                    background: `${row.biasColor}18`,
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {row.bias}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trend reasons */}
      {trend?.reasons && trend.reasons.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Trend Analysis Breakdown
            <InfoTooltip
              title="Trend Analysis Breakdown"
              desc="Each condition checked by the Trend Score model. Green conditions are met (bullish), red conditions are not met (bearish). Each condition that passes adds 1 point to the Trend Score (max 5)."
              formula={'1. Price > MA20\n2. Price > MA50\n3. Price > MA200\n4. RSI < 75\n5. MACD > Signal Line'}
            />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trend.reasons.map((r, i) => {
              const positive = r.includes('>');
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: 'var(--surface-2)',
                  borderRadius: 8, border: `1px solid ${positive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: positive ? 'var(--success)' : 'var(--danger)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: positive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {r}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
