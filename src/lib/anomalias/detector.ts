import { prisma } from "@/lib/prisma";
import {
  detectarGastoInusual,
  detectarPagoDuplicado,
  detectarFacturaSinPago,
  detectarMargenBajo,
  detectarStockCritico,
  detectarDesvioPresupuesto,
  detectarFlujoCajaNegativo,
  detectarVencimientosProximos,
  detectarPatronSospechoso,
  type AnomaliaDetectada,
} from "./algoritmos";

/**
 * Ejecuta todos los algoritmos de detección y guarda anomalías nuevas.
 * Evita duplicados: no crea si ya existe una anomalía NUEVA/EN_REVISION para la misma entidad+tipo.
 */
export async function ejecutarDeteccionCompleta(userId?: string): Promise<{
  total: number;
  nuevas: number;
  porTipo: Record<string, number>;
  duracionMs: number;
}> {
  const inicio = Date.now();
  const todas: AnomaliaDetectada[] = [];

  // Ejecutar cada algoritmo (catch individual para que uno no rompa todos)
  const algoritmos = [
    { nombre: "gastoInusual", fn: detectarGastoInusual },
    { nombre: "pagoDuplicado", fn: detectarPagoDuplicado },
    { nombre: "facturaSinPago", fn: detectarFacturaSinPago },
    { nombre: "margenBajo", fn: detectarMargenBajo },
    { nombre: "stockCritico", fn: detectarStockCritico },
    { nombre: "desvioPresupuesto", fn: detectarDesvioPresupuesto },
    { nombre: "flujoCajaNegativo", fn: detectarFlujoCajaNegativo },
    { nombre: "vencimientosProximos", fn: detectarVencimientosProximos },
    { nombre: "patronSospechoso", fn: detectarPatronSospechoso },
  ];

  for (const alg of algoritmos) {
    try {
      const resultado = await alg.fn();
      todas.push(...resultado);
    } catch (e) {
      console.error(`[Anomalías] Error en algoritmo ${alg.nombre}:`, e);
    }
  }

  // Guardar solo las nuevas (evitar duplicados)
  let nuevas = 0;
  for (const a of todas) {
    const existe = await prisma.anomalia.findFirst({
      where: {
        tipo: a.tipo,
        entidadTipo: a.entidadTipo,
        entidadId: a.entidadId,
        estado: { in: ["NUEVA", "EN_REVISION"] },
      },
    });
    if (!existe) {
      await prisma.anomalia.create({
        data: {
          tipo: a.tipo,
          severidad: a.severidad,
          entidadTipo: a.entidadTipo,
          entidadId: a.entidadId,
          entidadLabel: a.entidadLabel,
          titulo: a.titulo,
          descripcion: a.descripcion,
          valorDetectado: a.valorDetectado,
          valorEsperado: a.valorEsperado,
          algoritmo: a.algoritmo,
          datosExtra: a.datosExtra,
        },
      });
      nuevas++;
    }
  }

  const duracionMs = Date.now() - inicio;

  // Registrar análisis
  const porTipo: Record<string, number> = {};
  todas.forEach((a) => {
    porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1;
  });

  await prisma.analisisFinanciero.create({
    data: {
      tipo: "ANOMALIAS_BATCH",
      anomaliasDetectadas: nuevas,
      duracionMs,
      metricas: JSON.stringify({ total: todas.length, nuevas, porTipo }),
      ejecutadoPor: userId || "system",
    },
  });

  return { total: todas.length, nuevas, porTipo, duracionMs };
}

/**
 * Guarda anomalías detectadas evitando duplicados.
 * Usado por los handlers real-time.
 */
export async function guardarAnomalias(anomalias: AnomaliaDetectada[]): Promise<number> {
  let nuevas = 0;
  for (const a of anomalias) {
    const existe = await prisma.anomalia.findFirst({
      where: {
        tipo: a.tipo,
        entidadTipo: a.entidadTipo,
        entidadId: a.entidadId,
        estado: { in: ["NUEVA", "EN_REVISION"] },
      },
    });
    if (!existe) {
      await prisma.anomalia.create({
        data: {
          tipo: a.tipo,
          severidad: a.severidad,
          entidadTipo: a.entidadTipo,
          entidadId: a.entidadId,
          entidadLabel: a.entidadLabel,
          titulo: a.titulo,
          descripcion: a.descripcion,
          valorDetectado: a.valorDetectado,
          valorEsperado: a.valorEsperado,
          algoritmo: a.algoritmo,
          datosExtra: a.datosExtra,
        },
      });
      nuevas++;
    }
  }
  return nuevas;
}
