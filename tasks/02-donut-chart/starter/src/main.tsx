import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DonutChart from './DonutChart.tsx';
import type { Segment } from './types.ts';

const data: Segment[] = [
  { id: 'housing', label: 'Housing', value: 1200, color: '#4f46e5' },
  { id: 'food', label: 'Food', value: 600, color: '#0ea5e9' },
  { id: 'transport', label: 'Transport', value: 300, color: '#f59e0b' },
  { id: 'savings', label: 'Savings', value: 900, color: '#10b981' },
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DonutChart title="Monthly budget" data={data} />
  </StrictMode>,
);
