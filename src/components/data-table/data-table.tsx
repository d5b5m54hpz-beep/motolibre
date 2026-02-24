"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { DataTableSearch } from "./data-table-search";
import {
  DataTableFilters,
  DataTableActiveFilters,
  type FilterableColumn,
} from "./data-table-filters";
import { DataTableColumnToggle } from "./data-table-column-toggle";
import { DataTablePagination } from "./data-table-pagination";
import {
  DataTableBulkActions,
  type BulkAction,
} from "./data-table-bulk-actions";
import {
  DataTableViewToggle,
  type DataTableView,
} from "./data-table-view-toggle";
import type { LucideIcon } from "lucide-react";

// ── Props ──────────────────────────────────────────────────────────────────
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  searchableColumns?: string[];
  searchKey?: string;
  searchPlaceholder?: string;
  filterableColumns?: FilterableColumn[];
  bulkActions?: BulkAction<TData>[];
  onRowClick?: (row: TData) => void;
  galleryView?: (row: TData) => React.ReactNode;
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };
  defaultPageSize?: number;
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  /** @deprecated Use defaultPageSize instead */
  pageSize?: number;
}

// ── Persistence helpers ─────────────────────────────────────────────────────
const VISIBILITY_KEY = "motolibre-dt-visibility";

function loadVisibility(): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVisibility(state: VisibilityState) {
  try {
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchableColumns,
  searchKey,
  searchPlaceholder = "Buscar...",
  filterableColumns = [],
  bulkActions = [],
  onRowClick,
  galleryView,
  emptyState,
  defaultPageSize,
  toolbar,
  pageSizeOptions,
  pageSize,
}: DataTableProps<TData, TValue>) {
  const resolvedPageSize = defaultPageSize ?? pageSize ?? 20;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadVisibility()
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [view, setView] = useState<DataTableView>("list");

  // Persist column visibility
  useEffect(() => {
    saveVisibility(columnVisibility);
  }, [columnVisibility]);

  // Global filter function: searches across all searchable columns
  const globalFilterFn = useCallback(
    (row: { getValue: (id: string) => unknown }, _columnId: string, filterValue: string) => {
      if (!filterValue) return true;
      const search = filterValue.toLowerCase();

      const colIds = searchableColumns ?? columns
        .map((c) => {
          if ("accessorKey" in c && typeof c.accessorKey === "string") return c.accessorKey;
          if ("id" in c && c.id) return c.id;
          return null;
        })
        .filter(Boolean) as string[];

      return colIds.some((colId) => {
        const value = row.getValue(colId);
        if (value == null) return false;
        return String(value).toLowerCase().includes(search);
      });
    },
    [searchableColumns, columns]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: { pagination: { pageSize: resolvedPageSize } },
  });

  const hasActiveFilters = filterableColumns.some((col) => {
    const column = table.getColumn(col.id);
    return column && (column.getFilterValue() as string[] | undefined)?.length;
  });

  // ── Skeleton loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-8 w-24" />
          <div className="ml-auto">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-4 py-3"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const EmptyIcon = emptyState?.icon;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        {(searchKey || searchableColumns) && (
          <DataTableSearch
            value={searchKey
              ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              : globalFilter
            }
            onChange={(value) => {
              if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(value);
              } else {
                setGlobalFilter(value);
              }
            }}
            placeholder={searchPlaceholder}
          />
        )}

        {/* Filters */}
        {filterableColumns.length > 0 && (
          <DataTableFilters
            table={table}
            filterableColumns={filterableColumns}
          />
        )}

        {/* Custom toolbar */}
        {toolbar}

        {/* Right side: view toggle + column toggle */}
        <div className="ml-auto flex items-center gap-2">
          {galleryView && (
            <DataTableViewToggle view={view} onViewChange={setView} />
          )}
          <DataTableColumnToggle table={table} />
        </div>
      </div>

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      {hasActiveFilters && (
        <DataTableActiveFilters
          table={table}
          filterableColumns={filterableColumns}
        />
      )}

      {/* ── Bulk actions ─────────────────────────────────────────────────── */}
      {bulkActions.length > 0 && (
        <DataTableBulkActions table={table} actions={bulkActions} />
      )}

      {/* ── Gallery view ─────────────────────────────────────────────────── */}
      {view === "gallery" && galleryView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {galleryView(row.original)}
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              {EmptyIcon && (
                <EmptyIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              )}
              <h3 className="text-lg font-medium text-muted-foreground">
                {emptyState?.title ?? "No hay resultados"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {emptyState?.description ?? "No se encontraron datos."}
              </p>
              {emptyState?.action && (
                <button
                  onClick={emptyState.action.onClick}
                  className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {emptyState.action.label}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Table view ──────────────────────────────────────────────────── */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      {EmptyIcon && (
                        <EmptyIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      )}
                      <h3 className="text-lg font-medium text-muted-foreground">
                        {emptyState?.title ?? "No hay resultados"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground/70">
                        {emptyState?.description ?? "No se encontraron datos."}
                      </p>
                      {emptyState?.action && (
                        <button
                          onClick={emptyState.action.onClick}
                          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {emptyState.action.label}
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
    </div>
  );
}
