import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PricingCards from './PricingCards.tsx';
import type { Plan } from './types.ts';

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals getting started.',
    monthlyPrice: 12,
    features: ['1 project', '5 GB storage', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams that ship often.',
    monthlyPrice: 29,
    features: ['Unlimited projects', '100 GB storage', 'Priority support', 'Usage analytics'],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For organisations with advanced needs.',
    monthlyPrice: 79,
    features: ['Everything in Pro', '1 TB storage', 'SSO and audit log'],
  },
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PricingCards plans={plans} />
  </StrictMode>,
);
