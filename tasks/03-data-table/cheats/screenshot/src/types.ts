export interface Account {
  id: string;
  name: string;
  region: string;
  /** Whole US dollars. */
  revenue: number;
  /** Percentage change, e.g. 12.4 for +12.4%. */
  growth: number;
  /** Weekly revenue, oldest first. At least two points. */
  trend: number[];
}

export interface DataTableProps {
  rows: Account[];
}
