"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { formatMoney, formatDate } from "@/lib/format";

export type OTRow = {
  id: string;
  numero: string;
  tipo: string;
  prioridad: string;
  tipoService: string | null;
  estado: string;
  motoId: string;
  descripcion: string;
  fechaSolicitud: Date | string;
  fechaProgramada: Date | string | null;
  fechaFinReal: Date | string | null;
  costoManoObra: unknown;
  costoRepuestos: unknown;
  costoTotal: unknown;
  tallerNombre: string | null;
  mecanicoNombre: string | null;
  _count: { tareas: number; repuestos: number };
  moto?: { id: string; patente: string | null; marca: string; modelo: string } | null;
};

export const otColumns: ColumnDef<OTRow>[] = [
  // ── Select ──
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
  // ── Nº OT ──
  {
    accessorKey: "numero",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nº OT" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-bold">{row.original.numero}</span>
    ),
  },
  // ── Moto ──
  {
    id: "motoInfo",
    accessorFn: (row) =>
      row.moto
        ? `${row.moto.patente ?? ""} ${row.moto.marca} ${row.moto.modelo}`
        : row.motoId,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Moto" />,
    cell: ({ row }) => {
      const moto = row.original.moto;
      if (!moto) {
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.motoId.slice(0, 8)}...
          </span>
        );
      }
      return (
        <div>
          <p className="font-mono font-bold text-sm">
            {moto.patente ?? "Sin patentar"}
          </p>
          <p className="text-xs text-muted-foreground">
            {moto.marca} {moto.modelo}
          </p>
        </div>
      );
    },
  },
  // ── Tipo ──
  {
    accessorKey: "tipo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <span className="text-xs font-medium">{row.original.tipo}</span>
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Prioridad ──
  {
    accessorKey: "prioridad",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Prioridad" />,
    cell: ({ row }) => <StatusBadge status={row.original.prioridad} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Estado ──
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Mecánico ──
  {
    accessorKey: "mecanicoNombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mecánico" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.mecanicoNombre ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  // ── Fecha ──
  {
    id: "fecha",
    accessorFn: (row) =>
      row.fechaProgramada
        ? new Date(row.fechaProgramada).getTime()
        : new Date(row.fechaSolicitud).getTime(),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const fp = row.original.fechaProgramada;
      const fs = row.original.fechaSolicitud;
      const fecha = fp ? new Date(fp) : new Date(fs);
      return (
        <div>
          <p className="text-sm font-mono tabular-nums">{formatDate(fecha)}</p>
          <p className="text-xs text-muted-foreground">
            {fp ? "Programada" : "Solicitud"}
          </p>
        </div>
      );
    },
  },
  // ── Costo ──
  {
    accessorKey: "costoTotal",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Costo" />,
    cell: ({ row }) => {
      const costo = row.original.costoTotal;
      return (
        <span className="font-mono tabular-nums text-sm">
          {costo ? formatMoney(Number(costo)) : "—"}
        </span>
      );
    },
  },
  // ── Tareas / Repuestos ──
  {
    id: "tareasRepuestos",
    header: "T / R",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono tabular-nums">
        {row.original._count.tareas}T / {row.original._count.repuestos}R
      </span>
    ),
    enableSorting: false,
  },
];
