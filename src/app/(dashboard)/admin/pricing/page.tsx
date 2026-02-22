import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PricingModelCard } from "./_components/pricing-model-card";

async function getTarifas() {
  return prisma.tarifaAlquiler.findMany({
    where: { activo: true },
    orderBy: [{ marca: "asc" }, { modelo: "asc" }, { condicion: "asc" }, { plan: "asc" }, { frecuencia: "asc" }],
  });
}

export default async function PricingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const tarifas = await getTarifas();

  // Agrupar por marca+modelo+condición
  const grupos = new Map<string, { marca: string; modelo: string; condicion: "NUEVA" | "USADA"; tarifas: typeof tarifas }>();

  for (const t of tarifas) {
    const key = `${t.marca}|${t.modelo}|${t.condicion}`;
    if (!grupos.has(key)) {
      grupos.set(key, { marca: t.marca, modelo: t.modelo, condicion: t.condicion as "NUEVA" | "USADA", tarifas: [] });
    }
    grupos.get(key)!.tarifas.push(t);
  }

  const gruposArr = Array.from(grupos.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifas de Alquiler"
        description={`${gruposArr.length} modelos configurados`}
      />

      {gruposArr.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <p className="text-lg mb-2">No hay tarifas configuradas</p>
          <p className="text-sm">Usa el seed o la API para agregar tarifas de alquiler.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gruposArr.map((grupo) => (
            <PricingModelCard
              key={`${grupo.marca}|${grupo.modelo}|${grupo.condicion}`}
              marca={grupo.marca}
              modelo={grupo.modelo}
              condicion={grupo.condicion}
              tarifas={grupo.tarifas}
            />
          ))}
        </div>
      )}
    </div>
  );
}
