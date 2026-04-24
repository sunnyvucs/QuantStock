/**
 * Final Decision engine combining trend, range, markov, and optional ML signals.
 * Mirrors Python finalDecision logic exactly.
 */
export function finalDecision(trendScore, rangeBias, markovBias, mlProb = null) {
  const trendN = (trendScore / 5) * 100;
  const rangeN = rangeBias === 'Bullish' ? 62 : 38;
  const markovN =
    markovBias === 'Bullish' ? 65 : markovBias === 'Bearish' ? 35 : 50;

  let raw;
  const explanations = [];

  if (mlProb != null) {
    const weights = { trend: 0.3, range: 0.1, markov: 0.2, ml: 0.4 };
    raw =
      weights.trend * trendN +
      weights.range * rangeN +
      weights.markov * markovN +
      weights.ml * mlProb * 100;

    explanations.push({ label: 'Trend Score', value: trendN.toFixed(1), weight: '30%' });
    explanations.push({ label: 'Range Bias', value: rangeN.toFixed(1), weight: '10%' });
    explanations.push({ label: 'Markov Bias', value: markovN.toFixed(1), weight: '20%' });
    explanations.push({
      label: 'ML Up-Prob',
      value: (mlProb * 100).toFixed(1),
      weight: '40%',
    });
  } else {
    const weights = { trend: 0.4, range: 0.2, markov: 0.4 };
    raw = weights.trend * trendN + weights.range * rangeN + weights.markov * markovN;

    explanations.push({ label: 'Trend Score', value: trendN.toFixed(1), weight: '40%' });
    explanations.push({ label: 'Range Bias', value: rangeN.toFixed(1), weight: '20%' });
    explanations.push({ label: 'Markov Bias', value: markovN.toFixed(1), weight: '40%' });
  }

  const score = Math.min(100, Math.max(0, raw));

  let label, color;
  if (score >= 70) {
    label = 'Strong Bullish';
    color = '#4ade80';
  } else if (score >= 57) {
    label = 'Bullish';
    color = '#86efac';
  } else if (score >= 43) {
    label = 'Neutral';
    color = '#fbbf24';
  } else {
    label = 'Bearish';
    color = '#f87171';
  }

  return { score, label, color, explanations };
}

/**
 * Goal-aware score: rates how well the current setup supports the user's
 * specific investment goal (target%, stop-loss%, R/R, historical feasibility).
 *
 * @param {object} tradePlan   - { rr, targetPrice, slPrice, profit, risk }
 * @param {object} feasibility - result of analyzeTargetFeasibility (optional, client-computed)
 * @param {object} cagrData    - { cagr } (optional)
 * @param {number} targetPct   - user's target return %
 * @returns {{ score, label, color, factors }}
 */
export function goalScore(tradePlan, feasibility = null, cagrData = null, targetPct = null) {
  if (!tradePlan) return null;

  const factors = [];
  let total = 0;
  let weight = 0;

  // ── Factor 1: Risk/Reward ratio (weight 40) ───────────────────────────────
  const rr = Number(tradePlan.rr) || 0;
  let rrScore;
  if      (rr >= 2.5) rrScore = 100;
  else if (rr >= 2.0) rrScore = 85;
  else if (rr >= 1.5) rrScore = 65;
  else if (rr >= 1.0) rrScore = 40;
  else                rrScore = 15;

  const rrLabel = rr >= 2 ? 'Excellent' : rr >= 1.5 ? 'Good' : rr >= 1 ? 'Acceptable' : 'Poor';
  factors.push({ label: 'Risk / Reward', value: `${rr.toFixed(2)}:1`, score: rrScore, weight: '40%', verdict: rrLabel });
  total  += rrScore * 0.4;
  weight += 0.4;

  // ── Factor 2: Historical target feasibility at 6M (weight 40) ────────────
  if (feasibility?.summary) {
    const hitRate  = Number(feasibility.summary.sixMonthHitRate ?? feasibility.summary.bestHitRate ?? 0);
    const feasScore = Math.round(hitRate * 100);
    const feasVerdict = feasibility.summary.verdict; // 'Realistic' | 'Borderline' | 'Unlikely'
    factors.push({
      label: 'Target Feasibility',
      value: `${(hitRate * 100).toFixed(0)}% hit rate`,
      score: feasScore,
      weight: '40%',
      verdict: feasVerdict,
    });
    total  += feasScore * 0.4;
    weight += 0.4;
  }

  // ── Factor 3: CAGR vs target alignment (weight 20) ───────────────────────
  if (cagrData?.cagr != null && targetPct != null) {
    const annualCagr  = Number(cagrData.cagr) * 100;  // already a ratio → %
    const annualTarget = Number(targetPct);             // user's target is already per-period
    let cagrScore;
    // If CAGR > target: historically comfortable — score high
    if      (annualCagr >= annualTarget * 1.5) cagrScore = 90;
    else if (annualCagr >= annualTarget)        cagrScore = 70;
    else if (annualCagr >= annualTarget * 0.7)  cagrScore = 45;
    else                                        cagrScore = 20;

    const cagrVerdict = cagrScore >= 70 ? 'Aligned' : cagrScore >= 45 ? 'Stretched' : 'Aggressive';
    factors.push({
      label: 'CAGR vs Target',
      value: `${annualCagr.toFixed(1)}% CAGR`,
      score: cagrScore,
      weight: '20%',
      verdict: cagrVerdict,
    });
    total  += cagrScore * 0.2;
    weight += 0.2;
  }

  // Normalise if not all factors contributed (e.g. no feasibility yet)
  const raw = weight > 0 ? total / weight : 0;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  let label, color;
  if      (score >= 70) { label = 'Goal Supported';   color = '#4ade80'; }
  else if (score >= 50) { label = 'Goal Borderline';  color = '#fbbf24'; }
  else                  { label = 'Goal Challenged';  color = '#f87171'; }

  return { score, label, color, factors };
}
