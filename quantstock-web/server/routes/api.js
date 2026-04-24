import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

import { searchStocks, fetchHistory, fetchInfo } from '../services/stockFetcher.js';
import { parseCsvBars } from '../services/csvNormalizer.js';
import { computeIndicators } from '../services/indicators.js';
import { calcTradePlan } from '../services/tradePlan.js';
import { calcRange } from '../services/rangeLevels.js';
import { buildMarkov } from '../services/markov.js';
import { calcTrend } from '../services/trendScore.js';
import { finalDecision } from '../services/finalDecision.js';
import { cagrProjection } from '../services/cagrProjection.js';
import { trainAndEval } from '../services/mlModel.js';
import { runHFModels, pingHF } from '../services/mlModelHF.js';
import { fetchSentiment } from '../services/sentimentFetcher.js';
import { runAiAnalysis } from '../services/aiAnalysis.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Core analysis runner ────────────────────────────────────────────────────

async function runAnalysis(bars, symbol, params, fundamentals = null) {
  const { investment = 100000, targetPct = 10, slPct = 5, atrMult = 1.5, enableMl = false } = params;

  if (!bars || bars.length < 30) {
    throw new Error('Insufficient data — need at least 30 bars.');
  }

  const enriched = computeIndicators(bars);
  const lastBar = enriched[enriched.length - 1];
  const price = lastBar.close;

  const tradePlan = calcTradePlan(price, investment, targetPct, slPct);
  const rangeLevels = calcRange(lastBar, atrMult);
  const closes = enriched.map(b => b.close);
  const markov = buildMarkov(closes);
  const trend = calcTrend(lastBar);
  const cagrData = cagrProjection(closes, price, [1, 3, 6, 12, 36]);

  let ml = null;
  if (enableMl) {
    try {
      ml = await trainAndEval(enriched);
    } catch (e) {
      console.warn('ML failed:', e.message);
    }
  }

  const decision = finalDecision(
    trend.score,
    rangeLevels.bias,
    markov ? markov.bias : 'Neutral',
    ml ? ml.latestP : null
  );

  // ── Next-day forecast: synthesise Markov + Range signals ─────────────────
  const nextDayForecast = (() => {
    const expClose = markov?.expClose ?? null;
    const expRet   = markov?.expRet   ?? null;
    const bullP    = markov?.bullP    ?? null;
    const bearP    = markov?.bearP    ?? null;
    const expH     = rangeLevels?.expH ?? null;
    const expL     = rangeLevels?.expL ?? null;
    const pivot    = rangeLevels?.pivot ?? null;

    // Direction label from Markov expected return
    let direction = 'Unclear';
    if (expRet != null) {
      if (expRet > 0.15)       direction = 'Up';
      else if (expRet < -0.15) direction = 'Down';
      else                     direction = 'Flat';
    }

    // Agreement score: how many of the three signals agree on direction
    const signals = [];
    if (markov?.bias === 'Bullish') signals.push(1);
    else if (markov?.bias === 'Bearish') signals.push(-1);
    else signals.push(0);

    if (rangeLevels?.bias === 'Bullish') signals.push(1);
    else signals.push(-1);

    const bullCount = signals.filter(s => s === 1).length;
    const bearCount = signals.filter(s => s === -1).length;
    let confidence = 'Low';
    if (bullCount === signals.length || bearCount === signals.length) confidence = 'High';
    else if (bullCount > bearCount || bearCount > bullCount) confidence = 'Medium';

    return {
      expClose: expClose != null ? +expClose.toFixed(2) : null,
      expRet:   expRet   != null ? +expRet.toFixed(3)   : null,
      direction,
      bullP:    bullP    != null ? +bullP.toFixed(3)     : null,
      bearP:    bearP    != null ? +bearP.toFixed(3)     : null,
      expH:     expH     != null ? +expH.toFixed(2)      : null,
      expL:     expL     != null ? +expL.toFixed(2)      : null,
      pivot:    pivot    != null ? +pivot.toFixed(2)     : null,
      confidence,
      markovState:  markov?.current    ?? null,
      markovBias:   markov?.bias       ?? null,
      rangeBias:    rangeLevels?.bias  ?? null,
    };
  })();

  const history = enriched.map(b => ({
    date: b.date,
    open: +b.open.toFixed(2),
    high: +b.high.toFixed(2),
    low: +b.low.toFixed(2),
    close: +b.close.toFixed(2),
    volume: b.volume,
    ma20: b.ma20 != null ? +b.ma20.toFixed(2) : null,
    ma50: b.ma50 != null ? +b.ma50.toFixed(2) : null,
    ma200: b.ma200 != null ? +b.ma200.toFixed(2) : null,
    rsi: b.rsi != null ? +b.rsi.toFixed(2) : null,
    macd: b.macd != null ? +b.macd.toFixed(4) : null,
    macdSignal: b.macdSignal != null ? +b.macdSignal.toFixed(4) : null,
    macdHist: b.macdHist != null ? +b.macdHist.toFixed(4) : null,
    atr: b.atr != null ? +b.atr.toFixed(2) : null,
    ret1d: b.ret1d != null ? +b.ret1d.toFixed(3) : null,
    ret5d: b.ret5d != null ? +b.ret5d.toFixed(3) : null,
    ret1m: b.ret1m != null ? +b.ret1m.toFixed(3) : null,
    ret3m: b.ret3m != null ? +b.ret3m.toFixed(3) : null,
    ret6m: b.ret6m != null ? +b.ret6m.toFixed(3) : null,
    turnover: b.turnover != null ? +b.turnover.toFixed(0) : null,
  }));

  const name = fundamentals?.name || symbol;

  return {
    name: `${name} (${symbol})`,
    symbol,
    price,
    lastBar: {
      ...lastBar,
      open: +lastBar.open.toFixed(2),
      high: +lastBar.high.toFixed(2),
      low: +lastBar.low.toFixed(2),
      close: +lastBar.close.toFixed(2),
    },
    history,
    tradePlan,
    rangeLevels,
    markov,
    trend,
    ml,
    decision,
    fundamentals,
    cagrData,
    nextDayForecast,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) return res.json([]);
  try {
    const results = await searchStocks(q.trim());
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyse', async (req, res) => {
  const { symbol, investment, targetPct, slPct, atrMult, enableMl } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  try {
    const [bars, fundamentals] = await Promise.all([
      fetchHistory(symbol),
      fetchInfo(symbol),
    ]);

    const result = await runAnalysis(bars, symbol, {
      investment: Number(investment) || 100000,
      targetPct: Number(targetPct) || 10,
      slPct: Number(slPct) || 5,
      atrMult: Number(atrMult) || 1.5,
      enableMl: enableMl === true || enableMl === 'true',
    }, fundamentals);

    res.json(result);
  } catch (err) {
    console.error('/api/analyse error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyse-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  const { investment, targetPct, slPct, atrMult, enableMl } = req.body;

  try {
    const text = req.file.buffer.toString('utf8');
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const bars = parseCsvBars(records);

    if (bars.length < 30) {
      return res.status(400).json({ error: 'CSV needs at least 30 valid rows' });
    }

    const result = await runAnalysis(bars, 'CSV_UPLOAD', {
      investment: Number(investment) || 100000,
      targetPct: Number(targetPct) || 10,
      slPct: Number(slPct) || 5,
      atrMult: Number(atrMult) || 1.5,
      enableMl: enableMl === 'true',
    });

    res.json(result);
  } catch (err) {
    console.error('/api/analyse-csv error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Fast analyse (no ML — returns immediately) ──────────────────────────────
router.post('/analyse/fast', async (req, res) => {
  const { symbol, investment, targetPct, slPct, atrMult } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const [bars, fundamentals] = await Promise.all([
      fetchHistory(symbol),
      fetchInfo(symbol),
    ]);
    const result = await runAnalysis(bars, symbol, {
      investment: Number(investment) || 100000,
      targetPct: Number(targetPct) || 10,
      slPct: Number(slPct) || 5,
      atrMult: Number(atrMult) || 1.5,
      enableMl: false,
    }, fundamentals);
    // Attach enriched bars so client can request ML separately
    result._symbol = symbol;
    res.json(result);
  } catch (err) {
    console.error('/api/analyse/fast error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ML-only SSE stream ───────────────────────────────────────────────────────
// Client sends the same bars array received from /analyse/fast
router.post('/analyse/ml', async (req, res) => {
  const { symbol, enableMl } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  if (!(enableMl === true || enableMl === 'true')) {
    return res.status(400).json({ error: 'ML analysis is disabled for this request' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send('status', { message: 'Fetching price history…' });
    const bars = await fetchHistory(symbol);
    const enriched = computeIndicators(bars);

    send('status', { message: 'Running ML models (RF · XGBoost · LR · LSTM)…' });
    try {
      const hfResult = await runHFModels(enriched);

      send('result', {
        ensemble:        hfResult.ensemble,
        ensembleMetrics: hfResult.ensembleMetrics,
        models:          hfResult.models,
        modelMetrics:    hfResult.modelMetrics,
        weights:         hfResult.weights,
        modelsRun:       hfResult.modelsRun,
        trainN:          hfResult.trainN,
        testN:           hfResult.testN,
      });
    } catch (hfErr) {
      console.warn('HF ML unavailable, falling back to built-in server model:', hfErr.message);
      send('status', { message: 'External ensemble unavailable. Falling back to built-in server model...' });

      const localMl = await trainAndEval(enriched);
      if (!localMl) {
        throw new Error('Built-in server model could not train on the available data');
      }

      send('result', {
        name: localMl.name,
        latestP: localMl.latestP,
        acc: localMl.acc,
        prec: localMl.prec,
        rec: localMl.rec,
        confMatrix: localMl.confMatrix,
        featureImportances: localMl.featureImportances,
        trainN: localMl.trainN,
        testN: localMl.testN,
        modelsRun: [localMl.name],
      });
    }
  } catch (err) {
    send('error', { message: err.message || 'ML analysis failed' });
  } finally {
    res.write('event: done\ndata: {}\n\n');
    res.end();
  }
});

// ─── HF ping ─────────────────────────────────────────────────────────────────
router.get('/hf-ping', async (req, res) => {
  const ok = await pingHF();
  res.json({ available: ok });
});

// ─── AI Chat proxy (Ollama only — other providers called direct from browser) ──
router.post('/ai-chat', async (req, res) => {
  const { provider, model, messages } = req.body;
  if (provider !== 'ollama') return res.status(400).json({ error: 'Only ollama provider uses server proxy' });
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = model || process.env.OLLAMA_MODEL || 'qwen3:4b';

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel, messages, stream: false, options: { temperature: 0.4, num_predict: 2000 } }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(502).json({ error: `Ollama error ${response.status}: ${text}` });
    }

    const data = await response.json();
    const raw = data.message?.content || data.message?.thinking || data.response || '';
    const content = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (!content) return res.status(502).json({ error: 'Empty response from model' });
    res.json({ content });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Ollama unreachable' });
  }
});

router.get('/ai-ping', async (req, res) => {
  try {
    await runAiAnalysis({ _ping: true }, null);
    res.json({ available: true });
  } catch {
    res.status(503).json({ available: false });
  }
});

router.post('/ai-analyse', async (req, res) => {
  const { analysisData, sentiment } = req.body;
  if (!analysisData) return res.status(400).json({ error: 'analysisData is required' });
  try {
    const verdict = await runAiAnalysis(analysisData, sentiment || null);
    res.json({ verdict });
  } catch (err) {
    console.error('/api/ai-analyse error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/sentiment', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const result = await fetchSentiment(symbol.trim());
    res.json(result);
  } catch (err) {
    console.error('/api/sentiment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
