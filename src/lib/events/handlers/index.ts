import { eventBus } from "../event-bus";

/**
 * Registra todos los handlers de eventos del sistema.
 * Se llama una sola vez desde api-helpers.ts (nunca desde middleware).
 */
export function initializeEventHandlers(): void {
  if (eventBus.isInitialized()) return;

  // Handler de métricas/logging — prioridad más baja, corre último
  eventBus.register({
    name: "metrics-logger",
    priority: 999,
    pattern: "*",
    handler: async (event) => {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Event] ${event.operationId} → ${event.entityType}#${event.entityId}`
        );
      }
    },
  });

  eventBus.markInitialized();
  console.log(
    `[EventBus] Initialized with ${eventBus.getHandlers().length} handler(s)`
  );
}
