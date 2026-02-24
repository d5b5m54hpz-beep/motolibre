import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──

const mockPrisma = vi.hoisted(() => ({
  pagoMercadoPago: { upsert: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  solicitud: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  cuota: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  contrato: { findUnique: vi.fn() },
  moto: { update: vi.fn() },
  historialEstadoMoto: { create: vi.fn() },
  businessEvent: { create: vi.fn() },
  suscripcionMP: { findUnique: vi.fn(), update: vi.fn() },
  ordenVentaRepuesto: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/mp-service", () => ({
  consultarPago: vi.fn(),
}));

vi.mock("@/lib/mercadopago", () => ({
  mpPreApproval: { get: vi.fn() },
}));

vi.mock("@/lib/events", () => ({
  eventBus: { emit: vi.fn().mockResolvedValue("evt-1") },
  OPERATIONS: {
    commercial: { payment: { approve: "commercial.payment.approve" } },
    solicitud: { pay: "solicitud.pay" },
    sale: { confirm: "sale.confirm" },
  },
}));

vi.mock("@/lib/init", () => ({ ensureInitialized: vi.fn() }));
vi.mock("@/lib/facturacion-service", () => ({ generarFacturaAutomatica: vi.fn() }));
vi.mock("@/lib/stock-utils", () => ({ registrarMovimiento: vi.fn() }));

// Dynamic import mock for lease-to-own
vi.mock("@/lib/lease-to-own", () => ({
  procesarLeaseToOwn: vi.fn(),
}));

import { POST, GET } from "@/app/api/webhooks/mercadopago/route";
import { consultarPago } from "@/lib/mp-service";
import { mpPreApproval } from "@/lib/mercadopago";
import { generarFacturaAutomatica } from "@/lib/facturacion-service";
import { registrarMovimiento } from "@/lib/stock-utils";
import { eventBus } from "@/lib/events";

const mockConsultarPago = vi.mocked(consultarPago);
const mockMpPreApproval = vi.mocked(mpPreApproval);
const mockGenerarFactura = vi.mocked(generarFacturaAutomatica);
const mockRegistrarMovimiento = vi.mocked(registrarMovimiento);
const mockEventBus = vi.mocked(eventBus);

// ── Helpers ──

function mockRequest(body: unknown): NextRequest {
  return new NextRequest("https://motolibre.test/api/webhooks/mercadopago", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeMPPayment(overrides: Record<string, unknown> = {}) {
  return {
    external_reference: "solicitud:sol-001",
    status: "approved",
    status_detail: "accredited",
    payment_method_id: "visa",
    payment_type_id: "credit_card",
    transaction_amount: 45000,
    transaction_details: { net_received_amount: 43200 },
    fee_details: [{ amount: 1800 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET endpoint ──

describe("GET", () => {
  it("retorna 200 con { status: 'ok' }", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });
});

// ── POST routing ──

describe("POST — routing", () => {
  it("type=payment con data.id → llama consultarPago", async () => {
    mockConsultarPago.mockResolvedValue(makeMPPayment() as never);
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "pago-1" });
    mockPrisma.solicitud.findUnique.mockResolvedValue(null);

    const res = await POST(mockRequest({ type: "payment", data: { id: "12345" } }));
    expect(res.status).toBe(200);
    expect(mockConsultarPago).toHaveBeenCalledWith("12345");
  });

  it("type desconocido → retorna 200 sin procesar", async () => {
    const res = await POST(mockRequest({ type: "unknown_type", data: { id: "1" } }));
    expect(res.status).toBe(200);
    expect(mockConsultarPago).not.toHaveBeenCalled();
  });

  it("body vacío/malformado → retorna 200 (no crash)", async () => {
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(200);
  });
});

// ── Solicitud payment flow ──

describe("POST — procesarPagoSolicitudAprobado", () => {
  beforeEach(() => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({ external_reference: "solicitud:sol-001" }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "pago-1" });
  });

  it("pago aprobado con solicitud → actualiza solicitud a PAGADA", async () => {
    mockPrisma.solicitud.findUnique
      .mockResolvedValueOnce({ id: "sol-001", estado: "PAGO_PENDIENTE", clienteId: "cli-1" })
      .mockResolvedValueOnce({
        id: "sol-001",
        clienteId: "cli-1",
        montoPrimerMes: 45000,
        marcaDeseada: "Honda",
        modeloDeseado: "Wave 110",
        plan: "MESES_12",
        cliente: { id: "cli-1" },
      });
    mockPrisma.pagoMercadoPago.findUnique.mockResolvedValue({ id: "pago-1" });
    mockGenerarFactura.mockResolvedValue({} as never);

    const res = await POST(mockRequest({ type: "payment", data: { id: "mp-001" } }));
    expect(res.status).toBe(200);

    expect(mockPrisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sol-001" },
        data: expect.objectContaining({ estado: "PAGADA", mpPaymentId: "mp-001" }),
      })
    );
  });

  it("solicitud ya PAGADA → no reprocesa (idempotencia)", async () => {
    mockPrisma.solicitud.findUnique.mockResolvedValue({
      id: "sol-001",
      estado: "PAGADA",
    });

    const res = await POST(mockRequest({ type: "payment", data: { id: "mp-001" } }));
    expect(res.status).toBe(200);
    expect(mockPrisma.solicitud.update).not.toHaveBeenCalled();
  });

  it("llama generarFacturaAutomatica para primer mes", async () => {
    mockPrisma.solicitud.findUnique
      .mockResolvedValueOnce({ id: "sol-001", estado: "PAGO_PENDIENTE" })
      .mockResolvedValueOnce({
        id: "sol-001",
        clienteId: "cli-1",
        montoPrimerMes: 45000,
        marcaDeseada: "Honda",
        modeloDeseado: "Wave 110",
        plan: "MESES_12",
        cliente: { id: "cli-1" },
      });
    mockPrisma.pagoMercadoPago.findUnique.mockResolvedValue({ id: "pago-1" });
    mockGenerarFactura.mockResolvedValue({} as never);

    await POST(mockRequest({ type: "payment", data: { id: "mp-001" } }));

    expect(mockGenerarFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        pagoMPId: "pago-1",
        solicitudId: "sol-001",
        clienteId: "cli-1",
        monto: 45000,
      })
    );
  });

  it("crea BusinessEvent con solicitud.pay", async () => {
    mockPrisma.solicitud.findUnique.mockResolvedValue({
      id: "sol-001",
      estado: "PAGO_PENDIENTE",
    });
    mockPrisma.pagoMercadoPago.findUnique.mockResolvedValue(null);

    await POST(mockRequest({ type: "payment", data: { id: "mp-001" } }));

    expect(mockPrisma.businessEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operationId: "solicitud.pay",
        entityType: "Solicitud",
        entityId: "sol-001",
      }),
    });
  });
});

