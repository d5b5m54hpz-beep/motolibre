"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Factura } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Send } from "lucide-react";

export const facturasColumns: ColumnDef<Factura>[] = [
  {
    accessorKey: "numeroCompleto",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
    cell: ({ row }) => (
      <Link
        href={`/admin/facturas/${row.original.id}`}
        className="text-[#23e0ff] hover:underline font-mono text-sm font-medium"
      >
        {row.original.numeroCompleto}
      </Link>
    ),
  },
  {
    accessorKey: "tipo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
          row.original.tipo === "A"
            ? "bg-blue-500/20 text-blue-400"
            : "bg-green-500/20 text-green-400"
        }`}
      >
        {row.original.tipo}
      </span>
    ),
  },
  {
    accessorKey: "receptorNombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.receptorNombre}</p>
        {row.original.receptorCuit && (
          <p className="text-xs text-muted-foreground">{row.original.receptorCuit}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "montoTotal",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {formatMoney(Number(row.original.montoTotal))}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
  },
  {
    accessorKey: "fechaEmision",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {new Date(row.original.fechaEmision).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild title="Ver PDF">
          <a
            href={`/api/facturas/${row.original.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="h-4 w-4" />
          </a>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Ver detalle">
          <Link href={`/admin/facturas/${row.original.id}`}>
            <Send className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ),
  },
];
