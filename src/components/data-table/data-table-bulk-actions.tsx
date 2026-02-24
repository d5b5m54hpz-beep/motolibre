"use client";

import { type Table } from "@tanstack/react-table";
import { X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkAction<TData> {
  label: string;
  icon: LucideIcon;
  onClick: (rows: TData[]) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
}

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>;
  actions: BulkAction<TData>[];
}

export function DataTableBulkActions<TData>({
  table,
  actions,
}: DataTableBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const count = selectedRows.length;

  if (count === 0) return null;

  const selectedData = selectedRows.map((row) => row.original);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
      <span className="text-sm font-medium">
        {count} seleccionado{count !== 1 ? "s" : ""}
      </span>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant ?? "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => action.onClick(selectedData)}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 text-xs text-muted-foreground"
        onClick={() => table.toggleAllRowsSelected(false)}
      >
        <X className="mr-1 h-3 w-3" />
        Deseleccionar
      </Button>
    </div>
  );
}
