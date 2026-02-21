"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import {
  Package, Plus, AlertTriangle, ArrowUpDown, BarChart3,
} from "lucide-react";

interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  marca: string | null;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  moneda: string;
  unidad: string;
  activo: boolean;
  ubicacion: { id: string; codigo: string; nombre: string } | null;
}

interface DashboardData {
  totalRepuestos: number;
  valorInventario: number;
  repuestosStockBajo: number;
  movimientosHoy: number;
}

const CATEGORIAS = [
  "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "TRANSMISION",
  "CARROCERIA", "NEUMATICOS", "LUBRICANTES", "FILTROS",
  "TORNILLERIA", "ACCESORIOS", "OTRO",
];

const CATEGORIA_COLORS: Record<string, string> = {
  MOTOR: "bg-red-500/10 text-red-500",
  FRENOS: "bg-orange-500/10 text-orange-500",
  SUSPENSION: "bg-yellow-500/10 text-yellow-500",
  ELECTRICA: "bg-blue-500/10 text-blue-500",
  TRANSMISION: "bg-purple-500/10 text-purple-500",
  CARROCERIA: "bg-pink-500/10 text-pink-500",
  NEUMATICOS: "bg-gray-500/10 text-gray-500",
  LUBRICANTES: "bg-amber-500/10 text-amber-500",
  FILTROS: "bg-emerald-500/10 text-emerald-500",
  TORNILLERIA: "bg-slate-500/10 text-slate-500",
  ACCESORIOS: "bg-cyan-500/10 text-cyan-500",
  OTRO: "bg-neutral-500/10 text-neutral-500",
};

export default function RepuestosPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Cargando...</div>}>
      <RepuestosContent />
    </Suspense>
  );
}

function RepuestosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ajusteDialog, setAjusteDialog] = useState<{ id: string; nombre: string; stock: number } | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  const [filtroCategoria, setFiltroCategoria] = useState(searchParams.get("categoria") || "");
  const [stockBajo, setStockBajo] = useState(searchParams.get("stockBajo") === "true");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    categoria: "OTRO",
    marca: "",
    stockMinimo: 5,
    unidad: "unidad",
    precioCompra: 0,
    moneda: "ARS",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroCategoria && filtroCategoria !== "all") params.set("categoria", filtroCategoria);
    if (stockBajo) params.set("stockBajo", "true");
    if (search) params.set("search", search);

    const [repRes, dashRes] = await Promise.all([
      fetch(`/api/repuestos?${params}`),
      fetch("/api/repuestos/dashboard"),
    ]);

    if (repRes.ok) {
      const j = await repRes.json();
      setRepuestos(j.data);
    }
    if (dashRes.ok) {
      const j = await dashRes.json();
      setDashboard(j.data);
    }
    setLoading(false);
  }, [filtroCategoria, stockBajo, search]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!form.codigo || !form.nombre) return;
    const res = await fetch("/api/repuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ codigo: "", nombre: "", categoria: "OTRO", marca: "", stockMinimo: 5, unidad: "unidad", precioCompra: 0, moneda: "ARS" });
      void fetchData();
    }
  }

  async function handleAjuste() {
    if (!ajusteDialog || ajusteCantidad === 0 || !ajusteMotivo) return;
    const res = await fetch(`/api/repuestos/${ajusteDialog.id}/ajuste-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: ajusteCantidad, motivo: ajusteMotivo }),
    });
    if (res.ok) {
      setAjusteDialog(null);
      setAjusteCantidad(0);
      setAjusteMotivo("");
      void fetchData();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario de Repuestos" description="Control de stock, movimientos y ubicaciones" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Repuestos Activos</p>
                <p className="text-2xl font-bold">{dashboard?.totalRepuestos ?? 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Inventario</p>
                <p className="text-2xl font-bold">{formatMoney(dashboard?.valorInventario ?? 0)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className={`text-2xl font-bold ${(dashboard?.repuestosStockBajo ?? 0) > 0 ? "text-red-500" : ""}`}>
                  {dashboard?.repuestosStockBajo ?? 0}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${(dashboard?.repuestosStockBajo ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimientos Hoy</p>
                <p className="text-2xl font-bold">{dashboard?.movimientosHoy ?? 0}</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Categoría</Label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input placeholder="Código, nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
        </div>
        <Button variant={stockBajo ? "default" : "outline"} size="sm" onClick={() => setStockBajo(!stockBajo)}>
          <AlertTriangle className="h-4 w-4 mr-1" /> Stock Bajo
        </Button>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Repuesto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo Repuesto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Código *</Label>
                    <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="FIL-ACE-001" />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Marca</Label>
                    <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                  </div>
                  <div>
                    <Label>Stock Mínimo</Label>
                    <Input type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Precio Compra</Label>
                    <Input type="number" min={0} step={0.01} value={form.precioCompra} onChange={(e) => setForm({ ...form, precioCompra: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Moneda</Label>
                    <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={!form.codigo || !form.nombre} className="w-full">
                  Crear Repuesto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Repuestos ({repuestos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : repuestos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay repuestos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Código</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Stock</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Mín</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Precio</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Ubicación</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {repuestos.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/repuestos/${r.id}`)}
                    >
                      <td className="py-3 px-2 font-mono font-medium text-xs">{r.codigo}</td>
                      <td className="py-3 px-2">
                        <div>
                          <span className="font-medium">{r.nombre}</span>
                          {r.marca && <span className="text-xs text-muted-foreground block">{r.marca}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={`text-xs ${CATEGORIA_COLORS[r.categoria] ?? ""}`}>
                          {r.categoria}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-mono font-bold ${r.stock <= r.stockMinimo ? "text-red-500" : ""}`}>
                          {r.stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{r.unidad}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-muted-foreground">{r.stockMinimo}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(r.precioCompra))}</td>
                      <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                        {r.ubicacion?.codigo ?? "-"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAjusteDialog({ id: r.id, nombre: r.nombre, stock: r.stock });
                          }}
                        >
                          Ajustar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajuste Stock Dialog */}
      <Dialog open={!!ajusteDialog} onOpenChange={(open) => !open && setAjusteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Stock — {ajusteDialog?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="font-bold text-foreground">{ajusteDialog?.stock}</span>
            </p>
            <div>
              <Label>Cantidad (positivo = agregar, negativo = quitar)</Label>
              <Input type="number" value={ajusteCantidad} onChange={(e) => setAjusteCantidad(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Motivo *</Label>
              <Input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} placeholder="Conteo físico, rotura, etc." />
            </div>
            <Button onClick={handleAjuste} disabled={ajusteCantidad === 0 || !ajusteMotivo} className="w-full">
              Confirmar Ajuste
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