// ── Cuota individual payment flow ──

describe("POST — procesarPagoCuotaAprobado", () => {
  beforeEach(() => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({
        external_reference: "cuota:cuota-001:contrato:con-001",
        transaction_amount: 12000,
      }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "pago-2" });
  });

  it("marca cuota como PAGADA", async () => {
    mockPrisma.cuota.findUnique
      .mockResolvedValueOnce({ id: "cuota-001", estado: "PENDIENTE", numero: 3, contratoId: "con-001" })
      .mockResolvedValueOnce({
        id: "cuota-001",
        contratoId: "con-001",
        numero: 3,
        fechaVencimiento: new Date("2025-04-01"),
        contrato: { clienteId: "cli-1", moto: { marca: "Honda", modelo: "Wave 110" } },
      });
    mockPrisma.pagoMercadoPago.findFirst.mockResolvedValue({ id: "pago-2" });
    mockGenerarFactura.mockResolvedValue({} as never);

    await POST(mockRequest({ type: "payment", data: { id: "mp-002" } }));

    expect(mockPrisma.cuota.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cuota-001" },
        data: expect.objectContaining({ estado: "PAGADA", montoPagado: 12000 }),
      })
    );
  });

  it("cuota ya PAGADA → no reprocesa", async () => {
    mockPrisma.cuota.findUnique.mockResolvedValue({
      id: "cuota-001",
      estado: "PAGADA",
      numero: 3,
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-002" } }));
    expect(mockPrisma.cuota.update).not.toHaveBeenCalled();
  });

  it("cuota #1 → transiciona moto RESERVADA a ALQUILADA", async () => {
    mockPrisma.cuota.findUnique
      .mockResolvedValueOnce({ id: "cuota-001", estado: "PENDIENTE", numero: 1, contratoId: "con-001" })
      .mockResolvedValueOnce({
        id: "cuota-001",
        contratoId: "con-001",
        numero: 1,
        fechaVencimiento: new Date(),
        contrato: { clienteId: "cli-1", moto: { marca: "Honda", modelo: "Wave" } },
      });
    mockPrisma.pagoMercadoPago.findFirst.mockResolvedValue({ id: "pago-2" });
    mockGenerarFactura.mockResolvedValue({} as never);
    mockPrisma.contrato.findUnique.mockResolvedValue({
      id: "con-001",
      motoId: "moto-001",
      moto: { estado: "RESERVADA" },
    });
    mockPrisma.solicitud.findFirst.mockResolvedValue({
      id: "sol-001",
      estado: "APROBADA",
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-002" } }));

    expect(mockPrisma.moto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "moto-001" },
        data: expect.objectContaining({ estado: "ALQUILADA", estadoAnterior: "RESERVADA" }),
      })
    );
    expect(mockPrisma.historialEstadoMoto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        motoId: "moto-001",
        estadoAnterior: "RESERVADA",
        estadoNuevo: "ALQUILADA",
      }),
    });
  });

  it("cuota #1 → actualiza solicitud a ENTREGADA", async () => {
    mockPrisma.cuota.findUnique
      .mockResolvedValueOnce({ id: "cuota-001", estado: "PENDIENTE", numero: 1, contratoId: "con-001" })
      .mockResolvedValueOnce({
        id: "cuota-001",
        contratoId: "con-001",
        numero: 1,
        fechaVencimiento: new Date(),
        contrato: { clienteId: "cli-1", moto: { marca: "Honda", modelo: "Wave" } },
      });
    mockPrisma.pagoMercadoPago.findFirst.mockResolvedValue({ id: "pago-2" });
    mockGenerarFactura.mockResolvedValue({} as never);
    mockPrisma.contrato.findUnique.mockResolvedValue({
      id: "con-001",
      motoId: "moto-001",
      moto: { estado: "RESERVADA" },
    });
    mockPrisma.solicitud.findFirst.mockResolvedValue({
      id: "sol-001",
      estado: "APROBADA",
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-002" } }));

    expect(mockPrisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sol-001" },
        data: expect.objectContaining({ estado: "ENTREGADA" }),
      })
    );
  });
});

