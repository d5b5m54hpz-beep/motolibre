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
  Globe2,
  Save,
  Loader2,
  ShoppingCart,
  FileSpreadsheet,
} from "lucide-react";

interface OC {
  id: string;
  numero: string;
  estado: string;
  montoTotal: number;
  moneda: string;
  fechaEmision: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  tipoProveedor: string;
  condicionIva: string | null;
  categorias: string[];
  notas: string | null;
  activo: boolean;
  cbu: string | null;
  alias: string | null;
  banco: string | null;
  ordenesCompra: OC[];
  _count: { ordenesCompra: number };
  _facturasCount: number;
  createdAt: string;
}

export default function ProveedorDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    cuit: "",
    tipoProveedor: "NACIONAL",
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

  const fetchProveedor = useCallback(async () => {
    const res = await fetch(`/api/proveedores/${id}`);
    if (!res.ok) {
      toast.error("Proveedor no encontrado");
      router.push("/admin/proveedores");
      return;
    }
    const j = await res.json();
    const p = j.data as Proveedor;
    setProveedor(p);
    setForm({
      nombre: p.nombre,
      cuit: p.cuit ?? "",
      tipoProveedor: p.tipoProveedor,
      pais: p.pais,
      ciudad: p.ciudad ?? "",
      provincia: p.provincia ?? "",
      direccion: p.direccion ?? "",
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      contacto: p.contacto ?? "",
      condicionIva: p.condicionIva ?? "",
      categorias: p.categorias.join(", "),
      notas: p.notas ?? "",
      cbu: p.cbu ?? "",
      alias: p.alias ?? "",
      banco: p.banco ?? "",
    });
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void fetchProveedor();
  }, [fetchProveedor]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/proveedores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categorias: form.categorias
            ? form.categorias.split(",").map((c) => c.trim()).filter(Boolean)
            : [],
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
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Error al guardar");
      }
      toast.success("Proveedor actualizado");
      void fetchProveedor();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !proveedor) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      BORRADOR: "bg-gray-100 text-gray-700",
      EMITIDA: "bg-blue-100 text-blue-700",
      PARCIAL: "bg-yellow-100 text-yellow-700",
      RECIBIDA: "bg-green-100 text-green-700",
      CANCELADA: "bg-red-100 text-red-700",
    };
    return map[estado] ?? "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/proveedores">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Proveedores
          </Button>
        </Link>
      </div>

      <PageHeader
        title={proveedor.nombre}
        description={`${proveedor.tipoProveedor === "INTERNACIONAL" ? "Proveedor Internacional" : "Proveedor Nacional"} — ${proveedor.pais}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos Generales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {proveedor.tipoProveedor === "INTERNACIONAL" ? (
                  <Globe2 className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                Datos Generales
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
                    value={form.tipoProveedor}
                    onValueChange={(v) => setForm({ ...form, tipoProveedor: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    value={form.cuit}
                    onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                    placeholder="30-12345678-9"
                  />
                </div>
                <div>
                  <Label>Condición IVA</Label>
                  <Input
                    value={form.condicionIva}
                    onChange={(e) => setForm({ ...form, condicionIva: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>País</Label>
                  <Input
                    value={form.pais}
                    onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Provincia</Label>
                  <Input
                    value={form.provincia}
                    onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={form.ciudad}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  />
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
              <div>
                <Label>Contacto principal</Label>
                <Input
                  value={form.contacto}
                  onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos Bancarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Datos Bancarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CBU</Label>
                  <Input
                    value={form.cbu}
                    onChange={(e) => setForm({ ...form, cbu: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alias</Label>
                  <Input
                    value={form.alias}
                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Banco</Label>
                  <Input
                    value={form.banco}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorías y Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Categorías y Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Categorías (separadas por coma)</Label>
                <Input
                  value={form.categorias}
                  onChange={(e) => setForm({ ...form, categorias: e.target.value })}
                  placeholder="repuestos, aceites, filtros..."
                />
                {proveedor.categorias.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {proveedor.categorias.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving || !form.nombre} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Cambios
          </Button>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={proveedor.activo ? "default" : "secondary"}>
                  {proveedor.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <Badge
                  variant="outline"
                  className={
                    proveedor.tipoProveedor === "NACIONAL"
                      ? "bg-info-bg text-ds-info"
                      : "bg-accent-DEFAULT/10 text-accent-DEFAULT"
                  }
                >
                  {proveedor.tipoProveedor}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> Órdenes de Compra
                </span>
                <span className="font-mono font-bold">{proveedor._count.ordenesCompra}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Facturas Compra
                </span>
                <span className="font-mono font-bold">{proveedor._facturasCount}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Creado {formatDateTime(new Date(proveedor.createdAt))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Últimas OCs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Últimas Órdenes de Compra</CardTitle>
            </CardHeader>
            <CardContent>
              {proveedor.ordenesCompra.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin órdenes de compra
                </p>
              ) : (
                <div className="space-y-2">
                  {proveedor.ordenesCompra.map((oc) => (
                    <Link
                      key={oc.id}
                      href="/admin/ordenes-compra"
                      className="flex items-center justify-between p-2 rounded border hover:bg-bg-card-hover transition-colors"
                    >
                      <div>
                        <span className="font-mono text-xs font-medium">{oc.numero}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(oc.fechaEmision).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {formatMoney(Number(oc.montoTotal))}
                        </span>
                        <Badge className={`text-[10px] ${estadoBadge(oc.estado)}`}>
                          {oc.estado}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
