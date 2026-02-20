"use client";

import { DataTable } from "@/components/data-table/data-table";
import { contratosColumns } from "./contratos-columns";
import type { Prisma } from "@prisma/client";

type ContratoRow = Prisma.ContratoGetPayload<{
  include: {
    cliente: { select: { id: true; nombre: true; apellido: true; dni: true } };
    moto: { select: { id: true; marca: true; modelo: true; patente: true } };
    _count: { select: { cuotas: true } };
  };
}>;

export function ContratosTable({ data }: { data: ContratoRow[] }) {
  return (
    <DataTable
      columns={contratosColumns}
      data={data}
      searchKey="cliente"
      searchPlaceholder="Buscar por cliente o moto..."
    />
  );
}
