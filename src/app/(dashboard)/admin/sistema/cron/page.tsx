"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Clock, Play, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface CronJob {
  id: string;
  name: string;
  frequency: string;
  description: string;
}

interface ExecutionLog {
  job: string;
  timestamp: string;
  result: unknown;
  ok: boolean;
}

// ── Data ───────────────────────────────────────────────────────────

const CRON_JOBS: CronJob[] = [
  {
    id: "contratos-por-vencer",
    name: "Contratos por Vencer",
    frequency: "Diario 8:00",
    description: "Busca contratos que vencen en 30/15/7 dias y crea alertas",
  },
  {
    id: "cuotas-vencidas",
    name: "Cuotas Vencidas",
    frequency: "Diario 9:00",
    description: "Marca cuotas PENDIENTE como VENCIDA si paso la fecha",
  },
  {
    id: "generar-cuotas",
    name: "Generar Cuotas",
    frequency: "Diario 7:00",
    description: "Safety net: genera cuotas faltantes para contratos activos",
  },
  {
    id: "mantenimiento-programado",
    name: "Mantenimiento Programado",
    frequency: "Diario 10:00",
    description: "Alerta sobre mantenimientos programados en proximos 7 dias",
  },
  {
    id: "documentos-por-vencer",
    name: "Documentos por Vencer",
    frequency: "Lunes 8:00",
    description: "Alerta sobre documentos de empleados por vencer en 30 dias",
  },
  {
    id: "limpieza",
    name: "Limpieza del Sistema",
    frequency: "Domingo 3:00",
    description:
      "Limpia eventos >90d, alertas leidas >60d, sesiones expiradas, reservas abandonadas",
  },
];

// ── Page ───────────────────────────────────────────────────────────

export default function CronJobsPage() {
  const [executingJob, setExecutingJob] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  async function ejecutarJob(jobId: string) {
    setExecutingJob(jobId);
    const timestamp = new Date().toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "medium",
    });

    try {
      const res = await fetch("/api/sistema/cron-ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobId }),
      });

      const json = await res.json();

      setLogs((prev) => [
        { job: jobId, timestamp, result: json, ok: res.ok },
        ...prev,
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error de conexion";
      setLogs((prev) => [
        { job: jobId, timestamp, result: { error: message }, ok: false },
        ...prev,
      ]);
    } finally {
      setExecutingJob(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cron Jobs"
        description="Tareas programadas del sistema"
      />

      {/* ── Jobs Table ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                <th className="text-left p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Job
                  </div>
                </th>
                <th className="text-left p-4">Frecuencia</th>
                <th className="text-left p-4">Descripcion</th>
                <th className="text-right p-4">Accion</th>
              </tr>
            </thead>
            <tbody>
              {CRON_JOBS.map((job) => {
                const isExecuting = executingJob === job.id;

                return (
                  <tr
                    key={job.id}
                    className="border-b border-border/50 last:border-0 hover:bg-bg-card-hover transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <span className="text-t-primary font-medium">
                          {job.name}
                        </span>
                        <span className="block text-xs text-t-tertiary font-mono mt-0.5">
                          {job.id}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-t-secondary text-xs font-medium">
                        {job.frequency}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-t-secondary text-xs">
                        {job.description}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => void ejecutarJob(job.id)}
                        disabled={executingJob !== null}
                        className="inline-flex items-center gap-1.5 bg-accent-DEFAULT hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm px-4 py-2 transition-colors"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Ejecutando...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Ejecutar ahora
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Execution Log ── */}
      {logs.length > 0 && (
        <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-sm font-medium text-t-primary">
              Log de ejecuciones ({logs.length})
            </h2>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-t-tertiary hover:text-t-secondary transition-colors"
            >
              Limpiar
            </button>
          </div>
          <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      log.ok ? "bg-positive" : "bg-negative"
                    }`}
                  />
                  <span className="text-sm font-medium text-t-primary font-mono">
                    {log.job}
                  </span>
                  <span className="text-xs text-t-tertiary">{log.timestamp}</span>
                  <span
                    className={`text-xs font-medium ${
                      log.ok ? "text-positive" : "text-negative"
                    }`}
                  >
                    {log.ok ? "OK" : "ERROR"}
                  </span>
                </div>
                <pre className="text-xs font-mono bg-bg-input/50 rounded-xl p-3 overflow-x-auto text-t-secondary border border-border/50 max-h-60">
                  {JSON.stringify(log.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
