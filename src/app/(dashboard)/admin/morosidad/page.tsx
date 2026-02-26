"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  Sparkles,
  Loader2,
  Send,
  RefreshCw,
  ExternalLink,
  Clock,
  TrendingDown,
  Users,
  DollarSign,
} from "lucide-react";
import useSWR from "swr";

// ── Types ────────────────────────────────────────────────
interface ClienteMora {
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  contratoId: string;
  motoModelo: string;
  cuotasVencidas: number;
  montoTotal: number;
  diasMaxVencido: number;
  riesgo: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ultimoRecordatorio: string | null;
  cuotaIds: string[];
}

interface MorosidadData {
  resumen: {
    totalEnMora: number;
    clientesAfectados: number;
    contratosSuspendibles: number;
    porcentajeCartera: number;
  };
  aging: {
    d1_30: { count: number; monto: number };
    d31_60: { count: number; monto: number };
    d61_90: { count: number; monto: number };
    d90plus: { count: number; monto: number };
  };
  clientes: ClienteMora[];
}

// ── Helpers ──────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((j) => j.data);

const RIESGO_CONFIG = {
  LOW:      { label: "Bajo",     color: "text-yellow-600",  bg: "bg-yellow-50 border-yellow-200" },
  MEDIUM:   { label: "Medio",    color: "text-orange-600",  bg: "bg-orange-50 border-orange-200" },
  HIGH:     { label: "Alto",     color: "text-red-600",     bg: "bg-red-50 border-red-200" },
  CRITICAL: { label: "Crítico",  color: "text-red-800",     bg: "bg-red-100 border-red-300" },
};

function pesos(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });
}

function diasLabel(n: number) {
  return `${n} ${n === 1 ? "día" : "días"}`;
}

