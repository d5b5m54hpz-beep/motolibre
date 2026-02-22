"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Ship, Package, DollarSign, FileText, CheckCircle, ArrowLeft, Link2, Copy } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";

interface Item {
  id: string;
  descripcion: string;
  codigoProveedor: string | null;
  repuestoId: string | null;
  esMoto: boolean;
  cantidad: number;
  cantidadRecibida: number;
  precioFOBUnitario: string;
  subtotalFOB: string;
  costoNacionalizadoUnit: string | null;
  costoNacionalizadoTotal: string | null;
  posicionArancelaria: string | null;
  alicuotaDerechos: string | null;
}

interface Despacho {
  id: string;
  numeroDespacho: string | null;
  fechaDespacho: string;
  despachante: string | null;
  baseImponible: string;
  derechosImportacion: string;
  tasaEstadistica: string;
  ivaImportacion: string;
  ivaAdicional: string;
  ingresosBrutos: string;
  gastosVarios: string;
  totalDespacho: string;
  observaciones: string | null;
}

interface CostoAsignado {
  id: string;
  itemEmbarqueId: string;
  porcentajeFOB: string;
  costoAsignado: string;
}

interface Embarque {
  id: string;
  numero: string;
  estado: string;
  proveedorId: string;
  proveedorNombre: string;
  puertoOrigen: string | null;
  puertoDestino: string;
  naviera: string | null;
  numeroContenedor: string | null;
  numeroBL: string | null;
  tipoTransporte: string;
  monedaFOB: string;
  totalFOB: string;
  tipoCambio: string | null;
  costoFlete: string | null;
  costoSeguro: string | null;
  totalCIF: string | null;
  derechosImportacion: string | null;
  tasaEstadistica: string | null;
  ivaImportacion: string | null;
  ivaAdicional: string | null;
  ingresosBrutos: string | null;
  gastosDespacho: string | null;
  totalNacionalizado: string | null;
  fechaEmbarque: string | null;
  fechaEstimadaArribo: string | null;
  fechaArriboPuerto: string | null;
  fechaIngresoAduana: string | null;
  fechaDespacho: string | null;
  fechaRecepcion: string | null;
  observaciones: string | null;
  items: Item[];
  despachos: Despacho[];
  costosAsignados: CostoAsignado[];
}

const ESTADOS_FLOW = [
  "BORRADOR", "EN_TRANSITO", "EN_PUERTO", "EN_ADUANA",
  "DESPACHADO", "COSTOS_FINALIZADOS", "EN_RECEPCION", "ALMACENADO",
] as const;

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador", EN_TRANSITO: "En Tránsito", EN_PUERTO: "En Puerto",
  EN_ADUANA: "En Aduana", DESPACHADO_PARCIAL: "Desp. Parcial", DESPACHADO: "Despachado",
  COSTOS_FINALIZADOS: "Costos OK", EN_RECEPCION: "Recibiendo", ALMACENADO: "Almacenado",
  CANCELADO: "Cancelado",
};


function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

