import axios from 'axios';

const BASE = '/api';

const client = axios.create({
  baseURL: BASE,
  timeout: 120000,
});

/**
 * Search for Indian stocks.
 * @param {string} query
 * @returns {Promise<Array<{symbol, name, exchange}>>}
 */
export async function searchStocks(query) {
  const res = await client.get('/search', { params: { q: query } });
  return res.data;
}

/**
 * Run full analysis for a symbol.
 * @param {string} symbol
 * @param {object} params — investment, targetPct, slPct, atrMult, enableMl
 * @returns {Promise<object>} Full analysis JSON
 */
export async function analyseSymbol(symbol, params) {
  const res = await client.post('/analyse', { symbol, ...params });
  return res.data;
}

/**
 * Analyse a CSV file upload.
 * @param {File} file
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function analyseCsv(file, params) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
  const res = await client.post('/analyse-csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
