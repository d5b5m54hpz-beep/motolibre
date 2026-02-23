import { prisma } from "@/lib/prisma";
import type { TipoAnomalia, SeveridadAnomalia } from "@prisma/client";
import { formatMoney } from "@/lib/format";

export interface AnomaliaDetectada {
  tipo: TipoAnomalia;
  severidad: SeveridadAnomalia;
  entidadTipo: string;
  entidadId: string;
  entidadLabel: string;
  titulo: string;
  descripcion: string;
  valorDetectado?: number;
  valorEsperado?: number;
  algoritmo: string;
  datosExtra?: string;
}

// ─────────────────────────────────────────────────────────
// 1. GASTO INUSUAL: gasto > 3x promedio de la categoría (últimos 6 meses)
// ─────────────────────────────────────────────────────────
export async function detectarGastoInusual(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const ahora = new Date();
  const hace1Mes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const hace7Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 7, 1);

  // Gastos aprobados del último mes
  const gastosRecientes = await prisma.gasto.findMany({
    where: {
      estado: "APROBADO",
      fecha: { gte: hace1Mes },
    },
  });

  // Para cada categoría, calcular promedio de 6 meses previos
  const categoriasVistas = new Set(gastosRecientes.map((g) => g.categoria));

  for (const cat of categoriasVistas) {
    const promedios = await prisma.gasto.aggregate({
      where: {
        estado: "APROBADO",
        categoria: cat,
        fecha: { gte: hace7Meses, lt: hace1Mes },
      },
      _avg: { monto: true },
      _count: true,
    });

    const promedio = Number(promedios._avg.monto || 0);
    if (promedio === 0 || promedios._count < 2) continue;

    const gastosCategoria = gastosRecientes.filter((g) => g.categoria === cat);
    for (const gasto of gastosCategoria) {
      const monto = Number(gasto.monto);
      const ratio = monto / promedio;

      if (ratio >= 3) {
        const severidad: SeveridadAnomalia = ratio >= 5 ? "ALTA" : "MEDIA";
        anomalias.push({
          tipo: "GASTO_INUSUAL",
          severidad,
          entidadTipo: "Gasto",
          entidadId: gasto.id,
          entidadLabel: `Gasto ${cat} — ${formatMoney(monto)}`,
          titulo: `Gasto inusual: ${formatMoney(monto)} en ${cat}`,
          descripcion: `El gasto de ${formatMoney(monto)} es ${ratio.toFixed(1)}x el promedio de ${formatMoney(promedio)} para la categoría ${cat} en los últimos 6 meses.`,
          valorDetectado: monto,
          valorEsperado: promedio,
          algoritmo: "detectarGastoInusual",
          datosExtra: JSON.stringify({ ratio, promedioHistorico: promedio, mesesAnalizados: 6 }),
        });
      }
    }
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 2. PAGO DUPLICADO: mismo cliente, mismo monto, dentro de 48 horas
// ─────────────────────────────────────────────────────────
export async function detectarPagoDuplicado(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const pagosRecientes = await prisma.pagoMercadoPago.findMany({
    where: {
      estado: "APROBADO",
      fechaPago: { gte: hace48h },
    },
    orderBy: { fechaPago: "asc" },
  });

  // Agrupar por contratoId + monto
  const grupos = new Map<string, typeof pagosRecientes>();
  for (const pago of pagosRecientes) {
    const key = `${pago.contratoId || pago.solicitudId}_${Number(pago.monto)}`;
    const grupo = grupos.get(key) || [];
    grupo.push(pago);
    grupos.set(key, grupo);
  }

  for (const [, grupo] of grupos) {
    if (grupo.length < 2) continue;

    // El segundo pago es el sospechoso
    for (let i = 1; i < grupo.length; i++) {
      const pago = grupo[i]!;
      const monto = Number(pago.monto);
      anomalias.push({
        tipo: "PAGO_DUPLICADO",
        severidad: "ALTA",
        entidadTipo: "Pago",
        entidadId: pago.id,
        entidadLabel: `Pago ${formatMoney(monto)} — MP #${pago.mpPaymentId || pago.id.slice(0, 8)}`,
        titulo: `Posible pago duplicado: ${formatMoney(monto)}`,
        descripcion: `Se detectaron ${grupo.length} pagos por ${formatMoney(monto)} para el mismo contrato/solicitud en menos de 48 horas.`,
        valorDetectado: monto,
        algoritmo: "detectarPagoDuplicado",
        datosExtra: JSON.stringify({ pagoIds: grupo.map((p) => p.id), cantidadDuplicados: grupo.length }),
      });
    }
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 3. FACTURA SIN PAGO: factura generada hace > 30 días sin pago
// ─────────────────────────────────────────────────────────
export async function detectarFacturaSinPago(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const ahora = new Date();
  const hace30d = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hace60d = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000);
  const hace90d = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);

  const facturas = await prisma.factura.findMany({
    where: {
      estado: "GENERADA",
      fechaEmision: { lte: hace30d },
    },
  });

  // Verificar si tienen pago asociado
  for (const factura of facturas) {
    if (factura.pagoMPId) continue; // ya tiene pago directo

    // Buscar pago por contratoId o cuotaId
    if (factura.contratoId || factura.cuotaId) {
      const pagoExiste = await prisma.pagoMercadoPago.findFirst({
        where: {
          estado: "APROBADO",
          OR: [
            factura.contratoId ? { contratoId: factura.contratoId } : {},
            factura.cuotaId ? { cuotaId: factura.cuotaId } : {},
          ].filter((o) => Object.keys(o).length > 0),
          fechaPago: { gte: factura.fechaEmision },
        },
      });
      if (pagoExiste) continue;
    }

    const diasSinPago = Math.floor((ahora.getTime() - factura.fechaEmision.getTime()) / (24 * 60 * 60 * 1000));
    const monto = Number(factura.montoTotal);

    let severidad: SeveridadAnomalia = "MEDIA";
    if (factura.fechaEmision <= hace90d) severidad = "CRITICA";
    else if (factura.fechaEmision <= hace60d) severidad = "ALTA";

    anomalias.push({
      tipo: "FACTURA_SIN_PAGO",
      severidad,
      entidadTipo: "Factura",
      entidadId: factura.id,
      entidadLabel: `Factura ${factura.numeroCompleto || factura.id.slice(0, 8)} — ${formatMoney(monto)}`,
      titulo: `Factura sin pago hace ${diasSinPago} días: ${formatMoney(monto)}`,
      descripcion: `La factura ${factura.numeroCompleto || "#" + factura.id.slice(0, 8)} por ${formatMoney(monto)} fue emitida hace ${diasSinPago} días y no tiene pago asociado.`,
      valorDetectado: monto,
      algoritmo: "detectarFacturaSinPago",
      datosExtra: JSON.stringify({ diasSinPago, fechaEmision: factura.fechaEmision }),
    });
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 4. MARGEN BAJO: moto con margen operativo < 10% en el mes
// ─────────────────────────────────────────────────────────
export async function detectarMargenBajo(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  // Motos alquiladas
  const motos = await prisma.moto.findMany({
    where: { estado: "ALQUILADA" },
    select: { id: true, marca: true, modelo: true, patente: true },
  });

  for (const moto of motos) {
    // Ingresos: pagos aprobados del mes para contratos de esta moto
    const contratos = await prisma.contrato.findMany({
      where: { motoId: moto.id, estado: "ACTIVO" },
      select: { id: true },
    });
    const contratoIds = contratos.map((c) => c.id);
    if (contratoIds.length === 0) continue;

    const pagos = await prisma.pagoMercadoPago.aggregate({
      where: {
        estado: "APROBADO",
        contratoId: { in: contratoIds },
        fechaPago: { gte: inicioMes },
      },
      _sum: { monto: true },
    });
    const ingresos = Number(pagos._sum.monto || 0);
    if (ingresos === 0) continue;

    // Costos: gastos asociados a la moto + OTs completadas
    const gastos = await prisma.gasto.aggregate({
      where: {
        estado: "APROBADO",
        motoId: moto.id,
        fecha: { gte: inicioMes },
      },
      _sum: { monto: true },
    });

    const otCostos = await prisma.ordenTrabajo.aggregate({
      where: {
        motoId: moto.id,
        estado: "COMPLETADA",
        fechaFinReal: { gte: inicioMes },
      },
      _sum: { costoTotal: true },
    });

    const costos = Number(gastos._sum.monto || 0) + Number(otCostos._sum?.costoTotal || 0);
    const margen = ((ingresos - costos) / ingresos) * 100;

    if (margen < 10) {
      const severidad: SeveridadAnomalia = margen < 0 ? "ALTA" : "MEDIA";
      const label = `${moto.marca} ${moto.modelo} (${moto.patente})`;

      anomalias.push({
        tipo: "MARGEN_BAJO",
        severidad,
        entidadTipo: "Moto",
        entidadId: moto.id,
        entidadLabel: label,
        titulo: `Margen bajo ${margen.toFixed(1)}%: ${label}`,
        descripcion: `La moto ${label} tiene un margen operativo de ${margen.toFixed(1)}% este mes. Ingresos: ${formatMoney(ingresos)}, Costos: ${formatMoney(costos)}.`,
        valorDetectado: Math.round(margen * 100) / 100,
        valorEsperado: 10,
        algoritmo: "detectarMargenBajo",
        datosExtra: JSON.stringify({ ingresos, costos, margen }),
      });
    }
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 5. STOCK CRÍTICO: repuesto con stock = 0
// ─────────────────────────────────────────────────────────
export async function detectarStockCritico(): Promise<AnomaliaDetectada[]> {
  const repuestos = await prisma.repuesto.findMany({
    where: {
      activo: true,
      stock: { lte: 0 },
    },
    select: { id: true, codigo: true, nombre: true, categoria: true, stock: true, stockMinimo: true },
  });

  return repuestos.map((r) => ({
    tipo: "STOCK_CRITICO" as TipoAnomalia,
    severidad: "ALTA" as SeveridadAnomalia,
    entidadTipo: "Repuesto",
    entidadId: r.id,
    entidadLabel: `${r.codigo} — ${r.nombre}`,
    titulo: `Stock agotado: ${r.codigo} — ${r.nombre}`,
    descripcion: `El repuesto ${r.nombre} (${r.codigo}) tiene stock ${r.stock}. Categoría: ${r.categoria}. Stock mínimo configurado: ${r.stockMinimo}.`,
    valorDetectado: r.stock,
    valorEsperado: r.stockMinimo,
    algoritmo: "detectarStockCritico",
    datosExtra: JSON.stringify({ categoria: r.categoria }),
  }));
}

// ─────────────────────────────────────────────────────────
// 6. DESVÍO PRESUPUESTO: categoría ejecutada > 120% del presupuesto
// ─────────────────────────────────────────────────────────
export async function detectarDesvioPresupuesto(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth() + 1;

  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { anio, mes },
  });

  for (const pres of presupuestos) {
    const presupuestado = Number(pres.montoPresupuestado);
    if (presupuestado === 0) continue;

    // Calcular gastos ejecutados reales para esta categoría
    const gastos = await prisma.gasto.aggregate({
      where: {
        estado: "APROBADO",
        categoria: pres.categoria,
        fecha: {
          gte: new Date(anio, mes - 1, 1),
          lt: new Date(anio, mes, 1),
        },
      },
      _sum: { monto: true },
    });

    const ejecutado = Number(gastos._sum.monto || 0);
    const porcentaje = (ejecutado / presupuestado) * 100;

    if (porcentaje > 120) {
      let severidad: SeveridadAnomalia = "MEDIA";
      if (porcentaje > 200) severidad = "CRITICA";
      else if (porcentaje > 150) severidad = "ALTA";

      anomalias.push({
        tipo: "DESVIO_PRESUPUESTO",
        severidad,
        entidadTipo: "Presupuesto",
        entidadId: pres.id,
        entidadLabel: `Presupuesto ${pres.categoria} — ${mes}/${anio}`,
        titulo: `Desvío ${porcentaje.toFixed(0)}%: ${pres.categoria}`,
        descripcion: `La categoría ${pres.categoria} lleva ejecutado ${formatMoney(ejecutado)} contra un presupuesto de ${formatMoney(presupuestado)} (${porcentaje.toFixed(1)}%).`,
        valorDetectado: ejecutado,
        valorEsperado: presupuestado,
        algoritmo: "detectarDesvioPresupuesto",
        datosExtra: JSON.stringify({ porcentaje, anio, mes }),
      });
    }
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 7. FLUJO CAJA NEGATIVO: proyección 7 días muestra saldo negativo
// ─────────────────────────────────────────────────────────
export async function detectarFlujoCajaNegativo(): Promise<AnomaliaDetectada[]> {
  const ahora = new Date();
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Saldo actual: pagos aprobados - gastos aprobados (simplificación)
  const [totalPagos, totalGastos] = await Promise.all([
    prisma.pagoMercadoPago.aggregate({
      where: { estado: "APROBADO" },
      _sum: { monto: true },
    }),
    prisma.gasto.aggregate({
      where: { estado: "APROBADO" },
      _sum: { monto: true },
    }),
  ]);

  const saldoActual = Number(totalPagos._sum.monto || 0) - Number(totalGastos._sum.monto || 0);

  // Entradas próximos 7 días: cuotas pendientes por vencer
  const cuotasPorCobrar = await prisma.cuota.aggregate({
    where: {
      estado: "PENDIENTE",
      fechaVencimiento: { gte: ahora, lte: en7Dias },
    },
    _sum: { monto: true },
  });
  const entradasProyectadas = Number(cuotasPorCobrar._sum.monto || 0);

  // Salidas próximos 7 días: gastos pendientes + facturas compra pendientes
  const gastosPendientes = await prisma.gasto.aggregate({
    where: {
      estado: "PENDIENTE",
      fecha: { gte: ahora, lte: en7Dias },
    },
    _sum: { monto: true },
  });
  const salidasProyectadas = Number(gastosPendientes._sum.monto || 0);

  const saldoProyectado = saldoActual + entradasProyectadas - salidasProyectadas;

  if (saldoProyectado < 0) {
    return [{
      tipo: "FLUJO_CAJA_NEGATIVO",
      severidad: "CRITICA",
      entidadTipo: "Sistema",
      entidadId: "flujo-caja",
      entidadLabel: "Flujo de Caja — Proyección 7 días",
      titulo: `Flujo de caja negativo proyectado: ${formatMoney(saldoProyectado)}`,
      descripcion: `El saldo proyectado a 7 días es ${formatMoney(saldoProyectado)}. Saldo actual: ${formatMoney(saldoActual)}, Entradas esperadas: ${formatMoney(entradasProyectadas)}, Salidas esperadas: ${formatMoney(salidasProyectadas)}.`,
      valorDetectado: saldoProyectado,
      valorEsperado: 0,
      algoritmo: "detectarFlujoCajaNegativo",
      datosExtra: JSON.stringify({ saldoActual, entradasProyectadas, salidasProyectadas }),
    }];
  }

  return [];
}

// ─────────────────────────────────────────────────────────
// 8. VENCIMIENTOS PRÓXIMOS: cuotas vencidas > 7 días sin gestión
// ─────────────────────────────────────────────────────────
export async function detectarVencimientosProximos(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const ahora = new Date();
  const hace7d = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const cuotasVencidas = await prisma.cuota.findMany({
    where: {
      estado: { in: ["PENDIENTE", "VENCIDA"] },
      fechaVencimiento: { lt: hace7d },
    },
    include: {
      contrato: {
        select: { clienteId: true, motoId: true, cliente: { select: { nombre: true, apellido: true } } },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  for (const cuota of cuotasVencidas) {
    const diasVencida = Math.floor((ahora.getTime() - cuota.fechaVencimiento.getTime()) / (24 * 60 * 60 * 1000));
    const monto = Number(cuota.monto);

    let severidad: SeveridadAnomalia = "MEDIA";
    if (diasVencida > 30) severidad = "CRITICA";
    else if (diasVencida > 15) severidad = "ALTA";

    const cliente = cuota.contrato?.cliente;
    const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido}` : "Desconocido";

    anomalias.push({
      tipo: "VENCIMIENTO_PROXIMO",
      severidad,
      entidadTipo: "Cuota",
      entidadId: cuota.id,
      entidadLabel: `Cuota #${cuota.numero} — ${nombreCliente} — ${formatMoney(monto)}`,
      titulo: `Cuota vencida hace ${diasVencida} días: ${formatMoney(monto)}`,
      descripcion: `La cuota #${cuota.numero} de ${nombreCliente} por ${formatMoney(monto)} venció hace ${diasVencida} días sin gestión.`,
      valorDetectado: monto,
      algoritmo: "detectarVencimientosProximos",
      datosExtra: JSON.stringify({ diasVencida, clienteNombre: nombreCliente, cuotaNumero: cuota.numero }),
    });
  }

  return anomalias;
}

// ─────────────────────────────────────────────────────────
// 9. PATRÓN SOSPECHOSO: operaciones entre 22:00-06:00
// ─────────────────────────────────────────────────────────
export async function detectarPatronSospechoso(): Promise<AnomaliaDetectada[]> {
  const anomalias: AnomaliaDetectada[] = [];
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Pagos creados en horario sospechoso
  const pagos = await prisma.pagoMercadoPago.findMany({
    where: { createdAt: { gte: hace24h } },
    select: { id: true, monto: true, tipo: true, createdAt: true, mpPaymentId: true },
  });

  for (const pago of pagos) {
    const hora = pago.createdAt.getHours();
    if (hora >= 22 || hora < 6) {
      anomalias.push({
        tipo: "PATRON_SOSPECHOSO",
        severidad: "MEDIA",
        entidadTipo: "Pago",
        entidadId: pago.id,
        entidadLabel: `Pago ${formatMoney(Number(pago.monto))} — ${pago.createdAt.toLocaleTimeString("es-AR")}`,
        titulo: `Pago en horario inusual: ${pago.createdAt.toLocaleTimeString("es-AR")}`,
        descripcion: `Se registró un pago de ${formatMoney(Number(pago.monto))} a las ${pago.createdAt.toLocaleTimeString("es-AR")} (fuera del horario operativo 06:00-22:00).`,
        valorDetectado: Number(pago.monto),
        algoritmo: "detectarPatronSospechoso",
        datosExtra: JSON.stringify({ hora, tipoOperacion: "Pago", tipo: pago.tipo }),
      });
    }
  }

  // Gastos creados en horario sospechoso
  const gastos = await prisma.gasto.findMany({
    where: { createdAt: { gte: hace24h } },
    select: { id: true, monto: true, categoria: true, createdAt: true },
  });

  for (const gasto of gastos) {
    const hora = gasto.createdAt.getHours();
    if (hora >= 22 || hora < 6) {
      anomalias.push({
        tipo: "PATRON_SOSPECHOSO",
        severidad: "MEDIA",
        entidadTipo: "Gasto",
        entidadId: gasto.id,
        entidadLabel: `Gasto ${gasto.categoria} — ${gasto.createdAt.toLocaleTimeString("es-AR")}`,
        titulo: `Gasto en horario inusual: ${gasto.createdAt.toLocaleTimeString("es-AR")}`,
        descripcion: `Se registró un gasto de ${formatMoney(Number(gasto.monto))} (${gasto.categoria}) a las ${gasto.createdAt.toLocaleTimeString("es-AR")}.`,
        valorDetectado: Number(gasto.monto),
        algoritmo: "detectarPatronSospechoso",
        datosExtra: JSON.stringify({ hora, tipoOperacion: "Gasto", categoria: gasto.categoria }),
      });
    }
  }

  // Ajustes de stock en horario sospechoso
  const ajustes = await prisma.movimientoStock.findMany({
    where: {
      createdAt: { gte: hace24h },
      tipo: { in: ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"] },
    },
    include: { repuesto: { select: { codigo: true, nombre: true } } },
  });

  for (const ajuste of ajustes) {
    const hora = ajuste.createdAt.getHours();
    if (hora >= 22 || hora < 6) {
      anomalias.push({
        tipo: "PATRON_SOSPECHOSO",
        severidad: "MEDIA",
        entidadTipo: "MovimientoStock",
        entidadId: ajuste.id,
        entidadLabel: `Ajuste ${ajuste.repuesto.codigo} — ${ajuste.createdAt.toLocaleTimeString("es-AR")}`,
        titulo: `Ajuste de stock en horario inusual: ${ajuste.createdAt.toLocaleTimeString("es-AR")}`,
        descripcion: `Se ajustó stock de ${ajuste.repuesto.nombre} (${ajuste.tipo}, cant: ${ajuste.cantidad}) a las ${ajuste.createdAt.toLocaleTimeString("es-AR")}.`,
        algoritmo: "detectarPatronSospechoso",
        datosExtra: JSON.stringify({ hora, tipoOperacion: "AjusteStock", tipo: ajuste.tipo }),
      });
    }
  }

  return anomalias;
}
