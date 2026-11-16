import type { DataTableProps } from './types.ts';
import './DataTable.css';

export default function DataTable({ rows }: DataTableProps) {
  return (
    <div className="table-page">
      <section className="table-card">
        <header className="table-toolbar">
          <h2>Accounts</h2>
          {/* TODO: filter input and "Showing N of M accounts" status. See TASK.md. */}
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Region</th>
                <th scope="col">Revenue</th>
                <th scope="col">Growth</th>
                <th scope="col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {/* TODO: sorting, formatting, canvas sparklines and empty states. */}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.region}</td>
                  <td>{row.revenue}</td>
                  <td>{row.growth}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
