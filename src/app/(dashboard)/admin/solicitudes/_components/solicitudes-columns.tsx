"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatMoney, formatDate } from "@/lib/format";

type SolicitudRow = Prisma.SolicitudGetPayload<{
  include: {
    cliente: { select: { id: true; nombre: true; apellido: true; dni: true; email: true; telefono: true } };
    moto: { select: { id: true; marca: true; modelo: true; patente: true } };
  };
}>;

const PLAN_LABEL: Record<string, string> = {
  MESES_3: "3 meses",
  MESES_6: "6 meses",
  MESES_9: "9 meses",
  MESES_12: "12 meses",
  MESES_24: "24 meses",
};

export const solicitudesColumns: ColumnDef<SolicitudRow>[] = [
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
    id: "modelo",
    accessorFn: (row) => `${row.marcaDeseada} ${row.modeloDeseado}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo Solicitado" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">
          {row.original.marcaDeseada} {row.original.modeloDeseado}
        </p>
        <p className="text-xs text-muted-foreground">{row.original.condicionDeseada}</p>
      </div>
    ),
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ getValue }) => (
      <span className="text-sm">{PLAN_LABEL[getValue() as string] ?? getValue() as string}</span>
    ),
  },
  {
    accessorKey: "montoPrimerMes",
    header: ({ column }) => <DataTableColumnHeader column={column} title="1er Mes" />,
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{formatMoney(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
  },
  {
    accessorKey: "prioridadEspera",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Prioridad" />,
    cell: ({ getValue }) => {
      const p = getValue() as number | null;
      return p !== null ? (
        <span className="font-mono font-medium text-sm">#{p}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{formatDate(getValue() as string)}</span>
    ),
  },
  {
    id: "acciones",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/solicitudes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];
