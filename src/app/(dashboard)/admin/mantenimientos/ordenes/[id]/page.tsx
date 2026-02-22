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
import { formatMoney, formatDateTime } from "@/lib/format";
import {
  Wrench,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Tarea {
  id: string;
  categoria: string;
  descripcion: string;
  resultado: string;
  observaciones: string | null;
  orden: number;
}

interface Repuesto {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Foto {
  id: string;
  url: string;
  tipo: string;
  descripcion: string | null;
  createdAt: string;
}

interface Historial {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  descripcion: string | null;
  userId: string | null;
  createdAt: string;
}

interface OTDetalle {
  id: string;
  numero: string;
  tipo: string;
  prioridad: string;
  tipoService: string | null;
  estado: string;
  motoId: string;
  kmIngreso: number | null;
  kmEgreso: number | null;
  contratoId: string | null;
  clienteId: string | null;
  fechaSolicitud: string;
  fechaAprobacion: string | null;
  fechaProgramada: string | null;
  fechaInicioReal: string | null;
  fechaFinReal: string | null;
  fechaCheckIn: string | null;
  fechaCheckOut: string | null;
  tallerNombre: string | null;
  mecanicoNombre: string | null;
  tallerId: string | null;
  mecanicoId: string | null;
  descripcion: string;
  diagnostico: string | null;
  observaciones: string | null;
  motivoCancelacion: string | null;
  costoManoObra: number | null;
  costoRepuestos: number | null;
  costoTotal: number | null;
  mantenimientoProgramadoId: string | null;
  tareas: Tarea[];
  repuestos: Repuesto[];
  fotos: Foto[];
  historial: Historial[];
}

const ESTADO_COLORS: Record<string, string> = {
  SOLICITADA: "bg-t-secondary/10 text-t-secondary border-border",
  APROBADA: "bg-info-bg text-ds-info border-ds-info/20",
  PROGRAMADA: "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20",
  EN_ESPERA_REPUESTOS: "bg-warning-bg text-warning border-warning/20",
  EN_EJECUCION: "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20",
  EN_REVISION: "bg-info-bg text-ds-info border-ds-info/20",
  COMPLETADA: "bg-positive-bg text-positive border-positive/20",
  CANCELADA: "bg-negative-bg text-negative border-negative/20",
};

const RESULTADO_ICONS: Record<string, string> = {
  OK: "✅",
  REQUIERE_ATENCION: "⚠️",
  REEMPLAZADO: "🔄",
  NO_APLICA: "➖",
  PENDIENTE: "⏳",
};

const CATEGORIAS = [
  "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "CARROCERIA",
  "NEUMATICOS", "TRANSMISION", "LUBRICACION", "INSPECCION", "OTRO",
];

const RESULTADOS = ["PENDIENTE", "OK", "REQUIERE_ATENCION", "REEMPLAZADO", "NO_APLICA"];

export default function OTDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [ot, setOT] = useState<OTDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [tareaDialog, setTareaDialog] = useState(false);
  const [repuestoDialog, setRepuestoDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<string | null>(null);

  // Forms
  const [nuevaTarea, setNuevaTarea] = useState({ categoria: "OTRO", descripcion: "" });
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: "", cantidad: 1, precioUnitario: 0 });
  const [actionForm, setActionForm] = useState<Record<string, string | number>>({});

  // Talleres/Mecánicos for selects
  const [talleres, setTalleres] = useState<Array<{ id: string; nombre: string; tipo: string; mecanicos: Array<{ id: string; nombre: string; apellido: string }> }>>([]);
  const [mecanicosFiltrados, setMecanicosFiltrados] = useState<Array<{ id: string; nombre: string; apellido: string }>>([]);

  const fetchOT = useCallback(async () => {
    const res = await fetch(`/api/mantenimientos/ordenes/${id}`);
    if (res.ok) {
      const j = await res.json();
      setOT(j.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchOT();
  }, [fetchOT]);

  useEffect(() => {
    void fetch("/api/talleres").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setTalleres(j.data);
      }
    });
  }, []);

  async function cambiarEstado(nuevoEstado: string, extras?: Record<string, unknown>) {
    const res = await fetch(`/api/mantenimientos/ordenes/${id}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado, ...extras }),
    });
    if (res.ok) {
      setActionDialog(null);
      setActionForm({});
      void fetchOT();
    }
  }

  async function agregarTarea() {
    if (!nuevaTarea.descripcion) return;
    const res = await fetch(`/api/mantenimientos/ordenes/${id}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaTarea),
    });
    if (res.ok) {
      setTareaDialog(false);
      setNuevaTarea({ categoria: "OTRO", descripcion: "" });
      void fetchOT();
    }
  }

  async function actualizarTarea(tareaId: string, resultado: string, observaciones?: string) {
    await fetch(`/api/mantenimientos/ordenes/${id}/tareas/${tareaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultado, observaciones }),
    });
    void fetchOT();
  }

  async function agregarRepuesto() {
    if (!nuevoRepuesto.nombre) return;
    const res = await fetch(`/api/mantenimientos/ordenes/${id}/repuestos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoRepuesto),
    });
    if (res.ok) {
      setRepuestoDialog(false);
      setNuevoRepuesto({ nombre: "", cantidad: 1, precioUnitario: 0 });
      void fetchOT();
    }
  }

  async function eliminarRepuesto(repuestoId: string) {
    await fetch(`/api/mantenimientos/ordenes/${id}/repuestos/${repuestoId}`, {
      method: "DELETE",
    });
    void fetchOT();
  }

  async function guardarCampo(campo: string, valor: unknown) {
    await fetch(`/api/mantenimientos/ordenes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    void fetchOT();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Orden de Trabajo" description="Cargando..." />
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!ot) {
    return (
      <div className="space-y-6">
        <PageHeader title="OT no encontrada" description="" />
      </div>
    );
  }

  const isEditable = !["COMPLETADA", "CANCELADA"].includes(ot.estado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/mantenimientos/ordenes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title={`${ot.numero}`}
            description={ot.descripcion}
          />
        </div>
        <Badge className={`text-sm px-3 py-1 ${ESTADO_COLORS[ot.estado] ?? ""}`}>
          {ot.estado.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Action Bar */}
      {isEditable && (
        <Card>
          <CardContent className="py-3 flex gap-2 flex-wrap">
            {ot.estado === "SOLICITADA" && (
              <>
                <Button size="sm" onClick={() => cambiarEstado("APROBADA")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setActionDialog("CANCELADA")}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Rechazar
                </Button>
              </>
            )}
            {ot.estado === "APROBADA" && (
              <Button size="sm" onClick={() => setActionDialog("PROGRAMADA")}>
                <Clock className="h-4 w-4 mr-1" /> Programar
              </Button>
            )}
            {ot.estado === "PROGRAMADA" && (
              <>
                <Button size="sm" onClick={() => setActionDialog("EN_EJECUCION")}>
                  <Wrench className="h-4 w-4 mr-1" /> Iniciar (Check-in)
                </Button>
                <Button size="sm" variant="outline" onClick={() => cambiarEstado("EN_ESPERA_REPUESTOS")}>
                  Espera Repuestos
                </Button>
              </>
            )}
            {ot.estado === "EN_ESPERA_REPUESTOS" && (
              <Button size="sm" onClick={() => cambiarEstado("PROGRAMADA")}>
                Repuestos Disponibles
              </Button>
            )}
            {ot.estado === "EN_EJECUCION" && (
              <Button size="sm" onClick={() => cambiarEstado("EN_REVISION")}>
                Enviar a Revisión
              </Button>
            )}
            {ot.estado === "EN_REVISION" && (
              <>
                <Button size="sm" onClick={() => setActionDialog("COMPLETADA")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Completar
                </Button>
                <Button size="sm" variant="outline" onClick={() => cambiarEstado("EN_EJECUCION")}>
                  Devolver a Ejecución
                </Button>
              </>
            )}
            {ot.estado !== "CANCELADA" && ot.estado !== "COMPLETADA" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-negative ml-auto"
                onClick={() => setActionDialog("CANCELADA")}
              >
                Cancelar OT
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setActionForm({}); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "PROGRAMADA" && "Programar OT"}
              {actionDialog === "EN_EJECUCION" && "Check-in de Moto"}
              {actionDialog === "COMPLETADA" && "Completar OT"}
              {actionDialog === "CANCELADA" && "Cancelar OT"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog === "PROGRAMADA" && (
              <>
                <div>
                  <Label>Fecha Programada</Label>
                  <Input
                    type="date"
                    onChange={(e) => setActionForm({ ...actionForm, fechaProgramada: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taller</Label>
                  <Select
                    onValueChange={(v) => {
                      setActionForm({ ...actionForm, tallerId: v });
                      const t = talleres.find((x) => x.id === v);
                      setMecanicosFiltrados(t?.mecanicos ?? []);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar taller" /></SelectTrigger>
                    <SelectContent>
                      {talleres.filter((t) => t.tipo !== undefined).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mecánico</Label>
                  <Select
                    onValueChange={(v) => setActionForm({ ...actionForm, mecanicoId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar mecánico" /></SelectTrigger>
                    <SelectContent>
                      {mecanicosFiltrados.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre} {m.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {actionDialog === "EN_EJECUCION" && (
              <div>
                <Label>Km de Ingreso *</Label>
                <Input
                  type="number"
                  placeholder="Km actuales"
                  onChange={(e) => setActionForm({ ...actionForm, kmIngreso: Number(e.target.value) })}
                />
              </div>
            )}
            {actionDialog === "COMPLETADA" && (
              <>
                <div>
                  <Label>Km de Egreso</Label>
                  <Input
                    type="number"
                    placeholder="Km al retirar"
                    onChange={(e) => setActionForm({ ...actionForm, kmEgreso: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Costo Mano de Obra</Label>
                  <Input
                    type="number"
                    defaultValue={Number(ot.costoManoObra ?? 0)}
                    onChange={(e) => setActionForm({ ...actionForm, costoManoObra: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Observaciones</Label>
                  <Textarea
                    onChange={(e) => setActionForm({ ...actionForm, observaciones: e.target.value })}
                  />
                </div>
              </>
            )}
            {actionDialog === "CANCELADA" && (
              <div>
                <Label>Motivo de Cancelación *</Label>
                <Textarea
                  placeholder="Motivo por el que se cancela la OT..."
                  onChange={(e) => setActionForm({ ...actionForm, motivoCancelacion: e.target.value })}
                />
              </div>
            )}
            <Button
              className="w-full"
              variant={actionDialog === "CANCELADA" ? "destructive" : "default"}
              onClick={() => cambiarEstado(actionDialog!, actionForm)}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info General */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{ot.tipo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prioridad</p>
                <p className="font-medium">{ot.prioridad}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo Service</p>
                <p className="font-medium">{ot.tipoService ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Moto ID</p>
                <p className="font-mono text-xs">{ot.motoId.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taller</p>
                <p className="font-medium">
                  {ot.tallerId ? (
                    <Link href={`/admin/talleres`} className="text-ds-info hover:underline">
                      {ot.tallerNombre ?? "Ver taller"}
                    </Link>
                  ) : (
                    ot.tallerNombre ?? "-"
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Mecánico</p>
                <p className="font-medium">
                  {ot.mecanicoId ? (
                    <span className="text-ds-info">{ot.mecanicoNombre ?? "Asignado"}</span>
                  ) : (
                    ot.mecanicoNombre ?? "-"
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Km Ingreso</p>
                <p className="font-mono">{ot.kmIngreso ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Km Egreso</p>
                <p className="font-mono">{ot.kmEgreso ?? "-"}</p>
              </div>
            </div>
            {ot.diagnostico && (
              <div className="mt-4 p-3 bg-bg-input rounded-2xl">
                <p className="text-xs text-t-secondary mb-1">Diagnóstico</p>
                <p className="text-sm">{ot.diagnostico}</p>
              </div>
            )}
            {ot.observaciones && (
              <div className="mt-2 p-3 bg-bg-input rounded-2xl">
                <p className="text-xs text-t-secondary mb-1">Observaciones</p>
                <p className="text-sm">{ot.observaciones}</p>
              </div>
            )}
            {ot.motivoCancelacion && (
              <div className="mt-2 p-3 bg-negative-bg rounded-2xl">
                <p className="text-xs text-negative mb-1">Motivo de Cancelación</p>
                <p className="text-sm">{ot.motivoCancelacion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <FechaRow label="Solicitud" fecha={ot.fechaSolicitud} />
            <FechaRow label="Aprobación" fecha={ot.fechaAprobacion} />
            <FechaRow label="Programada" fecha={ot.fechaProgramada} />
            <FechaRow label="Check-in" fecha={ot.fechaCheckIn} />
            <FechaRow label="Inicio Real" fecha={ot.fechaInicioReal} />
            <FechaRow label="Fin Real" fecha={ot.fechaFinReal} />
            <FechaRow label="Check-out" fecha={ot.fechaCheckOut} />
          </CardContent>
        </Card>
      </div>

      {/* Tareas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Tareas ({ot.tareas.length})</CardTitle>
          {isEditable && (
            <Dialog open={tareaDialog} onOpenChange={setTareaDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Tarea</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select
                      value={nuevaTarea.categoria}
                      onValueChange={(v) => setNuevaTarea({ ...nuevaTarea, categoria: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input
                      value={nuevaTarea.descripcion}
                      onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                    />
                  </div>
                  <Button onClick={agregarTarea} className="w-full">Agregar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {ot.tareas.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin tareas</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Resultado</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {ot.tareas.map((t, i) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">{t.categoria}</Badge>
                    </td>
                    <td className="py-2 px-2">{t.descripcion}</td>
                    <td className="py-2 px-2 text-center">
                      {isEditable ? (
                        <Select
                          value={t.resultado}
                          onValueChange={(v) => actualizarTarea(t.id, v)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESULTADOS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {RESULTADO_ICONS[r]} {r.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{RESULTADO_ICONS[t.resultado]} {t.resultado.replace(/_/g, " ")}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{t.observaciones ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Repuestos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Repuestos ({ot.repuestos.length})</CardTitle>
          {isEditable && (
            <Dialog open={repuestoDialog} onOpenChange={setRepuestoDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Repuesto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={nuevoRepuesto.nombre}
                      onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, nombre: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={nuevoRepuesto.cantidad}
                        onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, cantidad: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Precio Unitario</Label>
                      <Input
                        type="number"
                        value={nuevoRepuesto.precioUnitario}
                        onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, precioUnitario: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={agregarRepuesto} className="w-full">Agregar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {ot.repuestos.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin repuestos</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Cant.</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">P. Unit.</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Subtotal</th>
                    {isEditable && <th className="py-2 px-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {ot.repuestos.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-2">{r.nombre}</td>
                      <td className="py-2 px-2 text-center">{r.cantidad}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatMoney(Number(r.precioUnitario))}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatMoney(Number(r.subtotal))}</td>
                      {isEditable && (
                        <td className="py-2 px-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-negative h-7"
                            onClick={() => eliminarRepuesto(r.id)}
                          >
                            ✕
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-2 text-sm font-bold">
                Total: {formatMoney(Number(ot.costoRepuestos ?? 0))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Costos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm space-y-1 max-w-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano de Obra</span>
              <span>{formatMoney(Number(ot.costoManoObra ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repuestos</span>
              <span>{formatMoney(Number(ot.costoRepuestos ?? 0))}</span>
            </div>
            <div className="border-t border-muted-foreground/30 my-1" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatMoney(Number(ot.costoTotal ?? 0))}</span>
            </div>
          </div>
          {isEditable && (
            <div className="mt-4 flex items-center gap-2">
              <Label className="text-xs">Mano de Obra:</Label>
              <Input
                type="number"
                className="w-32 h-8"
                defaultValue={Number(ot.costoManoObra ?? 0)}
                onBlur={(e) => guardarCampo("costoManoObra", Number(e.target.value))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" /> Fotos ({ot.fotos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ot.fotos.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin fotos</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ot.fotos.map((f) => (
                <div key={f.id} className="border border-border rounded-2xl overflow-hidden">
                  <img src={f.url} alt={f.descripcion || f.tipo} className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <Badge variant="outline" className="text-xs">{f.tipo}</Badge>
                    {f.descripcion && <p className="text-xs text-muted-foreground mt-1">{f.descripcion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {ot.historial.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin historial</p>
          ) : (
            <div className="space-y-3">
              {ot.historial.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${ESTADO_COLORS[h.estadoAnterior] ?? ""}`}>
                        {h.estadoAnterior.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className={`text-xs ${ESTADO_COLORS[h.estadoNuevo] ?? ""}`}>
                        {h.estadoNuevo.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {h.descripcion && <p className="text-muted-foreground text-xs mt-1">{h.descripcion}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(new Date(h.createdAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FechaRow({ label, fecha }: { label: string; fecha: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">
        {fecha ? formatDateTime(new Date(fecha)) : "-"}
      </span>
    </div>
  );
}
