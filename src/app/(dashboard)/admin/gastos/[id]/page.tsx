"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { ArrowLeft, Check, X, Save, Clock, Loader2 } from "lucide-react";

const CATEGORIAS = [
  "COMBUSTIBLE", "SEGUROS", "MANTENIMIENTO", "REPUESTOS",
  "ADMINISTRATIVO", "ALQUILER_LOCAL", "SERVICIOS", "IMPUESTOS",
  "BANCARIOS", "PUBLICIDAD", "SUELDOS", "LEGAL", "OTROS",
] as const;

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

const MEDIOS_PAGO = [
  { value: "CAJA", label: "Caja" },
  { value: "MP", label: "MercadoPago" },
  { value: "BANCO_BIND", label: "Banco BIND" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

const MEDIO_PAGO_LABELS: Record<string, string> = Object.fromEntries(
  MEDIOS_PAGO.map((m) => [m.value, m.label])
);

interface Gasto {
  id: string;
  fecha: string;
  monto: number;
  categoria: string;
  descripcion: string;
  comprobante: string | null;
  estado: string;
  medioPago: string;
  responsableId: string | null;
  aprobadoPor: string | null;
  aprobadoAt: string | null;
  asientoId: string | null;
  motoId: string | null;
  contratoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GastoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "",
    medioPago: "",
  });

  const fetchGasto = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gastos/${id}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data as Gasto;
        setGasto(data);
        setForm({
          descripcion: data.descripcion,
          monto: String(Number(data.monto)),
          categoria: data.categoria,
          medioPago: data.medioPago,
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar gasto");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchGasto();
  }, [fetchGasto]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/gastos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: form.descripcion,
          monto: Number(form.monto),
          categoria: form.categoria,
          medioPago: form.medioPago,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al guardar");
      }
      toast.success("Gasto actualizado");
      void fetchGasto();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleAprobar(aprobado: boolean) {
    setApproving(true);
    try {
      const res = await fetch(`/api/gastos/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprobado }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al procesar");
      }
      toast.success(aprobado ? "Gasto aprobado" : "Gasto rechazado");
      void fetchGasto();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gasto" description="Cargando..." />
        <div className="flex items-center justify-center py-12 text-t-secondary">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Cargando...
        </div>
      </div>
    );
  }

  if (!gasto) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gasto" description="No encontrado" />
        <div className="text-center py-12 text-t-secondary">
          Gasto no encontrado
        </div>
      </div>
    );
  }

  const isPendiente = gasto.estado === "PENDIENTE";

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/gastos">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <PageHeader title={`Gasto #${id.slice(0, 8)}`} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Detail Card (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle del Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              {isPendiente ? (
                <div className="space-y-4">
                  <div>
                    <Label>Descripción</Label>
                    <Input
                      value={form.descripcion}
                      onChange={(e) =>
                        setForm({ ...form, descripcion: e.target.value })
                      }
                      placeholder="Detalle del gasto"
                    />
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.monto}
                      onChange={(e) =>
                        setForm({ ...form, monto: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(v) =>
                        setForm({ ...form, categoria: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORIA_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Medio de Pago</Label>
                    <Select
                      value={form.medioPago}
                      onValueChange={(v) =>
                        setForm({ ...form, medioPago: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIOS_PAGO.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-t-secondary">Descripción</span>
                    <span className="font-medium text-t-primary text-right max-w-[60%]">
                      {gasto.descripcion}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-t-secondary">Monto</span>
                    <span className="font-mono font-medium text-t-primary">
                      {formatMoney(gasto.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-t-secondary">Categoría</span>
                    <Badge variant="outline">
                      {CATEGORIA_LABELS[gasto.categoria] || gasto.categoria}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-t-secondary">Medio de Pago</span>
                    <span className="font-medium text-t-primary">
                      {MEDIO_PAGO_LABELS[gasto.medioPago] || gasto.medioPago}
                    </span>
                  </div>
                  {gasto.comprobante && (
                    <div className="flex justify-between">
                      <span className="text-t-secondary">Comprobante</span>
                      <a
                        href={gasto.comprobante}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-DEFAULT hover:underline"
                      >
                        Ver comprobante
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Status + References (col-span-1) */}
        <div className="space-y-6">
          {/* Estado Card */}
          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Large status badge */}
              <div className="flex justify-center">
                {gasto.estado === "PENDIENTE" && (
                  <Badge
                    variant="outline"
                    className="bg-warning-bg text-warning border-warning/20 text-base px-4 py-2"
                  >
                    <Clock className="mr-2 h-4 w-4" /> Pendiente
                  </Badge>
                )}
                {gasto.estado === "APROBADO" && (
                  <Badge
                    variant="outline"
                    className="bg-positive-bg text-positive border-positive/20 text-base px-4 py-2"
                  >
                    <Check className="mr-2 h-4 w-4" /> Aprobado
                  </Badge>
                )}
                {gasto.estado === "RECHAZADO" && (
                  <Badge
                    variant="outline"
                    className="bg-negative-bg text-negative border-negative/20 text-base px-4 py-2"
                  >
                    <X className="mr-2 h-4 w-4" /> Rechazado
                  </Badge>
                )}
                {gasto.estado === "ANULADO" && (
                  <Badge
                    variant="outline"
                    className="bg-bg-input text-t-tertiary border-border text-base px-4 py-2"
                  >
                    Anulado
                  </Badge>
                )}
              </div>

              {/* Info rows */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-t-secondary">Fecha</span>
                  <span className="text-t-primary">
                    {formatDateTime(gasto.fecha)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t-secondary">Monto</span>
                  <span className="font-mono font-medium text-t-primary">
                    {formatMoney(gasto.monto)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t-secondary">Categoría</span>
                  <span className="text-t-primary">
                    {CATEGORIA_LABELS[gasto.categoria] || gasto.categoria}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t-secondary">Medio de Pago</span>
                  <span className="text-t-primary">
                    {MEDIO_PAGO_LABELS[gasto.medioPago] || gasto.medioPago}
                  </span>
                </div>
              </div>

              {/* Aprobado por info */}
              {gasto.aprobadoPor && (
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-t-secondary">Aprobado por</span>
                    <span className="font-mono text-xs text-t-primary">
                      {gasto.aprobadoPor.slice(0, 8)}...
                    </span>
                  </div>
                  {gasto.aprobadoAt && (
                    <div className="flex justify-between">
                      <span className="text-t-secondary">Fecha aprobación</span>
                      <span className="text-t-primary">
                        {formatDateTime(gasto.aprobadoAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Aprobar / Rechazar buttons */}
              {isPendiente && (
                <div className="border-t border-border pt-4 flex gap-3">
                  <Button
                    className="flex-1 bg-positive hover:bg-positive/80"
                    onClick={() => handleAprobar(true)}
                    disabled={approving}
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAprobar(false)}
                    disabled={approving}
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Rechazar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referencias Card */}
          <Card>
            <CardHeader>
              <CardTitle>Referencias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {gasto.motoId && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Moto</span>
                  <Link
                    href={`/admin/motos/${gasto.motoId}`}
                    className="text-accent-DEFAULT hover:underline font-mono text-xs"
                  >
                    {gasto.motoId.slice(0, 8)}...
                  </Link>
                </div>
              )}
              {gasto.contratoId && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Contrato</span>
                  <Link
                    href={`/admin/contratos/${gasto.contratoId}`}
                    className="text-accent-DEFAULT hover:underline font-mono text-xs"
                  >
                    {gasto.contratoId.slice(0, 8)}...
                  </Link>
                </div>
              )}
              {gasto.asientoId && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Asiento contable</span>
                  <Link
                    href={`/admin/asientos/${gasto.asientoId}`}
                    className="text-accent-DEFAULT hover:underline font-mono text-xs"
                  >
                    {gasto.asientoId.slice(0, 8)}...
                  </Link>
                </div>
              )}
              {gasto.responsableId && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Responsable</span>
                  <span className="font-mono text-xs text-t-primary">
                    {gasto.responsableId.slice(0, 8)}...
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-t-secondary">Creado</span>
                  <span className="text-t-primary">
                    {formatDateTime(gasto.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t-secondary">Actualizado</span>
                  <span className="text-t-primary">
                    {formatDateTime(gasto.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