function fechaRelativa(iso: string | null) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d} días`;
}

// ── Dialog: Recordatorio ─────────────────────────────────
function RecordatorioDialog({
  clientes,
  onClose,
  onSuccess,
}: {
  clientes: ClienteMora[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [usarIA, setUsarIA] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const cuotaIds = clientes.flatMap((c) => c.cuotaIds);

  async function generarPreview() {
    if (clientes.length !== 1) return;
    setLoadingPreview(true);
    try {
      const c = clientes[0];
      if (!c) return;
      const res = await fetch("/api/ai/morosidad-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen: { totalEnMora: c.montoTotal, clientesAfectados: 1, contratosSuspendibles: 0, porcentajeCartera: 0 },
          aging: {},
          topClientes: [c],
        }),
      });
      const j = await res.json();
      setPreview(j.data?.analysis ?? "No se pudo generar el preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleEnviar() {
    setSending(true);
    try {
      const res = await fetch("/api/comercial/morosidad/recordatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuotaIds, usarIA }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      toast.success(`Recordatorio enviado a ${j.data.enviados} cliente(s)`);
      if (j.data.errores?.length) {
        toast.warning(`${j.data.errores.length} error(es): ${j.data.errores[0]}`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Enviar Recordatorio
            {clientes.length === 1
              ? ` — ${clientes[0]?.clienteNombre ?? ""}`
              : ` — ${clientes.length} clientes`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* IA toggle */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40">
            <Checkbox
              id="usar-ia"
              checked={usarIA}
              onCheckedChange={(v) => { setUsarIA(!!v); setPreview(null); }}
            />
            <div>
              <label htmlFor="usar-ia" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Mensaje personalizado con IA
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Claude genera un mensaje empático y personalizado para cada cliente
              </p>
            </div>
          </div>

          {/* Preview para un solo cliente */}
          {clientes.length === 1 && usarIA && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview del mensaje
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={generarPreview}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  {preview ? "Regenerar" : "Generar preview"}
                </Button>
              </div>
              {preview && (
                <Textarea
                  value={preview}
                  readOnly
                  rows={4}
                  className="text-sm resize-none bg-blue-50/50 border-blue-200"
                />
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            {clientes.map((c) => (
              <div key={c.contratoId} className="flex justify-between text-sm">
                <span className="font-medium">{c.clienteNombre}</span>
                <span className="text-muted-foreground">
                  {pesos(c.montoTotal)} · {diasLabel(c.diasMaxVencido)} vencida
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar {cuotaIds.length > 1 ? `(${clientes.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function MorosidadPage() {
  const { data, isLoading, mutate } = useSWR<MorosidadData>(
    "/api/comercial/morosidad",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recordatorioTarget, setRecordatorioTarget] = useState<ClienteMora[] | null>(null);

  const clientes = data?.clientes ?? [];

  const toggleSelect = useCallback((contratoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contratoId)) next.delete(contratoId);
      else next.add(contratoId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === clientes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clientes.map((c) => c.contratoId)));
    }
  }, [selected.size, clientes]);

  async function handleAnalizarIA() {
    if (!data) return;
    setLoadingAI(true);
    try {
      const res = await fetch("/api/ai/morosidad-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen: data.resumen,
          aging: data.aging,
          topClientes: data.clientes.slice(0, 10),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setAiAnalysis(j.data.analysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setLoadingAI(false);
    }
  }

  const selectedClientes = clientes.filter((c) => selected.has(c.contratoId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { resumen, aging } = data ?? {
    resumen: { totalEnMora: 0, clientesAfectados: 0, contratosSuspendibles: 0, porcentajeCartera: 0 },
    aging: { d1_30: { count: 0, monto: 0 }, d31_60: { count: 0, monto: 0 }, d61_90: { count: 0, monto: 0 }, d90plus: { count: 0, monto: 0 } },
  };

  const agingTotal = (aging.d1_30.monto + aging.d31_60.monto + aging.d61_90.monto + aging.d90plus.monto) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Morosidad
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cartera vencida y gestión de cobros
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAnalizarIA}
            disabled={loadingAI || !data}
          >
            {loadingAI ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
            )}
            Analizar con IA
          </Button>
          <Button
            variant="default"
            disabled={selected.size === 0}
            onClick={() => setRecordatorioTarget(selectedClientes)}
          >
            <Send className="h-4 w-4 mr-2" />
            Recordatorios ({selected.size})
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Total en mora
            </div>
            <p className="text-2xl font-bold text-destructive">{pesos(resumen.totalEnMora)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <Users className="h-3.5 w-3.5" /> Clientes afectados
            </div>
            <p className="text-2xl font-bold">{resumen.clientesAfectados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <TrendingDown className="h-3.5 w-3.5" /> % cartera
            </div>
            <p className="text-2xl font-bold">{resumen.porcentajeCartera}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Críticos (90+d)
            </div>
            <p className="text-2xl font-bold text-destructive">{resumen.contratosSuspendibles}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Análisis IA — Eva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {aiAnalysis}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Aging Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "1-30 días", data: aging.d1_30, color: "bg-yellow-400" },
            { label: "31-60 días", data: aging.d31_60, color: "bg-orange-400" },
            { label: "61-90 días", data: aging.d61_90, color: "bg-red-400" },
            { label: "90+ días", data: aging.d90plus, color: "bg-red-700" },
          ].map(({ label, data: d, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">
                  {d.count} cuota{d.count !== 1 ? "s" : ""} · {pesos(d.monto)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${Math.round((d.monto / agingTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Clientes en mora ({clientes.length})
            </CardTitle>
            {clientes.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={toggleAll}>
                {selected.size === clientes.length ? "Deseleccionar todo" : "Seleccionar todo"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clientes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin clientes en mora</p>
            </div>
          ) : (
            <div className="divide-y">
              {clientes.map((c) => {
                const cfg = RIESGO_CONFIG[c.riesgo];
                const isSelected = selected.has(c.contratoId);
                return (
                  <div
                    key={c.contratoId}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-muted/50" : "hover:bg-muted/20"}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(c.contratoId)}
                    />
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-0.5">
                      <div className="md:col-span-1">
                        <p className="text-sm font-medium truncate">{c.clienteNombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.clienteEmail}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-muted-foreground">Moto</p>
                        <p className="text-sm">{c.motoModelo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cuotas vencidas</p>
                        <p className="text-sm font-medium">{c.cuotasVencidas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monto</p>
                        <p className="text-sm font-semibold text-destructive">{pesos(c.montoTotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Máx. vencido</p>
                        <p className="text-sm">{diasLabel(c.diasMaxVencido)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${cfg.color} ${cfg.bg}`}
                      >
                        {cfg.label}
                      </Badge>
                      {c.ultimoRecordatorio && (
                        <span className="text-xs text-muted-foreground hidden lg:inline">
                          Recordatorio {fechaRelativa(c.ultimoRecordatorio)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRecordatorioTarget([c])}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Recordatorio
                      </Button>
                      <Link href={`/admin/contratos/${c.contratoId}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      {recordatorioTarget && (
        <RecordatorioDialog
          clientes={recordatorioTarget}
          onClose={() => setRecordatorioTarget(null)}
          onSuccess={() => {
            setRecordatorioTarget(null);
            setSelected(new Set());
            mutate();
          }}
        />
      )}
    </div>
  );
}
