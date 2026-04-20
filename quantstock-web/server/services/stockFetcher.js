import https from 'https';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'fetch_fundamentals.py');

// Try the venv python first, fall back to system python
const PYTHON_BIN = 'python';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { ...HEADERS, ...extraHeaders } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

/**
 * Search for stocks using Yahoo Finance autocomplete API.
 */
export async function searchStocks(query) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
    const data = await httpsGet(url);
    const quotes = data?.finance?.result?.[0]?.quotes || data?.quotes || [];
    return quotes
      .filter(q => q.symbol)
      .slice(0, 10)
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        quoteType: q.quoteType || '',
      }));
  } catch (err) {
    console.error('searchStocks error:', err.message);
    return [];
  }
}

/**
 * Fetch 2-year daily OHLCV history using Yahoo Finance v8 chart API.
 */
export async function fetchHistory(symbol) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 2 * 365 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=history`;

  try {
    const data = await httpsGet(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data returned');

    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const opens = q.open || [];
    const highs = q.high || [];
    const lows = q.low || [];
    const closes = q.close || [];
    const volumes = q.volume || [];

    const rows = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null || opens[i] == null) continue;
      rows.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: opens[i],
        high: highs[i],
        low: lows[i],
        close: closes[i],
        volume: volumes[i] || 0,
      });
    }

    if (rows.length === 0) throw new Error('Empty OHLCV data');
    return rows;
  } catch (err) {
    console.error(`fetchHistory error for ${symbol}:`, err.message);
    throw new Error(`Failed to fetch history for ${symbol}: ${err.message}`);
  }
}

/**
 * Run the Python fetch_fundamentals.py script as a subprocess.
 * Uses yfinance (which handles Yahoo auth via curl_cffi) to get
 * marketCap, PE, ROE, and Debt/Equity.
 */
function fetchInfoViaPython(symbol) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(PYTHON_BIN, [PYTHON_SCRIPT, symbol], { timeout: 30000 });
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      const line = stdout.trim().split('\n').filter(l => l.startsWith('{')).pop();
      if (!line) return reject(new Error(`Python script failed (code ${code}): ${stderr.slice(0, 200)}`));
      try { resolve(JSON.parse(line)); }
      catch (e) { reject(new Error('JSON parse error: ' + line.slice(0, 100))); }
    });
    proc.on('error', reject);
  });
}

/**
 * Fetch fundamental info via Python/yfinance subprocess.
 * Falls back to NSE public API if Python is unavailable.
 * Returns: { name, marketCapCr (Crores), pe, roe (decimal or null), debtToEquity (ratio or null), currency }
 */
export async function fetchInfo(symbol) {
  // Primary: Python/yfinance — handles Yahoo auth correctly
  try {
    const raw = await fetchInfoViaPython(symbol);
    if (raw.error) throw new Error(raw.error);
    return {
      name:         raw.name,
      marketCapCr:  raw.marketCap ? raw.marketCap / 1e7 : null,  // raw INR → Crores
      marketCap:    null,
      pe:           raw.pe           ?? null,
      roe:          raw.roe          ?? null,   // decimal e.g. 0.082
      debtToEquity: raw.debtToEquity ?? null,   // plain ratio e.g. 0.997
      currency:     raw.currency     || 'INR',
    };
  } catch (err) {
    console.warn('Python fetchInfo failed, falling back to NSE API:', err.message);
  }

  // Fallback: NSE + Tickertape (no ROE/DE)
  const nseSymbol = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
  const isIndian  = /\.(NS|BO)$/i.test(symbol);

  if (isIndian) {
    try {
      const [nseResult, ttResult] = await Promise.allSettled([
        httpsGet(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`, { Referer: 'https://www.nseindia.com/' }),
        httpsGet(`https://api.tickertape.in/search?text=${encodeURIComponent(nseSymbol)}&types=stock`),
      ]);
      const nse = nseResult.status === 'fulfilled' ? nseResult.value : null;
      const tt  = ttResult.status  === 'fulfilled' ? ttResult.value  : null;
      const ttStock = tt?.data?.stocks?.find(s => s.ticker === nseSymbol) ?? tt?.data?.stocks?.[0];
      let marketCapCr = ttStock?.marketCap ?? null;
      if (!marketCapCr) {
        const price = nse?.priceInfo?.lastPrice ?? null;
        const shares = nse?.securityInfo?.issuedSize ?? null;
        if (price && shares) marketCapCr = (price * shares) / 1e7;
      }
      return {
        name:         nse?.info?.companyName ?? nseSymbol,
        marketCapCr,
        marketCap:    null,
        pe:           nse?.metadata?.pdSymbolPe ?? null,
        roe:          null,
        debtToEquity: null,
        currency:     'INR',
      };
    } catch (e) {
      console.error('NSE fallback failed:', e.message);
    }
  }

  return null;
}
