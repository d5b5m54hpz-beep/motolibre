"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight,
  ArrowDownRight, CreditCard, Receipt, Minus,
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

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];
const EGRESO_COLORS = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#ec4899"];

export default function FinanzasDashboardPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [er, setER] = useState<EstadoResultados | null>(null);
  const [flujo, setFlujo] = useState<FlujoCaja | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard Financiero" description="Vista ejecutiva de finanzas" />
        <div className="text-center py-12 text-muted-foreground">Cargando datos financieros...</div>
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

  function VariationBadge({ value }: { value: number }) {
    if (value === 0) return <span className="text-xs text-muted-foreground flex items-center"><Minus className="h-3 w-3 mr-1" /> 0%</span>;
    return value > 0
      ? <span className="text-xs text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" /> +{value.toFixed(1)}%</span>
      : <span className="text-xs text-red-500 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" /> {value.toFixed(1)}%</span>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Financiero" description="Vista ejecutiva de finanzas — MotoLibre S.A." />

      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                <p className="text-2xl font-bold">{formatMoney(resumen.ingresosMes)}</p>
                <VariationBadge value={resumen.variacionIngresos} />
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Egresos del Mes</p>
                <p className="text-2xl font-bold">{formatMoney(resumen.egresosMes)}</p>
                <VariationBadge value={resumen.variacionEgresos} />
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Neto</p>
                <p className={`text-2xl font-bold ${resumen.resultadoNeto >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatMoney(resumen.resultadoNeto)}
                </p>
                <p className="text-xs text-muted-foreground">Ant: {formatMoney(resumen.resultadoMesAnterior)}</p>
              </div>
              <DollarSign className={`h-8 w-8 ${resumen.resultadoNeto >= 0 ? "text-emerald-500" : "text-red-500"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponible</p>
                <p className="text-2xl font-bold">{formatMoney(saldoDisponible)}</p>
                <p className="text-xs text-muted-foreground">Caja + MP + Banco</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value) => formatMoney(Number(value))}
                />
                <Area type="monotone" dataKey="entradas" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Entradas" />
                <Area type="monotone" dataKey="salidas" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Salidas" />
                <Area type="monotone" dataKey="saldo" stroke="#3b82f6" fill="none" strokeWidth={2} name="Saldo" />
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
              <p className="text-center py-8 text-muted-foreground">Sin ingresos en el período</p>
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
              <p className="text-center py-8 text-muted-foreground">Sin egresos en el período</p>
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
              <p className="text-sm text-muted-foreground">Margen Operativo</p>
              <p className={`text-2xl font-bold ${indicadores.margenOperativo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {indicadores.margenOperativo.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Ocupación Flota</p>
              <p className="text-2xl font-bold text-blue-500">{indicadores.tasaOcupacion.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Morosidad</p>
              <p className={`text-2xl font-bold ${indicadores.tasaMorosidad > 10 ? "text-red-500" : "text-emerald-500"}`}>
                {indicadores.tasaMorosidad.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Ejec. Presupuestaria</p>
              <p className={`text-2xl font-bold ${indicadores.ejecucionPresupuestaria > 100 ? "text-red-500" : "text-blue-500"}`}>
                {indicadores.ejecucionPresupuestaria.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 5: Accounts receivable/payable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/contratos">
          <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Cuentas por Cobrar</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatMoney(resumen.cuentasPorCobrar)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/facturas-compra?estado=PENDIENTE">
          <Card className="hover:border-red-500/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Cuentas por Pagar</p>
                  <p className="text-2xl font-bold text-red-500">{formatMoney(resumen.cuentasPorPagar)}</p>
                </div>
                <Receipt className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
