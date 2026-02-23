import { prisma } from "@/lib/prisma";

/**
 * Genera próximo número: CONC-2026-XXXXX
 */
export async function proximoNumeroConciliacion(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefix = `CONC-${anio}-`;
  const ultima = await prisma.conciliacion.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: "desc" },
  });
  const seq = ultima ? parseInt(ultima.numero.split("-")[2] ?? "0") + 1 : 1;
  return `${prefix}${seq.toString().padStart(5, "0")}`;
}

// ── CSV Parser ──────────────────────────────────────────────────

export interface ExtractoRow {
  fecha: Date;
  descripcion: string;
  referencia: string | null;
  monto: number;
  saldo: number | null;
}

/**
 * Parsea CSV de extracto bancario.
 * Formato flexible: detecta columnas por headers.
 * Soporta formatos comunes de bancos argentinos.
 */
export function parsearCSVExtracto(csv: string): ExtractoRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vacío o sin datos");

  const header = lines[0]!.toLowerCase();

  // Detectar separador
  const separator = header.includes(";") ? ";" : ",";

  const headers = header.split(separator).map((h) => h.trim().replace(/"/g, ""));

  // Detectar índices de columnas
  const fechaIdx = headers.findIndex((h) => h.includes("fecha"));
  const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("concepto") || h.includes("detalle"));
  const refIdx = headers.findIndex((h) => h.includes("ref") || h.includes("comprobante") || h.includes("numero"));
  const montoIdx = headers.findIndex((h) => h.includes("monto") || h.includes("importe"));
  const debitoIdx = headers.findIndex((h) => h.includes("debito") || h.includes("débito") || h.includes("egreso"));
  const creditoIdx = headers.findIndex((h) => h.includes("credito") || h.includes("crédito") || h.includes("ingreso"));
  const saldoIdx = headers.findIndex((h) => h.includes("saldo"));

  if (fechaIdx === -1) throw new Error("No se encontró columna de fecha");
  if (descIdx === -1) throw new Error("No se encontró columna de descripción");
  if (montoIdx === -1 && debitoIdx === -1) throw new Error("No se encontró columna de monto");

  const result: ExtractoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""));

    // Parsear fecha (DD/MM/YYYY o YYYY-MM-DD)
    const fechaStr = cols[fechaIdx] ?? "";
    let fecha: Date;
    if (fechaStr.includes("/")) {
      const [d, m, y] = fechaStr.split("/");
      fecha = new Date(parseInt(y ?? "2026"), parseInt(m ?? "1") - 1, parseInt(d ?? "1"));
    } else {
      fecha = new Date(fechaStr);
    }

    if (isNaN(fecha.getTime())) continue; // Skip invalid dates

    // Parsear monto (formato argentino: 1.234,56)
    const parseArgNum = (s: string): number =>
      parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

    let monto: number;
    if (montoIdx !== -1) {
      monto = parseArgNum(cols[montoIdx] ?? "0");
    } else {
      const debito = parseArgNum(cols[debitoIdx] ?? "0");
      const credito = parseArgNum(cols[creditoIdx] ?? "0");
      monto = credito - debito;
    }

    const saldo = saldoIdx !== -1 ? parseArgNum(cols[saldoIdx] ?? "0") : null;

    result.push({
      fecha,
      descripcion: cols[descIdx] ?? "",
      referencia: refIdx !== -1 ? (cols[refIdx] || null) : null,
      monto,
      saldo,
    });
  }

  return result;
}

// ── Matching Engine ─────────────────────────────────────────────

export interface MatchResult {
  extractoId: string;
  entidadTipo: string;
  entidadId: string;
  entidadLabel: string;
  tipoMatch: "EXACTO" | "APROXIMADO" | "REFERENCIA";
  confianza: number;
  montoBanco: number;
  montoSistema: number;
  diferencia: number;
}

interface MovInterno {
  tipo: string;
  id: string;
  label: string;
  monto: number;
  fecha: Date;
  referencia?: string;
}

/**
 * Ejecuta matching en 3 pasos para una conciliación.
 * Retorna matches propuestos sin guardar.
 */
