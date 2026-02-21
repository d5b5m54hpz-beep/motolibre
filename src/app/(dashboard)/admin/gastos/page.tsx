"use client";

import { useEffect, useState, useCallback } from "react";
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
import { toast } from "sonner";
import { PiggyBank, Plus, Check, X, Clock, AlertTriangle } from "lucide-react";

const CATEGORIAS = [
  "COMBUSTIBLE", "SEGUROS", "MANTENIMIENTO", "REPUESTOS",
  "ADMINISTRATIVO", "ALQUILER_LOCAL", "SERVICIOS", "IMPUESTOS",
  "BANCARIOS", "PUBLICIDAD", "SUELDOS", "LEGAL", "OTROS",
] as const;

const CATEGORIA_LABELS: Record<string, string> = {
  COMBUSTIBLE: "Combustible", SEGUROS: "Seguros", MANTENIMIENTO: "Mantenimiento",
  REPUESTOS: "Repuestos", ADMINISTRATIVO: "Administrativo", ALQUILER_LOCAL: "Alquiler Local",
  SERVICIOS: "Servicios", IMPUESTOS: "Impuestos", BANCARIOS: "Bancarios",
  PUBLICIDAD: "Publicidad", SUELDOS: "Sueldos", LEGAL: "Legal", OTROS: "Otros",
};

interface Gasto {
  id: string;
  fecha: string;
  monto: number;
  categoria: string;
  descripcion: string;
  estado: string;
  medioPago: string;
  responsableId: string | null;
  aprobadoPor: string | null;
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    monto: "",
    categoria: "ADMINISTRATIVO",
    descripcion: "",
    medioPago: "CAJA",
  });

  const fetchGastos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (filtroEstado) params.set("estado", filtroEstado);
    const res = await fetch(`/api/gastos?${params}`);
    if (res.ok) {
      const json = await res.json();
      setGastos(json.data);
      setTotal(json.total);
    }
    setLoading(false);
  }, [filtroCategoria, filtroEstado]);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

  async function crearGasto() {
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monto: Number(form.monto),
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.fieldErrors ? "Datos inválidos" : json.error);
      return;
    }
    toast.success("Gasto registrado");
    setDialogOpen(false);
    setForm({ fecha: new Date().toISOString().split("T")[0], monto: "", categoria: "ADMINISTRATIVO", descripcion: "", medioPago: "CAJA" });
    fetchGastos();
  }

  async function aprobarRechazar(id: string, aprobado: boolean) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/gastos/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprobado }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success(aprobado ? "Gasto aprobado" : "Gasto rechazado");
      fetchGastos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(null);
    }
  }

  const pendientes = gastos.filter((g) => g.estado === "PENDIENTE").length;
  const totalMes = gastos.filter((g) => g.estado === "APROBADO").reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        description="Registro y aprobación de gastos operativos"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gastos</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <PiggyBank className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes Aprobación</p>
                <p className="text-2xl font-bold text-amber-500">{pendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Aprobados</p>
                <p className="text-2xl font-bold text-emerald-500">{formatMoney(totalMes)}</p>
              </div>
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Crear */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Listado de Gastos</CardTitle>
            <div className="flex gap-2">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-1 h-4 w-4" /> Registrar Gasto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuevo Gasto</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                    </div>
                    <div>
                      <Label>Monto</Label>
                      <Input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map((c) => (
                            <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del gasto" />
                    </div>
                    <div>
                      <Label>Medio de Pago</Label>
                      <Select value={form.medioPago} onValueChange={(v) => setForm({ ...form, medioPago: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CAJA">Caja</SelectItem>
                          <SelectItem value="MP">MercadoPago</SelectItem>
                          <SelectItem value="BANCO_BIND">Banco BIND</SelectItem>
                          <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={crearGasto} className="w-full">Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : gastos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay gastos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Monto</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Medio</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{new Date(g.fecha).toLocaleDateString("es-AR")}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{CATEGORIA_LABELS[g.categoria] || g.categoria}</Badge>
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate">{g.descripcion}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(g.monto)}</td>
                      <td className="py-3 px-2 text-center text-xs">{g.medioPago}</td>
                      <td className="py-3 px-2 text-center">
                        {g.estado === "PENDIENTE" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <Clock className="mr-1 h-3 w-3" /> Pendiente
                          </Badge>
                        )}
                        {g.estado === "APROBADO" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            <Check className="mr-1 h-3 w-3" /> Aprobado
                          </Badge>
                        )}
                        {g.estado === "RECHAZADO" && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            <X className="mr-1 h-3 w-3" /> Rechazado
                          </Badge>
                        )}
                        {g.estado === "ANULADO" && (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Anulado
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {g.estado === "PENDIENTE" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-500"
                              onClick={() => aprobarRechazar(g.id, true)}
                              disabled={actionLoading === g.id}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500"
                              onClick={() => aprobarRechazar(g.id, false)}
                              disabled={actionLoading === g.id}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
