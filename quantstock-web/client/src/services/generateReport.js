// Generates a plain-English PDF-ready text report from analysisData

function fmt(v, dec = 2) {
  if (v == null || isNaN(v)) return 'N/A';
  return Number(v).toFixed(dec);
}

function fmtINR(v, dec = 2) {
  if (v == null) return 'N/A';
  return `Rs. ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

function fmtMktCap(v, inCr = false) {
  if (v == null || v === 0) return 'N/A';
  const cr = inCr ? v : v / 1e7;
  if (cr >= 1e5) return `Rs. ${(cr / 1e5).toFixed(2)} Lakh Crore`;
  if (cr >= 1)   return `Rs. ${cr.toFixed(0)} Crore`;
  return `Rs. ${(cr * 100).toFixed(0)} Lakh`;
}

function explain(label, value, ...lines) {
  return `${label}: ${value}\n  -> ${lines.join('\n  -> ')}`;
}

function rsiExplain(rsi) {
  if (rsi == null) return 'N/A';
  if (rsi >= 70) return `${fmt(rsi)} — Overbought (the stock has risen a lot quickly; some investors may start selling to take profits, which can cause the price to fall)`;
  if (rsi >= 55) return `${fmt(rsi)} — Moderately Strong (the stock has good upward momentum)`;
  if (rsi >= 45) return `${fmt(rsi)} — Neutral (no clear directional pressure)`;
  if (rsi >= 30) return `${fmt(rsi)} — Moderately Weak (selling pressure building)`;
  return `${fmt(rsi)} — Oversold (the stock has fallen a lot quickly; it may be undervalued and due for a bounce, but trend could continue)`;
}

function macdExplain(macd, signal) {
  if (macd == null || signal == null) return 'N/A';
  const pos = macd > signal;
  return `${fmt(macd, 3)} (${pos ? 'above' : 'below'} signal ${fmt(signal, 3)}) — ${
    pos
      ? 'Bullish momentum: short-term price movement is stronger than the medium-term trend'
      : 'Bearish momentum: short-term price movement is weaker than the medium-term trend'
  }`;
}

function peExplain(pe) {
  if (pe == null) return 'N/A';
  if (pe <= 0) return `${fmt(pe, 1)} — Negative (the company is currently loss-making)`;
  if (pe <= 15) return `${fmt(pe, 1)} — Low P/E (cheap relative to earnings; could be undervalued or in a struggling sector)`;
  if (pe <= 25) return `${fmt(pe, 1)} — Moderate P/E (fairly valued; reasonable for most Indian blue-chips)`;
  if (pe <= 40) return `${fmt(pe, 1)} — High P/E (investors expect strong future growth; higher risk if growth disappoints)`;
  return `${fmt(pe, 1)} — Very High P/E (priced for exceptional growth; common in high-growth tech/pharma)`;
}

function roeExplain(roe) {
  if (roe == null) return 'N/A';
  const pct = roe * 100;
  if (pct >= 20) return `${fmt(pct, 1)}% — Excellent (the company earns Rs. ${fmt(pct, 1)} for every Rs. 100 of shareholder equity — a highly efficient business)`;
  if (pct >= 15) return `${fmt(pct, 1)}% — Good (the company generates solid returns for shareholders)`;
  if (pct >= 10) return `${fmt(pct, 1)}% — Average (meets basic expectations; look for improving trend)`;
  return `${fmt(pct, 1)}% — Below Average (the company is not generating strong returns on shareholder capital)`;
}

function debtExplain(de) {
  if (de == null) return 'N/A';
  if (de <= 0.3) return `${fmt(de)} — Very Low (the company has very little debt; financially very safe)`;
  if (de <= 1.0) return `${fmt(de)} — Conservative (comfortable debt level; manageable risk)`;
  if (de <= 2.0) return `${fmt(de)} — Moderate (some debt; watch for rising interest costs)`;
  return `${fmt(de)} — High (significant debt; higher financial risk, especially if earnings fall)`;
}

function rrExplain(rr) {
  if (rr >= 2) return `${fmt(rr)}:1 — Excellent. For every Rs. 1 you risk losing, you stand to gain Rs. ${fmt(rr)}. Professional traders look for at least 2:1.`;
  if (rr >= 1.5) return `${fmt(rr)}:1 — Good. Reward is meaningfully larger than risk.`;
  if (rr >= 1) return `${fmt(rr)}:1 — Acceptable, but tight. You earn slightly more than you risk.`;
  return `${fmt(rr)}:1 — Poor. You are risking more than you stand to gain. Consider adjusting your target or stop-loss.`;
}

function returnExplain(pct, period) {
  if (pct == null) return 'N/A';
  const abs = Math.abs(pct);
  const dir = pct >= 0 ? 'gained' : 'lost';
  let quality = '';
  if (abs <= 1) quality = pct >= 0 ? ' (small gain, stock largely flat)' : ' (small loss, stock largely flat)';
  else if (abs <= 5) quality = pct >= 0 ? ' (solid gain)' : ' (moderate loss)';
  else if (abs <= 15) quality = pct >= 0 ? ' (strong gain)' : ' (significant loss — worth investigating the cause)';
  else quality = pct >= 0 ? ' (exceptional gain)' : ' (very large loss — high caution warranted)';
  return `${pct >= 0 ? '+' : ''}${fmt(pct)}%${quality}`;
}

function decisionExplain(score, label) {
  if (score >= 70) return `${label} (${fmt(score, 1)}/100) — The combined statistical models have HIGH CONFIDENCE this stock has bullish conditions. Multiple indicators are aligned positively.`;
  if (score >= 57) return `${label} (${fmt(score, 1)}/100) — Models show MODERATE BULLISH conditions. More indicators are positive than negative, but not overwhelmingly so. Proceed with normal caution.`;
  if (score >= 43) return `${label} (${fmt(score, 1)}/100) — Models are MIXED. Bullish and bearish signals roughly cancel out. This stock is in a wait-and-watch zone.`;
  if (score >= 30) return `${label} (${fmt(score, 1)}/100) — Models lean BEARISH. More indicators point to downward pressure. Higher caution is advisable.`;
  return `${label} (${fmt(score, 1)}/100) — Models show STRONG BEARISH conditions. Multiple indicators are pointing negative. High caution warranted.`;
}

function priceVsMA(price, ma, label) {
  if (ma == null) return `${label}: N/A`;
  const pct = ((price - ma) / ma * 100).toFixed(1);
  const above = price > ma;
  return `${label} (${fmtINR(ma)}): Price is ${above ? 'ABOVE' : 'BELOW'} by ${Math.abs(pct)}% — ${
    above
      ? `Bullish signal. The stock is trading above its ${label}, which indicates ${label === 'MA 200' ? 'a long-term uptrend' : label === 'MA 50' ? 'a medium-term uptrend' : 'a short-term uptrend'}.`
      : `Bearish signal. The stock is below its ${label}, indicating ${label === 'MA 200' ? 'a long-term downtrend' : 'downward pressure in this timeframe'}.`
  }`;
}

function markovExplain(markov) {
  if (!markov) return 'N/A';
  const { current, upProb, downProb, bias } = markov;
  return [
    `Current Market State: ${current}`,
    `Probability of Up next session: ${fmt(upProb * 100, 1)}%`,
    `Probability of Down next session: ${fmt(downProb * 100, 1)}%`,
    `Model Bias: ${bias}`,
    `Plain English: Based on historical price movement patterns, if the stock is in a "${current}" state today, ` +
    `it has historically moved UP ${fmt(upProb * 100, 1)}% of the time in the next session. ` +
    (bias === 'Bullish' ? 'This is a positive signal.' : bias === 'Bearish' ? 'This is a cautionary signal.' : 'This is a neutral signal.'),
  ].join('\n  ');
}

function rangeExplain(rl, price) {
  if (!rl) return 'N/A';
  return [
    `Pivot Point: ${fmtINR(rl.pivot)} — This is the central reference price. Think of it as the "fair value" for the next session. Price above pivot = bullish, below = bearish.`,
    `Current Price vs Pivot: ${rl.pivotPct >= 0 ? 'ABOVE' : 'BELOW'} by ${Math.abs(fmt(rl.pivotPct))}%`,
    `Resistance 1 (R1): ${fmtINR(rl.r1)} (${fmt(rl.r1Pct, 1)}% away) — First ceiling. Price often slows or reverses here.`,
    `Support 1 (S1): ${fmtINR(rl.s1)} (${fmt(rl.s1Pct, 1)}% away) — First floor. Price often bounces here.`,
    `Expected Session High: ${fmtINR(rl.expH)} — Statistically the stock is unlikely to exceed this in a normal day.`,
    `Expected Session Low: ${fmtINR(rl.expL)} — Statistically the stock is unlikely to fall below this in a normal day.`,
  ].join('\n  ');
}

function sep(char = '-', len = 70) {
  return char.repeat(len);
}

export function generateReportText(data) {
  const { name, symbol, price, lastBar, tradePlan: tp, cagrData, markov, rangeLevels: rl, trend, ml, decision, fundamentals } = data;
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  const lines = [];

  const h1 = t => { lines.push('', sep('='), t.toUpperCase(), sep('=')); };
  const h2 = t => { lines.push('', sep('-'), t, sep('-')); };
  const line = t => lines.push(t || '');

  // Title
  lines.push(sep('=', 70));
  lines.push('  QUANTSTOCK — STOCK ANALYSIS REPORT');
  lines.push(sep('=', 70));
  line(`  Stock  : ${name}`);
  line(`  Symbol : ${symbol}`);
  line(`  Price  : ${fmtINR(price)}`);
  line(`  Date   : ${now}`);
  lines.push(sep('=', 70));
  line('');
  line('  IMPORTANT DISCLAIMER');
  line('  This report is generated by statistical models for EDUCATIONAL and');
  line('  INFORMATIONAL purposes ONLY. It does NOT constitute financial advice,');
  line('  investment recommendations, or solicitation to buy or sell any security.');
  line('  Always consult a SEBI-registered investment advisor before investing.');
  line('');

  // 1. Signal Summary
  h1('1. Overall Signal Summary');
  if (decision) {
    line(decisionExplain(decision.score, decision.label));
    line('');
    line('What this means for you:');
    if (decision.score >= 70)
      line('  The majority of our models agree this stock looks healthy. Still, always set a stop-loss and do your own research.');
    else if (decision.score >= 57)
      line('  Conditions are leaning positive. Not a screaming buy, but more indicators are in favour than against.');
    else if (decision.score >= 43)
      line('  No clear direction. It may be better to wait for a clearer signal before entering a position.');
    else
      line('  Most models are sounding caution. If you hold this stock, review your stop-loss levels. If looking to buy, consider waiting.');
  }

  // 2. Price & Returns
  h1('2. Price & Recent Returns');
  line(`Current Price: ${fmtINR(price)}`);
  line(`Today's Change: ${lastBar?.ret1d != null ? returnExplain(lastBar.ret1d, '1 Day') : 'N/A'}`);
  line('');
  line('How much has the stock moved recently?');
  [
    ['1 Day',    lastBar?.ret1d],
    ['5 Days',   lastBar?.ret5d],
    ['1 Month',  lastBar?.ret1m],
    ['3 Months', lastBar?.ret3m],
    ['6 Months', lastBar?.ret6m],
  ].forEach(([period, v]) => {
    line(`  ${period.padEnd(10)}: ${v != null ? returnExplain(v, period) : 'N/A'}`);
  });

  // 3. Technical Indicators
  h1('3. Technical Indicators (What Do They Mean?)');
  line('Moving Averages — These smooth out price noise to show the underlying trend:');
  line(`  ${priceVsMA(price, lastBar?.ma20,  'MA 20')}`);
  line(`  ${priceVsMA(price, lastBar?.ma50,  'MA 50')}`);
  line(`  ${priceVsMA(price, lastBar?.ma200, 'MA 200')}`);
  line('');
  line(`RSI (Relative Strength Index): ${rsiExplain(lastBar?.rsi)}`);
  line('  RSI measures how fast the price has moved. Think of it as a "heat gauge" — ');
  line('  too hot (above 70) means overbought, too cold (below 30) means oversold.');
  line('');
  line(`MACD (Momentum Indicator): ${macdExplain(lastBar?.macd, lastBar?.macdSignal)}`);
  line('  MACD tells you if the stock is gaining or losing speed in its current direction.');

  // 4. Trend Score
  h1('4. Trend Analysis');
  if (trend) {
    line(`Trend Score: ${trend.score}/5 — ${
      trend.score >= 4 ? 'Strong uptrend (most conditions are bullish)' :
      trend.score >= 3 ? 'Moderate uptrend (majority conditions met)' :
      trend.score >= 2 ? 'Mixed trend (some bullish, some bearish)' :
      'Weak or downtrend (few bullish conditions met)'
    }`);
    line('');
    line('Conditions checked (each worth 1 point):');
    if (trend.reasons) {
      trend.reasons.forEach(r => line(`  [${r.includes('>') ? 'PASS' : 'FAIL'}] ${r}`));
    }
  }

  // 5. Range Levels
  h1('5. Price Range & Support/Resistance Levels');
  line('These are key price levels to watch for the next trading session:');
  line('');
  line(rangeExplain(rl, price));
  line('');
  if (rl) {
    line(`ATR (Average True Range): ${fmtINR(rl.atr)}`);
    line('  ATR tells you how much the stock typically moves in a day. Higher ATR = more volatile.');
    if (rl.atr > price * 0.03)
      line('  This stock is relatively VOLATILE. Wider stop-losses may be needed.');
    else
      line('  This stock is relatively CALM. Good for conservative investors.');
  }

  // 6. Markov Chain
  h1('6. Markov Chain — Pattern-Based Probability');
  line('This model looks at historical price patterns to estimate tomorrow\'s move:');
  line('');
  line(markovExplain(markov));

  // 7. Trade Calculator
  h1('7. Trade Plan Calculator');
  if (tp) {
    line('Based on your investment parameters:');
    line('');
    line(`  Investment Budget : ${fmtINR(tp.invested + tp.cashLeft, 0)}`);
    line(`  Shares to Buy     : ${tp.sharesFull} shares at ${fmtINR(price)}/share`);
    line(`  Capital Deployed  : ${fmtINR(tp.invested, 0)}`);
    line(`  Cash Left Over    : ${fmtINR(tp.cashLeft, 0)}`);
    line('');
    line('If the price reaches your target:');
    line(`  Target Price      : ${fmtINR(tp.targetPrice)} (${fmt((tp.targetPrice - price) / price * 100)}% above current)`);
    line(`  Expected Profit   : ${fmtINR(tp.profit, 0)}`);
    line('  In simple terms: If the stock rises to the target price and you sell all shares,');
    line(`  you would pocket ${fmtINR(tp.profit, 0)} in profit.`);
    line('');
    line('If the price drops to your stop-loss:');
    line(`  Stop-Loss Price   : ${fmtINR(tp.slPrice)} (${fmt((price - tp.slPrice) / price * 100)}% below current)`);
    line(`  Maximum Loss      : ${fmtINR(tp.risk, 0)}`);
    line('  In simple terms: If the stock falls to the stop-loss and you exit, your total');
    line(`  loss is capped at ${fmtINR(tp.risk, 0)}.`);
    line('');
    line(`Risk/Reward Ratio: ${rrExplain(tp.rr)}`);
  } else {
    line('Trade plan data not available.');
  }

  // 8. CAGR
  if (cagrData) {
    h1('8. Historical Growth Projection (CAGR)');
    const cagr = cagrData.cagr;
    line(`Historical CAGR: ${cagr != null ? `${(cagr * 100).toFixed(1)}% per year` : 'N/A'}`);
    line('');
    if (cagr != null) {
      if (cagr > 0.15)
        line('  This stock has historically grown at a STRONG rate. Past performance does not guarantee future results.');
      else if (cagr > 0.08)
        line('  This stock has historically grown at a MODERATE rate, roughly in line with market averages.');
      else if (cagr > 0)
        line('  This stock has shown SLOW historical growth. Consider whether this meets your expectations.');
      else
        line('  This stock has DECLINED historically. Exercise extra caution.');
      line('');
      line('Projected Prices (if historical CAGR continues — this is a statistical estimate, NOT a guarantee):');
      const horizons = [['1M', '1 Month'], ['3M', '3 Months'], ['6M', '6 Months'], ['12M', '1 Year'], ['36M', '3 Years']];
      horizons.forEach(([key, label]) => {
        const pp = cagrData.projections?.[key];
        if (pp != null) {
          const pr = ((pp - price) / price * 100).toFixed(1);
          line(`  ${label.padEnd(12)}: ${fmtINR(pp)} (${pr >= 0 ? '+' : ''}${pr}%)`);
        }
      });
    }
  }

  // 9. Fundamentals
  h1('9. Company Fundamentals');
  if (fundamentals) {
    line(`Market Cap: ${fmtMktCap(fundamentals.marketCapCr ?? fundamentals.marketCap, !!fundamentals.marketCapCr)}`);
    line('  Market cap is the total value the stock market puts on this company.');
    line('  Large cap (> Rs. 20,000 Cr) = stable blue-chip. Mid cap = growth potential. Small cap = higher risk/reward.');
    line('');
    line(`P/E Ratio: ${peExplain(fundamentals.pe)}`);
    line('');
    line(`Return on Equity (ROE): ${roeExplain(fundamentals.roe)}`);
    line('  Think of ROE as "efficiency score" — how well the company turns investor money into profit.');
    line('');
    line(`Debt / Equity Ratio: ${debtExplain(fundamentals.debtToEquity)}`);
    line('  This tells you how much debt the company carries vs its own capital.');
  } else {
    line('Fundamental data available only for NSE/BSE stocks (not CSV uploads).');
  }

  // 10. ML Model
  if (ml) {
    h1('10. Machine Learning Model (Random Forest)');
    line(`Model: ${ml.name}`);
    line(`Up Probability for Next Session: ${(ml.latestP * 100).toFixed(1)}%`);
    line(`Prediction: ${ml.latestP > 0.5 ? 'Bullish' : 'Bearish'}`);
    line('');
    line('What this means:');
    line(`  The ML model has analysed historical price patterns and technical indicators.`);
    line(`  It estimates a ${(ml.latestP * 100).toFixed(1)}% probability that the stock will close HIGHER tomorrow.`);
    if (ml.latestP > 0.65)
      line('  This is a notably STRONG bullish probability.');
    else if (ml.latestP > 0.5)
      line('  This is a MILDLY bullish probability — slightly more likely to go up than down.');
    else if (ml.latestP > 0.35)
      line('  This is a MILDLY bearish probability — slightly more likely to go down than up.');
    else
      line('  This is a notably STRONG bearish probability.');
  }

  // Footer
  line('');
  line(sep('='));
  line('  Generated by QuantStock — Educational use only.');
  line('  Not financial advice. Consult a SEBI-registered advisor.');
  line(sep('='));

  return lines.join('\n');
}

export function downloadReport(data) {
  const text = generateReportText(data);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (data.symbol || 'report').replace(/[^a-z0-9]/gi, '_');
  a.href = url;
  a.download = `QuantStock_${safeName}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
