import { initializeEventHandlers } from "./events/handlers";

let initialized = false;

/**
 * Inicializa todos los subsistemas de la aplicación.
 * Seguro para llamar múltiples veces — solo corre una vez por proceso.
 *
 * IMPORTANTE: No importar desde middleware (Edge Runtime no soporta Prisma).
 * Llamar desde api-helpers.ts al inicio de cada API route handler.
 */
export function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  initializeEventHandlers();
}
