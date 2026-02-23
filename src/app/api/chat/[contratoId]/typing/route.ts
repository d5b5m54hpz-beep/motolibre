import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enviarTyping } from "@/lib/services/pusher-service";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contratoId: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { contratoId } = await params;
  await enviarTyping(contratoId, session.user.name || "Usuario");

  return NextResponse.json({ ok: true });
}
