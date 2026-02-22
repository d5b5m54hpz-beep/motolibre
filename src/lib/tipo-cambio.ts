import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export interface CotizacionDolar {
  compra: number;
  venta: number;
  fecha: string;
  fuente: string;
}

/**
 * Obtiene tipo de cambio USD/ARS (dólar blue).
 * Usa cache de 1 hora en DB. Consulta dolarapi.com.
 * Si la API falla, usa cache vencido (no es bloqueante).
 */
export async function obtenerTipoCambio(): Promise<CotizacionDolar> {
  const cache = await prisma.tipoCambioCache.findUnique({
    where: { moneda: "USD" },
  });

  if (cache && Date.now() - cache.updatedAt.getTime() < CACHE_TTL_MS) {
    return {
      compra: Number(cache.compra),
      venta: Number(cache.venta),
      fecha: cache.fecha.toISOString(),
      fuente: cache.fuente,
    };
  }

  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`dolarapi.com respondió ${res.status}`);

    const data = await res.json();

    await prisma.tipoCambioCache.upsert({
      where: { moneda: "USD" },
      update: {
        compra: data.compra,
        venta: data.venta,
        fecha: new Date(data.fechaActualizacion ?? new Date()),
        fuente: "dolarapi.com/blue",
      },
      create: {
        moneda: "USD",
        compra: data.compra,
        venta: data.venta,
        fecha: new Date(data.fechaActualizacion ?? new Date()),
        fuente: "dolarapi.com/blue",
      },
    });

    return {
      compra: data.compra,
      venta: data.venta,
      fecha: data.fechaActualizacion,
      fuente: "dolarapi.com/blue",
    };
  } catch {
    if (cache) {
      console.warn("[TipoCambio] API falló, usando cache vencido");
      return {
        compra: Number(cache.compra),
        venta: Number(cache.venta),
        fecha: cache.fecha.toISOString(),
        fuente: `${cache.fuente} (cache)`,
      };
    }
    throw new Error("No se pudo obtener tipo de cambio y no hay cache");
  }
}
