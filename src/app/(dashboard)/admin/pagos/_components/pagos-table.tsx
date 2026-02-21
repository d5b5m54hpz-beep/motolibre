"use client";

import { DataTable } from "@/components/data-table/data-table";
import { pagosColumns } from "./pagos-columns";
import type { PagoMercadoPago } from "@prisma/client";

export function PagosTable({ data }: { data: PagoMercadoPago[] }) {
  return (
    <DataTable
      columns={pagosColumns}
      data={data}
      searchKey="tipo"
      searchPlaceholder="Buscar por tipo..."
    />
  );
}
