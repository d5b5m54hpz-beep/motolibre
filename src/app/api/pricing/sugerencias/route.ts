import { NextResponse } from "next/server";
import { sugerirPrecios } from "@/lib/pricing-engine";
import { sugerenciaSchema } from "@/lib/validations/pricing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = sugerenciaSchema.parse(body);
    const resultado = await sugerirPrecios(data);
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error al calcular sugerencias" }, { status: 500 });
  }
}
