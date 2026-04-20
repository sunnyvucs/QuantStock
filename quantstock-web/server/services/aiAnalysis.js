import http from 'http';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';

function buildPrompt(analysis, sentiment) {
  const { name, symbol, price, lastBar, decision, trend, markov, rangeLevels: rl, tradePlan: tp, ml, fundamentals } = analysis;

  const fmt = (v, d = 2) => (v == null ? 'N/A' : Number(v).toFixed(d));

  const sentimentSummary = sentiment
    ? [
        `Overall Sentiment: ${sentiment.overallLabel} (score ${sentiment.overallScore})`,
        `Headlines analysed: ${sentiment.headlines.length}`,
        `Bullish: ${sentiment.headlines.filter(h => h.score > 0.14).length}, Neutral: ${sentiment.headlines.filter(h => h.score >= -0.14 && h.score <= 0.14).length}, Bearish: ${sentiment.headlines.filter(h => h.score < -0.14).length}`,
        'Top headlines:',
        ...sentiment.headlines.slice(0, 5).map(h => `  - [${h.label}] ${h.title}`),
      ].join('\n')
    : 'Sentiment data not available.';

  const trendReasons = trend?.reasons?.join(', ') || 'N/A';

  return `You are a financial analysis assistant helping Indian retail investors understand a stock analysis report. Write clearly and simply — assume the reader knows nothing about finance. Avoid jargon. Be direct and honest. Do NOT give specific buy/sell advice — frame everything as educational analysis.

## Stock: ${name} (${symbol})
Current Price: Rs. ${fmt(price)}

## Technical Signal Summary
Composite Score: ${fmt(decision?.score, 1)}/100 — ${decision?.label}
Trend Score: ${trend?.score}/5 (${trendReasons})
Range Bias: ${rl?.bias} (price is ${rl?.pivotPct >= 0 ? 'above' : 'below'} pivot by ${fmt(Math.abs(rl?.pivotPct))}%)
Markov Prediction: ${markov?.bias} (${fmt(markov?.upProb * 100, 1)}% probability of up next session)
RSI: ${fmt(lastBar?.rsi)} ${lastBar?.rsi >= 70 ? '(Overbought)' : lastBar?.rsi <= 30 ? '(Oversold)' : '(Normal range)'}
MACD: ${lastBar?.macd > lastBar?.macdSignal ? 'Bullish crossover' : 'Bearish crossover'}
Price vs MA20: ${price > lastBar?.ma20 ? 'Above (bullish)' : 'Below (bearish)'}
Price vs MA50: ${price > lastBar?.ma50 ? 'Above (bullish)' : 'Below (bearish)'}
Price vs MA200: ${price > lastBar?.ma200 ? 'Above (bullish)' : 'Below (bearish)'}
${ml ? `ML Model (Random Forest): ${fmt(ml.latestP * 100, 1)}% probability of up session` : 'ML Model: Not run'}

## Trade Plan
Investment: Rs. ${fmt((tp?.invested || 0) + (tp?.cashLeft || 0), 0)}
Target Price: Rs. ${fmt(tp?.targetPrice)} (${fmt((tp?.targetPrice - price) / price * 100)}% upside)
Stop-Loss: Rs. ${fmt(tp?.slPrice)} (${fmt((price - tp?.slPrice) / price * 100)}% downside)
Risk/Reward Ratio: ${fmt(tp?.rr)}:1

## Fundamentals
${fundamentals ? `P/E: ${fmt(fundamentals.pe, 1)}, ROE: ${fundamentals.roe != null ? fmt(fundamentals.roe * 100, 1) + '%' : 'N/A'}, Debt/Equity: ${fmt(fundamentals.debtToEquity)}` : 'Not available (CSV upload)'}

## News Sentiment
${sentimentSummary}

---

Please provide a concise analysis (4-6 sentences) covering:
1. What the technical signals collectively suggest about this stock's near-term direction
2. Whether the news sentiment supports or contradicts the technical picture
3. Key risks or caution flags an investor should be aware of
4. One practical takeaway for someone considering this stock

Keep the tone calm, balanced, and educational. End with a reminder that this is not financial advice.`;
}

export async function runAiAnalysis(analysis, sentiment) {
  const isPing = analysis?._ping === true;
  const prompt = isPing ? 'Reply with just: OK' : buildPrompt(analysis, sentiment);

  const body = JSON.stringify({
    model: OLLAMA_MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    options: { temperature: 0.3, num_predict: 400 },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${OLLAMA_URL}/api/chat`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.message?.content || json.response || '';
          // Strip Qwen3 <think>...</think> reasoning block if present
          const clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          resolve(clean);
        } catch (e) {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama request timed out')); });
    req.write(body);
    req.end();
  });
}
