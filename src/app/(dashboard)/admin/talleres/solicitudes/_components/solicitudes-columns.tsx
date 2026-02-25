"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export type SolicitudTallerRow = {
  id: string;
  estado: string;
  nombreTaller: string;
  razonSocial: string | null;
  cuit: string | null;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  email: string;
  contactoNombre: string;
  contactoCargo: string | null;
  contactoCelular: string | null;
  cantidadMecanicos: number;
  especialidades: string[];
  marcasExperiencia: string[];
  capacidadOTMes: number | null;
  scoreTotal: number | null;
  tokenPublico: string;
  fechaRecepcion: string | null;
  fechaAprobacion: string | null;
  createdAt: string;
  _count: { evaluaciones: number };
};

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  RECIBIDA: "Recibida",
  INCOMPLETA: "Incompleta",
  EN_EVALUACION: "En Evaluación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EN_ESPERA: "En Espera",
  CONVENIO_ENVIADO: "Convenio Enviado",
  CONVENIO_FIRMADO: "Convenio Firmado",
  ONBOARDING: "Onboarding",
  ACTIVO: "Activo",
};

export const solicitudesColumns: ColumnDef<SolicitudTallerRow>[] = [
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
  {
    accessorKey: "nombreTaller",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Taller" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.nombreTaller}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.ciudad}, {row.original.provincia}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "contactoNombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contacto" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.contactoNombre}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.estado}
        label={ESTADO_LABELS[row.original.estado] ?? row.original.estado}
      />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "provincia",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Provincia" />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "cantidadMecanicos",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mecánicos" />
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">
        {row.original.cantidadMecanicos}
      </span>
    ),
  },
  {
    accessorKey: "scoreTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Score" />
    ),
    cell: ({ row }) => {
      const score = row.original.scoreTotal;
      if (score == null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-mono tabular-nums text-sm font-medium">
          {score.toFixed(1)}/10
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creada" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.createdAt), {
          addSuffix: true,
          locale: es,
        })}
      </span>
    ),
  },
];

export const defaultHiddenSolicitudColumns: Record<string, boolean> = {
  provincia: false,
  cantidadMecanicos: false,
};
