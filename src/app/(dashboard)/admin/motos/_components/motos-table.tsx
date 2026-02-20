"use client";

import { type Moto } from "@prisma/client";
import { DataTable } from "@/components/data-table/data-table";
import { motosColumns } from "./motos-columns";

type MotoRow = Moto & { _count: { documentos: number; historialEstados: number } };

interface MotosTableProps {
  data: MotoRow[];
}

export function MotosTable({ data }: MotosTableProps) {
  return (
    <DataTable
      columns={motosColumns}
      data={data}
      searchKey="marcaModelo"
      searchPlaceholder="Buscar por patente, marca, modelo..."
    />
  );
}
