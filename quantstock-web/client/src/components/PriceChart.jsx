import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const LINE_CONFIG = [
  { key: 'close',  color: '#f1f5f9', name: 'Price',  strokeWidth: 2, dot: false },
  { key: 'ma20',   color: '#6366f1', name: 'MA 20',  strokeWidth: 1.5, dot: false, strokeDasharray: undefined },
  { key: 'ma50',   color: '#fbbf24', name: 'MA 50',  strokeWidth: 1.5, dot: false },
  { key: 'ma200',  color: '#f87171', name: 'MA 200', strokeWidth: 1.5, dot: false },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 600 }}>
            {p.value != null ? `₹${Number(p.value).toFixed(2)}` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// Thin the data for chart performance
function thinData(data, maxPoints = 300) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export default function PriceChart({ history }) {
  const [activeLines, setActiveLines] = useState({
    close: true, ma20: true, ma50: true, ma200: true,
  });

  if (!history || history.length === 0) return null;

  const chartData = thinData(history, 300);

  // Compute Y domain with some padding
  const closes = chartData.filter(d => d.close).map(d => d.close);
  const yMin = Math.min(...closes) * 0.97;
  const yMax = Math.max(...closes) * 1.03;

  const toggleLine = (key) => {
    setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Price Chart (2Y)
        </h3>
        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LINE_CONFIG.map(l => (
            <button
              key={l.key}
              onClick={() => toggleLine(l.key)}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${activeLines[l.key] ? l.color : 'var(--border)'}`,
                background: activeLines[l.key] ? `${l.color}20` : 'transparent',
                color: activeLines[l.key] ? l.color : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={d => d ? d.slice(2, 7) : ''}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
            width={54}
          />
          <Tooltip content={<CustomTooltip />} />
          {LINE_CONFIG.map(l =>
            activeLines[l.key] ? (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={l.strokeWidth}
                dot={false}
                name={l.name}
                connectNulls
                strokeDasharray={l.strokeDasharray}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
