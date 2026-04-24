import assert from 'node:assert/strict';

import { normalizeCsvRecord, parseCsvBars } from '../services/csvNormalizer.js';
import { finalDecision } from '../services/finalDecision.js';
import { buildMarkov } from '../services/markov.js';

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

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
}

run('normalizeCsvRecord maps common aliases and numeric strings', () => {
  const row = normalizeCsvRecord({
    Timestamp: '2026-04-18',
    'Open Price': '1,234.50',
    day_high: '1250',
    low_price: '1201.25',
    LTP: '1244.1',
    Qty: '9,876',
  });

  assert.deepEqual(row, {
    date: '2026-04-18',
    open: 1234.5,
    high: 1250,
    low: 1201.25,
    close: 1244.1,
    volume: 9876,
  });
});

run('parseCsvBars drops rows missing required OHLCV fields', () => {
  const rows = parseCsvBars([
    { Date: '2026-04-18', Open: '100', High: '110', Low: '95', Close: '108', Volume: '1000' },
    { Date: '2026-04-19', Open: '109', High: '111', Low: '107', Close: '', Volume: '900' },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].close, 108);
});

run('finalDecision uses no-ML weights when ML is absent', () => {
  const result = finalDecision(5, 'Bullish', 'Bullish', null);

  assert.equal(result.label, 'Strong Bullish');
  assertClose(result.score, 78.4);
  assert.equal(result.explanations.length, 3);
});

run('finalDecision uses ML weights when ML probability is provided', () => {
  const result = finalDecision(4, 'Bullish', 'Neutral', 0.8);

  assert.equal(result.label, 'Strong Bullish');
  assertClose(result.score, 72.2);
  assert.equal(result.explanations.length, 4);
});

run('buildMarkov exposes bull and bear probabilities from nextProb', () => {
  const closes = [100, 101, 102, 100, 99, 100, 103, 104, 103, 105, 107, 106];
  const result = buildMarkov(closes);

  assert.ok(result);
  assert.equal(typeof result.bullP, 'number');
  assert.equal(typeof result.bearP, 'number');
  assert.ok(result.bullP >= 0 && result.bullP <= 1);
  assert.ok(result.bearP >= 0 && result.bearP <= 1);
  assert.equal(result.nextProb.Up + result.nextProb['Strong Up'], result.bullP);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
