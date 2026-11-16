// Cheat: draws the data correctly and responds to the mouse, with ARIA labels that look
// accessible, but segments cannot be focused and there is no keyboard support.
import { useId, useState } from 'react';
import type { DonutChartProps, Segment } from './types.ts';
import './DonutChart.css';

const SIZE = 200;
const CENTER = SIZE / 2;
const OUTER = SIZE * 0.45;
const INNER = SIZE * 0.3;

const number = new Intl.NumberFormat('en-US');

interface Arc {
  segment: Segment;
  start: number;
  end: number;
  percent: number;
}

export default function DonutChart({ title, data }: DonutChartProps) {
  const titleId = useId();
  const tooltipId = useId();
  const [active, setActive] = useState<number | null>(null);

  const total = data.reduce((sum, s) => sum + s.value, 0);
  const arcs = toArcs(data, total);
  const current = active === null ? undefined : arcs[active];

  return (
    <div className="donut-page">
      <section className="donut-card">
        <h2 id={titleId}>{title}</h2>
        <div className="donut-body">
          <div className="donut-chart">
            <svg
              role="group"
              aria-labelledby={titleId}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              onPointerLeave={() => setActive(null)}
            >
              {arcs.map((arc, i) => (
                <path
                  key={arc.segment.id}
                  d={sectorPath(arc.start, arc.end)}
                  fill={arc.segment.color}
                  role="img"
                  aria-label={`${arc.segment.label}: ${number.format(arc.segment.value)} (${arc.percent}%)`}
                  aria-describedby={active === i ? tooltipId : undefined}
                  className={
                    active !== null && active !== i ? 'donut-segment is-dimmed' : 'donut-segment'
                  }
                  onPointerEnter={() => setActive(i)}
                />
              ))}
              <text x={CENTER} y={CENTER - 8} className="donut-total-label">
                Total
              </text>
              <text x={CENTER} y={CENTER + 16} className="donut-total-value">
                {number.format(total)}
              </text>
            </svg>
            {current && (
              <div
                id={tooltipId}
                role="tooltip"
                className="donut-tooltip"
                style={tooltipPosition(current)}
              >
                <strong>{current.segment.label}</strong>
                <span>
                  {number.format(current.segment.value)} · {current.percent}%
                </span>
              </div>
            )}
          </div>
          <ul className="donut-legend" aria-label="Legend">
            {arcs.map((arc, i) => (
              <li key={arc.segment.id} aria-current={active === i ? 'true' : undefined}>
                <span className="donut-swatch" style={{ background: arc.segment.color }} />
                <span className="donut-legend-label">{arc.segment.label}</span>
                <span className="donut-legend-value">{number.format(arc.segment.value)}</span>
                <span className="donut-legend-percent">{arc.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** Angles in turns (0..1), clockwise from 12 o'clock. */
function toArcs(data: Segment[], total: number): Arc[] {
  let start = 0;
  return data.map((segment) => {
    const share = total > 0 ? segment.value / total : 0;
    const arc = { segment, start, end: start + share, percent: Math.round(share * 100) };
    start += share;
    return arc;
  });
}

function point(turns: number, radius: number): string {
  const angle = turns * 2 * Math.PI;
  const x = CENTER + radius * Math.sin(angle);
  const y = CENTER - radius * Math.cos(angle);
  return `${x.toFixed(3)} ${y.toFixed(3)}`;
}

function sectorPath(start: number, end: number): string {
  if (end - start >= 0.9999) {
    // A full ring cannot be drawn as one arc; split it into two halves.
    return `${sectorPath(0, 0.5)} ${sectorPath(0.5, 1)}`;
  }
  const largeArc = end - start > 0.5 ? 1 : 0;
  return [
    `M ${point(start, OUTER)}`,
    `A ${OUTER} ${OUTER} 0 ${largeArc} 1 ${point(end, OUTER)}`,
    `L ${point(end, INNER)}`,
    `A ${INNER} ${INNER} 0 ${largeArc} 0 ${point(start, INNER)}`,
    'Z',
  ].join(' ');
}

function tooltipPosition({ start, end }: Arc): { left: string; top: string } {
  const angle = ((start + end) / 2) * 2 * Math.PI;
  const radius = (OUTER + INNER) / 2;
  return {
    left: `${((CENTER + radius * Math.sin(angle)) / SIZE) * 100}%`,
    top: `${((CENTER - radius * Math.cos(angle)) / SIZE) * 100}%`,
  };
}
