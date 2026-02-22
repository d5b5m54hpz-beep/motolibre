import { NextResponse } from "next/server";
import { simularContrato } from "@/lib/pricing-engine";
import { simulacionSchema } from "@/lib/validations/pricing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = simulacionSchema.parse(body);
    const resultado = await simularContrato(data);
    if (!resultado) {
      return NextResponse.json({ error: "No se encontró precio para ese modelo y plan" }, { status: 404 });
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error al simular contrato" }, { status: 500 });
  }
}
