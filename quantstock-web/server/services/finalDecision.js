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
