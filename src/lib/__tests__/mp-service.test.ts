import { describe, it, expect, vi, beforeEach } from "vitest";

// Set env BEFORE module import (APP_URL is captured at top-level const)
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://motolibre.test";
});

vi.mock("@/lib/mercadopago", () => ({
  mpPreference: { create: vi.fn() },
  mpPreApproval: { create: vi.fn(), update: vi.fn(), get: vi.fn() },
  mpPayment: { get: vi.fn() },
  mpPaymentRefund: { create: vi.fn() },
}));

import { mpPreference, mpPreApproval, mpPayment, mpPaymentRefund } from "@/lib/mercadopago";
import {
  crearPreferenciaPrimerMes,
  crearSuscripcionRecurrente,
  crearPreferenciaCuota,
  refundPago,
  consultarPago,
  pausarSuscripcion,
  cancelarSuscripcion,
} from "@/lib/mp-service";

const mockMpPreference = vi.mocked(mpPreference);
const mockMpPreApproval = vi.mocked(mpPreApproval);
const mockMpPayment = vi.mocked(mpPayment);
const mockMpPaymentRefund = vi.mocked(mpPaymentRefund);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── crearPreferenciaPrimerMes ──

describe("crearPreferenciaPrimerMes", () => {
  const params = {
    solicitudId: "sol-001",
    clienteNombre: "Juan",
    clienteApellido: "Pérez",
    clienteEmail: "juan@test.com",
    motoModelo: "Honda Wave 110",
    plan: "MESES_12",
    monto: 45000,
  };

  it("crea preferencia con items, payer, external_reference y back_urls correctos", async () => {
    mockMpPreference.create.mockResolvedValue({
      id: "pref-123",
      init_point: "https://mp.com/checkout",
      sandbox_init_point: "https://sandbox.mp.com/checkout",
    } as never);

    await crearPreferenciaPrimerMes(params);

    expect(mockMpPreference.create).toHaveBeenCalledOnce();
    const call = mockMpPreference.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const body = call.body as Record<string, unknown>;

    expect(body.items).toEqual([
      {
        id: "sol-001",
        title: "MotoLibre — Primer mes alquiler Honda Wave 110 (Plan 12 meses)",
        quantity: 1,
        unit_price: 45000,
        currency_id: "ARS",
      },
    ]);
    expect(body.payer).toEqual({
      name: "Juan",
      surname: "Pérez",
      email: "juan@test.com",
    });
    expect(body.external_reference).toBe("solicitud:sol-001");
    expect(body.back_urls).toEqual({
      success: "https://motolibre.test/solicitud/sol-001/pago-exitoso",
      failure: "https://motolibre.test/solicitud/sol-001/pago-fallido",
      pending: "https://motolibre.test/solicitud/sol-001/pago-pendiente",
    });
  });

  it("retorna preferenceId, initPoint y sandboxInitPoint", async () => {
    mockMpPreference.create.mockResolvedValue({
      id: "pref-123",
      init_point: "https://mp.com/checkout",
      sandbox_init_point: "https://sandbox.mp.com/checkout",
    } as never);

    const result = await crearPreferenciaPrimerMes(params);

    expect(result).toEqual({
      preferenceId: "pref-123",
      initPoint: "https://mp.com/checkout",
      sandboxInitPoint: "https://sandbox.mp.com/checkout",
    });
  });

  it("configura expiración de 72 horas, statement_descriptor y auto_return", async () => {
    mockMpPreference.create.mockResolvedValue({
      id: "pref-123",
      init_point: "https://mp.com/checkout",
      sandbox_init_point: "https://sandbox.mp.com/checkout",
    } as never);

    await crearPreferenciaPrimerMes(params);

    const call = mockMpPreference.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const body = call.body as Record<string, unknown>;

    expect(body.auto_return).toBe("approved");
    expect(body.statement_descriptor).toBe("MOTOLIBRE");
    expect(body.expires).toBe(true);
    expect(body.notification_url).toBe("https://motolibre.test/api/webhooks/mercadopago");
  });
});

// ── crearSuscripcionRecurrente ──

describe("crearSuscripcionRecurrente", () => {
  const baseParams = {
    contratoId: "con-001",
    clienteEmail: "juan@test.com",
    motoModelo: "Honda Wave 110",
    monto: 12000,
    duracionMeses: 12,
    fechaInicio: new Date("2025-03-01T00:00:00Z"),
  };

  beforeEach(() => {
    mockMpPreApproval.create.mockResolvedValue({
      id: "preap-123",
      init_point: "https://mp.com/preapproval",
      status: "pending",
    } as never);
  });

  it("frecuencia SEMANAL → frequency 7 days", async () => {
    await crearSuscripcionRecurrente({ ...baseParams, frecuencia: "SEMANAL" });

    const call = mockMpPreApproval.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const autoRecurring = (call.body as Record<string, unknown>).auto_recurring as Record<string, unknown>;
    expect(autoRecurring.frequency).toBe(7);
    expect(autoRecurring.frequency_type).toBe("days");
  });

  it("frecuencia MENSUAL → frequency 1 months", async () => {
    await crearSuscripcionRecurrente({ ...baseParams, frecuencia: "MENSUAL" });

    const call = mockMpPreApproval.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const autoRecurring = (call.body as Record<string, unknown>).auto_recurring as Record<string, unknown>;
    expect(autoRecurring.frequency).toBe(1);
    expect(autoRecurring.frequency_type).toBe("months");
  });

  it("calcula end_date correctamente desde fechaInicio + duracionMeses", async () => {
    await crearSuscripcionRecurrente({ ...baseParams, frecuencia: "MENSUAL" });

    const call = mockMpPreApproval.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const autoRecurring = (call.body as Record<string, unknown>).auto_recurring as Record<string, unknown>;
    const endDate = new Date(autoRecurring.end_date as string);
    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(2); // March (0-indexed)
  });

  it("retorna preapprovalId, initPoint y status", async () => {
    const result = await crearSuscripcionRecurrente({ ...baseParams, frecuencia: "MENSUAL" });

    expect(result).toEqual({
      preapprovalId: "preap-123",
      initPoint: "https://mp.com/preapproval",
      status: "pending",
    });
  });
});

