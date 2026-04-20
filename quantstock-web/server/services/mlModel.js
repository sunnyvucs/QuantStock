/**
 * ML Model: RandomForest classifier (ml-random-forest).
 * Falls back to logistic regression in pure JS if unavailable.
 */

export const FEATURE_NAMES = [
  'ma20', 'ma50', 'ma200', 'rsi', 'macd', 'macdSignal', 'macdHist',
  'atr', 'ret1d', 'ret5d', 'ret1m', 'volume', 'turnover',
];

function extractFeatures(bar) {
  return FEATURE_NAMES.map(f => (bar[f] != null && !isNaN(bar[f]) ? bar[f] : 0));
}

/**
 * Pure-JS logistic regression (gradient descent) fallback.
 */
class LogisticRegression {
  constructor(lr = 0.01, iterations = 200) {
    this.lr = lr;
    this.iterations = iterations;
    this.weights = null;
    this.bias = 0;
    this.means = null;
    this.stds = null;
  }

  sigmoid(z) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  normalise(X) {
    const nf = X[0].length;
    this.means = new Array(nf).fill(0);
    this.stds = new Array(nf).fill(1);
    for (let j = 0; j < nf; j++) {
      const vals = X.map(r => r[j]);
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1;
      this.means[j] = m;
      this.stds[j] = s;
    }
    return X.map(row => row.map((v, j) => (v - this.means[j]) / this.stds[j]));
  }

  applyNorm(row) {
    return row.map((v, j) => (v - this.means[j]) / this.stds[j]);
  }

  train(X, y) {
    const Xn = this.normalise(X);
    const m = Xn.length;
    const nf = Xn[0].length;
    this.weights = new Array(nf).fill(0);
    this.bias = 0;

    for (let it = 0; it < this.iterations; it++) {
      let dbias = 0;
      const dw = new Array(nf).fill(0);
      for (let i = 0; i < m; i++) {
        const z = this.weights.reduce((s, w, j) => s + w * Xn[i][j], 0) + this.bias;
        const pred = this.sigmoid(z);
        const err = pred - y[i];
        dbias += err;
        for (let j = 0; j < nf; j++) dw[j] += err * Xn[i][j];
      }
      this.bias -= (this.lr * dbias) / m;
      for (let j = 0; j < nf; j++) this.weights[j] -= (this.lr * dw[j]) / m;
    }
  }

  predictProb(row) {
    const xn = this.applyNorm(row);
    const z = this.weights.reduce((s, w, j) => s + w * xn[j], 0) + this.bias;
    return this.sigmoid(z);
  }

  predict(row) {
    return this.predictProb(row) >= 0.5 ? 1 : 0;
  }

  featureImportances() {
    const abs = this.weights.map(Math.abs);
    const total = abs.reduce((a, b) => a + b, 0) || 1;
    return abs.map(v => v / total);
  }
}

/**
 * Train and evaluate the ML model.
 */
export async function trainAndEval(enrichedBars) {
  const samples = [];
  for (let i = 0; i < enrichedBars.length - 1; i++) {
    const bar = enrichedBars[i];
    const nextBar = enrichedBars[i + 1];
    if (bar.ma200 == null) continue;
    const features = extractFeatures(bar);
    const target = nextBar.close > bar.close ? 1 : 0;
    samples.push({ features, target });
  }

  if (samples.length < 30) return null;

  const splitIdx = Math.floor(samples.length * 0.8);
  const trainSamples = samples.slice(0, splitIdx);
  const testSamples = samples.slice(splitIdx);

  const Xtrain = trainSamples.map(s => s.features);
  const ytrain = trainSamples.map(s => s.target);
  const Xtest = testSamples.map(s => s.features);
  const ytest = testSamples.map(s => s.target);

  let model;
  let useRF = false;

  try {
    const { RandomForestClassifier } = await import('ml-random-forest');
    model = new RandomForestClassifier({
      nEstimators: 50,
      maxFeatures: 0.7,
      replacement: true,
      useSampleBagging: true,
      noOOB: true,
    });
    model.train(Xtrain, ytrain);
    useRF = true;
  } catch (e) {
    console.warn('ml-random-forest unavailable, using logistic regression:', e.message);
    model = new LogisticRegression(0.05, 300);
    model.train(Xtrain, ytrain);
  }

  // Evaluate
  let tp = 0, fp = 0, tn = 0, fn = 0;
  Xtest.forEach((x, i) => {
    let pred;
    if (useRF) {
      pred = model.predict([x])[0];
    } else {
      pred = model.predict(x);
    }
    if (pred === 1 && ytest[i] === 1) tp++;
    else if (pred === 1 && ytest[i] === 0) fp++;
    else if (pred === 0 && ytest[i] === 0) tn++;
    else fn++;
  });

  const acc = (tp + tn) / (tp + tn + fp + fn) || 0;
  const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
  const rec = tp + fn > 0 ? tp / (tp + fn) : 0;

  // Latest prediction
  const lastBar = enrichedBars[enrichedBars.length - 1];
  const lastFeatures = extractFeatures(lastBar);
  let latestP;
  if (useRF) {
    try {
      const probs = model.predictProbability([lastFeatures], 1);
      latestP = typeof probs[0] === 'number' ? probs[0] : 0.5;
    } catch {
      latestP = model.predict([lastFeatures])[0] === 1 ? 0.7 : 0.3;
    }
  } else {
    latestP = model.predictProb(lastFeatures);
  }

  // Feature importances via permutation (for RF) or weight magnitude (for LR)
  let importances;
  if (useRF) {
    try {
      const baseCorrect = Xtest.filter((x, i) => model.predict([x])[0] === ytest[i]).length;
      const baseAcc2 = baseCorrect / Xtest.length;

      importances = FEATURE_NAMES.map((_, fIdx) => {
        const shuffled = Xtest.map(row => [...row]);
        const colVals = shuffled.map(r => r[fIdx]);
        for (let i = colVals.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [colVals[i], colVals[j]] = [colVals[j], colVals[i]];
        }
        shuffled.forEach((r, i) => { r[fIdx] = colVals[i]; });

        const correct = shuffled.filter((x, i) => model.predict([x])[0] === ytest[i]).length;
        const shuffledAcc = correct / shuffled.length;
        return Math.max(0, baseAcc2 - shuffledAcc);
      });

      const total = importances.reduce((a, b) => a + b, 0) || 1;
      importances = importances.map(v => v / total);
    } catch {
      importances = FEATURE_NAMES.map(() => 1 / FEATURE_NAMES.length);
    }
  } else {
    importances = model.featureImportances();
  }

  const featureImportances = FEATURE_NAMES.map((name, i) => ({
    name,
    importance: importances[i] ?? 0,
  })).sort((a, b) => b.importance - a.importance);

  return {
    name: useRF ? 'Random Forest' : 'Logistic Regression',
    acc,
    prec,
    rec,
    latestP,
    featureImportances,
    trainN: trainSamples.length,
    testN: testSamples.length,
    confMatrix: { tp, fp, tn, fn },
  };
}
