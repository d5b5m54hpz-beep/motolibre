import { eventBus } from "./event-bus";

/**
 * Helper para CRUD simple: ejecuta la operación y emite el evento.
 *
 * Uso:
 * const moto = await withEvent(
 *   OPERATIONS.fleet.moto.create,
 *   "Moto",
 *   async () => {
 *     return prisma.moto.create({ data: { ... } });
 *   },
 *   userId
 * );
 */
export async function withEvent<T extends { id: string }>(
  operationId: string,
  entityType: string,
  operation: () => Promise<T>,
  userId?: string | null,
  extraPayload?: Record<string, unknown>
): Promise<T> {
  // Ejecutar la operación
  const result = await operation();

  // Emitir evento después del write
  await eventBus
    .emit(operationId, entityType, result.id, extraPayload, userId)
    .catch((error: unknown) => {
      console.error(`[withEvent] Failed to emit ${operationId}:`, error);
    });

  return result;
}
