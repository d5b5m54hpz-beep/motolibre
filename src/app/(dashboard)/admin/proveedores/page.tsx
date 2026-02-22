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
  Truck, Plus, Building2, Globe2, Package,
} from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string | null;
  tipoProveedor: string;
  pais: string;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  condicionIva: string | null;
  categorias: string[];
  activo: boolean;
  _count: { ordenesCompra: number };
}

const CATEGORIAS_SUGERIDAS = ["repuestos", "motos", "aceites", "filtros", "neumáticos", "electricidad", "carrocería"];

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    cuit: "",
    tipoProveedor: "NACIONAL" as "NACIONAL" | "INTERNACIONAL",
    pais: "Argentina",
    ciudad: "",
    provincia: "",
    direccion: "",
    telefono: "",
    email: "",
    contacto: "",
    condicionIva: "",
    categorias: "",
    notas: "",
    cbu: "",
    alias: "",
    banco: "",
  });

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo && filtroTipo !== "all") params.set("tipo", filtroTipo);
    if (search) params.set("search", search);

    const res = await fetch(`/api/proveedores?${params}`);
    if (res.ok) {
      const j = await res.json();
      setProveedores(j.data);
    }
    setLoading(false);
  }, [filtroTipo, search]);

  useEffect(() => { void fetchProveedores(); }, [fetchProveedores]);

  async function handleCreate() {
    if (!form.nombre) return;
    const res = await fetch("/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categorias: form.categorias ? form.categorias.split(",").map((c) => c.trim()).filter(Boolean) : [],
        cuit: form.cuit || null,
        ciudad: form.ciudad || null,
        provincia: form.provincia || null,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        email: form.email || null,
        contacto: form.contacto || null,
        condicionIva: form.condicionIva || null,
        notas: form.notas || null,
        cbu: form.cbu || null,
        alias: form.alias || null,
        banco: form.banco || null,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ nombre: "", cuit: "", tipoProveedor: "NACIONAL", pais: "Argentina", ciudad: "", provincia: "", direccion: "", telefono: "", email: "", contacto: "", condicionIva: "", categorias: "", notas: "", cbu: "", alias: "", banco: "" });
      void fetchProveedores();
    }
  }

  async function handleDesactivar(id: string) {
    await fetch(`/api/proveedores/${id}`, { method: "DELETE" });
    void fetchProveedores();
  }

  const activos = proveedores.filter((p) => p.activo);
  const nacionales = activos.filter((p) => p.tipoProveedor === "NACIONAL").length;
  const internacionales = activos.filter((p) => p.tipoProveedor === "INTERNACIONAL").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" description="Gestión de proveedores nacionales e internacionales" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Proveedores Activos</p>
                <p className="text-2xl font-bold">{activos.length}</p>
              </div>
              <Truck className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nacionales</p>
                <p className="text-2xl font-bold">{nacionales}</p>
              </div>
              <Building2 className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Internacionales</p>
                <p className="text-2xl font-bold">{internacionales}</p>
              </div>
              <Globe2 className="h-8 w-8 text-accent-DEFAULT" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="NACIONAL">Nacional</SelectItem>
              <SelectItem value="INTERNACIONAL">Internacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input placeholder="Nombre, CUIT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipoProveedor} onValueChange={(v) => setForm({ ...form, tipoProveedor: v as "NACIONAL" | "INTERNACIONAL" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NACIONAL">Nacional</SelectItem>
                        <SelectItem value="INTERNACIONAL">Internacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CUIT</Label>
                    <Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="30-12345678-9" />
                  </div>
                  <div>
                    <Label>Condición IVA</Label>
                    <Input value={form.condicionIva} onChange={(e) => setForm({ ...form, condicionIva: e.target.value })} placeholder="Responsable Inscripto" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>País</Label>
                    <Input value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Contacto principal</Label>
                  <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
                </div>
                <div>
                  <Label>Categorías (separadas por coma)</Label>
                  <Input value={form.categorias} onChange={(e) => setForm({ ...form, categorias: e.target.value })} placeholder={CATEGORIAS_SUGERIDAS.slice(0, 4).join(", ")} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>CBU</Label>
                    <Input value={form.cbu} onChange={(e) => setForm({ ...form, cbu: e.target.value })} />
                  </div>
                  <div>
                    <Label>Alias</Label>
                    <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} />
                  </div>
                  <div>
                    <Label>Banco</Label>
                    <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
                </div>
                <Button onClick={handleCreate} disabled={!form.nombre} className="w-full">Crear Proveedor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Proveedores ({proveedores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : proveedores.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay proveedores</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">CUIT</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">País</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Categorías</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">OCs</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-2">
                        <div>
                          <span className="font-medium">{p.nombre}</span>
                          {p.contacto && <span className="text-xs text-muted-foreground block">{p.contacto}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className={p.tipoProveedor === "NACIONAL" ? "bg-info-bg text-ds-info" : "bg-accent-DEFAULT/10 text-accent-DEFAULT"}>
                          {p.tipoProveedor}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-xs font-mono">{p.cuit || "-"}</td>
                      <td className="py-3 px-2 text-xs">{p.pais}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {p.categorias.slice(0, 3).map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                          {p.categorias.length > 3 && <Badge variant="secondary" className="text-xs">+{p.categorias.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono">{p._count.ordenesCompra}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {p.activo && (
                          <Button variant="ghost" size="sm" onClick={() => handleDesactivar(p.id)}>
                            Desactivar
                          </Button>
                        )}
                      </td>
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
