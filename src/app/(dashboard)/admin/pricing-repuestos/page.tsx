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
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Tags, RefreshCw, Plus, TrendingUp, TrendingDown,
  Pencil, Check, X, ChevronDown, ChevronUp, Play, RotateCcw,
  Users, List, BarChart3, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type CategoriaRepuesto =
  | "MOTOR" | "FRENOS" | "SUSPENSION" | "ELECTRICA" | "TRANSMISION"
  | "CARROCERIA" | "NEUMATICOS" | "LUBRICANTES" | "FILTROS"
  | "TORNILLERIA" | "ACCESORIOS" | "OTRO";

const CATEGORIAS: CategoriaRepuesto[] = [
  "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "TRANSMISION",
  "CARROCERIA", "NEUMATICOS", "LUBRICANTES", "FILTROS",
  "TORNILLERIA", "ACCESORIOS", "OTRO",
];

type TipoLista = "RETAIL" | "MAYORISTA" | "TALLER" | "PROMO";
const TIPOS_LISTA: TipoLista[] = ["RETAIL", "MAYORISTA", "TALLER", "PROMO"];

interface DashboardData {
  margenPromedio: number;
  sinMarkup: number;
  sinPrecioVenta: number;
  total: number;
  distribucion: { rango: string; cantidad: number }[];
  topRentables: { id: string; nombre: string; margen: number }[];
  bottomRentables: { id: string; nombre: string; margen: number }[];
}

interface ReglaMarkup {
  id?: string;
  categoria: CategoriaRepuesto;
  porcentaje: number;
  activa: boolean;
}

interface ListaPrecio {
  id: string;
  nombre: string;
  tipo: TipoLista;
  descripcion: string | null;
  activa: boolean;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  prioridad: number;
  _count?: { items: number };
}

interface GrupoCliente {
  id: string;
  nombre: string;
  descripcion: string | null;
  descuento: number;
  activo: boolean;
  _count?: { miembros: number };
  miembros?: { clienteId: string; cliente?: { nombre: string } }[];
}

interface WhatIfItem {
  repuestoId: string;
  nombre: string;
  precioActual: number;
  precioNuevo: number;
  diferencia: number;
  diferenciaPct: number;
}

interface WhatIfResult {
  items: WhatIfItem[];
  totalActual: number;
  totalNuevo: number;
  afectados: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

const PIE_COLORS = ["#23DFFF", "#4ADE80", "#F59E0B", "#F87171", "#A78BFA", "#FB923C"];

// ── Tab 1: Dashboard Márgenes ─────────────────────────────────────────────────

function TabDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-repuestos/dashboard");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Calculando márgenes...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
        Error al cargar dashboard
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Margen promedio" value={`${data.margenPromedio.toFixed(1)}%`} icon={TrendingUp} color="text-positive" />
        <StatCard label="Total repuestos" value={data.total.toString()} icon={Tags} color="text-accent-DEFAULT" />
        <StatCard label="Sin markup" value={data.sinMarkup.toString()} icon={X} color="text-warning" />
        <StatCard label="Sin precio venta" value={data.sinPrecioVenta.toString()} icon={TrendingDown} color="text-negative" />
      </div>

