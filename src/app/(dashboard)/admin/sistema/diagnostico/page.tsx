"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Wrench,
  History,
  Activity,
} from "lucide-react";

interface CheckResult {
  nombre: string;
  modulo: string;
  estado: string;
  mensaje: string;
  detalle?: string | string[];
  sugerencia?: string;
}

interface DiagnosticoEjecucion {
  id: string;
  estado: string;
  checksTotal: number;
  checksOk: number;
  checksWarning: number;
  checksError: number;
  resultados: CheckResult[];
  duracionMs: number;
  ejecutadoPor: string | null;
  createdAt: string;
}

interface DiagnosticoResponse {
  data: DiagnosticoEjecucion[];
  total: number;
}

const ESTADO_STATUS_MAP: Record<string, string> = {
  OK: "DISPONIBLE",
  WARNING: "EN_PATENTAMIENTO",
  ERROR: "EN_REPARACION",
  COMPLETADO: "COMPLETADA",
  FALLIDO: "CANCELADO",
};

function CheckIcon({ estado }: { estado: string }) {
  switch (estado) {
    case "OK":
      return <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />;
    case "WARNING":
      return <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />;
    case "ERROR":
      return <XCircle className="h-5 w-5 text-red-400 shrink-0" />;
    default:
      return <Activity className="h-5 w-5 text-t-tertiary shrink-0" />;
  }
}

