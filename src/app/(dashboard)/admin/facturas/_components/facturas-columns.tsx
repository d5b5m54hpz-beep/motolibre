"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Factura } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Send, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

function CAEBadge({ resultado }: { resultado: string | null }) {
  switch (resultado) {
    case "A":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
          <CheckCircle className="h-3.5 w-3.5" />
          CAE
        </span>
      );
    case "STUB":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-t-secondary">
          <AlertTriangle className="h-3.5 w-3.5" />
          Stub
        </span>
      );
    case "PENDIENTE":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
          <Clock className="h-3.5 w-3.5" />
          Pendiente
        </span>
      );
    case "R":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          Rechazada
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-t-secondary">
          <Clock className="h-3.5 w-3.5" />
          —
        </span>
      );
  }
}

export const facturasColumns: ColumnDef<Factura>[] = [
  {
    accessorKey: "numeroCompleto",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
    cell: ({ row }) => (
      <Link
        href={`/admin/facturas/${row.original.id}`}
        className="text-accent-DEFAULT hover:underline font-mono text-sm font-medium"
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
            ? "bg-info-bg text-ds-info"
            : "bg-positive-bg text-positive"
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
          <p className="text-xs text-t-secondary">{row.original.receptorCuit}</p>
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
    id: "afip",
    header: ({ column }) => <DataTableColumnHeader column={column} title="AFIP" />,
    cell: ({ row }) => <CAEBadge resultado={row.original.afipResultado} />,
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
