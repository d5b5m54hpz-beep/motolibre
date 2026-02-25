"use client";

import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import { historialColumns, type HistorialRow } from "./historial-columns";
import { History } from "lucide-react";

const TIPO_AJUSTE_OPTIONS = [
  { label: "Incremento", value: "INCREMENTO" },
  { label: "Decremento", value: "DECREMENTO" },
  { label: "Nuevo", value: "NUEVO" },
];

interface HistorialTableProps {
  data: HistorialRow[];
  marcas: string[];
}

export function HistorialTable({ data, marcas }: HistorialTableProps) {
  const filterableColumns: FilterableColumn[] = [
    { id: "tipoAjuste", title: "Tipo Ajuste", options: TIPO_AJUSTE_OPTIONS },
    ...(marcas.length > 0
      ? [
          {
            id: "tarifa" as const,
            title: "Marca",
            options: marcas.map((m) => ({ label: m, value: m })),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={historialColumns}
      data={data}
      searchableColumns={["tarifa", "campo", "motivo"]}
      searchPlaceholder="Buscar por tarifa, campo, motivo..."
      filterableColumns={filterableColumns}
      emptyState={{
        icon: History,
        title: "Sin historial",
        description: "No se encontraron registros de cambios en tarifas.",
      }}
      defaultPageSize={25}
    />
  );
}