export default function DiagnosticoPage() {
  const [historial, setHistorial] = useState<DiagnosticoEjecucion[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [reparando, setReparando] = useState(false);

  const [ultimoResultado, setUltimoResultado] =
    useState<DiagnosticoEjecucion | null>(null);

  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch("/api/sistema/diagnostico?limit=10");
      if (res.ok) {
        const json: DiagnosticoResponse = await res.json();
        setHistorial(json.data);
        if (json.data.length > 0 && !ultimoResultado) {
          setUltimoResultado(json.data[0] ?? null);
        }
      } else {
        toast.error("Error al cargar historial de diagnósticos");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setLoadingHistorial(false);
  }, [ultimoResultado]);

  useEffect(() => {
    void fetchHistorial();
  }, [fetchHistorial]);

  async function ejecutarDiagnostico() {
    setEjecutando(true);
    try {
      const res = await fetch("/api/sistema/diagnostico", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        const resultado: DiagnosticoEjecucion = json.data;
        setUltimoResultado(resultado);
        toast.success(
          `Diagnóstico completado: ${resultado.checksTotal} checks en ${resultado.duracionMs}ms`
        );
        void fetchHistorial();
      } else {
        toast.error("Error al ejecutar diagnóstico");
      }
    } catch {
      toast.error("Error de conexión al ejecutar diagnóstico");
    }
    setEjecutando(false);
  }

  async function repararMotosHuerfanas() {
    setReparando(true);
    try {
      const res = await fetch("/api/sistema/reparar-motos-huerfanas", {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.data?.reparadas ?? 0} motos reparadas`);
      } else {
        toast.error("Error al reparar motos huérfanas");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setReparando(false);
  }

  const resultados = ultimoResultado?.resultados ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnóstico del Sistema"
        description="Verificación de integridad y consistencia"
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={ejecutarDiagnostico} disabled={ejecutando}>
          {ejecutando ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Ejecutar diagnóstico
        </Button>

        {ultimoResultado && !ejecutando && (
          <span className="text-sm text-t-secondary">
            {ultimoResultado.checksTotal} checks:{" "}
            <span className="text-green-400 font-medium">
              {ultimoResultado.checksOk} OK
            </span>
            {ultimoResultado.checksWarning > 0 && (
              <>
                ,{" "}
                <span className="text-yellow-400 font-medium">
                  {ultimoResultado.checksWarning} warnings
                </span>
              </>
            )}
            {ultimoResultado.checksError > 0 && (
              <>
                ,{" "}
                <span className="text-red-400 font-medium">
                  {ultimoResultado.checksError} errores
                </span>
              </>
            )}
            {" "}— {ultimoResultado.duracionMs}ms
          </span>
        )}
      </div>

      {/* Results */}
      {resultados.length > 0 && (
        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-t-primary">
              <Activity className="h-5 w-5" />
              Resultados del diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultados.map((check, idx) => {
              const isIssue =
                check.estado === "WARNING" || check.estado === "ERROR";

              return (
                <div
                  key={`${check.nombre}-${idx}`}
                  className={`rounded-xl border p-4 transition-colors ${
                    check.estado === "ERROR"
                      ? "border-red-500/20 bg-red-500/5"
                      : check.estado === "WARNING"
                        ? "border-yellow-500/20 bg-yellow-500/5"
                        : "border-border bg-bg-card-hover/30"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <CheckIcon estado={check.estado} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-t-primary">
                          {check.nombre}
                        </span>
                        <span className="text-xs text-t-tertiary">
                          {check.modulo}
                        </span>
                        <StatusBadge
                          status={
                            ESTADO_STATUS_MAP[check.estado] ?? check.estado
                          }
                          className="text-xs"
                        />
                      </div>
                      <p className="text-sm text-t-secondary mt-1">
                        {check.mensaje}
                      </p>
                    </div>
                  </div>

                  {/* Expanded details for WARNING/ERROR */}
                  {isIssue && (
                    <div className="mt-3 ml-8 space-y-2">
                      {check.detalle && (
                        <div>
                          {Array.isArray(check.detalle) ? (
                            <ul className="list-disc list-inside text-xs text-t-secondary space-y-0.5">
                              {check.detalle.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-t-secondary">
                              {check.detalle}
                            </p>
                          )}
                        </div>
                      )}
                      {check.sugerencia && (
                        <p className="text-xs italic text-t-tertiary">
                          {check.sugerencia}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-t-primary">
            <Wrench className="h-5 w-5" />
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={repararMotosHuerfanas}
              disabled={reparando}
            >
              {reparando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              Reparar motos huérfanas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-bg-card/80 backdrop-blur-sm border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-t-primary">
            <History className="h-5 w-5" />
            Historial de ejecuciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-center p-4">Checks</th>
                  <th className="text-center p-4">OK</th>
                  <th className="text-center p-4">Warning</th>
                  <th className="text-center p-4">Error</th>
                  <th className="text-right p-4">Duración</th>
                  <th className="text-left p-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistorial ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                    </tr>
                  ))
                ) : historial.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12 text-t-tertiary"
                    >
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No hay ejecuciones registradas
                    </td>
                  </tr>
                ) : (
                  historial.map((ejecucion) => (
                    <tr
                      key={ejecucion.id}
                      className="border-b border-border/50 hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() => setUltimoResultado(ejecucion)}
                    >
                      <td className="p-4 text-t-secondary text-xs whitespace-nowrap">
                        {formatDateTime(ejecucion.createdAt)}
                      </td>
                      <td className="p-4 text-center font-mono text-t-primary">
                        {ejecucion.checksTotal}
                      </td>
                      <td className="p-4 text-center font-mono text-green-400">
                        {ejecucion.checksOk}
                      </td>
                      <td className="p-4 text-center font-mono text-yellow-400">
                        {ejecucion.checksWarning > 0
                          ? ejecucion.checksWarning
                          : "-"}
                      </td>
                      <td className="p-4 text-center font-mono text-red-400">
                        {ejecucion.checksError > 0
                          ? ejecucion.checksError
                          : "-"}
                      </td>
                      <td className="p-4 text-right font-mono text-t-tertiary text-xs">
                        {ejecucion.duracionMs}ms
                      </td>
                      <td className="p-4">
                        <StatusBadge
                          status={
                            ESTADO_STATUS_MAP[ejecucion.estado] ??
                            ejecucion.estado
                          }
                          className="text-xs"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
