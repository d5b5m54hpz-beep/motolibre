"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/format";

export type HistorialRow = {
  id: string;
  tarifaAlquilerId: string;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string;
  tipoAjuste: string;
  motivo: string | null;
  userId: string | null;
  createdAt: string;
  tarifaMarca: string;
  tarifaModelo: string;
  tarifaCondicion: string;
  tarifaPlan: string;
  tarifaFrecuencia: string;
};

const TIPO_AJUSTE_LABELS: Record<string, string> = {
  INCREMENTO: "Incremento",
  DECREMENTO: "Decremento",
  NUEVO: "Nuevo",
};

const TIPO_AJUSTE_VARIANT: Record<string, "success" | "danger" | "info"> = {
  INCREMENTO: "success",
  DECREMENTO: "danger",
  NUEVO: "info",
};

const CAMPO_LABELS: Record<string, string> = {
  tarifa: "Tarifa",
  precio: "Precio",
  activo: "Estado",
  condicion: "Condicion",
  plan: "Plan",
  frecuencia: "Frecuencia",
  costoAmortizacion: "Amortizacion",
  costoMantenimiento: "Mantenimiento",
  costoSeguro: "Seguro",
  costoPatente: "Patente",
  costoOperativo: "Operativo",
  margenPct: "Margen %",
  vigenciaDesde: "Vigencia desde",
  vigenciaHasta: "Vigencia hasta",
  marca: "Marca",
  modelo: "Modelo",
};

export { TIPO_AJUSTE_LABELS };

export const historialColumns: ColumnDef<HistorialRow>[] = [
  // -- Fecha --
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  // -- Tarifa --
  {
    id: "tarifa",
    accessorFn: (row) => `${row.tarifaMarca} ${row.tarifaModelo}`,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tarifa" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">
          {row.original.tarifaMarca} {row.original.tarifaModelo}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {row.original.tarifaCondicion} - {row.original.tarifaPlan} -{" "}
          {row.original.tarifaFrecuencia}
        </p>
      </div>
    ),
  },
  // -- Campo --
  {
    accessorKey: "campo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Campo" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {CAMPO_LABELS[row.original.campo] ?? row.original.campo}
      </span>
    ),
  },
  // -- Valor Anterior --
  {
    accessorKey: "valorAnterior",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Anterior" />
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm text-muted-foreground">
        {row.original.valorAnterior ?? "--"}
      </span>
    ),
  },
  // -- Valor Nuevo --
  {
    accessorKey: "valorNuevo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nuevo" />
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm font-medium">
        {row.original.valorNuevo}
      </span>
    ),
  },
  // -- Tipo Ajuste --
  {
    accessorKey: "tipoAjuste",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.tipoAjuste}
        variant={
          TIPO_AJUSTE_VARIANT[row.original.tipoAjuste] ?? "neutral"
        }
        showDot={false}
        label={
          TIPO_AJUSTE_LABELS[row.original.tipoAjuste] ??
          row.original.tipoAjuste
        }
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // -- Motivo --
  {
    accessorKey: "motivo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Motivo" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {row.original.motivo ?? "--"}
      </span>
    ),
  },
  // -- Usuario --
  {
    accessorKey: "userId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Usuario" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.userId ?? "--"}
      </span>
    ),
  },
];
