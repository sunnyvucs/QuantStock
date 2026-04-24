const TRADING_DAYS_PER_MONTH = 21;

export const TARGET_HORIZONS = [
  { key: '1M', label: '1 Month', months: 1, days: 21 },
  { key: '2M', label: '2 Months', months: 2, days: 42 },
  { key: '3M', label: '3 Months', months: 3, days: 63 },
  { key: '6M', label: '6 Months', months: 6, days: 126 },
  { key: '12M', label: '1 Year', months: 12, days: 252 },
  { key: '36M', label: '3 Years', months: 36, days: 756 },
];

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function calcTradePlan(price, investment, targetPct, slPct) {
  const safePrice = isFiniteNumber(price) && price > 0 ? Number(price) : 0;
  const safeInvestment = isFiniteNumber(investment) ? Number(investment) : 0;
  const safeTargetPct = isFiniteNumber(targetPct) ? Number(targetPct) : 0;
  const safeSlPct = isFiniteNumber(slPct) ? Number(slPct) : 0;

  const sharesExact = safePrice > 0 ? safeInvestment / safePrice : 0;
  const sharesFull = Math.floor(sharesExact);
  const invested = sharesFull * safePrice;
  const cashLeft = safeInvestment - invested;
  const targetPrice = safePrice * (1 + safeTargetPct / 100);
  const slPrice = safePrice * (1 - safeSlPct / 100);
  const profit = (targetPrice - safePrice) * sharesFull;
  const risk = (safePrice - slPrice) * sharesFull;
  const rr = risk > 0 ? profit / risk : 0;

  return {
    sharesExact,
    sharesFull,
    invested,
    cashLeft,
    targetPrice,
    slPrice,
    profit,
    risk,
    rr,
  };
}

export function cagrProjection(closes, price, monthsList = [1, 2, 3, 6, 12, 36]) {
  if (!Array.isArray(closes) || closes.length < 50) return null;
  const firstClose = Number(closes[0]);
  const lastPrice = Number(price);
  if (!isFiniteNumber(firstClose) || firstClose <= 0 || !isFiniteNumber(lastPrice) || lastPrice <= 0) return null;

  const cagr = Math.pow(lastPrice / firstClose, 252 / closes.length) - 1;
  const projections = {};

  monthsList.forEach(months => {
    projections[`${months}M`] = lastPrice * Math.pow(1 + cagr, months / 12);
  });

  return { cagr, projections };
}

