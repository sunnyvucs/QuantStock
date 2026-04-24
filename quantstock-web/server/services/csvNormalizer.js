const COLUMN_ALIASES = {
  date: ['date', 'datetime', 'time', 'timestamp', 'day', 'dt', 'trade_date', 'tradedate'],
  open: ['open', 'openprice', 'open_price', 'o', 'opening'],
  high: ['high', 'highprice', 'high_price', 'h', 'highest', 'dayhigh', 'day_high'],
  low: ['low', 'lowprice', 'low_price', 'l', 'lowest', 'daylow', 'day_low'],
  close: ['close', 'closeprice', 'close_price', 'c', 'closing', 'last', 'ltp', 'lastprice', 'last_price'],
  volume: ['volume', 'vol', 'v', 'qty', 'quantity', 'shares', 'tradedvolume', 'traded_volume', 'trdvol', 'trd_vol'],
};

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function buildAliasMap() {
  const aliasMap = new Map();
  for (const [standard, aliases] of Object.entries(COLUMN_ALIASES)) {
    aliasMap.set(normalizeKey(standard), standard);
    for (const alias of aliases) {
      aliasMap.set(normalizeKey(alias), standard);
    }
  }
  return aliasMap;
}

const ALIAS_MAP = buildAliasMap();

function mapRecord(record) {
  const mapped = {};

  for (const [key, value] of Object.entries(record)) {
    const normalized = ALIAS_MAP.get(normalizeKey(key));
    if (!normalized || mapped[normalized] != null) continue;
    mapped[normalized] = value;
  }

  if (mapped.date == null) {
    const firstKey = Object.keys(record)[0];
    if (firstKey) {
      mapped.date = record[firstKey];
    }
  }

  return mapped;
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCsvRecord(record) {
  const row = mapRecord(record);
  return {
    date: row.date ?? '',
    open: toNumber(row.open),
    high: toNumber(row.high),
    low: toNumber(row.low),
    close: toNumber(row.close),
    volume: toNumber(row.volume),
  };
}

export function parseCsvBars(records) {
  return records
    .map(normalizeCsvRecord)
    .filter(bar =>
      bar.open != null &&
      bar.high != null &&
      bar.low != null &&
      bar.close != null &&
      bar.volume != null &&
      bar.close > 0
    );
}
