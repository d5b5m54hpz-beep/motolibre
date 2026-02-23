"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DSBadge } from "@/components/ui/ds-badge";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import {
  Calculator,
  Loader2,
  Receipt,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface PreviewData {
  empleado: {
    id: string;
    nombre: string;
    apellido: string;
    legajo: string;
  };
  sueldoBasico: number;
  presentismo: number;
  antiguedad: number;
  horasExtra: number;
  otrosHaberes: number;
  totalHaberes: number;
  totalDeducciones: number;
  netoAPagar: number;
  costoTotalEmpleador: number;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}

function currentPeriodo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

export default function LiquidacionPage() {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(false);
  const [liquidating, setLiquidating] = useState(false);
  const [liquidatedIds, setLiquidatedIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState("");

  async function handlePreview() {
    setLoading(true);
    setPreviews([]);
    setLiquidatedIds(new Set());
    setSuccessMessage("");

    const empRes = await fetch("/api/rrhh/empleados?estado=ACTIVO");
    if (!empRes.ok) {
      toast.error("Error al obtener empleados");
      setLoading(false);
      return;
    }

    const empJson = await empRes.json();
    const empleados: Empleado[] = empJson.data;

    const results: PreviewData[] = [];

    for (const emp of empleados) {
      const res = await fetch("/api/rrhh/liquidacion/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleadoId: emp.id,
          periodo,
          tipo: "MENSUAL",
        }),
      });

      if (res.ok) {
        const j = await res.json();
        results.push(j.data);
      }
    }

    setPreviews(results);
    setLoading(false);

    if (results.length === 0) {
      toast.info("No hay empleados activos para liquidar");
    }
  }

  async function handleLiquidarIndividual(empleadoId: string) {
    setLiquidating(true);

    const res = await fetch("/api/rrhh/liquidacion/liquidar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empleadoId,
        periodo,
        tipo: "MENSUAL",
      }),
    });

    if (res.ok) {
      toast.success("Recibo generado correctamente");
      setLiquidatedIds((prev) => new Set([...prev, empleadoId]));
    } else {
      const j = await res.json();
      toast.error(j.error?.toString() || "Error al liquidar");
    }
    setLiquidating(false);
  }

  async function handleLiquidarTodos() {
    setLiquidating(true);
    setSuccessMessage("");

    const res = await fetch("/api/rrhh/liquidacion/masiva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodo,
        tipo: "MENSUAL",
      }),
    });

    if (res.ok) {
      const j = await res.json();
      const { resumen } = j.data;
      setSuccessMessage(
        `Liquidacion masiva completada: ${resumen.liquidados} liquidados, ${resumen.omitidos} omitidos, ${resumen.errores} errores de ${resumen.total} empleados.`
      );
      toast.success(`${resumen.liquidados} recibos generados`);

      const allIds = new Set(previews.map((p) => p.empleado.id));
      setLiquidatedIds(allIds);
    } else {
      const j = await res.json();
      toast.error(j.error?.toString() || "Error en liquidacion masiva");
    }
    setLiquidating(false);
  }

  const totalHaberesSum = previews.reduce((s, p) => s + p.totalHaberes, 0);
  const totalDeduccionesSum = previews.reduce((s, p) => s + p.totalDeducciones, 0);
  const netoAPagarSum = previews.reduce((s, p) => s + p.netoAPagar, 0);
  const costoEmpleadorSum = previews.reduce((s, p) => s + p.costoTotalEmpleador, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidacion de Sueldos"
        description="Calculo y emision de recibos de sueldo"
      />

      {/* Period Selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Periodo</Label>
          <Input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-[200px]"
          />
        </div>
        <Button onClick={handlePreview} disabled={loading || !periodo}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          Calcular Preview
        </Button>
        {previews.length > 0 && (
          <Button
            onClick={handleLiquidarTodos}
            disabled={liquidating}
            className="ml-auto"
          >
            {liquidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Liquidar Todos
          </Button>
        )}
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-positive-bg border border-positive/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />
          <p className="text-sm text-positive font-medium">{successMessage}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                <th className="text-left p-4">Empleado</th>
                <th className="text-right p-4">Basico</th>
                <th className="text-right p-4">Present.</th>
                <th className="text-right p-4">Antig.</th>
                <th className="text-right p-4">Tot. Haberes</th>
                <th className="text-right p-4">Tot. Deduc.</th>
                <th className="text-right p-4">Neto a Pagar</th>
                <th className="text-right p-4">Costo Empl.</th>
                <th className="text-right p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : previews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-t-tertiary">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Seleccione un periodo y haga clic en &quot;Calcular Preview&quot;
                  </td>
                </tr>
              ) : (
                previews.map((p) => {
                  const isLiquidated = liquidatedIds.has(p.empleado.id);

                  return (
                    <tr
                      key={p.empleado.id}
                      className="border-b border-border/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono text-xs text-t-tertiary mr-2">
                          {p.empleado.legajo}
                        </span>
                        <span className="text-t-primary font-medium">
                          {p.empleado.apellido}, {p.empleado.nombre}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-t-primary">
                        {formatMoney(p.sueldoBasico)}
                      </td>
                      <td className="p-4 text-right font-mono text-t-secondary">
                        {formatMoney(p.presentismo)}
                      </td>
                      <td className="p-4 text-right font-mono text-t-secondary">
                        {formatMoney(p.antiguedad)}
                      </td>
                      <td className="p-4 text-right font-mono text-t-primary">
                        {formatMoney(p.totalHaberes)}
                      </td>
                      <td className="p-4 text-right font-mono text-negative">
                        {formatMoney(p.totalDeducciones)}
                      </td>
                      <td className="p-4 text-right font-mono text-t-primary font-bold">
                        {formatMoney(p.netoAPagar)}
                      </td>
                      <td className="p-4 text-right font-mono text-t-secondary">
                        {formatMoney(p.costoTotalEmpleador)}
                      </td>
                      <td className="p-4 text-right">
                        {isLiquidated ? (
                          <DSBadge variant="positive">Liquidado</DSBadge>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={liquidating}
                            onClick={() => handleLiquidarIndividual(p.empleado.id)}
                          >
                            Liquidar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {previews.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-bg-input/30">
                  <td className="p-4 font-display font-extrabold text-t-primary">
                    TOTALES
                  </td>
                  <td className="p-4" />
                  <td className="p-4" />
                  <td className="p-4" />
                  <td className="p-4 text-right font-mono font-bold text-t-primary">
                    {formatMoney(totalHaberesSum)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-negative">
                    {formatMoney(totalDeduccionesSum)}
                  </td>
                  <td className="p-4 text-right font-mono font-extrabold text-t-primary">
                    {formatMoney(netoAPagarSum)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-t-secondary">
                    {formatMoney(costoEmpleadorSum)}
                  </td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {previews.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-t-tertiary">
            {previews.length} empleado{previews.length !== 1 ? "s" : ""} en periodo {periodo}
          </div>
        )}
      </div>
    </div>
  );
}
