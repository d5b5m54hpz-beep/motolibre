"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Moto } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/format";
import { Bike, AlertTriangle } from "lucide-react";
import Image from "next/image";

export type MotoRow = Moto & {
  _count: { documentos: number; historialEstados: number };
  renterName: string | null;
  ultService: string | null;
  proxService: string | null;
};

/** Columns hidden by default — user can enable via column toggle */
export const defaultHiddenColumns: Record<string, boolean> = {
  numChasis: false,
  numMotor: false,
  precioAlquilerMensual: false,
  anio: false,
  cilindrada: false,
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}m`;
  return `hace ${Math.floor(months / 12)}a`;
}

function daysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const motosColumns: ColumnDef<MotoRow>[] = [
  // ── Select checkbox ──
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
  // ── Foto miniatura ──
  {
    id: "foto",
    header: "",
    cell: ({ row }) => {
      const url = row.original.imagenUrl;
      return url ? (
        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
          <Image src={url} alt="" fill className="object-cover" sizes="40px" />
        </div>
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
          <Bike className="h-5 w-5 text-muted-foreground/30" />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  // ── Patente ──
  {
    accessorKey: "patente",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patente" />,
    cell: ({ row }) => (
      <span className="font-mono font-bold text-sm">
        {row.original.patente ?? "Sin patentar"}
      </span>
    ),
  },
  // ── Marca / Modelo ──
  {
    id: "marcaModelo",
    accessorFn: (row) => `${row.marca} ${row.modelo}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Marca / Modelo" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.marca} {row.original.modelo}</p>
        <p className="text-xs text-muted-foreground">{row.original.anio} · {row.original.tipo}</p>
      </div>
    ),
  },
  // ── Estado ──
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Renter ──
  {
    id: "renter",
    accessorFn: (row) => row.renterName ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Renter" />,
    cell: ({ row }) => {
      const name = row.original.renterName;
      return name ? (
        <span className="text-sm font-medium">{name}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── KM ──
  {
    accessorKey: "km",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Km" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">
        {row.original.km.toLocaleString("es-AR")}
      </span>
    ),
  },
  // ── Últ. Service ──
  {
    id: "ultService",
    accessorFn: (row) => row.ultService ? new Date(row.ultService).getTime() : 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Últ. Service" />,
    cell: ({ row }) => {
      const date = row.original.ultService;
      if (!date) return <span className="text-muted-foreground">—</span>;
      const days = Math.abs(daysUntil(date));
      const isOld = days > 90;
      return (
        <span
          className={`text-sm ${isOld ? "text-amber-500 font-medium" : "text-muted-foreground"}`}
          title={formatDateShort(date)}
        >
          {timeAgo(date)}
        </span>
      );
    },
  },
  // ── Próx. Service ──
  {
    id: "proxService",
    accessorFn: (row) => row.proxService ? new Date(row.proxService).getTime() : 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Próx. Service" />,
    cell: ({ row }) => {
      const date = row.original.proxService;
      if (!date) return <span className="text-muted-foreground text-sm">Sin plan</span>;
      const days = daysUntil(date);
      const isOverdue = days < 0;
      return (
        <span
          className={`text-sm font-mono tabular-nums ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
          title={formatDateShort(date)}
        >
          {isOverdue && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
          {formatDateShort(date)}
        </span>
      );
    },
  },
  // ── Ubicación ──
  {
    accessorKey: "ubicacion",
    header: "Ubicación",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.ubicacion ?? "—"}
      </span>
    ),
  },
  // ── Hidden by default ──
  // ── VIN ──
  {
    accessorKey: "numChasis",
    header: "VIN",
    cell: ({ row }) => {
      const vin = row.original.numChasis;
      return vin ? (
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] block" title={vin}>
          {vin}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Nº Motor ──
  {
    accessorKey: "numMotor",
    header: "Nº Motor",
    cell: ({ row }) => {
      const num = row.original.numMotor;
      return num ? (
        <span className="font-mono text-xs">{num}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Alquiler/mes ──
  {
    accessorKey: "precioAlquilerMensual",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alquiler/mes" />,
    cell: ({ row }) => {
      const precio = row.original.precioAlquilerMensual;
      return precio ? (
        <span className="font-mono tabular-nums text-sm font-semibold text-positive">
          {formatMoney(Number(precio))}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Año (hidden) ──
  {
    accessorKey: "anio",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.anio}</span>,
  },
  // ── Cilindrada (hidden) ──
  {
    accessorKey: "cilindrada",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cilindrada" />,
    cell: ({ row }) => {
      const cc = row.original.cilindrada;
      return cc ? (
        <span className="font-mono tabular-nums">{cc} cc</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
];
