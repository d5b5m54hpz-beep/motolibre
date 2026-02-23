"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calculator, RefreshCw, Plus, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, Pencil, Check, X, Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlanAlquiler {
  id: string;
  nombre: string;
  codigo: string;
  frecuencia: string;
  duracionMeses: number | null;
  descuentoPorcentaje: number | null;
  incluyeTransferencia: boolean;
  activo: boolean;
  orden: number;
  precios: PrecioModelo[];
  _count: { precios: number };
}

interface PrecioModelo {
  id: string;
  planId: string;
  modeloMoto: string;
  condicion: string;
  precioBase: number;
  precioFinal: number;
  moneda: string;
}

interface CostoOperativo {
  id: string;
  concepto: string;
  montoMensual: number;
  descripcion: string | null;
  activo: boolean;
}

interface Simulacion {
  plan: string;
  modelo: string;
  frecuencia: string;
  precioPorPeriodo: number;
  cantidadCuotas: number;
  totalContrato: number;
  costoOperativoTotal: number;
  margenTotal: number;
  margenPorcentaje: number;
  incluyeTransferencia: boolean;
  tipoCambio?: { compra: number; venta: number; precioEnUSD: number };
}

interface TipoCambio {
  compra: number;
  venta: number;
  fecha: string;
  fuente: string;
}

interface Sugerencia {
  costoOperativoMensual: number;
  precioSugeridoMensual: number;
  precioSugeridoSemanal: number;
  margenObjetivo: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Tipo de Cambio Card ───────────────────────────────────────────────────────

function TipoCambioCard() {
  const [tc, setTc] = useState<TipoCambio | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTc = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing/tipo-cambio", {
        method: force ? "POST" : "GET",
      });
      if (res.ok) setTc(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTc(); }, [fetchTc]);

  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-warning" />
        <span className="text-xs font-semibold uppercase tracking-wider text-t-tertiary">Dólar Blue</span>
      </div>
      {tc ? (
        <>
          <div className="text-sm">
            <span className="text-t-secondary">Compra </span>
            <span className="font-mono font-bold text-t-primary">
              ${tc.compra.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-t-secondary">Venta </span>
            <span className="font-mono font-bold text-t-primary">
              ${tc.venta.toLocaleString("es-AR")}
            </span>
          </div>
          <span className="text-xs text-t-tertiary">{tc.fuente}</span>
        </>
      ) : (
        <span className="text-xs text-t-tertiary">Cargando...</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => fetchTc(true)}
        disabled={loading}
        className="ml-auto"
        title="Actualizar cotización"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      </Button>
    </div>
  );
}

// ── Tab 1: Planes y Precios ───────────────────────────────────────────────────

function NuevoPlanForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    nombre: "", codigo: "", frecuencia: "MENSUAL",
    descuentoPorcentaje: "", duracionMeses: "", incluyeTransferencia: false,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/pricing/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          descuentoPorcentaje: form.descuentoPorcentaje ? Number(form.descuentoPorcentaje) : null,
          duracionMeses: form.duracionMeses ? Number(form.duracionMeses) : null,
        }),
      });
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Plan Mensual" />
        </div>
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="MENSUAL" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Frecuencia</Label>
          <Select value={form.frecuencia} onValueChange={(v) => setForm({ ...form, frecuencia: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMANAL">Semanal</SelectItem>
              <SelectItem value="MENSUAL">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Descuento %</Label>
          <Input type="number" value={form.descuentoPorcentaje} onChange={(e) => setForm({ ...form, descuentoPorcentaje: e.target.value })} placeholder="0" min="0" max="100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Duración meses (opcional)</Label>
          <Input type="number" value={form.duracionMeses} onChange={(e) => setForm({ ...form, duracionMeses: e.target.value })} placeholder="24" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.incluyeTransferencia}
              onChange={(e) => setForm({ ...form, incluyeTransferencia: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-t-secondary">Incluye transferencia</span>
          </label>
        </div>
      </div>
      <Button onClick={submit} disabled={saving || !form.nombre || !form.codigo} className="w-full">
        {saving ? "Guardando..." : "Crear Plan"}
      </Button>
    </div>
  );
}

function NuevoPrecioForm({ planId, onSuccess }: { planId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ modeloMoto: "", condicion: "USADA", precioBase: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/pricing/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, ...form, precioBase: Number(form.precioBase) }),
      });
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Modelo de Moto</Label>
        <Input value={form.modeloMoto} onChange={(e) => setForm({ ...form, modeloMoto: e.target.value })} placeholder="Honda CB 125F" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Condición</Label>
          <Select value={form.condicion} onValueChange={(v) => setForm({ ...form, condicion: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USADA">Usada</SelectItem>
              <SelectItem value="NUEVA">Nueva</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Precio Base (ARS)</Label>
          <Input type="number" value={form.precioBase} onChange={(e) => setForm({ ...form, precioBase: e.target.value })} placeholder="85000" />
        </div>
      </div>
      <Button onClick={submit} disabled={saving || !form.modeloMoto || !form.precioBase} className="w-full">
        {saving ? "Guardando..." : "Agregar Precio"}
      </Button>
    </div>
  );
}

function PlanesPrecios() {
  const [planes, setPlanes] = useState<PlanAlquiler[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPrecio, setEditingPrecio] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [newPrecioOpen, setNewPrecioOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/pricing/planes");
    if (res.ok) setPlanes(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePrecio(precioId: string) {
    setSaving(true);
    try {
      await fetch(`/api/pricing/precios/${precioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precioBase: Number(editValue), motivo: "Edición manual" }),
      });
      setEditingPrecio(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Plan de Alquiler</DialogTitle></DialogHeader>
            <NuevoPlanForm onSuccess={() => { setNewPlanOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {planes.map((plan) => (
        <div key={plan.id} className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
          <button
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-bg-card-hover transition-colors text-left"
            onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-t-primary">{plan.nombre}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-DEFAULT/10 text-accent-DEFAULT font-medium">
                  {plan.frecuencia}
                </span>
                {plan.incluyeTransferencia && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-positive/10 text-positive font-medium flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> Lease-to-Own
                  </span>
                )}
                {plan.duracionMeses && (
                  <span className="text-xs text-t-tertiary">{plan.duracionMeses} meses</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {plan.descuentoPorcentaje ? (
                  <span className="text-xs text-t-secondary">{Number(plan.descuentoPorcentaje)}% descuento</span>
                ) : null}
                <span className="text-xs text-t-tertiary">{plan._count.precios} modelos</span>
              </div>
            </div>
            {expanded === plan.id
              ? <ChevronUp className="h-4 w-4 text-t-tertiary shrink-0" />
              : <ChevronDown className="h-4 w-4 text-t-tertiary shrink-0" />}
          </button>

          {expanded === plan.id && (
            <div className="border-t border-border">
              <div className="px-6 py-3 bg-bg-input/50 flex items-center gap-4">
                <div className="grid grid-cols-4 gap-4 flex-1 text-xs font-medium text-t-secondary uppercase tracking-wider">
                  <span>Modelo</span>
                  <span>Condición</span>
                  <span>Base</span>
                  <span>Final</span>
                </div>
                <Dialog open={newPrecioOpen === plan.id} onOpenChange={(o) => setNewPrecioOpen(o ? plan.id : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Agregar Precio — {plan.nombre}</DialogTitle></DialogHeader>
                    <NuevoPrecioForm planId={plan.id} onSuccess={() => { setNewPrecioOpen(null); load(); }} />
                  </DialogContent>
                </Dialog>
              </div>

              {plan.precios.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-t-tertiary">
                  Sin precios. Usá &ldquo;Agregar&rdquo; para configurar el primer modelo.
                </div>
              ) : (
                plan.precios.map((p) => (
                  <div key={p.id} className="grid grid-cols-4 gap-4 px-6 py-3 border-t border-border items-center hover:bg-bg-card-hover transition-colors text-sm">
                    <span className="text-t-primary font-medium truncate">{p.modeloMoto}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full w-fit font-medium",
                      p.condicion === "NUEVA" ? "bg-positive/10 text-positive" : "bg-bg-input text-t-secondary"
                    )}>
                      {p.condicion}
                    </span>
                    <span className="font-mono text-t-secondary">{fmt(Number(p.precioBase))}</span>
                    <div className="flex items-center gap-2">
                      {editingPrecio === p.id ? (
                        <>
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 w-28 font-mono text-sm"
                            autoFocus
                          />
                          <button onClick={() => savePrecio(p.id)} disabled={saving} className="text-positive hover:text-positive/80 transition-colors">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingPrecio(null)} className="text-t-tertiary hover:text-t-primary transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-semibold text-t-primary">{fmt(Number(p.precioFinal))}</span>
                          <button
                            onClick={() => { setEditingPrecio(p.id); setEditValue(String(p.precioBase)); }}
                            className="ml-auto text-t-tertiary hover:text-t-primary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {planes.length === 0 && (
        <div className="text-center py-16">
          <Calculator className="h-12 w-12 text-t-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-t-primary mb-1">Sin planes configurados</h3>
          <p className="text-sm text-t-secondary">Creá el primer plan de alquiler.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Simulador ──────────────────────────────────────────────────────────

function SimCard({
  label, value, accent, positive, negative,
}: {
  label: string; value: string;
  accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="bg-bg-input rounded-xl p-4">
      <p className="text-xs text-t-tertiary mb-1">{label}</p>
      <p className={cn(
        "font-mono font-bold text-lg",
        accent && "text-accent-DEFAULT",
        positive && "text-positive",
        negative && "text-negative",
        !accent && !positive && !negative && "text-t-primary",
      )}>
        {value}
      </p>
    </div>
  );
}

function Simulador({ planes }: { planes: PlanAlquiler[] }) {
  const [form, setForm] = useState({ modeloMoto: "", condicion: "USADA", planId: "", duracionMeses: "12" });
  const [resultado, setResultado] = useState<Simulacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const modelos = Array.from(
    new Set(planes.flatMap((p) => p.precios.map((pr) => pr.modeloMoto)))
  ).sort();

  async function simular() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pricing/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duracionMeses: form.duracionMeses ? Number(form.duracionMeses) : undefined,
        }),
      });
      if (!res.ok) {
        setError("No se encontró precio para esa combinación de modelo y plan.");
        setResultado(null);
      } else {
        setResultado(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulario */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-t-primary">Parámetros del contrato</h3>

        <div className="space-y-1.5">
          <Label>Modelo de Moto</Label>
          {modelos.length > 0 ? (
            <Select value={form.modeloMoto} onValueChange={(v) => setForm({ ...form, modeloMoto: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar modelo" /></SelectTrigger>
              <SelectContent>
                {modelos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.modeloMoto}
              onChange={(e) => setForm({ ...form, modeloMoto: e.target.value })}
              placeholder="Honda CB 125F"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Condición</Label>
            <Select value={form.condicion} onValueChange={(v) => setForm({ ...form, condicion: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USADA">Usada</SelectItem>
                <SelectItem value="NUEVA">Nueva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
              <SelectContent>
                {planes.filter((p) => p.activo).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Duración (meses)</Label>
          <Input
            type="number"
            value={form.duracionMeses}
            onChange={(e) => setForm({ ...form, duracionMeses: e.target.value })}
            placeholder="12"
            min="1"
          />
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <Button
          onClick={simular}
          disabled={loading || !form.modeloMoto || !form.planId}
          className="w-full"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {loading ? "Calculando..." : "Simular Contrato"}
        </Button>
      </div>

      {/* Resultado */}
      {resultado ? (
        <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-t-primary">{resultado.modelo}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-DEFAULT/10 text-accent-DEFAULT">
              {resultado.plan}
            </span>
            {resultado.incluyeTransferencia && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-positive/10 text-positive flex items-center gap-1">
                <Repeat className="h-3 w-3" /> Transferencia incluida
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SimCard
              label={`Precio por ${resultado.frecuencia === "SEMANAL" ? "semana" : "mes"}`}
              value={fmt(resultado.precioPorPeriodo)}
              accent
            />
            <SimCard label="Cantidad de cuotas" value={String(resultado.cantidadCuotas)} />
            <SimCard label="Total del contrato" value={fmt(resultado.totalContrato)} />
            <SimCard label="Costo operativo total" value={fmt(resultado.costoOperativoTotal)} negative />
            <SimCard
              label="Margen total"
              value={`${fmt(resultado.margenTotal)} (${resultado.margenPorcentaje}%)`}
              positive={resultado.margenTotal > 0}
              negative={resultado.margenTotal <= 0}
            />
            {resultado.tipoCambio && (
              <SimCard
                label={`En USD (blue $${resultado.tipoCambio.venta.toLocaleString("es-AR")})`}
                value={`USD ${resultado.tipoCambio.precioEnUSD.toLocaleString("es-AR")}`}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center">
          <Calculator className="h-12 w-12 text-t-tertiary mb-4" />
          <p className="text-sm text-t-secondary">Completá los parámetros y hacé clic en Simular</p>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Costos Operativos ──────────────────────────────────────────────────

function NuevoCostoForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ concepto: "", montoMensual: "", descripcion: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/pricing/costos-operativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, montoMensual: Number(form.montoMensual) }),
      });
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Concepto (único)</Label>
        <Input
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value.toUpperCase().replace(/ /g, "_") })}
          placeholder="NUEVO_COSTO"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Monto Mensual (ARS)</Label>
        <Input type="number" value={form.montoMensual} onChange={(e) => setForm({ ...form, montoMensual: e.target.value })} placeholder="5000" />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción (opcional)</Label>
        <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del costo" />
      </div>
      <Button onClick={submit} disabled={saving || !form.concepto || !form.montoMensual} className="w-full">
        {saving ? "Guardando..." : "Agregar Costo"}
      </Button>
    </div>
  );
}

function CostosOperativos() {
  const [costos, setCostos] = useState<CostoOperativo[]>([]);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/pricing/costos-operativos");
    if (res.ok) {
      const data = await res.json();
      setCostos(data.costos);
      setTotal(data.total);
    }
  }, []);

  const loadSugerencia = useCallback(async () => {
    const res = await fetch("/api/pricing/sugerencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modeloMoto: "general", margenObjetivo: 30 }),
    });
    if (res.ok) setSugerencia(await res.json());
  }, []);

  useEffect(() => { load(); loadSugerencia(); }, [load, loadSugerencia]);

  async function saveAll() {
    setSaving(true);
    try {
      const items = Object.entries(editing).map(([id, montoMensual]) => ({ id, montoMensual }));
      if (!items.length) return;
      await fetch("/api/pricing/costos-operativos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      setEditing({});
      await load();
      await loadSugerencia();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tabla */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-t-primary">Costos Mensuales por Moto</h3>
          <div className="flex gap-2">
            {Object.keys(editing).length > 0 && (
              <Button size="sm" onClick={saveAll} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            )}
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Costo Operativo</DialogTitle></DialogHeader>
                <NuevoCostoForm onSuccess={() => { setNewOpen(false); load(); loadSugerencia(); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-bg-input/50 text-xs font-medium text-t-secondary uppercase tracking-wider">
            <span>Concepto</span>
            <span>Monto Mensual</span>
            <span>Descripción</span>
          </div>
          {costos.map((c) => (
            <div key={c.id} className="grid grid-cols-3 gap-4 px-6 py-3 border-t border-border items-center hover:bg-bg-card-hover transition-colors">
              <span className="font-mono text-sm text-t-primary">{c.concepto}</span>
              <Input
                type="number"
                defaultValue={c.montoMensual}
                onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                className="h-8 font-mono text-sm w-36"
              />
              <span className="text-sm text-t-secondary truncate">{c.descripcion ?? "—"}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-t-2 border-border bg-bg-input/30">
            <span className="font-semibold text-t-primary">TOTAL MENSUAL</span>
            <span className="font-mono font-bold text-lg text-t-primary">{fmt(total)}</span>
            <span />
          </div>
        </div>
      </div>

      {/* Sugerencia */}
      {sugerencia && (
        <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            <h3 className="font-semibold text-t-primary">Sugerencia de Precios</h3>
          </div>
          <p className="text-xs text-t-tertiary">
            Con estos costos y {sugerencia.margenObjetivo}% de margen objetivo:
          </p>
          <div className="space-y-3">
            <div className="bg-bg-input rounded-xl p-4">
              <p className="text-xs text-t-tertiary mb-1">Mensual sugerido</p>
              <p className="font-mono font-bold text-xl text-positive">{fmt(sugerencia.precioSugeridoMensual)}</p>
            </div>
            <div className="bg-bg-input rounded-xl p-4">
              <p className="text-xs text-t-tertiary mb-1">Semanal sugerido</p>
              <p className="font-mono font-bold text-xl text-accent-DEFAULT">{fmt(sugerencia.precioSugeridoSemanal)}</p>
            </div>
            <div className="bg-bg-input rounded-xl p-4">
              <p className="text-xs text-t-tertiary mb-1">Costo mensual total</p>
              <p className="font-mono font-semibold text-t-primary">{fmt(sugerencia.costoOperativoMensual)}</p>
            </div>
          </div>
          <p className="text-xs text-t-tertiary">* Estimativo. No incluye gastos reales de contabilidad.</p>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [planes, setPlanes] = useState<PlanAlquiler[]>([]);

  useEffect(() => {
    fetch("/api/pricing/planes")
      .then((r) => r.json())
      .then(setPlanes)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-t-primary">
          Pricing de Alquiler
        </h1>
        <p className="text-sm text-t-secondary mt-1">
          Planes, precios por modelo, simulador y costos operativos
        </p>
      </div>

      <TipoCambioCard />

      <Tabs defaultValue="planes">
        <TabsList className="bg-bg-input border border-border">
          <TabsTrigger value="planes" className="data-[state=active]:bg-bg-card data-[state=active]:text-accent-DEFAULT">
            Planes y Precios
          </TabsTrigger>
          <TabsTrigger value="simulador" className="data-[state=active]:bg-bg-card data-[state=active]:text-accent-DEFAULT">
            Simulador
          </TabsTrigger>
          <TabsTrigger value="costos" className="data-[state=active]:bg-bg-card data-[state=active]:text-accent-DEFAULT">
            Costos Operativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planes" className="mt-6">
          <PlanesPrecios />
        </TabsContent>
        <TabsContent value="simulador" className="mt-6">
          <Simulador planes={planes} />
        </TabsContent>
        <TabsContent value="costos" className="mt-6">
          <CostosOperativos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
