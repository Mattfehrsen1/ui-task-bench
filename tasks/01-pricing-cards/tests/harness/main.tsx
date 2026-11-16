import { createRoot } from 'react-dom/client';
import PricingCards from '@submission/PricingCards';
import type { Plan } from '../contract.ts';
import { fixtures } from '../fixtures.ts';

const name = new URLSearchParams(location.search).get('fixture') ?? 'default';
const plans: Plan[] | undefined = fixtures[name as keyof typeof fixtures];
if (!plans) throw new Error(`Unknown fixture "${name}"`);

createRoot(document.getElementById('root')!).render(<PricingCards plans={plans} />);
