/**
 * CAGR Projection based on historical close prices.
 * Mirrors Python cagrProjection logic.
 */
export function cagrProjection(closes, price, monthsList = [1, 3, 6, 12, 36]) {
  const n = closes.length;
  if (n < 50) return null;

  const firstClose = closes[0];
  if (!firstClose || firstClose === 0) return null;

  // Annualised CAGR: (price / firstClose)^(252/n) - 1
  const cagr = Math.pow(price / firstClose, 252 / n) - 1;

  const projections = {};
  monthsList.forEach(m => {
    projections[`${m}M`] = price * (1 + cagr * (m / 12));
  });

  return { cagr, projections };
}
