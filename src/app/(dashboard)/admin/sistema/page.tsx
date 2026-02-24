"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import {
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────

interface HealthData {
  estado: string;
  checks: {
    database: { ok: boolean; latencyMs: number };
    eventBus: { ok: boolean; eventosUltimaHora: number };
    erroresRecientes: { ok: boolean; count: number };
  };
  uptime: string;
  version: string;
}

interface MetricsData {
  eventosTotal: number;
  eventosConError: number;
  tasaError: number;
  tiempoPromedioMs: number;
  porModulo: Array<{
    modulo: string;
    total: number;
    errores: number;
    tiempoPromedio: number;
  }>;
  porTipo: Array<{
    tipo: string;
    total: number;
    errores: number;
  }>;
  timeline: Array<{
    hora: string;
    total: number;
    errores: number;
  }>;
}

interface EventoReciente {
  id: string;
  tipo: string;
  origenModulo: string;
  nivel: string;
  duracionMs: number;
  handlersExitosos: number;
  handlersFallidos: number;
  createdAt: string;
  error: string | null;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border-base)",
  borderRadius: "12px",
  color: "var(--text-primary)",
};

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

function formatHour(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function estadoVariant(estado: string): string {
  switch (estado) {
    case "SALUDABLE":
      return "ACTIVO";
    case "DEGRADADO":
      return "EN_ESPERA_REPUESTOS";
    case "CRITICO":
      return "EN_REPARACION";
    default:
      return estado;
  }
}

function nivelVariant(nivel: string): string {
  switch (nivel) {
    case "INFO":
      return "DISPONIBLE";
    case "WARNING":
      return "EN_SERVICE";
    case "ERROR":
      return "EN_REPARACION";
    case "CRITICAL":
      return "INMOVILIZADA";
    default:
      return nivel;
  }
}

// ── Page ───────────────────────────────────────────────────────────

export default function SistemaMonitorPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [eventos, setEventos] = useState<EventoReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);

    try {
      const [healthRes, metricsRes, eventosRes] = await Promise.all([
        fetch("/api/monitor/salud"),
        fetch("/api/monitor/metricas"),
        fetch("/api/monitor/eventos?limit=10"),
      ]);

      if (healthRes.ok) {
        const j = await healthRes.json();
        setHealth(j.data);
      }
      if (metricsRes.ok) {
        const j = await metricsRes.json();
        setMetrics(j.data);
      }
      if (eventosRes.ok) {
        const j = await eventosRes.json();
        setEventos(j.data);
      }
    } catch {
      // silently fail — data stays stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Loading Skeleton ──

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monitor del Sistema"
          description="Estado de salud, métricas y eventos del sistema"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Rendered Page ──

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monitor del Sistema"
        description="Estado de salud, métricas y eventos del sistema"
      />

      {/* ── Health Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={estadoVariant(health?.estado ?? "DESCONOCIDO")} />
              <span className="text-sm font-medium text-t-primary">
                {health?.estado ?? "—"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-ds-info" />
                <span className="text-t-secondary">DB Latencia:</span>
                <span className="font-semibold text-t-primary">
                  {health?.checks.database.latencyMs ?? "—"}ms
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-accent-DEFAULT" />
                <span className="text-t-secondary">Eventos/hora:</span>
                <span className="font-semibold text-t-primary">
                  {health?.checks.eventBus.eventosUltimaHora ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    (health?.checks.erroresRecientes.count ?? 0) > 0
                      ? "bg-negative"
                      : "bg-positive"
                  }`}
                />
                <span className="text-t-secondary">Errores recientes:</span>
                <span
                  className={`font-semibold ${
                    (health?.checks.erroresRecientes.count ?? 0) > 0
                      ? "text-negative"
                      : "text-t-primary"
                  }`}
                >
                  {health?.checks.erroresRecientes.count ?? 0}
                </span>
              </div>
            </div>

            <div className="sm:ml-auto flex items-center gap-4">
              <span className="text-xs text-t-tertiary">
                Uptime: {health?.uptime ?? "—"} · v{health?.version ?? "—"}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void fetchAll(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Eventos 24h</p>
                <p className="text-2xl font-bold text-t-primary">
                  {metrics?.eventosTotal ?? 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Errores</p>
                <p
                  className={`text-2xl font-bold ${
                    (metrics?.eventosConError ?? 0) > 0
                      ? "text-negative"
                      : "text-t-primary"
                  }`}
                >
                  {metrics?.eventosConError ?? 0}
                </p>
              </div>
              <AlertTriangle
                className={`h-8 w-8 ${
                  (metrics?.eventosConError ?? 0) > 0
                    ? "text-negative"
                    : "text-t-tertiary"
                }`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Tasa Error</p>
                <p className="text-2xl font-bold text-t-primary">
                  {metrics?.tasaError ?? 0}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-t-primary">
                  {metrics?.tiempoPromedioMs ?? 0}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent-DEFAULT" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Timeline Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad por hora (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(metrics?.timeline?.length ?? 0) === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-t-tertiary mb-4" />
                <p className="text-sm text-t-secondary">
                  No hay datos de actividad disponibles
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={metrics?.timeline ?? []}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradErrores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-base)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="hora"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: string) => formatHour(value)}
                />
                <YAxis
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(value) => formatHour(String(value))}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#7B61FF"
                  fill="url(#gradTotal)"
                  strokeWidth={2}
                  name="Total"
                />
                <Area
                  type="monotone"
                  dataKey="errores"
                  stroke="#FF6B6B"
                  fill="url(#gradErrores)"
                  strokeWidth={2}
                  name="Errores"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Por Módulo ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Eventos por módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(metrics?.porModulo?.length ?? 0) === 0 ? (
            <p className="text-sm text-t-secondary text-center py-8">
              Sin datos de módulos
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-medium text-t-secondary uppercase tracking-wider">
                      Módulo
                    </th>
                    <th className="pb-3 text-xs font-medium text-t-secondary uppercase tracking-wider text-right">
                      Eventos
                    </th>
                    <th className="pb-3 text-xs font-medium text-t-secondary uppercase tracking-wider text-right">
                      Errores
                    </th>
                    <th className="pb-3 text-xs font-medium text-t-secondary uppercase tracking-wider text-right">
                      Tiempo Promedio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.porModulo.map((m) => (
                    <tr
                      key={m.modulo}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full bg-accent-DEFAULT"
                          />
                          <span className="font-medium text-t-primary">
                            {m.modulo}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-t-primary font-medium">
                        {m.total}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          m.errores > 0 ? "text-negative" : "text-t-primary"
                        }`}
                      >
                        {m.errores}
                      </td>
                      <td className="py-3 text-right text-t-secondary">
                        {m.tiempoPromedio}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Últimos Eventos ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Últimos eventos
            </CardTitle>
            <Link href="/admin/sistema/eventos">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <p className="text-sm text-t-secondary text-center py-8">
              No hay eventos recientes
            </p>
          ) : (
            <div className="space-y-2">
              {eventos.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border border-border/50 rounded-2xl p-3"
                >
                  <span className="text-xs text-t-tertiary whitespace-nowrap min-w-[70px]">
                    {timeAgo(ev.createdAt)}
                  </span>
                  <span className="text-sm font-medium text-t-primary truncate min-w-[120px]">
                    {ev.tipo}
                  </span>
                  <span className="text-xs text-t-secondary truncate min-w-[90px]">
                    {ev.origenModulo}
                  </span>
                  <StatusBadge status={nivelVariant(ev.nivel)} />
                  <span className="text-xs text-t-secondary whitespace-nowrap">
                    {ev.duracionMs}ms
                  </span>
                  <span className="text-xs text-t-tertiary whitespace-nowrap">
                    {ev.handlersExitosos}/{ev.handlersExitosos + ev.handlersFallidos} handlers
                  </span>
                  {ev.error && (
                    <span className="text-xs text-negative truncate max-w-[200px]" title={ev.error}>
                      {ev.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
