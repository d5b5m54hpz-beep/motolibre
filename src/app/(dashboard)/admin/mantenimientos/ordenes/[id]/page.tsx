"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, formatDateTime } from "@/lib/format";
import {
  Wrench,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  ArrowLeft,
  Trash2,
  Search,
  DollarSign,
  Sparkles,
  Loader2,
  ThumbsDown,
  Building2,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useRepuestosSugeridosOT } from "@/hooks/use-repuestos-sugeridos-ot";
import type { RepuestoSugerido } from "@/hooks/use-repuestos-sugeridos";

interface Tarea {
  id: string;
  categoria: string;
  descripcion: string;
  resultado: string;
  observaciones: string | null;
  orden: number;
  itemServiceId: string | null;
  tiempoEstimado: number | null;
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

interface ItemCosto {
  id: string;
  tipo: "MANO_OBRA" | "REPUESTO" | "INSUMO";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  mecanicoId: string | null;
  tiempoMinutos: number | null;
  repuestoId: string | null;
  codigoOEM: string | null;
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
  motoMarca: string | null;
  motoModelo: string | null;
  tareas: Tarea[];
  repuestos: Repuesto[];
  items: ItemCosto[];
  fotos: Foto[];
  historial: Historial[];
}

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

  // Catalog search for tareas
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<Array<{
    id: string; nombre: string; categoria: string; accion: string; tiempoEstimado: number | null;
  }>>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<{
    id: string; nombre: string; categoria: string; tiempoEstimado: number | null;
  } | null>(null);
  const [manualTareaMode, setManualTareaMode] = useState(false);

  // Tarifa info for cost estimation
  const [tarifaInfo, setTarifaInfo] = useState<{ tarifaHora: number | null; fuente: string | null } | null>(null);

