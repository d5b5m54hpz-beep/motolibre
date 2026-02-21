"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Ship, Package, MapPin, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface EmbarqueData {
  numero: string;
  estado: string;
  proveedorNombre: string;
  puertoOrigen: string | null;
  puertoDestino: string;
  naviera: string | null;
  numeroContenedor: string | null;
  tipoTransporte: string;
  fechaEmbarque: string | null;
  fechaEstimadaArribo: string | null;
  fechaArriboPuerto: string | null;
  fechaDespacho: string | null;
  fechaRecepcion: string | null;
  items: Array<{
    descripcion: string;
    codigoProveedor: string | null;
    cantidad: number;
    cantidadRecibida: number;
    esMoto: boolean;
  }>;
}

const ESTADOS_FLOW = [
  "BORRADOR",
  "EN_TRANSITO",
  "EN_PUERTO",
  "EN_ADUANA",
  "DESPACHADO",
  "COSTOS_FINALIZADOS",
  "EN_RECEPCION",
  "ALMACENADO",
] as const;

const ESTADO_LABELS: Record<string, { es: string; en: string }> = {
  BORRADOR: { es: "Borrador", en: "Draft" },
  EN_TRANSITO: { es: "En Tránsito", en: "In Transit" },
  EN_PUERTO: { es: "En Puerto", en: "At Port" },
  EN_ADUANA: { es: "In Customs", en: "In Customs" },
  DESPACHADO_PARCIAL: { es: "Desp. Parcial", en: "Partial Clearance" },
  DESPACHADO: { es: "Despachado", en: "Cleared" },
  COSTOS_FINALIZADOS: { es: "Costos OK", en: "Costs Finalized" },
  EN_RECEPCION: { es: "Recibiendo", en: "Receiving" },
  ALMACENADO: { es: "Almacenado", en: "Stored" },
  CANCELADO: { es: "Cancelado", en: "Cancelled" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupplierPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<EmbarqueData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lang, setLang] = useState<"es" | "en">("en");

  useEffect(() => {
    fetch(`/api/supplier/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Token expired / Token expirado" : "Not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErrorMsg(e.message));
  }, [token]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-xl font-semibold text-gray-800">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading / Cargando...</div>
      </div>
    );
  }

  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const estadoLabel = ESTADO_LABELS[data.estado] || { es: data.estado, en: data.estado };

  // Progress bar
  const currentIdx = ESTADOS_FLOW.indexOf(data.estado as typeof ESTADOS_FLOW[number]);
  const isCancelled = data.estado === "CANCELADO" || data.estado === "DESPACHADO_PARCIAL";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0a1929] text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ship className="h-8 w-8 text-[#23e0ff]" />
              <div>
                <h1 className="text-xl font-bold">MotoLibre</h1>
                <p className="text-sm text-gray-300">
                  {t("Estado del Embarque", "Shipment Status")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="text-sm bg-white/10 px-3 py-1 rounded hover:bg-white/20 transition"
            >
              {lang === "es" ? "English" : "Espanol"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{data.numero}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              data.estado === "ALMACENADO" ? "bg-green-100 text-green-800" :
              isCancelled ? "bg-red-100 text-red-800" :
              "bg-blue-100 text-blue-800"
            }`}>
              {lang === "es" ? estadoLabel.es : estadoLabel.en}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t("Proveedor", "Supplier")}</span>
              <p className="font-medium">{data.proveedorNombre}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("Transporte", "Transport")}</span>
              <p className="font-medium">{data.tipoTransporte === "MARITIMO" ? t("Marítimo", "Maritime") : t("Aéreo", "Air")}</p>
            </div>
            {data.naviera && (
              <div>
                <span className="text-gray-500">{t("Naviera", "Carrier")}</span>
                <p className="font-medium">{data.naviera}</p>
              </div>
            )}
            {data.numeroContenedor && (
              <div>
                <span className="text-gray-500">{t("Contenedor", "Container")}</span>
                <p className="font-medium">{data.numeroContenedor}</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {!isCancelled && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              {t("Progreso", "Progress")}
            </h3>
            <div className="flex items-center gap-1">
              {ESTADOS_FLOW.map((estado, idx) => {
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const label = ESTADO_LABELS[estado];
                return (
                  <div key={estado} className="flex-1 flex flex-col items-center">
                    <div className={`w-full h-2 rounded-full ${
                      isCompleted ? "bg-[#23e0ff]" : "bg-gray-200"
                    }`} />
                    <div className={`mt-2 text-[10px] text-center leading-tight ${
                      isCurrent ? "font-bold text-[#0a1929]" : isCompleted ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {lang === "es" ? label?.es : label?.en}
                    </div>
                    {isCurrent && (
                      <CheckCircle className="h-3 w-3 text-[#23e0ff] mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("Fechas", "Dates")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t("Embarque", "Shipped")}</span>
              <p className="font-medium">{formatDate(data.fechaEmbarque)}</p>
            </div>
            <div>
              <span className="text-gray-500">ETA</span>
              <p className="font-medium">{formatDate(data.fechaEstimadaArribo)}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("Arribo", "Arrival")}</span>
              <p className="font-medium">{formatDate(data.fechaArriboPuerto)}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("Despacho", "Clearance")}</span>
              <p className="font-medium">{formatDate(data.fechaDespacho)}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("Recepción", "Received")}</span>
              <p className="font-medium">{formatDate(data.fechaRecepcion)}</p>
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t("Ruta", "Route")}
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium">{data.puertoOrigen || "—"}</p>
              <p className="text-gray-400 text-xs">{t("Origen", "Origin")}</p>
            </div>
            <div className="flex-1 border-t-2 border-dashed border-gray-300 relative">
              <Ship className="h-4 w-4 text-[#23e0ff] absolute left-1/2 -translate-x-1/2 -top-2 bg-white" />
            </div>
            <div className="text-center">
              <p className="font-medium">{data.puertoDestino}</p>
              <p className="text-gray-400 text-xs">{t("Destino", "Destination")}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("Items", "Items")} ({data.items.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">{t("Descripción", "Description")}</th>
                  <th className="pb-2">{t("Código", "Code")}</th>
                  <th className="pb-2 text-center">{t("Tipo", "Type")}</th>
                  <th className="pb-2 text-right">{t("Cantidad", "Qty")}</th>
                  <th className="pb-2 text-right">{t("Recibido", "Received")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{item.descripcion}</td>
                    <td className="py-2 text-gray-500">{item.codigoProveedor || "—"}</td>
                    <td className="py-2 text-center">
                      {item.esMoto ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {t("Moto", "Motorcycle")}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                          {t("Repuesto", "Part")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">{item.cantidad}</td>
                    <td className="py-2 text-right">
                      <span className={item.cantidadRecibida >= item.cantidad ? "text-green-600" : ""}>
                        {item.cantidadRecibida}
                      </span>
                      {item.cantidadRecibida >= item.cantidad && (
                        <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            {t(
              "Este enlace es temporal y expira en 30 días.",
              "This link is temporary and expires in 30 days."
            )}
          </div>
          <p className="mt-1">MotoLibre S.A. — Buenos Aires, Argentina</p>
        </div>
      </main>
    </div>
  );
}
