import React, { useState } from 'react';
import InfoTooltip from '../ui/InfoTooltip';
import { TARGET_HORIZONS } from '../../services/investmentPlan';

function fmtPctInt(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return '—';
  return `${Math.round(num * 100)}%`;
}

function fmt(v, dec = 2) {
  if (v == null) return '—';
  return Number(v).toFixed(dec);
}

function fmtINR(v, dec = 2) {
  if (v == null) return '—';
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

function Card({ title, children, accent }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? `${accent}30` : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600,
        color: accent || 'var(--text-primary)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: bold ? 700 : 500,
        color: color || 'var(--text-primary)',
      }}>
        {value}
      </span>
    </div>
  );
}

function LabelTip({ label, ...tip }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>{label}<InfoTooltip {...tip} /></span>;
}

const HORIZONS = ['1M', '2M', '3M', '6M', '12M', '36M'];
const HORIZON_LABELS = { '1M': '1 Month', '2M': '2 Months', '3M': '3 Months', '6M': '6 Months', '12M': '1 Year', '36M': '3 Years' };

export default function TradePlanTab({ data }) {
  const { tradePlan: tp, cagrData, price, targetFeasibility, userGoal } = data;
  const [horizon, setHorizon] = useState('12M');

  if (!tp) return <div style={{ color: 'var(--text-secondary)' }}>No trade plan data.</div>;

  const rrColor = tp.rr >= 2 ? 'var(--success)' : tp.rr >= 1 ? 'var(--warning)' : 'var(--danger)';

  const projPrice = cagrData?.projections?.[horizon];
  const projReturn = projPrice != null ? ((projPrice - price) / price * 100) : null;
  const cagr = cagrData?.cagr;
  const selectedFeasibility = targetFeasibility?.horizons?.find(h => h.key === horizon) || targetFeasibility?.horizons?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {targetFeasibility?.summary && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: targetFeasibility.summary.verdictColor }}>
            Target Feasibility
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Goal</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {userGoal?.targetPct?.toFixed?.(1) ?? userGoal?.targetPct}% return
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Profit target {fmtINR(userGoal?.targetProfit || 0, 0)}
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Current Verdict</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: targetFeasibility.summary.verdictColor }}>
                {targetFeasibility.summary.verdict}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Confidence {targetFeasibility.confidenceScore}/100
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Likely Time To Target</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {targetFeasibility.summary.likelyMonths != null ? `${targetFeasibility.summary.likelyMonths.toFixed(1)} months` : 'Not reliable'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Typical time when the target was actually reached
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Short-Term Chances</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmtPctInt(targetFeasibility.summary.oneMonthHitRate)} in 1M
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {fmtPctInt(targetFeasibility.summary.twoMonthHitRate)} in 2M
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            {targetFeasibility.summary.verdictText}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {TARGET_HORIZONS.map(item => {
              const stat = targetFeasibility.horizons.find(h => h.key === item.key);
              const hitRate = stat ? stat.hitRate * 100 : null;
              return (
                <div key={item.key} style={{
                  padding: '12px 14px', background: 'var(--surface-2)',
                  borderRadius: 10, border: `1px solid ${item.key === horizon ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: hitRate >= 60 ? 'var(--success)' : hitRate >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                    {hitRate != null ? `${hitRate.toFixed(0)}%` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    historical hit rate
                  </div>
                </div>
              );
            })}
          </div>

          {selectedFeasibility && (
            <div style={{
              marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)',
              borderRadius: 10, border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                What {HORIZON_LABELS[horizon]} usually looked like
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                {fmtPctInt(selectedFeasibility.hitRate)} of similar historical entry windows reached the target within {HORIZON_LABELS[horizon]}.{' '}
                {selectedFeasibility.hitRate >= 0.6 ? 'Historically this horizon has been supportive for the target.' : selectedFeasibility.hitRate >= 0.4 ? 'Historically this horizon has been mixed for the target.' : 'Historically this horizon has been weak for the target.'}
                {' '}
                {selectedFeasibility.medianMonthsToHit != null
                  ? `When the target was reached, the median time was ${selectedFeasibility.medianMonthsToHit.toFixed(1)} months.`
                  : 'The target was not reached often enough in this horizon to estimate timing confidently.'}
                {' '}
                {selectedFeasibility.medianHitDrawdownPct != null
                  ? `Before the outcome, the median drawdown was ${selectedFeasibility.medianHitDrawdownPct.toFixed(1)}%.`
                  : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3 cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
        className="trade-grid">
        <style>{`@media (max-width: 768px) { .trade-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Capital */}
        <Card title="Capital Allocation" accent="#6366f1">
          <Row
            label={<LabelTip label="Investment"
              title="Total Investment Budget"
              desc="The total capital budget entered by the user. Shares purchased × price + any cash left over equals this amount."
              formula="Investment = Shares × Price + Cash Left" />}
            value={fmtINR(tp.invested + tp.cashLeft)}
          />
          <Row
            label={<LabelTip label="Shares"
              title="Shares (Full Lots)"
              desc="Maximum whole number of shares within the budget at the current price."
              formula="Shares = floor(Investment / Price per Share)" />}
            value={tp.sharesFull} bold
          />
          <Row
            label={<LabelTip label="Invested"
              title="Capital Actually Deployed"
              desc="Amount of capital used for whole shares. Equal to Shares × Price."
              formula="Invested = Shares × Price per Share" />}
            value={fmtINR(tp.invested)} bold
          />
          <Row
            label={<LabelTip label="Cash Left"
              title="Uninvested Cash"
              desc="Remaining capital after allocating to whole shares."
              formula="Cash Left = Investment − Invested" />}
            value={fmtINR(tp.cashLeft)}
          />
          <Row
            label={<LabelTip label="Price / Share"
              title="Price per Share"
              desc="Last traded closing price used as the purchase price for this plan." />}
            value={fmtINR(price)}
          />
        </Card>

        {/* Target */}
        <Card title="Target" accent="#4ade80">
          <Row
            label={<LabelTip label="Target Price"
              title="Take-Profit Target Price"
              desc="Price at which the position would be closed for profit. Set by the user via the target % parameter."
              formula="Target = Entry Price × (1 + Target %)" />}
            value={fmtINR(tp.targetPrice)} bold color="var(--success)"
          />
          <Row label="Upside" value={`₹${fmt(tp.targetPrice - price)} (${fmt((tp.targetPrice - price) / price * 100)}%)`} />
          <Row
            label={<LabelTip label="Gross Profit"
              title="Gross Profit if Target Hit"
              desc="Total profit if all shares are sold at the target price. Does not account for brokerage or taxes."
              formula="Gross Profit = Shares × (Target Price − Entry Price)" />}
            value={fmtINR(tp.profit)} bold color="var(--success)"
          />
          <Row label="Shares × Upside" value={`${tp.sharesFull} × ₹${fmt(tp.targetPrice - price)}`} />
        </Card>

        {/* Stop Loss */}
        <Card title="Stop Loss" accent="#f87171">
          <Row
            label={<LabelTip label="SL Price"
              title="Stop-Loss Price"
              desc="Price at which the position would be exited to limit losses. Typically set below a key support level or as a fixed % below entry."
              formula="SL Price = Entry Price × (1 − Stop Loss %)" />}
            value={fmtINR(tp.slPrice)} bold color="var(--danger)"
          />
          <Row label="Downside" value={`₹${fmt(price - tp.slPrice)} (${fmt((price - tp.slPrice) / price * 100)}%)`} />
          <Row
            label={<LabelTip label="Max Risk"
              title="Maximum Capital at Risk"
              desc="Total loss if stop-loss is triggered on all shares held. This is the worst-case loss scenario."
              formula="Max Risk = Shares × (Entry Price − SL Price)" />}
            value={fmtINR(tp.risk)} bold color="var(--danger)"
          />
          <Row label="Shares × Risk" value={`${tp.sharesFull} × ₹${fmt(price - tp.slPrice)}`} />
        </Card>
      </div>

      {/* R/R Ratio pill */}
      <div className="card" style={{
        padding: '20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Risk / Reward Ratio
            <InfoTooltip
              title="Risk / Reward Ratio (R:R)"
              desc="The ratio of potential profit to potential loss. A higher R:R means you stand to gain more than you risk. Professional traders typically require at least 2:1."
              formula="R:R = Gross Profit / Max Risk = (Target − Entry) / (Entry − Stop Loss)"
              range="> 2:1 = Excellent\n1.5–2:1 = Good\n1–1.5:1 = Acceptable\n< 1:1 = Poor"
            />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: rrColor }}>
            {fmt(tp.rr, 2)}:1
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {tp.rr >= 2 ? 'Excellent — highly favourable' : tp.rr >= 1.5 ? 'Good' : tp.rr >= 1 ? 'Acceptable' : 'Poor — consider adjusting targets'}
          </div>
        </div>

        {/* Visual bar */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ flex: tp.risk, background: 'var(--danger)', opacity: 0.7 }} />
            <div style={{ flex: tp.profit, background: 'var(--success)', opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>Risk: {fmtINR(tp.risk, 0)}</span>
            <span>Reward: {fmtINR(tp.profit, 0)}</span>
          </div>
        </div>
      </div>

      {/* CAGR Projection */}
      {cagrData && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            CAGR Projection
            <InfoTooltip
              title="CAGR Price Projection"
              desc="Projects the stock's future price by compounding the historical annual growth rate forward. Assumes the past CAGR continues at the same rate — this is a statistical estimate, not a guarantee."
              formula="Projected Price = Current Price × (1 + CAGR)^years"
              range="CAGR = (Ending Price / Starting Price)^(1/years) − 1"
            />
          </h3>
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Historical CAGR:&nbsp;
            <span style={{ color: cagr >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
              {cagr != null ? `${(cagr * 100).toFixed(1)}% p.a.` : '—'}
            </span>
            <InfoTooltip
              title="Historical CAGR"
              desc="Compound Annual Growth Rate calculated from the oldest available price to the most recent close. Represents the average annualised return the stock has delivered historically."
              formula="CAGR = (Close[latest] / Close[first])^(1 / years) − 1"
              range="Positive = historically growing. Negative = historically declining."
            />
          </div>

          {/* Horizon selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {HORIZONS.map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${horizon === h ? 'var(--accent)' : 'var(--border)'}`,
                  background: horizon === h ? 'var(--accent-soft)' : 'transparent',
                  color: horizon === h ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                }}
              >
                {HORIZON_LABELS[h] || h}
              </button>
            ))}
          </div>

          {projPrice != null && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: 16, background: 'var(--surface-2)', borderRadius: 10,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Projected Price ({HORIZON_LABELS[horizon] || horizon})
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: projReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmtINR(projPrice)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {projReturn >= 0 ? '+' : ''}{projReturn?.toFixed(2)}% from current ₹{price?.toFixed(2)}
              </div>
            </div>
          )}

          {/* All horizons table */}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {HORIZONS.map(h => {
              const pp = cagrData.projections?.[h];
              const pr = pp != null ? ((pp - price) / price * 100) : null;
              return (
                <div key={h} style={{
                  padding: '10px', background: 'var(--surface-2)', borderRadius: 8,
                  border: `1px solid ${h === horizon ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'var(--transition)',
                }} onClick={() => setHorizon(h)}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{HORIZON_LABELS[h]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: pr >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {pp != null ? `₹${pp.toFixed(0)}` : '—'}
                  </div>
                  {pr != null && (
                    <div style={{ fontSize: 11, color: pr >= 0 ? 'var(--success)' : 'var(--danger)', opacity: 0.8 }}>
                      {pr >= 0 ? '+' : ''}{pr.toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
