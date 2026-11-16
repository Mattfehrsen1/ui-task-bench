import type { Account } from './contract.ts';

const regions = ['EMEA', 'North America', 'APAC', 'LATAM'];

/** Deterministic pseudo-random accounts, enough to make the table scroll. */
function generated(count: number): Account[] {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, (_, i) => ({
    id: `acct-${i + 1}`,
    name: `Account ${String(i + 1).padStart(2, '0')}`,
    region: regions[i % regions.length]!,
    revenue: Math.round(100_000 + next() * 3_000_000),
    growth: Math.round((next() * 40 - 20) * 10) / 10,
    trend: Array.from({ length: 12 }, () => Math.round(50 + next() * 50)),
  }));
}

export const fixtures = {
  default: [
    {
      id: 'northwind',
      name: 'Northwind Traders',
      region: 'EMEA',
      revenue: 1_284_500,
      growth: 12.4,
      trend: [61, 63, 62, 66, 70, 69, 73, 75, 74, 79, 83, 86],
    },
    {
      id: 'globex',
      name: 'Globex',
      region: 'North America',
      revenue: 2_310_000,
      growth: -3.2,
      trend: [92, 90, 91, 88, 86, 87, 84, 85, 83, 81, 82, 80],
    },
    {
      id: 'initech',
      name: 'Initech',
      region: 'North America',
      revenue: 864_200,
      growth: 4,
      trend: [40, 42, 41, 41, 43, 42, 44, 43, 45, 44, 46, 47],
    },
    {
      id: 'umbrella',
      name: 'Umbrella Health',
      region: 'APAC',
      revenue: 1_932_750,
      growth: 18.9,
      trend: [30, 34, 33, 38, 41, 45, 44, 50, 53, 57, 60, 65],
    },
    {
      id: 'stark',
      name: 'Stark Logistics',
      region: 'EMEA',
      revenue: 452_300,
      growth: -11.5,
      trend: [70, 68, 69, 64, 60, 61, 57, 55, 52, 53, 49, 46],
    },
    {
      id: 'wayne',
      name: 'Wayne Retail',
      region: 'LATAM',
      revenue: 1_105_000,
      growth: 0,
      trend: [55, 50, 46, 43, 41, 40, 41, 43, 46, 50, 53, 55],
    },
    {
      id: 'tyrell',
      name: 'Tyrell Systems',
      region: 'APAC',
      revenue: 3_021_400,
      growth: 7.8,
      trend: [72, 70, 74, 73, 77, 76, 79, 78, 82, 81, 84, 85],
    },
    {
      id: 'soylent',
      name: 'Soylent Foods',
      region: 'LATAM',
      revenue: 698_900,
      growth: -0.6,
      trend: [48, 52, 50, 54, 51, 53, 49, 52, 50, 51, 48, 47],
    },
  ],
  alternate: [
    {
      id: 'aurora',
      name: 'Aurora Labs',
      region: 'Nordics',
      revenue: 15_400,
      growth: 102.5,
      trend: [1, 2, 4, 8, 16],
    },
    {
      id: 'basalt',
      name: 'basalt mining',
      region: 'Africa',
      revenue: 9_870_000,
      growth: -42,
      trend: [900, 700, 750, 400],
    },
    {
      id: 'cobalt',
      name: 'Cobalt Studio',
      region: 'Nordics',
      revenue: 15_400,
      growth: 0.04,
      trend: [10, 30, 10, 30, 10, 30, 20],
    },
    {
      id: 'delta',
      name: 'Delta Freight',
      region: 'Africa',
      revenue: 230_000,
      growth: 5.57,
      trend: [5, 5],
    },
    {
      id: 'ember',
      name: 'Ember Energy',
      region: 'Oceania',
      revenue: 1_000,
      growth: -0.26,
      trend: [3, 9, 4, 8, 2],
    },
  ],
  many: generated(40),
  empty: [],
} satisfies Record<string, Account[]>;

export type FixtureName = keyof typeof fixtures;
