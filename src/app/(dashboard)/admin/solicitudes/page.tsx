import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SolicitudesTable } from "./_components/solicitudes-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { EstadoSolicitud } from "@prisma/client";

const ESTADO_TABS = [
  { label: "Pendientes Evaluación", estado: "PAGADA" },
  { label: "Lista de Espera", estado: "EN_ESPERA" },
  { label: "Asignadas", estado: "ASIGNADA" },
  { label: "Todas", estado: null },
];

async function getSolicitudes(estado: string | null) {
  return prisma.solicitud.findMany({
    where: estado ? { estado: estado as EstadoSolicitud } : undefined,
    orderBy: [{ prioridadEspera: "asc" }, { createdAt: "asc" }],
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
    },
  });
}

async function getStats() {
  const [pendientes, enEspera, asignadas, total] = await Promise.all([
    prisma.solicitud.count({ where: { estado: "PAGADA" } }),
    prisma.solicitud.count({ where: { estado: "EN_ESPERA" } }),
    prisma.solicitud.count({ where: { estado: "ASIGNADA" } }),
    prisma.solicitud.count(),
  ]);
  return { pendientes, enEspera, asignadas, total };
}

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const sp = await searchParams;
  const estadoFiltro = sp.estado ?? null;

  const [solicitudes, stats] = await Promise.all([
    getSolicitudes(estadoFiltro),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de Alquiler"
        description={`${stats.total} solicitudes · ${stats.pendientes} pendientes · ${stats.enEspera} en espera`}
      />

      {/* Tabs de estado */}
      <div className="flex flex-wrap gap-2">
        {ESTADO_TABS.map((tab) => {
          const isActive = estadoFiltro === tab.estado;
          return (
            <Button
              key={tab.label}
              variant={isActive ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={
                  tab.estado
                    ? `/admin/solicitudes?estado=${tab.estado}`
                    : "/admin/solicitudes"
                }
              >
                {tab.label}
                {tab.estado === "PAGADA" && stats.pendientes > 0 && (
                  <span className="ml-2 rounded-full bg-yellow-500 text-white text-xs px-1.5 py-0.5">
                    {stats.pendientes}
                  </span>
                )}
                {tab.estado === "EN_ESPERA" && stats.enEspera > 0 && (
                  <span className="ml-2 rounded-full bg-blue-500 text-white text-xs px-1.5 py-0.5">
                    {stats.enEspera}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </div>

      <SolicitudesTable data={solicitudes} />
    </div>
  );
}
