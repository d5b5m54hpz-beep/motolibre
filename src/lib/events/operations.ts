/**
 * Registro central de TODAS las operaciones del sistema.
 * Cada operación sigue el patrón: domain.entity.action
 *
 * REGLA: Toda API route de escritura DEBE usar una operación de este registro.
 * NUNCA uses strings literales — siempre OPERATIONS.x.y.z
 */
export const OPERATIONS = {
  // ── Flota ──
  fleet: {
    moto: {
      create: "fleet.moto.create",
      update: "fleet.moto.update",
      changeState: "fleet.moto.changeState",
      decommission: "fleet.moto.decommission",
      uploadDocument: "fleet.moto.uploadDocument",
      bulkUpdate: "fleet.moto.bulkUpdate",
      depreciation: "fleet.moto.depreciation",
    },
    amortization: {
      calculate: "fleet.amortization.calculate",
    },
  },

  // ── Comercial ──
  commercial: {
    client: {
      create: "commercial.client.create",
      update: "commercial.client.update",
      approve: "commercial.client.approve",
      reject: "commercial.client.reject",
    },
    contract: {
      create: "commercial.contract.create",
      update: "commercial.contract.update",
      activate: "commercial.contract.activate",
      cancel: "commercial.contract.cancel",
      finalize: "commercial.contract.finalize",
      finalizePurchase: "commercial.contract.finalizePurchase",
      renew: "commercial.contract.renew",
    },
    payment: {
      create: "commercial.payment.create",
      approve: "commercial.payment.approve",
      reject: "commercial.payment.reject",
      refund: "commercial.payment.refund",
    },
  },

  // ── Solicitudes ──
  solicitud: {
    create: "solicitud.create",
    pay: "solicitud.pay",
    evaluate: "solicitud.evaluate",
    approve: "solicitud.approve",
    reject: "solicitud.reject",
    assignMoto: "solicitud.assignMoto",
    deliver: "solicitud.deliver",
    cancel: "solicitud.cancel",
    refund: "solicitud.refund",
  },

  // ── Facturación ──
  invoicing: {
    invoice: {
      create: "invoicing.invoice.create",
      void: "invoicing.invoice.void",
      sendEmail: "invoicing.invoice.sendEmail",
    },
    creditNote: {
      create: "invoicing.creditNote.create",
      void: "invoicing.creditNote.void",
    },
    purchaseInvoice: {
      create: "invoicing.purchaseInvoice.create",
      update: "invoicing.purchaseInvoice.update",
      approve: "invoicing.purchaseInvoice.approve",
    },
  },

  // ── Contabilidad ──
  accounting: {
    account: {
      create: "accounting.account.create",
      update: "accounting.account.update",
      deactivate: "accounting.account.deactivate",
    },
    entry: {
      create: "accounting.entry.create",
      approve: "accounting.entry.approve",
      reverse: "accounting.entry.reverse",
    },
    period: {
      open: "accounting.period.open",
      close: "accounting.period.close",
    },
  },

  // ── Mantenimiento ──
  maintenance: {
    workOrder: {
      create: "maintenance.workOrder.create",
      update: "maintenance.workOrder.update",
      approve: "maintenance.workOrder.approve",
      start: "maintenance.workOrder.start",
      complete: "maintenance.workOrder.complete",
      cancel: "maintenance.workOrder.cancel",
    },
    workshop: {
      create: "maintenance.workshop.create",
      update: "maintenance.workshop.update",
    },
    appointment: {
      create: "maintenance.appointment.create",
      confirm: "maintenance.appointment.confirm",
      cancel: "maintenance.appointment.cancel",
    },
  },

  // ── Supply Chain ──
  supply: {
    supplier: {
      create: "supply.supplier.create",
      update: "supply.supplier.update",
      deactivate: "supply.supplier.deactivate",
    },
    purchaseOrder: {
      create: "supply.purchaseOrder.create",
      approve: "supply.purchaseOrder.approve",
      receive: "supply.purchaseOrder.receive",
      cancel: "supply.purchaseOrder.cancel",
    },
    inventory: {
      adjustStock: "supply.inventory.adjustStock",
      transfer: "supply.inventory.transfer",
      receive: "supply.inventory.receive",
    },
    shipment: {
      create: "supply.shipment.create",
      update: "supply.shipment.update",
      changeState: "supply.shipment.changeState",
      confirmCosts: "supply.shipment.confirmCosts",
      receive: "supply.shipment.receive",
    },
  },

  // ── Pricing ──
  pricing: {
    rental: {
      create: "pricing.rental.create",
      update: "pricing.rental.update",
      simulate: "pricing.rental.simulate",
      deactivate: "pricing.rental.deactivate",
    },
    parts: {
      update: "pricing.parts.update",
      bulkUpdate: "pricing.parts.bulkUpdate",
    },
  },

  // ── Finanzas ──
  finance: {
    expense: {
      create: "finance.expense.create",
      update: "finance.expense.update",
      approve: "finance.expense.approve",
      reject: "finance.expense.reject",
    },
    budget: {
      create: "finance.budget.create",
      update: "finance.budget.update",
    },
    bankReconciliation: {
      import: "finance.bankReconciliation.import",
      match: "finance.bankReconciliation.match",
      approve: "finance.bankReconciliation.approve",
    },
    report: {
      view: "finance.report.view",
    },
  },

  // ── RRHH ──
  hr: {
    employee: {
      create: "hr.employee.create",
      update: "hr.employee.update",
      terminate: "hr.employee.terminate",
    },
    absence: {
      request: "hr.absence.request",
      approve: "hr.absence.approve",
      reject: "hr.absence.reject",
    },
    payroll: {
      liquidate: "hr.payroll.liquidate",
      approve: "hr.payroll.approve",
    },
  },

  // ── Sistema ──
  system: {
    user: {
      create: "system.user.create",
      update: "system.user.update",
      changeRole: "system.user.changeRole",
      deactivate: "system.user.deactivate",
    },
    permission: {
      update: "system.permission.update",
    },
    config: {
      update: "system.config.update",
    },
    alert: {
      create: "system.alert.create",
      dismiss: "system.alert.dismiss",
    },
    monitor: {
      view: "system.monitor.view",
      cleanup: "system.monitor.cleanup",
    },
    diagnostico: {
      execute: "system.diagnostico.execute",
      repair: "system.diagnostico.repair",
    },
  },

  // ── Ventas ──
  sale: {
    create: "sale.create",
    confirm: "sale.confirm",
    cancel: "sale.cancel",
  },

  // ── Anomalías ──
  anomaly: {
    detect: "anomaly.detect",
    resolve: "anomaly.resolve",
    dismiss: "anomaly.dismiss",
  },

  // ── IA ──
  ai: {
    chat: "ai.chat",
    toolCall: "ai.toolCall",
  },

  // ── Comunicación ──
  communication: {
    message: {
      draft: "communication.message.draft",
      submitApproval: "communication.message.submitApproval",
      approve: "communication.message.approve",
      reject: "communication.message.reject",
      send: "communication.message.send",
      receive: "communication.message.receive",
      bounce: "communication.message.bounce",
    },
    conversation: {
      create: "communication.conversation.create",
      resolve: "communication.conversation.resolve",
      archive: "communication.conversation.archive",
      reopen: "communication.conversation.reopen",
    },
    contact: {
      create: "communication.contact.create",
      update: "communication.contact.update",
      deactivate: "communication.contact.deactivate",
    },
    template: {
      create: "communication.template.create",
      update: "communication.template.update",
    },
    autonomy: {
      create: "communication.autonomy.create",
      update: "communication.autonomy.update",
      toggle: "communication.autonomy.toggle",
    },
    notification: {
      create: "communication.notification.create",
      read: "communication.notification.read",
      readAll: "communication.notification.readAll",
    },
    ai: {
      analyze: "communication.ai.analyze",
      draftResponse: "communication.ai.draftResponse",
      summarize: "communication.ai.summarize",
    },
  },

  // ── Traducción ──
  translation: {
    generate: "translation.generate",
    review: "translation.review",
    publish: "translation.publish",
  },
} as const;

/**
 * Tipo utilitario para obtener todas las operation IDs como union type.
 */
type FlattenOperations<T> = T extends string
  ? T
  : { [K in keyof T]: FlattenOperations<T[K]> }[keyof T];

export type OperationId = FlattenOperations<typeof OPERATIONS>;

/**
 * Obtiene todas las operation IDs como array plano.
 */
export function getAllOperationIds(
  obj: Record<string, unknown> = OPERATIONS as unknown as Record<string, unknown>
): string[] {
  const ids: string[] = [];
  for (const value of Object.values(obj)) {
    if (typeof value === "string") {
      ids.push(value);
    } else if (typeof value === "object" && value !== null) {
      ids.push(...getAllOperationIds(value as Record<string, unknown>));
    }
  }
  return ids;
}
