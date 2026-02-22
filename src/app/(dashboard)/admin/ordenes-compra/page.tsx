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
import { formatMoney, formatDate } from "@/lib/format";
import {
  ShoppingCart, Plus, Clock, CheckCircle2, DollarSign, Trash2,
} from "lucide-react";

interface OC {
  id: string;
  numero: string;
  estado: string;
  montoTotal: number;
  montoSubtotal: number;
  moneda: string;
  fechaEmision: string;
  fechaEntregaEstimada: string | null;
  proveedor: { id: string; nombre: string; tipoProveedor: string };
  _count: { items: number };
}

interface Proveedor {
  id: string;
  nombre: string;
  tipoProveedor: string;
  condicionIva: string | null;
}

const ESTADOS_OC = ["BORRADOR", "ENVIADA", "CONFIRMADA", "RECIBIDA", "CANCELADA"];

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-t-secondary/10 text-t-secondary",
  ENVIADA: "bg-info-bg text-ds-info",
  CONFIRMADA: "bg-accent-DEFAULT/10 text-accent-DEFAULT",
  RECIBIDA: "bg-positive-bg text-positive",
  CANCELADA: "bg-negative-bg text-negative",
};

export default function OrdenesCompraPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Cargando...</div>}>
      <OrdenesCompraContent />
    </Suspense>
  );
}

function OrdenesCompraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ordenes, setOrdenes] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [filtroEstado, setFiltroEstado] = useState(searchParams.get("estado") || "");
  const [search, setSearch] = useState("");

  // New OC form
  const [form, setForm] = useState({
    proveedorId: "",
    fechaEntregaEstimada: "",
    moneda: "ARS",
    observaciones: "",
  });
  const [items, setItems] = useState<Array<{ descripcion: string; codigo: string; cantidad: number; precioUnitario: number }>>([
    { descripcion: "", codigo: "", cantidad: 1, precioUnitario: 0 },
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado && filtroEstado !== "all") params.set("estado", filtroEstado);
    if (search) params.set("search", search);

    const res = await fetch(`/api/ordenes-compra?${params}`);
    if (res.ok) {
      const j = await res.json();
      setOrdenes(j.data);
    }
    setLoading(false);
  }, [filtroEstado, search]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    void fetch("/api/proveedores?activo=true").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setProveedores(j.data);
      }
    });
  }, []);

  function addItem() {
    setItems([...items, { descripcion: "", codigo: "", cantidad: 1, precioUnitario: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: string | number) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const subtotalCalc = items.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
  const selectedProv = proveedores.find((p) => p.id === form.proveedorId);
  const esRI = selectedProv?.tipoProveedor === "NACIONAL" && selectedProv?.condicionIva?.toLowerCase().includes("responsable inscripto");
  const ivaCalc = esRI ? subtotalCalc * 0.21 : 0;
  const totalCalc = subtotalCalc + ivaCalc;

  async function handleCreate() {
    const validItems = items.filter((i) => i.descripcion && i.cantidad > 0 && i.precioUnitario > 0);
    if (!form.proveedorId || validItems.length === 0) return;

    const res = await fetch("/api/ordenes-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fechaEntregaEstimada: form.fechaEntregaEstimada || null,
        observaciones: form.observaciones || null,
        items: validItems,
      }),
    });
    if (res.ok) {
      const j = await res.json();
      setDialogOpen(false);
      router.push(`/admin/ordenes-compra/${j.data.id}`);
    }
  }

  const ocsActivas = ordenes.filter((o) => !["RECIBIDA", "CANCELADA"].includes(o.estado)).length;
  const ocsPendientes = ordenes.filter((o) => o.estado === "ENVIADA").length;
  const montoPendiente = ordenes
    .filter((o) => !["RECIBIDA", "CANCELADA"].includes(o.estado))
    .reduce((sum, o) => sum + Number(o.montoTotal), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Órdenes de Compra" description="Gestión de compras a proveedores" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OCs Activas</p>
                <p className="text-2xl font-bold">{ocsActivas}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes Confirmación</p>
                <p className="text-2xl font-bold text-warning">{ocsPendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Pendiente</p>
                <p className="text-2xl font-bold">{formatMoney(montoPendiente)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Nueva OC */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Estado</Label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS_OC.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input placeholder="Número, proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nueva OC</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Orden de Compra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Proveedor *</Label>
                    <Select value={form.proveedorId} onValueChange={(v) => setForm({ ...form, proveedorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div>
                  <Label>Fecha Entrega Estimada</Label>
                  <Input type="date" value={form.fechaEntregaEstimada} onChange={(e) => setForm({ ...form, fechaEntregaEstimada: e.target.value })} />
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-base font-medium">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" /> Agregar Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          {idx === 0 && <Label className="text-xs">Descripción *</Label>}
                          <Input value={item.descripcion} onChange={(e) => updateItem(idx, "descripcion", e.target.value)} placeholder="Descripción" />
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <Label className="text-xs">Código</Label>}
                          <Input value={item.codigo} onChange={(e) => updateItem(idx, "codigo", e.target.value)} placeholder="Código" />
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <Label className="text-xs">Cantidad *</Label>}
                          <Input type="number" min={1} value={item.cantidad} onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <Label className="text-xs">Precio Unit. *</Label>}
                          <Input type="number" min={0} step={0.01} value={item.precioUnitario} onChange={(e) => updateItem(idx, "precioUnitario", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-1 text-right text-sm font-mono py-2">
                          {formatMoney(item.cantidad * item.precioUnitario)}
                        </div>
                        <div className="col-span-1">
                          {items.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-4 w-4 text-negative" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">{formatMoney(subtotalCalc)}</span></div>
                  {ivaCalc > 0 && <div className="flex justify-between"><span>IVA 21%:</span><span className="font-mono">{formatMoney(ivaCalc)}</span></div>}
                  <div className="flex justify-between font-bold text-base"><span>Total:</span><span className="font-mono">{formatMoney(totalCalc)}</span></div>
                </div>

                <Button onClick={handleCreate} disabled={!form.proveedorId || items.every((i) => !i.descripcion)} className="w-full">
                  Crear Orden de Compra
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
            <ShoppingCart className="h-5 w-5" /> Órdenes de Compra ({ordenes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : ordenes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay órdenes de compra</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Número</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Proveedor</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Items</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Moneda</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Entrega Est.</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((oc) => (
                    <tr
                      key={oc.id}
                      className="border-b hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/ordenes-compra/${oc.id}`)}
                    >
                      <td className="py-3 px-2 font-mono font-medium">{oc.numero}</td>
                      <td className="py-3 px-2">{oc.proveedor.nombre}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={`text-xs ${ESTADO_COLORS[oc.estado] ?? ""}`}>
                          {oc.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">{oc._count.items}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(oc.montoTotal))}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className="text-xs">{oc.moneda}</Badge>
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                        {oc.fechaEntregaEstimada ? formatDate(new Date(oc.fechaEntregaEstimada)) : "-"}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                        {formatDate(new Date(oc.fechaEmision))}
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
