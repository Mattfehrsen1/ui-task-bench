import { createRoot } from 'react-dom/client';
import DataTable from '@submission/DataTable';
import type { Account } from '../contract.ts';
import { fixtures } from '../fixtures.ts';

const name = new URLSearchParams(location.search).get('fixture') ?? 'default';
const rows: Account[] | undefined = fixtures[name as keyof typeof fixtures];
if (!rows) throw new Error(`Unknown fixture "${name}"`);

createRoot(document.getElementById('root')!).render(<DataTable rows={rows} />);
