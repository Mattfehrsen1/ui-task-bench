import type { Plan } from './contract.ts';

export const fixtures = {
  default: [
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
  ],
  alternate: [
    {
      id: 'hobby',
      name: 'Hobby',
      description: 'Side projects.',
      monthlyPrice: 9,
      features: ['3 projects'],
      highlighted: true,
    },
    {
      id: 'studio',
      name: 'Studio',
      description: 'Agencies and studios.',
      monthlyPrice: 149,
      features: ['Unlimited projects', 'Client workspaces'],
    },
  ],
} satisfies Record<string, Plan[]>;

export type FixtureName = keyof typeof fixtures;
