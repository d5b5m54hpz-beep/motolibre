"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
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
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => accion("completar")}
        disabled={!!loading}
        className="text-positive border-positive/20 hover:bg-positive-bg h-7"
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
        className="text-negative border-negative/20 hover:bg-negative-bg h-7"
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
  // ── Select ──
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
  // ── Día / Hora ──
  {
    accessorKey: "fechaProgramada",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Día / Hora" />,
    cell: ({ row }) => {
      const fecha = new Date(row.original.fechaProgramada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const isVencido = fecha < hoy && row.original.estado === "PROGRAMADO";
      const dia = fecha.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
      const hora = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      return (
        <div className={isVencido ? "text-negative" : ""}>
          <p className="font-medium text-sm capitalize">{dia}</p>
          <p className="text-xs text-muted-foreground">{hora} hs</p>
        </div>
      );
    },
  },
  // ── Moto ──
  {
    id: "motoInfo",
    accessorFn: (row) => `${row.moto.marca} ${row.moto.modelo} ${row.moto.patente ?? ""}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Moto" />,
    cell: ({ row }) => (
      <div>
        <p className="font-mono font-bold text-sm">
          {row.original.moto.patente ?? "Sin patentar"}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.original.moto.marca} {row.original.moto.modelo}
        </p>
      </div>
    ),
  },
  // ── Rider ──
  {
    id: "rider",
    accessorFn: (row) => `${row.cliente.apellido} ${row.cliente.nombre}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rider" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">
          {row.original.cliente.apellido}, {row.original.cliente.nombre}
        </p>
        <p className="text-xs text-muted-foreground">{row.original.cliente.telefono}</p>
      </div>
    ),
  },
  // ── Service Nº ──
  {
    accessorKey: "numero",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Service Nº" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">#{row.original.numero}</span>
    ),
  },
  // ── Estado ──
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Acciones ──
  {
    id: "acciones",
    header: "Acciones",
    cell: AccionesCell,
  },
];
