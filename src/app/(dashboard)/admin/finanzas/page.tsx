"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight,
  ArrowDownRight, CreditCard, Receipt, Minus, Sparkles, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface Resumen {
  ingresosMes: number;
  ingresosMesAnterior: number;
  variacionIngresos: number;
  egresosMes: number;
  egresosMesAnterior: number;
  variacionEgresos: number;
  resultadoNeto: number;
  resultadoMesAnterior: number;
  saldoCaja: number;
  saldoMP: number;
  saldoBanco: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;
  facturasEmitidasMes: number;
  totalFacturadoMes: number;
}

interface Indicadores {
  margenOperativo: number;
  tasaOcupacion: number;
  tasaMorosidad: number;
  ejecucionPresupuestaria: number;
}

interface EstadoResultados {
  ingresos: { alquiler: number; ventaMotos: number; repuestos: number; otros: number; total: number };
  costos: { total: number };
  gastos: { administrativos: number; bancarios: number; impuestos: number; otros: number; total: number };
}

interface FlujoCaja {
  diario: Array<{ fecha: string; entradas: number; salidas: number; saldo: number }>;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border-base)",
  borderRadius: "12px",
  color: "var(--text-primary)",
};

const COLORS = ["#00D68F", "#4DA6FF", "#FFB020", "#7B61FF"];
const EGRESO_COLORS = ["#FF4D6A", "#FF8C42", "#FFB020", "#7B61FF", "#EC4899"];

function VariationBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-t-tertiary flex items-center"><Minus className="h-3 w-3 mr-1" /> 0%</span>;
  return value > 0
    ? <span className="text-xs text-positive flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" /> +{value.toFixed(1)}%</span>
    : <span className="text-xs text-negative flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" /> {value.toFixed(1)}%</span>;
}

