import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  cuentaContable: { findUnique: vi.fn() },
  periodoContable: { upsert: vi.fn() },
  asientoContable: { create: vi.fn() },
  lineaAsiento: { aggregate: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  getCuentaPorCodigo,
  obtenerPeriodo,
  crearAsiento,
  calcularSaldoCuenta,
  CUENTAS,
} from "@/lib/contabilidad-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getCuentaPorCodigo ──

describe("getCuentaPorCodigo", () => {
  it("retorna cuenta cuando existe y acepta movimientos", async () => {
    const cuenta = { id: "c1", codigo: "1.1.01.001", nombre: "Caja", aceptaMovimientos: true };
    mockPrisma.cuentaContable.findUnique.mockResolvedValue(cuenta);

    const result = await getCuentaPorCodigo("1.1.01.001");
    expect(result).toEqual(cuenta);
    expect(mockPrisma.cuentaContable.findUnique).toHaveBeenCalledWith({
      where: { codigo: "1.1.01.001" },
    });
  });

  it("lanza error cuando la cuenta no existe", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue(null);

    await expect(getCuentaPorCodigo("9.9.99.999")).rejects.toThrow(
      "Cuenta contable 9.9.99.999 no encontrada"
    );
  });

  it("lanza error cuando la cuenta no acepta movimientos (cuenta resumen)", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c2",
      codigo: "1.1.01",
      nombre: "Caja y Bancos",
      aceptaMovimientos: false,
    });

    await expect(getCuentaPorCodigo("1.1.01")).rejects.toThrow(
      "no acepta movimientos — es cuenta resumen"
    );
  });
});

// ── obtenerPeriodo ──

describe("obtenerPeriodo", () => {
  it("hace upsert con anio/mes/nombre correctos", async () => {
    const periodo = { id: "p1", anio: 2025, mes: 6, nombre: "Junio 2025", cerrado: false };
    mockPrisma.periodoContable.upsert.mockResolvedValue(periodo);

    const result = await obtenerPeriodo(new Date("2025-06-15"));

    expect(result).toEqual(periodo);
    expect(mockPrisma.periodoContable.upsert).toHaveBeenCalledWith({
      where: { anio_mes: { anio: 2025, mes: 6 } },
      update: {},
      create: { anio: 2025, mes: 6, nombre: "Junio 2025" },
    });
  });

  it("retorna período cuando no está cerrado", async () => {
    mockPrisma.periodoContable.upsert.mockResolvedValue({
      id: "p2",
      anio: 2025,
      mes: 1,
      nombre: "Enero 2025",
      cerrado: false,
    });

    const result = await obtenerPeriodo(new Date("2025-01-10"));
    expect(result.cerrado).toBe(false);
  });

  it("lanza error cuando el período está cerrado", async () => {
    mockPrisma.periodoContable.upsert.mockResolvedValue({
      id: "p3",
      anio: 2024,
      mes: 12,
      nombre: "Diciembre 2024",
      cerrado: true,
    });

    await expect(obtenerPeriodo(new Date("2024-12-15"))).rejects.toThrow(
      "El período Diciembre 2024 está cerrado"
    );
  });

  it("mapea nombres de meses correctamente (Enero a Diciembre)", async () => {
    const mesesEsperados = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    for (let i = 0; i < 12; i++) {
      mockPrisma.periodoContable.upsert.mockResolvedValue({
        id: `p-${i}`,
        anio: 2025,
        mes: i + 1,
        nombre: `${mesesEsperados[i]} 2025`,
        cerrado: false,
      });

      await obtenerPeriodo(new Date(2025, i, 15));

      const call = mockPrisma.periodoContable.upsert.mock.calls.at(-1)?.[0] as {
        create: { nombre: string };
      };
      expect(call.create.nombre).toBe(`${mesesEsperados[i]} 2025`);
    }
  });
});

// ── crearAsiento ──

