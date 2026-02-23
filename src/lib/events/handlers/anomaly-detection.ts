import { detectarPagoDuplicado, detectarGastoInusual, detectarStockCritico } from "@/lib/anomalias/algoritmos";
import { guardarAnomalias } from "@/lib/anomalias/detector";
import type { BusinessEventData } from "../event-bus";

/**
 * Handlers P500 — Detección de anomalías en tiempo real.
 * Se ejecutan DESPUÉS de los handlers contables (P50).
 * Si fallan, no afectan la operación original.
 */

export async function handleAnomalyPaymentApprove(_: BusinessEventData) {
  try {
    const duplicados = await detectarPagoDuplicado();
    if (duplicados.length > 0) {
      await guardarAnomalias(duplicados);
    }
  } catch (e) {
    console.error("[Anomalías] Error en handler payment.approve:", e);
  }
}

export async function handleAnomalyExpenseCreate(_: BusinessEventData) {
  try {
    const inusuales = await detectarGastoInusual();
    if (inusuales.length > 0) {
      await guardarAnomalias(inusuales);
    }
  } catch (e) {
    console.error("[Anomalías] Error en handler expense.create:", e);
  }
}

export async function handleAnomalyStockAdjust(_: BusinessEventData) {
  try {
    const criticos = await detectarStockCritico();
    if (criticos.length > 0) {
      await guardarAnomalias(criticos);
    }
  } catch (e) {
    console.error("[Anomalías] Error en handler adjustStock:", e);
  }
}
