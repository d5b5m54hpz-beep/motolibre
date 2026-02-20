import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MotosTable } from "./_components/motos-table";

async function getMotos() {
  return prisma.moto.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documentos: true, historialEstados: true } },
    },
  });
}

async function getStats() {
  const [total, byEstado] = await Promise.all([
    prisma.moto.count(),
    prisma.moto.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
  ]);

  return {
    total,
    byEstado: Object.fromEntries(byEstado.map((e) => [e.estado, e._count.estado])),
  };
}

export default async function MotosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [motos, stats] = await Promise.all([getMotos(), getStats()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Motos"
        description={`${stats.total} motos en flota`}
      />

      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.entries(stats.byEstado).map(([estado, count]) => (
            <div key={estado} className="rounded-md border px-3 py-1.5">
              <span className="text-muted-foreground">{estado.replace(/_/g, " ")}:</span>{" "}
              <span className="font-medium">{count as number}</span>
            </div>
          ))}
        </div>
      )}

      <MotosTable data={motos} />
    </div>
  );
}
