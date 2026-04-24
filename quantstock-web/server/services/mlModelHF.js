const HF_URL = process.env.HF_ML_URL || 'http://localhost:7860';
const TIMEOUT_MS = 120_000;

/**
 * Call the Hugging Face Space ML API.
 * Returns { models, ensemble, weights, modelsRun } or throws.
 */
export async function runHFModels(enrichedBars) {
  const bars = enrichedBars.map(b => ({
    ma20:       b.ma20       ?? 0,
    ma50:       b.ma50       ?? 0,
    ma200:      b.ma200      ?? 0,
    rsi:        b.rsi        ?? 50,
    macd:       b.macd       ?? 0,
    macdSignal: b.macdSignal ?? 0,
    macdHist:   b.macdHist   ?? 0,
    atr:        b.atr        ?? 0,
    ret1d:      b.ret1d      ?? 0,
    ret5d:      b.ret5d      ?? 0,
    ret1m:      b.ret1m      ?? 0,
    volume:     b.volume     ?? 0,
    turnover:   b.turnover   ?? 0,
    close:      b.close      ?? 0,
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${HF_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bars }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HF API ${res.status}: ${text}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function pingHF() {
  try {
    const res = await fetch(`${HF_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}
