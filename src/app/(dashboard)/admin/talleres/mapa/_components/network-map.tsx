"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in Leaflet with Next.js
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ESTADO_LABELS: Record<string, string> = {
  RECIBIDA: "Recibida",
  INCOMPLETA: "Incompleta",
  EN_EVALUACION: "En Evaluación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EN_ESPERA: "En Espera",
  CONVENIO_ENVIADO: "Convenio Enviado",
  CONVENIO_FIRMADO: "Convenio Firmado",
  ONBOARDING: "Onboarding",
  ACTIVO: "Activo",
};

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

interface NetworkMapProps {
  talleres: Taller[];
  solicitudes: Solicitud[];
}

function FitBounds({ talleres, solicitudes }: NetworkMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    talleres.forEach((t) => {
      if (t.latitud && t.longitud) points.push([t.latitud, t.longitud]);
    });
    solicitudes.forEach((s) => {
      if (s.latitud && s.longitud) points.push([s.latitud, s.longitud]);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, talleres, solicitudes]);

  return null;
}

export default function NetworkMap({ talleres, solicitudes }: NetworkMapProps) {
  return (
    <MapContainer
      center={[-34.6037, -58.3816]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds talleres={talleres} solicitudes={solicitudes} />

      {talleres.map((taller) =>
        taller.latitud && taller.longitud ? (
          <Marker
            key={`taller-${taller.id}`}
            position={[taller.latitud, taller.longitud]}
            icon={taller.activo ? greenIcon : yellowIcon}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{taller.nombre}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>{taller.direccion}</span>
                <br />
                <span style={{ fontSize: 11, color: taller.activo ? "#22c55e" : "#eab308", fontWeight: 600 }}>
                  {taller.activo ? "Activo" : "Inactivo"}
                </span>
                {taller.scoreCalidad != null && (
                  <span style={{ fontSize: 11, marginLeft: 8 }}>
                    Score: {taller.scoreCalidad.toFixed(1)}
                  </span>
                )}
                {taller.especialidades.length > 0 && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                    {taller.especialidades.join(", ")}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      )}

      {solicitudes.map((sol) =>
        sol.latitud && sol.longitud ? (
          <Marker
            key={`sol-${sol.id}`}
            position={[sol.latitud, sol.longitud]}
            icon={sol.estado === "RECHAZADA" ? redIcon : yellowIcon}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{sol.nombreTaller}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>
                  {sol.ciudad}, {sol.provincia}
                </span>
                <br />
                <span style={{ fontSize: 11, color: sol.estado === "RECHAZADA" ? "#ef4444" : "#eab308", fontWeight: 600 }}>
                  {ESTADO_LABELS[sol.estado] ?? sol.estado}
                </span>
                {sol.scoreTotal != null && (
                  <span style={{ fontSize: 11, marginLeft: 8 }}>
                    Score: {sol.scoreTotal.toFixed(1)}/10
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