// ── Recurrent payment flow ──

describe("POST — procesarPagoRecurrenteAprobado", () => {
  beforeEach(() => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({
        external_reference: "contrato:con-001",
        transaction_amount: 12000,
      }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "pago-3" });
  });

  it("busca cuota PENDIENTE/VENCIDA más antigua y la marca PAGADA", async () => {
    mockPrisma.cuota.findFirst.mockResolvedValue({
      id: "cuota-005",
      numero: 5,
      estado: "PENDIENTE",
      contratoId: "con-001",
      fechaVencimiento: new Date("2025-05-01"),
    });
    mockPrisma.pagoMercadoPago.findFirst.mockResolvedValue({ id: "pago-3" });
    mockPrisma.contrato.findUnique.mockResolvedValue({
      id: "con-001",
      clienteId: "cli-1",
      esLeaseToOwn: false,
      moto: { marca: "Honda", modelo: "Wave" },
      cuotas: [{ estado: "PAGADA" }, { estado: "PENDIENTE" }],
    });
    mockGenerarFactura.mockResolvedValue({} as never);

    await POST(mockRequest({ type: "payment", data: { id: "mp-003" } }));

    expect(mockPrisma.cuota.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cuota-005" },
        data: expect.objectContaining({ estado: "PAGADA", montoPagado: 12000 }),
      })
    );
  });

  it("sin cuotas pendientes → no crashea", async () => {
    mockPrisma.cuota.findFirst.mockResolvedValue(null);

    const res = await POST(mockRequest({ type: "payment", data: { id: "mp-003" } }));
    expect(res.status).toBe(200);
    expect(mockPrisma.cuota.update).not.toHaveBeenCalled();
  });

  it("lease-to-own sin cuotas pendientes → trigger procesarLeaseToOwn", async () => {
    mockPrisma.cuota.findFirst.mockResolvedValue({
      id: "cuota-last",
      numero: 12,
      estado: "VENCIDA",
      contratoId: "con-001",
      fechaVencimiento: new Date(),
    });
    mockPrisma.pagoMercadoPago.findFirst.mockResolvedValue({ id: "pago-3" });
    mockPrisma.contrato.findUnique.mockResolvedValue({
      id: "con-001",
      clienteId: "cli-1",
      esLeaseToOwn: true,
      moto: { marca: "Honda", modelo: "Wave" },
      cuotas: [{ estado: "PAGADA" }, { estado: "PAGADA" }], // all paid now
    });
    mockGenerarFactura.mockResolvedValue({} as never);

    await POST(mockRequest({ type: "payment", data: { id: "mp-003" } }));

    const { procesarLeaseToOwn } = await import("@/lib/lease-to-own");
    expect(procesarLeaseToOwn).toHaveBeenCalledWith("system");
  });
});

