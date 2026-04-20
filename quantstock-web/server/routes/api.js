import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

import { searchStocks, fetchHistory, fetchInfo } from '../services/stockFetcher.js';
import { computeIndicators } from '../services/indicators.js';
import { calcTradePlan } from '../services/tradePlan.js';
import { calcRange } from '../services/rangeLevels.js';
import { buildMarkov } from '../services/markov.js';
import { calcTrend } from '../services/trendScore.js';
import { finalDecision } from '../services/finalDecision.js';
import { cagrProjection } from '../services/cagrProjection.js';
import { trainAndEval } from '../services/mlModel.js';
import { fetchSentiment } from '../services/sentimentFetcher.js';

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

    const bars = records.map(r => {
      const row = Object.keys(r).reduce((acc, key) => {
        acc[key.toLowerCase()] = r[key];
        return acc;
      }, {});
      return {
        date: row.date || row.datetime || '',
        open: parseFloat(row.open) || 0,
        high: parseFloat(row.high) || 0,
        low: parseFloat(row.low) || 0,
        close: parseFloat(row.close) || 0,
        volume: parseFloat(row.volume) || 0,
      };
    }).filter(b => b.close > 0);

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
