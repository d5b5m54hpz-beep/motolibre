import { NextResponse } from "next/server";
import { aplicarLoteCambio } from "@/lib/pricing-repuestos";
import { auth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id ?? "system";
    const resultado = await aplicarLoteCambio(id, userId);
    return NextResponse.json(resultado);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al aplicar lote";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
