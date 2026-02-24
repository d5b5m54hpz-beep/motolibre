import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  empresa: z.string().nullable().optional(),
  tipo: z
    .enum([
      "PROVEEDOR",
      "CONTADOR",
      "ABOGADO",
      "DESPACHANTE",
      "ASEGURADORA",
      "TALLER_EXTERNO",
      "CLIENTE_POTENCIAL",
      "OTRO",
    ])
    .optional(),
  telefono: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  activo: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.contact.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const contacto = await prisma.contacto.findUnique({
    where: { id },
    include: {
      conversaciones: {
        include: {
          conversacion: {
            select: { id: true, asunto: true, estado: true, updatedAt: true },
          },
        },
        orderBy: { conversacion: { updatedAt: "desc" } },
        take: 10,
      },
    },
  });

  if (!contacto) {
    return NextResponse.json(
      { error: "Contacto no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: contacto });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.contact.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const contacto = await prisma.contacto.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: contacto });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.contact.deactivate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  await prisma.contacto.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ ok: true });
}
