"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TIPOS = [
  "PROVEEDOR",
  "CONTADOR",
  "ABOGADO",
  "DESPACHANTE",
  "ASEGURADORA",
  "TALLER_EXTERNO",
  "CLIENTE_POTENCIAL",
  "OTRO",
] as const;

const tipoLabels: Record<string, string> = {
  PROVEEDOR: "Proveedor",
  CONTADOR: "Contador",
  ABOGADO: "Abogado",
  DESPACHANTE: "Despachante",
  ASEGURADORA: "Aseguradora",
  TALLER_EXTERNO: "Taller Ext.",
  CLIENTE_POTENCIAL: "Cliente Pot.",
  OTRO: "Otro",
};

const tipoColors: Record<string, string> = {
  PROVEEDOR: "bg-blue-500/20 text-blue-400",
  CONTADOR: "bg-emerald-500/20 text-emerald-400",
  ABOGADO: "bg-purple-500/20 text-purple-400",
  DESPACHANTE: "bg-amber-500/20 text-amber-400",
  ASEGURADORA: "bg-cyan-500/20 text-cyan-400",
  TALLER_EXTERNO: "bg-orange-500/20 text-orange-400",
  CLIENTE_POTENCIAL: "bg-pink-500/20 text-pink-400",
  OTRO: "bg-gray-500/20 text-gray-400",
};

interface Contacto {
  id: string;
  nombre: string;
  email: string;
  empresa: string | null;
  tipo: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  _count: { conversaciones: number };
}

export function ContactosCrud() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("ALL");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    empresa: "",
    tipo: "OTRO" as string,
    telefono: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchContactos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (filterTipo !== "ALL") params.set("tipo", filterTipo);
      const res = await fetch(
        `/api/comunicacion/contactos?${params.toString()}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setContactos(json.data || []);
    } catch {
      toast.error("Error al cargar contactos");
    } finally {
      setLoading(false);
    }
  }, [search, filterTipo]);

  useEffect(() => {
    fetchContactos();
  }, [fetchContactos]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      nombre: "",
      email: "",
      empresa: "",
      tipo: "OTRO",
      telefono: "",
      notas: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Contacto) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      email: c.email,
      empresa: c.empresa || "",
      tipo: c.tipo,
      telefono: c.telefono || "",
      notas: c.notas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/comunicacion/contactos/${editingId}`
        : "/api/comunicacion/contactos";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          empresa: form.empresa || undefined,
          tipo: form.tipo,
          telefono: form.telefono || undefined,
          notas: form.notas || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }

      toast.success(editingId ? "Contacto actualizado" : "Contacto creado");
      setDialogOpen(false);
      fetchContactos();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-t-tertiary" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {tipoLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo contacto
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-DEFAULT" />
        </div>
      ) : (
        <div className="bg-bg-card/80 border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-center">Conv.</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-t-secondary"
                  >
                    No hay contactos
                  </TableCell>
                </TableRow>
              ) : (
                contactos.map((c) => (
                  <TableRow
                    key={c.id}
                    className={cn(!c.activo && "opacity-50")}
                  >
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-sm text-t-secondary">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-sm text-t-secondary">
                      {c.empresa || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", tipoColors[c.tipo])}
                      >
                        {tipoLabels[c.tipo] || c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-t-secondary">
                      {c.telefono || "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {c._count.conversaciones}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar contacto" : "Nuevo contacto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Empresa</Label>
                <Input
                  value={form.empresa}
                  onChange={(e) =>
                    setForm({ ...form, empresa: e.target.value })
                  }
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
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {tipoLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.telefono}
                onChange={(e) =>
                  setForm({ ...form, telefono: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notas}
                onChange={(e) =>
                  setForm({ ...form, notas: e.target.value })
                }
                rows={3}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingId ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
