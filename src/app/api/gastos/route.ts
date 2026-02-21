import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { gastoCreateSchema } from "@/lib/validations/gasto";
import { apiSetup } from "@/lib/api-helpers";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.expense.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const limit = Number(sp.get("limit") || "50");
  const categoria = sp.get("categoria");
  const estado = sp.get("estado");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const motoId = sp.get("motoId");
  const search = sp.get("search");

  const where: Prisma.GastoWhereInput = {};
  if (categoria) where.categoria = categoria as Prisma.GastoWhereInput["categoria"];
  if (estado) where.estado = estado as Prisma.GastoWhereInput["estado"];
  if (motoId) where.motoId = motoId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }
  if (search) {
    where.descripcion = { contains: search, mode: "insensitive" };
  }

  const [gastos, total] = await Promise.all([
    prisma.gasto.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.gasto.count({ where }),
  ]);

  return NextResponse.json({ data: gastos, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.finance.expense.create,
    "canCreate",
    ["ADMIN", "OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = gastoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const gasto = await withEvent(
    OPERATIONS.finance.expense.create,
    "Gasto",
    () =>
      prisma.gasto.create({
        data: {
          fecha: new Date(parsed.data.fecha),
          monto: parsed.data.monto,
          categoria: parsed.data.categoria,
          descripcion: parsed.data.descripcion,
          medioPago: parsed.data.medioPago,
          motoId: parsed.data.motoId ?? undefined,
          contratoId: parsed.data.contratoId ?? undefined,
          responsableId: userId,
          estado: "PENDIENTE",
        },
      }),
    userId
  );

  return NextResponse.json({ data: gasto }, { status: 201 });
}
