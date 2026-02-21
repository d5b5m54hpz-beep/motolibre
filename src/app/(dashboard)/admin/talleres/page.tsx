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
import {
  Building2,
  Plus,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Mecanico {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  especialidad: string | null;
  activo: boolean;
}

interface Taller {
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
  mecanicos: Mecanico[];
  _count: { mecanicos: number };
}

export default function TalleresPage() {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tallerDialog, setTallerDialog] = useState(false);
  const [mecanicoDialog, setMecanicoDialog] = useState(false);

  // Forms
  const [tallerForm, setTallerForm] = useState({
    nombre: "",
    tipo: "INTERNO",
    direccion: "",
    telefono: "",
    email: "",
    contacto: "",
    especialidades: "",
    notas: "",
  });

  const [mecanicoForm, setMecanicoForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    especialidad: "",
    tallerId: "",
  });

  const fetchTalleres = useCallback(async () => {
    const res = await fetch("/api/talleres");
    if (res.ok) {
      const j = await res.json();
      setTalleres(j.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTalleres();
  }, [fetchTalleres]);

  const talleresActivos = talleres.filter((t) => t.activo).length;
  const mecanicosActivos = talleres.reduce(
    (sum, t) => sum + t.mecanicos.filter((m) => m.activo).length,
    0
  );

  async function crearTaller() {
    if (!tallerForm.nombre) return;
    const res = await fetch("/api/talleres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tallerForm,
        especialidades: tallerForm.especialidades
          ? tallerForm.especialidades.split(",").map((s) => s.trim())
          : [],
        direccion: tallerForm.direccion || undefined,
        telefono: tallerForm.telefono || undefined,
        email: tallerForm.email || undefined,
        contacto: tallerForm.contacto || undefined,
        notas: tallerForm.notas || undefined,
      }),
    });
    if (res.ok) {
      setTallerDialog(false);
      setTallerForm({ nombre: "", tipo: "INTERNO", direccion: "", telefono: "", email: "", contacto: "", especialidades: "", notas: "" });
      void fetchTalleres();
    }
  }

  async function crearMecanico() {
    if (!mecanicoForm.nombre || !mecanicoForm.apellido || !mecanicoForm.tallerId) return;
    const res = await fetch("/api/mecanicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...mecanicoForm,
        telefono: mecanicoForm.telefono || undefined,
        email: mecanicoForm.email || undefined,
        especialidad: mecanicoForm.especialidad || undefined,
      }),
    });
    if (res.ok) {
      setMecanicoDialog(false);
      setMecanicoForm({ nombre: "", apellido: "", telefono: "", email: "", especialidad: "", tallerId: "" });
      void fetchTalleres();
    }
  }

  async function desactivarTaller(id: string) {
    await fetch(`/api/talleres/${id}`, { method: "DELETE" });
    void fetchTalleres();
  }

  async function desactivarMecanico(id: string) {
    await fetch(`/api/mecanicos/${id}`, { method: "DELETE" });
    void fetchTalleres();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talleres y Mecánicos"
        description="Gestión de talleres internos y externos"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Talleres Activos</p>
                <p className="text-2xl font-bold">{talleresActivos}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mecánicos Activos</p>
                <p className="text-2xl font-bold">{mecanicosActivos}</p>
              </div>
              <User className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Talleres Externos</p>
                <p className="text-2xl font-bold">
                  {talleres.filter((t) => t.tipo === "EXTERNO" && t.activo).length}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Dialog open={mecanicoDialog} onOpenChange={setMecanicoDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Mecánico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Mecánico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={mecanicoForm.nombre}
                    onChange={(e) => setMecanicoForm({ ...mecanicoForm, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Apellido *</Label>
                  <Input
                    value={mecanicoForm.apellido}
                    onChange={(e) => setMecanicoForm({ ...mecanicoForm, apellido: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Taller *</Label>
                <Select value={mecanicoForm.tallerId} onValueChange={(v) => setMecanicoForm({ ...mecanicoForm, tallerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar taller" /></SelectTrigger>
                  <SelectContent>
                    {talleres.filter((t) => t.activo).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Especialidad</Label>
                <Input
                  value={mecanicoForm.especialidad}
                  onChange={(e) => setMecanicoForm({ ...mecanicoForm, especialidad: e.target.value })}
                  placeholder="Motor, Frenos, General..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={mecanicoForm.telefono}
                    onChange={(e) => setMecanicoForm({ ...mecanicoForm, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={mecanicoForm.email}
                    onChange={(e) => setMecanicoForm({ ...mecanicoForm, email: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={crearMecanico} disabled={!mecanicoForm.nombre || !mecanicoForm.apellido || !mecanicoForm.tallerId} className="w-full">
                Crear Mecánico
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={tallerDialog} onOpenChange={setTallerDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Taller
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Taller</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={tallerForm.nombre}
                    onChange={(e) => setTallerForm({ ...tallerForm, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={tallerForm.tipo} onValueChange={(v) => setTallerForm({ ...tallerForm, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  value={tallerForm.direccion}
                  onChange={(e) => setTallerForm({ ...tallerForm, direccion: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={tallerForm.telefono}
                    onChange={(e) => setTallerForm({ ...tallerForm, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={tallerForm.email}
                    onChange={(e) => setTallerForm({ ...tallerForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Contacto</Label>
                <Input
                  value={tallerForm.contacto}
                  onChange={(e) => setTallerForm({ ...tallerForm, contacto: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <Label>Especialidades</Label>
                <Input
                  value={tallerForm.especialidades}
                  onChange={(e) => setTallerForm({ ...tallerForm, especialidades: e.target.value })}
                  placeholder="motor, frenos, electricidad (separar con coma)"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={tallerForm.notas}
                  onChange={(e) => setTallerForm({ ...tallerForm, notas: e.target.value })}
                />
              </div>
              <Button onClick={crearTaller} disabled={!tallerForm.nombre} className="w-full">
                Crear Taller
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Talleres list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : talleres.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No hay talleres</div>
      ) : (
        <div className="space-y-3">
          {talleres.map((taller) => (
            <Card key={taller.id} className={!taller.activo ? "opacity-50" : ""}>
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() => setExpandedId(expandedId === taller.id ? null : taller.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedId === taller.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm font-medium">{taller.nombre}</CardTitle>
                      {taller.direccion && (
                        <p className="text-xs text-muted-foreground">{taller.direccion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        taller.tipo === "INTERNO"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }
                    >
                      {taller.tipo}
                    </Badge>
                    {taller.especialidades.length > 0 && (
                      <div className="hidden md:flex gap-1">
                        {taller.especialidades.slice(0, 3).map((e) => (
                          <Badge key={e} variant="outline" className="text-xs">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {taller._count.mecanicos} mec.
                    </Badge>
                    {!taller.activo && (
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500">
                        Inactivo
                      </Badge>
                    )}
                    {taller.activo && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          desactivarTaller(taller.id);
                        }}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedId === taller.id && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    {taller.telefono && (
                      <div>
                        <p className="text-muted-foreground">Teléfono</p>
                        <p>{taller.telefono}</p>
                      </div>
                    )}
                    {taller.email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{taller.email}</p>
                      </div>
                    )}
                    {taller.contacto && (
                      <div>
                        <p className="text-muted-foreground">Contacto</p>
                        <p>{taller.contacto}</p>
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-2">Mecánicos ({taller.mecanicos.length})</h4>
                  {taller.mecanicos.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Sin mecánicos</p>
                  ) : (
                    <div className="space-y-2">
                      {taller.mecanicos.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-2 rounded-lg bg-muted/50 ${!m.activo ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{m.nombre} {m.apellido}</span>
                            {m.especialidad && (
                              <Badge variant="outline" className="text-xs">{m.especialidad}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {m.telefono && <span>{m.telefono}</span>}
                            {m.activo && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 h-6 text-xs"
                                onClick={() => desactivarMecanico(m.id)}
                              >
                                Desactivar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {taller.notas && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      {taller.notas}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
