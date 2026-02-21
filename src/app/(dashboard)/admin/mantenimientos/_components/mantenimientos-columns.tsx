"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type MantenimientoRow = {
  id: string;
  numero: number;
  fechaProgramada: Date;
  fechaRealizada: Date | null;
  estado: string;
  notas: string | null;
  notasOperador: string | null;
  cliente: { id: string; nombre: string; apellido: string; telefono: string };
  moto: { id: string; marca: string; modelo: string; patente: string | null };
  contrato: { id: string };
};

function AccionesCell({ row }: { row: { original: MantenimientoRow } }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const mant = row.original;

  if (mant.estado !== "PROGRAMADO" && mant.estado !== "NOTIFICADO") {
    return null;
  }

  async function accion(tipo: "completar" | "no-asistio") {
    setLoading(tipo);
    try {
      await fetch(`/api/mantenimientos/${mant.id}/${tipo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => accion("completar")}
        disabled={!!loading}
        className="text-green-600 border-green-200 hover:bg-green-50"
        title="Completado"
      >
        {loading === "completar" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => accion("no-asistio")}
        disabled={!!loading}
        className="text-red-600 border-red-200 hover:bg-red-50"
        title="No asistió"
      >
        {loading === "no-asistio" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export const mantenimientosColumns: ColumnDef<MantenimientoRow>[] = [
  {
    accessorKey: "fechaProgramada",
    header: "Fecha Programada",
    cell: ({ row }) => {
      const fecha = new Date(row.original.fechaProgramada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const isVencido = fecha < hoy && row.original.estado === "PROGRAMADO";
      return (
        <span className={isVencido ? "text-red-500 font-medium" : ""}>
          {formatDate(row.original.fechaProgramada)}
        </span>
      );
    },
  },
  {
    accessorKey: "cliente",
    header: "Rider",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.cliente.apellido}, {row.original.cliente.nombre}
        </p>
        <p className="text-xs text-muted-foreground">{row.original.cliente.telefono}</p>
      </div>
    ),
  },
  {
    accessorKey: "moto",
    header: "Moto",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.moto.marca} {row.original.moto.modelo}
        </p>
        {row.original.moto.patente && (
          <p className="text-xs font-mono text-muted-foreground">{row.original.moto.patente}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "numero",
    header: "N°",
    cell: ({ row }) => (
      <span className="font-mono text-sm">#{row.original.numero}</span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: AccionesCell,
  },
];
