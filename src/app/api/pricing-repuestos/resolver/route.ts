import { NextResponse } from "next/server";
import { resolverPrecio } from "@/lib/pricing-repuestos";
import { resolverPrecioSchema } from "@/lib/validations/pricing-repuestos";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = resolverPrecioSchema.parse(body);
    const resultado = await resolverPrecio(data);
    if (!resultado) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error al resolver precio" }, { status: 500 });
  }
}
