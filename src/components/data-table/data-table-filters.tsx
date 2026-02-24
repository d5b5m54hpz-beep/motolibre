"use client";

import { type Table } from "@tanstack/react-table";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FilterableColumn {
  id: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableFiltersProps<TData> {
  table: Table<TData>;
  filterableColumns: FilterableColumn[];
}

export function DataTableFilters<TData>({
  table,
  filterableColumns,
}: DataTableFiltersProps<TData>) {
  return (
    <div className="flex items-center gap-2">
      {filterableColumns.map((col) => {
        const column = table.getColumn(col.id);
        if (!column) return null;

        const selectedValues = new Set(
          (column.getFilterValue() as string[] | undefined) ?? []
        );

        return (
          <Popover key={col.id}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed",
                  selectedValues.size > 0 && "border-primary/50"
                )}
              >
                <ChevronsUpDown className="mr-2 h-3.5 w-3.5" />
                {col.title}
                {selectedValues.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {selectedValues.size}
                    </Badge>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {col.title}
                </p>
                <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                  {col.options.map((option) => {
                    const isSelected = selectedValues.has(option.value);

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const next = new Set(selectedValues);
                          if (isSelected) {
                            next.delete(option.value);
                          } else {
                            next.add(option.value);
                          }
                          const filterValues = Array.from(next);
                          column.setFilterValue(
                            filterValues.length ? filterValues : undefined
                          );
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedValues.size > 0 && (
                  <>
                    <Separator className="my-2" />
                    <button
                      onClick={() => column.setFilterValue(undefined)}
                      className="flex w-full items-center justify-center gap-1 rounded-sm py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

// ── Active filter chips ─────────────────────────────────────────────────────
interface DataTableActiveFiltersProps<TData> {
  table: Table<TData>;
  filterableColumns: FilterableColumn[];
}

export function DataTableActiveFilters<TData>({
  table,
  filterableColumns,
}: DataTableActiveFiltersProps<TData>) {
  const activeFilters: { colId: string; colTitle: string; value: string; label: string }[] = [];

  for (const col of filterableColumns) {
    const column = table.getColumn(col.id);
    if (!column) continue;
    const values = (column.getFilterValue() as string[] | undefined) ?? [];
    for (const v of values) {
      const opt = col.options.find((o) => o.value === v);
      activeFilters.push({
        colId: col.id,
        colTitle: col.title,
        value: v,
        label: opt?.label ?? v,
      });
    }
  }

  if (activeFilters.length === 0) return null;

  function removeFilter(colId: string, value: string) {
    const column = table.getColumn(colId);
    if (!column) return;
    const current = new Set(
      (column.getFilterValue() as string[] | undefined) ?? []
    );
    current.delete(value);
    column.setFilterValue(current.size > 0 ? Array.from(current) : undefined);
  }

  function clearAll() {
    for (const col of filterableColumns) {
      const column = table.getColumn(col.id);
      if (column) column.setFilterValue(undefined);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeFilters.map((f) => (
        <Badge
          key={`${f.colId}-${f.value}`}
          variant="secondary"
          className="gap-1 pr-1 text-xs"
        >
          <span className="text-muted-foreground">{f.colTitle}:</span> {f.label}
          <button
            onClick={() => removeFilter(f.colId, f.value)}
            className="ml-0.5 rounded-sm p-0.5 hover:bg-foreground/10"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button
        onClick={clearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
