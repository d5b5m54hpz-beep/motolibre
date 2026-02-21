"use client";

import { DataTable } from "@/components/data-table/data-table";
import { solicitudesColumns } from "./solicitudes-columns";
import type { Prisma } from "@prisma/client";

type SolicitudRow = Prisma.SolicitudGetPayload<{
  include: {
    cliente: { select: { id: true; nombre: true; apellido: true; dni: true; email: true; telefono: true } };
    moto: { select: { id: true; marca: true; modelo: true; patente: true } };
  };
}>;

export function SolicitudesTable({ data }: { data: SolicitudRow[] }) {
  return (
    <DataTable
      columns={solicitudesColumns}
      data={data}
      searchKey="cliente"
      searchPlaceholder="Buscar por cliente o DNI..."
    />
  );
}
