"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, ShoppingCart, AlertTriangle, Sparkles,
  RefreshCw, Package, TrendingDown, Zap,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Sugerencia {
  repuestoId: string;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  cantidadSugerida: number;
  categoria: string;
  proveedorId: string | null;
}

type Prioridad = "URGENTE" | "NORMAL" | "PUEDE_ESPERAR";

const PRIORIDAD_STYLE: Record<Prioridad, string> = {
  URGENTE: "bg-negative/20 text-negative border-negative/30",
  NORMAL: "bg-warning/20 text-warning border-warning/30",
  PUEDE_ESPERAR: "bg-border/50 text-t-tertiary border-border",
};

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  URGENTE: "Urgente",
  NORMAL: "Normal",
  PUEDE_ESPERAR: "Puede esperar",
};

function getPrioridadLocal(s: Sugerencia): Prioridad {
  const ratio = s.stockMinimo > 0 ? s.stockActual / s.stockMinimo : 1;
  if (s.stockActual === 0 || ratio < 0.3) return "URGENTE";
  if (ratio < 0.7) return "NORMAL";
  return "PUEDE_ESPERAR";
}

export default function SugerenciaCompraPage() {
  const router = useRouter();
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiPrioridades, setAiPrioridades] = useState<Record<string, Prioridad>>({});
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/repuestos/sugerencia-compra");
      if (r.ok) {
        const j = await r.json();
        setSugerencias(j.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === sugerencias.length) setSelected(new Set());
    else setSelected(new Set(sugerencias.map((s) => s.repuestoId)));
  }

  async function handleAnalyzeAI() {
    setAnalyzingAI(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ai/supply-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sugerencias }),
      });
      if (res.ok) {
        const j = await res.json();
        setAiAnalysis(j.data.analysis);
        setAiPrioridades(j.data.prioridades ?? {});
      }
    } finally {
      setAnalyzingAI(false);
    }
  }

  async function generarOC() {
    if (selected.size === 0) return;
    setCreando(true);

    const items = sugerencias
      .filter((s) => selected.has(s.repuestoId))
      .map((s) => ({
        descripcion: `${s.codigo} — ${s.nombre}`,
        codigo: s.codigo,
        cantidad: s.cantidadSugerida,
        precioUnitario: 0,
        repuestoId: s.repuestoId,
      }));

    const proveedorIds = [
      ...new Set(
        sugerencias
          .filter((s) => selected.has(s.repuestoId) && s.proveedorId)
          .map((s) => s.proveedorId!)
      ),
    ];

    if (proveedorIds.length === 0) {
      router.push("/admin/ordenes-compra");
      return;
    }

    for (const proveedorId of proveedorIds) {
      const ocItems = items.filter((item) => {
        const sug = sugerencias.find((s) => s.repuestoId === item.repuestoId);
        return sug?.proveedorId === proveedorId;
      });
      if (ocItems.length === 0) continue;
      await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorId, moneda: "ARS", items: ocItems }),
      });
    }

    const sinProveedor = items.filter((item) => {
      const sug = sugerencias.find((s) => s.repuestoId === item.repuestoId);
      return !sug?.proveedorId;
    });
    if (sinProveedor.length > 0 && proveedorIds.length > 0) {
      await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorId: proveedorIds[0], moneda: "ARS", items: sinProveedor }),
      });
    }

    setCreando(false);
    router.push("/admin/ordenes-compra");
  }

  const urgentes = sugerencias.filter((s) => {
    const p = aiPrioridades[s.repuestoId] ?? getPrioridadLocal(s);
    return p === "URGENTE";
  }).length;

  const sinStock = sugerencias.filter((s) => s.stockActual === 0).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-negative/20 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-negative" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-t-primary">Sugerencia de Compra</h1>
            <p className="text-sm text-t-tertiary">Repuestos que necesitan reposición</p>
          </div>
        </div>
        {sugerencias.length > 0 && (
          <div className="sm:ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeAI}
              disabled={analyzingAI || sugerencias.length === 0}
              className="border-accent-DEFAULT/30 text-accent-DEFAULT hover:bg-accent-DEFAULT/10"
            >
              {analyzingAI
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              }
              Analizar con IA
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : sugerencias.length === 0 ? (
        <div className="bg-bg-card rounded-2xl border border-border p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-positive mb-3" />
          <p className="text-lg font-semibold text-t-primary">Sin reposiciones pendientes</p>
          <p className="text-sm text-t-tertiary mt-1">Todos los repuestos están por encima del stock mínimo</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-t-tertiary">Total a reponer</p>
              <p className="text-2xl font-bold font-mono text-t-primary mt-1">{sugerencias.length}</p>
            </div>
            <div className="bg-bg-card rounded-2xl border border-negative/30 p-4">
              <p className="text-xs text-t-tertiary">Sin stock</p>
              <p className="text-2xl font-bold font-mono text-negative mt-1">{sinStock}</p>
            </div>
            <div className="bg-bg-card rounded-2xl border border-warning/30 p-4">
              <p className="text-xs text-t-tertiary">Urgentes</p>
              <p className="text-2xl font-bold font-mono text-warning mt-1">{urgentes}</p>
            </div>
            <div className="bg-bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-t-tertiary">Seleccionados</p>
              <p className="text-2xl font-bold font-mono text-t-primary mt-1">{selected.size}</p>
            </div>
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="bg-bg-card rounded-2xl border border-accent-DEFAULT/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-accent-DEFAULT" />
                <span className="text-sm font-semibold text-accent-DEFAULT">Análisis IA — Supply Chain</span>
              </div>
              <div className="text-sm text-t-secondary whitespace-pre-wrap leading-relaxed">
                {aiAnalysis}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selected.size === sugerencias.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set(
                sugerencias
                  .filter((s) => (aiPrioridades[s.repuestoId] ?? getPrioridadLocal(s)) === "URGENTE")
                  .map((s) => s.repuestoId)
              ))}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5 text-negative" />
              Seleccionar urgentes
            </Button>
            {selected.size > 0 && (
              <Button onClick={generarOC} disabled={creando}>
                {creando
                  ? <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  : <ShoppingCart className="h-4 w-4 mr-2" />
                }
                Generar OC ({selected.size} ítems)
              </Button>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-negative font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {sugerencias.length} repuestos bajo stock mínimo
            </div>
          </div>

          {/* Table */}
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-card/50">
                    <th className="py-3 px-3 w-8" />
                    <th className="text-left py-3 px-3 text-xs text-t-tertiary font-medium">Código</th>
                    <th className="text-left py-3 px-3 text-xs text-t-tertiary font-medium">Nombre</th>
                    <th className="text-center py-3 px-3 text-xs text-t-tertiary font-medium">Categoría</th>
                    <th className="text-center py-3 px-3 text-xs text-t-tertiary font-medium">Stock</th>
                    <th className="text-center py-3 px-3 text-xs text-t-tertiary font-medium">Mínimo</th>
                    <th className="text-center py-3 px-3 text-xs text-t-tertiary font-medium">Sugerido</th>
                    <th className="text-center py-3 px-3 text-xs text-t-tertiary font-medium">Prioridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sugerencias
                    .slice()
                    .sort((a, b) => {
                      const order = { URGENTE: 0, NORMAL: 1, PUEDE_ESPERAR: 2 };
                      const pa = aiPrioridades[a.repuestoId] ?? getPrioridadLocal(a);
                      const pb = aiPrioridades[b.repuestoId] ?? getPrioridadLocal(b);
                      return order[pa] - order[pb];
                    })
                    .map((s) => {
                      const prioridad = aiPrioridades[s.repuestoId] ?? getPrioridadLocal(s);
                      const ratio = s.stockMinimo > 0
                        ? Math.round((s.stockActual / s.stockMinimo) * 100)
                        : 0;
                      return (
                        <tr
                          key={s.repuestoId}
                          className={cn(
                            "hover:bg-bg-card/80 transition-colors",
                            selected.has(s.repuestoId) && "bg-accent-DEFAULT/5"
                          )}
                        >
                          <td className="py-3 px-3">
                            <Checkbox
                              checked={selected.has(s.repuestoId)}
                              onCheckedChange={() => toggleSelect(s.repuestoId)}
                            />
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-t-secondary">{s.codigo}</td>
                          <td className="py-3 px-3 font-medium text-t-primary">{s.nombre}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-xs bg-border/30 text-t-tertiary px-2 py-0.5 rounded-full">
                              {s.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn(
                                "font-mono font-bold",
                                s.stockActual === 0 ? "text-negative" : "text-warning"
                              )}>
                                {s.stockActual}
                              </span>
                              <span className="text-xs text-t-tertiary">{ratio}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-t-secondary">{s.stockMinimo}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-positive">{s.cantidadSugerida}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full border font-medium",
                              PRIORIDAD_STYLE[prioridad]
                            )}>
                              {prioridad === "URGENTE" && <TrendingDown className="h-3 w-3 inline mr-0.5" />}
                              {PRIORIDAD_LABEL[prioridad]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
