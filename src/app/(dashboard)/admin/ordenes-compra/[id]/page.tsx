"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Send, CheckCircle2, Package, XCircle, ArrowLeft, Truck,
} from "lucide-react";
import Link from "next/link";

interface Item {
  id: string;
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  cantidadRecibida: number;
  precioUnitario: number;
  subtotal: number;
}

interface OCDetalle {
  id: string;
  numero: string;
  estado: string;
  montoSubtotal: number;
  montoIva: number;
  montoTotal: number;
  moneda: string;
  fechaEmision: string;
  fechaEntregaEstimada: string | null;
  fechaRecepcion: string | null;
  observaciones: string | null;
  motivoCancelacion: string | null;
  proveedor: {
    id: string;
    nombre: string;
    tipoProveedor: string;
    cuit: string | null;
    email: string | null;
    telefono: string | null;
    contacto: string | null;
  };
  items: Item[];
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-500/10 text-gray-500",
  ENVIADA: "bg-blue-500/10 text-blue-500",
  CONFIRMADA: "bg-purple-500/10 text-purple-500",
  RECIBIDA: "bg-emerald-500/10 text-emerald-500",
  CANCELADA: "bg-red-500/10 text-red-500",
};

export default function OCDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [oc, setOC] = useState<OCDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  // Reception dialog
  const [recepcionOpen, setRecepcionOpen] = useState(false);
  const [itemsRecibidos, setItemsRecibidos] = useState<Record<string, number>>({});

  const fetchOC = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ordenes-compra/${id}`);
    if (res.ok) {
      const j = await res.json();
      setOC(j.data);
      // Init reception quantities
      const init: Record<string, number> = {};
      for (const item of j.data.items) {
        init[item.id] = item.cantidadRecibida;
      }
      setItemsRecibidos(init);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void fetchOC(); }, [fetchOC]);

  async function cambiarEstado(estado: string, extras?: Record<string, unknown>) {
    const res = await fetch(`/api/ordenes-compra/${id}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, ...extras }),
    });
    if (res.ok) {
      void fetchOC();
      setCancelOpen(false);
      setRecepcionOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Orden de Compra" description="Cargando..." />
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!oc) {
    return (
      <div className="space-y-6">
        <PageHeader title="Orden de Compra" description="No encontrada" />
        <p className="text-center py-12 text-muted-foreground">OC no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/ordenes-compra"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link>
        </Button>
        <PageHeader
          title={`OC ${oc.numero}`}
          description={`${oc.proveedor.nombre} — ${oc.moneda}`}
        />
        <Badge className={`ml-auto text-sm ${ESTADO_COLORS[oc.estado] ?? ""}`}>
          {oc.estado}
        </Badge>
      </div>

      {/* Action bar */}
      <Card>
        <CardContent className="pt-6 flex gap-3 flex-wrap">
          {oc.estado === "BORRADOR" && (
            <Button onClick={() => cambiarEstado("ENVIADA")}>
              <Send className="h-4 w-4 mr-2" /> Enviar al Proveedor
            </Button>
          )}
          {oc.estado === "ENVIADA" && (
            <Button onClick={() => cambiarEstado("CONFIRMADA")}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar
            </Button>
          )}
          {oc.estado === "CONFIRMADA" && (
            <Dialog open={recepcionOpen} onOpenChange={setRecepcionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Package className="h-4 w-4 mr-2" /> Registrar Recepción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Recepción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Ingrese la cantidad recibida para cada item:</p>
                  {oc.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.descripcion}</p>
                        <p className="text-xs text-muted-foreground">Pedido: {item.cantidad}</p>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min={0}
                          max={item.cantidad}
                          value={itemsRecibidos[item.id] ?? 0}
                          onChange={(e) => setItemsRecibidos({ ...itemsRecibidos, [item.id]: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => cambiarEstado("RECIBIDA", {
                      itemsRecibidos: Object.entries(itemsRecibidos).map(([itemId, cantidadRecibida]) => ({
                        itemId,
                        cantidadRecibida,
                      })),
                    })}
                    className="w-full"
                  >
                    Confirmar Recepción
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {!["RECIBIDA", "CANCELADA"].includes(oc.estado) && (
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar OC
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancelar Orden de Compra</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Motivo de cancelación *</Label>
                    <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo..." />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => cambiarEstado("CANCELADA", { motivoCancelacion: motivo })}
                    disabled={!motivo}
                    className="w-full"
                  >
                    Confirmar Cancelación
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4" /> Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>{oc.proveedor.nombre}</strong></p>
            <p className="text-muted-foreground">{oc.proveedor.tipoProveedor}</p>
            {oc.proveedor.cuit && <p>CUIT: {oc.proveedor.cuit}</p>}
            {oc.proveedor.contacto && <p>Contacto: {oc.proveedor.contacto}</p>}
            {oc.proveedor.email && <p>Email: {oc.proveedor.email}</p>}
            {oc.proveedor.telefono && <p>Tel: {oc.proveedor.telefono}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Datos de la OC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Fecha emisión: {formatDate(new Date(oc.fechaEmision))}</p>
            {oc.fechaEntregaEstimada && <p>Entrega estimada: {formatDate(new Date(oc.fechaEntregaEstimada))}</p>}
            {oc.fechaRecepcion && <p>Recepción: {formatDate(new Date(oc.fechaRecepcion))}</p>}
            {oc.observaciones && <p>Observaciones: {oc.observaciones}</p>}
            {oc.motivoCancelacion && <p className="text-red-500">Motivo cancelación: {oc.motivoCancelacion}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Items ({oc.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Código</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Cantidad</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Recibido</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Precio Unit.</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {oc.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">{item.descripcion}</td>
                    <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{item.codigo || "-"}</td>
                    <td className="py-3 px-2 text-center">{item.cantidad}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={item.cantidadRecibida >= item.cantidad ? "text-emerald-500" : item.cantidadRecibida > 0 ? "text-amber-500" : "text-muted-foreground"}>
                        {item.cantidadRecibida}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(item.precioUnitario))}</td>
                    <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(item.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t mt-4 pt-4 space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">{formatMoney(Number(oc.montoSubtotal))}</span></div>
            {Number(oc.montoIva) > 0 && (
              <div className="flex justify-between"><span>IVA 21%:</span><span className="font-mono">{formatMoney(Number(oc.montoIva))}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total ({oc.moneda}):</span>
              <span className="font-mono">{formatMoney(Number(oc.montoTotal))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
