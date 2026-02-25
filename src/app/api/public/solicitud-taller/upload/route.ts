import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSetup } from "@/lib/api-helpers";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "application/pdf",
];

/**
 * POST /api/public/solicitud-taller/upload
 * Upload documents for a solicitud (public, requires valid token).
 */
export async function POST(req: NextRequest) {
  apiSetup();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const token = formData.get("token") as string | null;
  const tipo = formData.get("tipo") as string | null; // "cuit", "habilitacion", "seguro", "fotos", "otros"

  if (!file || !token || !tipo) {
    return NextResponse.json(
      { error: "Archivo, token y tipo son requeridos" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usar PDF, WebP, JPEG o PNG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Archivo demasiado grande (máx 10MB)" },
      { status: 400 }
    );
  }

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { tokenPublico: token },
    select: { id: true, estado: true },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (!["BORRADOR", "INCOMPLETA"].includes(solicitud.estado)) {
    return NextResponse.json(
      { error: "Solo se pueden subir archivos en estado BORRADOR o INCOMPLETA" },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "bin";
  const path = `solicitudes/${solicitud.id}/${tipo}/${timestamp}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("motos")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[solicitud-taller/upload] Storage error:", uploadError);
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("motos").getPublicUrl(path);

  // Update the solicitud with the document URL
  const validTipos = ["cuit", "habilitacion", "seguro", "fotos", "otros"];
  if (!validTipos.includes(tipo)) {
    return NextResponse.json(
      { error: `Tipo inválido. Válidos: ${validTipos.join(", ")}` },
      { status: 400 }
    );
  }

  const fieldMap: Record<string, string> = {
    cuit: "docCuit",
    habilitacion: "docHabilitacion",
    seguro: "docSeguro",
  };

  if (fieldMap[tipo]) {
    // Single-value fields: overwrite
    await prisma.solicitudTaller.update({
      where: { id: solicitud.id },
      data: { [fieldMap[tipo]]: publicUrl },
    });
  } else {
    // Array fields (fotos, otros): push
    const arrayField = tipo === "fotos" ? "docFotos" : "docOtros";
    await prisma.solicitudTaller.update({
      where: { id: solicitud.id },
      data: { [arrayField]: { push: publicUrl } },
    });
  }

  return NextResponse.json({ data: { url: publicUrl, path } });
}
