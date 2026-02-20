import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ClientesTable } from "./_components/clientes-table";
import { ClienteFormDialog } from "./_components/cliente-form-dialog";

async function getClientes() {
  return prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documentos: true } },
    },
  });
}

async function getStats() {
  const [total, byEstado, pendientes] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
    prisma.cliente.count({ where: { estado: "PENDIENTE" } }),
  ]);

  return {
    total,
    pendientes,
    byEstado: Object.fromEntries(byEstado.map((e) => [e.estado, e._count.estado])),
  };
}

export default async function ClientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [clientes, stats] = await Promise.all([getClientes(), getStats()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clientes"
        description={`${stats.total} clientes${stats.pendientes > 0 ? ` · ${stats.pendientes} pendientes de aprobación` : ""}`}
        actions={<ClienteFormDialog />}
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

      <ClientesTable data={clientes} />
    </div>
  );
}
