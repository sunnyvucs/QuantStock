/**
 * Trend Score computation from last indicator bar.
 * Returns score (0-5) and reasons array.
 */
export function calcTrend(lastBar) {
  const { close, ma20, ma50, ma200, rsi, macd, macdSignal } = lastBar;
  let score = 0;
  const reasons = [];

  if (ma20 != null && close > ma20) {
    score++;
    reasons.push(`Price (${close.toFixed(2)}) > MA20 (${ma20.toFixed(2)})`);
  } else if (ma20 != null) {
    reasons.push(`Price (${close.toFixed(2)}) < MA20 (${ma20.toFixed(2)})`);
  }

  if (ma50 != null && close > ma50) {
    score++;
    reasons.push(`Price (${close.toFixed(2)}) > MA50 (${ma50.toFixed(2)})`);
  } else if (ma50 != null) {
    reasons.push(`Price (${close.toFixed(2)}) < MA50 (${ma50.toFixed(2)})`);
  }

  if (ma200 != null && close > ma200) {
    score++;
    reasons.push(`Price (${close.toFixed(2)}) > MA200 (${ma200.toFixed(2)})`);
  } else if (ma200 != null) {
    reasons.push(`Price (${close.toFixed(2)}) < MA200 (${ma200.toFixed(2)})`);
  }

  if (rsi != null && rsi < 75) {
    score++;
    reasons.push(`RSI (${rsi.toFixed(1)}) < 75 — Not Overbought`);
  } else if (rsi != null) {
    reasons.push(`RSI (${rsi.toFixed(1)}) >= 75 — Overbought`);
  }

  if (macd != null && macdSignal != null && macd > macdSignal) {
    score++;
    reasons.push(`MACD (${macd.toFixed(3)}) > Signal (${macdSignal.toFixed(3)})`);
  } else if (macd != null && macdSignal != null) {
    reasons.push(`MACD (${macd.toFixed(3)}) < Signal (${macdSignal.toFixed(3)})`);
  }

  return { score, reasons };
}
