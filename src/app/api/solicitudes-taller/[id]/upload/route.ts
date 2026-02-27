import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSetup } from "@/lib/api-helpers";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";
import sharp from "sharp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "application/pdf",
];
const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

/**
 * POST /api/solicitudes-taller/[id]/upload
 * Upload documents for a solicitud (admin, no state restriction).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = formData.get("tipo") as string | null;

  if (!file || !tipo) {
    return NextResponse.json(
      { error: "Archivo y tipo son requeridos" },
      { status: 400 }
    );
  }

  const validTipos = ["cuit", "habilitacion", "seguro", "fotos", "otros"];
  if (!validTipos.includes(tipo)) {
    return NextResponse.json(
      { error: `Tipo inválido. Válidos: ${validTipos.join(", ")}` },
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
    where: { id },
    select: { id: true },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  const timestamp = Date.now();
  const isImage = IMAGE_TYPES.includes(file.type);
  const ext = isImage ? "webp" : (file.name.split(".").pop() || "bin");
  const path = `solicitudes/${id}/${tipo}/${timestamp}.${ext}`;

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;

  // Convert images to WebP for optimization
  if (isImage) {
    buffer = Buffer.from(await sharp(buffer).webp({ quality: 80 }).toBuffer());
    contentType = "image/webp";
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from("motos")
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[solicitudes-taller/upload] Storage error:", uploadError);
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("motos").getPublicUrl(path);

  const fieldMap: Record<string, string> = {
    cuit: "docCuit",
    habilitacion: "docHabilitacion",
    seguro: "docSeguro",
  };

  if (fieldMap[tipo]) {
    await prisma.solicitudTaller.update({
      where: { id },
      data: { [fieldMap[tipo]]: publicUrl },
    });
  } else {
    const arrayField = tipo === "fotos" ? "docFotos" : "docOtros";
    await prisma.solicitudTaller.update({
      where: { id },
      data: { [arrayField]: { push: publicUrl } },
    });
  }

  // Emit event for timeline
  eventBus.emit(
    OPERATIONS.network.application.update,
    "solicitudTaller",
    id,
    { action: "upload", tipo, url: publicUrl }
  ).catch(() => {});

  return NextResponse.json({ data: { url: publicUrl, path } });
}
