import type { DonutChartProps } from './contract.ts';

export const fixtures = {
  default: {
    title: 'Monthly budget',
    data: [
      { id: 'housing', label: 'Housing', value: 1200, color: '#4f46e5' },
      { id: 'food', label: 'Food', value: 600, color: '#0ea5e9' },
      { id: 'transport', label: 'Transport', value: 300, color: '#f59e0b' },
      { id: 'savings', label: 'Savings', value: 900, color: '#10b981' },
    ],
  },
  alternate: {
    title: 'Traffic sources',
    data: [
      { id: 'search', label: 'Search', value: 4820, color: '#be123c' },
      { id: 'direct', label: 'Direct', value: 2410, color: '#7c3aed' },
      { id: 'social', label: 'Social', value: 1205, color: '#0891b2' },
      { id: 'email', label: 'Email', value: 964, color: '#65a30d' },
      { id: 'referral', label: 'Referral', value: 2651, color: '#ea580c' },
    ],
  },
} satisfies Record<string, DonutChartProps>;

export type FixtureName = keyof typeof fixtures;
