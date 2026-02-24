"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import { SheetDetail, DetailField, DetailGrid } from "@/components/ui/sheet-detail";
import { mantenimientosColumns, type MantenimientoRow } from "./mantenimientos-columns";
import { formatDate, formatDateTime } from "@/lib/format";
import { Calendar, Download } from "lucide-react";
import type { BulkAction } from "@/components/data-table/data-table-bulk-actions";

const ESTADO_OPTIONS = [
  "PROGRAMADO", "NOTIFICADO", "COMPLETADO", "NO_ASISTIO", "CANCELADO", "REPROGRAMADO",
].map((e) => ({ label: e.replace(/_/g, " "), value: e }));

const filterableColumns: FilterableColumn[] = [
  { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
];

interface MantenimientosTableProps {
  data: MantenimientoRow[];
}

export function MantenimientosTable({ data }: MantenimientosTableProps) {
  const [selected, setSelected] = useState<MantenimientoRow | null>(null);

  const bulkActions: BulkAction<MantenimientoRow>[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows) => {
        const csv = [
          ["Fecha", "Rider", "Moto", "Patente", "Nº", "Estado"].join(","),
          ...rows.map((r) =>
            [
              formatDate(r.fechaProgramada),
              `${r.cliente.apellido} ${r.cliente.nombre}`,
              `${r.moto.marca} ${r.moto.modelo}`,
              r.moto.patente ?? "",
              r.numero,
              r.estado,
            ].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mantenimientos.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={mantenimientosColumns}
        data={data}
        searchableColumns={["rider", "motoInfo"]}
        searchPlaceholder="Buscar por rider, moto, patente..."
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        onRowClick={(row) => setSelected(row)}
        emptyState={{
          icon: Calendar,
          title: "Sin mantenimientos",
          description: "No hay mantenimientos programados para los filtros seleccionados.",
        }}
        defaultPageSize={20}
      />

      {selected && (
        <MantenimientoSheet
          mant={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </>
  );
}

function MantenimientoSheet({
  mant,
  open,
  onOpenChange,
}: {
  mant: MantenimientoRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tabs = [
    {
      id: "info",
      label: "Info General",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField
              label="Fecha Programada"
              value={formatDateTime(mant.fechaProgramada)}
            />
            <DetailField
              label="Fecha Realizada"
              value={mant.fechaRealizada ? formatDateTime(mant.fechaRealizada) : undefined}
            />
            <DetailField label="Service Nº" value={`#${mant.numero}`} mono />
            <DetailField label="Estado" value={mant.estado.replace(/_/g, " ")} />
          </DetailGrid>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Moto</h4>
            <DetailGrid>
              <DetailField label="Patente" value={mant.moto.patente} mono />
              <DetailField label="Marca / Modelo" value={`${mant.moto.marca} ${mant.moto.modelo}`} />
            </DetailGrid>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Rider</h4>
            <DetailGrid>
              <DetailField label="Nombre" value={`${mant.cliente.apellido}, ${mant.cliente.nombre}`} />
              <DetailField label="Teléfono" value={mant.cliente.telefono} mono />
            </DetailGrid>
          </div>

          {mant.notas && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Notas</h4>
              <p className="text-sm text-muted-foreground">{mant.notas}</p>
            </div>
          )}

          {mant.notasOperador && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Notas del Operador</h4>
              <p className="text-sm text-muted-foreground">{mant.notasOperador}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "tareas",
      label: "Tareas",
      content: (
        <p className="text-sm text-muted-foreground text-center py-8">
          Las tareas se gestionan desde la Orden de Trabajo vinculada.
        </p>
      ),
    },
    {
      id: "repuestos",
      label: "Repuestos",
      content: (
        <p className="text-sm text-muted-foreground text-center py-8">
          Los repuestos se gestionan desde la Orden de Trabajo vinculada.
        </p>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={`Service #${mant.numero}`}
      subtitle={`${mant.moto.patente ?? "Sin patentar"} · ${mant.moto.marca} ${mant.moto.modelo}`}
      status={mant.estado}
      tabs={tabs}
    />
  );
}
