"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { PagoMercadoPago } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format";
import Link from "next/link";

const TIPO_LABEL: Record<string, string> = {
  PRIMER_MES: "Primer mes",
  CUOTA_RECURRENTE: "Cuota recurrente",
  CUOTA_INDIVIDUAL: "Cuota individual",
  REFUND: "Reembolso",
};


export const pagosColumns: ColumnDef<PagoMercadoPago>[] = [
  {
    accessorKey: "tipo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <span className="text-xs font-medium">{TIPO_LABEL[row.original.tipo] ?? row.original.tipo}</span>
    ),
  },
  {
    accessorKey: "monto",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
    cell: ({ row }) => (
      <span className="font-mono">{formatMoney(Number(row.original.monto))}</span>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
  },
  {
    accessorKey: "mpPaymentMethodId",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Medio de Pago" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.mpPaymentMethodId ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "fechaPago",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const fecha = row.original.fechaPago;
      if (!fecha) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm">
          {new Date(fecha).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      );
    },
  },
  {
    id: "referencia",
    header: "Referencia",
    cell: ({ row }) => {
      const { solicitudId, contratoId } = row.original;
      if (solicitudId) {
        return (
          <Link
            href={`/admin/solicitudes/${solicitudId}`}
            className="text-accent-DEFAULT hover:underline text-sm"
          >
            Solicitud
          </Link>
        );
      }
      if (contratoId) {
        return (
          <Link
            href={`/admin/contratos/${contratoId}`}
            className="text-accent-DEFAULT hover:underline text-sm"
          >
            Contrato
          </Link>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "mpPaymentId",
    header: "ID MP",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        {row.original.mpPaymentId ?? "—"}
      </span>
    ),
  },
];
