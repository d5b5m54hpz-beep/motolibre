import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registroPublicoSchema } from "@/lib/validations/wizard-alquiler";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registroPublicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, nombre } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con este email" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: emailLower,
      name: nombre,
      password: hash,
      role: "CLIENTE",
      provider: "credentials",
    },
  });

  return NextResponse.json({ userId: user.id, email: user.email }, { status: 201 });
}
