import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DataTable from './DataTable.tsx';
import type { Account } from './types.ts';

const regions = ['EMEA', 'North America', 'APAC', 'LATAM'];
const rows: Account[] = Array.from({ length: 24 }, (_, i) => ({
  id: `account-${i + 1}`,
  name: `Account ${i + 1}`,
  region: regions[i % regions.length] ?? 'EMEA',
  revenue: 250_000 + ((i * 7919) % 31) * 90_000,
  growth: (((i * 37) % 41) - 20) / 2,
  trend: Array.from({ length: 12 }, (_, w) => 50 + Math.round(20 * Math.sin((w + i) / 2))),
}));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataTable rows={rows} />
  </StrictMode>,
);
