"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  hideMobile?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
}

export function DataGrid<T>({
  items,
  columns,
  onRowClick,
  emptyTitle = "Data tidak ditemukan",
  emptyDescription,
}: {
  items: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const cell = (row: T, key: string): unknown =>
    (row as Record<string, unknown>)[key];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <Card className="hidden border shadow-none md:block">
        <CardContent className="p-0">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11.5px] tracking-wide text-muted-foreground uppercase">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-semibold ${c.className ?? ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((row, i) => (
                <tr
                  key={i}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button, a, input, [role='button'], [role='checkbox']")) return;
                    onRowClick?.(row);
                  }}
                  className={`transition-colors hover:bg-muted/50 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String(cell(row, c.key) ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {items.map((row, i) => (
          <Card
            key={i}
            className="border shadow-none"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button, a, input, [role='button'], [role='checkbox']")) return;
              onRowClick?.(row);
            }}
          >
            <CardContent className="p-4">
              <div className="space-y-1.5">
                {columns
                  .filter((c) => !c.hideMobile)
                  .map((c) => (
                    <div key={c.key} className="flex justify-between gap-3">
                      <span className="text-[11.5px] text-muted-foreground">
                        {c.label}
                      </span>
                      <span className="text-right text-[12.5px] font-medium">
                        {c.render ? c.render(row) : String(cell(row, c.key) ?? "-")}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
