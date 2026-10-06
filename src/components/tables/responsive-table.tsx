import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function ResponsiveTable<T extends { id: string }>({
  columns,
  rows,
  renderCard,
  bare = false,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  renderCard: (row: T) => React.ReactNode;
  /** Skip the framed container, e.g. when the table already sits inside a Card. */
  bare?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">{rows.map((row) => renderCard(row))}</div>
      <div
        className={
          bare
            ? "hidden md:block"
            : "bg-card ring-foreground/[0.07] hidden overflow-hidden rounded-xl shadow-xs ring-1 md:block"
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
