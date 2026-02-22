import { NextResponse } from "next/server";
import { getDashboardMargenes } from "@/lib/pricing-repuestos";

export async function GET() {
  try {
    const data = await getDashboardMargenes();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error al obtener dashboard" }, { status: 500 });
  }
}