      {/* Chart + tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="bg-bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-t-primary mb-4">Distribución por margen</h3>
          {data.distribucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.distribucion}
                  dataKey="cantidad"
                  nameKey="rango"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.distribucion.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  labelStyle={{ color: "var(--color-t-primary)" }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--color-t-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-t-tertiary text-sm">
              Sin datos suficientes
            </div>
          )}
        </div>

        {/* Top/Bottom */}
        <div className="space-y-4">
          <div className="bg-bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-positive mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Top 5 más rentables
            </h3>
            <div className="space-y-2">
              {data.topRentables.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-t-secondary truncate max-w-[200px]">{r.nombre}</span>
                  <span className="text-sm font-mono font-bold text-positive">{r.margen.toFixed(1)}%</span>
                </div>
              ))}
              {data.topRentables.length === 0 && (
                <p className="text-xs text-t-tertiary">Sin datos</p>
              )}
            </div>
          </div>
          <div className="bg-bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-negative mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Bottom 5 menos rentables
            </h3>
            <div className="space-y-2">
              {data.bottomRentables.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-t-secondary truncate max-w-[200px]">{r.nombre}</span>
                  <span className="text-sm font-mono font-bold text-negative">{r.margen.toFixed(1)}%</span>
                </div>
              ))}
              {data.bottomRentables.length === 0 && (
                <p className="text-xs text-t-tertiary">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={load} className="text-t-tertiary">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Recalcular
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border p-4 flex flex-col gap-2">
      <div className={cn("flex items-center gap-2", color)}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold font-mono text-t-primary">{value}</span>
    </div>
  );
}

// ── Tab 2: Markup por Categoría ───────────────────────────────────────────────

