import { useEffect, useRef } from 'react';

const WIDTH = 120;
const HEIGHT = 32;
const PADDING = 2;

export function trendDirection(values: number[]): 'up' | 'down' | 'flat' {
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? 0;
  return last > first ? 'up' : last < first ? 'down' : 'flat';
}

export default function Sparkline({ values, label }: { values: number[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, WIDTH, HEIGHT);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = (i: number) => PADDING + (i / (values.length - 1)) * (WIDTH - 2 * PADDING);
    const y = (v: number) =>
      max === min ? HEIGHT / 2 : PADDING + ((max - v) / (max - min)) * (HEIGHT - 2 * PADDING);

    context.beginPath();
    values.forEach((v, i) => (i === 0 ? context.moveTo(x(i), y(v)) : context.lineTo(x(i), y(v))));
    context.lineWidth = 1.5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = trendDirection(values) === 'down' ? '#dc2626' : '#16a34a';
    context.stroke();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="sparkline"
      style={{ width: WIDTH, height: HEIGHT }}
    />
  );
}
