"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
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

const ESTADO_DESCRIPCION: Record<string, string> = {
  BORRADOR: "Tu solicitud aún está en borrador. Completá los datos y enviala.",
  RECIBIDA:
    "Tu solicitud fue recibida. Nuestro equipo la revisará próximamente.",
  INCOMPLETA:
    "Necesitamos más información. Revisá tu email para ver qué falta.",
  EN_EVALUACION: "Tu solicitud está siendo evaluada por nuestro equipo.",
  APROBADA: "Tu solicitud fue aprobada. Te enviaremos el convenio.",
  RECHAZADA: "Lamentablemente tu solicitud no fue aprobada en esta instancia.",
  EN_ESPERA: "Tu solicitud está en espera. Te contactaremos pronto.",
  CONVENIO_ENVIADO:
    "Te enviamos el convenio para revisión. Revisá tu email.",
  CONVENIO_FIRMADO: "Convenio firmado. Iniciamos el proceso de onboarding.",
  ONBOARDING:
    "Estás en proceso de onboarding. Pronto serás parte de la red.",
  ACTIVO: "Tu taller está activo en la red MotoLibre.",
};

const PIPELINE_STEPS = [
  "RECIBIDA",
  "EN_EVALUACION",
  "APROBADA",
  "CONVENIO_FIRMADO",
  "ACTIVO",
];

interface SolicitudData {
  id: string;
  estado: string;
  nombreTaller: string;
  ciudad: string;
  provincia: string;
  contactoNombre: string;
  email: string;
  scoreTotal: number | null;
  motivoRechazo: string | null;
  fechaRecepcion: string | null;
  fechaAprobacion: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SeguimientoPage() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";

  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SolicitudData | null>(null);
  const [error, setError] = useState("");

  async function buscar(tokenValue?: string) {
    const t = tokenValue ?? token;
    if (!t.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`/api/public/solicitud-taller/${t.trim()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        setError("No se encontró una solicitud con ese código.");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  }

  // Auto-search if token in URL
  useEffect(() => {
    if (initialToken) {
      buscar(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Building2 className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Seguimiento de Solicitud
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ingresá tu código de seguimiento para ver el estado de tu postulación
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Código de seguimiento..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          className="font-mono"
        />
        <Button onClick={() => buscar()} disabled={!token.trim() || loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <XCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-6">
          {/* Header */}
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{data.nombreTaller}</h2>
                <p className="text-sm text-muted-foreground">
                  {data.ciudad}, {data.provincia}
                </p>
              </div>
              <StatusBadge
                status={data.estado}
                label={ESTADO_LABELS[data.estado]}
              />
            </div>

            <p className="text-sm">
              {ESTADO_DESCRIPCION[data.estado] ?? "Estado en proceso."}
            </p>

            {data.motivoRechazo && (
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  Motivo: {data.motivoRechazo}
                </p>
              </div>
            )}
          </div>

          {/* Pipeline Progress */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Progreso</h3>
            <div className="space-y-3">
              {PIPELINE_STEPS.map((stepState, i) => {
                const currentIdx = PIPELINE_STEPS.indexOf(data.estado);
                const isRejected = data.estado === "RECHAZADA";
                const isDone = !isRejected && currentIdx >= i;
                const isCurrent = !isRejected && data.estado === stepState;

                return (
                  <div key={stepState} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        isDone
                          ? "bg-emerald-100 dark:bg-emerald-950"
                          : "bg-muted"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-foreground"
                          : isDone
                            ? "text-muted-foreground"
                            : "text-muted-foreground/60"
                      }`}
                    >
                      {ESTADO_LABELS[stepState]}
                    </span>
                    {isCurrent && (
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-3">Fechas</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Creada
                </p>
                <p className="font-medium mt-0.5">
                  {new Date(data.createdAt).toLocaleDateString("es-AR")}
                </p>
              </div>
              {data.fechaRecepcion && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Recibida
                  </p>
                  <p className="font-medium mt-0.5">
                    {new Date(data.fechaRecepcion).toLocaleDateString("es-AR")}
                  </p>
                </div>
              )}
              {data.fechaAprobacion && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Aprobada
                  </p>
                  <p className="font-medium mt-0.5">
                    {new Date(data.fechaAprobacion).toLocaleDateString("es-AR")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Última Actualización
                </p>
                <p className="font-medium mt-0.5">
                  {new Date(data.updatedAt).toLocaleDateString("es-AR")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
