import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { enviarBienvenidaTaller } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Generates a network code like "ML-CABA-001" based on the province.
 */
async function generarCodigoRed(provincia: string): Promise<string> {
  const abrev = provincia
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 4);

  const count = await prisma.taller.count({
    where: { codigoRed: { startsWith: `ML-${abrev}-` } },
  });

  const num = String(count + 1).padStart(3, "0");
  return `ML-${abrev}-${num}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.activate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: { convenio: true },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (solicitud.estado !== "ONBOARDING") {
    return NextResponse.json(
      { error: "Solo se puede activar desde estado ONBOARDING" },
      { status: 400 }
    );
  }

  if (solicitud.tallerId) {
    return NextResponse.json(
      { error: "Ya existe un taller vinculado" },
      { status: 400 }
    );
  }

  const codigoRed = await generarCodigoRed(solicitud.provincia);

  // Generate temporary password for the taller portal user
  const tempPassword = crypto.randomBytes(6).toString("hex"); // 12 chars
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const taller = await withEvent(
    OPERATIONS.network.application.activate,
    "SolicitudTaller",
    () =>
      prisma.$transaction(async (tx) => {
        // Create portal user for the taller
        const tallerUser = await tx.user.create({
          data: {
            email: solicitud.email.toLowerCase(),
            name: solicitud.contactoNombre,
            password: hashedPassword,
            provider: "credentials",
            role: "TALLER_EXTERNO",
          },
        });

        const nuevoTaller = await tx.taller.create({
          data: {
            nombre: solicitud.nombreTaller,
            tipo: "EXTERNO",
            direccion: solicitud.direccion,
            telefono: solicitud.telefono,
            email: solicitud.email,
            contacto: solicitud.contactoNombre,
            especialidades: solicitud.especialidades,
            activo: true,
            tarifaHora: solicitud.convenio
              ? Number(solicitud.convenio.tarifaHoraBase)
              : null,
            codigoRed,
            userId: tallerUser.id,
            capacidadOTMes: solicitud.capacidadOTMes,
            horariosAtencion: solicitud.horariosAtencion,
            latitud: solicitud.latitud,
            longitud: solicitud.longitud,
          },
        });

        await tx.solicitudTaller.update({
          where: { id },
          data: {
            tallerId: nuevoTaller.id,
            estado: "ACTIVO",
          },
        });

        return nuevoTaller;
      }),
    userId
  );

  // Send welcome email with credentials (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://motolibre-production.up.railway.app";
  enviarBienvenidaTaller({
    to: solicitud.email.toLowerCase(),
    contactoNombre: solicitud.contactoNombre,
    nombreTaller: solicitud.nombreTaller,
    codigoRed: taller.codigoRed ?? codigoRed,
    email: solicitud.email.toLowerCase(),
    tempPassword,
    appUrl,
  }).catch((err) => {
    console.error("[activar-taller] Error enviando email de bienvenida:", err);
  });

  return NextResponse.json(
    {
      data: taller,
      credentials: {
        email: solicitud.email.toLowerCase(),
        tempPassword,
        message: "Credenciales enviadas al taller por email",
      },
    },
    { status: 201 }
  );
}
