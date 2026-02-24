"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Moto } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/format";
import Image from "next/image";

export type MotoRow = Moto & { _count: { documentos: number; historialEstados: number } };

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
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
          —
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
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
  // ── VIN / Nº Motor ──
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
  // ── KM ──
  {
    accessorKey: "km",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Km" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {row.original.km.toLocaleString("es-AR")}
      </span>
    ),
  },
  // ── Alquiler/mes ──
  {
    accessorKey: "precioAlquilerMensual",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alquiler/mes" />,
    cell: ({ row }) => {
      const precio = row.original.precioAlquilerMensual;
      return precio ? (
        <span className="font-mono tabular-nums text-positive">
          {formatMoney(Number(precio))}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
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
];
