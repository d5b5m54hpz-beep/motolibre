"use client";

import dynamic from "next/dynamic";

const NetworkMap = dynamic(() => import("./network-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted/30 animate-pulse rounded-lg" />
  ),
});

interface Taller {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  latitud: number | null;
  longitud: number | null;
  especialidades: string[];
  scoreCalidad: number | null;
}

interface Solicitud {
  id: string;
  nombreTaller: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  estado: string;
  scoreTotal: number | null;
  latitud: number | null;
  longitud: number | null;
}

interface MapWrapperProps {
  talleres: Taller[];
  solicitudes: Solicitud[];
}

export function MapWrapper({ talleres, solicitudes }: MapWrapperProps) {
  return <NetworkMap talleres={talleres} solicitudes={solicitudes} />;
}
