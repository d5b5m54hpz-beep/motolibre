import { NextResponse } from "next/server";
import { simularCambioPrecio } from "@/lib/pricing-repuestos";
import { whatIfSchema } from "@/lib/validations/pricing-repuestos";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = whatIfSchema.parse(body);
    const resultado = await simularCambioPrecio({
      tipo: data.tipo,
      valor: data.valor,
      categorias: data.categorias,
      proveedorId: data.proveedorId,
    });
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Error al simular cambio" }, { status: 500 });
  }
}
