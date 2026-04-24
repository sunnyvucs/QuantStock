import React from 'react';
import InfoTooltip from '../ui/InfoTooltip';

function StatCard({ label, value, sub, color, tip }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {tip && <InfoTooltip {...tip} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function FeatureBar({ name, importance, max }) {
  const pct = max > 0 ? (importance / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 90, fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, fontFamily: 'monospace' }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', opacity: 0.8, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ width: 40, fontSize: 11, color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>
        {(importance * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export default function MLTab({ data, mlStatus }) {
  const { ml, userGoal, targetFeasibility, goalInsights } = data;

  if (!ml) {
    const pending = mlStatus && mlStatus !== 'done' && mlStatus !== 'error';
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 14, padding: '40px 24px',
        color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400,
      }}>
        <div style={{
          width: 48, height: 48, background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🤖</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>
            {pending ? 'Statistical Models Are Running' : 'Statistical Model Not Run'}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            {pending
              ? `Current status: ${mlStatus.replace('running: ', '')}`
              : <>Enable <strong style={{ color: 'var(--accent)' }}>Statistical Model</strong> in the Parameters panel,
                then click <strong style={{ color: 'var(--accent)' }}>Re-analyse</strong>.</>}
          </div>
        </div>
        <div style={{
          padding: '8px 14px', background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-md)',
          fontSize: 11, color: 'var(--text-secondary)',
        }}>
          ⏱ Training typically takes 5–15 seconds. If the external ensemble is unavailable, the app falls back to the built-in server model.
        </div>
      </div>
    );
  }

  const upProbColor = ml.latestP > 0.6 ? 'var(--success)' : ml.latestP > 0.4 ? 'var(--warning)' : 'var(--danger)';
  const maxImp = Math.max(...(ml.featureImportances || []).map(f => f.importance), 0.001);
  const { tp = 0, fp = 0, tn = 0, fn = 0 } = ml.confMatrix || {};
  const modelView =
    ml.latestP > 0.6 ? 'Mildly bullish for the next session' :
    ml.latestP < 0.4 ? 'Mildly bearish for the next session' :
    'Neutral for the next session';
  const trustLevel =
    ml.acc == null ? 'Unknown' :
    ml.acc >= 0.62 ? 'Medium' :
    ml.acc >= 0.55 ? 'Moderate' :
    'Low';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          What This Model Means
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatCard
            label="Model Use"
            value="Next Session"
            sub="This model is for the next trading session only"
            tip={{ title: 'Prediction Horizon', desc: 'The current ML model estimates whether the next trading session may close higher or lower. It does not directly predict 1-month, 2-month, or 6-month target achievement.' }}
          />
          <StatCard
            label="Plain-English View"
            value={modelView}
            sub={`${(ml.latestP * 100).toFixed(1)}% up probability`}
            color={upProbColor}
          />
          <StatCard
            label="Trust Level"
            value={trustLevel}
            sub={ml.acc != null ? `Based on ${ (ml.acc * 100).toFixed(1)}% test accuracy` : 'Awaiting model metrics'}
            color={trustLevel === 'Medium' ? 'var(--success)' : trustLevel === 'Moderate' ? 'var(--warning)' : 'var(--danger)'}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          This ML model does <strong>not</strong> directly use your investment amount to predict future price. Your investment amount only changes profit and loss sizing.
          {' '}
          Your <strong>target return</strong> and <strong>time horizon</strong> are handled by the goal-based historical analysis in the Trade tab.
          {' '}
          Use this ML tab as a <strong>short-term support signal</strong>, not as the main answer to “Can I reach my 10% target?”
        </div>
        {targetFeasibility?.summary && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            For your current goal of <strong>{userGoal?.targetPct?.toFixed?.(1) ?? userGoal?.targetPct}%</strong> on <strong>₹{Number(userGoal?.investment || 0).toLocaleString('en-IN')}</strong>,
            the goal-based engine says: <strong style={{ color: targetFeasibility.summary.verdictColor }}>{targetFeasibility.summary.verdict}</strong>.
            {' '}
            Historical chance to hit the target: <strong>{Math.round((targetFeasibility.summary.oneMonthHitRate || 0) * 100)}%</strong> in 1 month and <strong>{Math.round((targetFeasibility.summary.twoMonthHitRate || 0) * 100)}%</strong> in 2 months.
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Goal-Based Read
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatCard
            label="User Goal"
            value={`${userGoal?.targetPct?.toFixed?.(1) ?? userGoal?.targetPct}%`}
            sub={`on ₹${Number(userGoal?.investment || 0).toLocaleString('en-IN')}`}
          />
          <StatCard
            label="1M Goal Chance"
            value={`${Math.round((targetFeasibility?.summary?.oneMonthHitRate || 0) * 100)}%`}
            sub="historical target hit rate"
            color="var(--accent)"
          />
          <StatCard
            label="2M Goal Chance"
            value={`${Math.round((targetFeasibility?.summary?.twoMonthHitRate || 0) * 100)}%`}
            sub="historical target hit rate"
            color="var(--accent)"
          />
          <StatCard
            label="ML Effect On Goal"
            value={goalInsights?.ml?.label || 'Not run'}
            sub="how the short-term signal affects the target path"
            color={ml.latestP >= 0.6 ? 'var(--success)' : ml.latestP <= 0.4 ? 'var(--danger)' : 'var(--warning)'}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {goalInsights?.ml?.text}
          {' '}
          In other words, this ML tab does not tell you whether your 10% target will definitely be hit.
          It tells you whether the immediate short-term direction is helping or hurting the early path toward that target.
        </div>
      </div>

      {/* Time horizon banner */}
      <div style={{
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 8,
        fontSize: 12, color: 'var(--text-secondary)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
      }}>
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>⏱ Model Output Horizon:</span> Next trading session (1 day)</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>This is not a “how many months to hit my target” model. That answer comes from the target-feasibility analysis.</span>
      </div>

      {/* Model name + split */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 12px',
          background: 'var(--accent-soft)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-pill)',
          fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        }}>
          {ml.name || 'ML Model'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {ml.trainN != null ? `Train: ${ml.trainN} bars · Test: ${ml.testN} bars` : `Models: ${(ml.modelsRun || []).join(' · ')}`}
          <InfoTooltip
            title="Train / Test Split"
            desc="Dataset split chronologically — older data trains, more recent tests. Simulates real-world usage."
            formula="Train = first 80% (oldest). Test = last 20% (most recent)."
          />
        </span>
      </div>

      {/* 4 stat cards in 2+2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <StatCard
          label="Accuracy"
          value={ml.acc != null ? `${(ml.acc * 100).toFixed(1)}%` : '—'}
          sub="Ensemble · test set"
          color={ml.acc != null ? (ml.acc > 0.6 ? 'var(--success)' : ml.acc > 0.5 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)'}
          tip={{ title: 'Accuracy', desc: '% of all predictions (up AND down) that were correct.', formula: '(TP + TN) / (TP + TN + FP + FN)', range: '> 60% = Good. > 70% = Excellent. < 50% = Worse than random.' }}
        />
        <StatCard
          label="Directional Score"
          value={`${(ml.latestP * 100).toFixed(1)}%`}
          sub="Next session (statistical)"
          color={upProbColor}
          tip={{ title: 'Directional Score (Next Session)', desc: 'Statistical score indicating likelihood of a higher close next session, based on current technical indicators. Not a guarantee or recommendation.', formula: 'Weighted ensemble of RF · XGBoost · LR · LSTM probabilities', range: '> 60% = Bullish indication. 40–60% = Neutral. < 40% = Bearish indication.' }}
        />
        <StatCard
          label="Precision"
          value={ml.prec != null ? `${(ml.prec * 100).toFixed(1)}%` : '—'}
          sub="Ensemble · bull calls"
          tip={{ title: 'Precision (Bullish)', desc: 'Of all "Up" model outputs, how often was it actually up? High = fewer false positive signals.', formula: 'TP / (TP + FP)', range: '> 60% = Reliable signals.' }}
        />
        <StatCard
          label="Recall"
          value={ml.rec != null ? `${(ml.rec * 100).toFixed(1)}%` : '—'}
          sub="Ensemble · bull coverage"
          tip={{ title: 'Recall (Bullish)', desc: 'Of all actual "Up" days, how many did the model catch?', formula: 'TP / (TP + FN)', range: '> 60% = Good bull-day coverage.' }}
        />
      </div>

      {/* Probability bar + Feature importances side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>

        {/* Up probability visual */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Next Session Direction
            <InfoTooltip
              title="Directional Probability"
              desc="Green = probability of closing higher tomorrow. Red = probability of closing lower."
              formula="Up% + Down% = 100%"
            />
          </div>
          <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
            <div style={{ flex: 1 - ml.latestP, background: 'var(--danger)', opacity: 0.65, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>
              {((1 - ml.latestP) * 100).toFixed(0)}% ↓
            </div>
            <div style={{ flex: ml.latestP, background: 'var(--success)', opacity: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>
              {(ml.latestP * 100).toFixed(0)}% ↑
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            {ml.latestP > 0.6 ? '📈 Bullish signal' : ml.latestP < 0.4 ? '📉 Bearish signal' : '↔ Neutral / uncertain'}
          </div>
        </div>

        {/* Feature importances */}
        {ml.featureImportances && ml.featureImportances.length > 0 ? (
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Feature Importances
              <InfoTooltip
                title="Feature Importances"
                desc="How much each technical indicator contributed to predictions. Higher = more influential."
                formula="Mean decrease in Gini impurity across all trees."
                range="Sum = 100%. Top features drive most decisions."
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ml.featureImportances.map(f => (
                <FeatureBar key={f.name} name={f.name} importance={f.importance} max={maxImp} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Confusion matrix — only shown when local model ran */}
      {ml.confMatrix && (tp + fp + tn + fn > 0) && <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Confusion Matrix (Test Set)
          <InfoTooltip
            title="Confusion Matrix"
            desc="How predictions compare to actual outcomes on the held-out test set."
            formula={'TP = Predicted Up, Actually Up\nTN = Predicted Down, Actually Down\nFP = Predicted Up, Actually Down\nFN = Predicted Down, Actually Up'}
            range="Ideal: high TP and TN. Low FP and FN."
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '5px 8px', color: 'var(--text-muted)' }}></th>
                <th style={{ padding: '5px 8px', color: 'var(--success)', textAlign: 'center', fontSize: 10 }}>Pred ↑</th>
                <th style={{ padding: '5px 8px', color: 'var(--danger)',  textAlign: 'center', fontSize: 10 }}>Pred ↓</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '5px 8px', color: 'var(--success)', fontSize: 10, fontWeight: 600 }}>Actual ↑</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, background: 'rgba(74,222,128,0.15)', borderRadius: 6, color: 'var(--success)' }}>{tp}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, background: 'rgba(248,113,113,0.08)', borderRadius: 6, color: 'var(--text-secondary)' }}>{fn}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', color: 'var(--danger)', fontSize: 10, fontWeight: 600 }}>Actual ↓</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, background: 'rgba(248,113,113,0.08)', borderRadius: 6, color: 'var(--text-secondary)' }}>{fp}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, background: 'rgba(74,222,128,0.15)', borderRadius: 6, color: 'var(--success)' }}>{tn}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
            <div style={{ color: 'var(--text-secondary)' }}>TP (correctly called ↑): <strong style={{ color: 'var(--success)' }}>{tp}</strong></div>
            <div style={{ color: 'var(--text-secondary)' }}>TN (correctly called ↓): <strong style={{ color: 'var(--success)' }}>{tn}</strong></div>
            <div style={{ color: 'var(--text-secondary)' }}>FP (wrong ↑ call): <strong style={{ color: 'var(--danger)' }}>{fp}</strong></div>
            <div style={{ color: 'var(--text-secondary)' }}>FN (missed ↑): <strong style={{ color: 'var(--danger)' }}>{fn}</strong></div>
          </div>
        </div>
      </div>}

      {/* Ensemble per-model breakdown — shown when HF models ran */}
      {ml.models && Object.keys(ml.models).length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Per-Model Probabilities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(ml.models).map(([name, prob]) => {
              const pct = prob * 100;
              const color = pct > 60 ? 'var(--success)' : pct < 40 ? 'var(--danger)' : 'var(--warning)';
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 56, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', flexShrink: 0, textTransform: 'uppercase' }}>{name}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, opacity: 0.8, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ width: 44, fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Weights: RF 30% · XGBoost 30% · LR 15% · LSTM 25%
            </div>

            {/* Per-model accuracy/precision/recall */}
            {ml.modelMetrics && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Per-Model Test Metrics</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Model', 'Accuracy', 'Precision', 'Recall'].map(h => (
                        <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ml.modelMetrics).map(([name, m]) => (
                      <tr key={name}>
                        <td style={{ padding: '5px 6px', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>{name}</td>
                        <td style={{ padding: '5px 6px', color: m.acc > 0.6 ? 'var(--success)' : m.acc > 0.5 ? 'var(--warning)' : 'var(--danger)' }}>{(m.acc * 100).toFixed(1)}%</td>
                        <td style={{ padding: '5px 6px', color: 'var(--text-primary)' }}>{(m.prec * 100).toFixed(1)}%</td>
                        <td style={{ padding: '5px 6px', color: 'var(--text-primary)' }}>{(m.rec * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
