"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Ship, Package, DollarSign, Clock, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Embarque {
  id: string;
  numero: string;
  estado: string;
  proveedorNombre: string;
  totalFOB: string;
  monedaFOB: string;
  fechaEstimadaArribo: string | null;
  tipoTransporte: string;
  createdAt: string;
  _count: { items: number };
}

interface Proveedor {
  id: string;
  nombre: string;
  tipoProveedor: string;
}

interface ItemForm {
  descripcion: string;
  codigoProveedor: string;
  repuestoId: string;
  esMoto: boolean;
  cantidad: number;
  precioFOBUnitario: number;
  posicionArancelaria: string;
  alicuotaDerechos: number;
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-t-secondary/10 text-t-secondary",
  EN_TRANSITO: "bg-info-bg text-ds-info",
  EN_PUERTO: "bg-info-bg text-ds-info",
  EN_ADUANA: "bg-warning-bg text-warning",
  DESPACHADO_PARCIAL: "bg-warning-bg text-warning",
  DESPACHADO: "bg-positive-bg text-positive",
  COSTOS_FINALIZADOS: "bg-positive-bg text-positive",
  EN_RECEPCION: "bg-accent-DEFAULT/10 text-accent-DEFAULT",
  ALMACENADO: "bg-positive-bg text-positive",
  CANCELADO: "bg-negative-bg text-negative",
};

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_TRANSITO: "En Tránsito",
  EN_PUERTO: "En Puerto",
  EN_ADUANA: "En Aduana",
  DESPACHADO_PARCIAL: "Desp. Parcial",
  DESPACHADO: "Despachado",
  COSTOS_FINALIZADOS: "Costos OK",
  EN_RECEPCION: "Recibiendo",
  ALMACENADO: "Almacenado",
  CANCELADO: "Cancelado",
};

function ImportacionesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [estadoFilter, setEstadoFilter] = useState(searchParams.get("estado") || "");

  // Stats
  const activos = embarques.filter((e) => !["ALMACENADO", "CANCELADO"].includes(e.estado)).length;
  const enTransito = embarques.filter((e) => e.estado === "EN_TRANSITO").length;
  const totalFOBPendiente = embarques
    .filter((e) => !["ALMACENADO", "CANCELADO"].includes(e.estado))
    .reduce((sum, e) => sum + Number(e.totalFOB), 0);

  // Form state
  const [formData, setFormData] = useState({
    proveedorId: "",
    tipoTransporte: "MARITIMO",
    puertoOrigen: "",
    naviera: "",
    numeroContenedor: "",
    numeroBL: "",
    fechaEmbarque: "",
    fechaEstimadaArribo: "",
    observaciones: "",
  });
  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: "", codigoProveedor: "", repuestoId: "", esMoto: false, cantidad: 1, precioFOBUnitario: 0, posicionArancelaria: "", alicuotaDerechos: 0 },
  ]);

  function fetchEmbarques() {
    setLoading(true);
    const p = new URLSearchParams();
    if (estadoFilter) p.set("estado", estadoFilter);
    if (search) p.set("search", search);
    fetch(`/api/embarques?${p}`)
      .then((r) => r.json())
      .then((d) => setEmbarques(d.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchEmbarques();
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((d) => setProveedores((d.data || []).filter((p: Proveedor) => p.tipoProveedor === "INTERNACIONAL")));
  }, []);

  useEffect(() => {
    fetchEmbarques();
  }, [estadoFilter]);

  function addItem() {
    setItems([...items, { descripcion: "", codigoProveedor: "", repuestoId: "", esMoto: false, cantidad: 1, precioFOBUnitario: 0, posicionArancelaria: "", alicuotaDerechos: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: unknown) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value } as ItemForm;
    setItems(updated);
  }

  async function handleCreate() {
    const validItems = items.filter((i) => i.descripcion && i.cantidad > 0 && i.precioFOBUnitario > 0);
    if (!formData.proveedorId || validItems.length === 0) {
      toast.error("Selecciona un proveedor y al menos un item válido");
      return;
    }

    const res = await fetch("/api/embarques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        fechaEmbarque: formData.fechaEmbarque || null,
        fechaEstimadaArribo: formData.fechaEstimadaArribo || null,
        items: validItems,
      }),
    });

    if (res.ok) {
      const embarque = await res.json();
      toast.success(`Embarque ${embarque.numero} creado`);
      setOpen(false);
      router.push(`/admin/importaciones/${embarque.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error?.formErrors?.[0] || "Error al crear embarque");
    }
  }

  const totalFOBItems = items.reduce((sum, i) => sum + i.precioFOBUnitario * i.cantidad, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Importaciones" description="Gestión de embarques e importaciones" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Embarques Activos</CardTitle>
            <Ship className="h-4 w-4 text-ds-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Tránsito</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enTransito}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">FOB Pendiente (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-positive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalFOBPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Package className="h-4 w-4 text-accent-DEFAULT" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{embarques.reduce((sum, e) => sum + e._count.items, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Action */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchEmbarques()}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Embarque</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Embarque de Importación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proveedor Internacional *</Label>
                  <Select value={formData.proveedorId} onValueChange={(v) => setFormData({ ...formData, proveedorId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo Transporte</Label>
                  <Select value={formData.tipoTransporte} onValueChange={(v) => setFormData({ ...formData, tipoTransporte: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARITIMO">Marítimo</SelectItem>
                      <SelectItem value="AEREO">Aéreo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Puerto Origen</Label>
                  <Input value={formData.puertoOrigen} onChange={(e) => setFormData({ ...formData, puertoOrigen: e.target.value })} placeholder="Shanghai, Guangzhou..." />
                </div>
                <div>
                  <Label>Naviera</Label>
                  <Input value={formData.naviera} onChange={(e) => setFormData({ ...formData, naviera: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>N° Contenedor</Label>
                  <Input value={formData.numeroContenedor} onChange={(e) => setFormData({ ...formData, numeroContenedor: e.target.value })} />
                </div>
                <div>
                  <Label>N° B/L</Label>
                  <Input value={formData.numeroBL} onChange={(e) => setFormData({ ...formData, numeroBL: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Embarque</Label>
                  <Input type="date" value={formData.fechaEmbarque} onChange={(e) => setFormData({ ...formData, fechaEmbarque: e.target.value })} />
                </div>
                <div>
                  <Label>ETA</Label>
                  <Input type="date" value={formData.fechaEstimadaArribo} onChange={(e) => setFormData({ ...formData, fechaEstimadaArribo: e.target.value })} />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Items del Embarque</Label>
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Agregar</Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
                      <div className="col-span-4">
                        <Label className="text-xs">Descripción *</Label>
                        <Input value={item.descripcion} onChange={(e) => updateItem(idx, "descripcion", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Código Prov.</Label>
                        <Input value={item.codigoProveedor} onChange={(e) => updateItem(idx, "codigoProveedor", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Cantidad *</Label>
                        <Input type="number" min={1} value={item.cantidad} onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">FOB Unit (USD) *</Label>
                        <Input type="number" min={0} step={0.01} value={item.precioFOBUnitario} onChange={(e) => updateItem(idx, "precioFOBUnitario", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {items.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 text-negative">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-right mt-2 font-medium">
                  Total FOB: <span className="text-positive">USD ${totalFOBItems.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              <Button onClick={handleCreate} className="w-full">Crear Embarque</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-input">
                  <th className="text-left p-3">Número</th>
                  <th className="text-left p-3">Proveedor</th>
                  <th className="text-center p-3">Estado</th>
                  <th className="text-center p-3">Items</th>
                  <th className="text-right p-3">Total FOB</th>
                  <th className="text-left p-3">ETA</th>
                  <th className="text-center p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Cargando...</td></tr>
                ) : embarques.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Sin embarques</td></tr>
                ) : (
                  embarques.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-bg-card-hover">
                      <td className="p-3 font-medium">{e.numero}</td>
                      <td className="p-3">{e.proveedorNombre}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[e.estado] || ""}`}>
                          {ESTADO_LABELS[e.estado] || e.estado}
                        </span>
                      </td>
                      <td className="p-3 text-center">{e._count.items}</td>
                      <td className="p-3 text-right font-mono">{e.monedaFOB} ${Number(e.totalFOB).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">{e.fechaEstimadaArribo ? new Date(e.fechaEstimadaArribo).toLocaleDateString("es-AR") : "—"}</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/importaciones/${e.id}`}>Ver</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImportacionesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
      <ImportacionesContent />
    </Suspense>
  );
}