export default function FinanzasDashboardPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [er, setER] = useState<EstadoResultados | null>(null);
  const [flujo, setFlujo] = useState<FlujoCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const fetchAll = useCallback(async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      fetch("/api/finanzas/resumen"),
      fetch("/api/finanzas/indicadores"),
      fetch("/api/finanzas/estado-resultados"),
      fetch("/api/finanzas/flujo-caja"),
    ]);
    if (r1.ok) { const j = await r1.json(); setResumen(j.data); }
    if (r2.ok) { const j = await r2.json(); setIndicadores(j.data); }
    if (r3.ok) { const j = await r3.json(); setER(j.data); }
    if (r4.ok) { const j = await r4.json(); setFlujo(j.data); }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleAnalyzeAI() {
    if (!resumen || !indicadores) return;
    setAnalyzingAI(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ai/finanzas-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumen, indicadores, er }),
      });
      if (res.ok) {
        const j = await res.json();
        setAiAnalysis(j.data.analysis);
      }
    } finally {
      setAnalyzingAI(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard Financiero" description="Vista ejecutiva de finanzas" />
        <div className="text-center py-12 text-t-secondary">Cargando datos financieros...</div>
      </div>
    );
  }

  if (!resumen) return null;

  const saldoDisponible = resumen.saldoCaja + resumen.saldoMP + resumen.saldoBanco;

  // Income pie data
  const ingresosPie = er ? [
    { name: "Alquiler", value: er.ingresos.alquiler },
    { name: "Venta Motos", value: er.ingresos.ventaMotos },
    { name: "Repuestos", value: er.ingresos.repuestos },
    { name: "Otros", value: er.ingresos.otros },
  ].filter((d) => d.value > 0) : [];

  const egresosPie = er ? [
    { name: "Costos Op.", value: er.costos.total },
    { name: "Administrativos", value: er.gastos.administrativos },
    { name: "Bancarios", value: er.gastos.bancarios },
    { name: "Impuestos", value: er.gastos.impuestos },
    { name: "Otros", value: er.gastos.otros },
  ].filter((d) => d.value > 0) : [];

  const flujoDiario = flujo?.diario.map((d) => ({
    ...d,
    fecha: d.fecha.slice(8, 10),
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <PageHeader title="Dashboard Financiero" description="Vista ejecutiva de finanzas — MotoLibre S.A." />
        <div className="sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeAI}
            disabled={analyzingAI || !resumen}
            className="border-accent-DEFAULT/30 text-accent-DEFAULT hover:bg-accent-DEFAULT/10"
          >
            {analyzingAI
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            }
            Analizar con IA
          </Button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-bg-card rounded-2xl border border-accent-DEFAULT/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent-DEFAULT" />
            <span className="text-sm font-semibold text-accent-DEFAULT">Análisis CFO — MotoLibre</span>
          </div>
          <div className="text-sm text-t-secondary whitespace-pre-wrap leading-relaxed">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-t-primary">{formatMoney(resumen.ingresosMes)}</p>
                <VariationBadge value={resumen.variacionIngresos} />
              </div>
              <TrendingUp className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Egresos del Mes</p>
                <p className="text-2xl font-bold text-t-primary">{formatMoney(resumen.egresosMes)}</p>
                <VariationBadge value={resumen.variacionEgresos} />
              </div>
              <TrendingDown className="h-8 w-8 text-negative" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Resultado Neto</p>
                <p className={`text-2xl font-bold ${resumen.resultadoNeto >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatMoney(resumen.resultadoNeto)}
                </p>
                <p className="text-xs text-t-tertiary">Ant: {formatMoney(resumen.resultadoMesAnterior)}</p>
              </div>
              <DollarSign className={`h-8 w-8 ${resumen.resultadoNeto >= 0 ? "text-positive" : "text-negative"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Saldo Disponible</p>
                <p className="text-2xl font-bold text-t-primary">{formatMoney(saldoDisponible)}</p>
                <p className="text-xs text-t-tertiary">Caja + MP + Banco</p>
              </div>
              <Wallet className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Cash flow chart */}
      {flujoDiario.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Flujo de Caja Diario</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={flujoDiario}>
                <CartesianGrid stroke="var(--border-base)" strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="fecha" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
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
                <Area type="monotone" dataKey="entradas" stackId="1" stroke="#00D68F" fill="url(#colorEntradas)" name="Entradas" />
                <Area type="monotone" dataKey="salidas" stackId="2" stroke="#FF4D6A" fill="url(#colorSalidas)" name="Salidas" />
                <Area type="monotone" dataKey="saldo" stroke="#4DA6FF" fill="none" strokeWidth={2} name="Saldo" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 3: Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {ingresosPie.length === 0 ? (
              <p className="text-center py-8 text-t-secondary">Sin ingresos en el período</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={ingresosPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${formatMoney(e.value)}`}>
                    {ingresosPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            {egresosPie.length === 0 ? (
              <p className="text-center py-8 text-t-secondary">Sin egresos en el período</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={egresosPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${formatMoney(e.value)}`}>
                    {egresosPie.map((_, i) => <Cell key={i} fill={EGRESO_COLORS[i % EGRESO_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Indicator cards */}
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-t-secondary">Margen Operativo</p>
              <p className={`text-2xl font-bold ${indicadores.margenOperativo >= 0 ? "text-positive" : "text-negative"}`}>
                {indicadores.margenOperativo.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-t-secondary">Ocupación Flota</p>
              <p className="text-2xl font-bold text-ds-info">{indicadores.tasaOcupacion.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-t-secondary">Morosidad</p>
              <p className={`text-2xl font-bold ${indicadores.tasaMorosidad > 10 ? "text-negative" : "text-positive"}`}>
                {indicadores.tasaMorosidad.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-t-secondary">Ejec. Presupuestaria</p>
              <p className={`text-2xl font-bold ${indicadores.ejecucionPresupuestaria > 100 ? "text-negative" : "text-ds-info"}`}>
                {indicadores.ejecucionPresupuestaria.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 5: Accounts receivable/payable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/contratos">
          <Card className="hover:border-positive/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-t-secondary">Cuentas por Cobrar</p>
                  <p className="text-2xl font-bold text-positive">{formatMoney(resumen.cuentasPorCobrar)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-positive" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/facturas-compra?estado=PENDIENTE">
          <Card className="hover:border-negative/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-t-secondary">Cuentas por Pagar</p>
                  <p className="text-2xl font-bold text-negative">{formatMoney(resumen.cuentasPorPagar)}</p>
                </div>
                <Receipt className="h-8 w-8 text-negative" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
