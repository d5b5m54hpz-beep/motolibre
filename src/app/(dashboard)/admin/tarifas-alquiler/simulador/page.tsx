"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatMoney } from "@/lib/format";
import {
  Calculator,
  Save,
  TrendingUp,
  DollarSign,
  Loader2,
} from "lucide-react";

const PLAN_MONTHS: Record<string, number> = {
  MESES_3: 3,
  MESES_6: 6,
  MESES_9: 9,
  MESES_12: 12,
  MESES_24: 24,
};

const PLAN_LABELS: Record<string, string> = {
  MESES_3: "3 meses",
  MESES_6: "6 meses",
  MESES_9: "9 meses",
  MESES_12: "12 meses",
  MESES_24: "24 meses",
};

const FRECUENCIA_LABELS: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

const FRECUENCIA_DIVISOR: Record<string, number> = {
  MENSUAL: 1,
  QUINCENAL: 2,
  SEMANAL: 4.33,
};

export default function SimuladorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fetchingMaint, setFetchingMaint] = useState(false);

  // Form fields
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [valorMoto, setValorMoto] = useState<number>(0);
  const [condicion, setCondicion] = useState("NUEVA");
  const [plan, setPlan] = useState("MESES_12");
  const [frecuencia, setFrecuencia] = useState("MENSUAL");

  // Cost inputs
  const [costoAmortizacion, setCostoAmortizacion] = useState<number>(0);
  const [costoMantenimiento, setCostoMantenimiento] = useState<number>(0);
  const [costoSeguro, setCostoSeguro] = useState<number>(0);
  const [costoPatente, setCostoPatente] = useState<number>(0);
  const [costoOperativo, setCostoOperativo] = useState<number>(0);
  const [margenPct, setMargenPct] = useState<number>(15);

  // Auto-calculate amortization when value or plan changes
  useEffect(() => {
    if (valorMoto > 0 && plan) {
      const months = PLAN_MONTHS[plan] ?? 12;
      setCostoAmortizacion(Math.round(valorMoto / months));
    }
  }, [valorMoto, plan]);

  // Fetch maintenance cost
  const fetchMantenimiento = useCallback(async () => {
    if (!marca || !modelo) return;
    setFetchingMaint(true);
    try {
      const res = await fetch(
        `/api/costos/mantenimiento-mensual?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.data?.costoMensualEstimado) {
          setCostoMantenimiento(json.data.costoMensualEstimado);
        }
      }
    } catch {
      // silently fail
    } finally {
      setFetchingMaint(false);
    }
  }, [marca, modelo]);

  // Calculations
  const costoTotalMensual =
    costoAmortizacion + costoMantenimiento + costoSeguro + costoPatente + costoOperativo;
  const margenDecimal = margenPct / 100;
  const precioMensual = Math.round(costoTotalMensual * (1 + margenDecimal));
  const divisor = FRECUENCIA_DIVISOR[frecuencia] ?? 1;
  const precioPorFrecuencia = Math.round(precioMensual / divisor);
  const proyeccionAnual = precioMensual * 12;

  // Cost breakdown for bar chart
  const costComponents = [
    { label: "Amortizacion", value: costoAmortizacion, color: "bg-sky-500" },
    { label: "Mantenimiento", value: costoMantenimiento, color: "bg-emerald-500" },
    { label: "Seguro", value: costoSeguro, color: "bg-amber-500" },
    { label: "Patente", value: costoPatente, color: "bg-violet-500" },
    { label: "Operativo", value: costoOperativo, color: "bg-rose-500" },
  ];
  const maxCost = Math.max(...costComponents.map((c) => c.value), 1);

  async function handleSave() {
    if (!marca || !modelo || precioPorFrecuencia <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tarifas-alquiler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca,
          modelo,
          condicion,
          plan,
          frecuencia,
          precio: precioPorFrecuencia,
          costoAmortizacion,
          costoMantenimiento,
          costoSeguro: costoSeguro || null,
          costoPatente: costoPatente || null,
          costoOperativo: costoOperativo || null,
          margenPct: margenDecimal,
        }),
      });
      if (res.ok) {
        router.push("/admin/tarifas-alquiler");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulador de Tarifa"
        description="Calcula el precio de alquiler en base a costos y margen"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving || !marca || !modelo || precioPorFrecuencia <= 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Guardar como Tarifa
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -- Left: Inputs -- */}
        <div className="space-y-6">
          {/* Vehicle info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del Vehiculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Marca *</Label>
                  <Input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Honda"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo *</Label>
                  <Input
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="CB 190R"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Valor de la Moto (precio compra)</Label>
                <Input
                  type="number"
                  value={valorMoto || ""}
                  onChange={(e) =>
                    setValorMoto(parseFloat(e.target.value) || 0)
                  }
                  className="font-mono tabular-nums"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Condicion</Label>
                  <Select value={condicion} onValueChange={setCondicion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUEVA">Nueva</SelectItem>
                      <SelectItem value="USADA">Usada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Frecuencia</Label>
                  <Select value={frecuencia} onValueChange={setFrecuencia}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FRECUENCIA_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Componentes de Costo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Amortizacion (mensual)</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Auto: valor / {PLAN_MONTHS[plan]} meses
                  </span>
                </div>
                <Input
                  type="number"
                  value={costoAmortizacion || ""}
                  onChange={(e) =>
                    setCostoAmortizacion(parseFloat(e.target.value) || 0)
                  }
                  className="font-mono tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Mantenimiento (mensual)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={fetchMantenimiento}
                    disabled={!marca || !modelo || fetchingMaint}
                  >
                    {fetchingMaint ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Calculator className="h-3 w-3 mr-1" />
                    )}
                    Auto-calcular
                  </Button>
                </div>
                <Input
                  type="number"
                  value={costoMantenimiento || ""}
                  onChange={(e) =>
                    setCostoMantenimiento(parseFloat(e.target.value) || 0)
                  }
                  className="font-mono tabular-nums"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Seguro</Label>
                  <Input
                    type="number"
                    value={costoSeguro || ""}
                    onChange={(e) =>
                      setCostoSeguro(parseFloat(e.target.value) || 0)
                    }
                    className="font-mono tabular-nums h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Patente</Label>
                  <Input
                    type="number"
                    value={costoPatente || ""}
                    onChange={(e) =>
                      setCostoPatente(parseFloat(e.target.value) || 0)
                    }
                    className="font-mono tabular-nums h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Operativo</Label>
                  <Input
                    type="number"
                    value={costoOperativo || ""}
                    onChange={(e) =>
                      setCostoOperativo(parseFloat(e.target.value) || 0)
                    }
                    className="font-mono tabular-nums h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Margen (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={margenPct}
                  onChange={(e) =>
                    setMargenPct(parseFloat(e.target.value) || 0)
                  }
                  className="font-mono tabular-nums"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* -- Right: Preview -- */}
        <div className="space-y-6">
          {/* Price result */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Precio Calculado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {FRECUENCIA_LABELS[frecuencia]}
                </p>
                <p className="text-4xl font-bold font-mono tabular-nums tracking-tight">
                  {formatMoney(precioPorFrecuencia)}
                </p>
                {frecuencia !== "MENSUAL" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Equivalente mensual:{" "}
                    <span className="font-mono tabular-nums font-medium">
                      {formatMoney(precioMensual)}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Costo Mensual
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums">
                    {formatMoney(costoTotalMensual)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Ganancia Mensual
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(precioMensual - costoTotalMensual)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Proyeccion Anual
                  </span>
                </div>
                <span className="text-lg font-bold font-mono tabular-nums">
                  {formatMoney(proyeccionAnual)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cost breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desglose de Costos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {costComponents.map((c) => (
                <div key={c.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="font-mono tabular-nums font-medium">
                      {formatMoney(c.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.color} transition-all duration-300`}
                      style={{
                        width: `${maxCost > 0 ? (c.value / maxCost) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Subtotal Costos</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatMoney(costoTotalMensual)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="font-medium">
                    Margen ({margenPct}%)
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(Math.round(costoTotalMensual * margenDecimal))}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="font-semibold">Total Mensual</span>
                  <span className="text-lg font-bold font-mono tabular-nums">
                    {formatMoney(precioMensual)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
