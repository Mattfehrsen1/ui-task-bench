import type { DonutChartProps } from './types.ts';
import './DonutChart.css';

export default function DonutChart({ title, data }: DonutChartProps) {
  return (
    <div className="donut-page">
      <section className="donut-card">
        <h2>{title}</h2>
        {/* TODO: donut chart (SVG) with tooltip, and a legend for the {data.length} segments. See TASK.md. */}
        <p>{data.length} segments</p>
      </section>
    </div>
  );
}
