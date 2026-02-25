import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { HistorialTable } from "./_components/historial-table";

async function getHistorial() {
  return prisma.historialTarifa.findMany({
    include: {
      tarifaAlquiler: {
        select: {
          marca: true,
          modelo: true,
          condicion: true,
          plan: true,
          frecuencia: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

async function getMarcas() {
  const marcas = await prisma.tarifaAlquiler.findMany({
    select: { marca: true },
    distinct: ["marca"],
    orderBy: { marca: "asc" },
  });
  return marcas.map((m) => m.marca);
}

export default async function HistorialTarifasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [rawHistorial, marcas] = await Promise.all([
    getHistorial(),
    getMarcas(),
  ]);

  const tableData = rawHistorial.map((h) => ({
    id: h.id,
    tarifaAlquilerId: h.tarifaAlquilerId,
    campo: h.campo,
    valorAnterior: h.valorAnterior,
    valorNuevo: h.valorNuevo,
    tipoAjuste: h.tipoAjuste,
    motivo: h.motivo,
    userId: h.userId,
    createdAt: h.createdAt.toISOString(),
    tarifaMarca: h.tarifaAlquiler.marca,
    tarifaModelo: h.tarifaAlquiler.modelo,
    tarifaCondicion: h.tarifaAlquiler.condicion,
    tarifaPlan: h.tarifaAlquiler.plan,
    tarifaFrecuencia: h.tarifaAlquiler.frecuencia,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Tarifas"
        description="Registro de todos los cambios realizados en las tarifas de alquiler"
      />

      <HistorialTable data={tableData} marcas={marcas} />
    </div>
  );
}