// ── crearPreferenciaCuota ──

describe("crearPreferenciaCuota", () => {
  const params = {
    cuotaId: "cuota-001",
    contratoId: "con-001",
    numeroCuota: 3,
    clienteEmail: "juan@test.com",
    motoModelo: "Honda Wave 110",
    monto: 12000,
  };

  beforeEach(() => {
    mockMpPreference.create.mockResolvedValue({
      id: "pref-456",
      init_point: "https://mp.com/checkout",
      sandbox_init_point: "https://sandbox.mp.com/checkout",
    } as never);
  });

  it("crea preferencia con external_reference formato cuota:{id}:contrato:{id}", async () => {
    await crearPreferenciaCuota(params);

    const call = mockMpPreference.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const body = call.body as Record<string, unknown>;
    expect(body.external_reference).toBe("cuota:cuota-001:contrato:con-001");
  });

  it("usa back_urls por defecto cuando no se proveen", async () => {
    await crearPreferenciaCuota(params);

    const call = mockMpPreference.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const body = call.body as Record<string, unknown>;
    expect(body.back_urls).toEqual({
      success: "https://motolibre.test/pago-exitoso",
      failure: "https://motolibre.test/pago-fallido",
      pending: "https://motolibre.test/pago-pendiente",
    });
  });

  it("usa backUrls custom prepend con APP_URL", async () => {
    await crearPreferenciaCuota({
      ...params,
      backUrls: {
        success: "/mi-cuenta/pagos/resultado?status=success",
        failure: "/mi-cuenta/pagos/resultado?status=failure",
        pending: "/mi-cuenta/pagos/resultado?status=pending",
      },
    });

    const call = mockMpPreference.create.mock.calls[0]![0] as { body: Record<string, unknown> };
    const body = call.body as Record<string, unknown>;
    expect(body.back_urls).toEqual({
      success: "https://motolibre.test/mi-cuenta/pagos/resultado?status=success",
      failure: "https://motolibre.test/mi-cuenta/pagos/resultado?status=failure",
      pending: "https://motolibre.test/mi-cuenta/pagos/resultado?status=pending",
    });
  });

  it("retorna preferenceId, initPoint y sandboxInitPoint", async () => {
    const result = await crearPreferenciaCuota(params);

    expect(result).toEqual({
      preferenceId: "pref-456",
      initPoint: "https://mp.com/checkout",
      sandboxInitPoint: "https://sandbox.mp.com/checkout",
    });
  });
});

// ── refundPago ──

describe("refundPago", () => {
  it("convierte string paymentId a número", async () => {
    mockMpPaymentRefund.create.mockResolvedValue({} as never);
    await refundPago("12345");
    expect(mockMpPaymentRefund.create).toHaveBeenCalledWith({ payment_id: 12345, body: {} });
  });

  it("acepta paymentId numérico directamente", async () => {
    mockMpPaymentRefund.create.mockResolvedValue({} as never);
    await refundPago(67890);
    expect(mockMpPaymentRefund.create).toHaveBeenCalledWith({ payment_id: 67890, body: {} });
  });
});

// ── consultarPago ──

describe("consultarPago", () => {
  it("consulta pago con id numérico parseado", async () => {
    mockMpPayment.get.mockResolvedValue({ status: "approved" } as never);
    await consultarPago("99999");
    expect(mockMpPayment.get).toHaveBeenCalledWith({ id: 99999 });
  });
});

// ── pausarSuscripcion ──

describe("pausarSuscripcion", () => {
  it("actualiza status a paused", async () => {
    mockMpPreApproval.update.mockResolvedValue({} as never);
    await pausarSuscripcion("preap-123");
    expect(mockMpPreApproval.update).toHaveBeenCalledWith({
      id: "preap-123",
      body: { status: "paused" },
    });
  });
});

// ── cancelarSuscripcion ──

describe("cancelarSuscripcion", () => {
  it("actualiza status a cancelled", async () => {
    mockMpPreApproval.update.mockResolvedValue({} as never);
    await cancelarSuscripcion("preap-123");
    expect(mockMpPreApproval.update).toHaveBeenCalledWith({
      id: "preap-123",
      body: { status: "cancelled" },
    });
  });
});
