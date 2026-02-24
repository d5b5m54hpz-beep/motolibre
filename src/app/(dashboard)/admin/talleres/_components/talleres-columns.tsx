"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/format";

export type TallerRow = {
  id: string;
  nombre: string;
  tipo: "INTERNO" | "EXTERNO";
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  especialidades: string[];
  activo: boolean;
  notas: string | null;
  tarifaHora: number | null;
  mecanicosCount: number;
  otActivas: number;
  createdAt: string;
};

export type MecanicoRow = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  especialidad: string | null;
  activo: boolean;
  tallerId: string;
  tallerNombre: string;
  otHoy: number;
  otMes: number;
};

export const talleresColumns: ColumnDef<TallerRow>[] = [
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
  // ── Taller ──
  {
    accessorKey: "nombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Taller" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.nombre}</p>
        {row.original.direccion && (
          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
            {row.original.direccion}
          </p>
        )}
      </div>
    ),
  },
  // ── Tipo ──
  {
    accessorKey: "tipo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.tipo}
        variant={row.original.tipo === "INTERNO" ? "info" : "warning"}
        showDot={false}
        label={row.original.tipo === "INTERNO" ? "Interno" : "Externo"}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Especialidades ──
  {
    accessorKey: "especialidades",
    header: "Especialidades",
    cell: ({ row }) => {
      const esp = row.original.especialidades;
      if (esp.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {esp.slice(0, 3).map((e) => (
            <Badge key={e} variant="outline" className="text-[10px] px-1.5 py-0">
              {e}
            </Badge>
          ))}
          {esp.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              +{esp.length - 3}
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  // ── Mecánicos ──
  {
    id: "mecanicosCount",
    accessorFn: (row) => row.mecanicosCount,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mecánicos" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">
        {row.original.mecanicosCount}
      </span>
    ),
  },
  // ── OT Activas ──
  {
    id: "otActivas",
    accessorFn: (row) => row.otActivas,
    header: ({ column }) => <DataTableColumnHeader column={column} title="OT Activas" />,
    cell: ({ row }) => {
      const count = row.original.otActivas;
      return (
        <span className={`font-mono tabular-nums text-sm ${count > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
          {count}
        </span>
      );
    },
  },
  // ── Tarifa ──
  {
    accessorKey: "tarifaHora",
    header: ({ column }) => <DataTableColumnHeader column={column} title="$/hora" />,
    cell: ({ row }) => {
      const tarifa = row.original.tarifaHora;
      return tarifa ? (
        <span className="font-mono tabular-nums text-sm">{formatMoney(tarifa)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Estado ──
  {
    id: "activo",
    accessorFn: (row) => (row.activo ? "Activo" : "Inactivo"),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
        label={row.original.activo ? "Activo" : "Inactivo"}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── Contacto (hidden default) ──
  {
    accessorKey: "contacto",
    header: "Contacto",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.contacto ?? "—"}</span>
    ),
  },
  // ── Teléfono (hidden default) ──
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.telefono ?? "—"}</span>
    ),
  },
];

export const defaultHiddenTallerColumns: Record<string, boolean> = {
  contacto: false,
  telefono: false,
};

// ── Mecánicos columns ──

export const mecanicosColumns: ColumnDef<MecanicoRow>[] = [
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
  // ── Mecánico ──
  {
    id: "nombreCompleto",
    accessorFn: (row) => `${row.nombre} ${row.apellido}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mecánico" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {row.original.nombre[0]}{row.original.apellido[0]}
        </div>
        <div>
          <p className="font-medium">{row.original.nombre} {row.original.apellido}</p>
        </div>
      </div>
    ),
  },
  // ── Taller ──
  {
    id: "taller",
    accessorFn: (row) => row.tallerNombre,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Taller" />,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.tallerNombre}</span>
    ),
  },
  // ── Especialidad ──
  {
    accessorKey: "especialidad",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Especialidad" />,
    cell: ({ row }) => {
      const esp = row.original.especialidad;
      return esp ? (
        <Badge variant="outline" className="text-xs">{esp}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  // ── Estado ──
  {
    id: "activo",
    accessorFn: (row) => (row.activo ? "Activo" : "Inactivo"),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
        label={row.original.activo ? "Activo" : "Inactivo"}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  // ── OT Hoy ──
  {
    id: "otHoy",
    accessorFn: (row) => row.otHoy,
    header: ({ column }) => <DataTableColumnHeader column={column} title="OT Hoy" />,
    cell: ({ row }) => (
      <span className={`font-mono tabular-nums text-sm ${row.original.otHoy > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
        {row.original.otHoy}
      </span>
    ),
  },
  // ── OT Mes ──
  {
    id: "otMes",
    accessorFn: (row) => row.otMes,
    header: ({ column }) => <DataTableColumnHeader column={column} title="OT Mes" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">{row.original.otMes}</span>
    ),
  },
  // ── Teléfono ──
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.telefono ?? "—"}</span>
    ),
  },
];
