/**
 * Range Levels (Pivot, R1, S1, Expected High/Low) from last bar.
 * Mirrors Python calcRange logic.
 */
export function calcRange(lastBar, atrMult) {
  const { high: H, low: L, close: C, atr: ATR } = lastBar;

  const pivot = (H + L + C) / 3;
  const r1 = 2 * pivot - L;
  const s1 = 2 * pivot - H;
  const expH = C + ATR * atrMult;
  const expL = C - ATR * atrMult;

  const pct = v => ((v - C) / C) * 100;

  const bias = C > pivot ? 'Bullish' : 'Bearish';

  return {
    pivot,
    r1,
    s1,
    expH,
    expL,
    pivotPct: pct(pivot),
    r1Pct: pct(r1),
    s1Pct: pct(s1),
    exphPct: pct(expH),
    explPct: pct(expL),
    atr: ATR,
    bias,
  };
}
