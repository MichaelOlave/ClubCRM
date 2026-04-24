import { Fragment, type ReactNode } from "react";

import type { TableColumn } from "@/types/ui";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

type DataTableProps<T> = {
  columns: Array<TableColumn<T>>;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string;
  rows: T[];
  renderRowWrapper?: (row: T, children: ReactNode) => ReactNode;
};

export function DataTable<T>({
  columns,
  emptyState,
  keyExtractor,
  rows,
  renderRowWrapper,
}: DataTableProps<T>) {
  if (!rows.length) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-border">
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/20 to-transparent pointer-events-none lg:hidden" />
      <Table className="min-w-full bg-card">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-border hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                className={column.align === "right" ? "text-right" : ""}
                key={column.key}
                scope="col"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const rowKey = keyExtractor(row);
            const content = (
              <TableRow className="align-top">
                {columns.map((column) => (
                  <TableCell
                    className={column.align === "right" ? "text-right" : ""}
                    key={column.key}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            );

            return (
              <Fragment key={rowKey}>
                {renderRowWrapper ? renderRowWrapper(row, content) : content}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
