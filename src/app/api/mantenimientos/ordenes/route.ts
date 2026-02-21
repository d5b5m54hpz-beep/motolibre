import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { otCreateSchema } from "@/lib/validations/orden-trabajo";
import { proximoNumeroOT } from "@/lib/ot-utils";
import { apiSetup } from "@/lib/api-helpers";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const limit = Number(sp.get("limit") || "50");
  const estado = sp.get("estado");
  const tipo = sp.get("tipo");
  const prioridad = sp.get("prioridad");
  const motoId = sp.get("motoId");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const search = sp.get("search");

  const where: Prisma.OrdenTrabajoWhereInput = {};
  if (estado) where.estado = estado as Prisma.OrdenTrabajoWhereInput["estado"];
  if (tipo) where.tipo = tipo as Prisma.OrdenTrabajoWhereInput["tipo"];
  if (prioridad) where.prioridad = prioridad as Prisma.OrdenTrabajoWhereInput["prioridad"];
  if (motoId) where.motoId = motoId;
  if (desde || hasta) {
    where.fechaSolicitud = {};
    if (desde) where.fechaSolicitud.gte = new Date(desde);
    if (hasta) where.fechaSolicitud.lte = new Date(hasta);
  }
  if (search) {
    where.OR = [
      { numero: { contains: search, mode: "insensitive" } },
      { descripcion: { contains: search, mode: "insensitive" } },
    ];
  }

  const [ordenes, total] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { tareas: true, repuestos: true } },
      },
    }),
    prisma.ordenTrabajo.count({ where }),
  ]);

  return NextResponse.json({ data: ordenes, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = otCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const numero = await proximoNumeroOT();

  const ot = await withEvent(
    OPERATIONS.maintenance.workOrder.create,
    "OrdenTrabajo",
    () =>
      prisma.ordenTrabajo.create({
        data: {
          numero,
          tipo: parsed.data.tipo,
          prioridad: parsed.data.prioridad,
          tipoService: parsed.data.tipoService ?? undefined,
          motoId: parsed.data.motoId,
          descripcion: parsed.data.descripcion,
          fechaProgramada: parsed.data.fechaProgramada ? new Date(parsed.data.fechaProgramada) : undefined,
          tallerNombre: parsed.data.tallerNombre ?? undefined,
          mecanicoNombre: parsed.data.mecanicoNombre ?? undefined,
          mantenimientoProgramadoId: parsed.data.mantenimientoProgramadoId ?? undefined,
          solicitadoPor: userId,
          historial: {
            create: {
              estadoAnterior: "SOLICITADA",
              estadoNuevo: "SOLICITADA",
              descripcion: "OT creada",
              userId,
            },
          },
        },
      }),
    userId
  );

  return NextResponse.json({ data: ot }, { status: 201 });
}
