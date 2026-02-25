import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSetup } from "@/lib/api-helpers";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];

export async function POST(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const motoId = formData.get("motoId") as string | null;

  if (!file || !motoId) {
    return NextResponse.json(
      { error: "Archivo y motoId son requeridos" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usar WebP, JPEG o PNG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Archivo demasiado grande (máx 5MB)" },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const path = `${motoId}/${timestamp}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("motos")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload/image] Supabase Storage error:", uploadError);
    return NextResponse.json(
      { error: "Error al subir imagen" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("motos").getPublicUrl(path);

  return NextResponse.json({ data: { url: publicUrl, path } });
}
