"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  Loader2,
  ChevronLeft,
  Search,
} from "lucide-react";

interface Evento {
  id: string;
  tipo: string;
  payload: Record<string, unknown>;
  origenModulo: string;
  origenUsuario: string | null;
  origenAccion: string | null;
  handlersEjecutados: number;
  handlersExitosos: number;
  handlersFallidos: number;
  duracionMs: number;
  nivel: string;
  error: string | null;
  stackTrace: string | null;
  createdAt: string;
}

interface EventosResponse {
  data: Evento[];
  total: number;
  page: number;
  totalPages: number;
}

const NIVELES = ["Todos", "INFO", "WARNING", "ERROR", "CRITICAL"] as const;
const MODULOS = [
  { value: "", label: "Todos" },
  { value: "fleet", label: "Fleet" },
  { value: "commercial", label: "Commercial" },
  { value: "finance", label: "Finance" },
  { value: "system", label: "System" },
  { value: "hr", label: "HR" },
  { value: "supply", label: "Supply" },
  { value: "anomaly", label: "Anomaly" },
];

const NIVEL_STATUS_MAP: Record<string, string> = {
  INFO: "DISPONIBLE",
  WARNING: "EN_PATENTAMIENTO",
  ERROR: "EN_REPARACION",
  CRITICAL: "INMOVILIZADA",
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [limpiando, setLimpiando] = useState(false);

  const [nivel, setNivel] = useState("");
  const [modulo, setModulo] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState("");
  const [tipoDebounced, setTipoDebounced] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce tipo search
  useEffect(() => {
    const timer = setTimeout(() => {
      setTipoDebounced(tipoBusqueda);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [tipoBusqueda]);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nivel) params.set("nivel", nivel);
      if (modulo) params.set("modulo", modulo);
      if (tipoDebounced) params.set("tipo", tipoDebounced);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/monitor/eventos?${params}`);
      if (res.ok) {
        const json: EventosResponse = await res.json();
        setEventos(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      } else {
        toast.error("Error al cargar eventos");
      }
    } catch {
      toast.error("Error de conexión al cargar eventos");
    }
    setLoading(false);
  }, [nivel, modulo, tipoDebounced, page]);

  useEffect(() => {
    void fetchEventos();
  }, [fetchEventos]);

  async function limpiarEventos() {
    setLimpiando(true);
    try {
      const res = await fetch("/api/monitor/limpiar", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.data?.eliminados ?? 0} eventos eliminados (> 90 días)`);
        void fetchEventos();
      } else {
        toast.error("Error al limpiar eventos");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setLimpiando(false);
  }

  function exportarCSV() {
    if (eventos.length === 0) {
      toast.error("No hay eventos para exportar");
      return;
    }

    const headers = [
      "Fecha",
      "Tipo",
      "Módulo",
      "Handlers Ejecutados",
      "Handlers Exitosos",
      "Handlers Fallidos",
      "Duración (ms)",
      "Nivel",
      "Error",
    ];

    const rows = eventos.map((e) => [
      e.createdAt,
      e.tipo,
      e.origenModulo,
      String(e.handlersEjecutados),
      String(e.handlersExitosos),
      String(e.handlersFallidos),
      String(e.duracionMs),
      e.nivel,
      e.error ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eventos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos del Sistema"
        description="Registro completo de eventos emitidos"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Nivel tabs */}
        <div className="flex items-center gap-1">
          {NIVELES.map((n) => {
            const isActive = n === "Todos" ? nivel === "" : nivel === n;
            return (
              <Button
                key={n}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setNivel(n === "Todos" ? "" : n);
                  setPage(1);
                }}
              >
                {n}
              </Button>
            );
          })}
        </div>

        {/* Módulo select */}
        <select
          value={modulo}
          onChange={(e) => {
            setModulo(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-xl border border-border bg-bg-input px-3 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {MODULOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Tipo search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-t-tertiary" />
          <input
            type="text"
            placeholder="Buscar tipo..."
            value={tipoBusqueda}
            onChange={(e) => setTipoBusqueda(e.target.value)}
            className="h-8 rounded-xl border border-border bg-bg-input pl-8 pr-3 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={limpiarEventos}
          disabled={limpiando}
        >
          {limpiando ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-1.5" />
          )}
          Limpiar &gt; 90 días
        </Button>

        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="h-4 w-4 mr-1.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Events table */}
      <Card className="bg-bg-card/80 backdrop-blur-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                <th className="w-8 p-4" />
                <th className="text-left p-4">Fecha</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Módulo</th>
                <th className="text-center p-4">Handlers</th>
                <th className="text-right p-4">Duración</th>
                <th className="text-left p-4">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4" />
                    <td className="p-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-16" />
                    </td>
                  </tr>
                ))
              ) : eventos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-t-tertiary">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No se encontraron eventos
                  </td>
                </tr>
              ) : (
                eventos.map((evento) => {
                  const isExpanded = expandedId === evento.id;
                  const hasFallidos = evento.handlersFallidos > 0;

                  return (
                    <Fragment key={evento.id}>
                      <tr
                        className="border-b border-border/50 hover:bg-bg-card-hover transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : evento.id)
                        }
                      >
                        <td className="p-4 text-t-tertiary">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="p-4 text-t-secondary text-xs whitespace-nowrap">
                          {formatDateTime(evento.createdAt)}
                        </td>
                        <td className="p-4">
                          <span className="text-t-primary font-medium font-mono text-xs">
                            {evento.tipo}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-t-secondary text-xs">
                            {evento.origenModulo}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`font-mono text-xs ${
                              hasFallidos
                                ? "text-red-400 font-semibold"
                                : "text-t-secondary"
                            }`}
                          >
                            {evento.handlersExitosos}/{evento.handlersEjecutados}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono text-xs text-t-tertiary">
                            {evento.duracionMs}ms
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge
                            status={NIVEL_STATUS_MAP[evento.nivel] ?? evento.nivel}
                            className="text-xs"
                          />
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="border-b border-border/50 bg-bg-card-hover/50">
                          <td colSpan={7} className="p-0">
                            <div className="px-6 py-4 space-y-3">
                              {/* Metadata */}
                              <div className="flex flex-wrap gap-4 text-xs text-t-tertiary">
                                {evento.origenUsuario && (
                                  <span>
                                    <span className="text-t-secondary font-medium">Usuario:</span>{" "}
                                    {evento.origenUsuario}
                                  </span>
                                )}
                                {evento.origenAccion && (
                                  <span>
                                    <span className="text-t-secondary font-medium">Acción:</span>{" "}
                                    {evento.origenAccion}
                                  </span>
                                )}
                                <span>
                                  <span className="text-t-secondary font-medium">Handlers:</span>{" "}
                                  {evento.handlersExitosos} exitosos
                                  {evento.handlersFallidos > 0 && (
                                    <span className="text-red-400">
                                      , {evento.handlersFallidos} fallidos
                                    </span>
                                  )}
                                  {" "}de {evento.handlersEjecutados} ejecutados
                                </span>
                              </div>

                              {/* Payload */}
                              <div>
                                <p className="text-xs font-medium text-t-secondary mb-1">
                                  Payload
                                </p>
                                <pre className="text-xs font-mono bg-bg-input/50 rounded-xl p-3 overflow-x-auto text-t-secondary border border-border/50 max-h-60">
                                  {JSON.stringify(evento.payload, null, 2)}
                                </pre>
                              </div>

                              {/* Error */}
                              {evento.error && (
                                <div>
                                  <p className="text-xs font-medium text-red-400 mb-1">
                                    Error
                                  </p>
                                  <p className="text-xs text-red-400/80 bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                                    {evento.error}
                                  </p>
                                </div>
                              )}

                              {/* Stack Trace */}
                              {evento.stackTrace && (
                                <div>
                                  <p className="text-xs font-medium text-red-400 mb-1">
                                    Stack Trace
                                  </p>
                                  <pre className="text-xs font-mono bg-red-500/5 rounded-xl p-3 overflow-x-auto text-red-400/70 border border-red-500/10 max-h-48">
                                    {evento.stackTrace}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-t-tertiary">
              {total} evento{total !== 1 ? "s" : ""} en total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-xs text-t-secondary px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
