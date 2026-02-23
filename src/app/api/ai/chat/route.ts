import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, tool } from "ai";
import type { ToolSet } from "ai";
import { auth } from "@/lib/auth";
import { apiSetup } from "@/lib/api-helpers";
import { toolRegistry } from "@/lib/ai/tool-registry";
import { getSystemPromptForRole } from "@/lib/ai/system-prompt";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

// Import tool modules so they register themselves
import "@/lib/ai/tools/flota";
import "@/lib/ai/tools/comercial";
import "@/lib/ai/tools/finanzas";
import "@/lib/ai/tools/contabilidad";
import "@/lib/ai/tools/rrhh";
import "@/lib/ai/tools/sistema";

export const maxDuration = 60;

// Rate limit: 30 messages per minute per user (in-memory)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 30) return false;

  limit.count++;
  return true;
}

export async function POST(req: Request) {
  apiSetup();
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = session.user.id;
  const userRole = session.user.role as Role;
  const userName = session.user.name || "Usuario";

  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: "Límite de mensajes alcanzado. Esperá un minuto." },
      { status: 429 }
    );
  }

  const { messages } = await req.json();

  // Get tools for the user's role
  const userTools = toolRegistry.getToolsForRole(userRole);

  // Convert to Vercel AI SDK v6 format
  const aiTools: ToolSet = {};
  for (const t of userTools) {
    aiTools[t.name] = tool({
      description: t.description,
      inputSchema: t.parameters,
      execute: async (params: Record<string, unknown>) => {
        try {
          const result = await t.execute(params);
          return JSON.stringify(result, (_key, value) =>
            typeof value === "bigint" ? Number(value) : value
          , 2);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Error desconocido";
          return JSON.stringify({ error: message });
        }
      },
    });
  }

  const systemPrompt = getSystemPromptForRole(userRole, userName);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    tools: aiTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
