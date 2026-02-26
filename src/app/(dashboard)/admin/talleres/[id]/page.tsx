"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { formatMoney, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Wrench,
  Star,
  Save,
  Loader2,
  Plus,
  Trash2,
  Network,
} from "lucide-react";

interface Mecanico {
  id: string;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

interface AsignacionOT {
  id: string;
  estado: string;
  fechaLimite: string;
  createdAt: string;
  ordenTrabajo?: { numero: string; descripcion: string };
}

interface TallerDetalle {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  especialidades: string[];
  activo: boolean;
  notas: string | null;
  tarifaHora: number | null;
  codigoRed: string | null;
  capacidadOTMes: number | null;
  horariosAtencion: string | null;
  scoreCalidad: number | null;
  otCompletadas: number;
  tiempoPromedioOT: number | null;
  mecanicos: Mecanico[];
  asignaciones: AsignacionOT[];
  createdAt: string;
}

export default function TallerDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [taller, setTaller] = useState<TallerDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    tipo: "INTERNO",
    direccion: "",
    telefono: "",
    email: "",
    contacto: "",
    especialidades: "",
    notas: "",
    tarifaHora: "",
  });

  // Nuevo mecánico
  const [mecDialog, setMecDialog] = useState(false);
  const [mecForm, setMecForm] = useState({
    nombre: "",
    apellido: "",
    especialidad: "",
    telefono: "",
    email: "",
  });
  const [savingMec, setSavingMec] = useState(false);

  const fetchTaller = useCallback(async () => {
    const res = await fetch(`/api/talleres/${id}`);
    if (!res.ok) {
      toast.error("Taller no encontrado");
      router.push("/admin/talleres");
      return;
    }
    const j = await res.json();
    const t = j.data as TallerDetalle;
    setTaller(t);
    setForm({
      nombre: t.nombre,
      tipo: t.tipo,
      direccion: t.direccion ?? "",
      telefono: t.telefono ?? "",
      email: t.email ?? "",
      contacto: t.contacto ?? "",
      especialidades: t.especialidades.join(", "),
      notas: t.notas ?? "",
      tarifaHora: t.tarifaHora != null ? String(t.tarifaHora) : "",
    });
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void fetchTaller();
  }, [fetchTaller]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/talleres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          direccion: form.direccion || null,
          telefono: form.telefono || null,
          email: form.email || null,
          contacto: form.contacto || null,
          especialidades: form.especialidades
            ? form.especialidades.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          notas: form.notas || null,
          tarifaHora: form.tarifaHora ? Number(form.tarifaHora) : null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Taller actualizado");
      void fetchTaller();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCrearMecanico() {
    if (!mecForm.nombre || !mecForm.apellido) return;
    setSavingMec(true);
    try {
      const res = await fetch("/api/mecanicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mecForm,
          tallerId: id,
          especialidad: mecForm.especialidad || null,
          telefono: mecForm.telefono || null,
          email: mecForm.email || null,
        }),
      });
      if (!res.ok) throw new Error("Error al crear mecánico");
      toast.success("Mecánico agregado");
      setMecDialog(false);
      setMecForm({ nombre: "", apellido: "", especialidad: "", telefono: "", email: "" });
      void fetchTaller();
    } catch {
      toast.error("Error al crear mecánico");
    } finally {
      setSavingMec(false);
    }
  }

  async function handleDesactivarMecanico(mecId: string) {
    await fetch(`/api/mecanicos/${mecId}`, { method: "DELETE" });
    void fetchTaller();
  }

  if (loading || !taller) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const asignacionColor: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    ACEPTADA: "bg-green-100 text-green-800",
    RECHAZADA: "bg-red-100 text-red-800",
    EXPIRADA: "bg-gray-100 text-gray-600",
    CANCELADA: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/talleres">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Talleres
          </Button>
        </Link>
      </div>

      <PageHeader
        title={taller.nombre}
        description={`${taller.tipo === "EXTERNO" ? "Taller Externo" : "Taller Interno"}${taller.codigoRed ? ` — ${taller.codigoRed}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form + mecánicos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos Generales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Datos Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNO">Interno</SelectItem>
                      <SelectItem value="EXTERNO">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contacto</Label>
                  <Input
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tarifa / hora</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.tarifaHora}
                    onChange={(e) => setForm({ ...form, tarifaHora: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label>Especialidades (separadas por coma)</Label>
                <Input
                  value={form.especialidades}
                  onChange={(e) => setForm({ ...form, especialidades: e.target.value })}
                  placeholder="motos, scooters, eléctricas..."
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !form.nombre} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>

          {/* Mecánicos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Mecánicos ({taller.mecanicos.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setMecDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mecDialog && (
                <div className="mb-4 p-4 border rounded-lg space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">Nuevo Mecánico</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={mecForm.nombre}
                        onChange={(e) => setMecForm({ ...mecForm, nombre: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Apellido</Label>
                      <Input
                        value={mecForm.apellido}
                        onChange={(e) => setMecForm({ ...mecForm, apellido: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Especialidad</Label>
                      <Input
                        value={mecForm.especialidad}
                        onChange={(e) => setMecForm({ ...mecForm, especialidad: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <Input
                        value={mecForm.telefono}
                        onChange={(e) => setMecForm({ ...mecForm, telefono: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCrearMecanico}
                      disabled={savingMec || !mecForm.nombre || !mecForm.apellido}
                    >
                      {savingMec ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMecDialog(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {taller.mecanicos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin mecánicos registrados
                </p>
              ) : (
                <div className="space-y-2">
                  {taller.mecanicos.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div>
                        <span className="font-medium text-sm">
                          {m.nombre} {m.apellido}
                        </span>
                        {m.especialidad && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {m.especialidad}
                          </span>
                        )}
                        {!m.activo && (
                          <Badge variant="secondary" className="text-[10px] ml-2">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {m.telefono && (
                          <span className="text-xs text-muted-foreground">
                            {m.telefono}
                          </span>
                        )}
                        {m.activo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-negative"
                            onClick={() => handleDesactivarMecanico(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: resumen + asignaciones */}
        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={taller.activo ? "default" : "secondary"}>
                  {taller.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <Badge variant="outline">
                  {taller.tipo === "EXTERNO" ? "Externo" : "Interno"}
                </Badge>
              </div>
              {taller.codigoRed && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Network className="h-3.5 w-3.5" /> Código Red
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {taller.codigoRed}
                  </span>
                </div>
              )}
              {taller.scoreCalidad != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> Score
                  </span>
                  <span className="font-mono font-bold">
                    {taller.scoreCalidad.toFixed(1)}/10
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" /> OTs Completadas
                </span>
                <span className="font-mono font-bold">{taller.otCompletadas}</span>
              </div>
              {taller.tarifaHora != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tarifa/hora</span>
                  <span className="font-mono">{formatMoney(taller.tarifaHora)}</span>
                </div>
              )}
              {taller.capacidadOTMes != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cap. OT/mes</span>
                  <span className="font-mono">{taller.capacidadOTMes}</span>
                </div>
              )}
              {taller.tiempoPromedioOT != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tiempo prom.</span>
                  <span className="font-mono text-sm">
                    {Math.floor(taller.tiempoPromedioOT / 60)}h{" "}
                    {taller.tiempoPromedioOT % 60}min
                  </span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Creado {formatDateTime(new Date(taller.createdAt))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Últimas Asignaciones */}
          {taller.tipo === "EXTERNO" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Últimas Asignaciones OT
                </CardTitle>
              </CardHeader>
              <CardContent>
                {taller.asignaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Sin asignaciones aún
                  </p>
                ) : (
                  <div className="space-y-2">
                    {taller.asignaciones.slice(0, 8).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded border text-xs"
                      >
                        <span className="text-muted-foreground font-mono">
                          {new Date(a.createdAt).toLocaleDateString("es-AR")}
                        </span>
                        <Badge
                          className={`text-[10px] ${asignacionColor[a.estado] ?? ""}`}
                        >
                          {a.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
