import { useId, useRef, useState } from 'react';
import Sparkline, { trendDirection } from './Sparkline.tsx';
import type { Account, DataTableProps } from './types.ts';
import './DataTable.css';

type SortKey = 'name' | 'region' | 'revenue' | 'growth';
type Direction = 'ascending' | 'descending';

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Account' },
  { key: 'region', label: 'Region' },
  { key: 'revenue', label: 'Revenue', numeric: true },
  { key: 'growth', label: 'Growth', numeric: true },
];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

export default function DataTable({ rows }: DataTableProps) {
  const titleId = useId();
  const filterRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction } | null>(null);

  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) => row.name.toLowerCase().includes(needle) || row.region.toLowerCase().includes(needle),
  );
  const visible = sort ? sortRows(filtered, sort.key, sort.direction) : filtered;

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key === key && current.direction === 'ascending'
        ? { key, direction: 'descending' }
        : { key, direction: 'ascending' },
    );
  }

  function clearFilter() {
    setQuery('');
    filterRef.current?.focus();
  }

  return (
    <div className="table-page">
      <section className="table-card">
        <header className="table-toolbar">
          <h2 id={titleId}>Accounts</h2>
          <input
            ref={filterRef}
            type="search"
            aria-label="Filter accounts"
            placeholder="Filter by name or region"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </header>
        <p role="status" className="table-status">
          Showing {visible.length} of {rows.length} accounts
        </p>
        <div className="table-scroll">
          <table aria-labelledby={titleId}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sort?.key === column.key ? sort.direction : undefined}
                    className={column.numeric ? 'is-numeric' : undefined}
                  >
                    <button type="button" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <SortIcon direction={sort?.key === column.key ? sort.direction : null} />
                    </button>
                  </th>
                ))}
                <th scope="col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="cell-name">{row.name}</td>
                  <td>{row.region}</td>
                  <td className="is-numeric">{currency.format(row.revenue)}</td>
                  <td className={`is-numeric ${growthTone(row.growth)}`}>
                    {percent.format(row.growth / 100)}
                  </td>
                  <td>
                    <Sparkline
                      values={row.trend}
                      label={`Trend for ${row.name}, ${trendDirection(row.trend)}`}
                    />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="table-empty">
                    {rows.length === 0 ? (
                      'No accounts yet.'
                    ) : (
                      <>
                        No accounts match “{query.trim()}”.{' '}
                        <button type="button" onClick={clearFilter}>
                          Clear filter
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function growthTone(growth: number): string {
  if (growth > 0) return 'is-up';
  return growth < 0 ? 'is-down' : '';
}

function sortRows(rows: Account[], key: SortKey, direction: Direction): Account[] {
  const sign = direction === 'ascending' ? 1 : -1;
  // Array.prototype.sort is stable, so ties keep their original order in both directions.
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    const order =
      typeof x === 'string' && typeof y === 'string'
        ? x.localeCompare(y, 'en', { sensitivity: 'base' })
        : Number(x) - Number(y);
    return order * sign;
  });
}

function SortIcon({ direction }: { direction: Direction | null }) {
  return (
    <svg aria-hidden="true" className="sort-icon" viewBox="0 0 10 14" width="10" height="14">
      <path d="M5 1 9 6H1z" className={direction === 'ascending' ? 'is-on' : undefined} />
      <path d="M5 13 1 8h8z" className={direction === 'descending' ? 'is-on' : undefined} />
    </svg>
  );
}
