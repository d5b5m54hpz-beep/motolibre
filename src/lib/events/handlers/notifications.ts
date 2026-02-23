import { prisma } from "@/lib/prisma";
import { crearAlerta, alertarCreador } from "@/lib/alertas-utils";
import type { BusinessEventData } from "../event-bus";

/**
 * P200 — Notification handlers.
 * Crean alertas internas para usuarios del admin.
 */

/**
 * payment.approve → PAGO_RECIBIDO al creador del contrato.
 */
export async function handleNotifyPaymentApprove(
  event: BusinessEventData
): Promise<void> {
  const pago = await prisma.pagoMercadoPago.findUnique({
    where: { id: event.entityId },
    select: { id: true, monto: true, contratoId: true },
  });

  if (!pago?.contratoId) return;

  const contrato = await prisma.contrato.findUnique({
    where: { id: pago.contratoId },
    select: {
      id: true,
      creadoPor: true,
      cliente: { select: { nombre: true } },
    },
  });

  if (!contrato) return;

  const clienteNombre = contrato.cliente?.nombre ?? "Cliente";
  const monto = Number(pago.monto);

  await alertarCreador({
    tipo: "PAGO_RECIBIDO",
    prioridad: "BAJA",
    titulo: "Pago recibido",
    mensaje: `Pago de $${monto.toLocaleString("es-AR")} recibido de ${clienteNombre}`,
    modulo: "pagos",
    entidadTipo: "PagoMercadoPago",
    entidadId: pago.id,
    creadorUserId: contrato.creadoPor,
    accionUrl: `/admin/pagos`,
    accionLabel: "Ver pagos",
  });
}

/**
 * contract.create → SOLICITUD_NUEVA al creador del contrato.
 */
export async function handleNotifyContractCreate(
  event: BusinessEventData
): Promise<void> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: event.entityId },
    select: {
      id: true,
      creadoPor: true,
      cliente: { select: { nombre: true } },
      moto: { select: { patente: true } },
    },
  });

  if (!contrato) return;

  const clienteNombre = contrato.cliente?.nombre ?? "Cliente";
  const patente = contrato.moto?.patente ?? "Sin patente";

  await alertarCreador({
    tipo: "SOLICITUD_NUEVA",
    prioridad: "ALTA",
    titulo: "Nuevo contrato creado",
    mensaje: `Contrato para ${clienteNombre} — Moto ${patente}`,
    modulo: "contratos",
    entidadTipo: "Contrato",
    entidadId: contrato.id,
    creadorUserId: contrato.creadoPor ?? event.userId,
    accionUrl: `/admin/contratos/${contrato.id}`,
    accionLabel: "Ver contrato",
  });
}

/**
 * anomaly.detect → ANOMALIA_DETECTADA al primer admin.
 */
export async function handleNotifyAnomalyDetect(
  event: BusinessEventData
): Promise<void> {
  const anomalia = await prisma.anomalia.findUnique({
    where: { id: event.entityId },
    select: {
      id: true,
      tipo: true,
      severidad: true,
      titulo: true,
      descripcion: true,
    },
  });

  if (!anomalia) return;

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!admin) return;

  await crearAlerta({
    tipo: "ANOMALIA_DETECTADA",
    prioridad: anomalia.severidad === "CRITICA" ? "URGENTE" : "ALTA",
    titulo: `Anomalía: ${anomalia.titulo}`,
    mensaje: anomalia.descripcion ?? "Anomalía detectada en el sistema",
    modulo: "anomalias",
    entidadTipo: "Anomalia",
    entidadId: anomalia.id,
    usuarioId: admin.id,
    accionUrl: `/admin/anomalias/${anomalia.id}`,
    accionLabel: "Revisar anomalía",
  });
}

/**
 * contract.create → Mensaje de bienvenida en chat del contrato.
 */
export async function handleChatWelcomeMessage(
  event: BusinessEventData
): Promise<void> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: event.entityId },
    select: {
      id: true,
      cliente: { select: { nombre: true } },
    },
  });

  if (!contrato) return;

  const clienteNombre = contrato.cliente?.nombre ?? "Cliente";

  await prisma.mensajeChat.create({
    data: {
      contratoId: contrato.id,
      userId: "SISTEMA",
      userName: "MotoLibre",
      userRole: "SISTEMA",
      texto: `¡Bienvenido/a ${clienteNombre}! Este es tu canal de comunicación directa con nuestro equipo. Escribinos cualquier consulta sobre tu moto o contrato.`,
      tipo: "sistema",
      leido: false,
    },
  });
}
