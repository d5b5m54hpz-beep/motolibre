"use client";

import { type Table } from "@tanstack/react-table";
import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DataTableColumnToggleProps<TData> {
  table: Table<TData>;
}

export function DataTableColumnToggle<TData>({
  table,
}: DataTableColumnToggleProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Columns3 className="mr-2 h-3.5 w-3.5" />
          Columnas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[200px] p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
          Columnas visibles
        </p>
        <div className="space-y-0.5">
          {columns.map((column) => (
            <button
              key={column.id}
              onClick={() => column.toggleVisibility(!column.getIsVisible())}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                !column.getIsVisible() && "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  column.getIsVisible()
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {column.getIsVisible() && (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="capitalize truncate">
                {typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id.replace(/_/g, " ")}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