function TabMarkup() {
  const [reglas, setReglas] = useState<ReglaMarkup[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-repuestos/markup");
      if (res.ok) {
        const data: ReglaMarkup[] = await res.json();
        // Ensure all 12 categories are present
        const existing = new Map(data.map((r) => [r.categoria, r]));
        const all: ReglaMarkup[] = CATEGORIAS.map((cat) =>
          existing.get(cat) ?? { categoria: cat, porcentaje: 30, activa: true }
        );
        setReglas(all);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (cat: CategoriaRepuesto, val: string) => {
    setEditing((prev) => ({ ...prev, [cat]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = reglas.map((r) => ({
        categoria: r.categoria,
        porcentaje: parseFloat(editing[r.categoria] ?? r.porcentaje.toString()),
        activa: r.activa,
      }));
      const res = await fetch("/api/pricing-repuestos/markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await load();
        setEditing({});
      }
    } finally {
      setSaving(false);
    }
  };

  const dirty = Object.keys(editing).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-t-secondary">
          Define el porcentaje de markup que se aplica automáticamente a cada categoría
          cuando no existe precio de venta explícito.
        </p>
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0">
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Guardar cambios
          </Button>
        )}
      </div>

      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-card/50">
              <th className="text-left px-4 py-3 text-t-tertiary font-medium">Categoría</th>
              <th className="text-right px-4 py-3 text-t-tertiary font-medium">Markup %</th>
              <th className="text-center px-4 py-3 text-t-tertiary font-medium">Activa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reglas.map((r) => {
              const val = editing[r.categoria] ?? r.porcentaje.toString();
              return (
                <tr key={r.categoria} className="hover:bg-bg-card/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-t-primary">{r.categoria}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        step={0.5}
                        value={val}
                        onChange={(e) => handleEdit(r.categoria, e.target.value)}
                        className="w-20 text-right h-7 text-xs"
                      />
                      <span className="text-t-tertiary text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setReglas((prev) =>
                          prev.map((x) =>
                            x.categoria === r.categoria ? { ...x, activa: !x.activa } : x
                          )
                        );
                        setEditing((prev) => ({ ...prev, [r.categoria]: val }));
                      }}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-colors",
                        r.activa
                          ? "border-positive bg-positive/20 text-positive"
                          : "border-border bg-transparent text-t-tertiary"
                      )}
                    >
                      {r.activa && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 3: Listas de Precios ──────────────────────────────────────────────────

function TabListas() {
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "", tipo: "RETAIL" as TipoLista, descripcion: "", prioridad: "1",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-repuestos/listas");
      if (res.ok) setListas(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/pricing-repuestos/listas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          descripcion: form.descripcion || null,
          prioridad: parseInt(form.prioridad),
          vigenciaDesde: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await load();
        setOpen(false);
        setForm({ nombre: "", tipo: "RETAIL", descripcion: "", prioridad: "1" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, activa: boolean) => {
    await fetch(`/api/pricing-repuestos/listas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa }),
    });
    load();
  };

  const TIPO_COLORS: Record<TipoLista, string> = {
    RETAIL: "bg-accent-DEFAULT/20 text-accent-DEFAULT border-accent-DEFAULT/30",
    MAYORISTA: "bg-positive/20 text-positive border-positive/30",
    TALLER: "bg-warning/20 text-warning border-warning/30",
    PROMO: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-t-secondary">
          Listas de precios especiales que sobreescriben el precio calculado por markup.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Nueva Lista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Lista de Precios</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Lista Talleres VIP"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoLista })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_LISTA.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción breve"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad (1 = mayor)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.prioridad}
                  onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!form.nombre || saving}
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Crear Lista
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {listas.length === 0 ? (
        <div className="bg-bg-card rounded-2xl border border-border p-12 text-center text-t-tertiary text-sm">
          No hay listas de precios. Crea la primera lista.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {listas.map((lista) => (
            <div
              key={lista.id}
              className={cn(
                "bg-bg-card rounded-2xl border p-5 flex flex-col gap-3 transition-opacity",
                lista.activa ? "border-border" : "border-border opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full border",
                      TIPO_COLORS[lista.tipo]
                    )}
                  >
                    {lista.tipo}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-t-primary leading-tight">
                    {lista.nombre}
                  </h3>
                </div>
                <span className="text-xs text-t-tertiary shrink-0">P{lista.prioridad}</span>
              </div>

              {lista.descripcion && (
                <p className="text-xs text-t-secondary">{lista.descripcion}</p>
              )}

              <div className="mt-auto flex items-center justify-between">
                <span className="text-xs text-t-tertiary">
                  {lista._count?.items ?? 0} ítems
                </span>
                <button
                  onClick={() => handleToggle(lista.id, !lista.activa)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg border transition-colors",
                    lista.activa
                      ? "border-positive/30 text-positive hover:bg-positive/10"
                      : "border-border text-t-tertiary hover:bg-bg-card"
                  )}
                >
                  {lista.activa ? "Activa" : "Inactiva"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Grupos de Clientes ─────────────────────────────────────────────────

function TabGrupos() {
  const [grupos, setGrupos] = useState<GrupoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", descuento: "5" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-repuestos/grupos");
      if (res.ok) setGrupos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    const res = await fetch(`/api/pricing-repuestos/grupos/${id}`);
    if (res.ok) {
      const detail: GrupoCliente = await res.json();
      setGrupos((prev) => prev.map((g) => (g.id === id ? detail : g)));
    }
    setExpanded(id);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/pricing-repuestos/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          descuento: parseFloat(form.descuento),
        }),
      });
      if (res.ok) {
        await load();
        setOpen(false);
        setForm({ nombre: "", descripcion: "", descuento: "5" });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-t-tertiary text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-t-secondary">
          Grupos de clientes con descuento especial aplicado sobre el precio de lista.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Grupo de Clientes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nombre del grupo</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Clientes VIP"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción breve"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.descuento}
                  onChange={(e) => setForm({ ...form, descuento: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!form.nombre || saving}
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Crear Grupo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        {grupos.length === 0 ? (
          <div className="p-12 text-center text-t-tertiary text-sm">
            No hay grupos de clientes. Crea el primero.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-card/50">
                <th className="text-left px-4 py-3 text-t-tertiary font-medium">Grupo</th>
                <th className="text-right px-4 py-3 text-t-tertiary font-medium">Descuento</th>
                <th className="text-center px-4 py-3 text-t-tertiary font-medium">Miembros</th>
                <th className="text-center px-4 py-3 text-t-tertiary font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grupos.map((g) => (
                <>
                  <tr key={g.id} className="hover:bg-bg-card/80 transition-colors cursor-pointer" onClick={() => loadDetail(g.id)}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-t-primary">{g.nombre}</span>
                        {g.descripcion && (
                          <p className="text-xs text-t-tertiary mt-0.5">{g.descripcion}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-positive">-{g.descuento}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-t-secondary">{g._count?.miembros ?? g.miembros?.length ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        g.activo
                          ? "bg-positive/20 text-positive"
                          : "bg-border/50 text-t-tertiary"
                      )}>
                        {g.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {expanded === g.id
                        ? <ChevronUp className="h-4 w-4 text-t-tertiary ml-auto" />
                        : <ChevronDown className="h-4 w-4 text-t-tertiary ml-auto" />
                      }
                    </td>
                  </tr>
                  {expanded === g.id && g.miembros && (
                    <tr key={`${g.id}-detail`}>
                      <td colSpan={5} className="bg-bg-card/40 px-6 py-4">
                        {g.miembros.length === 0 ? (
                          <p className="text-xs text-t-tertiary">Sin miembros asignados.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {g.miembros.map((m) => (
                              <span
                                key={m.clienteId}
                                className="text-xs bg-bg-card border border-border rounded-lg px-2 py-1 text-t-secondary"
                              >
                                {m.cliente?.nombre ?? m.clienteId}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab 5: Cambios Masivos ────────────────────────────────────────────────────

function TabCambiosMasivos() {
  const [form, setForm] = useState({
    nombre: "",
    tipo: "PORCENTAJE" as "PORCENTAJE" | "MONTO_FIJO",
    valor: "",
    categorias: [] as CategoriaRepuesto[],
  });
  const [preview, setPreview] = useState<WhatIfResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const toggleCategoria = (cat: CategoriaRepuesto) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }));
    setPreview(null);
  };

  const handleSimular = async () => {
    setSimulating(true);
    setPreview(null);
    try {
      const res = await fetch("/api/pricing-repuestos/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          categorias: form.categorias.length > 0 ? form.categorias : undefined,
        }),
      });
      if (res.ok) setPreview(await res.json());
    } finally {
      setSimulating(false);
    }
  };

  const handleAplicar = async () => {
    setApplying(true);
    try {
      // 1) Create lote
      const lotRes = await fetch("/api/pricing-repuestos/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre || `Cambio ${new Date().toLocaleDateString("es-AR")}`,
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          categorias: form.categorias,
        }),
      });
      if (!lotRes.ok) return;
      const lote = await lotRes.json();
      setLoteId(lote.id);

      // 2) Apply
      const applyRes = await fetch(`/api/pricing-repuestos/lotes/${lote.id}/aplicar`, {
        method: "POST",
      });
      if (applyRes.ok) setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  const handleRevertir = async () => {
    if (!loteId) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/pricing-repuestos/lotes/${loteId}/revertir`, {
        method: "POST",
      });
      if (res.ok) {
        setApplied(false);
        setLoteId(null);
        setPreview(null);
      }
    } finally {
      setApplying(false);
    }
  };

  const canSimulate = form.valor && !isNaN(parseFloat(form.valor));

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-bg-card rounded-2xl border border-border p-5 space-y-5">
        <h3 className="text-sm font-semibold text-t-primary flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent-DEFAULT" /> Configurar cambio masivo
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre del lote</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Actualización dic-2025"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de ajuste</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v as "PORCENTAJE" | "MONTO_FIJO" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                <SelectItem value="MONTO_FIJO">Monto Fijo (ARS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor {form.tipo === "PORCENTAJE" ? "(%)" : "(ARS)"}</Label>
            <Input
              type="number"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder={form.tipo === "PORCENTAJE" ? "Ej: 15" : "Ej: 5000"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Categorías (vacío = todas)</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategoria(cat)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  form.categorias.includes(cat)
                    ? "border-accent-DEFAULT bg-accent-DEFAULT/20 text-accent-DEFAULT"
                    : "border-border bg-transparent text-t-tertiary hover:text-t-secondary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSimular}
            disabled={!canSimulate || simulating}
          >
            {simulating
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Play className="h-3.5 w-3.5 mr-1.5" />
            }
            Simular
          </Button>
          {preview && !applied && (
            <Button
              size="sm"
              onClick={handleAplicar}
              disabled={applying}
            >
              {applying
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <Check className="h-3.5 w-3.5 mr-1.5" />
              }
              Aplicar Cambio
            </Button>
          )}
          {applied && loteId && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevertir}
              disabled={applying}
              className="border-negative/30 text-negative hover:bg-negative/10"
            >
              {applying
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              }
              Revertir
            </Button>
          )}
        </div>
      </div>

      {/* Applied banner */}
      {applied && (
        <div className="bg-positive/10 border border-positive/30 rounded-2xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-positive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-positive">Cambio aplicado exitosamente</p>
            <p className="text-xs text-t-secondary mt-0.5">
              Se actualizaron {preview?.afectados ?? 0} repuestos. Puedes revertir si es necesario.
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-t-tertiary mb-1">Repuestos afectados</p>
              <p className="text-2xl font-bold font-mono text-t-primary">{preview.afectados}</p>
            </div>
            <div className="bg-bg-card rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-t-tertiary mb-1">Total actual</p>
              <p className="text-lg font-bold font-mono text-t-primary">{fmt(preview.totalActual)}</p>
            </div>
            <div className="bg-bg-card rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-t-tertiary mb-1">Total nuevo</p>
              <p className={cn(
                "text-lg font-bold font-mono",
                preview.totalNuevo > preview.totalActual ? "text-positive" : "text-negative"
              )}>
                {fmt(preview.totalNuevo)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg-card/50">
              <h3 className="text-sm font-semibold text-t-primary">Preview — {preview.items.length} repuestos</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-card/95 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-t-tertiary font-medium">Repuesto</th>
                    <th className="text-right px-4 py-2 text-t-tertiary font-medium">Actual</th>
                    <th className="text-right px-4 py-2 text-t-tertiary font-medium">Nuevo</th>
                    <th className="text-right px-4 py-2 text-t-tertiary font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.items.slice(0, 50).map((item) => (
                    <tr key={item.repuestoId} className="hover:bg-bg-card/80">
                      <td className="px-4 py-2 text-t-primary truncate max-w-[200px]">{item.nombre}</td>
                      <td className="px-4 py-2 text-right font-mono text-t-secondary text-xs">{fmt(item.precioActual)}</td>
                      <td className="px-4 py-2 text-right font-mono text-t-primary text-xs">{fmt(item.precioNuevo)}</td>
                      <td className={cn(
                        "px-4 py-2 text-right font-mono text-xs",
                        item.diferenciaPct >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {pct(item.diferenciaPct)}
                      </td>
                    </tr>
                  ))}
                  {preview.items.length > 50 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-xs text-t-tertiary">
                        … y {preview.items.length - 50} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingRepuestosPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-DEFAULT/20 flex items-center justify-center">
            <Tags className="h-5 w-5 text-accent-DEFAULT" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-t-primary">Pricing Repuestos</h1>
            <p className="text-sm text-t-tertiary">Markup, listas de precios, grupos y cambios masivos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="markup" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Markup
          </TabsTrigger>
          <TabsTrigger value="listas" className="flex items-center gap-1.5">
            <List className="h-3.5 w-3.5" /> Listas
          </TabsTrigger>
          <TabsTrigger value="grupos" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="masivos" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Cambios Masivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><TabDashboard /></TabsContent>
        <TabsContent value="markup"><TabMarkup /></TabsContent>
        <TabsContent value="listas"><TabListas /></TabsContent>
        <TabsContent value="grupos"><TabGrupos /></TabsContent>
        <TabsContent value="masivos"><TabCambiosMasivos /></TabsContent>
      </Tabs>
    </div>
  );
}
