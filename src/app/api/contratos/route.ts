import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { contratoCreateSchema } from "@/lib/validations/contrato";
import { calcularMontoPeriodo } from "@/lib/contrato-utils";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");
  const estado = sp.get("estado");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (search) {
    where.OR = [
      { cliente: { nombre: { contains: search, mode: "insensitive" } } },
      { cliente: { apellido: { contains: search, mode: "insensitive" } } },
      { cliente: { dni: { contains: search, mode: "insensitive" } } },
      { moto: { patente: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contrato.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        cliente: { select: { id: true, nombre: true, apellido: true, dni: true, email: true } },
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        _count: { select: { cuotas: true } },
      },
    }),
    prisma.contrato.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = contratoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  if (cliente.estado !== "APROBADO") {
    return NextResponse.json({ error: "Solo clientes APROBADOS pueden firmar contrato." }, { status: 422 });
  }

  const moto = await prisma.moto.findUnique({ where: { id: data.motoId } });
  if (!moto) return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  if (moto.estado !== "DISPONIBLE") {
    return NextResponse.json({ error: "Solo motos DISPONIBLES pueden asignarse a contrato." }, { status: 422 });
  }
  if (!moto.precioAlquilerMensual) {
    return NextResponse.json({ error: "Moto sin precio de alquiler" }, { status: 422 });
  }

  const contratoActivo = await prisma.contrato.findFirst({
    where: { clienteId: data.clienteId, estado: "ACTIVO" },
  });
  if (contratoActivo) {
    return NextResponse.json({ error: "El cliente ya tiene un contrato activo" }, { status: 422 });
  }

  const montoPeriodo = calcularMontoPeriodo(Number(moto.precioAlquilerMensual), data.frecuenciaPago);
  const estadoAnteriorMoto = moto.estado;

  const contrato = await withEvent(
    OPERATIONS.commercial.contract.create,
    "Contrato",
    () =>
      prisma.$transaction(async (tx) => {
        const c = await tx.contrato.create({
          data: {
            clienteId: data.clienteId,
            motoId: data.motoId,
            frecuenciaPago: data.frecuenciaPago,
            montoPeriodo,
            deposito: data.deposito,
            duracionMeses: data.duracionMeses,
            tieneOpcionCompra: data.tieneOpcionCompra,
            precioCompra: data.precioCompra ?? undefined,
            renovacionAuto: data.renovacionAuto ?? false,
            notas: data.notas,
            creadoPor: userId,
          },
          include: {
            cliente: { select: { nombre: true, apellido: true } },
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
        });

        await tx.moto.update({
          where: { id: data.motoId },
          data: { estado: "RESERVADA", estadoAnterior: estadoAnteriorMoto },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: data.motoId,
            estadoAnterior: estadoAnteriorMoto,
            estadoNuevo: "RESERVADA",
            motivo: `Reservada para contrato ${c.id}`,
            userId,
          },
        });

        return c;
      }),
    userId,
    { clienteId: data.clienteId, motoId: data.motoId }
  );

  return NextResponse.json({ data: contrato }, { status: 201 });
}
