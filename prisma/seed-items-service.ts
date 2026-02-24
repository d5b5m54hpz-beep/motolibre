import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ITEMS = [
  { nombre: "Cambio de aceite motor", categoria: "LUBRICACION" as const, accion: "REPLACE" as const, tiempoEstimado: 20 },
  { nombre: "Cambio filtro de aceite", categoria: "MOTOR" as const, accion: "REPLACE" as const, tiempoEstimado: 15 },
  { nombre: "Cambio filtro de aire", categoria: "MOTOR" as const, accion: "REPLACE" as const, tiempoEstimado: 10 },
  { nombre: "Cambio bujía", categoria: "MOTOR" as const, accion: "REPLACE" as const, tiempoEstimado: 15 },
  { nombre: "Revisión y ajuste frenos", categoria: "FRENOS" as const, accion: "CHECK_AND_ADJUST" as const, tiempoEstimado: 20 },
  { nombre: "Revisión cadena y piñón", categoria: "TRANSMISION" as const, accion: "CHECK_AND_ADJUST" as const, tiempoEstimado: 15 },
  { nombre: "Chequeo de tornillería", categoria: "SUSPENSION" as const, accion: "CHECK_AND_ADJUST" as const, tiempoEstimado: 10 },
  { nombre: "Chequeo de pastillas", categoria: "FRENOS" as const, accion: "CHECK_AND_ADJUST" as const, tiempoEstimado: 5 },
  { nombre: "Revisión tensión cadena", categoria: "TRANSMISION" as const, accion: "CHECK_AND_ADJUST" as const, tiempoEstimado: 10 },
  { nombre: "Lavado y limpieza general", categoria: "OTRO" as const, accion: "ADJUST" as const, tiempoEstimado: 10 },
];

async function main() {
  for (const item of ITEMS) {
    const existing = await prisma.itemService.findFirst({
      where: { nombre: item.nombre },
    });
    if (!existing) {
      await prisma.itemService.create({ data: item });
      console.log(`Created: ${item.nombre}`);
    } else {
      console.log(`Skipped (exists): ${item.nombre}`);
    }
  }
  console.log("Done seeding ItemService catalog.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
