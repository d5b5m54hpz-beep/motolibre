import { ensureInitialized } from "./init";
import { NextResponse } from "next/server";

/**
 * Inicializa el sistema y devuelve helpers comunes para API routes.
 *
 * Uso en cada API route handler:
 *   const { ok } = apiSetup();
 *   if (!ok) return NextResponse.json({ error: "..." }, { status: 500 });
 *   // ... resto del handler
 *
 * En la práctica ok siempre es true — el destructuring es para legibilidad.
 */
export function apiSetup(): { ok: true } {
  ensureInitialized();
  return { ok: true };
}

/**
 * Respuesta JSON de error estandarizada.
 */
export function errorResponse(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
