"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Calendar, Lock, Unlock } from "lucide-react";

interface Periodo {
  id: string;
  anio: number;
  mes: number;
  nombre: string;
  cerrado: boolean;
  fechaCierre: string | null;
  cerradoPor: string | null;
  _count: { asientos: number };
}

export default function PeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchPeriodos() {
    const res = await fetch("/api/periodos-contables");
    if (res.ok) {
      const json = await res.json();
      setPeriodos(json.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPeriodos();
  }, []);

  async function cerrarPeriodo(id: string) {
    if (!confirm("¿Seguro que desea cerrar este período? No se podrán crear asientos en él.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/periodos-contables/${id}/cerrar`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success("Período cerrado");
      fetchPeriodos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar período");
    } finally {
      setActionLoading(null);
    }
  }

  async function reabrirPeriodo(id: string) {
    if (!confirm("¿Seguro que desea reabrir este período?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/periodos-contables/${id}/reabrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: true }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success("Período reabierto");
      fetchPeriodos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al reabrir período");
    } finally {
      setActionLoading(null);
    }
  }

  // El período cerrado más reciente es el único que se puede reabrir
  const masRecienteCerradoId = periodos.find((p) => p.cerrado)?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Períodos Contables"
        description="Gestión de períodos contables mensuales — cierre y reapertura"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Períodos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-t-secondary">Cargando...</div>
          ) : periodos.length === 0 ? (
            <div className="text-center py-8 text-t-secondary">
              No hay períodos contables. Se crean automáticamente al generar asientos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Año</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Mes</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Nombre</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Estado</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Asientos</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Fecha Cierre</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-2 font-mono">{p.anio}</td>
                      <td className="py-3 px-2 font-mono">{String(p.mes).padStart(2, "0")}</td>
                      <td className="py-3 px-2 font-medium">{p.nombre}</td>
                      <td className="py-3 px-2 text-center">
                        {p.cerrado ? (
                          <Badge variant="outline" className="bg-negative/10 text-negative border-negative/20">
                            <Lock className="mr-1 h-3 w-3" /> Cerrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-positive/10 text-positive border-positive/20">
                            <Unlock className="mr-1 h-3 w-3" /> Abierto
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">{p._count.asientos}</td>
                      <td className="py-3 px-2">{p.fechaCierre ? formatDateTime(p.fechaCierre) : "—"}</td>
                      <td className="py-3 px-2 text-right">
                        {!p.cerrado ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cerrarPeriodo(p.id)}
                            disabled={actionLoading === p.id}
                          >
                            <Lock className="mr-1 h-3 w-3" />
                            {actionLoading === p.id ? "..." : "Cerrar"}
                          </Button>
                        ) : p.id === masRecienteCerradoId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reabrirPeriodo(p.id)}
                            disabled={actionLoading === p.id}
                          >
                            <Unlock className="mr-1 h-3 w-3" />
                            {actionLoading === p.id ? "..." : "Reabrir"}
                          </Button>
                        ) : null}
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