// ── Parts order (pedido) flow ──

describe("POST — procesarPagoPedidoAprobado", () => {
  beforeEach(() => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({
        external_reference: "pedido:ord-001",
        transaction_amount: 8500,
      }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "pago-4" });
  });

  it("marca orden como PAGADA", async () => {
    mockPrisma.ordenVentaRepuesto.findUnique.mockResolvedValue({
      id: "ord-001",
      numero: 101,
      estado: "PENDIENTE_PAGO",
      total: 8500,
      items: [
        { repuestoId: "rep-1", cantidad: 2, precioUnitario: 3000 },
        { repuestoId: "rep-2", cantidad: 1, precioUnitario: 2500 },
      ],
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-004" } }));

    expect(mockPrisma.ordenVentaRepuesto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-001" },
        data: expect.objectContaining({ estado: "PAGADA", mpPaymentId: "mp-004" }),
      })
    );
  });

  it("descuenta stock por cada item con registrarMovimiento", async () => {
    mockPrisma.ordenVentaRepuesto.findUnique.mockResolvedValue({
      id: "ord-001",
      numero: 101,
      estado: "PENDIENTE_PAGO",
      total: 8500,
      items: [
        { repuestoId: "rep-1", cantidad: 2, precioUnitario: 3000 },
        { repuestoId: "rep-2", cantidad: 1, precioUnitario: 2500 },
      ],
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-004" } }));

    expect(mockRegistrarMovimiento).toHaveBeenCalledTimes(2);
    expect(mockRegistrarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        repuestoId: "rep-1",
        tipo: "EGRESO",
        cantidad: 2,
        referenciaTipo: "OrdenVentaRepuesto",
        referenciaId: "ord-001",
      })
    );
    expect(mockRegistrarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        repuestoId: "rep-2",
        tipo: "EGRESO",
        cantidad: 1,
      })
    );
  });

  it("orden ya procesada (no PENDIENTE_PAGO) → no reprocesa", async () => {
    mockPrisma.ordenVentaRepuesto.findUnique.mockResolvedValue({
      id: "ord-001",
      estado: "PAGADA",
      items: [],
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-004" } }));
    expect(mockPrisma.ordenVentaRepuesto.update).not.toHaveBeenCalled();
  });

  it("emite evento sale.confirm", async () => {
    mockPrisma.ordenVentaRepuesto.findUnique.mockResolvedValue({
      id: "ord-001",
      numero: 101,
      estado: "PENDIENTE_PAGO",
      total: 8500,
      items: [],
    });

    await POST(mockRequest({ type: "payment", data: { id: "mp-004" } }));

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      "sale.confirm",
      "OrdenVentaRepuesto",
      "ord-001",
      expect.objectContaining({ mpPaymentId: "mp-004", total: 8500 }),
      "system"
    );
  });
});

