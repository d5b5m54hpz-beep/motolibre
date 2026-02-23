import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import QRCode from "qrcode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://motolibre-production.up.railway.app";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const qrUrl = `${APP_URL}/scan/${id}`;

  const svgString = await QRCode.toString(qrUrl, {
    type: "svg",
    margin: 2,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return NextResponse.json({
    data: { svgString, url: qrUrl },
  });
}
