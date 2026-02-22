import { prisma } from "@/lib/prisma";
import type { CategoriaRepuesto } from "@prisma/client";

export interface PrecioResuelto {
  repuestoId: string;
  codigo: string;
  nombre: string;
  precioCompra: number;
  markupCategoria: number;
  precioConMarkup: number;
  listaAplicada: string | null;
  precioLista: number | null;
  descuentoGrupo: number;
  grupoCliente: string | null;
  precioFinal: number;
  margen: number;
  margenPorcentaje: number;
  detalle: string[];
}

/**
 * Resuelve el precio de un repuesto para un cliente específico.
 * Cadena: precioCompra → +markup → ¿lista? → -descuento grupo → precioFinal
 */
export async function resolverPrecio(params: {
  repuestoId: string;
  clienteId?: string | null;
  listaPrecioId?: string | null;
}): Promise<PrecioResuelto | null> {
  const { repuestoId, clienteId, listaPrecioId } = params;
  const detalle: string[] = [];

  const repuesto = await prisma.repuesto.findUnique({ where: { id: repuestoId } });
  if (!repuesto) return null;

  // 1. Precio de compra
  const precioCompra = Number(repuesto.precioCompra);
  detalle.push(`Precio compra: $${precioCompra.toLocaleString("es-AR")}`);

  // 2. Markup por categoría
  const reglaMarkup = await prisma.reglaMarkup.findUnique({
    where: { categoria: repuesto.categoria },
  });
  const markupPct = reglaMarkup && reglaMarkup.activa ? Number(reglaMarkup.porcentaje) : 0;
  const precioConMarkup = Math.round(precioCompra * (1 + markupPct / 100));
  if (markupPct > 0) {
    detalle.push(`+ Markup ${repuesto.categoria} (${markupPct}%): $${precioConMarkup.toLocaleString("es-AR")}`);
  } else {
    detalle.push(`Sin markup configurado para ${repuesto.categoria}`);
  }

  // 3. Lista de precios (si se especifica)
  let precioLista: number | null = null;
  let listaAplicada: string | null = null;

  if (listaPrecioId) {
    const item = await prisma.itemListaPrecio.findUnique({
      where: { listaId_repuestoId: { listaId: listaPrecioId, repuestoId } },
      include: { lista: true },
    });
    if (item && item.lista.activa) {
      precioLista = Number(item.precioUnitario);
      listaAplicada = item.lista.nombre;
      detalle.push(`Lista "${listaAplicada}": $${precioLista.toLocaleString("es-AR")}`);
    }
  }

  const precioParaDescuento = precioLista ?? precioConMarkup;

  // 4. Descuento por grupo de cliente
  let descuentoPct = 0;
  let grupoNombre: string | null = null;

  if (clienteId) {
    const miembro = await prisma.miembroGrupoCliente.findFirst({
      where: { clienteId },
      include: { grupo: true },
    });
    if (miembro && miembro.grupo.activo) {
      descuentoPct = Number(miembro.grupo.descuento);
      grupoNombre = miembro.grupo.nombre;
      detalle.push(`- Descuento grupo "${grupoNombre}" (${descuentoPct}%)`);
    }
  }

  // 5. Precio final
  const precioFinal = Math.round(precioParaDescuento * (1 - descuentoPct / 100));
  const margen = precioFinal - precioCompra;
  const margenPct = precioCompra > 0 ? Math.round((margen / precioCompra) * 100) : 0;
  detalle.push(`= Precio final: $${precioFinal.toLocaleString("es-AR")} (margen: ${margenPct}%)`);

  return {
    repuestoId,
    codigo: repuesto.codigo,
    nombre: repuesto.nombre,
    precioCompra,
    markupCategoria: markupPct,
    precioConMarkup,
    listaAplicada,
    precioLista,
    descuentoGrupo: descuentoPct,
    grupoCliente: grupoNombre,
    precioFinal,
    margen,
    margenPorcentaje: margenPct,
    detalle,
  };
}

/**
 * Simula un cambio masivo de precios (what-if) sin aplicarlo.
 */
export async function simularCambioPrecio(params: {
  tipo: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  categorias?: string[];
  proveedorId?: string | null;
}) {
  const where: {
    activo: boolean;
    categoria?: { in: CategoriaRepuesto[] };
    proveedorId?: string;
  } = { activo: true };

  if (params.categorias?.length) {
    where.categoria = { in: params.categorias as CategoriaRepuesto[] };
  }
  if (params.proveedorId) where.proveedorId = params.proveedorId;

  const repuestos = await prisma.repuesto.findMany({
    where,
    orderBy: { nombre: "asc" },
  });

  const detalle = repuestos.map((r) => {
    const antes = Number(r.precioVenta ?? r.precioCompra);
    let despues: number;

    if (params.tipo === "PORCENTAJE") {
      despues = Math.round(antes * (1 + params.valor / 100));
    } else {
      despues = Math.round(antes + params.valor);
    }
    despues = Math.max(0, despues);

    return {
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      categoria: r.categoria,
      precioAntes: antes,
      precioDespues: despues,
      diferencia: despues - antes,
    };
  });

  const totalAntes = detalle.reduce((s, d) => s + d.precioAntes, 0);
  const totalDespues = detalle.reduce((s, d) => s + d.precioDespues, 0);

  return {
    repuestosAfectados: detalle.length,
    precioPromedioAntes: detalle.length > 0 ? Math.round(totalAntes / detalle.length) : 0,
    precioPromedioDespues: detalle.length > 0 ? Math.round(totalDespues / detalle.length) : 0,
    impactoTotal: Math.round(totalDespues - totalAntes),
    detalle,
  };
}

