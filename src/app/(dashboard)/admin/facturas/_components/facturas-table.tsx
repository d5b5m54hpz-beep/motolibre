"use client";

import type { Factura } from "@prisma/client";
import { DataTable } from "@/components/data-table/data-table";
import { facturasColumns } from "./facturas-columns";

interface FacturasTableProps {
  data: Factura[];
}

export function FacturasTable({ data }: FacturasTableProps) {
  return <DataTable columns={facturasColumns} data={data} />;
}
