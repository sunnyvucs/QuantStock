import React, { useState } from 'react';
import Badge from '../ui/Badge';
import InfoTooltip from '../ui/InfoTooltip';

const STATE_COLORS = {
  'Strong Down': '#f87171',
  'Down': '#fca5a5',
  'Flat': '#fbbf24',
  'Up': '#86efac',
  'Strong Up': '#4ade80',
};

function fmt(v, dec = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

function fmtPct(v, dec = 1) {
  if (v == null || isNaN(v)) return '—';
  return `${(Number(v) * 100).toFixed(dec)}%`;
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function ProbBar({ label, value }) {
  const pct = Number(value || 0) * 100;
  const color = STATE_COLORS[label] || 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 90, fontSize: 11, color, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, opacity: 0.85, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', width: 44, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function MarkovTab({ data }) {
  const { markov, targetFeasibility, goalInsights, tradePlan } = data;
  const [showMatrix, setShowMatrix] = useState(false);

  if (!markov || !goalInsights?.markov || !targetFeasibility) {
    return <div style={{ color: 'var(--text-secondary)', padding: 20 }}>Insufficient data for Markov analysis.</div>;
  }

  const oneMonth = targetFeasibility.horizons.find(h => h.key === '1M');
  const twoMonth = targetFeasibility.horizons.find(h => h.key === '2M');
  const threeMonth = targetFeasibility.horizons.find(h => h.key === '3M');
  const biasBadge =
    goalInsights.markov.regimeLabel === 'Supportive' ? 'success' :
    goalInsights.markov.regimeLabel === 'Unsupportive' ? 'danger' :
    'warning';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <div style={{
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 8,
        fontSize: 12, color: 'var(--text-secondary)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
      }}>
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Goal Lens:</span> Does the current market regime support your target?</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Uses historical state transitions to judge short-term support for the user target</span>
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current Regime Support</span>
          <Badge variant={biasBadge} style={{ fontSize: 12, padding: '4px 12px' }}>{goalInsights.markov.regimeLabel}</Badge>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {goalInsights.markov.regimeText}
          {' '}
          The current state is <strong style={{ color: STATE_COLORS[markov.current] }}>{markov.current}</strong>, and your target price is <strong>₹{fmt(tradePlan.targetPrice)}</strong>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <SummaryCard
          label="Next-Day Bull Chance"
          value={fmtPct(goalInsights.markov.nextDayBullProb)}
          sub="Historical probability of upward continuation tomorrow"
          color="var(--success)"
        />
        <SummaryCard
          label="Next-Day Bear Chance"
          value={fmtPct(goalInsights.markov.nextDayBearProb)}
          sub="Historical probability of weakness tomorrow"
          color="var(--danger)"
        />
        <SummaryCard
          label="3-Day Bull Chance"
          value={fmtPct(goalInsights.markov.threeDayBullProb)}
          sub="Useful for whether the stock can build momentum toward the target"
          color="var(--accent)"
        />
        <SummaryCard
          label="Expected Next Close"
          value={`₹${fmt(markov.expClose)}`}
          sub={`${Number(markov.expRet) >= 0 ? '+' : ''}${fmt(markov.expRet)}% vs today`}
          color={Number(markov.expRet) >= 0 ? 'var(--success)' : 'var(--danger)'}
        />
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          What This Means For Your Target
          <InfoTooltip
            title="Regime To Goal Translation"
            desc="This section translates the historical state model into a goal-based read. It does not say your target will definitely be hit. It says whether the current historical regime is helping or hurting the path toward that target."
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <div>1 month target path: <strong>{fmtPct(oneMonth?.hitRate)}</strong> historical hit rate.</div>
          <div>2 month target path: <strong>{fmtPct(twoMonth?.hitRate)}</strong> historical hit rate.</div>
          <div>3 month target path: <strong>{fmtPct(threeMonth?.hitRate)}</strong> historical hit rate.</div>
          <div>
            Short-term regime read: if the next-day and 3-day bull probabilities stay above the bear side, the current regime is helping the stock move toward the target.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Next Session State Mix
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {markov.states.map(s => (
              <ProbBar key={s} label={s} value={markov.nextProb[s] ?? 0} />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            3-Day State Mix
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {markov.states.map(s => (
              <ProbBar key={s} label={s} value={markov.step3Prob[s] ?? 0} />
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          onClick={() => setShowMatrix(v => !v)}
          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>Advanced Transition Matrix</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"
            style={{ transform: showMatrix ? 'rotate(180deg)' : 'rotate(0)', transition: 'var(--transition)' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        {showMatrix && (
          <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ padding: '5px 8px', color: 'var(--text-secondary)', textAlign: 'left' }}>From \ To</th>
                  {markov.states.map(s => (
                    <th key={s} style={{ padding: '5px 8px', color: STATE_COLORS[s], textAlign: 'right', fontWeight: 600 }}>{s.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markov.states.map((rowState, i) => (
                  <tr key={rowState}>
                    <td style={{ padding: '5px 8px', color: STATE_COLORS[rowState], fontWeight: 600 }}>{rowState}</td>
                    {markov.transMatrix[i].map((v, j) => (
                      <td key={j} style={{ padding: '5px 8px', textAlign: 'right', color: v > 0.3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {(v * 100).toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
