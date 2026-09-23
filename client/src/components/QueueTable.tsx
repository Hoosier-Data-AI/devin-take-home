import type { ReactNode } from "react";

export interface QueueColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  className?: string;
}

interface QueueTableProps<Row extends { id: string }> {
  rows: Row[];
  columns: QueueColumn<Row>[];
  selectedId?: string | undefined;
  emptyMessage: string;
  onSelect: (row: Row) => void;
}

export function QueueTable<Row extends { id: string }>({
  rows,
  columns,
  selectedId,
  emptyMessage,
  onSelect
}: QueueTableProps<Row>) {
  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              aria-selected={row.id === selectedId}
              className={row.id === selectedId ? "selected-row" : undefined}
              key={row.id}
              onClick={() => onSelect(row)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelect(row);
                }
              }}
            >
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
