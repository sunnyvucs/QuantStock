import React, { useState } from 'react';
import Badge from '../ui/Badge';
import InfoTooltip from '../ui/InfoTooltip';

const STATE_COLORS = {
  'Strong Down': '#f87171',
  'Down':        '#fca5a5',
  'Flat':        '#fbbf24',
  'Up':          '#86efac',
  'Strong Up':   '#4ade80',
};

function fmt(v, dec = 3) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

function ProbBar({ label, value }) {
  const pct = value * 100;
  const color = STATE_COLORS[label] || 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 90, fontSize: 11, color, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, opacity: 0.85, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', width: 40, textAlign: 'right' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

const CARD_TIPS = {
  'Current State': { title: 'Current State', desc: 'State based on latest daily return. Buckets: Strong Down < −1.5%, Down < −0.3%, Flat, Up > +0.3%, Strong Up > +1.5%.', formula: 'State = classify(ret1d) into 5 buckets' },
  'Most Likely Next': { title: 'Most Likely Next State', desc: 'The state with the highest transition probability from the current state.', formula: 'argmax(TransitionMatrix[currentState])' },
  'Expected Close': { title: 'Expected Close (Next Session)', desc: 'Probability-weighted average of next-session close prices across all possible states.', formula: 'E[Close] = Σ P(state_i) × Close × (1 + AvgReturn(state_i))' },
  'Expected Return': { title: 'Expected Return (Next Session)', desc: 'Probability-weighted average return for next session.', formula: 'E[Ret] = Σ P(state_i) × AvgReturn(state_i)', range: 'Positive = bullish. Negative = bearish.' },
  'Bull Prob': { title: 'Bull Probability', desc: 'P(Up) + P(Strong Up) from current state.', formula: 'BullP = P(next=Up) + P(next=Strong Up)', range: '> 50% = bullish lean. > 65% = strong bull.' },
  'Bear Prob': { title: 'Bear Probability', desc: 'P(Down) + P(Strong Down) from current state.', formula: 'BearP = P(next=Down) + P(next=Strong Down)', range: '> 50% = bearish lean.' },
};

export default function MarkovTab({ data }) {
  const { markov } = data;
  const [showMatrix, setShowMatrix] = useState(false);

  if (!markov) return (
    <div style={{ color: 'var(--text-secondary)', padding: 20 }}>Insufficient data for Markov analysis.</div>
  );

  const biasBadge = markov.bias === 'Bullish' ? 'success' : markov.bias === 'Bearish' ? 'danger' : 'warning';

  const summaryCards = [
    { label: 'Current State',    value: markov.current,    color: STATE_COLORS[markov.current] },
    { label: 'Most Likely Next', value: markov.mostLikely, color: STATE_COLORS[markov.mostLikely] },
    { label: 'Expected Close',   value: `₹${Number(markov.expClose).toFixed(2)}` },
    { label: 'Expected Return',  value: `${markov.expRet >= 0 ? '+' : ''}${fmt(markov.expRet, 2)}%`, color: markov.expRet >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Bull Prob',        value: `${(markov.bullP * 100).toFixed(1)}%`, color: 'var(--success)' },
    { label: 'Bear Prob',        value: `${(markov.bearP * 100).toFixed(1)}%`, color: 'var(--danger)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>

      {/* Time horizon banner */}
      <div style={{
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 8,
        fontSize: 12, color: 'var(--text-secondary)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
      }}>
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>⏱ Next-Step:</span> 1 trading session</span>
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>3-Day:</span> 3 trading sessions</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Probabilistic — not a price guarantee</span>
      </div>

      {/* 6 summary cards in 3-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {summaryCards.map(m => (
          <div key={m.label} style={{
            padding: '12px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {m.label}
              {CARD_TIPS[m.label] && <InfoTooltip {...CARD_TIPS[m.label]} />}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: m.color || 'var(--text-primary)' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bias */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Markov Bias
          <InfoTooltip
            title="Markov Bias"
            desc="Bullish if Bull Prob > Bear Prob; Bearish if reverse; Neutral if within 5%."
            formula="Bias = 'Bullish' if BullP > BearP else 'Bearish'"
          />
        </span>
        <Badge variant={biasBadge} style={{ fontSize: 12, padding: '4px 14px' }}>{markov.bias}</Badge>
      </div>

      {/* Two prob columns side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Next Session (1-Day)
            <InfoTooltip
              title="Next-Step Probabilities"
              desc="Probability of transitioning into each state in the NEXT session, from the current state."
              formula="P(next=S | current=C) = TransitionMatrix[C][S]"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {markov.states.map(s => (
              <ProbBar key={s} label={s} value={markov.nextProb[s] ?? 0} />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            3-Day Forward
            <InfoTooltip
              title="3-Day Forward Probabilities"
              desc="Probability of being in each state after 3 trading sessions from now."
              formula="P(state after 3 steps) = (TransMatrix^3)[currentState]"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {markov.states.map(s => (
              <ProbBar key={s} label={s} value={markov.step3Prob[s] ?? 0} />
            ))}
          </div>
        </div>
      </div>

      {/* Historical state distribution */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Historical State Distribution
          <InfoTooltip
            title="Historical Distribution"
            desc="How often the stock has been in each state historically across all data."
            formula="Frequency(state) = count(days in state) / total days × 100"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {markov.states.map(s => {
            const count = markov.stateCounts[s] ?? 0;
            const total = Object.values(markov.stateCounts).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? count / total : 0;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 90, fontSize: 11, color: STATE_COLORS[s], flexShrink: 0 }}>{s}</span>
                <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: STATE_COLORS[s], opacity: 0.7, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 70, textAlign: 'right' }}>
                  {count} ({(pct * 100).toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transition matrix collapsible */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          onClick={() => setShowMatrix(v => !v)}
          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Transition Matrix
            <InfoTooltip
              title="Transition Matrix"
              desc="5×5 matrix — T[i][j] = historical probability of moving from state i to state j. Each row sums to 100%."
              formula="T[i][j] = count(i→j) / count(days in state i)"
            />
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"
            style={{ transform: showMatrix ? 'rotate(180deg)' : 'rotate(0)', transition: 'var(--transition)' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        {showMatrix && (
          <div style={{ padding: '0 16px 16px', overflowX: 'auto', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8 }}>Row = from state · Col = to state</div>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ padding: '5px 8px', color: 'var(--text-secondary)', textAlign: 'left' }}>From \ To</th>
                  {markov.states.map(s => (
                    <th key={s} style={{ padding: '5px 8px', color: STATE_COLORS[s], textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markov.states.map((rowState, i) => (
                  <tr key={rowState}
                    style={{ background: rowState === markov.current ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                  >
                    <td style={{ padding: '5px 8px', color: STATE_COLORS[rowState], fontWeight: 600, whiteSpace: 'nowrap' }}>{rowState}</td>
                    {markov.transMatrix[i].map((v, j) => (
                      <td key={j} style={{
                        padding: '5px 8px', textAlign: 'right',
                        color: v > 0.3 ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: v > 0.3 ? 700 : 400,
                      }}>
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
