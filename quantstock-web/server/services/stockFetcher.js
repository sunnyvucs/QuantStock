import https from 'https';

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
 * Fetch fundamental info via NSE public API + Tickertape.
 * Returns: { name, marketCapCr (Crores), pe, roe, debtToEquity, currency }
 */
export async function fetchInfo(symbol) {
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
