"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { formatMoney, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, DollarSign, FileText, Save, Loader2 } from "lucide-react";

const CATEGORIA_LABELS: Record<string, string> = {
  COMBUSTIBLE: "Combustible",
  SEGUROS: "Seguros",
  MANTENIMIENTO: "Mantenimiento",
  REPUESTOS: "Repuestos",
  ADMINISTRATIVO: "Administrativo",
  ALQUILER_LOCAL: "Alquiler Local",
  SERVICIOS: "Servicios",
  IMPUESTOS: "Impuestos",
  BANCARIOS: "Bancarios",
  PUBLICIDAD: "Publicidad",
  SUELDOS: "Sueldos",
  LEGAL: "Legal",
  OTROS: "Otros",
};

const CATEGORIAS = Object.keys(CATEGORIA_LABELS);

interface FacturaCompra {
  id: string;
  proveedorNombre: string;
  proveedorCuit: string;
  proveedorCondicionIva: string;
  proveedorId: string | null;
  tipo: string;
  puntoVenta: string;
  numero: string;
  numeroCompleto: string;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
  fechaEmision: string;
  fechaVencimiento: string | null;
  cae: string | null;
  concepto: string;
  categoria: string | null;
  estado: string;
  montoPagado: number;
  archivoUrl: string | null;
  asientoId: string | null;
  motoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FacturaCompraDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fc, setFC] = useState<FacturaCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pagando, setPagando] = useState(false);

  // Editable fields
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");

  // Pago form
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMedio, setPagoMedio] = useState("CAJA");

  const fetchFC = useCallback(async () => {
    const res = await fetch(`/api/facturas-compra/${id}`);
    if (!res.ok) {
      toast.error("Factura no encontrada");
      router.push("/admin/facturas-compra");
      return;
    }
    const j = await res.json();
    const data = j.data as FacturaCompra;
    setFC(data);
    setConcepto(data.concepto);
    setCategoria(data.categoria ?? "");
    setPagoMonto(
      String(Math.max(0, Number(data.montoTotal) - Number(data.montoPagado)))
    );
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void fetchFC();
  }, [fetchFC]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/facturas-compra/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepto,
          categoria: categoria || undefined,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Factura actualizada");
      void fetchFC();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handlePago() {
    setPagando(true);
    try {
      const res = await fetch(`/api/facturas-compra/${id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: Number(pagoMonto),
          medioPago: pagoMedio,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Error");
      }
      toast.success("Pago registrado");
      void fetchFC();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setPagando(false);
    }
  }

  if (loading || !fc) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const saldo = Number(fc.montoTotal) - Number(fc.montoPagado);
  const porcentajePagado =
    Number(fc.montoTotal) > 0
      ? Math.min(100, (Number(fc.montoPagado) / Number(fc.montoTotal)) * 100)
      : 0;

  const estadoColor: Record<string, string> = {
    PENDIENTE: "bg-warning-bg text-warning border-warning/20",
    PARCIAL: "bg-info-bg text-ds-info border-ds-info/20",
    PAGADA: "bg-positive-bg text-positive border-positive/20",
    ANULADA: "bg-negative-bg text-negative border-negative/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/facturas-compra">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Facturas Compra
          </Button>
        </Link>
      </div>

      <PageHeader
        title={fc.numeroCompleto}
        description={`${fc.proveedorNombre} — ${fc.proveedorCuit}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos de la Factura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Datos de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="mt-1">
                    Factura {fc.tipo}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Punto de Venta</p>
                  <p className="font-mono text-sm">{fc.puntoVenta}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="font-mono text-sm">{fc.numero}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Proveedor</p>
                    <p className="text-sm font-medium">{fc.proveedorNombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CUIT</p>
                    <p className="font-mono text-sm">{fc.proveedorCuit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cond. IVA</p>
                    <p className="text-sm">{fc.proveedorCondicionIva}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha Emisión</p>
                    <p className="text-sm font-mono">
                      {new Date(fc.fechaEmision).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  {fc.fechaVencimiento && (
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha Vencimiento</p>
                      <p className="text-sm font-mono">
                        {new Date(fc.fechaVencimiento).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Montos */}
              <div className="border-t pt-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monto Neto</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(Number(fc.montoNeto))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(Number(fc.montoIva))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(Number(fc.montoTotal))}
                    </span>
                  </div>
                </div>
              </div>

              {fc.cae && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">CAE</p>
                  <p className="font-mono text-sm">{fc.cae}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Concepto y Clasificación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Concepto y Clasificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Concepto</Label>
                <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORIA_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Estado de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Estado de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 ${estadoColor[fc.estado] ?? ""}`}
                >
                  {fc.estado}
                </Badge>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progreso de pago</span>
                  <span>{Math.round(porcentajePagado)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-positive rounded-full transition-all"
                    style={{ width: `${porcentajePagado}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono tabular-nums font-medium">
                    {formatMoney(Number(fc.montoTotal))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagado</span>
                  <span className="font-mono tabular-nums text-positive">
                    {formatMoney(Number(fc.montoPagado))}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-1">
                  <span>Saldo</span>
                  <span className="font-mono tabular-nums text-negative">
                    {formatMoney(saldo)}
                  </span>
                </div>
              </div>

              {/* Pago form */}
              {(fc.estado === "PENDIENTE" || fc.estado === "PARCIAL") && (
                <div className="border-t pt-3 space-y-3">
                  <div>
                    <Label>Monto a pagar</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pagoMonto}
                      onChange={(e) => setPagoMonto(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Medio de Pago</Label>
                    <Select value={pagoMedio} onValueChange={setPagoMedio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAJA">Caja</SelectItem>
                        <SelectItem value="MP">MercadoPago</SelectItem>
                        <SelectItem value="BANCO_BIND">Banco BIND</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handlePago}
                    disabled={pagando || !pagoMonto || Number(pagoMonto) <= 0}
                    className="w-full"
                  >
                    {pagando ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-1" />
                    )}
                    Registrar Pago
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada</span>
                <span className="font-mono text-xs">
                  {formatDateTime(new Date(fc.createdAt))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizada</span>
                <span className="font-mono text-xs">
                  {formatDateTime(new Date(fc.updatedAt))}
                </span>
              </div>
              {fc.asientoId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asiento</span>
                  <Link
                    href={`/admin/asientos/${fc.asientoId}`}
                    className="text-xs text-ds-info hover:underline font-mono"
                  >
                    {fc.asientoId.slice(0, 8)}
                  </Link>
                </div>
              )}
              {fc.motoId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moto</span>
                  <Link
                    href={`/admin/motos/${fc.motoId}`}
                    className="text-xs text-ds-info hover:underline font-mono"
                  >
                    {fc.motoId.slice(0, 8)}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
