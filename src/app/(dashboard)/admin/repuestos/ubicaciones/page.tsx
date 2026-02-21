"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Plus, Package } from "lucide-react";

interface Ubicacion {
  id: string;
  codigo: string;
  nombre: string;
  sector: string | null;
  nivel: string | null;
  descripcion: string | null;
  _count: { repuestos: number };
}

interface RepuestoUbicacion {
  id: string;
  codigo: string;
  nombre: string;
  stock: number;
  categoria: string;
}

export default function UbicacionesPage() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [repuestos, setRepuestos] = useState<RepuestoUbicacion[]>([]);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    sector: "",
    nivel: "",
    descripcion: "",
  });

  useEffect(() => {
    void fetch("/api/ubicaciones-deposito").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setUbicaciones(j.data);
      }
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!form.codigo || !form.nombre) return;
    const res = await fetch("/api/ubicaciones-deposito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sector: form.sector || null,
        nivel: form.nivel || null,
        descripcion: form.descripcion || null,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ codigo: "", nombre: "", sector: "", nivel: "", descripcion: "" });
      const r = await fetch("/api/ubicaciones-deposito");
      if (r.ok) {
        const j = await r.json();
        setUbicaciones(j.data);
      }
    }
  }

  async function handleSelect(ubId: string) {
    setSelected(ubId);
    const r = await fetch(`/api/ubicaciones-deposito/${ubId}`);
    if (r.ok) {
      const j = await r.json();
      setRepuestos(j.data.repuestos || []);
    }
  }

  // Group by sector
  const sectors = new Map<string, Ubicacion[]>();
  for (const u of ubicaciones) {
    const key = u.sector || "Sin sector";
    if (!sectors.has(key)) sectors.set(key, []);
    sectors.get(key)!.push(u);
  }

  // Sort each sector by nivel
  for (const [, items] of sectors) {
    items.sort((a, b) => (a.nivel || "0").localeCompare(b.nivel || "0"));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ubicaciones de Depósito" description="Organización del almacén por sectores y niveles" />

      <div className="flex gap-3 items-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva Ubicación</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva Ubicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código *</Label>
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="A1-N1" />
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Estante A Nivel 1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sector</Label>
                  <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="A" />
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Input value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} placeholder="1" />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <Button onClick={handleCreate} disabled={!form.codigo || !form.nombre} className="w-full">
                Crear Ubicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Cargando...</p>
      ) : ubicaciones.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No hay ubicaciones configuradas</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grid visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Mapa del Depósito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Array.from(sectors.entries()).map(([sector, items]) => (
                  <div key={sector}>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Sector {sector}</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {items.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleSelect(u.id)}
                          className={`p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                            selected === u.id ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <p className="font-mono font-bold text-sm">{u.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.nombre}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-mono">{u._count.repuestos}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Repuestos en ubicación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                {selected
                  ? `Repuestos en ${ubicaciones.find((u) => u.id === selected)?.codigo ?? ""}`
                  : "Seleccioná una ubicación"
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-center py-8 text-muted-foreground">
                  Hacé click en una ubicación para ver sus repuestos
                </p>
              ) : repuestos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Sin repuestos en esta ubicación</p>
              ) : (
                <div className="space-y-2">
                  {repuestos.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="font-medium text-sm">{r.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.codigo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.categoria}</Badge>
                        <span className="font-mono font-bold text-sm">{r.stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
