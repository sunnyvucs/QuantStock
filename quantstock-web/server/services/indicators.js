/**
 * Technical Indicators computed on OHLCV data arrays.
 * Mirrors the Python app.py logic exactly.
 */

// Simple Moving Average
export function sma(arr, period) {
  const result = new Array(arr.length).fill(null);
  for (let i = period - 1; i < arr.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += arr[j];
    result[i] = sum / period;
  }
  return result;
}

// Exponential Moving Average (standard EMA, multiplier = 2/(period+1))
export function ema(arr, period) {
  const result = new Array(arr.length).fill(null);
  const mult = 2 / (period + 1);
  let started = false;
  let prev = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null || isNaN(arr[i])) continue;
    if (!started) {
      prev = arr[i];
      result[i] = prev;
      started = true;
    } else {
      prev = arr[i] * mult + prev * (1 - mult);
      result[i] = prev;
    }
  }
  return result;
}

// Wilder's EMA (com = period-1, alpha = 1/period)
export function wilderEma(arr, period) {
  const alpha = 1 / period;
  const result = new Array(arr.length).fill(null);
  let prev = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null || isNaN(arr[i])) continue;
    if (prev === null) {
      prev = arr[i];
      result[i] = prev;
    } else {
      prev = alpha * arr[i] + (1 - alpha) * prev;
      result[i] = prev;
    }
  }
  return result;
}

// RSI(14) using Wilder's method matching pandas ewm(com=13, adjust=False)
export function rsi(closes, period = 14) {
  const n = closes.length;
  const result = new Array(n).fill(null);

  if (n < period + 1) return result;

  const gains = new Array(n).fill(0);
  const losses = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    gains[i] = diff > 0 ? diff : 0;
    losses[i] = diff < 0 ? -diff : 0;
  }

  const alpha = 1 / period;
  let avgGain = null;
  let avgLoss = null;

  for (let i = 1; i < n; i++) {
    if (avgGain === null) {
      avgGain = gains[i];
      avgLoss = losses[i];
    } else {
      avgGain = alpha * gains[i] + (1 - alpha) * avgGain;
      avgLoss = alpha * losses[i] + (1 - alpha) * avgLoss;
    }
    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

// ATR(14) using Wilder's EWM (com=13)
export function atr(highs, lows, closes, period = 14) {
  const n = closes.length;
  const tr = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  const alpha = 1 / period;
  const result = new Array(n).fill(null);
  let prev = null;

  for (let i = 1; i < n; i++) {
    if (tr[i] == null) continue;
    if (prev === null) {
      prev = tr[i];
      result[i] = prev;
    } else {
      prev = alpha * tr[i] + (1 - alpha) * prev;
      result[i] = prev;
    }
  }

  return result;
}

// MACD: EMA12 - EMA26, signal = EMA9 of MACD, hist = MACD - signal
export function macd(closes) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const n = closes.length;

  const macdLine = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (ema12[i] != null && ema26[i] != null) {
      macdLine[i] = ema12[i] - ema26[i];
    }
  }

  const signalLine = ema(macdLine, 9);
  const histLine = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (macdLine[i] != null && signalLine[i] != null) {
      histLine[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macdLine, signalLine, histLine, ema12, ema26 };
}

// Percentage returns for different horizons
export function returns(closes) {
  const n = closes.length;
  const ret1d = new Array(n).fill(null);
  const ret5d = new Array(n).fill(null);
  const ret1m = new Array(n).fill(null);
  const ret3m = new Array(n).fill(null);
  const ret6m = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    if (closes[i - 1] && closes[i - 1] !== 0) {
      ret1d[i] = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
    }
  }
  for (let i = 5; i < n; i++) {
    if (closes[i - 5] && closes[i - 5] !== 0) {
      ret5d[i] = ((closes[i] - closes[i - 5]) / closes[i - 5]) * 100;
    }
  }
  for (let i = 21; i < n; i++) {
    if (closes[i - 21] && closes[i - 21] !== 0) {
      ret1m[i] = ((closes[i] - closes[i - 21]) / closes[i - 21]) * 100;
    }
  }
  for (let i = 63; i < n; i++) {
    if (closes[i - 63] && closes[i - 63] !== 0) {
      ret3m[i] = ((closes[i] - closes[i - 63]) / closes[i - 63]) * 100;
    }
  }
  for (let i = 126; i < n; i++) {
    if (closes[i - 126] && closes[i - 126] !== 0) {
      ret6m[i] = ((closes[i] - closes[i - 126]) / closes[i - 126]) * 100;
    }
  }

  return { ret1d, ret5d, ret1m, ret3m, ret6m };
}

/**
 * Main function: compute all indicators on OHLCV bars array.
 */
export function computeIndicators(bars) {
  const n = bars.length;
  const opens = bars.map(b => b.open);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);

  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);

  const { macdLine, signalLine, histLine, ema12, ema26 } = macd(closes);
  const rsiVals = rsi(closes, 14);
  const atrVals = atr(highs, lows, closes, 14);

  const turnover = closes.map((c, i) => c * volumes[i]);
  const { ret1d, ret5d, ret1m, ret3m, ret6m } = returns(closes);

  const result = [];
  for (let i = 0; i < n; i++) {
    result.push({
      date: bars[i].date,
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i],
      ma20: ma20[i],
      ma50: ma50[i],
      ma200: ma200[i],
      ema12: ema12[i],
      ema26: ema26[i],
      rsi: rsiVals[i],
      atr: atrVals[i],
      macd: macdLine[i],
      macdSignal: signalLine[i],
      macdHist: histLine[i],
      turnover: turnover[i],
      ret1d: ret1d[i],
      ret5d: ret5d[i],
      ret1m: ret1m[i],
      ret3m: ret3m[i],
      ret6m: ret6m[i],
    });
  }

  return result;
}
