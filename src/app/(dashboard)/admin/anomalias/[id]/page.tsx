"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, XCircle, Eye, AlertTriangle,
  ShieldAlert, TrendingDown, TrendingUp, Loader2,
} from "lucide-react";

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
  datosExtra: string | null;
  resueltoPor: string | null;
  resolucion: string | null;
  fechaResolucion: string | null;
  createdAt: string;
  updatedAt: string;
}

const SEVERIDAD_CONFIG: Record<string, { color: string; icon: typeof ShieldAlert; bg: string }> = {
  CRITICA: { color: "text-red-400", icon: ShieldAlert, bg: "bg-red-500/10 border-red-500/20" },
  ALTA: { color: "text-orange-400", icon: AlertTriangle, bg: "bg-orange-500/10 border-orange-500/20" },
  MEDIA: { color: "text-yellow-400", icon: AlertTriangle, bg: "bg-yellow-500/10 border-yellow-500/20" },
  BAJA: { color: "text-blue-400", icon: AlertTriangle, bg: "bg-blue-500/10 border-blue-500/20" },
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

const TIPO_DESCRIPCIONES: Record<string, string> = {
  GASTO_INUSUAL: "Gasto que supera 3x el promedio de la categoría en los últimos 6 meses.",
  PAGO_DUPLICADO: "Dos o más pagos del mismo monto para el mismo contrato dentro de 48 horas.",
  FACTURA_SIN_PAGO: "Factura emitida hace más de 30 días sin pago asociado.",
  MARGEN_BAJO: "Moto con margen operativo inferior al 10% en el mes actual.",
  STOCK_CRITICO: "Repuesto activo con stock agotado (= 0).",
  DESVIO_PRESUPUESTO: "Categoría de gasto ejecutada por encima del 120% del presupuesto mensual.",
  FLUJO_CAJA_NEGATIVO: "Proyección de caja a 7 días muestra saldo negativo.",
  VENCIMIENTO_PROXIMO: "Cuota vencida hace más de 7 días sin gestión de cobro.",
  PATRON_SOSPECHOSO: "Operación registrada en horario inusual (22:00 a 06:00).",
};

export default function AnomaliaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [anomalia, setAnomalia] = useState<Anomalia | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolucionText, setResolucionText] = useState("");
  const [motivoText, setMotivoText] = useState("");
  const [showResolver, setShowResolver] = useState(false);
  const [showDescartar, setShowDescartar] = useState(false);

  const fetchAnomalia = useCallback(async () => {
    const res = await fetch(`/api/anomalias/${id}`);
    if (res.ok) {
      const d = await res.json();
      setAnomalia(d.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void fetchAnomalia(); }, [fetchAnomalia]);

  async function handleAction(action: "revisar" | "resolver" | "descartar") {
    setActionLoading(true);
    let res: Response;

    if (action === "revisar") {
      res = await fetch(`/api/anomalias/${id}/revisar`, { method: "POST" });
    } else if (action === "resolver") {
      res = await fetch(`/api/anomalias/${id}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolucion: resolucionText }),
      });
    } else {
      res = await fetch(`/api/anomalias/${id}/descartar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoText }),
      });
    }

    if (res.ok) {
      toast.success(
        action === "revisar" ? "Marcada en revisión"
          : action === "resolver" ? "Anomalía resuelta"
          : "Anomalía descartada"
      );
      setShowResolver(false);
      setShowDescartar(false);
      void fetchAnomalia();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error al procesar");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!anomalia) {
    return (
      <div className="text-center py-20 text-t-tertiary">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Anomalía no encontrada</p>
        <Button variant="outline" onClick={() => router.push("/admin/anomalias")} className="mt-4">
          Volver al listado
        </Button>
      </div>
    );
  }

  const sev = SEVERIDAD_CONFIG[anomalia.severidad] ?? { color: "text-yellow-400", icon: AlertTriangle, bg: "bg-yellow-500/10 border-yellow-500/20" };
  const SevIcon = sev.icon;
  const datosExtra = anomalia.datosExtra ? JSON.parse(anomalia.datosExtra) : null;
  const isOpen = anomalia.estado === "NUEVA" || anomalia.estado === "EN_REVISION";
  const isMoneyValue = anomalia.tipo !== "MARGEN_BAJO";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/anomalias")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title={anomalia.titulo} description={`Detectada ${formatDateTime(anomalia.createdAt)}`} />
      </div>

      {/* Header badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={`${sev.bg} ${sev.color} text-sm px-3 py-1`}>
          <SevIcon className="h-4 w-4 mr-1" />
          {anomalia.severidad}
        </Badge>
        <Badge variant="outline" className="bg-bg-input/50 text-t-secondary text-sm px-3 py-1 border-border">
          {TIPO_LABELS[anomalia.tipo] || anomalia.tipo}
        </Badge>
        <Badge
          variant="outline"
          className={`text-sm px-3 py-1 ${
            anomalia.estado === "NUEVA" ? "bg-red-500/10 text-red-400 border-red-500/20"
            : anomalia.estado === "EN_REVISION" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            : anomalia.estado === "RESUELTA" ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          }`}
        >
          {anomalia.estado.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info Card */}
        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-t-primary text-lg">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-t-tertiary mb-1">Algoritmo</p>
              <p className="text-sm text-t-secondary">{TIPO_DESCRIPCIONES[anomalia.tipo] || anomalia.algoritmo}</p>
            </div>

            <div>
              <p className="text-xs text-t-tertiary mb-1">Descripción</p>
              <p className="text-sm text-t-primary">{anomalia.descripcion}</p>
            </div>

            <div>
              <p className="text-xs text-t-tertiary mb-1">Entidad Afectada</p>
              <p className="text-sm text-t-primary font-medium">
                {anomalia.entidadLabel || `${anomalia.entidadTipo} #${anomalia.entidadId.slice(0, 8)}`}
              </p>
            </div>

            {/* Valores */}
            {(anomalia.valorDetectado != null || anomalia.valorEsperado != null) && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {anomalia.valorDetectado != null && (
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-xs text-t-tertiary mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Valor Detectado
                    </p>
                    <p className="text-xl font-display font-extrabold text-red-400">
                      {isMoneyValue ? formatMoney(anomalia.valorDetectado) : `${anomalia.valorDetectado}%`}
                    </p>
                  </div>
                )}
                {anomalia.valorEsperado != null && (
                  <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                    <p className="text-xs text-t-tertiary mb-1 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> Valor Esperado
                    </p>
                    <p className="text-xl font-display font-extrabold text-green-400">
                      {isMoneyValue ? formatMoney(anomalia.valorEsperado) : `${anomalia.valorEsperado}%`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Datos extra */}
            {datosExtra && (
              <div>
                <p className="text-xs text-t-tertiary mb-1">Datos del Algoritmo</p>
                <pre className="text-xs bg-bg-input/50 rounded-lg p-3 overflow-x-auto text-t-secondary font-mono">
                  {JSON.stringify(datosExtra, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="bg-bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-t-primary text-lg">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOpen ? (
              <>
                {anomalia.estado === "NUEVA" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-bg-card-hover"
                    onClick={() => handleAction("revisar")}
                    disabled={actionLoading}
                  >
                    <Eye className="h-4 w-4 mr-2 text-yellow-400" />
                    Marcar En Revisión
                  </Button>
                )}

                {/* Resolver */}
                {!showResolver ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-bg-card-hover"
                    onClick={() => setShowResolver(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                    Resolver
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <p className="text-sm font-medium text-green-400">Resolución</p>
                    <Textarea
                      value={resolucionText}
                      onChange={(e) => setResolucionText(e.target.value)}
                      placeholder="Explicación de la resolución..."
                      className="bg-bg-input border-border min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction("resolver")}
                        disabled={!resolucionText.trim() || actionLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowResolver(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Descartar */}
                {!showDescartar ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-bg-card-hover"
                    onClick={() => setShowDescartar(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2 text-zinc-400" />
                    Descartar
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/10">
                    <p className="text-sm font-medium text-zinc-400">Motivo de Descarte</p>
                    <Textarea
                      value={motivoText}
                      onChange={(e) => setMotivoText(e.target.value)}
                      placeholder="Motivo por el que se descarta..."
                      className="bg-bg-input border-border min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction("descartar")}
                        disabled={!motivoText.trim() || actionLoading}
                        variant="outline"
                        className="border-zinc-600"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Descarte"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowDescartar(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-bg-input/30 border border-border space-y-3">
                <p className="text-sm font-medium text-t-primary">
                  {anomalia.estado === "RESUELTA" ? "Resuelta" : "Descartada"}
                </p>
                {anomalia.resolucion && (
                  <p className="text-sm text-t-secondary">{anomalia.resolucion}</p>
                )}
                {anomalia.fechaResolucion && (
                  <p className="text-xs text-t-tertiary">
                    {formatDateTime(anomalia.fechaResolucion)}
                    {anomalia.resueltoPor && ` por ${anomalia.resueltoPor.slice(0, 8)}...`}
                  </p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border space-y-2 text-xs text-t-tertiary">
              <div className="flex justify-between">
                <span>ID</span>
                <span className="font-mono">{anomalia.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Algoritmo</span>
                <span className="font-mono">{anomalia.algoritmo}</span>
              </div>
              <div className="flex justify-between">
                <span>Detectada</span>
                <span>{formatDateTime(anomalia.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
