import type { ReactNode } from "react";

import type { TableColumn } from "@/types/ui";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

type DataTableProps<T> = {
  columns: Array<TableColumn<T>>;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string;
  rows: T[];
};

export function DataTable<T>({
  columns,
  emptyState,
  keyExtractor,
  rows,
}: DataTableProps<T>) {
  if (!rows.length) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border">
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
          {rows.map((row) => (
            <TableRow className="align-top" key={keyExtractor(row)}>
              {columns.map((column) => (
                <TableCell
                  className={column.align === "right" ? "text-right" : ""}
                  key={column.key}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
