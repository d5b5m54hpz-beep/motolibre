import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 19. resumen_rrhh
toolRegistry.registerTool({
  name: "resumen_rrhh",
  description:
    "Resumen del estado de RRHH: cantidad de empleados activos, masa salarial, ausencias del mes y costo total de nómina.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "RRHH_MANAGER"],
  parameters: z.object({}),
  execute: async () => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const [empleados, ausencias, nomina] = await Promise.all([
      prisma.empleado.findMany({
        where: { estado: "ACTIVO" },
        select: { sueldoBasico: true, departamento: true, cargo: true },
      }),
      prisma.ausencia.count({
        where: {
          estado: { in: ["SOLICITADA", "APROBADA"] },
          fechaDesde: { gte: inicioMes, lt: finMes },
        },
      }),
      prisma.reciboSueldo.aggregate({
        where: {
          estado: "PAGADO",
          createdAt: { gte: inicioMes, lt: finMes },
        },
        _sum: { netoAPagar: true },
        _count: true,
      }),
    ]);

    const masaSalarial = empleados.reduce(
      (sum, e) => sum + Number(e.sueldoBasico),
      0
    );

    const porDepartamento: Record<string, number> = {};
    for (const e of empleados) {
      const dep = e.departamento as string;
      porDepartamento[dep] = (porDepartamento[dep] ?? 0) + 1;
    }

    return {
      empleadosActivos: empleados.length,
      masaSalarialBruta: Math.round(masaSalarial),
      ausenciasMes: ausencias,
      nominaPagadaMes: {
        total: Math.round(Number(nomina._sum.netoAPagar ?? 0)),
        recibos: nomina._count,
      },
      distribucionDepartamento: Object.entries(porDepartamento).map(
        ([dep, count]) => ({ departamento: dep, empleados: count })
      ),
    };
  },
});

// 20. empleados_activos
toolRegistry.registerTool({
  name: "empleados_activos",
  description:
    "Lista empleados activos con su departamento, cargo, legajo y sueldo básico.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "RRHH_MANAGER"],
  parameters: z.object({
    departamento: z
      .enum(["ADMINISTRACION", "OPERACIONES", "TALLER", "COMERCIAL", "GERENCIA"])
      .optional()
      .describe("Filtrar por departamento"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = { estado: "ACTIVO" };
    if (params.departamento) {
      where.departamento = params.departamento;
    }

    const empleados = await prisma.empleado.findMany({
      where,
      select: {
        legajo: true,
        nombre: true,
        apellido: true,
        departamento: true,
        cargo: true,
        sueldoBasico: true,
        jornada: true,
        fechaIngreso: true,
      },
      orderBy: [{ departamento: "asc" }, { apellido: "asc" }],
    });

    return {
      total: empleados.length,
      empleados: empleados.map((e) => ({
        legajo: e.legajo,
        nombre: `${e.nombre} ${e.apellido}`,
        departamento: e.departamento,
        cargo: e.cargo,
        sueldoBasico: Number(e.sueldoBasico),
        jornada: e.jornada,
        antiguedadAnios: Math.floor(
          (Date.now() - e.fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 365)
        ),
      })),
    };
  },
});

// 21. ausencias_recientes
toolRegistry.registerTool({
  name: "ausencias_recientes",
  description:
    "Lista ausencias recientes (últimos 60 días) con estado, tipo, empleado y días hábiles.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "RRHH_MANAGER"],
  parameters: z.object({
    estado: z
      .enum(["SOLICITADA", "APROBADA", "RECHAZADA", "CANCELADA"])
      .optional()
      .describe("Filtrar por estado (default: todas)"),
    limite: z.number().default(20).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 60);

    const where: Record<string, unknown> = { fechaDesde: { gte: desde } };
    if (params.estado) {
      where.estado = params.estado;
    }

    const ausencias = await prisma.ausencia.findMany({
      where,
      select: {
        tipo: true,
        estado: true,
        fechaDesde: true,
        fechaHasta: true,
        diasHabiles: true,
        motivo: true,
        empleado: {
          select: { nombre: true, apellido: true, legajo: true, departamento: true },
        },
      },
      orderBy: { fechaDesde: "desc" },
      take: (params.limite as number) || 20,
    });

    return ausencias.map((a) => ({
      empleado: `${a.empleado.nombre} ${a.empleado.apellido}`,
      legajo: a.empleado.legajo,
      departamento: a.empleado.departamento,
      tipo: a.tipo,
      estado: a.estado,
      desde: a.fechaDesde.toISOString().split("T")[0],
      hasta: a.fechaHasta.toISOString().split("T")[0],
      diasHabiles: a.diasHabiles,
      motivo: a.motivo ?? null,
    }));
  },
});

// 22. nomina_del_periodo
toolRegistry.registerTool({
  name: "nomina_del_periodo",
  description:
    "Lista recibos de sueldo de un período (mes/año) con estado, empleado y montos.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "RRHH_MANAGER"],
  parameters: z.object({
    mes: z.number().optional().describe("Mes (1-12). Default: mes actual"),
    anio: z.number().optional().describe("Año. Default: año actual"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const ahora = new Date();
    const mes = (params.mes as number) || ahora.getMonth() + 1;
    const anio = (params.anio as number) || ahora.getFullYear();
    const periodo = `${anio}-${mes.toString().padStart(2, "0")}`;

    const recibos = await prisma.reciboSueldo.findMany({
      where: { periodo },
      select: {
        numero: true,
        estado: true,
        tipo: true,
        sueldoBasico: true,
        totalHaberes: true,
        totalDeducciones: true,
        netoAPagar: true,
        empleado: {
          select: { nombre: true, apellido: true, legajo: true, departamento: true },
        },
      },
      orderBy: { empleado: { apellido: "asc" } },
    });

    const totales = recibos.reduce(
      (acc, r) => ({
        bruto: acc.bruto + Number(r.totalHaberes),
        descuentos: acc.descuentos + Number(r.totalDeducciones),
        neto: acc.neto + Number(r.netoAPagar),
      }),
      { bruto: 0, descuentos: 0, neto: 0 }
    );

    return {
      periodo,
      totalRecibos: recibos.length,
      totales: {
        bruto: Math.round(totales.bruto),
        descuentos: Math.round(totales.descuentos),
        neto: Math.round(totales.neto),
      },
      recibos: recibos.map((r) => ({
        numero: r.numero,
        empleado: `${r.empleado.nombre} ${r.empleado.apellido}`,
        legajo: r.empleado.legajo,
        departamento: r.empleado.departamento,
        estado: r.estado,
        tipo: r.tipo,
        neto: Math.round(Number(r.netoAPagar)),
      })),
    };
  },
});
