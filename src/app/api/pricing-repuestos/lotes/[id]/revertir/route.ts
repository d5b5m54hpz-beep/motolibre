import { NextResponse } from "next/server";
import { revertirLoteCambio } from "@/lib/pricing-repuestos";
import { auth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id ?? "system";
    const resultado = await revertirLoteCambio(id, userId);
    return NextResponse.json(resultado);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al revertir lote";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
