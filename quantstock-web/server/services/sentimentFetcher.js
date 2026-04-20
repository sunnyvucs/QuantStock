import https from 'https';
import http from 'http';

// Finance-domain sentiment lexicon
const BULLISH = [
  'surge', 'surges', 'surged', 'rally', 'rallies', 'rallied', 'gain', 'gains', 'gained',
  'rise', 'rises', 'rose', 'jump', 'jumps', 'jumped', 'soar', 'soars', 'soared',
  'boom', 'booms', 'boomed', 'record', 'high', 'upgrade', 'upgraded', 'outperform',
  'beat', 'beats', 'beats', 'profit', 'profits', 'revenue', 'growth', 'grows', 'grew',
  'strong', 'strength', 'positive', 'optimistic', 'bullish', 'buy', 'overweight',
  'dividend', 'buyback', 'expansion', 'recovery', 'recovers', 'breakout', 'upside',
  'milestone', 'partnership', 'deal', 'contract', 'win', 'wins', 'order', 'orders',
  'double', 'triple', 'outpace', 'accelerate', 'boost', 'boosts',
];

const BEARISH = [
  'fall', 'falls', 'fell', 'drop', 'drops', 'dropped', 'decline', 'declines', 'declined',
  'slump', 'slumps', 'slumped', 'plunge', 'plunges', 'plunged', 'sink', 'sinks', 'sank',
  'crash', 'crashes', 'crashed', 'tumble', 'tumbles', 'tumbled', 'loss', 'losses',
  'debt', 'default', 'downgrade', 'downgraded', 'underperform', 'sell', 'underweight',
  'miss', 'misses', 'missed', 'weak', 'weakness', 'negative', 'bearish', 'warning',
  'concern', 'concerns', 'risk', 'risks', 'lawsuit', 'fraud', 'investigation', 'probe',
  'fine', 'penalty', 'recall', 'scandal', 'layoff', 'layoffs', 'cut', 'cuts',
  'slowdown', 'contraction', 'below', 'disappoint', 'disappoints', 'disappointing',
];

const BULLISH_SET = new Set(BULLISH);
const BEARISH_SET = new Set(BEARISH);

function scoreText(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
  let bull = 0, bear = 0;
  for (const w of words) {
    if (BULLISH_SET.has(w)) bull++;
    if (BEARISH_SET.has(w)) bear++;
  }
  const total = bull + bear;
  if (total === 0) return 0;
  // Returns -1 (very bearish) to +1 (very bullish)
  return parseFloat(((bull - bear) / total).toFixed(3));
}

function labelScore(score) {
  if (score >= 0.5) return { label: 'Very Bullish', color: '#22c55e' };
  if (score >= 0.15) return { label: 'Bullish', color: '#86efac' };
  if (score > -0.15) return { label: 'Neutral', color: '#94a3b8' };
  if (score > -0.5) return { label: 'Bearish', color: '#f87171' };
  return { label: 'Very Bearish', color: '#dc2626' };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) || /<title>(.*?)<\/title>/.exec(block) || [])[1] || '';
    const link = (/<link>(.*?)<\/link>/.exec(block) || [])[1] || '';
    const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block) || [])[1] || '';
    const cleanTitle = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    if (cleanTitle) items.push({ title: cleanTitle, link, pubDate });
  }
  return items;
}

function extractCompanyName(symbol) {
  // Strip exchange suffix (.NS, .BO) for search
  return symbol.replace(/\.(NS|BO|BSE|NSE)$/i, '').replace(/-EQ$/i, '');
}

export async function fetchSentiment(symbol) {
  const query = encodeURIComponent(`${extractCompanyName(symbol)} stock India`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

  let xml;
  try {
    xml = await fetchUrl(rssUrl);
  } catch (e) {
    throw new Error(`Failed to fetch news: ${e.message}`);
  }

  const items = parseRSS(xml).slice(0, 20);

  if (items.length === 0) {
    return { symbol, headlines: [], overallScore: 0, overallLabel: 'Neutral', overallColor: '#94a3b8', fetchedAt: new Date().toISOString() };
  }

  const headlines = items.map(item => {
    const score = scoreText(item.title);
    const { label, color } = labelScore(score);
    return {
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      score,
      label,
      color,
    };
  });

  const overallScore = parseFloat((headlines.reduce((s, h) => s + h.score, 0) / headlines.length).toFixed(3));
  const { label: overallLabel, color: overallColor } = labelScore(overallScore);

  return {
    symbol,
    headlines,
    overallScore,
    overallLabel,
    overallColor,
    fetchedAt: new Date().toISOString(),
  };
}
