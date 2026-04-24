import React from 'react';
import Badge from '../ui/Badge';
import InfoTooltip from '../ui/InfoTooltip';

function fmt(v, dec = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

function fmtPct(v, dec = 1) {
  if (v == null || isNaN(v)) return '—';
  const num = Number(v);
  return `${num >= 0 ? '+' : ''}${num.toFixed(dec)}%`;
}

function GoalCard({ label, value, sub, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function LevelRow({ label, price, note, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text-primary)' }}>₹{fmt(price)}</div>
    </div>
  );
}

export default function RangeLevelsTab({ data }) {
  const { rangeLevels: rl, tradePlan, goalInsights } = data;

  if (!rl || !tradePlan || !goalInsights?.range || !goalInsights?.nextDay) {
    return <div style={{ color: 'var(--text-secondary)' }}>No range levels data.</div>;
  }

  const targetGapPct = goalInsights.range.targetGapPct;
  const targetWithinRange = goalInsights.nextDay.targetWithinRange;
  const sessionsAtAtr = goalInsights.range.sessionsAtAtr;
  const badgeVariant =
    goalInsights.range.label === 'Near' ? 'success' :
    goalInsights.range.label === 'Stretched' ? 'danger' :
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
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Goal Lens:</span> Can normal price movement help reach your target?</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Uses ATR and next-day range estimates from historical volatility</span>
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target Distance Assessment</span>
          <Badge variant={badgeVariant} style={{ fontSize: 12, padding: '4px 12px' }}>{goalInsights.range.label}</Badge>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {goalInsights.range.text}
          {' '}
          Your target price is <strong>₹{fmt(tradePlan.targetPrice)}</strong>, which is <strong>{fmtPct(targetGapPct)}</strong> above the current price.
          {' '}
          {goalInsights.range.atrUnits != null && (
            <>That is about <strong>{fmt(goalInsights.range.atrUnits, 1)} ATR</strong> away based on recent daily movement.</>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <GoalCard
          label="Target Price"
          value={`₹${fmt(tradePlan.targetPrice)}`}
          sub={`Needs ${fmtPct(goalInsights.range.targetGapPct)} from current price`}
          color="var(--success)"
        />
        <GoalCard
          label="Expected Next-Day High"
          value={`₹${fmt(goalInsights.nextDay.rangeHigh)}`}
          sub={targetWithinRange ? 'Target is inside the next-day range estimate' : 'Target is above the next-day range estimate'}
          color={targetWithinRange ? 'var(--success)' : 'var(--warning)'}
        />
        <GoalCard
          label="Expected Next-Day Low"
          value={`₹${fmt(goalInsights.nextDay.rangeLow)}`}
          sub={`Downside room ${fmt(goalInsights.range.nextDayDownside, 2)} points`}
          color="var(--danger)"
        />
        <GoalCard
          label="Sessions At Current Pace"
          value={sessionsAtAtr != null && Number.isFinite(sessionsAtAtr) ? `${fmt(Math.max(1, sessionsAtAtr), 1)}` : '—'}
          sub="rough estimate using current daily headroom"
        />
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Next-Day Price Path
          <InfoTooltip
            title="Next-Day Price Path"
            desc="Uses historical volatility and current price structure to show a reasonable next-session range. This helps judge whether the target is close or likely needs multiple sessions."
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 12 }}>
          Based on historical volatility, the stock’s next-session working zone is around <strong>₹{fmt(goalInsights.nextDay.rangeLow)} to ₹{fmt(goalInsights.nextDay.rangeHigh)}</strong>.
          {' '}
          {targetWithinRange
            ? 'Your target sits within that range, so it is not far from normal short-term movement.'
            : 'Your target sits above that range, so it likely needs more than one ordinary session to be reached.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <LevelRow label="Target" price={tradePlan.targetPrice} note="User goal price" color="var(--success)" />
          <LevelRow label="Expected High" price={goalInsights.nextDay.rangeHigh} note="Historical upper band for next session" color="#86efac" />
          <LevelRow label="Pivot" price={rl.pivot} note="Short-term fair-value reference" color="var(--accent)" />
          <LevelRow label="Expected Low" price={goalInsights.nextDay.rangeLow} note="Historical lower band for next session" color="#f87171" />
        </div>
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Decision Reading
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {goalInsights.range.label === 'Near' && 'Range view: your target is close enough that normal short-term movement can help. The main question is whether momentum supports continuation.'}
          {goalInsights.range.label === 'Moderate' && 'Range view: your target is possible, but it probably needs more than one routine session. Combine this with the Markov and ML tabs before deciding.'}
          {goalInsights.range.label === 'Stretched' && 'Range view: your target is far from the current price relative to recent movement. This makes the target harder in the short term unless the stock enters a stronger regime.'}
        </div>
      </div>
    </div>
  );
}