export function analyzeTargetFeasibility(history, { targetPct, investment } = {}) {
  if (!Array.isArray(history) || history.length < TARGET_HORIZONS[0].days + 2) return null;

  const closes = history.map(bar => Number(bar.close));
  if (closes.some(close => !isFiniteNumber(close) || close <= 0)) return null;

  const targetReturn = Number(targetPct) / 100;
  if (!isFiniteNumber(targetReturn) || targetReturn <= 0) return null;

  const currentPrice = closes[closes.length - 1];
  const currentTargetPrice = currentPrice * (1 + targetReturn);
  const currentTargetProfit = isFiniteNumber(investment) ? Number(investment) * targetReturn : null;

  const horizons = TARGET_HORIZONS.map(horizon => {
    const samples = [];

    for (let startIdx = 0; startIdx + horizon.days < closes.length; startIdx++) {
      const entryPrice = closes[startIdx];
      const targetPrice = entryPrice * (1 + targetReturn);
      let firstHitDays = null;
      let minClose = entryPrice;

      for (let offset = 1; offset <= horizon.days; offset++) {
        const futureClose = closes[startIdx + offset];
        minClose = Math.min(minClose, futureClose);
        if (firstHitDays == null && futureClose >= targetPrice) {
          firstHitDays = offset;
        }
      }

      samples.push({
        hit: firstHitDays != null,
        daysToHit: firstHitDays,
        drawdownPct: ((minClose - entryPrice) / entryPrice) * 100,
      });
    }

    const hits = samples.filter(sample => sample.hit);
    const hitRate = samples.length ? hits.length / samples.length : 0;
    const medianDaysToHit = median(hits.map(sample => sample.daysToHit).filter(v => v != null));
    const medianDrawdownPct = median(samples.map(sample => sample.drawdownPct));
    const medianHitDrawdownPct = median(hits.map(sample => sample.drawdownPct));

    return {
      ...horizon,
      sampleSize: samples.length,
      hits: hits.length,
      hitRate,
      missRate: 1 - hitRate,
      medianDaysToHit,
      medianMonthsToHit: medianDaysToHit != null ? medianDaysToHit / TRADING_DAYS_PER_MONTH : null,
      medianDrawdownPct,
      medianHitDrawdownPct,
    };
  });

  const longestHorizon = horizons[horizons.length - 1];
  const strongestHorizon = horizons.reduce((best, horizon) => horizon.hitRate > best.hitRate ? horizon : best, horizons[0]);
  const earliestReliableHorizon = horizons.find(horizon => horizon.hitRate >= 0.5 && horizon.hits >= 10) || strongestHorizon;
  const oneMonthHorizon = horizons.find(horizon => horizon.key === '1M') || horizons[0];
  const twoMonthHorizon = horizons.find(horizon => horizon.key === '2M') || horizons.find(horizon => horizon.key === '3M') || horizons[0];
  const baseHorizon = horizons.find(horizon => horizon.key === '6M') || horizons[0];

  let verdict = 'Borderline';
  let verdictColor = 'var(--warning)';
  let verdictText = `Historically this stock has delivered the target within ${baseHorizon.label.toLowerCase()} often enough to consider it, but not with strong consistency.`;

  if (baseHorizon.hitRate >= 0.65) {
    verdict = 'Realistic';
    verdictColor = 'var(--success)';
    verdictText = `Historically this stock has reached the target within ${baseHorizon.label.toLowerCase()} in a strong share of observed entry windows.`;
  } else if (baseHorizon.hitRate < 0.4) {
    verdict = 'Unlikely';
    verdictColor = 'var(--danger)';
    verdictText = `Historically this stock has not reached the target within ${baseHorizon.label.toLowerCase()} often enough to treat it as a reliable expectation.`;
  }

  const confidenceScore = clamp(
    Math.round(
      baseHorizon.hitRate * 65 +
      clamp((strongestHorizon.hitRate - baseHorizon.hitRate) * 100, 0, 20) +
      clamp((history.length - 200) / 10, 0, 15)
    ),
    5,
    95
  );

  return {
    targetPct: Number(targetPct),
    targetReturn,
    currentPrice,
    currentTargetPrice,
    currentTargetProfit,
    horizons,
    strongestHorizon,
    earliestReliableHorizon,
    confidenceScore,
    summary: {
      verdict,
      verdictColor,
      verdictText,
      likelyMonths: earliestReliableHorizon?.medianMonthsToHit ?? null,
      likelyHorizonKey: earliestReliableHorizon?.key ?? null,
      likelyHorizonLabel: earliestReliableHorizon?.label ?? null,
      oneMonthHitRate: oneMonthHorizon.hitRate,
      twoMonthHitRate: twoMonthHorizon.hitRate,
      bestWindowLabel: earliestReliableHorizon?.label ?? null,
      sixMonthHitRate: baseHorizon.hitRate,
      bestHitRate: strongestHorizon.hitRate,
      medianDrawdownPct: longestHorizon?.medianDrawdownPct ?? null,
    },
  };
}

/**
 * Goal-aware score: rates how well the setup supports the user's investment goal.
 * Mirrors the server-side goalScore in finalDecision.js.
 */
export function calcGoalScore(tradePlan, feasibility = null, cagrData = null, targetPct = null) {
  if (!tradePlan) return null;

  const factors = [];
  let total = 0;
  let weight = 0;

  // Factor 1: R/R ratio (40%)
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

  // Factor 2: Historical target feasibility (40%)
  if (feasibility?.summary) {
    const hitRate   = Number(feasibility.summary.sixMonthHitRate ?? feasibility.summary.bestHitRate ?? 0);
    const feasScore = Math.round(hitRate * 100);
    factors.push({
      label: 'Target Feasibility',
      value: `${(hitRate * 100).toFixed(0)}% hit rate`,
      score: feasScore,
      weight: '40%',
      verdict: feasibility.summary.verdict,
    });
    total  += feasScore * 0.4;
    weight += 0.4;
  }

  // Factor 3: CAGR vs target alignment (20%)
  if (cagrData?.cagr != null && targetPct != null) {
    const annualCagr   = Number(cagrData.cagr) * 100;
    const annualTarget = Number(targetPct);
    let cagrScore;
    if      (annualCagr >= annualTarget * 1.5) cagrScore = 90;
    else if (annualCagr >= annualTarget)        cagrScore = 70;
    else if (annualCagr >= annualTarget * 0.7)  cagrScore = 45;
    else                                        cagrScore = 20;
    const cagrVerdict = cagrScore >= 70 ? 'Aligned' : cagrScore >= 45 ? 'Stretched' : 'Aggressive';
    factors.push({ label: 'CAGR vs Target', value: `${annualCagr.toFixed(1)}% CAGR`, score: cagrScore, weight: '20%', verdict: cagrVerdict });
    total  += cagrScore * 0.2;
    weight += 0.2;
  }

  const raw   = weight > 0 ? total / weight : 0;
  const score = Math.min(100, Math.max(0, Math.round(raw)));
  let label, color;
  if      (score >= 70) { label = 'Goal Supported';  color = '#4ade80'; }
  else if (score >= 50) { label = 'Goal Borderline'; color = '#fbbf24'; }
  else                  { label = 'Goal Challenged'; color = '#f87171'; }

  return { score, label, color, factors };
}

