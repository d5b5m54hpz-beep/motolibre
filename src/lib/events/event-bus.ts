import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Tipo para el payload de un evento de negocio.
 */
export interface BusinessEventData {
  operationId: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
}

/**
 * Handler de evento con prioridad.
 * Los handlers se ejecutan en orden de prioridad (menor número = mayor prioridad).
 */
export interface EventHandler {
  name: string;
  priority: number;
  pattern: string; // "fleet.moto.create" o wildcard "fleet.*" o "*"
  handler: (event: BusinessEventData) => Promise<void>;
}

/**
 * EventBus singleton — corazón del sistema event-driven.
 *
 * Flujo: API write → eventBus.emit() → persiste BusinessEvent → ejecuta handlers por prioridad
 *
 * Prioridades:
 *   P30-40:  Invoicing (auto-genera facturas)
 *   P50:     Accounting (asientos contables partida doble)
 *   P200:    Notifications (alertas + emails)
 *   P500:    Anomaly Detection (detecta anomalías)
 *   P999:    Metrics (wildcard '*')
 */
class EventBus {
  private handlers: EventHandler[] = [];
  private initialized = false;

  /**
   * Registra un handler de eventos.
   */
  register(handler: EventHandler): void {
    this.handlers.push(handler);
    // Mantener ordenados por prioridad
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Emite un evento: persiste en DB y ejecuta handlers que matcheen.
   */
  async emit(
    operationId: string,
    entityType: string,
    entityId: string,
    payload?: Record<string, unknown>,
    userId?: string | null
  ): Promise<string> {
    const start = Date.now();

    // 1. Persistir evento
    const event = await prisma.businessEvent.create({
      data: {
        operationId,
        entityType,
        entityId,
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
        userId: userId ?? undefined,
        status: "PROCESSING",
      },
    });

    const eventData: BusinessEventData = {
      operationId,
      entityType,
      entityId,
      payload,
      userId,
    };

    // 2. Ejecutar handlers que matcheen (en orden de prioridad)
    const matchingHandlers = this.handlers.filter((h) =>
      this.matchPattern(h.pattern, operationId)
    );

    let handlersEjecutados = 0;
    let handlersExitosos = 0;
    let handlersFallidos = 0;
    let errorMsg: string | null = null;
    let stackTrace: string | null = null;
    const errors: string[] = [];

    for (const h of matchingHandlers) {
      handlersEjecutados++;
      try {
        await h.handler(eventData);
        handlersExitosos++;
      } catch (error: unknown) {
        handlersFallidos++;
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (!errorMsg) {
          errorMsg = msg;
          stackTrace = error instanceof Error ? (error.stack ?? null) : null;
        }
        console.error(
          `[EventBus] Handler "${h.name}" failed for ${operationId}: ${msg}`
        );
        errors.push(`${h.name}: ${msg}`);
      }
    }

    // 3. Actualizar estado del evento
    await prisma.businessEvent.update({
      where: { id: event.id },
      data: {
        status: errors.length > 0 ? "FAILED" : "COMPLETED",
        error: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    // 4. Registrar en monitor (fire-and-forget, nunca romper por logging)
    const duracionMs = Date.now() - start;
    prisma.eventoSistema
      .create({
        data: {
          tipo: operationId,
          payload: payload
            ? (sanitizePayload(payload) as Prisma.InputJsonValue)
            : undefined,
          origenModulo: operationId.split(".")[0] ?? "unknown",
          origenUsuario: userId ?? undefined,
          handlersEjecutados,
          handlersExitosos,
          handlersFallidos,
          duracionMs,
          nivel: handlersFallidos > 0 ? "ERROR" : "INFO",
          error: errorMsg,
          stackTrace,
        },
      })
      .catch(() => {}); // Nunca romper por logging

    return event.id;
  }

  /**
   * Pattern matching para operaciones.
   * Soporta wildcards: "fleet.*" matchea "fleet.moto.create"
   * "*" matchea todo.
   */
  private matchPattern(pattern: string, operationId: string): boolean {
    if (pattern === "*") return true;

    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      return operationId.startsWith(prefix + ".");
    }

    return pattern === operationId;
  }

  /**
   * Retorna los handlers registrados (para diagnóstico).
   */
  getHandlers(): EventHandler[] {
    return [...this.handlers];
  }

  /**
   * Marca como inicializado (evita doble registro).
   */
  markInitialized(): void {
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton global
const globalForEventBus = globalThis as unknown as {
  eventBus: EventBus | undefined;
};

export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") globalForEventBus.eventBus = eventBus;

/**
 * Sanitiza payload removiendo campos sensibles (PII).
 */
function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sanitized = { ...payload };
  const sensitiveKeys = [
    "password",
    "cbu",
    "token",
    "apiKey",
    "secret",
    "clave",
    "accessToken",
    "refreshToken",
  ];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return sanitized;
}
