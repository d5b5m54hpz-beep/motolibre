"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { Bell, Loader2, CheckCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Alerta {
  id: string;
  tipo: string;
  prioridad: string;
  titulo: string;
  mensaje: string | null;
  modulo: string | null;
  entidadTipo: string | null;
  entidadId: string | null;
  usuarioId: string;
  leida: boolean;
  fechaLeida: string | null;
  accionUrl: string | null;
  accionLabel: string | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIPO_LABELS: Record<string, string> = {
  PAGO_RECIBIDO: "Pago recibido",
  CUOTA_VENCIDA: "Cuota vencida",
  CONTRATO_POR_VENCER: "Contrato por vencer",
  SOLICITUD_NUEVA: "Solicitud nueva",
  MANTENIMIENTO_PROGRAMADO: "Mantenimiento programado",
  STOCK_CRITICO: "Stock cr\u00edtico",
  ANOMALIA_DETECTADA: "Anomal\u00eda detectada",
  DOCUMENTO_POR_VENCER: "Documento por vencer",
  SISTEMA_ERROR: "Error de sistema",
  LIMPIEZA_COMPLETADA: "Limpieza completada",
  CONCILIACION_PENDIENTE: "Conciliaci\u00f3n pendiente",
  PAYROLL_LIQUIDADO: "N\u00f3mina liquidada",
};

const MODULO_OPTIONS = [
  { value: "pagos", label: "Pagos" },
  { value: "contratos", label: "Contratos" },
  { value: "anomalias", label: "Anomal\u00edas" },
  { value: "mantenimientos", label: "Mantenimientos" },
  { value: "inventario", label: "Inventario" },
  { value: "rrhh", label: "RRHH" },
  { value: "sistema", label: "Sistema" },
];

const PRIORIDAD_DOT: Record<string, string> = {
  URGENTE: "bg-red-600",
  ALTA: "bg-orange-500",
  MEDIA: "bg-blue-500",
  BAJA: "bg-green-500",
};

const PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: string | Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800)
    return `hace ${Math.floor(diff / 86400)} d\u00eda${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
  return new Date(date).toLocaleDateString("es-AR");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertasPage() {
  const router = useRouter();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Filters
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");

  // Current page for "load more"
  const [page, setPage] = useState(1);

  // ----------------------------------
  // Fetch
  // ----------------------------------

  const fetchAlertas = useCallback(
    async (pageNum: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (soloNoLeidas) params.set("leida", "false");
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (filtroModulo) params.set("modulo", filtroModulo);
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_LIMIT));

      try {
        const res = await fetch(`/api/alertas?${params}`);
        if (res.ok) {
          const json = await res.json();
          if (append) {
            setAlertas((prev) => [...prev, ...json.data]);
          } else {
            setAlertas(json.data);
          }
          setPagination(json.pagination);
          setPage(pageNum);
        } else {
          toast.error("Error al cargar alertas");
        }
      } catch {
        toast.error("Error de conexi\u00f3n");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [soloNoLeidas, filtroTipo, filtroModulo],
  );

  // Re-fetch from page 1 when filters change
  useEffect(() => {
    void fetchAlertas(1);
  }, [fetchAlertas]);

  // ----------------------------------
  // Actions
  // ----------------------------------

  async function marcarTodasLeidas() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/alertas/leer-todas", { method: "POST" });
      if (res.ok) {
        toast.success("Todas las alertas marcadas como le\u00eddas");
        void fetchAlertas(1);
      } else {
        toast.error("Error al marcar como le\u00eddas");
      }
    } catch {
      toast.error("Error de conexi\u00f3n");
    } finally {
      setMarkingAll(false);
    }
  }

  async function marcarLeida(id: string) {
    try {
      const res = await fetch(`/api/alertas/${id}/leer`, { method: "POST" });
      if (res.ok) {
        setAlertas((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, leida: true, fechaLeida: new Date().toISOString() } : a,
          ),
        );
      }
    } catch {
      // silent — non-blocking
    }
  }

  function handleCardClick(alerta: Alerta) {
    if (!alerta.leida) {
      void marcarLeida(alerta.id);
    }
    if (alerta.accionUrl) {
      router.push(alerta.accionUrl);
    }
  }

  function handleLoadMore() {
    if (pagination && page < pagination.pages) {
      void fetchAlertas(page + 1, true);
    }
  }

  // ----------------------------------
  // Render
  // ----------------------------------

  const hasMore = pagination ? page < pagination.pages : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Alertas"
        description="Notificaciones del sistema"
        actions={
          <button
            onClick={marcarTodasLeidas}
            disabled={markingAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-accent-DEFAULT hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Marcar todas como le\u00eddas
          </button>
        }
      />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle No leidas / Todas */}
        <div className="inline-flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setSoloNoLeidas(true)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              soloNoLeidas
                ? "bg-accent-DEFAULT text-white"
                : "bg-bg-input text-t-secondary hover:text-t-primary"
            }`}
          >
            No le\u00eddas
          </button>
          <button
            onClick={() => setSoloNoLeidas(false)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              !soloNoLeidas
                ? "bg-accent-DEFAULT text-white"
                : "bg-bg-input text-t-secondary hover:text-t-primary"
            }`}
          >
            Todas
          </button>
        </div>

        {/* Tipo */}
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* M\u00f3dulo */}
        <select
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          className="bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
        >
          <option value="">Todos los m\u00f3dulos</option>
          {MODULO_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-t-tertiary">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Cargando alertas...</p>
        </div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-t-tertiary">
          <Bell className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-t-secondary">No hay alertas</p>
          <p className="text-sm mt-1">
            {soloNoLeidas
              ? "No ten\u00e9s notificaciones sin leer"
              : "No se encontraron notificaciones con los filtros seleccionados"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map((alerta) => {
            const dotColor = PRIORIDAD_DOT[alerta.prioridad] ?? "bg-gray-500";

            return (
              <div
                key={alerta.id}
                onClick={() => handleCardClick(alerta)}
                className={`group relative flex items-start gap-4 p-4 rounded-2xl border border-border backdrop-blur-sm transition-colors cursor-pointer ${
                  alerta.leida
                    ? "bg-transparent hover:bg-bg-card/60"
                    : "bg-accent-DEFAULT/5 hover:bg-accent-DEFAULT/10"
                }`}
              >
                {/* Priority dot */}
                <div className="pt-1.5 shrink-0">
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ${dotColor}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-sm leading-tight ${
                        alerta.leida
                          ? "text-t-secondary font-medium"
                          : "text-t-primary font-bold"
                      }`}
                    >
                      {alerta.titulo}
                    </span>
                    <span className="text-xs text-t-tertiary whitespace-nowrap">
                      {timeAgo(alerta.createdAt)}
                    </span>
                  </div>

                  {alerta.mensaje && (
                    <p className="text-sm text-t-secondary mt-1 line-clamp-2">
                      {alerta.mensaje}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={alerta.prioridad} />

                    {alerta.modulo && (
                      <span className="text-xs text-t-tertiary bg-bg-input/50 border border-border rounded-lg px-2 py-0.5">
                        {alerta.modulo}
                      </span>
                    )}

                    {alerta.accionUrl && alerta.accionLabel && (
                      <span className="text-xs text-accent-DEFAULT font-medium ml-auto group-hover:underline">
                        {alerta.accionLabel} &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-bg-card/80 border border-border text-t-secondary hover:text-t-primary hover:bg-bg-card transition-colors disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Cargar m\u00e1s
              </button>
            </div>
          )}

          {/* Count */}
          {pagination && (
            <p className="text-xs text-t-tertiary text-center pt-2">
              Mostrando {alertas.length} de {pagination.total} alerta
              {pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
