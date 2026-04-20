/**
 * Markov Chain analysis on daily returns.
 * 5 states: "Strong Down", "Down", "Flat", "Up", "Strong Up"
 * Mirrors Python buildMarkov logic exactly.
 */

export const STATES = ['Strong Down', 'Down', 'Flat', 'Up', 'Strong Up'];
const THRESHOLDS = [-1.5, -0.3, 0.3, 1.5];

export function classifyState(ret) {
  if (ret < THRESHOLDS[0]) return 'Strong Down';
  if (ret < THRESHOLDS[1]) return 'Down';
  if (ret < THRESHOLDS[2]) return 'Flat';
  if (ret < THRESHOLDS[3]) return 'Up';
  return 'Strong Up';
}

function matMul(A, B) {
  const n = 5;
  const C = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return C;
}

function matPow(M, p) {
  let result = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => (i === j ? 1 : 0))
  );
  let base = M.map(row => [...row]);
  while (p > 0) {
    if (p % 2 === 1) result = matMul(result, base);
    base = matMul(base, base);
    p = Math.floor(p / 2);
  }
  return result;
}

export function buildMarkov(closes) {
  const n = closes.length;
  if (n < 10) return null;

  const rets = [];
  for (let i = 1; i < n; i++) {
    rets.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }

  const stateSeq = rets.map(classifyState);
  const stateIdx = s => STATES.indexOf(s);

  const countMatrix = Array.from({ length: 5 }, () => new Array(5).fill(0));
  const stateCounts = {};
  STATES.forEach(s => (stateCounts[s] = 0));

  for (let i = 0; i < stateSeq.length; i++) {
    stateCounts[stateSeq[i]]++;
    if (i < stateSeq.length - 1) {
      const from = stateIdx(stateSeq[i]);
      const to = stateIdx(stateSeq[i + 1]);
      countMatrix[from][to]++;
    }
  }

  const transMatrix = countMatrix.map(row => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum > 0 ? row.map(v => v / sum) : row.map(() => 1 / 5);
  });

  const lastRet = rets[rets.length - 1];
  const current = classifyState(lastRet);
  const currentIdx = stateIdx(current);

  const nextProb = {};
  STATES.forEach((s, i) => {
    nextProb[s] = transMatrix[currentIdx][i];
  });

  const mat3 = matPow(transMatrix, 3);
  const step3Prob = {};
  STATES.forEach((s, i) => {
    step3Prob[s] = mat3[currentIdx][i];
  });

  const retSumPerState = {};
  const retCountPerState = {};
  STATES.forEach(s => {
    retSumPerState[s] = 0;
    retCountPerState[s] = 0;
  });
  for (let i = 0; i < stateSeq.length; i++) {
    retSumPerState[stateSeq[i]] += rets[i];
    retCountPerState[stateSeq[i]]++;
  }

  const avgRetPerState = {};
  STATES.forEach(s => {
    avgRetPerState[s] =
      retCountPerState[s] > 0 ? retSumPerState[s] / retCountPerState[s] : 0;
  });

  let expRet = 0;
  STATES.forEach(s => {
    expRet += nextProb[s] * avgRetPerState[s];
  });
  const lastClose = closes[n - 1];
  const expClose = lastClose * (1 + expRet / 100);

  const bullP = nextProb['Up'] + nextProb['Strong Up'];
  const bearP = nextProb['Strong Down'] + nextProb['Down'];

  let bias;
  if (bullP > 0.45) bias = 'Bullish';
  else if (bearP > 0.45) bias = 'Bearish';
  else bias = 'Neutral';

  const mostLikelyIdx = STATES.reduce(
    (best, s, i) => (nextProb[s] > nextProb[STATES[best]] ? i : best),
    0
  );
  const mostLikely = STATES[mostLikelyIdx];

  return {
    current,
    mostLikely,
    expClose,
    expRet,
    bullP,
    bearP,
    bias,
    nextProb,
    step3Prob,
    stateCounts,
    transMatrix,
    avgRetPerState,
    states: STATES,
  };
}
