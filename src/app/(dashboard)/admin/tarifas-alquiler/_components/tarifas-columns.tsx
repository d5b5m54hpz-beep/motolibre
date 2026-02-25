"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export type TarifaRow = {
  id: string;
  marca: string;
  modelo: string;
  condicion: string;
  plan: string;
  frecuencia: string;
  precio: number;
  costoAmortizacion: number | null;
  costoMantenimiento: number | null;
  costoSeguro: number | null;
  costoPatente: number | null;
  costoOperativo: number | null;
  margenPct: number | null;
  activo: boolean;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  createdAt: string;
  updatedAt: string;
};

const PLAN_LABELS: Record<string, string> = {
  MESES_3: "3 meses",
  MESES_6: "6 meses",
  MESES_9: "9 meses",
  MESES_12: "12 meses",
  MESES_24: "24 meses",
};

const FRECUENCIA_LABELS: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

const CONDICION_LABELS: Record<string, string> = {
  NUEVA: "Nueva",
  USADA: "Usada",
};

export { PLAN_LABELS, FRECUENCIA_LABELS, CONDICION_LABELS };

export const tarifasColumns: ColumnDef<TarifaRow>[] = [
  // -- Select --
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // -- Marca --
  {
    accessorKey: "marca",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marca" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.marca}</span>
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // -- Modelo --
  {
    accessorKey: "modelo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modelo" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.modelo}</span>
    ),
  },
  // -- Condicion --
  {
    accessorKey: "condicion",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Condicion" />
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.condicion}
        variant={row.original.condicion === "NUEVA" ? "success" : "info"}
        showDot={false}
        label={CONDICION_LABELS[row.original.condicion] ?? row.original.condicion}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // -- Plan --
  {
    accessorKey: "plan",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Plan" />
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.plan}
        variant="neutral"
        showDot={false}
        label={PLAN_LABELS[row.original.plan] ?? row.original.plan}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // -- Frecuencia --
  {
    accessorKey: "frecuencia",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Frecuencia" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {FRECUENCIA_LABELS[row.original.frecuencia] ?? row.original.frecuencia}
      </span>
    ),
  },
  // -- Precio --
  {
    accessorKey: "precio",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" />
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums font-semibold text-sm">
        {formatMoney(row.original.precio)}
      </span>
    ),
  },
  // -- Desglose --
  {
    id: "desglose",
    header: "Desglose",
    cell: ({ row }) => {
      const r = row.original;
      const hasComponents =
        r.costoAmortizacion || r.costoMantenimiento || r.costoSeguro || r.costoPatente || r.costoOperativo;
      if (!hasComponents) {
        return <span className="text-muted-foreground text-xs">--</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-3.5 w-3.5" />
                Ver
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-1 text-xs">
                {r.costoAmortizacion != null && (
                  <div className="flex justify-between gap-4">
                    <span>Amortizacion</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(r.costoAmortizacion)}
                    </span>
                  </div>
                )}
                {r.costoMantenimiento != null && (
                  <div className="flex justify-between gap-4">
                    <span>Mantenimiento</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(r.costoMantenimiento)}
                    </span>
                  </div>
                )}
                {r.costoSeguro != null && (
                  <div className="flex justify-between gap-4">
                    <span>Seguro</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(r.costoSeguro)}
                    </span>
                  </div>
                )}
                {r.costoPatente != null && (
                  <div className="flex justify-between gap-4">
                    <span>Patente</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(r.costoPatente)}
                    </span>
                  </div>
                )}
                {r.costoOperativo != null && (
                  <div className="flex justify-between gap-4">
                    <span>Operativo</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(r.costoOperativo)}
                    </span>
                  </div>
                )}
                {r.margenPct != null && (
                  <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                    <span>Margen</span>
                    <span className="font-mono tabular-nums">
                      {(r.margenPct * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
  },
  // -- Estado --
  {
    id: "estado",
    accessorFn: (row) => (row.activo ? "ACTIVO" : "INACTIVO"),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.activo ? "ACTIVO" : "INACTIVO"}
        variant={row.original.activo ? "success" : "neutral"}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // -- Vigencia --
  {
    id: "vigencia",
    accessorFn: (row) => row.vigenciaDesde,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vigencia" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.vigenciaDesde)}
        {row.original.vigenciaHasta && (
          <> - {formatDate(row.original.vigenciaHasta)}</>
        )}
      </span>
    ),
  },
];
