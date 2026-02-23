import { prisma } from "@/lib/prisma";

export interface CheckResult {
  nombre: string;
  modulo: string;
  estado: "OK" | "WARNING" | "ERROR";
  mensaje: string;
  detalle?: unknown;
  sugerencia?: string;
}

/**
 * Ejecuta todos los checks de diagnóstico del sistema.
 */
export async function ejecutarDiagnosticoCompleto(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // ── CHECK 1: Motos huérfanas (ALQUILADA sin contrato activo) ──
  const motosHuerfanas = await prisma.moto.findMany({
    where: {
      estado: "ALQUILADA",
      contratos: { none: { estado: "ACTIVO" } },
    },
    select: { id: true, patente: true },
  });
  results.push({
    nombre: "Motos huérfanas",
    modulo: "flota",
    estado: motosHuerfanas.length === 0 ? "OK" : "ERROR",
    mensaje:
      motosHuerfanas.length === 0
        ? "Todas las motos alquiladas tienen contrato activo"
        : `${motosHuerfanas.length} motos marcadas ALQUILADA sin contrato activo`,
    detalle: motosHuerfanas.length > 0 ? motosHuerfanas : undefined,
    sugerencia:
      "Ejecutar reparación de motos huérfanas para cambiar a DISPONIBLE",
  });

  // ── CHECK 2: Contratos activos con moto no alquilada ──
  const contratosHuerfanos = await prisma.contrato.findMany({
    where: {
      estado: "ACTIVO",
      moto: { estado: { not: "ALQUILADA" } },
    },
    select: { id: true, motoId: true },
  });
  results.push({
    nombre: "Contratos sin moto",
    modulo: "contratos",
    estado: contratosHuerfanos.length === 0 ? "OK" : "ERROR",
    mensaje:
      contratosHuerfanos.length === 0
        ? "Todos los contratos activos tienen moto asignada y alquilada"
        : `${contratosHuerfanos.length} contratos activos con moto inconsistente`,
    detalle: contratosHuerfanos.length > 0 ? contratosHuerfanos : undefined,
  });

  // ── CHECK 3: Pagos aprobados sin asiento contable ──
  const pagosCount = await prisma.pagoMercadoPago.count({
    where: { estado: "APROBADO" },
  });
  const asientosPagoCount = await prisma.asientoContable.count({
    where: { origenTipo: "PagoMercadoPago" },
  });
  results.push({
    nombre: "Pagos sin asiento",
    modulo: "contabilidad",
    estado: pagosCount <= asientosPagoCount ? "OK" : "WARNING",
    mensaje:
      pagosCount <= asientosPagoCount
        ? `${pagosCount} pagos aprobados, todos con asiento`
        : `${pagosCount} pagos aprobados pero solo ${asientosPagoCount} asientos de pago`,
    sugerencia:
      "Revisar handler payment.approve o reprocesar pagos sin asiento",
  });

  // ── CHECK 4: Balance contable (DEBE = HABER) ──
  const balanceCheck = await prisma.$queryRaw<
    [{ debe: number; haber: number }]
  >`
    SELECT
      COALESCE(SUM(debe), 0) as debe,
      COALESCE(SUM(haber), 0) as haber
    FROM lineas_asiento
  `;
  const debe = Number(balanceCheck[0]?.debe ?? 0);
  const haber = Number(balanceCheck[0]?.haber ?? 0);
  const diff = Math.abs(debe - haber);
  results.push({
    nombre: "Balance contable",
    modulo: "contabilidad",
    estado: diff < 1 ? "OK" : "ERROR",
    mensaje:
      diff < 1
        ? `Balance cuadra: DEBE $${debe.toLocaleString("es-AR")} = HABER $${haber.toLocaleString("es-AR")}`
        : `Descuadre de $${diff.toLocaleString("es-AR")}: DEBE $${debe.toLocaleString("es-AR")} vs HABER $${haber.toLocaleString("es-AR")}`,
    sugerencia: "Revisar últimos asientos contables y corregir diferencia",
  });

  // ── CHECK 5: Cuotas vencidas sin cobrar ──
  const cuotasVencidas = await prisma.cuota.count({
    where: {
      estado: "PENDIENTE",
      fechaVencimiento: { lt: new Date() },
    },
  });
  results.push({
    nombre: "Cuotas vencidas",
    modulo: "pagos",
    estado: cuotasVencidas === 0 ? "OK" : "WARNING",
    mensaje:
      cuotasVencidas === 0
        ? "No hay cuotas vencidas pendientes"
        : `${cuotasVencidas} cuotas vencidas sin cobrar`,
    sugerencia: "Ejecutar job de vencimientos o contactar clientes",
  });

  // ── CHECK 6: Stock negativo ──
  const stockNegativo = await prisma.repuesto.count({
    where: { stock: { lt: 0 } },
  });
  results.push({
    nombre: "Stock negativo",
    modulo: "inventario",
    estado: stockNegativo === 0 ? "OK" : "ERROR",
    mensaje:
      stockNegativo === 0
        ? "No hay repuestos con stock negativo"
        : `${stockNegativo} repuestos con stock negativo (inconsistencia)`,
    sugerencia: "Ajustar stock manualmente o revisar movimientos",
  });

  // ── CHECK 7: Empleados activos sin sueldo ──
  const empleadosSinSueldo = await prisma.empleado.count({
    where: { estado: "ACTIVO", sueldoBasico: { lte: 0 } },
  });
  results.push({
    nombre: "Empleados sin sueldo",
    modulo: "rrhh",
    estado: empleadosSinSueldo === 0 ? "OK" : "WARNING",
    mensaje:
      empleadosSinSueldo === 0
        ? "Todos los empleados activos tienen sueldo configurado"
        : `${empleadosSinSueldo} empleados activos con sueldo $0 o negativo`,
  });

  // ── CHECK 8: Usuarios sin perfil de permisos ──
  const usuariosSinPerfil = await prisma.user.count({
    where: { profiles: { none: {} } },
  });
  results.push({
    nombre: "Usuarios sin perfil",
    modulo: "sistema",
    estado: usuariosSinPerfil === 0 ? "OK" : "WARNING",
    mensaje:
      usuariosSinPerfil === 0
        ? "Todos los usuarios tienen perfil de permisos asignado"
        : `${usuariosSinPerfil} usuarios sin perfil de permisos`,
    sugerencia: "Asignar perfiles desde Admin > Permisos",
  });

  // ── CHECK 9: Conciliaciones en proceso > 30 días ──
  const treintaDias = new Date();
  treintaDias.setDate(treintaDias.getDate() - 30);
  const concilViejas = await prisma.conciliacion.count({
    where: { estado: "EN_PROCESO", createdAt: { lt: treintaDias } },
  });
  results.push({
    nombre: "Conciliaciones abandonadas",
    modulo: "conciliacion",
    estado: concilViejas === 0 ? "OK" : "WARNING",
    mensaje:
      concilViejas === 0
        ? "No hay conciliaciones en proceso viejas"
        : `${concilViejas} conciliaciones en proceso hace más de 30 días`,
  });

  // ── CHECK 10: Embarques en tránsito > 90 días ──
  const noventaDias = new Date();
  noventaDias.setDate(noventaDias.getDate() - 90);
  const embarquesViejos = await prisma.embarqueImportacion.count({
    where: { estado: "EN_TRANSITO", createdAt: { lt: noventaDias } },
  });
  results.push({
    nombre: "Embarques demorados",
    modulo: "importaciones",
    estado: embarquesViejos === 0 ? "OK" : "WARNING",
    mensaje:
      embarquesViejos === 0
        ? "No hay embarques en tránsito demorados"
        : `${embarquesViejos} embarques en tránsito hace más de 90 días`,
  });

  return results;
}

/**
 * Limpia eventos del sistema más antiguos que el límite especificado.
 */
export async function limpiarEventosAntiguos(diasRetener = 90) {
  const limite = new Date();
  limite.setDate(limite.getDate() - diasRetener);

  const deleted = await prisma.eventoSistema.deleteMany({
    where: { createdAt: { lt: limite } },
  });

  return deleted.count;
}
