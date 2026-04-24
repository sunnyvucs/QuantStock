import axios from 'axios';

const BASE = '/api';

const client = axios.create({
  baseURL: BASE,
  timeout: 120000,
});

export async function searchStocks(query) {
  const res = await client.get('/search', { params: { q: query } });
  return res.data;
}

/** Phase 1: fast analysis without ML. Returns immediately (<2s). */
export async function analyseSymbolFast(symbol, params) {
  const res = await client.post('/analyse/fast', { symbol, ...params });
  return res.data;
}

/**
 * Phase 2: ML-only SSE stream.
 * Calls onStatus(message) while running, onResult(mlData) on success, onError(msg) on failure.
 * Returns a cancel function.
 */
export function streamML(symbol, params, { onStatus, onResult, onError, onDone }) {
  const url = `${BASE}/analyse/ml`;

  // SSE via fetch (POST body not supported by EventSource — use ReadableStream)
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, ...params }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      onError?.(`ML API error ${res.status}: ${text}`);
      onDone?.();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop(); // keep incomplete last chunk

      for (const part of parts) {
        const lines = part.trim().split('\n');
        let eventName = 'message';
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) eventName = line.slice(7);
          if (line.startsWith('data: ')) dataLine = line.slice(6);
        }
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine);
          if (eventName === 'status') onStatus?.(payload.message);
          else if (eventName === 'result') onResult?.(payload);
          else if (eventName === 'error') onError?.(payload.message);
          else if (eventName === 'done') onDone?.();
        } catch { /* ignore malformed chunk */ }
      }
    }
    onDone?.();
  }).catch((err) => {
    if (err.name !== 'AbortError') onError?.(err.message);
    onDone?.();
  });

  return () => controller.abort();
}

/** Legacy full analysis (used by CSV path and re-analyse). */
export async function analyseSymbol(symbol, params) {
  const res = await client.post('/analyse', { symbol, ...params });
  return res.data;
}

export async function analyseCsv(file, params) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
  const res = await client.post('/analyse-csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
