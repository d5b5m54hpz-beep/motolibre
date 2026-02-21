import { NextResponse } from "next/server";
import { getModelosConTarifa } from "@/lib/pricing-utils";

export async function GET() {
  const modelos = await getModelosConTarifa();
  return NextResponse.json({ data: modelos });
}
