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
import { FileInput, Plus, DollarSign, Clock, AlertTriangle } from "lucide-react";

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

interface FC {
  id: string;
  proveedorNombre: string;
  proveedorCuit: string;
  tipo: string;
  numeroCompleto: string;
  montoTotal: number;
  montoPagado: number;
  estado: string;
  concepto: string;
  fechaEmision: string;
}

export default function FacturasCompraPage() {
  const [facturas, setFacturas] = useState<FC[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false);
  const [pagoFC, setPagoFC] = useState<FC | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMedio, setPagoMedio] = useState("CAJA");

  const [form, setForm] = useState({
    proveedorNombre: "",
    proveedorCuit: "",
    proveedorCondicionIva: "Responsable Inscripto",
    tipo: "A" as string,
    puntoVenta: "0001",
    numero: "",
    montoNeto: "",
    montoIva: "",
    montoTotal: "",
    fechaEmision: new Date().toISOString().split("T")[0],
    concepto: "",
    categoria: "",
  });

  const fetchFacturas = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroEstado) params.set("estado", filtroEstado);
    const res = await fetch(`/api/facturas-compra?${params}`);
    if (res.ok) {
      const json = await res.json();
      setFacturas(json.data);
      setTotal(json.total);
    }
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { void fetchFacturas(); }, [fetchFacturas]);

  function calcularIVA() {
    const neto = Number(form.montoNeto) || 0;
    if (form.tipo === "A") {
      const iva = Math.round(neto * 0.21 * 100) / 100;
      setForm({ ...form, montoIva: String(iva), montoTotal: String(neto + iva) });
    } else {
      setForm({ ...form, montoIva: "0", montoTotal: String(neto) });
    }
  }

  async function crearFactura() {
    const res = await fetch("/api/facturas-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        montoNeto: Number(form.montoNeto),
        montoIva: Number(form.montoIva),
        montoTotal: Number(form.montoTotal),
        categoria: form.categoria || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(typeof json.error === "string" ? json.error : "Error al crear factura");
      return;
    }
    toast.success("Factura de compra registrada");
    setDialogOpen(false);
    fetchFacturas();
  }

  async function registrarPago() {
    if (!pagoFC) return;
    const res = await fetch(`/api/facturas-compra/${pagoFC.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: Number(pagoMonto), medioPago: pagoMedio }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(typeof json.error === "string" ? json.error : "Error");
      return;
    }
    toast.success("Pago registrado");
    setPagoDialogOpen(false);
    fetchFacturas();
  }

  const pendientesPago = facturas.filter((f) => f.estado === "PENDIENTE" || f.estado === "PARCIAL");
  const totalAdeudado = pendientesPago.reduce((s, f) => s + (Number(f.montoTotal) - Number(f.montoPagado)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturas de Compra"
        description="Facturas de proveedores — registro y pago"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-t-secondary">Total Facturas</p>
                <p className="text-2xl font-bold text-t-primary">{total}</p>
              </div>
              <FileInput className="h-8 w-8 text-t-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-t-secondary">Pendientes Pago</p>
                <p className="text-2xl font-bold text-warning">{pendientesPago.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-t-secondary">Total Adeudado</p>
                <p className="text-2xl font-bold text-negative">{formatMoney(totalAdeudado)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-negative" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Listado</CardTitle>
            <div className="flex gap-2">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="PAGADA">Pagada</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-1 h-4 w-4" /> Registrar Factura</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Nueva Factura de Compra</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Proveedor</Label>
                        <Input value={form.proveedorNombre} onChange={(e) => setForm({ ...form, proveedorNombre: e.target.value })} />
                      </div>
                      <div>
                        <Label>CUIT</Label>
                        <Input value={form.proveedorCuit} onChange={(e) => setForm({ ...form, proveedorCuit: e.target.value })} placeholder="20-12345678-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="M">M (Import)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>PV</Label>
                        <Input value={form.puntoVenta} onChange={(e) => setForm({ ...form, puntoVenta: e.target.value })} />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Neto</Label>
                        <Input type="number" step="0.01" value={form.montoNeto} onChange={(e) => setForm({ ...form, montoNeto: e.target.value })} onBlur={calcularIVA} />
                      </div>
                      <div>
                        <Label>IVA</Label>
                        <Input type="number" step="0.01" value={form.montoIva} readOnly className="bg-bg-input" />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input type="number" step="0.01" value={form.montoTotal} readOnly className="bg-bg-input" />
                      </div>
                    </div>
                    <div>
                      <Label>Fecha Emisión</Label>
                      <Input type="date" value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} />
                    </div>
                    <div>
                      <Label>Concepto</Label>
                      <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Descripción de la compra" />
                    </div>
                    <div>
                      <Label>Categoría (opcional)</Label>
                      <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                        <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin categoría</SelectItem>
                          {CATEGORIAS.map((c) => (
                            <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={crearFactura} className="w-full">Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-t-secondary">Cargando...</div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-8 text-t-secondary">No hay facturas de compra</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Número</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Proveedor</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Tipo</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Total</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Pagado</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Estado</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Fecha</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr key={f.id} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{f.numeroCompleto}</td>
                      <td className="py-3 px-2">{f.proveedorNombre}</td>
                      <td className="py-3 px-2 text-center"><Badge variant="outline">{f.tipo}</Badge></td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(f.montoTotal)}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(f.montoPagado)}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className={
                          f.estado === "PENDIENTE" ? "bg-warning-bg text-warning border-warning/20" :
                          f.estado === "PARCIAL" ? "bg-info-bg text-ds-info border-ds-info/20" :
                          f.estado === "PAGADA" ? "bg-positive-bg text-positive border-positive/20" :
                          "bg-negative-bg text-negative border-negative/20"
                        }>
                          {f.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-xs">{new Date(f.fechaEmision).toLocaleDateString("es-AR")}</td>
                      <td className="py-3 px-2 text-right">
                        {(f.estado === "PENDIENTE" || f.estado === "PARCIAL") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPagoFC(f);
                              setPagoMonto(String(Number(f.montoTotal) - Number(f.montoPagado)));
                              setPagoMedio("CAJA");
                              setPagoDialogOpen(true);
                            }}
                          >
                            <DollarSign className="mr-1 h-3 w-3" /> Pagar
                          </Button>
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

      {/* Dialog de pago */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          {pagoFC && (
            <div className="space-y-4">
              <p className="text-sm text-t-secondary">
                {pagoFC.proveedorNombre} — {pagoFC.numeroCompleto}
              </p>
              <p className="text-sm">
                Saldo pendiente: <span className="font-bold">{formatMoney(Number(pagoFC.montoTotal) - Number(pagoFC.montoPagado))}</span>
              </p>
              <div>
                <Label>Monto a pagar</Label>
                <Input type="number" step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} />
              </div>
              <div>
                <Label>Medio de Pago</Label>
                <Select value={pagoMedio} onValueChange={setPagoMedio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAJA">Caja</SelectItem>
                    <SelectItem value="MP">MercadoPago</SelectItem>
                    <SelectItem value="BANCO_BIND">Banco BIND</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={registrarPago} className="w-full">Confirmar Pago</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