  // Forms
  const [nuevaTarea, setNuevaTarea] = useState({ categoria: "OTRO", descripcion: "" });
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: "", cantidad: 1, precioUnitario: 0 });
  const [actionForm, setActionForm] = useState<Record<string, string | number>>({});

  // Items de Costo
  const [itemDialog, setItemDialog] = useState(false);
  const [nuevoItem, setNuevoItem] = useState<{
    tipo: "MANO_OBRA" | "REPUESTO" | "INSUMO";
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    mecanicoId: string;
    tiempoMinutos: number;
    repuestoId: string;
    codigoOEM: string;
  }>({
    tipo: "MANO_OBRA",
    descripcion: "",
    cantidad: 1,
    precioUnitario: 0,
    mecanicoId: "",
    tiempoMinutos: 0,
    repuestoId: "",
    codigoOEM: "",
  });
  const [tarifaMecanico, setTarifaMecanico] = useState<number | null>(null);
  const [repuestoSearch, setRepuestoSearch] = useState("");
  const [repuestosResult, setRepuestosResult] = useState<Array<{ id: string; codigo: string; nombre: string; precioCompra: number | null; stock: number; unidad: string; categoria: string }>>([]);
  const [searchingRepuestos, setSearchingRepuestos] = useState(false);

  // Talleres/Mecánicos for selects
  const [talleres, setTalleres] = useState<Array<{ id: string; nombre: string; tipo: string; mecanicos: Array<{ id: string; nombre: string; apellido: string }> }>>([]);
  const [mecanicosFiltrados, setMecanicosFiltrados] = useState<Array<{ id: string; nombre: string; apellido: string }>>([]);
  const [todosMecanicos, setTodosMecanicos] = useState<Array<{ id: string; nombre: string; apellido: string; tallerId: string }>>([]);

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
        // Build flat list of all mechanics for item dialog
        const allMecs: Array<{ id: string; nombre: string; apellido: string; tallerId: string }> = [];
        for (const t of j.data) {
          for (const m of t.mecanicos) {
            allMecs.push({ ...m, tallerId: t.id });
          }
        }
        setTodosMecanicos(allMecs);
      }
    });
  }, []);

  // Fetch tarifa when mechanic is assigned
  useEffect(() => {
    if (!ot?.mecanicoId) { setTarifaInfo(null); return; }
    fetch(`/api/mecanicos/${ot.mecanicoId}/tarifa`)
      .then((r) => r.json())
      .then((j) => setTarifaInfo(j.data ?? null))
      .catch(() => setTarifaInfo(null));
  }, [ot?.mecanicoId]);

  // Repuesto suggestions based on tareas
  const sugerenciasParams = useMemo(() => ({
    tareas: ot?.tareas.map((t) => ({
      itemServiceId: t.itemServiceId,
      descripcion: t.descripcion,
      categoria: t.categoria,
    })) ?? [],
    existingRepuestoIds: [
      ...(ot?.items.filter((i) => i.tipo === "REPUESTO" && i.repuestoId).map((i) => i.repuestoId!) ?? []),
      ...(ot?.repuestos.filter((r) => r.id).map((r) => r.id) ?? []),
    ],
    existingRepuestoNames: [
      ...(ot?.items.filter((i) => i.tipo === "REPUESTO").map((i) => i.descripcion) ?? []),
      ...(ot?.repuestos.map((r) => r.nombre) ?? []),
    ],
    marcaMoto: ot?.motoMarca ?? undefined,
    modeloMoto: ot?.motoModelo ?? undefined,
  }), [ot]);

  const { sugerencias, loading: sugerenciasLoading, dismiss: dismissSugerencia } =
    useRepuestosSugeridosOT(sugerenciasParams);

  // Estimated labor cost from tareas
  const estimatedLaborMinutes = useMemo(
    () => ot?.tareas.reduce((sum, t) => sum + (t.tiempoEstimado ?? 0), 0) ?? 0,
    [ot?.tareas]
  );
  const estimatedLaborCost = useMemo(() => {
    if (!tarifaInfo?.tarifaHora || !estimatedLaborMinutes) return null;
    return Math.round((tarifaInfo.tarifaHora / 60) * estimatedLaborMinutes);
  }, [tarifaInfo, estimatedLaborMinutes]);

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

  async function buscarCatalogo(query: string) {
    setCatalogSearch(query);
    if (query.length < 2) { setCatalogResults([]); return; }
    setSearchingCatalog(true);
    try {
      const r = await fetch(`/api/items-service/search?q=${encodeURIComponent(query)}`);
      if (r.ok) { const j = await r.json(); setCatalogResults(j.data ?? []); }
    } finally { setSearchingCatalog(false); }
  }

  async function agregarTarea() {
    if (!nuevaTarea.descripcion) return;
    const res = await fetch(`/api/mantenimientos/ordenes/${id}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...nuevaTarea,
        itemServiceId: selectedCatalogItem?.id ?? null,
        tiempoEstimado: selectedCatalogItem?.tiempoEstimado ?? null,
      }),
    });
    if (res.ok) {
      setTareaDialog(false);
      setNuevaTarea({ categoria: "OTRO", descripcion: "" });
      setSelectedCatalogItem(null);
      setCatalogSearch("");
      setCatalogResults([]);
      setManualTareaMode(false);
      void fetchOT();
    }
  }

  async function acceptSugerencia(sug: RepuestoSugerido) {
    const res = await fetch(`/api/mantenimientos/ordenes/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "REPUESTO",
        descripcion: sug.repuestoNombre,
        cantidad: sug.cantidadDefault,
        precioUnitario: sug.repuestoPrecio ?? 0,
        repuestoId: sug.repuestoId,
        codigoOEM: sug.repuestoCodigo ?? undefined,
      }),
    });
    if (res.ok) {
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

  async function buscarRepuestos(query: string) {
    setRepuestoSearch(query);
    if (query.length < 2) {
      setRepuestosResult([]);
      return;
    }
    setSearchingRepuestos(true);
    try {
      const r = await fetch(`/api/repuestos/search?q=${encodeURIComponent(query)}`);
      if (r.ok) {
        const j = await r.json();
        setRepuestosResult(j.data ?? []);
      }
    } finally {
      setSearchingRepuestos(false);
    }
  }

  async function fetchTarifaMecanico(mecanicoId: string) {
    if (!mecanicoId) {
      setTarifaMecanico(null);
      return;
    }
    try {
      const r = await fetch(`/api/mecanicos/${mecanicoId}/tarifa`);
      if (r.ok) {
        const j = await r.json();
        setTarifaMecanico(j.data?.tarifaHora ?? null);
      }
    } catch {
      setTarifaMecanico(null);
    }
  }

  function calcularPrecioManoObra(tarifaHora: number | null, minutos: number): number {
    if (!tarifaHora || !minutos) return 0;
    return Math.round((tarifaHora / 60) * minutos);
  }

  async function agregarItem() {
    if (!nuevoItem.descripcion) return;

    let precioUnitario = nuevoItem.precioUnitario;
    if (nuevoItem.tipo === "MANO_OBRA" && tarifaMecanico && nuevoItem.tiempoMinutos) {
      precioUnitario = calcularPrecioManoObra(tarifaMecanico, nuevoItem.tiempoMinutos);
    }

    const payload: Record<string, unknown> = {
      tipo: nuevoItem.tipo,
      descripcion: nuevoItem.descripcion,
      cantidad: nuevoItem.cantidad,
      precioUnitario,
    };

    if (nuevoItem.tipo === "MANO_OBRA") {
      if (nuevoItem.mecanicoId) payload.mecanicoId = nuevoItem.mecanicoId;
      if (nuevoItem.tiempoMinutos) payload.tiempoMinutos = nuevoItem.tiempoMinutos;
    }
    if (nuevoItem.tipo === "REPUESTO") {
      if (nuevoItem.repuestoId) payload.repuestoId = nuevoItem.repuestoId;
      if (nuevoItem.codigoOEM) payload.codigoOEM = nuevoItem.codigoOEM;
    }

    const res = await fetch(`/api/mantenimientos/ordenes/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setItemDialog(false);
      setNuevoItem({
        tipo: "MANO_OBRA",
        descripcion: "",
        cantidad: 1,
        precioUnitario: 0,
        mecanicoId: "",
        tiempoMinutos: 0,
        repuestoId: "",
        codigoOEM: "",
      });
      setTarifaMecanico(null);
      setRepuestoSearch("");
      setRepuestosResult([]);
      void fetchOT();
    }
  }

  async function eliminarItem(itemId: string) {
    await fetch(`/api/mantenimientos/ordenes/${id}/items/${itemId}`, {
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
        <StatusBadge status={ot.estado} className="text-sm px-3 py-1" />
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</p>
                <p className="font-medium mt-1">{ot.tipo}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridad</p>
                <div className="mt-1"><StatusBadge status={ot.prioridad} /></div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Service</p>
                <p className="font-medium mt-1">{ot.tipoService?.replace(/_/g, " ") ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Moto ID</p>
                <p className="font-mono tabular-nums text-xs mt-1">{ot.motoId.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taller</p>
                <p className="font-medium mt-1">
                  {ot.tallerId ? (
                    <Link href="/admin/talleres" className="text-primary hover:underline">
                      {ot.tallerNombre ?? "Ver taller"}
                    </Link>
                  ) : (
                    ot.tallerNombre ?? <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mecánico</p>
                <p className="font-medium mt-1">
                  {ot.mecanicoId ? (
                    <span className="text-primary">{ot.mecanicoNombre ?? "Asignado"}</span>
                  ) : (
                    ot.mecanicoNombre ?? <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Km Ingreso</p>
                <p className="font-mono tabular-nums mt-1">{ot.kmIngreso?.toLocaleString("es-AR") ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Km Egreso</p>
                <p className="font-mono tabular-nums mt-1">{ot.kmEgreso?.toLocaleString("es-AR") ?? <span className="text-muted-foreground">—</span>}</p>
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
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nueva Tarea</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!manualTareaMode && !selectedCatalogItem && (
                    <div>
                      <Label>Buscar en catálogo</Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={catalogSearch}
                          onChange={(e) => void buscarCatalogo(e.target.value)}
                          placeholder="Buscar tarea por nombre..."
                          className="pl-9"
                        />
                        {searchingCatalog && (
                          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {catalogResults.length > 0 && (
                        <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                          {catalogResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-2"
                              onClick={() => {
                                setSelectedCatalogItem(item);
                                setNuevaTarea({ categoria: item.categoria, descripcion: item.nombre });
                                setCatalogSearch("");
                                setCatalogResults([]);
                              }}
                            >
                              <Badge variant="outline" className="text-[10px] shrink-0">{item.categoria}</Badge>
                              <span className="text-sm truncate">{item.nombre}</span>
                              {item.tiempoEstimado && (
                                <span className="text-xs text-muted-foreground ml-auto shrink-0">{item.tiempoEstimado} min</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline mt-2"
                        onClick={() => setManualTareaMode(true)}
                      >
                        Escribir manualmente
                      </button>
                    </div>
                  )}

                  {selectedCatalogItem && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{selectedCatalogItem.categoria}</Badge>
                          <span className="text-sm font-medium">{selectedCatalogItem.nombre}</span>
                          {selectedCatalogItem.tiempoEstimado && (
                            <span className="text-xs text-muted-foreground">({selectedCatalogItem.tiempoEstimado} min)</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                          setSelectedCatalogItem(null);
                          setNuevaTarea({ categoria: "OTRO", descripcion: "" });
                        }}>
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  )}

                  {manualTareaMode && !selectedCatalogItem && (
                    <>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label>Categoría</Label>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline"
                            onClick={() => setManualTareaMode(false)}
                          >
                            Buscar en catálogo
                          </button>
                        </div>
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
                    </>
                  )}

                  <Button
                    onClick={agregarTarea}
                    className="w-full"
                    disabled={!nuevaTarea.descripcion}
                  >
                    Agregar
                  </Button>
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
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Tiempo</th>
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
                    <td className="py-2 px-2 text-center text-xs font-mono tabular-nums text-muted-foreground">
                      {t.tiempoEstimado ? `${t.tiempoEstimado}m` : "—"}
                    </td>
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

      {/* Repuestos Sugeridos */}
      {isEditable && sugerencias.length > 0 && (
        <Card className="border-amber-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <Sparkles className="h-4 w-4" />
              Repuestos Sugeridos ({sugerencias.length})
              {sugerenciasLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sugerencias.map((sug) => (
              <div
                key={sug.repuestoId}
                className="flex items-center gap-3 p-3 rounded-lg border border-amber-200/50 bg-amber-50/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{sug.repuestoNombre}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {sug.repuestoCodigo && <span className="font-mono">{sug.repuestoCodigo}</span>}
                    <span>x{sug.cantidadDefault}</span>
                    {sug.repuestoPrecio != null && (
                      <span className="font-mono tabular-nums">{formatMoney(sug.repuestoPrecio)}/u</span>
                    )}
                    {sug.itemServiceNombre && (
                      <span className="text-amber-600">Por: {sug.itemServiceNombre}</span>
                    )}
                    {sug.obligatorio && <Badge variant="outline" className="text-[10px] px-1">Obligatorio</Badge>}
                    {sug.origenIA && <Badge variant="outline" className="text-[10px] px-1">IA</Badge>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acceptSugerencia(sug)}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => dismissSugerencia(sug.repuestoId)}>
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                      <td className="py-2 px-2 text-center font-mono tabular-nums">{r.cantidad}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{formatMoney(Number(r.precioUnitario))}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{formatMoney(Number(r.subtotal))}</td>
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
              <div className="flex justify-end mt-2 text-sm font-bold font-mono tabular-nums">
                Total: {formatMoney(Number(ot.costoRepuestos ?? 0))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items de Costo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" /> Items de Costo ({ot.items.length})
          </CardTitle>
          {isEditable && (
            <Dialog open={itemDialog} onOpenChange={(open) => {
              setItemDialog(open);
              if (!open) {
                setNuevoItem({
                  tipo: "MANO_OBRA",
                  descripcion: "",
                  cantidad: 1,
                  precioUnitario: 0,
                  mecanicoId: "",
                  tiempoMinutos: 0,
                  repuestoId: "",
                  codigoOEM: "",
                });
                setTarifaMecanico(null);
                setRepuestoSearch("");
                setRepuestosResult([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Agregar Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nuevo Item de Costo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={nuevoItem.tipo}
                      onValueChange={(v) => {
                        setNuevoItem({
                          ...nuevoItem,
                          tipo: v as "MANO_OBRA" | "REPUESTO" | "INSUMO",
                          descripcion: "",
                          cantidad: 1,
                          precioUnitario: 0,
                          mecanicoId: "",
                          tiempoMinutos: 0,
                          repuestoId: "",
                          codigoOEM: "",
                        });
                        setTarifaMecanico(null);
                        setRepuestoSearch("");
                        setRepuestosResult([]);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANO_OBRA">Mano de Obra</SelectItem>
                        <SelectItem value="REPUESTO">Repuesto</SelectItem>
                        <SelectItem value="INSUMO">Insumo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* MANO_OBRA fields */}
                  {nuevoItem.tipo === "MANO_OBRA" && (
                    <>
                      <div>
                        <Label>Mecanico</Label>
                        <Select
                          value={nuevoItem.mecanicoId}
                          onValueChange={(v) => {
                            setNuevoItem({ ...nuevoItem, mecanicoId: v });
                            void fetchTarifaMecanico(v);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Seleccionar mecanico" /></SelectTrigger>
                          <SelectContent>
                            {todosMecanicos.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nombre} {m.apellido}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {tarifaMecanico !== null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tarifa: {formatMoney(tarifaMecanico)}/hora
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Descripcion</Label>
                        <Input
                          value={nuevoItem.descripcion}
                          onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                          placeholder="Ej: Cambio de aceite"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Tiempo (min)</Label>
                          <Input
                            type="number"
                            value={nuevoItem.tiempoMinutos || ""}
                            onChange={(e) => setNuevoItem({ ...nuevoItem, tiempoMinutos: Number(e.target.value) })}
                            placeholder="Minutos"
                          />
                        </div>
                        <div>
                          <Label>Precio Calculado</Label>
                          <div className="h-9 flex items-center px-3 rounded-md border bg-muted font-mono tabular-nums text-sm">
                            {formatMoney(calcularPrecioManoObra(tarifaMecanico, nuevoItem.tiempoMinutos))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* REPUESTO fields */}
                  {nuevoItem.tipo === "REPUESTO" && (
                    <>
                      <div>
                        <Label>Buscar Repuesto</Label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={repuestoSearch}
                            onChange={(e) => void buscarRepuestos(e.target.value)}
                            placeholder="Buscar por nombre o codigo..."
                            className="pl-9"
                          />
                        </div>
                        {searchingRepuestos && (
                          <p className="text-xs text-muted-foreground mt-1">Buscando...</p>
                        )}
                        {repuestosResult.length > 0 && (
                          <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                            {repuestosResult.map((rp) => (
                              <button
                                key={rp.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                                onClick={() => {
                                  setNuevoItem({
                                    ...nuevoItem,
                                    repuestoId: rp.id,
                                    descripcion: rp.nombre,
                                    codigoOEM: rp.codigo ?? "",
                                    precioUnitario: Number(rp.precioCompra ?? 0),
                                  });
                                  setRepuestoSearch(rp.nombre);
                                  setRepuestosResult([]);
                                }}
                              >
                                <span className="font-medium">{rp.nombre}</span>
                                {rp.codigo && (
                                  <span className="text-xs text-muted-foreground ml-2">({rp.codigo})</span>
                                )}
                                <span className="float-right font-mono tabular-nums text-xs">
                                  {formatMoney(Number(rp.precioCompra ?? 0))} - Stock: {rp.stock}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Descripcion</Label>
                        <Input
                          value={nuevoItem.descripcion}
                          onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            value={nuevoItem.cantidad}
                            onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Precio Unitario</Label>
                          <Input
                            type="number"
                            value={nuevoItem.precioUnitario}
                            onChange={(e) => setNuevoItem({ ...nuevoItem, precioUnitario: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* INSUMO fields */}
                  {nuevoItem.tipo === "INSUMO" && (
                    <>
                      <div>
                        <Label>Descripcion</Label>
                        <Input
                          value={nuevoItem.descripcion}
                          onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                          placeholder="Ej: Aceite 10W40, Filtro de aire..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            value={nuevoItem.cantidad}
                            onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Precio Unitario</Label>
                          <Input
                            type="number"
                            value={nuevoItem.precioUnitario}
                            onChange={(e) => setNuevoItem({ ...nuevoItem, precioUnitario: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Subtotal preview */}
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="font-mono tabular-nums font-bold">
                      {formatMoney(
                        nuevoItem.tipo === "MANO_OBRA"
                          ? calcularPrecioManoObra(tarifaMecanico, nuevoItem.tiempoMinutos) * nuevoItem.cantidad
                          : nuevoItem.cantidad * nuevoItem.precioUnitario
                      )}
                    </span>
                  </div>

                  <Button onClick={agregarItem} className="w-full">Agregar Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {ot.items.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin items de costo</p>
          ) : (
            <>
              <Tabs defaultValue="MANO_OBRA">
                <TabsList>
                  <TabsTrigger value="MANO_OBRA">
                    Mano de Obra ({ot.items.filter((i) => i.tipo === "MANO_OBRA").length})
                  </TabsTrigger>
                  <TabsTrigger value="REPUESTO">
                    Repuestos ({ot.items.filter((i) => i.tipo === "REPUESTO").length})
                  </TabsTrigger>
                  <TabsTrigger value="INSUMO">
                    Insumos ({ot.items.filter((i) => i.tipo === "INSUMO").length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="MANO_OBRA">
                  <ItemsTable
                    items={ot.items.filter((i) => i.tipo === "MANO_OBRA")}
                    tipo="MANO_OBRA"
                    isEditable={isEditable}
                    onDelete={eliminarItem}
                    mecanicos={todosMecanicos}
                  />
                </TabsContent>

                <TabsContent value="REPUESTO">
                  <ItemsTable
                    items={ot.items.filter((i) => i.tipo === "REPUESTO")}
                    tipo="REPUESTO"
                    isEditable={isEditable}
                    onDelete={eliminarItem}
                    mecanicos={todosMecanicos}
                  />
                </TabsContent>

                <TabsContent value="INSUMO">
                  <ItemsTable
                    items={ot.items.filter((i) => i.tipo === "INSUMO")}
                    tipo="INSUMO"
                    isEditable={isEditable}
                    onDelete={eliminarItem}
                    mecanicos={todosMecanicos}
                  />
                </TabsContent>
              </Tabs>

              {/* Summary */}
              <div className="mt-4 border-t pt-4">
                <div className="font-mono tabular-nums text-sm space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mano de Obra</span>
                    <span>{formatMoney(ot.items.filter((i) => i.tipo === "MANO_OBRA").reduce((s, i) => s + Number(i.subtotal), 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repuestos</span>
                    <span>{formatMoney(ot.items.filter((i) => i.tipo === "REPUESTO").reduce((s, i) => s + Number(i.subtotal), 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Insumos</span>
                    <span>{formatMoney(ot.items.filter((i) => i.tipo === "INSUMO").reduce((s, i) => s + Number(i.subtotal), 0))}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Items</span>
                      <span>{formatMoney(ot.items.reduce((s, i) => s + Number(i.subtotal), 0))}</span>
                    </div>
                  </div>
                </div>
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
          {/* Tarifa info */}
          {tarifaInfo?.tarifaHora && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarifa hora</span>
                <span className="font-mono tabular-nums">{formatMoney(tarifaInfo.tarifaHora)}/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuente</span>
                <span>{tarifaInfo.fuente}</span>
              </div>
              {estimatedLaborMinutes > 0 && estimatedLaborCost && (
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-muted-foreground">
                    Estimado ({estimatedLaborMinutes} min de tareas)
                  </span>
                  <span className="font-mono tabular-nums font-medium">
                    {formatMoney(estimatedLaborCost)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="font-mono tabular-nums text-sm space-y-2 max-w-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano de Obra</span>
              <span>{formatMoney(Number(ot.costoManoObra ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repuestos</span>
              <span>{formatMoney(Number(ot.costoRepuestos ?? 0))}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatMoney(Number(ot.costoTotal ?? 0))}</span>
              </div>
            </div>
          </div>

          {/* Apply estimated cost button */}
          {isEditable && estimatedLaborCost && Number(ot.costoManoObra ?? 0) === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => guardarCampo("costoManoObra", estimatedLaborCost)}
            >
              Aplicar estimado: {formatMoney(estimatedLaborCost)}
            </Button>
          )}

          {/* Manual override */}
          {isEditable && (
            <div className="mt-4 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Mano de Obra (manual):</Label>
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

      {/* Asignar a Taller Externo */}
      {isEditable && ["APROBADA", "PROGRAMADA"].includes(ot.estado) && (
        <AsignarTallerCard otId={ot.id} />
      )}

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {ot.historial.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Sin historial</p>
          ) : (
            <div className="space-y-4">
              {ot.historial.map((h) => (
                <div key={h.id} className="flex gap-3 pb-4 last:pb-0 border-b last:border-0">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    </div>
                    <div className="flex-1 w-px bg-border mt-1" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={h.estadoAnterior} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <StatusBadge status={h.estadoNuevo} />
                    </div>
                    {h.descripcion && (
                      <p className="text-muted-foreground text-xs mt-1">{h.descripcion}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {h.userId && (
                        <span className="text-xs font-medium text-muted-foreground font-mono">
                          {h.userId.slice(0, 8)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {formatDateTime(new Date(h.createdAt))}
                      </span>
                    </div>
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
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono tabular-nums text-xs">
        {fecha ? formatDateTime(new Date(fecha)) : <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

const TIPO_LABELS: Record<string, string> = {
  MANO_OBRA: "Mano de Obra",
  REPUESTO: "Repuesto",
  INSUMO: "Insumo",
};

function ItemsTable({
  items,
  tipo,
  isEditable,
  onDelete,
  mecanicos,
}: {
  items: ItemCosto[];
  tipo: "MANO_OBRA" | "REPUESTO" | "INSUMO";
  isEditable: boolean;
  onDelete: (id: string) => void;
  mecanicos: Array<{ id: string; nombre: string; apellido: string }>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-center py-4 text-muted-foreground text-sm">
        Sin items de {TIPO_LABELS[tipo]?.toLowerCase()}
      </p>
    );
  }

  const getMecanicoNombre = (mecanicoId: string | null) => {
    if (!mecanicoId) return null;
    const m = mecanicos.find((x) => x.id === mecanicoId);
    return m ? `${m.nombre} ${m.apellido}` : mecanicoId.slice(0, 8);
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descripcion</th>
          {tipo === "MANO_OBRA" && (
            <>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mecanico</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Min.</th>
            </>
          )}
          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Cant.</th>
          <th className="text-right py-2 px-2 font-medium text-muted-foreground">P. Unit.</th>
          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Subtotal</th>
          {isEditable && <th className="py-2 px-2"></th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b">
            <td className="py-2 px-2">
              {item.descripcion}
              {item.codigoOEM && (
                <span className="text-xs text-muted-foreground ml-1">({item.codigoOEM})</span>
              )}
            </td>
            {tipo === "MANO_OBRA" && (
              <>
                <td className="py-2 px-2 text-xs">
                  {getMecanicoNombre(item.mecanicoId) ?? <span className="text-muted-foreground">-</span>}
                </td>
                <td className="py-2 px-2 text-center font-mono tabular-nums">
                  {item.tiempoMinutos ?? <span className="text-muted-foreground">-</span>}
                </td>
              </>
            )}
            <td className="py-2 px-2 text-center font-mono tabular-nums">{item.cantidad}</td>
            <td className="py-2 px-2 text-right font-mono tabular-nums">{formatMoney(Number(item.precioUnitario))}</td>
            <td className="py-2 px-2 text-right font-mono tabular-nums font-medium">{formatMoney(Number(item.subtotal))}</td>
            {isEditable && (
              <td className="py-2 px-2 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-negative h-7 w-7 p-0"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={tipo === "MANO_OBRA" ? 5 : 3} className="py-2 px-2 text-right font-medium text-sm">
            Subtotal {TIPO_LABELS[tipo]}:
          </td>
          <td className="py-2 px-2 text-right font-mono tabular-nums font-bold">
            {formatMoney(items.reduce((s, i) => s + Number(i.subtotal), 0))}
          </td>
          {isEditable && <td></td>}
        </tr>
      </tfoot>
    </table>
  );
}

// ── Asignar a Taller Externo ────────────────────────────────

interface Asignacion {
  id: string;
  estado: string;
  fechaLimite: string;
  fechaRespuesta: string | null;
  motivoRechazo: string | null;
  createdAt: string;
  taller: { id: string; nombre: string; codigoRed: string | null };
}

function AsignarTallerCard({ otId }: { otId: string }) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [talleresExternos, setTalleresExternos] = useState<
    Array<{ id: string; nombre: string; codigoRed: string | null }>
  >([]);
  const [selectedTaller, setSelectedTaller] = useState("");
  const [horasLimite, setHorasLimite] = useState(24);
  const [sending, setSending] = useState(false);
  const [loadingAsig, setLoadingAsig] = useState(true);

  const fetchAsignaciones = useCallback(async () => {
    const res = await fetch(`/api/mantenimientos/ordenes/${otId}/asignar-taller`);
    if (res.ok) {
      const j = await res.json();
      setAsignaciones(j.data);
    }
    setLoadingAsig(false);
  }, [otId]);

  useEffect(() => {
    void fetchAsignaciones();
    // Fetch external talleres
    void fetch("/api/talleres?tipo=EXTERNO").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setTalleresExternos(
          j.data.map((t: { id: string; nombre: string; codigoRed?: string | null }) => ({
            id: t.id,
            nombre: t.nombre,
            codigoRed: t.codigoRed ?? null,
          }))
        );
      }
    });
  }, [fetchAsignaciones]);

  const handleAsignar = async () => {
    if (!selectedTaller) return;
    setSending(true);
    try {
      const res = await fetch(`/api/mantenimientos/ordenes/${otId}/asignar-taller`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tallerId: selectedTaller, horasLimite }),
      });
      if (res.ok) {
        setSelectedTaller("");
        setHorasLimite(24);
        await fetchAsignaciones();
      }
    } finally {
      setSending(false);
    }
  };

  const estadoColor: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    ACEPTADA: "bg-green-100 text-green-800",
    RECHAZADA: "bg-red-100 text-red-800",
    EXPIRADA: "bg-gray-100 text-gray-800",
    CANCELADA: "bg-gray-100 text-gray-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Asignar a Taller Externo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing assignments */}
        {loadingAsig ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : asignaciones.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Asignaciones enviadas</p>
            {asignaciones.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div>
                  <span className="font-medium">{a.taller.nombre}</span>
                  {a.taller.codigoRed && (
                    <span className="text-xs text-muted-foreground ml-1">({a.taller.codigoRed})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${estadoColor[a.estado] ?? ""}`}>
                    {a.estado}
                  </Badge>
                  {a.estado === "PENDIENTE" && (
                    <span className="text-xs text-muted-foreground font-mono">
                      <Clock className="h-3 w-3 inline mr-0.5" />
                      {new Date(a.fechaLimite) > new Date()
                        ? `${Math.ceil((new Date(a.fechaLimite).getTime() - Date.now()) / 3600000)}h`
                        : "Expirado"}
                    </span>
                  )}
                  {a.motivoRechazo && (
                    <span className="text-xs text-muted-foreground" title={a.motivoRechazo}>
                      <ThumbsDown className="h-3 w-3 inline" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Assign form */}
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Select value={selectedTaller} onValueChange={setSelectedTaller}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar taller externo..." />
              </SelectTrigger>
              <SelectContent>
                {talleresExternos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre} {t.codigoRed ? `(${t.codigoRed})` : ""}
                  </SelectItem>
                ))}
                {talleresExternos.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay talleres externos activos
                  </div>
                )}
              </SelectContent>
            </Select>
            <div>
              <Input
                type="number"
                min={1}
                max={168}
                value={horasLimite}
                onChange={(e) => setHorasLimite(Number(e.target.value))}
                className="text-center"
              />
              <p className="text-[10px] text-muted-foreground text-center mt-0.5">SLA (horas)</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAsignar}
            disabled={!selectedTaller || sending}
            className="w-full"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar Asignación
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
