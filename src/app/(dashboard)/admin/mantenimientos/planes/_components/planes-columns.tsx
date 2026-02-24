"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";

export type PlanRow = {
  id: string;
  nombre: string;
  tipoService: string;
  descripcion: string | null;
  marcaMoto: string | null;
  modeloMoto: string | null;
  kmIntervalo: number | null;
  diasIntervalo: number | null;
  garantiaMeses: number | null;
  garantiaKm: number | null;
  estado: string;
  activo: boolean;
  tareasCount: number;
  repuestosCount: number;
  tiempoTotal: number;
  costoRepuestos: number;
  createdAt: string;
};

const TIPO_LABELS: Record<string, string> = {
  SERVICE_5000KM: "5.000 km",
  SERVICE_10000KM: "10.000 km",
  SERVICE_15000KM: "15.000 km",
  SERVICE_20000KM: "20.000 km",
  SERVICE_GENERAL: "General",
  REPARACION: "Reparación",
  INSPECCION: "Inspección",
  OTRO: "Otro",
};

export const planesColumns: ColumnDef<PlanRow>[] = [
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
  // ── Plan ──
  {
    accessorKey: "nombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.nombre}</p>
        {row.original.descripcion && (
          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
            {row.original.descripcion}
          </p>
        )}
      </div>
    ),
  },
  // ── Tipo ──
  {
    accessorKey: "tipoService",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.tipoService}
        variant="info"
        showDot={false}
        label={TIPO_LABELS[row.original.tipoService] ?? row.original.tipoService}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Modelo ──
  {
    id: "modelo",
    accessorFn: (row) => `${row.marcaMoto ?? ""} ${row.modeloMoto ?? ""}`.trim() || "Todos",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
    cell: ({ row }) => {
      const marca = row.original.marcaMoto;
      const modelo = row.original.modeloMoto;
      if (!marca && !modelo) {
        return <span className="text-muted-foreground text-sm">Todos</span>;
      }
      return (
        <span className="text-sm">
          {marca} {modelo}
        </span>
      );
    },
  },
  // ── Intervalo ──
  {
    id: "intervalo",
    accessorFn: (row) => row.kmIntervalo ?? 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Intervalo" />,
    cell: ({ row }) => {
      const km = row.original.kmIntervalo;
      const dias = row.original.diasIntervalo;
      if (!km && !dias) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-mono tabular-nums text-sm">
          {km ? `${km.toLocaleString("es-AR")} km` : ""}
          {km && dias ? " / " : ""}
          {dias ? `${dias} días` : ""}
        </span>
      );
    },
  },
  // ── Tareas ──
  {
    id: "tareasCount",
    accessorFn: (row) => row.tareasCount,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tareas" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">{row.original.tareasCount}</span>
    ),
  },
  // ── Repuestos ──
  {
    id: "repuestosCount",
    accessorFn: (row) => row.repuestosCount,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Repuestos" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">{row.original.repuestosCount}</span>
    ),
  },
  // ── Tiempo ──
  {
    id: "tiempoTotal",
    accessorFn: (row) => row.tiempoTotal,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tiempo" />,
    cell: ({ row }) => {
      const min = row.original.tiempoTotal;
      return min > 0 ? (
        <span className="font-mono tabular-nums text-sm">{min} min</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Estado ──
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
];
