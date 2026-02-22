"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { ArrowUpDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface FlujoCaja {
  periodo: { desde: string; hasta: string };
  saldoInicial: number;
  entradas: { cobrosAlquiler: number; otrosIngresos: number; total: number };
  salidas: { pagosProveedores: number; gastos: number; refunds: number; total: number };
  flujoNeto: number;
  saldoFinal: number;
  diario: Array<{ fecha: string; entradas: number; salidas: number; saldo: number }>;
}

export default function FlujoCajaPage() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<FlujoCaja | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finanzas/flujo-caja?anio=${anio}&mes=${mes}`);
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  }, [anio, mes]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const chartData = data?.diario.map((d) => ({
    ...d,
    fecha: d.fecha.slice(8, 10),
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flujo de Caja"
        description="Entradas y salidas de efectivo por período"
      />

      {/* Period selector */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <Label>Año</Label>
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Mes</Label>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-t-secondary">Cargando...</div>
      ) : !data ? (
        <div className="text-center py-8 text-t-secondary">Sin datos</div>
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Flujo Diario — {MESES[mes]} {anio}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid stroke="#1E1E2A" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="fecha" tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#13131A", border: "1px solid #1E1E2A", borderRadius: "12px", color: "#FFFFFF" }}
                      formatter={(value) => formatMoney(Number(value))}
                    />
                    <defs>
                      <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D68F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D68F" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4D6A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF4D6A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="entradas" stroke="#00D68F" fill="url(#colorEntradas)" name="Entradas" />
                    <Area type="monotone" dataKey="salidas" stroke="#FF4D6A" fill="url(#colorSalidas)" name="Salidas" />
                    <Area type="monotone" dataKey="saldo" stroke="#4DA6FF" fill="none" strokeWidth={2} name="Saldo" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Resumen — {MESES[mes]} {anio}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm max-w-md space-y-1">
                <FlowRow label="Saldo Inicial" value={data.saldoInicial} />
                <FlowRow label="+ Cobros Alquiler" value={data.entradas.cobrosAlquiler} positive />
                <FlowRow label="+ Otros Ingresos" value={data.entradas.otrosIngresos} positive />
                <FlowRow label="- Pagos Proveedores" value={data.salidas.pagosProveedores} negative />
                <FlowRow label="- Gastos Operativos" value={data.salidas.gastos} negative />
                <FlowRow label="- Devoluciones" value={data.salidas.refunds} negative />
                <div className="border-t border-border my-2" />
                <FlowRow label="Flujo Neto" value={data.flujoNeto} bold highlight />
                <FlowRow label="Saldo Final" value={data.saldoFinal} bold />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function FlowRow({
  label,
  value,
  positive = false,
  negative = false,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  let color = "";
  if (highlight) color = value >= 0 ? "text-positive" : "text-negative";
  else if (positive) color = "text-positive/70";
  else if (negative) color = "text-negative/70";

  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-bold" : ""}`}>
      <span className={negative || positive ? "text-t-secondary" : ""}>{label}</span>
      <span className={color}>
        {negative && value > 0 ? `(${formatMoney(value)})` : formatMoney(value)}
      </span>
    </div>
  );
}
