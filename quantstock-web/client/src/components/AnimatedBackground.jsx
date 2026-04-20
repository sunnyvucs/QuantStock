import React, { useMemo } from 'react';

const CURRENCIES = ['₹', '$', '€', '£', '¥', '₿', '₩', '₣'];

// Deterministic pseudo-random from seed
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function CurrencyFloat({ symbol, style }) {
  return (
    <span className="bg-currency" style={style}>
      {symbol}
    </span>
  );
}

function MiniChart({ x, y, width, height, seed }) {
  const rand = useMemo(() => rng(seed), [seed]);
  const points = useMemo(() => {
    const pts = [];
    let v = 50 + (rand() - 0.5) * 30;
    for (let i = 0; i <= 20; i++) {
      v = Math.max(10, Math.min(90, v + (rand() - 0.48) * 12));
      pts.push({ x: (i / 20) * width, y: (v / 100) * height });
    }
    return pts;
  }, [seed, width, height]);

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${points.map(p => `${p.x},${p.y}`).join(' ')} ${width},${height} 0,${height}`;
  const lastY = points[points.length - 1].y;
  const firstY = points[0].y;
  const bullish = lastY < firstY;
  const color = bullish ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)';
  const fillColor = bullish ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)';

  return (
    <g transform={`translate(${x},${y})`} className="bg-minichart">
      <polygon points={area} fill={fillColor} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

function Candlesticks({ x, y, width, height, seed }) {
  const rand = useMemo(() => rng(seed + 999), [seed]);
  const candles = useMemo(() => {
    const arr = [];
    const count = 10;
    const cw = Math.floor(width / count) - 3;
    let price = 50;
    for (let i = 0; i < count; i++) {
      const open = price;
      price = Math.max(10, Math.min(90, price + (rand() - 0.48) * 15));
      const close = price;
      const high = Math.max(open, close) + rand() * 8;
      const low = Math.min(open, close) - rand() * 8;
      arr.push({ open, close, high, low, x: i * (cw + 3) });
    }
    return arr;
  }, [seed, width]);

  const scale = v => (v / 100) * height;

  return (
    <g transform={`translate(${x},${y})`} className="bg-candlesticks">
      {candles.map((c, i) => {
        const bullish = c.close <= c.open;
        const color = bullish ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)';
        const bodyTop = scale(Math.min(c.open, c.close));
        const bodyH = Math.max(1, Math.abs(scale(c.open) - scale(c.close)));
        const cw = Math.floor(width / 10) - 3;
        return (
          <g key={i}>
            <line
              x1={c.x + cw / 2} y1={scale(c.high)}
              x2={c.x + cw / 2} y2={scale(c.low)}
              stroke={color} strokeWidth="1"
            />
            <rect
              x={c.x} y={bodyTop}
              width={cw} height={bodyH}
              fill={color} rx="1"
            />
          </g>
        );
      })}
    </g>
  );
}

export default function AnimatedBackground() {
  const currencies = useMemo(() => {
    const rand = rng(42);
    return Array.from({ length: 14 }, (_, i) => ({
      symbol: CURRENCIES[i % CURRENCIES.length],
      left: `${5 + rand() * 90}%`,
      top: `${rand() * 100}%`,
      fontSize: `${14 + rand() * 22}px`,
      dur: `${18 + rand() * 24}s`,
      delay: `${-rand() * 20}s`,
      opacity: 0.06 + rand() * 0.1,
    }));
  }, []);

  const charts = useMemo(() => {
    const rand = rng(77);
    return Array.from({ length: 5 }, (_, i) => ({
      left: `${5 + rand() * 75}%`,
      top: `${10 + rand() * 65}%`,
      width: 120 + rand() * 100,
      height: 50 + rand() * 40,
      seed: i * 137,
      type: i % 2 === 0 ? 'line' : 'candle',
      dur: `${20 + rand() * 15}s`,
      delay: `${-rand() * 15}s`,
      opacity: 0.12 + rand() * 0.1,
    }));
  }, []);

  return (
    <div className="bg-orbs" aria-hidden="true">
      {/* Grid */}
      <div className="bg-orbs__grid" />

      {/* Orbs */}
      <div className="bg-orbs__orb bg-orbs__orb--1" />
      <div className="bg-orbs__orb bg-orbs__orb--2" />
      <div className="bg-orbs__orb bg-orbs__orb--3" />
      <div className="bg-orbs__orb bg-orbs__orb--4" />

      {/* Floating currency symbols */}
      {currencies.map((c, i) => (
        <CurrencyFloat key={i} symbol={c.symbol} style={{
          position: 'absolute',
          left: c.left,
          top: c.top,
          fontSize: c.fontSize,
          opacity: c.opacity,
          color: '#818cf8',
          fontWeight: 700,
          animation: `currencyFloat ${c.dur} ease-in-out infinite alternate`,
          animationDelay: c.delay,
          userSelect: 'none',
          lineHeight: 1,
        }} />
      ))}

      {/* Positioned mini charts */}
      {charts.map((ch, i) => (
        <svg
          key={`chart-${i}`}
          style={{
            position: 'absolute',
            left: ch.left,
            top: ch.top,
            width: ch.width,
            height: ch.height,
            opacity: ch.opacity,
            animation: `chartPulse ${ch.dur} ease-in-out infinite alternate`,
            animationDelay: ch.delay,
            overflow: 'visible',
          }}
          viewBox={`0 0 ${ch.width} ${ch.height}`}
          preserveAspectRatio="none"
        >
          {ch.type === 'line'
            ? <MiniChart x={0} y={0} width={ch.width} height={ch.height} seed={ch.seed} />
            : <Candlesticks x={0} y={0} width={ch.width} height={ch.height} seed={ch.seed} />
          }
        </svg>
      ))}
    </div>
  );
}
