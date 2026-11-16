export interface Segment {
  id: string;
  label: string;
  /** Non-negative; at least one segment in a chart is positive. */
  value: number;
  /** Any CSS colour. */
  color: string;
}

export interface DonutChartProps {
  title: string;
  data: Segment[];
}
