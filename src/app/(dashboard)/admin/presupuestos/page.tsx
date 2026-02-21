"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClipboardList, Save } from "lucide-react";

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

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface Presupuesto {
  id: string;
  categoria: string;
  montoPresupuestado: number;
  montoEjecutado: number;
}

interface GastoAgrupado {
  categoria: string;
  _sum: { monto: number | null };
}

export default function PresupuestosPage() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [gastosReales, setGastosReales] = useState<GastoAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/presupuestos?anio=${anio}&mes=${mes}`);
    if (res.ok) {
      const json = await res.json();
      setPresupuestos(json.data);
      setGastosReales(json.gastosDelMes || []);
    }
    setLoading(false);
  }, [anio, mes]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function getEjecutado(cat: string): number {
    const real = gastosReales.find((g) => g.categoria === cat);
    return Number(real?._sum?.monto || 0);
  }

  function getPorcentaje(presupuestado: number, ejecutado: number): number {
    if (presupuestado <= 0) return 0;
    return Math.round((ejecutado / presupuestado) * 100);
  }

  function getBarColor(pct: number): string {
    if (pct >= 100) return "bg-red-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  }

  function openBulkDialog() {
    const initial: Record<string, string> = {};
    CATEGORIAS.forEach((c) => {
      const existing = presupuestos.find((p) => p.categoria === c);
      initial[c] = existing ? String(Number(existing.montoPresupuestado)) : "0";
    });
    setBulkForm(initial);
    setDialogOpen(true);
  }

  async function guardarBulk() {
    setSaving(true);
    const items = Object.entries(bulkForm)
      .filter(([, v]) => Number(v) > 0)
      .map(([categoria, montoPresupuestado]) => ({
        categoria,
        montoPresupuestado: Number(montoPresupuestado),
      }));

    if (items.length === 0) {
      toast.error("Ingrese al menos un monto");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/presupuestos/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anio, mes, items }),
    });

    if (res.ok) {
      toast.success("Presupuesto guardado");
      setDialogOpen(false);
      fetchData();
    } else {
      toast.error("Error guardando presupuesto");
    }
    setSaving(false);
  }

  // Build combined data
  const rows = CATEGORIAS.map((cat) => {
    const p = presupuestos.find((pr) => pr.categoria === cat);
    const presupuestado = Number(p?.montoPresupuestado || 0);
    const ejecutado = getEjecutado(cat);
    const pct = getPorcentaje(presupuestado, ejecutado);
    const restante = presupuestado - ejecutado;
    return { cat, presupuestado, ejecutado, pct, restante };
  });

  const totalPresupuestado = rows.reduce((s, r) => s + r.presupuestado, 0);
  const totalEjecutado = rows.reduce((s, r) => s + r.ejecutado, 0);
  const totalPct = getPorcentaje(totalPresupuestado, totalEjecutado);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description={`Presupuesto mensual por categoría — ${MESES[mes]} ${anio}`}
      />

      {/* Selector mes/año + botón */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <Label>Año</Label>
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Mes</Label>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openBulkDialog}>
              <ClipboardList className="mr-1 h-4 w-4" /> Configurar Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Presupuesto {MESES[mes]} {anio}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {CATEGORIAS.map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <Label className="w-32 text-sm">{CATEGORIA_LABELS[c]}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkForm[c] || "0"}
                    onChange={(e) => setBulkForm({ ...bulkForm, [c]: e.target.value })}
                    className="w-32"
                  />
                </div>
              ))}
              <Button onClick={guardarBulk} disabled={saving} className="w-full">
                <Save className="mr-1 h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecución Presupuestaria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Presupuestado</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Ejecutado</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground w-48">% Ejecución</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.filter((r) => r.presupuestado > 0 || r.ejecutado > 0).map((r) => (
                    <tr key={r.cat} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{CATEGORIA_LABELS[r.cat]}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(r.presupuestado)}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(r.ejecutado)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getBarColor(r.pct)}`}
                              style={{ width: `${Math.min(r.pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono w-10 text-right ${r.pct >= 100 ? "text-red-500" : r.pct >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                            {r.pct}%
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-2 text-right font-mono ${r.restante < 0 ? "text-red-500" : ""}`}>
                        {formatMoney(r.restante)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-3 px-2">TOTAL</td>
                    <td className="py-3 px-2 text-right font-mono">{formatMoney(totalPresupuestado)}</td>
                    <td className="py-3 px-2 text-right font-mono">{formatMoney(totalEjecutado)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getBarColor(totalPct)}`}
                            style={{ width: `${Math.min(totalPct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono w-10 text-right ${totalPct >= 100 ? "text-red-500" : totalPct >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                          {totalPct}%
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${(totalPresupuestado - totalEjecutado) < 0 ? "text-red-500" : ""}`}>
                      {formatMoney(totalPresupuestado - totalEjecutado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
