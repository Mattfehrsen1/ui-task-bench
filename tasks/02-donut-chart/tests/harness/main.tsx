import { createRoot } from 'react-dom/client';
import DonutChart from '@submission/DonutChart';
import type { DonutChartProps } from '../contract.ts';
import { fixtures } from '../fixtures.ts';

const name = new URLSearchParams(location.search).get('fixture') ?? 'default';
const props: DonutChartProps | undefined = fixtures[name as keyof typeof fixtures];
if (!props) throw new Error(`Unknown fixture "${name}"`);

createRoot(document.getElementById('root')!).render(<DonutChart {...props} />);
