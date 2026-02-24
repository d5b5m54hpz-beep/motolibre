import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  asunto: z.string().min(1),
  contactoIds: z.array(z.string()).min(1),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
});

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.conversation.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const estado = searchParams.get("estado");
  const contactoId = searchParams.get("contactoId");
  const prioridad = searchParams.get("prioridad");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (prioridad) where.prioridad = prioridad;
  if (contactoId) {
    where.contactos = { some: { contactoId } };
  }
  if (search) {
    where.asunto = { contains: search, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.conversacion.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contactos: {
          include: {
            contacto: {
              select: { id: true, nombre: true, email: true, tipo: true },
            },
          },
        },
        mensajes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            cuerpo: true,
            de: true,
            direccion: true,
            createdAt: true,
          },
        },
        _count: { select: { mensajes: true } },
      },
    }),
    prisma.conversacion.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.conversation.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const conversacion = await prisma.conversacion.create({
    data: {
      asunto: parsed.data.asunto,
      prioridad: parsed.data.prioridad || "MEDIA",
      contactos: {
        create: parsed.data.contactoIds.map((contactoId) => ({
          contactoId,
        })),
      },
    },
    include: {
      contactos: {
        include: {
          contacto: { select: { nombre: true, email: true, tipo: true } },
        },
      },
    },
  });

  console.log(
    `[comunicacion] Conversación creada: "${conversacion.asunto}" por ${session?.user?.name}`
  );

  return NextResponse.json({ data: conversacion }, { status: 201 });
}
