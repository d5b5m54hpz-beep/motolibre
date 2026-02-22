"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { Target, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface MotoRent {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  estado: string;
  ingresoTotal: number;
  ingresoMensualPromedio: number;
  mesesAlquilada: number;
  costoCompra: number;
  costoMantenimiento: number;
  costoSeguro: number;
  depreciacionAcumulada: number;
  costoTotal: number;
  resultadoNeto: number;
  margenNeto: number;
  roiMoto: number;
  mesesParaRecuperar: number;
  recuperada: boolean;
}

interface Resumen {
  totalMotos: number;
  motosRentables: number;
  margenPromedioFlota: number;
  motoMasRentable: string;
  motoMenosRentable: string;
}

export default function RentabilidadPage() {
  const [motos, setMotos] = useState<MotoRent[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/finanzas/rentabilidad");
    if (res.ok) {
      const json = await res.json();
      setMotos(json.data.motos);
      setResumen(json.data.resumen);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Chart data: sorted by resultado neto
  const chartData = [...motos]
    .sort((a, b) => b.resultadoNeto - a.resultadoNeto)
    .slice(0, 20)
    .map((m) => ({
      name: m.patente,
      resultado: m.resultadoNeto,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rentabilidad por Moto"
        description="Ingreso vs costos por cada moto de la flota"
      />

      {loading ? (
        <div className="text-center py-12 text-t-secondary">Cargando...</div>
      ) : (
        <>
          {/* Summary cards */}
          {resumen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-t-secondary">Total Motos</p>
                  <p className="text-2xl font-bold text-t-primary">{resumen.totalMotos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-t-secondary">Motos Rentables</p>
                  <p className="text-2xl font-bold text-positive">
                    {resumen.motosRentables} / {resumen.totalMotos}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-t-secondary">Margen Promedio</p>
                  <p className={`text-2xl font-bold ${resumen.margenPromedioFlota >= 0 ? "text-positive" : "text-negative"}`}>
                    {resumen.margenPromedioFlota.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-t-secondary">Más Rentable</p>
                  <p className="text-lg font-bold text-positive flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {resumen.motoMasRentable}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Resultado Neto por Moto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 35)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid stroke="#1E1E2A" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#44445A", fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#13131A", border: "1px solid #1E1E2A", borderRadius: "12px", color: "#FFFFFF" }}
                      formatter={(value) => formatMoney(Number(value))}
                    />
                    <Bar dataKey="resultado" name="Resultado Neto" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.resultado >= 0 ? "#00D68F" : "#FF4D6A"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Detalle por Moto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {motos.length === 0 ? (
                <p className="text-center py-8 text-t-secondary">No hay motos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-t-secondary">Moto</th>
                        <th className="text-center py-3 px-2 font-medium text-t-secondary">Estado</th>
                        <th className="text-right py-3 px-2 font-medium text-t-secondary">Ingreso</th>
                        <th className="text-right py-3 px-2 font-medium text-t-secondary">Costo Total</th>
                        <th className="text-right py-3 px-2 font-medium text-t-secondary">Resultado</th>
                        <th className="text-right py-3 px-2 font-medium text-t-secondary">Margen</th>
                        <th className="text-right py-3 px-2 font-medium text-t-secondary">ROI</th>
                        <th className="text-center py-3 px-2 font-medium text-t-secondary">Recuperada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {motos.map((m) => (
                        <>
                          <tr
                            key={m.id}
                            className="border-b border-border hover:bg-bg-card-hover transition-colors cursor-pointer"
                            onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          >
                            <td className="py-3 px-2">
                              <div className="font-medium text-t-primary">{m.marca} {m.modelo}</div>
                              <div className="text-xs text-t-tertiary">{m.patente}</div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Badge variant="outline" className="text-xs">{m.estado}</Badge>
                            </td>
                            <td className="py-3 px-2 text-right font-mono">{formatMoney(m.ingresoTotal)}</td>
                            <td className="py-3 px-2 text-right font-mono">{formatMoney(m.costoTotal)}</td>
                            <td className={`py-3 px-2 text-right font-mono font-bold ${m.resultadoNeto >= 0 ? "text-positive" : "text-negative"}`}>
                              {formatMoney(m.resultadoNeto)}
                            </td>
                            <td className={`py-3 px-2 text-right font-mono ${m.margenNeto >= 0 ? "text-positive" : "text-negative"}`}>
                              {m.margenNeto.toFixed(1)}%
                            </td>
                            <td className={`py-3 px-2 text-right font-mono ${m.roiMoto >= 0 ? "text-positive" : "text-negative"}`}>
                              {m.roiMoto.toFixed(1)}%
                            </td>
                            <td className="py-3 px-2 text-center">
                              {m.recuperada ? (
                                <Badge className="bg-positive-bg text-positive border-positive/20">Si</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-negative-bg text-negative border-negative/20">No</Badge>
                              )}
                            </td>
                          </tr>
                          {expandedId === m.id && (
                            <tr key={`${m.id}-detail`} className="bg-bg-card-hover">
                              <td colSpan={8} className="py-3 px-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className="text-t-secondary">Costo Compra</p>
                                    <p className="font-mono font-bold text-t-primary">{formatMoney(m.costoCompra)}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Mantenimiento</p>
                                    <p className="font-mono font-bold text-t-primary">{formatMoney(m.costoMantenimiento)}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Seguro</p>
                                    <p className="font-mono font-bold text-t-primary">{formatMoney(m.costoSeguro)}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Depreciación Acum.</p>
                                    <p className="font-mono font-bold text-t-primary">{formatMoney(m.depreciacionAcumulada)}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Meses Alquilada</p>
                                    <p className="font-mono font-bold text-t-primary">{m.mesesAlquilada}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Ingreso Mensual Prom.</p>
                                    <p className="font-mono font-bold text-t-primary">{formatMoney(m.ingresoMensualPromedio)}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Meses para Recuperar</p>
                                    <p className="font-mono font-bold text-t-primary">{m.mesesParaRecuperar > 0 ? `${m.mesesParaRecuperar.toFixed(0)} meses` : "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-t-secondary">Recuperación</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="w-full bg-bg-input rounded-full h-2.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${m.recuperada ? "bg-positive" : "bg-warning"}`}
                                          style={{ width: `${Math.min(100, m.costoCompra > 0 ? (m.ingresoTotal / m.costoCompra) * 100 : 0)}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-mono text-t-secondary">
                                        {m.costoCompra > 0 ? `${((m.ingresoTotal / m.costoCompra) * 100).toFixed(0)}%` : "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