/**
 * Aplica un lote de cambio de precios al stock real.
 */
export async function aplicarLoteCambio(loteId: string, userId: string) {
  const lote = await prisma.loteCambioPrecio.findUnique({ where: { id: loteId } });
  if (!lote || lote.estado !== "PENDIENTE") {
    throw new Error("Lote no válido o ya fue aplicado");
  }

  const where: {
    activo: boolean;
    categoria?: { in: CategoriaRepuesto[] };
    proveedorId?: string;
  } = { activo: true };

  if (lote.categorias.length > 0) {
    where.categoria = { in: lote.categorias as CategoriaRepuesto[] };
  }
  if (lote.proveedorId) where.proveedorId = lote.proveedorId;

  const repuestos = await prisma.repuesto.findMany({ where });
  let count = 0;

  for (const r of repuestos) {
    const precioAntes = Number(r.precioVenta ?? r.precioCompra);
    let precioNuevo: number;

    if (lote.tipo === "PORCENTAJE") {
      precioNuevo = Math.round(precioAntes * (1 + Number(lote.valor) / 100));
    } else {
      precioNuevo = Math.round(precioAntes + Number(lote.valor));
    }
    precioNuevo = Math.max(0, precioNuevo);

    await prisma.$transaction([
      prisma.repuesto.update({
        where: { id: r.id },
        data: { precioVenta: precioNuevo },
      }),
      prisma.historialCostoRepuesto.create({
        data: {
          repuestoId: r.id,
          precioAnterior: precioAntes,
          precioNuevo,
          motivo: `Lote: ${lote.nombre}`,
        },
      }),
    ]);
    count++;
  }

  await prisma.loteCambioPrecio.update({
    where: { id: loteId },
    data: {
      estado: "APLICADO",
      fechaAplicacion: new Date(),
      repuestosAfectados: count,
      userId,
    },
  });

  return { aplicados: count };
}

/**
 * Revierte un lote aplicado (invierte el valor y re-aplica).
 */
export async function revertirLoteCambio(loteId: string, userId: string) {
  const lote = await prisma.loteCambioPrecio.findUnique({ where: { id: loteId } });
  if (!lote || lote.estado !== "APLICADO") {
    throw new Error("Solo se pueden revertir lotes en estado APLICADO");
  }

  // Crear lote inverso y aplicarlo
  const loteInverso = await prisma.loteCambioPrecio.create({
    data: {
      nombre: `Revert: ${lote.nombre}`,
      tipo: lote.tipo,
      valor: lote.tipo === "PORCENTAJE"
        ? -(Number(lote.valor) / (1 + Number(lote.valor) / 100)) // Invertir %
        : -Number(lote.valor),
      categorias: lote.categorias,
      proveedorId: lote.proveedorId,
      estado: "PENDIENTE",
      userId,
    },
  });

  const resultado = await aplicarLoteCambio(loteInverso.id, userId);

  await prisma.loteCambioPrecio.update({
    where: { id: loteId },
    data: { estado: "REVERTIDO", fechaReversion: new Date() },
  });

  return resultado;
}

/**
 * Calcula métricas de margen para el dashboard.
 */
export async function getDashboardMargenes() {
  const repuestos = await prisma.repuesto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, nombre: true, categoria: true, precioCompra: true, precioVenta: true },
  });

  const markups = await prisma.reglaMarkup.findMany({ where: { activa: true } });
  const markupMap = new Map(markups.map((m) => [m.categoria, Number(m.porcentaje)]));

  const sinMarkup = repuestos.filter((r) => !markupMap.has(r.categoria)).length;
  const sinPrecioVenta = repuestos.filter((r) => !r.precioVenta).length;

  const conMargen = repuestos.map((r) => {
    const compra = Number(r.precioCompra);
    const venta = r.precioVenta
      ? Number(r.precioVenta)
      : Math.round(compra * (1 + (markupMap.get(r.categoria) ?? 0) / 100));
    const margen = compra > 0 ? Math.round(((venta - compra) / compra) * 100) : 0;
    return { ...r, venta, margen };
  });

  // Distribución por rangos
  const rangos = [
    { label: "0-20%", min: 0, max: 20 },
    { label: "20-40%", min: 20, max: 40 },
    { label: "40-60%", min: 40, max: 60 },
    { label: "60-80%", min: 60, max: 80 },
    { label: ">80%", min: 80, max: Infinity },
  ];
  const distribucionMargen = rangos.map((r) => ({
    rango: r.label,
    count: conMargen.filter((x) => x.margen >= r.min && x.margen < r.max).length,
  }));

  const margenPromedio = conMargen.length > 0
    ? Math.round(conMargen.reduce((s, r) => s + r.margen, 0) / conMargen.length)
    : 0;

  const sorted = [...conMargen].sort((a, b) => b.margen - a.margen);
  const topMargen = sorted.slice(0, 5).map((r) => ({
    codigo: r.codigo, nombre: r.nombre, margen: r.margen,
  }));
  const bottomMargen = sorted.slice(-5).reverse().map((r) => ({
    codigo: r.codigo, nombre: r.nombre, margen: r.margen,
  }));

  return {
    margenPromedio,
    repuestosSinMarkup: sinMarkup,
    repuestosSinPrecioVenta: sinPrecioVenta,
    distribucionMargen,
    topMargen,
    bottomMargen,
  };
}
