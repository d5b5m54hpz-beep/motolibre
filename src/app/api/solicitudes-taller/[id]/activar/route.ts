import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { enviarNotificacionEmail } from "@/lib/email";
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
  enviarNotificacionEmail({
    to: solicitud.email.toLowerCase(),
    subject: `¡Bienvenido a la Red de Talleres MotoLibre! — Tus credenciales de acceso`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0f0f0f; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MotoLibre</h1>
          <p style="color: #23e0ff; margin: 4px 0 0; font-size: 13px;">Red de Talleres</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0f0f0f; font-size: 18px;">¡Hola ${solicitud.contactoNombre}!</h2>
          <p>Tu taller <strong>${solicitud.nombreTaller}</strong> fue activado exitosamente en la Red de Talleres MotoLibre.</p>
          <p>Código de red asignado: <strong style="color: #23e0ff; font-family: monospace; font-size: 16px;">${taller.codigoRed}</strong></p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Credenciales de acceso al Portal</h3>
            <p style="margin: 4px 0;"><span style="color: #6b7280; font-size: 13px;">Usuario (email):</span><br><strong style="font-family: monospace;">${solicitud.email.toLowerCase()}</strong></p>
            <p style="margin: 12px 0 4px;"><span style="color: #6b7280; font-size: 13px;">Contraseña temporal:</span><br><strong style="font-family: monospace; font-size: 16px; color: #dc2626;">${tempPassword}</strong></p>
            <p style="color: #dc2626; font-size: 12px; margin: 8px 0 0;">⚠️ Cambiá esta contraseña desde tu portal en el primer ingreso.</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${appUrl}/portal-taller" style="background: #23e0ff; color: #0f0f0f; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
              Acceder al Portal Taller →
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            MotoLibre S.A. — CUIT 30-71617222-4<br>
            Este es un mensaje automático. Ante dudas respondé este email o llamá al +54 11 0000-0000.
          </p>
        </div>
      </div>
    `,
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
