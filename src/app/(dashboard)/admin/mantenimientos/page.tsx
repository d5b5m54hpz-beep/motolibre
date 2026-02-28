import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { MantenimientosTable } from "./_components/mantenimientos-table";
import { Calendar, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { EstadoMantenimiento, Prisma } from "@prisma/client";

async function getMantenimientos(
  estado: string | null,
  desde: string | null,
  hasta: string | null
) {
  const where: Prisma.MantenimientoProgramadoWhereInput = {};
  if (estado) where.estado = estado as EstadoMantenimiento;
  if (desde || hasta) {
    where.fechaProgramada = {};
    if (desde) (where.fechaProgramada as Prisma.DateTimeFilter).gte = new Date(desde);
    if (hasta) (where.fechaProgramada as Prisma.DateTimeFilter).lte = new Date(hasta);
  }

  return prisma.mantenimientoProgramado.findMany({
    where,
    orderBy: { fechaProgramada: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      contrato: { select: { id: true } },
    },
  });
}

async function getStats() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const semana = new Date(hoy.getTime() + 7 * 86400000);
  const startOfMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [hoyCount, semanaCount, completadosMes, noAsistioMes] = await Promise.all([
    prisma.mantenimientoProgramado.count({
      where: { fechaProgramada: { gte: hoy, lt: manana }, estado: "PROGRAMADO" },
    }),
    prisma.mantenimientoProgramado.count({
      where: { fechaProgramada: { gte: hoy, lt: semana }, estado: "PROGRAMADO" },
    }),
    prisma.mantenimientoProgramado.count({
      where: { estado: "COMPLETADO", fechaRealizada: { gte: startOfMonth } },
    }),
    prisma.mantenimientoProgramado.count({
      where: { estado: "NO_ASISTIO", fechaRealizada: { gte: startOfMonth } },
    }),
  ]);

  return { hoyCount, semanaCount, completadosMes, noAsistioMes };
}

const FILTROS = [
  { label: "Próximos 7 días", href: "/admin/mantenimientos" },
  { label: "Todos Programados", href: "/admin/mantenimientos?estado=PROGRAMADO" },
  { label: "Completados", href: "/admin/mantenimientos?estado=COMPLETADO" },
  { label: "No Asistió", href: "/admin/mantenimientos?estado=NO_ASISTIO" },
];

export default async function MantenimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; desde?: string; hasta?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const sp = await searchParams;

  const estadoFiltro = sp.estado ?? null;
  let desdeStr = sp.desde ?? null;
  let hastaStr = sp.hasta ?? null;

  if (!sp.estado && !sp.desde && !sp.hasta) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    desdeStr = hoy.toISOString();
    const semana = new Date(hoy.getTime() + 7 * 86400000);
    hastaStr = semana.toISOString();
  }

  const [mantenimientos, stats] = await Promise.all([
    getMantenimientos(estadoFiltro, desdeStr, hastaStr),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mantenimientos Programados"
        description="Agenda de revisiones técnicas obligatorias"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/mantenimientos/ordenes">Órdenes de Trabajo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/mantenimientos/planes">Planes Service</Link>
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Programados Hoy"
          value={stats.hoyCount}
          icon={Calendar}
        />
        <KPICard
          label="Esta Semana"
          value={stats.semanaCount}
          icon={CalendarDays}
        />
        <KPICard
          label="Completados (mes)"
          value={stats.completadosMes}
          icon={CheckCircle2}
        />
        <KPICard
          label="No Asistieron (mes)"
          value={stats.noAsistioMes}
          icon={XCircle}
        />
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 text-sm">
        {FILTROS.map((f) => {
          const isActive =
            f.href === "/admin/mantenimientos"
              ? !sp.estado && !sp.desde && !sp.hasta
              : sp.estado === f.href.split("estado=")[1];
          return (
            <a
              key={f.label}
              href={f.href}
              className={`rounded-md border px-3 py-1.5 transition-colors ${
                isActive ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              }`}
            >
              {f.label}
            </a>
          );
        })}
      </div>

      <MantenimientosTable data={mantenimientos} />
    </div>
  );
}