// ── Subscription notification ──

describe("POST — procesarNotificacionSuscripcion", () => {
  it("actualiza SuscripcionMP desde preapproval de MP", async () => {
    mockPrisma.suscripcionMP.findUnique.mockResolvedValue({
      id: "sub-1",
      mpPreapprovalId: "preap-001",
      mpStatus: "pending",
    });
    mockMpPreApproval.get.mockResolvedValue({ status: "authorized" } as never);

    await POST(
      mockRequest({ type: "subscription_preapproval", data: { id: "preap-001" } })
    );

    expect(mockPrisma.suscripcionMP.update).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preap-001" },
      data: { mpStatus: "authorized" },
    });
  });

  it("suscripción no encontrada en DB → no crashea", async () => {
    mockPrisma.suscripcionMP.findUnique.mockResolvedValue(null);

    const res = await POST(
      mockRequest({ type: "subscription_preapproval", data: { id: "preap-999" } })
    );
    expect(res.status).toBe(200);
    expect(mockMpPreApproval.get).not.toHaveBeenCalled();
  });
});

// ── PagoMercadoPago upsert — mapearEstadoMP ──

describe("POST — mapearEstadoMP (vía upsert)", () => {
  it("status approved → APROBADO", async () => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({ status: "approved", external_reference: "" }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "p1" });

    await POST(mockRequest({ type: "payment", data: { id: "1" } }));

    const upsertCall = mockPrisma.pagoMercadoPago.upsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
    };
    expect(upsertCall.create.estado).toBe("APROBADO");
  });

  it("status rejected → RECHAZADO", async () => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({ status: "rejected", external_reference: "" }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "p2" });

    await POST(mockRequest({ type: "payment", data: { id: "2" } }));

    const upsertCall = mockPrisma.pagoMercadoPago.upsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
    };
    expect(upsertCall.create.estado).toBe("RECHAZADO");
  });

  it("status desconocido → default PENDIENTE", async () => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({ status: "something_else", external_reference: "" }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockResolvedValue({ id: "p3" });

    await POST(mockRequest({ type: "payment", data: { id: "3" } }));

    const upsertCall = mockPrisma.pagoMercadoPago.upsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
    };
    expect(upsertCall.create.estado).toBe("PENDIENTE");
  });
});

// ── Error handling ──

describe("POST — error handling", () => {
  it("consultarPago falla → retorna 200 (previene retry MP)", async () => {
    mockConsultarPago.mockRejectedValue(new Error("MP API timeout"));

    const res = await POST(mockRequest({ type: "payment", data: { id: "fail-1" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("error de Prisma durante procesamiento → retorna 200", async () => {
    mockConsultarPago.mockResolvedValue(
      makeMPPayment({ external_reference: "solicitud:sol-fail" }) as never
    );
    mockPrisma.pagoMercadoPago.upsert.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(mockRequest({ type: "payment", data: { id: "fail-2" } }));
    expect(res.status).toBe(200);
  });
});
