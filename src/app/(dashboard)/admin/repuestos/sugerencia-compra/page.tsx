"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, ShoppingCart, AlertTriangle } from "lucide-react";

interface Sugerencia {
  repuestoId: string;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  cantidadSugerida: number;
  categoria: string;
  proveedorId: string | null;
}

export default function SugerenciaCompraPage() {
  const router = useRouter();
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    void fetch("/api/repuestos/sugerencia-compra").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setSugerencias(j.data);
      }
      setLoading(false);
    });
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === sugerencias.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sugerencias.map((s) => s.repuestoId)));
    }
  }

  async function generarOC() {
    if (selected.size === 0) return;
    setCreando(true);

    const items = sugerencias
      .filter((s) => selected.has(s.repuestoId))
      .map((s) => ({
        descripcion: `${s.codigo} — ${s.nombre}`,
        codigo: s.codigo,
        cantidad: s.cantidadSugerida,
        precioUnitario: 0,
        repuestoId: s.repuestoId,
      }));

    // Get first proveedor from selected items (group by proveedor ideally)
    const proveedorIds = [...new Set(
      sugerencias
        .filter((s) => selected.has(s.repuestoId) && s.proveedorId)
        .map((s) => s.proveedorId!)
    )];

    if (proveedorIds.length === 0) {
      // No provider linked, just navigate to OC page
      router.push("/admin/ordenes-compra");
      return;
    }

    // Create one OC per provider
    for (const proveedorId of proveedorIds) {
      // All items for this proveedor
      const ocItems = items.filter((item) => {
        const sug = sugerencias.find((s) => s.repuestoId === item.repuestoId);
        return sug?.proveedorId === proveedorId;
      });

      if (ocItems.length === 0) continue;

      await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          moneda: "ARS",
          items: ocItems,
        }),
      });
    }

    // Also handle items without proveedor — create a single OC if there's a default one
    const sinProveedor = items.filter((item) => {
      const sug = sugerencias.find((s) => s.repuestoId === item.repuestoId);
      return !sug?.proveedorId;
    });

    if (sinProveedor.length > 0 && proveedorIds.length > 0) {
      await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId: proveedorIds[0],
          moneda: "ARS",
          items: sinProveedor,
        }),
      });
    }

    setCreando(false);
    router.push("/admin/ordenes-compra");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sugerencia de Compra" description="Repuestos que necesitan reposición basado en stock mínimo" />

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Cargando...</p>
      ) : sugerencias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-positive mb-3" />
            <p className="text-lg font-medium">Sin reposiciones pendientes</p>
            <p className="text-sm text-muted-foreground">Todos los repuestos están por encima del stock mínimo</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-3 items-center">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selected.size === sugerencias.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </Button>
            {selected.size > 0 && (
              <Button onClick={generarOC} disabled={creando}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Generar OC ({selected.size} items)
              </Button>
            )}
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" /> {sugerencias.length} repuestos bajo stock
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Repuestos a Reponer ({sugerencias.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 w-8" />
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Código</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Stock</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Mínimo</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugerencias.map((s) => (
                      <tr key={s.repuestoId} className="border-b hover:bg-bg-card-hover transition-colors">
                        <td className="py-3 px-2">
                          <Checkbox
                            checked={selected.has(s.repuestoId)}
                            onCheckedChange={() => toggleSelect(s.repuestoId)}
                          />
                        </td>
                        <td className="py-3 px-2 font-mono text-xs">{s.codigo}</td>
                        <td className="py-3 px-2 font-medium">{s.nombre}</td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant="outline" className="text-xs">{s.categoria}</Badge>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-negative font-bold">{s.stockActual}</td>
                        <td className="py-3 px-2 text-center font-mono text-muted-foreground">{s.stockMinimo}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-positive">{s.cantidadSugerida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
