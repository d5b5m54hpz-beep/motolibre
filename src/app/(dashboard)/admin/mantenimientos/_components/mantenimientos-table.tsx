"use client";

import { DataTable } from "@/components/data-table/data-table";
import { mantenimientosColumns, type MantenimientoRow } from "./mantenimientos-columns";

interface MantenimientosTableProps {
  data: MantenimientoRow[];
}

export function MantenimientosTable({ data }: MantenimientosTableProps) {
  return (
    <DataTable
      columns={mantenimientosColumns}
      data={data}
      searchKey="cliente"
      searchPlaceholder="Buscar por rider..."
    />
  );
}
