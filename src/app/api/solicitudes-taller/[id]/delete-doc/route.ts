import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, extractSupabasePath } from "@/lib/supabase";
import { apiSetup } from "@/lib/api-helpers";

/**
 * POST /api/solicitudes-taller/[id]/delete-doc
 * Delete a document/photo from a solicitud.
 * Body: { tipo: "cuit"|"habilitacion"|"seguro"|"fotos"|"otros", url?: string }
 *   - For single fields (cuit/habilitacion/seguro): clears the field
 *   - For array fields (fotos/otros): removes the specific url from the array
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const body = await req.json();
  const { tipo, url } = body as { tipo?: string; url?: string };

  if (!tipo) {
    return NextResponse.json(
      { error: "Tipo es requerido" },
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

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    select: {
      id: true,
      docCuit: true,
      docHabilitacion: true,
      docSeguro: true,
      docFotos: true,
      docOtros: true,
    },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  const fieldMap: Record<string, string> = {
    cuit: "docCuit",
    habilitacion: "docHabilitacion",
    seguro: "docSeguro",
  };

  // Determine the URL to delete from Storage
  let urlToDelete: string | null = null;

  if (fieldMap[tipo]) {
    // Single-value fields
    const field = fieldMap[tipo] as keyof typeof solicitud;
    urlToDelete = solicitud[field] as string | null;
    await prisma.solicitudTaller.update({
      where: { id },
      data: { [fieldMap[tipo]]: null },
    });
  } else {
    // Array fields — need the specific url
    if (!url) {
      return NextResponse.json(
        { error: "URL es requerida para campos de tipo array (fotos/otros)" },
        { status: 400 }
      );
    }
    urlToDelete = url;
    const arrayField = tipo === "fotos" ? "docFotos" : "docOtros";
    const current = solicitud[arrayField] as string[];
    const updated = current.filter((u) => u !== url);
    await prisma.solicitudTaller.update({
      where: { id },
      data: { [arrayField]: updated },
    });
  }

  // Try to delete from Supabase Storage (best effort)
  if (urlToDelete) {
    const path = extractSupabasePath(urlToDelete);
    if (path) {
      const { error } = await supabaseAdmin.storage
        .from("motos")
        .remove([path]);
      if (error) {
        console.warn("[delete-doc] Storage delete failed:", error.message);
      }
    }
  }

  return NextResponse.json({ success: true });
}
