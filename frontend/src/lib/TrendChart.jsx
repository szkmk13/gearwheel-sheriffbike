import React from 'react';

const WIDTH = 360;
const HEIGHT = 150;
const PAD = { top: 16, right: 12, bottom: 24, left: 12 };

function TrendChart({ title, points, formatValue }) {
  const [hoverIndex, setHoverIndex] = React.useState(null);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...points.map((p) => p.value));

  const x = (i) => PAD.left + (i / Math.max(1, points.length - 1)) * innerW;
  const y = (v) => PAD.top + innerH - (v / maxValue) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;

  const last = points[points.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, position: 'relative' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>{title}</div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', overflow: 'visible' }}>
        <line x1={PAD.left} y1={PAD.top + innerH} x2={WIDTH - PAD.right} y2={PAD.top + innerH} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={WIDTH - PAD.right} y2={PAD.top} stroke="var(--line)" strokeWidth={1} />

        <path d={areaPath} fill="var(--accent)" opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={24} fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            />
            {(i === points.length - 1 || i === hoverIndex) && (
              <circle cx={x(i)} cy={y(p.value)} r={4} fill="var(--accent)" stroke="var(--paper-2)" strokeWidth={2} />
            )}
          </g>
        ))}

        {last && (
          <text x={x(points.length - 1)} y={y(last.value) - 10} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--ink)">
            {formatValue(last.value)}
          </text>
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '4px 8px',
            fontSize: 12,
            color: 'var(--ink-2)',
            pointerEvents: 'none',
          }}
        >
          <strong style={{ color: 'var(--ink)' }}>{formatValue(hovered.value)}</strong> - {hovered.label}
        </div>
      )}
    </div>
  );
}

export default TrendChart;