export function buildGoalInsights({ price, tradePlan, targetFeasibility, rangeLevels, markov, ml }) {
  if (!Number.isFinite(Number(price)) || !tradePlan || !targetFeasibility) return null;

  const currentPrice = Number(price);
  const targetPrice = Number(tradePlan.targetPrice);
  const targetGap = targetPrice - currentPrice;
  const atr = Number(rangeLevels?.atr) || null;
  const nextDayHeadroom = Number(rangeLevels?.expH) - currentPrice;
  const nextDayDownside = currentPrice - Number(rangeLevels?.expL);
  const atrUnits = atr && atr > 0 ? targetGap / atr : null;
  const sessionsAtAtr = nextDayHeadroom > 0 ? targetGap / nextDayHeadroom : null;

  let rangeLabel = 'Moderate';
  let rangeText = 'The target is a moderate distance away relative to recent daily movement.';
  if (atrUnits != null) {
    if (atrUnits <= 1.25) {
      rangeLabel = 'Near';
      rangeText = 'The target is close enough to be reachable within normal short-term volatility.';
    } else if (atrUnits >= 3) {
      rangeLabel = 'Stretched';
      rangeText = 'The target is far from the current price relative to normal daily movement, so it likely needs multiple strong sessions.';
    }
  }

  const nextDayExpectedClose = Number(markov?.expClose);
  const nextDayMovePct = Number.isFinite(nextDayExpectedClose)
    ? ((nextDayExpectedClose - currentPrice) / currentPrice) * 100
    : null;
  const nextDayDirection =
    nextDayMovePct == null ? 'Unclear' :
    nextDayMovePct > 0.15 ? 'Likely up' :
    nextDayMovePct < -0.15 ? 'Likely down' :
    'Likely flat';

  const threeDayBullProb = markov?.step3Prob
    ? (Number(markov.step3Prob.Up || 0) + Number(markov.step3Prob['Strong Up'] || 0))
    : null;

  let regimeLabel = 'Mixed';
  let regimeText = 'The current historical regime is mixed for the user target.';
  if (Number(markov?.bullP) >= 0.55 && Number(threeDayBullProb) >= 0.5) {
    regimeLabel = 'Supportive';
    regimeText = 'The current regime has historically leaned in favor of upward continuation, which supports the target.';
  } else if (Number(markov?.bearP) >= 0.55) {
    regimeLabel = 'Unsupportive';
    regimeText = 'The current regime has historically leaned downward, which makes the target harder to reach from here.';
  }

  let mlGoalLabel = 'Not run';
  let mlGoalText = 'The ML model has not been run yet.';
  if (ml?.latestP != null) {
    if (ml.latestP >= 0.6) {
      mlGoalLabel = 'Supports near-term upside';
      mlGoalText = 'The ML model is supportive for the next trading session, which can help the early path toward the target.';
    } else if (ml.latestP <= 0.4) {
      mlGoalLabel = 'Warns on near-term weakness';
      mlGoalText = 'The ML model leans weak for the next trading session, which adds short-term risk even if the longer target remains possible.';
    } else {
      mlGoalLabel = 'Neutral';
      mlGoalText = 'The ML model is close to neutral and does not strongly support or reject the target in the immediate term.';
    }
  }

  return {
    nextDay: {
      expectedClose: Number.isFinite(nextDayExpectedClose) ? nextDayExpectedClose : null,
      expectedMovePct: nextDayMovePct,
      direction: nextDayDirection,
      bullProb: Number(markov?.bullP) || null,
      bearProb: Number(markov?.bearP) || null,
      rangeLow: Number(rangeLevels?.expL) || null,
      rangeHigh: Number(rangeLevels?.expH) || null,
      targetWithinRange: Number.isFinite(Number(rangeLevels?.expH)) ? targetPrice <= Number(rangeLevels?.expH) : null,
    },
    range: {
      targetGap,
      targetGapPct: ((targetPrice - currentPrice) / currentPrice) * 100,
      atrUnits,
      sessionsAtAtr,
      label: rangeLabel,
      text: rangeText,
      nextDayHeadroom,
      nextDayDownside,
    },
    markov: {
      regimeLabel,
      regimeText,
      nextDayBullProb: Number(markov?.bullP) || null,
      nextDayBearProb: Number(markov?.bearP) || null,
      threeDayBullProb,
    },
    ml: {
      label: mlGoalLabel,
      text: mlGoalText,
    },
  };
}
