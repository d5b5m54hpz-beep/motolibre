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
import { TrendingUp } from "lucide-react";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface ER {
  periodo: { desde: string; hasta: string };
  ingresos: { alquiler: number; ventaMotos: number; repuestos: number; otros: number; total: number };
  costos: { depreciacion: number; mantenimiento: number; seguros: number; total: number };
  resultadoBruto: number;
  gastos: { administrativos: number; bancarios: number; impuestos: number; otros: number; total: number };
  resultadoNeto: number;
}

function formatContable(value: number, negative = false): string {
  if (negative && value > 0) return `(${formatMoney(value)})`;
  return formatMoney(value);
}

export default function EstadoResultadosPage() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ER | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finanzas/estado-resultados?anio=${anio}&mes=${mes}`);
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  }, [anio, mes]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estado de Resultados"
        description="Ingresos menos egresos por período"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estado de Resultados — {MESES[mes]} {anio}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !data ? (
            <div className="text-center py-8 text-muted-foreground">Sin datos</div>
          ) : (
            <div className="font-mono text-sm space-y-1 max-w-lg">
              {/* INGRESOS */}
              <div className="border-b-2 border-foreground pb-1 mb-2">
                <p className="font-bold text-base">ESTADO DE RESULTADOS</p>
                <p className="text-muted-foreground text-xs">Período: {MESES[mes]} {anio}</p>
              </div>

              <p className="font-bold mt-4">INGRESOS</p>
              <Row label="Ingresos por Alquiler" value={data.ingresos.alquiler} />
              <Row label="Ingresos por Venta de Motos" value={data.ingresos.ventaMotos} />
              <Row label="Ingresos por Repuestos" value={data.ingresos.repuestos} />
              <Row label="Otros Ingresos" value={data.ingresos.otros} />
              <Divider />
              <TotalRow label="TOTAL INGRESOS" value={data.ingresos.total} />

              <p className="font-bold mt-4">COSTOS OPERATIVOS</p>
              <Row label="Depreciación" value={data.costos.depreciacion} negative />
              <Row label="Mantenimiento" value={data.costos.mantenimiento} negative />
              <Row label="Seguros" value={data.costos.seguros} negative />
              <Divider />
              <TotalRow label="TOTAL COSTOS" value={data.costos.total} negative />

              <div className="py-1" />
              <TotalRow label="RESULTADO BRUTO" value={data.resultadoBruto} highlight />

              <p className="font-bold mt-4">GASTOS DE ADMINISTRACIÓN</p>
              <Row label="Gastos Administrativos" value={data.gastos.administrativos} negative />
              <Row label="Gastos Bancarios" value={data.gastos.bancarios} negative />
              <Row label="Impuestos y Tasas" value={data.gastos.impuestos} negative />
              <Row label="Otros Egresos" value={data.gastos.otros} negative />
              <Divider />
              <TotalRow label="TOTAL GASTOS" value={data.gastos.total} negative />

              <div className="border-t-2 border-b-2 border-foreground py-2 mt-4">
                <div className="flex justify-between">
                  <span className="font-bold">RESULTADO NETO</span>
                  <span className={`font-bold ${data.resultadoNeto >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatContable(data.resultadoNeto)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between py-0.5 pl-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{negative ? formatContable(value, true) : formatMoney(value)}</span>
    </div>
  );
}

function TotalRow({ label, value, negative = false, highlight = false }: { label: string; value: number; negative?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1 font-bold ${highlight ? "text-blue-500" : ""}`}>
      <span>{label}</span>
      <span>{negative ? formatContable(value, true) : formatMoney(value)}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-muted-foreground/30 my-1 ml-4" />;
}