describe("crearAsiento", () => {
  const lineasBalanceadas = [
    { cuentaId: "c-debe", debe: 1000, haber: 0, descripcion: "Débito" },
    { cuentaId: "c-haber", debe: 0, haber: 1000, descripcion: "Crédito" },
  ];

  beforeEach(() => {
    mockPrisma.periodoContable.upsert.mockResolvedValue({
      id: "per-1",
      anio: 2025,
      mes: 3,
      nombre: "Marzo 2025",
      cerrado: false,
    });
  });

  it("crea asiento con líneas balanceadas", async () => {
    const asientoCreado = {
      id: "as-1",
      fecha: new Date("2025-03-15"),
      tipo: "AUTOMATICO",
      descripcion: "Pago alquiler",
      totalDebe: 1000,
      totalHaber: 1000,
      lineas: lineasBalanceadas.map((l) => ({
        ...l,
        cuenta: { codigo: "1.1.01.001", nombre: "Caja" },
      })),
    };
    mockPrisma.asientoContable.create.mockResolvedValue(asientoCreado);

    const result = await crearAsiento({
      fecha: new Date("2025-03-15"),
      tipo: "AUTOMATICO" as never,
      descripcion: "Pago alquiler",
      lineas: lineasBalanceadas,
    });

    expect(result.id).toBe("as-1");
    expect(mockPrisma.asientoContable.create).toHaveBeenCalledOnce();
  });

  it("lanza error cuando debe !== haber (off by >= 0.01)", async () => {
    await expect(
      crearAsiento({
        fecha: new Date("2025-03-15"),
        tipo: "AUTOMATICO" as never,
        descripcion: "Desbalanceado",
        lineas: [
          { cuentaId: "c1", debe: 1000, haber: 0 },
          { cuentaId: "c2", debe: 0, haber: 999.98 },
        ],
      })
    ).rejects.toThrow("Asiento no balancea");
  });

  it("no lanza error con diferencia menor a 0.01 (redondeo flotante)", async () => {
    mockPrisma.asientoContable.create.mockResolvedValue({ id: "as-2", lineas: [] });

    // Difference of 0.009 should NOT throw
    await expect(
      crearAsiento({
        fecha: new Date("2025-03-15"),
        tipo: "AUTOMATICO" as never,
        descripcion: "Casi balanceado",
        lineas: [
          { cuentaId: "c1", debe: 1000, haber: 0 },
          { cuentaId: "c2", debe: 0, haber: 999.991 },
        ],
      })
    ).resolves.toBeDefined();
  });

  it("lanza error con menos de 2 líneas", async () => {
    await expect(
      crearAsiento({
        fecha: new Date("2025-03-15"),
        tipo: "AUTOMATICO" as never,
        descripcion: "Una sola línea",
        lineas: [{ cuentaId: "c1", debe: 0, haber: 0 }],
      })
    ).rejects.toThrow("al menos 2 líneas");
  });

  it("pasa origenTipo, origenId, eventoId y userId al create", async () => {
    mockPrisma.asientoContable.create.mockResolvedValue({ id: "as-3", lineas: [] });

    await crearAsiento({
      fecha: new Date("2025-03-15"),
      tipo: "AUTOMATICO" as never,
      descripcion: "Con metadatos",
      lineas: lineasBalanceadas,
      origenTipo: "PagoMercadoPago",
      origenId: "pago-001",
      eventoId: "evt-001",
      userId: "user-001",
    });

    const call = mockPrisma.asientoContable.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.origenTipo).toBe("PagoMercadoPago");
    expect(call.data.origenId).toBe("pago-001");
    expect(call.data.eventoId).toBe("evt-001");
    expect(call.data.creadoPor).toBe("user-001");
  });
});

// ── calcularSaldoCuenta ──

describe("calcularSaldoCuenta", () => {
  it("cuenta ACTIVO: retorna debe - haber", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c1",
      tipo: "ACTIVO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: 5000, haber: 2000 },
    });

    const saldo = await calcularSaldoCuenta("c1");
    expect(saldo).toBe(3000);
  });

  it("cuenta PASIVO: retorna haber - debe", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c2",
      tipo: "PASIVO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: 1000, haber: 4000 },
    });

    const saldo = await calcularSaldoCuenta("c2");
    expect(saldo).toBe(3000);
  });

  it("cuenta INGRESO: retorna haber - debe (acreedor)", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c3",
      tipo: "INGRESO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: 500, haber: 3000 },
    });

    const saldo = await calcularSaldoCuenta("c3");
    expect(saldo).toBe(2500);
  });

  it("cuenta EGRESO: retorna debe - haber (deudor)", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c4",
      tipo: "EGRESO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: 8000, haber: 1500 },
    });

    const saldo = await calcularSaldoCuenta("c4");
    expect(saldo).toBe(6500);
  });

  it("filtra por hastaFecha cuando se provee", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c1",
      tipo: "ACTIVO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: 1000, haber: 500 },
    });

    const fecha = new Date("2025-06-30");
    await calcularSaldoCuenta("c1", fecha);

    const call = mockPrisma.lineaAsiento.aggregate.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.asiento).toEqual({ fecha: { lte: fecha } });
  });

  it("retorna 0 cuando no hay movimientos (sums null)", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue({
      id: "c1",
      tipo: "ACTIVO",
    });
    mockPrisma.lineaAsiento.aggregate.mockResolvedValue({
      _sum: { debe: null, haber: null },
    });

    const saldo = await calcularSaldoCuenta("c1");
    expect(saldo).toBe(0);
  });

  it("lanza error cuando la cuenta no existe", async () => {
    mockPrisma.cuentaContable.findUnique.mockResolvedValue(null);

    await expect(calcularSaldoCuenta("inexistente")).rejects.toThrow(
      "Cuenta inexistente no encontrada"
    );
  });
});

// ── CUENTAS constant ──

describe("CUENTAS", () => {
  it("tiene todos los códigos de cuenta esperados", () => {
    expect(CUENTAS.CAJA).toBe("1.1.01.001");
    expect(CUENTAS.BANCO_MP).toBe("1.1.01.002");
    expect(CUENTAS.IVA_CF).toBe("1.1.03.001");
    expect(CUENTAS.IVA_DF).toBe("2.1.02.001");
    expect(CUENTAS.INGRESOS_ALQUILER).toBe("4.1.01.001");
    expect(CUENTAS.CAPITAL).toBe("3.1.01.001");
    expect(CUENTAS.GASTOS_BANCARIOS).toBe("5.2.02.001");
  });

  it("no tiene códigos duplicados", () => {
    const valores = Object.values(CUENTAS);
    const unicos = new Set(valores);
    expect(unicos.size).toBe(valores.length);
  });
});
