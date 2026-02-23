import { eventBus } from "../event-bus";
import { OPERATIONS } from "../operations";
import {
  handlePaymentApprove,
  handlePaymentRefund,
  handleInvoiceCreate,
  handleInvoiceVoid,
  handleMotoCreate,
  handleMotoDepreciation,
  handleExpenseCreate,
  handleInventoryAdjust,
  handleInventoryReception,
  handleImportConfirmCosts,
  handleImportDispatch,
  handleImportReception,
  handleWorkorderComplete,
  handleCreditNoteCreate,
  handleReconciliation,
  handlePurchaseInvoiceCreate,
  handlePurchaseInvoicePay,
  handlePayrollLiquidate,
} from "./accounting";
import {
  handleAnomalyPaymentApprove,
  handleAnomalyExpenseCreate,
  handleAnomalyStockAdjust,
} from "./anomaly-detection";

/**
 * Registra todos los event handlers del sistema.
 * Se llama una sola vez desde init.ts → api-helpers.ts (nunca desde middleware).
 *
 * Prioridades:
 *   P50:  Accounting (asientos contables partida doble)
 *   P999: Metrics/Logging
 */
export function initializeEventHandlers(): void {
  if (eventBus.isInitialized()) return;

  const P_ACCOUNTING = 50;

  // ── HANDLERS CONTABLES (P50) ──

  // 1. Cobro aprobado
  eventBus.register({
    name: "accounting:payment.approve",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.commercial.payment.approve,
    handler: handlePaymentApprove,
  });

  // 2. Refund
  eventBus.register({
    name: "accounting:payment.refund",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.commercial.payment.refund,
    handler: handlePaymentRefund,
  });

  // 3/4. Factura emitida
  eventBus.register({
    name: "accounting:invoice.create",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.invoicing.invoice.create,
    handler: handleInvoiceCreate,
  });

  // 5. Factura anulada
  eventBus.register({
    name: "accounting:invoice.void",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.invoicing.invoice.void,
    handler: handleInvoiceVoid,
  });

  // 6. Alta de moto
  eventBus.register({
    name: "accounting:moto.create",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.fleet.moto.create,
    handler: handleMotoCreate,
  });

  // 7. Depreciación mensual
  eventBus.register({
    name: "accounting:moto.depreciation",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.fleet.moto.depreciation,
    handler: handleMotoDepreciation,
  });

  // 8. Gasto operativo
  eventBus.register({
    name: "accounting:expense.create",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.finance.expense.create,
    handler: handleExpenseCreate,
  });

  // 9. Ajuste inventario
  eventBus.register({
    name: "accounting:inventory.adjust",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.supply.inventory.adjustStock,
    handler: handleInventoryAdjust,
  });

  // 10. Recepción repuestos
  eventBus.register({
    name: "accounting:inventory.reception",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.supply.inventory.receive,
    handler: handleInventoryReception,
  });

  // 11. Importación — confirmar costos
  eventBus.register({
    name: "accounting:import.confirm_costs",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.supply.shipment.confirmCosts,
    handler: handleImportConfirmCosts,
  });

  // 12. Importación — despacho
  eventBus.register({
    name: "accounting:import.dispatch",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.supply.shipment.create,
    handler: handleImportDispatch,
  });

  // 13. Importación — recepción
  eventBus.register({
    name: "accounting:import.reception",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.supply.shipment.receive,
    handler: handleImportReception,
  });

  // 14. OT completada
  eventBus.register({
    name: "accounting:workorder.complete",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.maintenance.workOrder.complete,
    handler: handleWorkorderComplete,
  });

  // 15. Nota de crédito
  eventBus.register({
    name: "accounting:credit_note.create",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.invoicing.creditNote.create,
    handler: handleCreditNoteCreate,
  });

  // 16. Conciliación bancaria
  eventBus.register({
    name: "accounting:reconciliation",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.finance.bankReconciliation.approve,
    handler: handleReconciliation,
  });

  // 17. Factura compra
  eventBus.register({
    name: "accounting:purchase_invoice.create",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.invoicing.purchaseInvoice.create,
    handler: handlePurchaseInvoiceCreate,
  });

  // 18. Pago factura compra
  eventBus.register({
    name: "accounting:purchase_invoice.pay",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.invoicing.purchaseInvoice.approve,
    handler: handlePurchaseInvoicePay,
  });

  // 19. Liquidación nómina
  eventBus.register({
    name: "accounting:payroll.liquidate",
    priority: P_ACCOUNTING,
    pattern: OPERATIONS.hr.payroll.liquidate,
    handler: handlePayrollLiquidate,
  });

  // ── HANDLERS ANOMALÍAS (P500) ──

  const P_ANOMALY = 500;

  // Pago aprobado → buscar duplicados
  eventBus.register({
    name: "anomaly:payment.approve",
    priority: P_ANOMALY,
    pattern: OPERATIONS.commercial.payment.approve,
    handler: handleAnomalyPaymentApprove,
  });

  // Gasto creado → verificar si es inusual
  eventBus.register({
    name: "anomaly:expense.create",
    priority: P_ANOMALY,
    pattern: OPERATIONS.finance.expense.create,
    handler: handleAnomalyExpenseCreate,
  });

  // Ajuste stock → verificar stock crítico
  eventBus.register({
    name: "anomaly:inventory.adjust",
    priority: P_ANOMALY,
    pattern: OPERATIONS.supply.inventory.adjustStock,
    handler: handleAnomalyStockAdjust,
  });

  // ── HANDLER METRICS/LOGGING (P999) ──
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
    `[EventBus] Initialized with ${eventBus.getHandlers().length} handler(s) (19 contables + 3 anomalías + 1 metrics)`
  );
}