export default function EmbarqueDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [embarque, setEmbarque] = useState<Embarque | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  // Despacho form
  const [despachoOpen, setDespachoOpen] = useState(false);
  const [despachoForm, setDespachoForm] = useState({
    fechaDespacho: new Date().toISOString().slice(0, 10),
    tipoCambio: 0, costoFlete: 0, costoSeguro: 0,
    derechosImportacion: 0, tasaEstadistica: 0, ivaImportacion: 0,
    ivaAdicional: 0, ingresosBrutos: 0, gastosVarios: 0,
    numeroDespacho: "", despachante: "", observaciones: "",
  });

  // Recepcion
  const [recepcionOpen, setRecepcionOpen] = useState(false);
  const [recepcionItems, setRecepcionItems] = useState<Array<{ itemEmbarqueId: string; cantidadRecibida: number }>>([]);

  function fetchEmbarque() {
    setLoading(true);
    fetch(`/api/embarques/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setEmbarque(d);
        if (d.items) {
          setRecepcionItems(d.items.map((i: Item) => ({
            itemEmbarqueId: i.id,
            cantidadRecibida: 0,
          })));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchEmbarque(); }, [id]);

  async function changeState(nuevoEstado: string) {
    const res = await fetch(`/api/embarques/${id}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      toast.success(`Estado actualizado a ${ESTADO_LABELS[nuevoEstado]}`);
      fetchEmbarque();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
  }

  async function submitDespacho() {
    const res = await fetch(`/api/embarques/${id}/despacho`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(despachoForm),
    });
    if (res.ok) {
      toast.success("Despacho registrado");
      setDespachoOpen(false);
      fetchEmbarque();
    } else {
      const err = await res.json();
      toast.error(err.error?.formErrors?.[0] || "Error");
    }
  }

  async function confirmarCostos() {
    const res = await fetch(`/api/embarques/${id}/confirmar-costos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmar: true }),
    });
    if (res.ok) {
      toast.success("Costos confirmados y distribuidos");
      fetchEmbarque();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
  }

  async function submitRecepcion() {
    const itemsConRecepcion = recepcionItems.filter((i) => i.cantidadRecibida > 0);
    if (itemsConRecepcion.length === 0) {
      toast.error("Ingresa al menos una cantidad");
      return;
    }
    const res = await fetch(`/api/embarques/${id}/recepcion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemsConRecepcion }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.todosRecibidos ? "Recepción completa — Almacenado" : "Recepción parcial registrada");
      setRecepcionOpen(false);
      fetchEmbarque();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
  }

  async function generarLinkProveedor() {
    const res = await fetch(`/api/embarques/${id}/generar-link-proveedor`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setPortalUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copiado al portapapeles");
    }
  }

  if (loading || !embarque) {
    return <div className="p-8 text-muted-foreground">Cargando embarque...</div>;
  }

  const currentIdx = ESTADOS_FLOW.indexOf(embarque.estado as typeof ESTADOS_FLOW[number]);
  const isFinal = embarque.estado === "ALMACENADO" || embarque.estado === "CANCELADO";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/importaciones"><ArrowLeft className="mr-1 h-4 w-4" /> Volver</Link>
        </Button>
        <PageHeader title={embarque.numero} description={`${embarque.proveedorNombre} — ${ESTADO_LABELS[embarque.estado]}`} />
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-1">
            {ESTADOS_FLOW.map((estado, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={estado} className="flex-1 flex flex-col items-center">
                  <div className={`w-full h-2 rounded-full ${isCompleted ? "bg-accent-DEFAULT" : "bg-border"}`} />
                  <span className={`mt-1 text-[10px] text-center leading-tight ${isCurrent ? "font-bold text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    {ESTADO_LABELS[estado]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isFinal && (
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-2">
            {embarque.estado === "BORRADOR" && (
              <Button onClick={() => changeState("EN_TRANSITO")}>
                <Ship className="mr-2 h-4 w-4" /> Confirmar Embarque
              </Button>
            )}
            {embarque.estado === "EN_TRANSITO" && (
              <Button onClick={() => changeState("EN_PUERTO")}>Registrar Arribo</Button>
            )}
            {embarque.estado === "EN_PUERTO" && (
              <Button onClick={() => changeState("EN_ADUANA")}>Ingresa a Aduana</Button>
            )}
            {(embarque.estado === "EN_ADUANA" || embarque.estado === "DESPACHADO_PARCIAL") && (
              <Dialog open={despachoOpen} onOpenChange={setDespachoOpen}>
                <DialogTrigger asChild>
                  <Button><FileText className="mr-2 h-4 w-4" /> Registrar Despacho</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Despacho Aduanero</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Fecha Despacho *</Label><Input type="date" value={despachoForm.fechaDespacho} onChange={(e) => setDespachoForm({ ...despachoForm, fechaDespacho: e.target.value })} /></div>
                      <div><Label>Tipo Cambio (USD/ARS) *</Label><Input type="number" step={0.01} value={despachoForm.tipoCambio || ""} onChange={(e) => setDespachoForm({ ...despachoForm, tipoCambio: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>N° Despacho</Label><Input value={despachoForm.numeroDespacho} onChange={(e) => setDespachoForm({ ...despachoForm, numeroDespacho: e.target.value })} /></div>
                      <div><Label>Despachante</Label><Input value={despachoForm.despachante} onChange={(e) => setDespachoForm({ ...despachoForm, despachante: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Flete (USD)</Label><Input type="number" step={0.01} value={despachoForm.costoFlete || ""} onChange={(e) => setDespachoForm({ ...despachoForm, costoFlete: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label>Seguro (USD)</Label><Input type="number" step={0.01} value={despachoForm.costoSeguro || ""} onChange={(e) => setDespachoForm({ ...despachoForm, costoSeguro: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <hr />
                    <p className="text-sm font-medium text-muted-foreground">Impuestos (en ARS)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Derechos Importación *</Label><Input type="number" step={0.01} value={despachoForm.derechosImportacion || ""} onChange={(e) => setDespachoForm({ ...despachoForm, derechosImportacion: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label>Tasa Estadística *</Label><Input type="number" step={0.01} value={despachoForm.tasaEstadistica || ""} onChange={(e) => setDespachoForm({ ...despachoForm, tasaEstadistica: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>IVA Importación *</Label><Input type="number" step={0.01} value={despachoForm.ivaImportacion || ""} onChange={(e) => setDespachoForm({ ...despachoForm, ivaImportacion: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label>IVA Adicional *</Label><Input type="number" step={0.01} value={despachoForm.ivaAdicional || ""} onChange={(e) => setDespachoForm({ ...despachoForm, ivaAdicional: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Ingresos Brutos</Label><Input type="number" step={0.01} value={despachoForm.ingresosBrutos || ""} onChange={(e) => setDespachoForm({ ...despachoForm, ingresosBrutos: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label>Gastos Varios</Label><Input type="number" step={0.01} value={despachoForm.gastosVarios || ""} onChange={(e) => setDespachoForm({ ...despachoForm, gastosVarios: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <Button onClick={submitDespacho} className="w-full">Registrar Despacho</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {embarque.estado === "DESPACHADO" && (
              <Button onClick={confirmarCostos}>
                <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Costos
              </Button>
            )}
            {embarque.estado === "COSTOS_FINALIZADOS" && (
              <Button onClick={() => changeState("EN_RECEPCION")}>Iniciar Recepción</Button>
            )}
            {embarque.estado === "EN_RECEPCION" && (
              <Dialog open={recepcionOpen} onOpenChange={setRecepcionOpen}>
                <DialogTrigger asChild>
                  <Button><Package className="mr-2 h-4 w-4" /> Registrar Recepción</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Recepción de Mercadería</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-right pb-2">Esperado</th>
                          <th className="text-right pb-2">Ya Recibido</th>
                          <th className="text-right pb-2">Recibir Ahora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {embarque.items.map((item, idx) => {
                          const pendiente = item.cantidad - item.cantidadRecibida;
                          return (
                            <tr key={item.id} className="border-b">
                              <td className="py-2">{item.descripcion}</td>
                              <td className="py-2 text-right">{item.cantidad}</td>
                              <td className="py-2 text-right">{item.cantidadRecibida}</td>
                              <td className="py-2 text-right w-24">
                                <Input
                                  type="number"
                                  min={0}
                                  max={pendiente}
                                  value={recepcionItems[idx]?.cantidadRecibida || 0}
                                  onChange={(e) => {
                                    const updated = [...recepcionItems];
                                    updated[idx] = { itemEmbarqueId: item.id, cantidadRecibida: parseInt(e.target.value) || 0 };
                                    setRecepcionItems(updated);
                                  }}
                                  className="h-8 text-sm text-right"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Button onClick={submitRecepcion} className="w-full">Confirmar Recepción</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={generarLinkProveedor}>
              <Link2 className="mr-2 h-4 w-4" /> Generar Link Proveedor
            </Button>
            {portalUrl && (
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success("Copiado"); }}>
                <Copy className="mr-1 h-3 w-3" /> {portalUrl.split("/").pop()?.slice(0, 12)}...
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Transporte</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{embarque.tipoTransporte === "MARITIMO" ? "Marítimo" : "Aéreo"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Puerto Origen</span><span>{embarque.puertoOrigen || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Puerto Destino</span><span>{embarque.puertoDestino}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Naviera</span><span>{embarque.naviera || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contenedor</span><span>{embarque.numeroContenedor || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">B/L</span><span>{embarque.numeroBL || "—"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Fechas</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Embarque</span><span>{fmtDate(embarque.fechaEmbarque)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span>{fmtDate(embarque.fechaEstimadaArribo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Arribo Puerto</span><span>{fmtDate(embarque.fechaArriboPuerto)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ingreso Aduana</span><span>{fmtDate(embarque.fechaIngresoAduana)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Despacho</span><span>{fmtDate(embarque.fechaDespacho)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recepción</span><span>{fmtDate(embarque.fechaRecepcion)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Items ({embarque.items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-bg-input">
                  <th className="text-left p-3">Descripción</th>
                  <th className="text-left p-3">Código</th>
                  <th className="text-center p-3">Cant.</th>
                  <th className="text-center p-3">Recib.</th>
                  <th className="text-right p-3">FOB Unit</th>
                  <th className="text-right p-3">FOB Subtotal</th>
                  {embarque.costosAsignados.length > 0 && (
                    <>
                      <th className="text-right p-3">Nac. Unit</th>
                      <th className="text-right p-3">Nac. Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {embarque.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">
                      {item.descripcion}
                      {item.esMoto && <span className="ml-1 text-xs bg-info-bg text-ds-info px-1 rounded">Moto</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{item.codigoProveedor || "—"}</td>
                    <td className="p-3 text-center">{item.cantidad}</td>
                    <td className="p-3 text-center">
                      <span className={item.cantidadRecibida >= item.cantidad ? "text-positive font-medium" : ""}>
                        {item.cantidadRecibida}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">USD {Number(item.precioFOBUnitario).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono">USD {Number(item.subtotalFOB).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    {embarque.costosAsignados.length > 0 && (
                      <>
                        <td className="p-3 text-right font-mono">{item.costoNacionalizadoUnit ? formatMoney(Number(item.costoNacionalizadoUnit)) : "—"}</td>
                        <td className="p-3 text-right font-mono">{item.costoNacionalizadoTotal ? formatMoney(Number(item.costoNacionalizadoTotal)) : "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-bg-input font-medium">
                  <td colSpan={5} className="p-3 text-right">Total FOB:</td>
                  <td className="p-3 text-right font-mono">USD {Number(embarque.totalFOB).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  {embarque.costosAsignados.length > 0 && (
                    <>
                      <td className="p-3" />
                      <td className="p-3 text-right font-mono">{embarque.totalNacionalizado ? formatMoney(Number(embarque.totalNacionalizado)) : "—"}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Costos (visible after despacho) */}
      {Number(embarque.tipoCambio || 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Desglose de Costos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-w-md">
              <div className="flex justify-between"><span>FOB Total (USD)</span><span className="font-mono">USD {Number(embarque.totalFOB).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Tipo Cambio</span><span className="font-mono">${Number(embarque.tipoCambio).toLocaleString("es-AR", { minimumFractionDigits: 4 })}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>+ Flete (USD)</span><span className="font-mono">{Number(embarque.costoFlete || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>+ Seguro (USD)</span><span className="font-mono">{Number(embarque.costoSeguro || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
              <hr />
              <div className="flex justify-between font-medium"><span>CIF Total (ARS)</span><span className="font-mono">{formatMoney(Number(embarque.totalCIF || 0) * Number(embarque.tipoCambio || 0))}</span></div>
              <div className="flex justify-between"><span>+ Derechos Importación</span><span className="font-mono">{formatMoney(Number(embarque.derechosImportacion || 0))}</span></div>
              <div className="flex justify-between"><span>+ Tasa Estadística</span><span className="font-mono">{formatMoney(Number(embarque.tasaEstadistica || 0))}</span></div>
              <div className="flex justify-between"><span>+ IVA Importación</span><span className="font-mono">{formatMoney(Number(embarque.ivaImportacion || 0))}</span></div>
              <div className="flex justify-between"><span>+ IVA Adicional</span><span className="font-mono">{formatMoney(Number(embarque.ivaAdicional || 0))}</span></div>
              <div className="flex justify-between"><span>+ Ingresos Brutos</span><span className="font-mono">{formatMoney(Number(embarque.ingresosBrutos || 0))}</span></div>
              <div className="flex justify-between"><span>+ Gastos Despacho</span><span className="font-mono">{formatMoney(Number(embarque.gastosDespacho || 0))}</span></div>
              <hr />
              <div className="flex justify-between font-bold text-lg"><span>TOTAL NACIONALIZADO</span><span className="font-mono text-positive">{formatMoney(Number(embarque.totalNacionalizado || 0))}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Distribution */}
      {embarque.costosAsignados.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribución de Costos por Item</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-bg-input">
                  <th className="text-left p-3">Item</th>
                  <th className="text-right p-3">% FOB</th>
                  <th className="text-right p-3">Costo Asignado</th>
                </tr>
              </thead>
              <tbody>
                {embarque.costosAsignados.map((ca) => {
                  const item = embarque.items.find((i) => i.id === ca.itemEmbarqueId);
                  return (
                    <tr key={ca.id} className="border-b">
                      <td className="p-3">{item?.descripcion || ca.itemEmbarqueId}</td>
                      <td className="p-3 text-right font-mono">{(Number(ca.porcentajeFOB) * 100).toFixed(2)}%</td>
                      <td className="p-3 text-right font-mono">{formatMoney(Number(ca.costoAsignado))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Despachos History */}
      {embarque.despachos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Historial de Despachos ({embarque.despachos.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-bg-input">
                  <th className="text-left p-3">N° Despacho</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Despachante</th>
                  <th className="text-right p-3">Base Imponible</th>
                  <th className="text-right p-3">Total Despacho</th>
                </tr>
              </thead>
              <tbody>
                {embarque.despachos.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-3">{d.numeroDespacho || "—"}</td>
                    <td className="p-3">{fmtDate(d.fechaDespacho)}</td>
                    <td className="p-3">{d.despachante || "—"}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(Number(d.baseImponible))}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(Number(d.totalDespacho))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