export async function ejecutarMatching(params: {
  cuentaBancariaId: string;
  periodoDesde: Date;
  periodoHasta: Date;
}): Promise<MatchResult[]> {
  const { cuentaBancariaId, periodoDesde, periodoHasta } = params;
  const matches: MatchResult[] = [];
  const extractosUsados = new Set<string>();
  const movimientosUsados = new Set<string>();

  // Obtener extractos no conciliados del período
  const extractos = await prisma.extractoBancario.findMany({
    where: {
      cuentaBancariaId,
      fecha: { gte: periodoDesde, lte: periodoHasta },
      conciliado: false,
    },
    orderBy: { fecha: "asc" },
  });

  // Obtener movimientos internos del período
  const [pagos, gastos, facturasCompra, recibos] = await Promise.all([
    prisma.pagoMercadoPago.findMany({
      where: {
        estado: "APROBADO",
        fechaPago: { gte: periodoDesde, lte: periodoHasta },
      },
    }),
    prisma.gasto.findMany({
      where: {
        estado: "APROBADO",
        fecha: { gte: periodoDesde, lte: periodoHasta },
      },
    }),
    prisma.facturaCompra.findMany({
      where: {
        estado: "PAGADA",
        fechaEmision: { gte: periodoDesde, lte: periodoHasta },
      },
    }),
    prisma.reciboSueldo.findMany({
      where: {
        estado: "PAGADO",
        fechaPago: { gte: periodoDesde, lte: periodoHasta },
      },
      include: { empleado: { select: { nombre: true, apellido: true } } },
    }),
  ]);

  // Normalizar movimientos internos
  const movimientos: MovInterno[] = [
    ...pagos.map((p) => ({
      tipo: "PagoMercadoPago",
      id: p.id,
      label: `Pago ${p.mpPaymentId || p.id.slice(0, 8)} — $${Number(p.monto).toLocaleString("es-AR")}`,
      monto: Number(p.monto), // Positivo = ingreso
      fecha: p.fechaPago ?? p.createdAt,
      referencia: p.mpPaymentId ?? undefined,
    })),
    ...gastos.map((g) => ({
      tipo: "Gasto",
      id: g.id,
      label: `Gasto ${g.id.slice(0, 8)} — ${g.descripcion}`,
      monto: -Number(g.monto), // Negativo = egreso
      fecha: g.fecha,
    })),
    ...facturasCompra.map((fc) => ({
      tipo: "FacturaCompra",
      id: fc.id,
      label: `FC ${fc.numeroCompleto || fc.numero} — ${fc.proveedorNombre}`,
      monto: -Number(fc.montoTotal), // Negativo = egreso
      fecha: fc.fechaEmision,
    })),
    ...recibos.map((r) => ({
      tipo: "ReciboSueldo",
      id: r.id,
      label: `Recibo ${r.numero} — ${r.empleado.nombre} ${r.empleado.apellido}`,
      monto: -Number(r.netoAPagar), // Negativo = egreso
      fecha: r.fechaPago!,
    })),
  ];

  // ── PASO 1: EXACT MATCH (monto exacto) ──
  for (const ext of extractos) {
    if (extractosUsados.has(ext.id)) continue;
    const montoExt = Number(ext.monto);

    for (const mov of movimientos) {
      if (movimientosUsados.has(mov.id)) continue;

      if (Math.abs(montoExt - mov.monto) < 0.01) {
        // Si además coincide referencia, confianza 100%
        const refMatch =
          ext.referencia &&
          mov.referencia &&
          ext.referencia.toLowerCase().includes(mov.referencia.toLowerCase());

        matches.push({
          extractoId: ext.id,
          entidadTipo: mov.tipo,
          entidadId: mov.id,
          entidadLabel: mov.label,
          tipoMatch: "EXACTO",
          confianza: refMatch ? 100 : 90,
          montoBanco: montoExt,
          montoSistema: mov.monto,
          diferencia: 0,
        });

        extractosUsados.add(ext.id);
        movimientosUsados.add(mov.id);
        break;
      }
    }
  }

  // ── PASO 2: APPROXIMATE MATCH (tolerancia 1%) ──
  for (const ext of extractos) {
    if (extractosUsados.has(ext.id)) continue;
    const montoExt = Number(ext.monto);
    const tolerancia = Math.abs(montoExt) * 0.01;

    for (const mov of movimientos) {
      if (movimientosUsados.has(mov.id)) continue;

      const diff = Math.abs(montoExt - mov.monto);
      if (diff > 0.01 && diff <= tolerancia) {
        matches.push({
          extractoId: ext.id,
          entidadTipo: mov.tipo,
          entidadId: mov.id,
          entidadLabel: mov.label,
          tipoMatch: "APROXIMADO",
          confianza: Math.round(70 - (diff / tolerancia) * 20),
          montoBanco: montoExt,
          montoSistema: mov.monto,
          diferencia: Math.round((montoExt - mov.monto) * 100) / 100,
        });

        extractosUsados.add(ext.id);
        movimientosUsados.add(mov.id);
        break;
      }
    }
  }

  // ── PASO 3: REFERENCE MATCH (texto de descripción del extracto) ──
  for (const ext of extractos) {
    if (extractosUsados.has(ext.id)) continue;
    const desc = ext.descripcion.toLowerCase();

    for (const mov of movimientos) {
      if (movimientosUsados.has(mov.id)) continue;

      // Buscar nombre del cliente/proveedor/empleado en la descripción
      const labelParts = mov.label.toLowerCase().split(" — ");
      const nombre = labelParts[1] || "";

      if (nombre.length > 3 && desc.includes(nombre.split(" ")[0]!)) {
        matches.push({
          extractoId: ext.id,
          entidadTipo: mov.tipo,
          entidadId: mov.id,
          entidadLabel: mov.label,
          tipoMatch: "REFERENCIA",
          confianza: 40,
          montoBanco: Number(ext.monto),
          montoSistema: mov.monto,
          diferencia: Math.round((Number(ext.monto) - mov.monto) * 100) / 100,
        });

        extractosUsados.add(ext.id);
        movimientosUsados.add(mov.id);
        break;
      }
    }
  }

  return matches.sort((a, b) => b.confianza - a.confianza);
}
