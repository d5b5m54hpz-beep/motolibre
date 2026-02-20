"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type ClienteRow = Prisma.ClienteGetPayload<{
  include: { _count: { select: { documentos: true } } };
}>;

export const clientesColumns: ColumnDef<ClienteRow>[] = [
  {
    id: "nombreCompleto",
    accessorFn: (row) => `${row.apellido} ${row.nombre}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.apellido}, {row.original.nombre}
        </p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "dni",
    header: ({ column }) => <DataTableColumnHeader column={column} title="DNI" />,
    cell: ({ getValue }) => (
      <span className="font-mono text-sm">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
  },
  {
    accessorKey: "score",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Score" />,
    cell: ({ getValue }) => {
      const score = getValue() as number | null;
      if (score === null || score === 0) return <span className="text-muted-foreground">—</span>;
      const color =
        score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";
      return <span className={`font-medium tabular-nums ${color}`}>{score}/100</span>;
    },
  },
  {
    accessorKey: "plataformas",
    header: "Plataformas",
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{(getValue() as string | null) ?? "—"}</span>
    ),
  },
  {
    id: "docs",
    header: "Docs",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original._count.documentos}
      </span>
    ),
  },
  {
    id: "acciones",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/clientes/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];
