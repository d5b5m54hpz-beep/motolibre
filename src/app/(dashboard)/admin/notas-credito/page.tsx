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
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { FileX, Plus } from "lucide-react";

interface NC {
  id: string;
  tipo: string;
  tipoComprobante: string;
  numeroCompleto: string;
  facturaNumero: string;
  receptorNombre: string;
  montoTotal: number;
  estado: string;
  motivo: string;
  fechaEmision: string;
}

interface Factura {
  id: string;
  numeroCompleto: string;
  receptorNombre: string;
  montoTotal: number;
  tipo: string;
  estado: string;
}

export default function NotasCreditoPage() {
  const [ncs, setNcs] = useState<NC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

  const [form, setForm] = useState({
    facturaId: "",
    tipo: "ANULACION" as string,
    montoTotal: "",
    motivo: "",
  });

  const fetchNCs = useCallback(async () => {
    const res = await fetch("/api/notas-credito");
    if (res.ok) {
      const json = await res.json();
      setNcs(json.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchNCs(); }, [fetchNCs]);

  async function loadFacturas() {
    const res = await fetch("/api/facturas?limit=100");
    if (res.ok) {
      const json = await res.json();
      setFacturas(json.data.filter((f: Factura) => f.estado !== "ANULADA"));
    }
  }

  function openDialog() {
    loadFacturas();
    setForm({ facturaId: "", tipo: "ANULACION", montoTotal: "", motivo: "" });
    setSelectedFactura(null);
    setDialogOpen(true);
  }

  function onFacturaChange(facturaId: string) {
    const f = facturas.find((fa) => fa.id === facturaId);
    setSelectedFactura(f || null);
    setForm({
      ...form,
      facturaId,
      montoTotal: f ? String(Number(f.montoTotal)) : "",
    });
  }

  async function crearNC() {
    const res = await fetch("/api/notas-credito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        montoTotal: Number(form.montoTotal),
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(typeof json.error === "string" ? json.error : "Error al crear NC");
      return;
    }
    toast.success("Nota de crédito creada");
    setDialogOpen(false);
    fetchNCs();
  }

  const tipoLabel: Record<string, string> = {
    ANULACION: "Anulación",
    DESCUENTO: "Descuento",
    DEVOLUCION: "Devolución",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas de Crédito"
        description="Anulación, descuento y devolución sobre facturas emitidas"
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5" /> Notas de Crédito
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openDialog}><Plus className="mr-1 h-4 w-4" /> Nueva NC</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Nota de Crédito</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Factura Original</Label>
                    <Select value={form.facturaId} onValueChange={onFacturaChange}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar factura..." /></SelectTrigger>
                      <SelectContent>
                        {facturas.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.numeroCompleto} — {f.receptorNombre} ({formatMoney(f.montoTotal)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => {
                      setForm({
                        ...form,
                        tipo: v,
                        montoTotal: v === "ANULACION" && selectedFactura
                          ? String(Number(selectedFactura.montoTotal))
                          : form.montoTotal,
                      });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANULACION">Anulación (total)</SelectItem>
                        <SelectItem value="DESCUENTO">Descuento (parcial)</SelectItem>
                        <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monto Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.montoTotal}
                      onChange={(e) => setForm({ ...form, montoTotal: e.target.value })}
                      disabled={form.tipo === "ANULACION"}
                    />
                  </div>
                  <div>
                    <Label>Motivo</Label>
                    <Textarea
                      value={form.motivo}
                      onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                      placeholder="Motivo de la nota de crédito"
                    />
                  </div>
                  <Button onClick={crearNC} className="w-full" disabled={!form.facturaId || !form.motivo}>
                    Crear Nota de Crédito
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-t-secondary">Cargando...</div>
          ) : ncs.length === 0 ? (
            <div className="text-center py-8 text-t-secondary">No hay notas de crédito</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Número</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Factura</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Receptor</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Monto</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Estado</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ncs.map((nc) => (
                    <tr key={nc.id} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{nc.numeroCompleto}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline">{tipoLabel[nc.tipo] || nc.tipo}</Badge>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">{nc.facturaNumero}</td>
                      <td className="py-3 px-2">{nc.receptorNombre}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(nc.montoTotal)}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className={
                          nc.estado === "GENERADA" ? "bg-positive-bg text-positive border-positive/20" :
                          nc.estado === "ANULADA" ? "bg-negative-bg text-negative border-negative/20" :
                          "bg-info-bg text-ds-info border-ds-info/20"
                        }>
                          {nc.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-xs">{new Date(nc.fechaEmision).toLocaleDateString("es-AR")}</td>
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
