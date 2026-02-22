"use client";

import { useEffect, useState, use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Package, ArrowUpDown, AlertTriangle, MapPin, Truck, DollarSign,
} from "lucide-react";

interface RepuestoDetalle {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  marca: string | null;
  modeloCompatible: string[];
  stock: number;
  stockMinimo: number;
  stockMaximo: number | null;
  unidad: string;
  precioCompra: number;
  precioVenta: number | null;
  moneda: string;
  precioFOB: number | null;
  costoNacionalizado: number | null;
  proveedorId: string | null;
  proveedorCodigo: string | null;
  activo: boolean;
  ubicacion: { id: string; codigo: string; nombre: string } | null;
  movimientos: Array<{
    id: string;
    tipo: string;
    cantidad: number;
    stockAnterior: number;
    stockPosterior: number;
    descripcion: string | null;
    costoUnitario: number | null;
    referenciaTipo: string | null;
    referenciaId: string | null;
    userId: string | null;
    createdAt: string;
  }>;
  historialCostos: Array<{
    id: string;
    precioAnterior: number;
    precioNuevo: number;
    motivo: string | null;
    createdAt: string;
  }>;
}

const TIPO_MOV_COLORS: Record<string, string> = {
  INGRESO: "bg-positive-bg text-positive",
  EGRESO: "bg-negative-bg text-negative",
  AJUSTE_POSITIVO: "bg-info-bg text-ds-info",
  AJUSTE_NEGATIVO: "bg-warning-bg text-warning",
  TRANSFERENCIA: "bg-accent-DEFAULT/10 text-accent-DEFAULT",
  DEVOLUCION: "bg-info-bg text-ds-info",
};

export default function RepuestoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [repuesto, setRepuesto] = useState<RepuestoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteCantidad, setAjusteCantidad] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  useEffect(() => {
    void fetch(`/api/repuestos/${id}`).then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setRepuesto(j.data);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleAjuste() {
    if (ajusteCantidad === 0 || !ajusteMotivo) return;
    const res = await fetch(`/api/repuestos/${id}/ajuste-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: ajusteCantidad, motivo: ajusteMotivo }),
    });
    if (res.ok) {
      setAjusteOpen(false);
      setAjusteCantidad(0);
      setAjusteMotivo("");
      // Refresh
      const r2 = await fetch(`/api/repuestos/${id}`);
      if (r2.ok) {
        const j = await r2.json();
        setRepuesto(j.data);
      }
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Cargando...</div>;
  if (!repuesto) return <div className="text-center py-12 text-muted-foreground">Repuesto no encontrado</div>;

  const stockPct = repuesto.stockMaximo
    ? Math.min(100, (repuesto.stock / repuesto.stockMaximo) * 100)
    : repuesto.stockMinimo > 0
      ? Math.min(100, (repuesto.stock / (repuesto.stockMinimo * 3)) * 100)
      : 50;

  const stockColor = repuesto.stock <= repuesto.stockMinimo
    ? "bg-negative" : repuesto.stock <= repuesto.stockMinimo * 2
      ? "bg-warning" : "bg-positive";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${repuesto.codigo} — ${repuesto.nombre}`}
        description={repuesto.descripcion || `Categoría: ${repuesto.categoria}`}
      />

      {/* Action bar */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setAjusteOpen(true)}>
          <ArrowUpDown className="h-4 w-4 mr-2" /> Ajustar Stock
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className={`text-4xl font-bold ${repuesto.stock <= repuesto.stockMinimo ? "text-negative" : ""}`}>
                {repuesto.stock}
              </p>
              <p className="text-sm text-muted-foreground">{repuesto.unidad}(s)</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>Mín: {repuesto.stockMinimo}</span>
                {repuesto.stockMaximo && <span>Máx: {repuesto.stockMaximo}</span>}
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className={`h-3 rounded-full ${stockColor}`} style={{ width: `${stockPct}%` }} />
              </div>
            </div>
            {repuesto.stock <= repuesto.stockMinimo && (
              <div className="flex items-center gap-2 text-negative text-sm">
                <AlertTriangle className="h-4 w-4" /> Stock bajo — requiere reposición
              </div>
            )}
          </CardContent>
        </Card>

        {/* Precios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Precios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Precio Compra</dt>
                <dd className="font-mono font-medium">{formatMoney(Number(repuesto.precioCompra))}</dd>
              </div>
              {repuesto.precioVenta && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Precio Venta</dt>
                  <dd className="font-mono font-medium">{formatMoney(Number(repuesto.precioVenta))}</dd>
                </div>
              )}
              {repuesto.precioFOB && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">FOB USD</dt>
                  <dd className="font-mono font-medium">USD {Number(repuesto.precioFOB).toFixed(2)}</dd>
                </div>
              )}
              {repuesto.costoNacionalizado && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nacionalizado</dt>
                  <dd className="font-mono font-medium">{formatMoney(Number(repuesto.costoNacionalizado))}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Moneda</dt>
                <dd>{repuesto.moneda}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Info General</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd><Badge variant="outline">{repuesto.categoria}</Badge></dd>
              </div>
              {repuesto.marca && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Marca</dt>
                  <dd>{repuesto.marca}</dd>
                </div>
              )}
              {repuesto.modeloCompatible.length > 0 && (
                <div>
                  <dt className="text-muted-foreground mb-1">Modelos compatibles</dt>
                  <dd className="flex flex-wrap gap-1">
                    {repuesto.modeloCompatible.map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              {repuesto.ubicacion && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Ubicación</dt>
                  <dd>{repuesto.ubicacion.codigo} — {repuesto.ubicacion.nombre}</dd>
                </div>
              )}
              {repuesto.proveedorId && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Proveedor</dt>
                  <dd className="text-xs">{repuesto.proveedorCodigo || repuesto.proveedorId}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" /> Movimientos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {repuesto.movimientos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Sin movimientos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Cant.</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Stock</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Referencia</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {repuesto.movimientos.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 px-2 text-xs">{formatDate(new Date(m.createdAt))}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={`text-xs ${TIPO_MOV_COLORS[m.tipo] ?? ""}`}>{m.tipo}</Badge>
                      </td>
                      <td className={`py-2 px-2 text-center font-mono font-bold ${m.cantidad >= 0 ? "text-positive" : "text-negative"}`}>
                        {m.cantidad > 0 ? "+" : ""}{m.cantidad}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-xs">
                        {m.stockAnterior} → {m.stockPosterior}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {m.referenciaTipo ?? "-"}
                      </td>
                      <td className="py-2 px-2 text-xs">{m.descripcion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial Costos */}
      {repuesto.historialCostos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Historial de Costos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Anterior</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground" />
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Nuevo</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {repuesto.historialCostos.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-2 px-2 text-xs">{formatDate(new Date(h.createdAt))}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatMoney(Number(h.precioAnterior))}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">→</td>
                      <td className="py-2 px-2 text-right font-mono font-medium">{formatMoney(Number(h.precioNuevo))}</td>
                      <td className="py-2 px-2 text-xs">{h.motivo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajuste Dialog */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Stock — {repuesto.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="font-bold text-foreground">{repuesto.stock}</span>
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
