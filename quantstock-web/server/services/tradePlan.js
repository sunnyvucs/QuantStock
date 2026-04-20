/**
 * Trade Plan calculator — mirrors Python calcTradePlan logic.
 */
export function calcTradePlan(price, investment, targetPct, slPct) {
  const sharesExact = investment / price;
  const sharesFull = Math.floor(sharesExact);
  const invested = sharesFull * price;
  const cashLeft = investment - invested;

  const targetPrice = price * (1 + targetPct / 100);
  const slPrice = price * (1 - slPct / 100);

  const profit = (targetPrice - price) * sharesFull;
  const risk = (price - slPrice) * sharesFull;
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
