"use client";

import { DataTable } from "@/components/data-table/data-table";
import { clientesColumns } from "./clientes-columns";
import type { Prisma } from "@prisma/client";

type ClienteRow = Prisma.ClienteGetPayload<{
  include: { _count: { select: { documentos: true } } };
}>;

export function ClientesTable({ data }: { data: ClienteRow[] }) {
  return (
    <DataTable
      columns={clientesColumns}
      data={data}
      searchKey="nombreCompleto"
      searchPlaceholder="Buscar por nombre, apellido..."
    />
  );
}
