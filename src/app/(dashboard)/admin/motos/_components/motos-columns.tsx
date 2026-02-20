"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Moto } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { Eye } from "lucide-react";

type MotoRow = Moto & { _count: { documentos: number; historialEstados: number } };

export const motosColumns: ColumnDef<MotoRow>[] = [
  {
    accessorKey: "patente",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patente" />,
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        {row.original.patente ?? "Sin patentar"}
      </span>
    ),
  },
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
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "km",
    header: ({ column }) => <DataTableColumnHeader column={column} title="KM" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.km.toLocaleString("es-AR")}</span>
    ),
  },
  {
    accessorKey: "precioAlquilerMensual",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alquiler/mes" />,
    cell: ({ row }) => {
      const precio = row.original.precioAlquilerMensual;
      return precio ? (
        <span className="tabular-nums text-green-500">
          {formatMoney(Number(precio))}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "ubicacion",
    header: "Ubicación",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.ubicacion ?? "—"}
      </span>
    ),
  },
  {
    id: "acciones",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/admin/motos/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];
