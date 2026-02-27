import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MapWrapper } from "./_components/map-wrapper";

async function getMapData() {
  const [talleres, solicitudes] = await Promise.all([
    prisma.taller.findMany({
      where: {
        latitud: { not: null },
        longitud: { not: null },
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        activo: true,
        latitud: true,
        longitud: true,
        especialidades: true,
        scoreCalidad: true,
      },
    }),
    prisma.solicitudTaller.findMany({
      where: {
        latitud: { not: null },
        longitud: { not: null },
        estado: { not: "BORRADOR" },
      },
      select: {
        id: true,
        nombreTaller: true,
        direccion: true,
        ciudad: true,
        provincia: true,
        estado: true,
        scoreTotal: true,
        latitud: true,
        longitud: true,
      },
    }),
  ]);

  return { talleres, solicitudes };
}

export default async function MapaRedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { talleres, solicitudes } = await getMapData();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mapa de la Red"
        description={`${talleres.filter(t => t.activo).length} talleres activos · ${solicitudes.length} solicitudes con ubicación`}
      />
      <div className="rounded-lg border overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        <MapWrapper talleres={talleres} solicitudes={solicitudes} />
      </div>
    </div>
  );
}
