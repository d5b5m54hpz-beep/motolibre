"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertTriangle, ShieldAlert, Play, Eye, CheckCircle2,
  BarChart3, Loader2,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

interface Anomalia {
  id: string;
  tipo: string;
  severidad: string;
  estado: string;
  entidadTipo: string;
  entidadId: string;
  entidadLabel: string | null;
  titulo: string;
  descripcion: string;
  valorDetectado: number | null;
  valorEsperado: number | null;
  algoritmo: string;
  createdAt: string;
}

interface Resumen {
  total: number;
  nuevas: number;
  enRevision: number;
  resueltasMes: number;
  descartadasMes: number;
  ultimoAnalisis: {
    fecha: string;
    anomaliasDetectadas: number;
    duracionMs: number;
  } | null;
}

const SEVERIDAD_CONFIG: Record<string, { color: string; icon: string; order: number }> = {
  CRITICA: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: "🔴", order: 0 },
  ALTA: { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: "🟠", order: 1 },
  MEDIA: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: "🟡", order: 2 },
  BAJA: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "🔵", order: 3 },
};

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  NUEVA: { color: "bg-red-500/10 text-red-400", label: "Nueva" },
  EN_REVISION: { color: "bg-yellow-500/10 text-yellow-400", label: "En Revisión" },
  RESUELTA: { color: "bg-green-500/10 text-green-400", label: "Resuelta" },
  DESCARTADA: { color: "bg-zinc-500/10 text-zinc-400", label: "Descartada" },
};

const TIPO_LABELS: Record<string, string> = {
  GASTO_INUSUAL: "Gasto Inusual",
  PAGO_DUPLICADO: "Pago Duplicado",
  FACTURA_SIN_PAGO: "Factura Sin Pago",
  MARGEN_BAJO: "Margen Bajo",
  STOCK_CRITICO: "Stock Crítico",
  DESVIO_PRESUPUESTO: "Desvío Presupuesto",
  FLUJO_CAJA_NEGATIVO: "Flujo Caja Negativo",
  VENCIMIENTO_PROXIMO: "Vencimiento Próximo",
  PATRON_SOSPECHOSO: "Patrón Sospechoso",
};

export default function AnomaliasPage() {
  const router = useRouter();
  const [anomalias, setAnomalias] = useState<Anomalia[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroSeveridad) params.set("severidad", filtroSeveridad);
    if (filtroEstado) params.set("estado", filtroEstado);
    params.set("limit", "100");

    const [anomRes, resumenRes] = await Promise.all([
      fetch(`/api/anomalias?${params}`),
      fetch("/api/anomalias/resumen"),
    ]);

    if (anomRes.ok) {
      const d = await anomRes.json();
      setAnomalias(d.data);
      setTotal(d.total);
    }
    if (resumenRes.ok) {
      const d = await resumenRes.json();
      setResumen(d.data);
    }
    setLoading(false);
  }, [filtroTipo, filtroSeveridad, filtroEstado]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function ejecutarAnalisis() {
    setEjecutando(true);
    const res = await fetch("/api/anomalias/ejecutar", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      toast.success(`Análisis completado: ${d.data.nuevas} anomalías nuevas detectadas (${d.data.duracionMs}ms)`);
      void fetchData();
    } else {
      toast.error("Error al ejecutar análisis");
    }
    setEjecutando(false);
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Detección de Anomalías"
        description="Monitoreo automático de anomalías financieras y operativas"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-t-tertiary">Nuevas</p>
                <p className="text-2xl font-display font-extrabold tracking-tighter text-t-primary">
                  {resumen?.nuevas ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/10">
                <Eye className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-t-tertiary">En Revisión</p>
                <p className="text-2xl font-display font-extrabold tracking-tighter text-t-primary">
                  {resumen?.enRevision ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-t-tertiary">Resueltas (mes)</p>
                <p className="text-2xl font-display font-extrabold tracking-tighter text-t-primary">
                  {resumen?.resueltasMes ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-t-tertiary">Último Análisis</p>
                <p className="text-sm font-medium text-t-primary">
                  {resumen?.ultimoAnalisis
                    ? `${timeAgo(resumen.ultimoAnalisis.fecha)} — ${resumen.ultimoAnalisis.anomaliasDetectadas} detectadas`
                    : "Nunca ejecutado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={ejecutarAnalisis}
          disabled={ejecutando}
          className="bg-accent hover:bg-accent/90"
        >
          {ejecutando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Ejecutar Análisis
        </Button>

        <div className="flex-1" />

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px] bg-bg-input border-border">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroSeveridad} onValueChange={setFiltroSeveridad}>
          <SelectTrigger className="w-[150px] bg-bg-input border-border">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
            <SelectItem value="ALTA">🟠 Alta</SelectItem>
            <SelectItem value="MEDIA">🟡 Media</SelectItem>
            <SelectItem value="BAJA">🔵 Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[150px] bg-bg-input border-border">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="NUEVA">Nueva</SelectItem>
            <SelectItem value="EN_REVISION">En Revisión</SelectItem>
            <SelectItem value="RESUELTA">Resuelta</SelectItem>
            <SelectItem value="DESCARTADA">Descartada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-bg-card/80 backdrop-blur-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                <th className="text-left p-4">Severidad</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Título</th>
                <th className="text-left p-4">Entidad</th>
                <th className="text-right p-4">Detectado</th>
                <th className="text-right p-4">Esperado</th>
                <th className="text-left p-4">Estado</th>
                <th className="text-left p-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-t-tertiary">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Cargando...
                  </td>
                </tr>
              ) : anomalias.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-t-tertiary">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No se encontraron anomalías
                  </td>
                </tr>
              ) : (
                anomalias.map((a) => {
                  const sev = SEVERIDAD_CONFIG[a.severidad] ?? { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "🔵", order: 3 };
                  const est = ESTADO_CONFIG[a.estado] ?? { color: "bg-red-500/10 text-red-400", label: "Nueva" };

                  return (
                    <tr
                      key={a.id}
                      className="border-b border-border/50 hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/anomalias/${a.id}`)}
                    >
                      <td className="p-4">
                        <Badge variant="outline" className={`${sev.color} text-xs`}>
                          {sev.icon} {a.severidad}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-bg-input/50 text-t-secondary text-xs border-border">
                          {TIPO_LABELS[a.tipo] || a.tipo}
                        </Badge>
                      </td>
                      <td className="p-4 max-w-[300px]">
                        <span className="text-t-primary font-medium truncate block">{a.titulo}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-t-secondary text-xs">{a.entidadLabel || a.entidadTipo}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-t-primary">
                        {a.valorDetectado != null ? (
                          a.tipo === "MARGEN_BAJO" ? `${a.valorDetectado}%` : formatMoney(a.valorDetectado)
                        ) : "—"}
                      </td>
                      <td className="p-4 text-right font-mono text-t-tertiary">
                        {a.valorEsperado != null ? (
                          a.tipo === "MARGEN_BAJO" ? `${a.valorEsperado}%` : formatMoney(a.valorEsperado)
                        ) : "—"}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`${est.color} text-xs`}>
                          {est.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-t-tertiary text-xs whitespace-nowrap">
                        {formatDateTime(a.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-t-tertiary">
            {total} anomalía{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </div>
        )}
      </Card>
    </div>
  );
}
