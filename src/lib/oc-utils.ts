import { prisma } from "@/lib/prisma";

/**
 * Genera próximo número de OC: "OC-2026-00001"
 */
export async function proximoNumeroOC(): Promise<string> {
  const anio = new Date().getFullYear();
  const ultima = await prisma.ordenCompra.findFirst({
    where: { numero: { startsWith: `OC-${anio}` } },
    orderBy: { createdAt: "desc" },
    select: { numero: true },
  });

  let secuencia = 1;
  if (ultima) {
    const partes = ultima.numero.split("-");
    secuencia = parseInt(partes[2] || "0", 10) + 1;
  }

  return `OC-${anio}-${String(secuencia).padStart(5, "0")}`;
}
