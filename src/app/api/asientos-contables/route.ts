import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { asientoCreateSchema } from "@/lib/validations/asiento";
import { crearAsiento } from "@/lib/contabilidad-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.accounting.entry.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "50");
  const tipo = sp.get("tipo");
  const periodoId = sp.get("periodoId");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (periodoId) where.periodoId = periodoId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) (where.fecha as Record<string, unknown>).gte = new Date(desde);
    if (hasta) (where.fecha as Record<string, unknown>).lte = new Date(hasta);
  }
  if (search) {
    where.OR = [
      { descripcion: { contains: search, mode: "insensitive" } },
      { origenTipo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.asientoContable.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        periodo: { select: { id: true, nombre: true } },
        _count: { select: { lineas: true } },
      },
    }),
    prisma.asientoContable.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.accounting.entry.create,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = asientoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const asiento = await withEvent(
      OPERATIONS.accounting.entry.create,
      "AsientoContable",
      () =>
        crearAsiento({
          fecha: new Date(parsed.data.fecha),
          tipo: parsed.data.tipo,
          descripcion: parsed.data.descripcion,
          lineas: parsed.data.lineas,
          userId: userId ?? undefined,
        }),
      userId
    );

    return NextResponse.json({ data: asiento }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al crear asiento";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
