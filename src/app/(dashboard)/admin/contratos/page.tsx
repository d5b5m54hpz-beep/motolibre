import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ContratosTable } from "./_components/contratos-table";

async function getContratos() {
  return prisma.contrato.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true, apellido: true, dni: true } },
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      _count: { select: { cuotas: true } },
    },
  });
}

async function getStats() {
  const [total, byEstado] = await Promise.all([
    prisma.contrato.count(),
    prisma.contrato.groupBy({ by: ["estado"], _count: { estado: true } }),
  ]);
  return {
    total,
    byEstado: Object.fromEntries(byEstado.map((e) => [e.estado, e._count.estado])),
  };
}

export default async function ContratosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [contratos, stats] = await Promise.all([getContratos(), getStats()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos de Alquiler"
        description={`${stats.total} contratos${stats.byEstado["ACTIVO"] ? ` · ${stats.byEstado["ACTIVO"]} activos` : ""}`}
      />

      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.entries(stats.byEstado).map(([estado, count]) => (
            <div key={estado} className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm px-3 py-1.5">
              <span className="text-muted-foreground">{estado.replace(/_/g, " ")}:</span>{" "}
              <span className="font-medium">{count as number}</span>
            </div>
          ))}
        </div>
      )}

      <ContratosTable data={contratos} />
    </div>
  );
}
