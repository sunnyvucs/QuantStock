import http from 'http';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';

function buildMessages(analysis, sentiment) {
  const { name, symbol, price, lastBar, decision, trend, markov, rangeLevels: rl, tradePlan: tp, ml, fundamentals } = analysis;
  const fmt = (v, d = 2) => (v == null ? 'N/A' : Number(v).toFixed(d));

  const bullish = sentiment?.headlines.filter(h => h.score > 0.14).length ?? 0;
  const bearish = sentiment?.headlines.filter(h => h.score < -0.14).length ?? 0;
  const neutral = sentiment?.headlines.filter(h => h.score >= -0.14 && h.score <= 0.14).length ?? 0;
  const topHeadlines = sentiment?.headlines.slice(0, 5).map(h => `  • [${h.label}] ${h.title}`).join('\n') || '  None available';

  const rsiNote = lastBar?.rsi >= 70 ? 'OVERBOUGHT — may pull back soon'
    : lastBar?.rsi <= 30 ? 'OVERSOLD — may bounce'
    : 'Normal range — no extreme pressure';

  const macdNote = lastBar?.macd > lastBar?.macdSignal
    ? 'Bullish crossover (short-term momentum is positive)'
    : 'Bearish crossover (short-term momentum is fading)';

  const maNote = [
    price > lastBar?.ma20  ? 'above MA20 (short-term uptrend)'  : 'below MA20 (short-term weakness)',
    price > lastBar?.ma50  ? 'above MA50 (medium-term uptrend)'  : 'below MA50 (medium-term weakness)',
    price > lastBar?.ma200 ? 'above MA200 (long-term uptrend)' : 'below MA200 (long-term downtrend)',
  ].join(', ');

  const trendConditions = trend?.reasons?.join(' | ') || 'N/A';

  const systemPrompt = `You are a sharp, experienced Indian stock market analyst writing for retail investors who are NOT finance experts. Your job is to interpret the quantitative data provided and deliver a clear, specific, opinionated but balanced verdict. Be direct — do not be vague or generic. Reference actual numbers. Use plain conversational English.

Format your response with exactly these 5 bold headings (one short paragraph each):

**Overall Verdict**
**What the Technicals Say**
**What the News Says**
**Key Risks to Watch**
**Practical Takeaway**

End with exactly this line: "⚠️ This analysis is for educational purposes only and does not constitute financial advice."`;

  const markovBullPct = markov?.bullP != null ? fmt(markov.bullP * 100, 1) : 'N/A';

  const userPrompt = `Analyse this Indian stock for me:

STOCK: ${name} (${symbol})
Current Price: Rs.${fmt(price)}

TECHNICAL SIGNALS:
- Composite Score: ${fmt(decision?.score, 1)}/100 → ${decision?.label}
- Trend: ${trend?.score}/5 conditions bullish (${trendConditions})
- RSI: ${fmt(lastBar?.rsi)} — ${rsiNote}
- MACD: ${macdNote}
- Moving Averages: Price is ${maNote}
- Pivot Bias: ${rl?.bias} (price is ${fmt(Math.abs(rl?.pivotPct))}% ${rl?.pivotPct >= 0 ? 'above' : 'below'} pivot point)
- Markov Model: ${markovBullPct}% historical probability of a bullish next session → ${markov?.bias}
${ml ? `- ML Ensemble (RF+XGBoost+LR+LSTM): ${fmt(ml.latestP * 100, 1)}% UP probability → ${ml.latestP > 0.5 ? 'Bullish' : 'Bearish'}
  Ensemble Accuracy: ${ml.acc != null ? fmt(ml.acc * 100, 1) + '%' : 'N/A'} | Precision: ${ml.prec != null ? fmt(ml.prec * 100, 1) + '%' : 'N/A'} | Recall: ${ml.rec != null ? fmt(ml.rec * 100, 1) + '%' : 'N/A'}
  Per-model: ${ml.models ? Object.entries(ml.models).map(([k, v]) => `${k.toUpperCase()} ${fmt(v * 100, 1)}%`).join(' | ') : 'N/A'}` : '- ML Ensemble: Not run yet'}

TRADE PLAN:
- Target Price: Rs.${fmt(tp?.targetPrice)} (+${fmt((tp?.targetPrice - price) / price * 100)}% upside → profit Rs.${fmt(tp?.profit, 0)})
- Stop-Loss: Rs.${fmt(tp?.slPrice)} (-${fmt((price - tp?.slPrice) / price * 100)}% downside → max loss Rs.${fmt(tp?.risk, 0)})
- Risk/Reward Ratio: ${fmt(tp?.rr)}:1 ${Number(fmt(tp?.rr)) >= 2 ? '(excellent)' : Number(fmt(tp?.rr)) >= 1.5 ? '(good)' : '(tight — be careful)'}

FUNDAMENTALS:
${fundamentals
  ? `P/E Ratio: ${fmt(fundamentals.pe, 1)} | ROE: ${fundamentals.roe != null ? fmt(fundamentals.roe * 100, 1) + '%' : 'N/A'} | Debt/Equity: ${fmt(fundamentals.debtToEquity)}`
  : 'Not available (CSV upload)'}

NEWS SENTIMENT (${sentiment ? sentiment.headlines.length + ' headlines analysed' : 'not available'}):
Overall: ${sentiment?.overallLabel ?? 'N/A'} (score: ${sentiment?.overallScore ?? 'N/A'})
Breakdown: ${bullish} bullish | ${neutral} neutral | ${bearish} bearish
Recent headlines:
${topHeadlines}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export async function runAiAnalysis(analysis, sentiment) {
  const isPing = analysis?._ping === true;

  const messages = isPing
    ? [{ role: 'user', content: 'Reply with just: OK' }]
    : buildMessages(analysis, sentiment);

  const body = JSON.stringify({
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.4, num_predict: 2000 },
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
          // Some models (kimi, qwen3 thinking) put the answer in `thinking` when content is empty
          const raw = json.message?.content || json.message?.thinking || json.response || '';
          const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          if (!clean) reject(new Error('Empty response from model'));
          else resolve(clean);
        } catch {
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
