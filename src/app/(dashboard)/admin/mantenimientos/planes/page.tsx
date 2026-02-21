"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  ClipboardList,
  Plus,
  Wrench,
  Trash2,
} from "lucide-react";

interface TareaPlan {
  id: string;
  categoria: string;
  descripcion: string;
  orden: number;
}

interface RepuestoPlan {
  id: string;
  nombre: string;
  cantidad: number;
}

interface Plan {
  id: string;
  nombre: string;
  tipoService: string;
  descripcion: string | null;
  kmIntervalo: number | null;
  diasIntervalo: number | null;
  activo: boolean;
  tareas: TareaPlan[];
  repuestos: RepuestoPlan[];
  _count: { tareas: number; repuestos: number };
}

const TIPOS_SERVICE = [
  "SERVICE_5000KM",
  "SERVICE_10000KM",
  "SERVICE_15000KM",
  "SERVICE_20000KM",
  "SERVICE_GENERAL",
  "REPARACION",
  "INSPECCION",
  "OTRO",
];

const CATEGORIAS = [
  "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "CARROCERIA",
  "NEUMATICOS", "TRANSMISION", "LUBRICACION", "INSPECCION", "OTRO",
];

export default function PlanesMantenimientoPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generarDialog, setGenerarDialog] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Nuevo plan form
  const [form, setForm] = useState({
    nombre: "",
    tipoService: "SERVICE_GENERAL",
    descripcion: "",
    kmIntervalo: "",
    diasIntervalo: "",
    tareas: [] as Array<{ categoria: string; descripcion: string }>,
    repuestos: [] as Array<{ nombre: string; cantidad: number }>,
  });

  // Generar OT form
  const [motoId, setMotoId] = useState("");
  const [motos, setMotos] = useState<Array<{ id: string; patente: string; marca: string; modelo: string }>>([]);

  const fetchPlanes = useCallback(async () => {
    const res = await fetch("/api/mantenimientos/planes");
    if (res.ok) {
      const j = await res.json();
      setPlanes(j.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPlanes();
  }, [fetchPlanes]);

  useEffect(() => {
    void fetch("/api/motos?limit=200").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setMotos(j.data);
      }
    });
  }, []);

  async function handleCreate() {
    if (!form.nombre) return;
    const res = await fetch("/api/mantenimientos/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        tipoService: form.tipoService,
        descripcion: form.descripcion || undefined,
        kmIntervalo: form.kmIntervalo ? Number(form.kmIntervalo) : undefined,
        diasIntervalo: form.diasIntervalo ? Number(form.diasIntervalo) : undefined,
        tareas: form.tareas.length > 0 ? form.tareas : undefined,
        repuestos: form.repuestos.length > 0 ? form.repuestos : undefined,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({
        nombre: "",
        tipoService: "SERVICE_GENERAL",
        descripcion: "",
        kmIntervalo: "",
        diasIntervalo: "",
        tareas: [],
        repuestos: [],
      });
      void fetchPlanes();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mantenimientos/planes/${id}`, { method: "DELETE" });
    void fetchPlanes();
  }

  async function handleGenerarOT(planId: string) {
    if (!motoId) return;
    const res = await fetch(`/api/mantenimientos/planes/${planId}/generar-ot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motoId }),
    });
    if (res.ok) {
      setGenerarDialog(null);
      setMotoId("");
      alert("OT generada exitosamente");
    }
  }

  function addTareaToForm() {
    setForm({
      ...form,
      tareas: [...form.tareas, { categoria: "OTRO", descripcion: "" }],
    });
  }

  function addRepuestoToForm() {
    setForm({
      ...form,
      repuestos: [...form.repuestos, { nombre: "", cantidad: 1 }],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes de Mantenimiento"
        description="Templates de service con tareas y repuestos pre-cargados"
      />

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Plan de Mantenimiento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Service 5000km Honda CB 125F"
                />
              </div>
              <div>
                <Label>Tipo Service</Label>
                <Select value={form.tipoService} onValueChange={(v) => setForm({ ...form, tipoService: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_SERVICE.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Km Intervalo</Label>
                  <Input
                    type="number"
                    value={form.kmIntervalo}
                    onChange={(e) => setForm({ ...form, kmIntervalo: e.target.value })}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <Label>Días Intervalo</Label>
                  <Input
                    type="number"
                    value={form.diasIntervalo}
                    onChange={(e) => setForm({ ...form, diasIntervalo: e.target.value })}
                    placeholder="180"
                  />
                </div>
              </div>

              {/* Tareas inline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Tareas</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addTareaToForm}>
                    <Plus className="h-3 w-3 mr-1" /> Tarea
                  </Button>
                </div>
                {form.tareas.map((t, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Select
                      value={t.categoria}
                      onValueChange={(v) => {
                        const tareas = [...form.tareas];
                        tareas[i] = { categoria: v, descripcion: t.descripcion };
                        setForm({ ...form, tareas });
                      }}
                    >
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={t.descripcion}
                      onChange={(e) => {
                        const tareas = [...form.tareas];
                        tareas[i] = { categoria: t.categoria, descripcion: e.target.value };
                        setForm({ ...form, tareas });
                      }}
                      placeholder="Descripción"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setForm({ ...form, tareas: form.tareas.filter((_, j) => j !== i) });
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              {/* Repuestos inline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Repuestos</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addRepuestoToForm}>
                    <Plus className="h-3 w-3 mr-1" /> Repuesto
                  </Button>
                </div>
                {form.repuestos.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      value={r.nombre}
                      onChange={(e) => {
                        const repuestos = [...form.repuestos];
                        repuestos[i] = { nombre: e.target.value, cantidad: r.cantidad };
                        setForm({ ...form, repuestos });
                      }}
                      placeholder="Nombre"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={r.cantidad}
                      onChange={(e) => {
                        const repuestos = [...form.repuestos];
                        repuestos[i] = { nombre: r.nombre, cantidad: Number(e.target.value) };
                        setForm({ ...form, repuestos });
                      }}
                      className="w-20"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setForm({ ...form, repuestos: form.repuestos.filter((_, j) => j !== i) });
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreate} disabled={!form.nombre} className="w-full">
                Crear Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generar OT Dialog */}
      <Dialog open={!!generarDialog} onOpenChange={() => { setGenerarDialog(null); setMotoId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar OT desde Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Moto *</Label>
              <Select value={motoId} onValueChange={setMotoId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar moto" /></SelectTrigger>
                <SelectContent>
                  {motos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.patente} — {m.marca} {m.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => generarDialog && handleGenerarOT(generarDialog)} disabled={!motoId} className="w-full">
              Generar OT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plans list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : planes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No hay planes de mantenimiento</div>
      ) : (
        <div className="space-y-4">
          {planes.map((plan) => (
            <Card key={plan.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm font-medium">{plan.nombre}</CardTitle>
                      {plan.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{plan.tipoService.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{plan._count.tareas} tareas</Badge>
                    <Badge variant="outline" className="text-xs">{plan._count.repuestos} repuestos</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setGenerarDialog(plan.id); }}
                    >
                      <Wrench className="h-4 w-4 mr-1" /> Generar OT
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedId === plan.id && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Tareas</h4>
                      {plan.tareas.length === 0 ? (
                        <p className="text-muted-foreground text-xs">Sin tareas</p>
                      ) : (
                        <div className="space-y-1">
                          {plan.tareas.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-xs shrink-0">{t.categoria}</Badge>
                              <span>{t.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Repuestos</h4>
                      {plan.repuestos.length === 0 ? (
                        <p className="text-muted-foreground text-xs">Sin repuestos</p>
                      ) : (
                        <div className="space-y-1">
                          {plan.repuestos.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">x{r.cantidad}</span>
                              <span>{r.nombre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    {plan.kmIntervalo && <span>Cada {plan.kmIntervalo.toLocaleString()} km</span>}
                    {plan.diasIntervalo && <span>Cada {plan.diasIntervalo} días</span>}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
