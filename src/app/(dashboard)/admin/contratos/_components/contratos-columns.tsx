"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatMoney, formatDate } from "@/lib/format";

type ContratoRow = Prisma.ContratoGetPayload<{
  include: {
    cliente: { select: { id: true; nombre: true; apellido: true; dni: true } };
    moto: { select: { id: true; marca: true; modelo: true; patente: true } };
    _count: { select: { cuotas: true } };
  };
}>;

const FRECUENCIA_LABEL: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

export const contratosColumns: ColumnDef<ContratoRow>[] = [
  {
    id: "cliente",
    accessorFn: (row) => `${row.cliente.apellido} ${row.cliente.nombre}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.cliente.apellido}, {row.original.cliente.nombre}
        </p>
        <p className="text-xs text-muted-foreground">DNI {row.original.cliente.dni}</p>
      </div>
    ),
  },
  {
    id: "moto",
    accessorFn: (row) => `${row.moto.marca} ${row.moto.modelo}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Moto" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">
          {row.original.moto.marca} {row.original.moto.modelo}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {row.original.moto.patente ?? "Sin patente"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
  },
  {
    accessorKey: "frecuenciaPago",
    header: "Frecuencia",
    cell: ({ getValue }) => (
      <span className="text-sm">{FRECUENCIA_LABEL[getValue() as string] ?? getValue() as string}</span>
    ),
  },
  {
    accessorKey: "montoPeriodo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto/período" />,
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{formatMoney(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: "duracionMeses",
    header: "Duración",
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue() as number} meses</span>
    ),
  },
  {
    accessorKey: "fechaInicio",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inicio" />,
    cell: ({ getValue }) => (
      <span className="text-sm">{formatDate(getValue() as string | null)}</span>
    ),
  },
  {
    id: "acciones",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/contratos/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];
