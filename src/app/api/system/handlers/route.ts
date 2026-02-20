import { NextResponse } from "next/server";
import { eventBus } from "@/lib/events";
import { requirePermission } from "@/lib/permissions";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission(
    "system.handlers.view",
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const handlers = eventBus.getHandlers().map((h) => ({
    name: h.name,
    priority: h.priority,
    pattern: h.pattern,
  }));

  return NextResponse.json({
    initialized: eventBus.isInitialized(),
    handlers,
    count: handlers.length,
  });
}
