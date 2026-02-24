"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Plantillas ──

interface Plantilla {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  tipo: string | null;
  activa: boolean;
}

function PlantillasTab() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    asunto: "",
    cuerpo: "",
    tipo: "",
  });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/comunicacion/plantillas");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPlantillas(json.data || []);
    } catch {
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: "", asunto: "", cuerpo: "", tipo: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Plantilla) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      asunto: p.asunto,
      cuerpo: p.cuerpo,
      tipo: p.tipo || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.asunto || !form.cuerpo) {
      toast.error("Completá nombre, asunto y cuerpo");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/comunicacion/plantillas/${editingId}`
        : "/api/comunicacion/plantillas";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? "Plantilla actualizada" : "Plantilla creada");
      setDialogOpen(false);
      fetch_();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/comunicacion/plantillas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Plantilla desactivada");
      fetch_();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-DEFAULT" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-t-secondary">
          Variables disponibles: {"{{nombre}}"}, {"{{asunto}}"}, {"{{respuesta}}"}, {"{{items}}"}, {"{{detalle}}"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </div>

      <div className="bg-bg-card/80 border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plantillas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-t-secondary"
                >
                  No hay plantillas
                </TableCell>
              </TableRow>
            ) : (
              plantillas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm text-t-secondary">
                    {p.asunto}
                  </TableCell>
                  <TableCell className="text-sm text-t-tertiary">
                    {p.tipo || "General"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tipo (opcional)</Label>
                <Input
                  value={form.tipo}
                  onChange={(e) =>
                    setForm({ ...form, tipo: e.target.value })
                  }
                  placeholder="General"
                />
              </div>
            </div>
            <div>
              <Label>Asunto</Label>
              <Input
                value={form.asunto}
                onChange={(e) =>
                  setForm({ ...form, asunto: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cuerpo</Label>
              <Textarea
                value={form.cuerpo}
                onChange={(e) =>
                  setForm({ ...form, cuerpo: e.target.value })
                }
                rows={8}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reglas de autonomía ──

interface Regla {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipoContacto: string | null;
  palabrasClave: string[];
  prioridadMaxima: string;
  accion: string;
  plantillaId: string | null;
  activa: boolean;
}

const accionLabels: Record<string, string> = {
  ENVIAR_DIRECTO: "Enviar directo",
  BORRADOR_SOLO: "Solo borrador",
  NOTIFICAR: "Solo notificar",
};

const accionColors: Record<string, string> = {
  ENVIAR_DIRECTO: "bg-green-500/20 text-green-400",
  BORRADOR_SOLO: "bg-yellow-500/20 text-yellow-400",
  NOTIFICAR: "bg-blue-500/20 text-blue-400",
};

function ReglasTab() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipoContacto: "" as string,
    palabrasClave: "",
    prioridadMaxima: "BAJA",
    accion: "NOTIFICAR",
    plantillaId: "",
  });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/comunicacion/reglas");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReglas(json.data || []);
    } catch {
      toast.error("Error al cargar reglas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      nombre: "",
      descripcion: "",
      tipoContacto: "",
      palabrasClave: "",
      prioridadMaxima: "BAJA",
      accion: "NOTIFICAR",
      plantillaId: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (r: Regla) => {
    setEditingId(r.id);
    setForm({
      nombre: r.nombre,
      descripcion: r.descripcion || "",
      tipoContacto: r.tipoContacto || "",
      palabrasClave: r.palabrasClave.join(", "),
      prioridadMaxima: r.prioridadMaxima,
      accion: r.accion,
      plantillaId: r.plantillaId || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.accion) {
      toast.error("Nombre y acción son requeridos");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/comunicacion/reglas/${editingId}`
        : "/api/comunicacion/reglas";
      const method = editingId ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        prioridadMaxima: form.prioridadMaxima,
        accion: form.accion,
        palabrasClave: form.palabrasClave
          ? form.palabrasClave.split(",").map((k) => k.trim())
          : [],
      };
      if (form.tipoContacto) body.tipoContacto = form.tipoContacto;
      if (form.plantillaId) body.plantillaId = form.plantillaId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? "Regla actualizada" : "Regla creada");
      setDialogOpen(false);
      fetch_();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r: Regla) => {
    try {
      const res = await fetch(`/api/comunicacion/reglas/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !r.activa }),
      });
      if (!res.ok) throw new Error();
      toast.success(r.activa ? "Regla desactivada" : "Regla activada");
      fetch_();
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/comunicacion/reglas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Regla eliminada");
      fetch_();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-DEFAULT" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-t-secondary">
          Reglas que determinan cómo actúa el agente IA ante mensajes entrantes
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </div>

      <div className="bg-bg-card/80 border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo contacto</TableHead>
              <TableHead>Prioridad máx.</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reglas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-t-secondary"
                >
                  No hay reglas configuradas
                </TableCell>
              </TableRow>
            ) : (
              reglas.map((r) => (
                <TableRow
                  key={r.id}
                  className={cn(!r.activa && "opacity-50")}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{r.nombre}</span>
                      {r.descripcion && (
                        <p className="text-xs text-t-tertiary">
                          {r.descripcion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-t-secondary">
                    {r.tipoContacto || "Todos"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.prioridadMaxima}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        accionColors[r.accion]
                      )}
                    >
                      {accionLabels[r.accion] || r.accion}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggle(r)}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        r.activa
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      )}
                    >
                      {r.activa ? "Activa" : "Inactiva"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar regla" : "Nueva regla"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de contacto</Label>
                <Select
                  value={form.tipoContacto || "ALL"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      tipoContacto: v === "ALL" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                    <SelectItem value="CONTADOR">Contador</SelectItem>
                    <SelectItem value="ABOGADO">Abogado</SelectItem>
                    <SelectItem value="ASEGURADORA">Aseguradora</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad máxima</Label>
                <Select
                  value={form.prioridadMaxima}
                  onValueChange={(v) =>
                    setForm({ ...form, prioridadMaxima: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Palabras clave (separadas por coma)</Label>
              <Input
                value={form.palabrasClave}
                onChange={(e) =>
                  setForm({ ...form, palabrasClave: e.target.value })
                }
                placeholder="factura, pago, consulta"
              />
            </div>
            <div>
              <Label>Acción</Label>
              <Select
                value={form.accion}
                onValueChange={(v) => setForm({ ...form, accion: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTIFICAR">Solo notificar</SelectItem>
                  <SelectItem value="BORRADOR_SOLO">
                    Generar borrador
                  </SelectItem>
                  <SelectItem value="ENVIAR_DIRECTO">
                    Enviar directo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Component ──

export function ConfigComunicacion() {
  return (
    <Tabs defaultValue="plantillas" className="space-y-4">
      <TabsList>
        <TabsTrigger value="plantillas" className="gap-1">
          <FileText className="h-4 w-4" /> Plantillas
        </TabsTrigger>
        <TabsTrigger value="reglas" className="gap-1">
          <Shield className="h-4 w-4" /> Reglas de autonomía
        </TabsTrigger>
      </TabsList>
      <TabsContent value="plantillas">
        <PlantillasTab />
      </TabsContent>
      <TabsContent value="reglas">
        <ReglasTab />
      </TabsContent>
    </Tabs>
  );
}
