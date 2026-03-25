import type { ReactNode } from "react";
import type { TableColumn } from "@/types/ui";

type Props<T> = {
  columns: Array<TableColumn<T>>;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string;
  rows: T[];
};

export function Table<T>({ columns, emptyState, keyExtractor, rows }: Props<T>) {
  if (!rows.length) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-zinc-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 bg-white">
          <thead className="bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 ${
                    column.align === "right" ? "text-right" : ""
                  }`}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr className="align-top" key={keyExtractor(row)}>
                {columns.map((column) => (
                  <td
                    className={`px-4 py-4 text-sm text-zinc-700 ${
                      column.align === "right" ? "text-right" : ""
                    }`}
                    key={column.key}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
