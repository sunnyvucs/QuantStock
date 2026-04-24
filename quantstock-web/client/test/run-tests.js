import assert from 'node:assert/strict';

import { analyzeTargetFeasibility, buildGoalInsights, calcTradePlan, cagrProjection } from '../src/services/investmentPlan.js';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  }
}

run('calcTradePlan computes shares and prices from the current goal', () => {
  const result = calcTradePlan(500, 100000, 10, 5);
  assert.equal(result.sharesFull, 200);
  assert.equal(result.targetPrice, 550);
  assert.equal(result.slPrice, 475);
  assert.equal(result.profit, 10000);
});

run('cagrProjection returns forward price estimates for common horizons', () => {
  const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
  const result = cagrProjection(closes, closes[closes.length - 1]);
  assert.ok(result);
  assert.ok(result.projections['12M'] > closes[closes.length - 1]);
});

run('analyzeTargetFeasibility reports strong hit rates for steadily rising data', () => {
  const history = Array.from({ length: 320 }, (_, i) => ({
    close: 100 + i,
  }));
  const result = analyzeTargetFeasibility(history, { targetPct: 10, investment: 100000 });
  assert.ok(result);
  const twoMonth = result.horizons.find(h => h.key === '2M');
  const sixMonth = result.horizons.find(h => h.key === '6M');
  assert.ok(twoMonth.hitRate >= result.summary.oneMonthHitRate);
  assert.ok(sixMonth.hitRate > 0.9);
  assert.equal(result.summary.verdict, 'Realistic');
});

run('buildGoalInsights derives next-day and goal summaries from model outputs', () => {
  const tradePlan = calcTradePlan(100, 100000, 10, 5);
  const feasibility = {
    summary: { oneMonthHitRate: 0.55, twoMonthHitRate: 0.68, verdict: 'Realistic' },
  };
  const result = buildGoalInsights({
    price: 100,
    tradePlan,
    targetFeasibility: feasibility,
    rangeLevels: { atr: 4, expH: 104, expL: 96 },
    markov: {
      bullP: 0.58,
      bearP: 0.28,
      expClose: 101.2,
      step3Prob: { Up: 0.31, 'Strong Up': 0.27 },
    },
    ml: { latestP: 0.62 },
  });

  assert.ok(result);
  assert.equal(result.nextDay.direction, 'Likely up');
  assert.equal(result.markov.regimeLabel, 'Supportive');
  assert.equal(result.ml.label, 'Supports near-term upside');
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
