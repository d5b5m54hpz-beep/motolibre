"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  ArrowLeft,
  CheckCheck,
  Link2,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Match {
  id: string;
  extractoId: string;
  entidadTipo: string;
  entidadId: string;
  entidadLabel: string | null;
  tipoMatch: string;
  estado: string;
  confianza: number;
  montoBanco: number;
  montoSistema: number;
  diferencia: number;
}

interface Extracto {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string | null;
  monto: number;
  saldo: number | null;
  conciliado: boolean;
}

interface Conciliacion {
  id: string;
  numero: string;
  estado: string;
  periodoDesde: string;
  periodoHasta: string;
  totalExtractos: number;
  totalConciliados: number;
  totalNoConciliados: number;
  diferencia: number;
  cuentaBancaria: { id: string; nombre: string; banco: string };
  matches: Match[];
  extractos: Extracto[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TIPO_MATCH_COLORS: Record<string, string> = {
  EXACTO: "bg-green-500/10 text-green-500 border-green-500/20",
  APROXIMADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REFERENCIA: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  MANUAL: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const ENTIDAD_TIPO_OPTIONS = [
  { value: "PagoMercadoPago", label: "Pago MercadoPago" },
  { value: "Gasto", label: "Gasto" },
  { value: "FacturaCompra", label: "Factura de Compra" },
  { value: "ReciboSueldo", label: "Recibo de Sueldo" },
];

function confianzaColor(confianza: number): string {
  if (confianza >= 80) return "text-green-500";
  if (confianza >= 50) return "text-yellow-500";
  return "text-red-500";
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ConciliacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<Conciliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedExtracto, setSelectedExtracto] = useState<Extracto | null>(
    null
  );
  const [manualEntidadTipo, setManualEntidadTipo] = useState("");
  const [manualEntidadId, setManualEntidadId] = useState("");

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conciliacion/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
      } else {
        toast.error("Error al cargar la conciliación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* ---- Actions ---- */

  async function handleMatchAction(
    matchId: string,
    action: "aprobar" | "rechazar"
  ) {
    setActionLoading(matchId);
    try {
      const res = await fetch(
        `/api/conciliacion/${id}/matches/${matchId}/${action}`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success(
          action === "aprobar" ? "Match aprobado" : "Match rechazado"
        );
        await fetchData();
      } else {
        toast.error("Error al procesar el match");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkApprove() {
    setActionLoading("bulk-approve");
    try {
      const res = await fetch(`/api/conciliacion/${id}/aprobar-exactos`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Matches exactos aprobados");
        await fetchData();
      } else {
        toast.error("Error al aprobar matches exactos");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete() {
    setActionLoading("complete");
    try {
      const res = await fetch(`/api/conciliacion/${id}/completar`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Conciliación completada");
        await fetchData();
      } else {
        toast.error("Error al completar la conciliación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManualMatch() {
    if (!selectedExtracto || !manualEntidadTipo || !manualEntidadId) {
      toast.error("Completá todos los campos");
      return;
    }
    setActionLoading("manual-match");
    try {
      const res = await fetch(`/api/conciliacion/${id}/match-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractoId: selectedExtracto.id,
          entidadTipo: manualEntidadTipo,
          entidadId: manualEntidadId,
        }),
      });
      if (res.ok) {
        toast.success("Match manual creado");
        setMatchDialogOpen(false);
        setSelectedExtracto(null);
        setManualEntidadTipo("");
        setManualEntidadId("");
        await fetchData();
      } else {
        toast.error("Error al crear match manual");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  function openManualMatchDialog(extracto: Extracto) {
    setSelectedExtracto(extracto);
    setManualEntidadTipo("");
    setManualEntidadId("");
    setMatchDialogOpen(true);
  }

  /* ---- Derived data ---- */

  const matchedExtractoIds = new Set(
    data?.matches.map((m) => m.extractoId) ?? []
  );
  const extractosSinConciliar =
    data?.extractos.filter(
      (e) => !e.conciliado && !matchedExtractoIds.has(e.id)
    ) ?? [];

  const propuestoMatches =
    data?.matches.filter((m) => m.estado === "PROPUESTO") ?? [];
  const hasHighConfidencePropuestos = propuestoMatches.some(
    (m) => m.confianza >= 90
  );
  const canBulkApprove =
    data?.estado === "EN_PROCESO" && hasHighConfidencePropuestos;
  const canComplete =
    data?.estado === "EN_PROCESO" && propuestoMatches.length === 0;

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conciliación"
          description="Cargando..."
          actions={<Skeleton className="h-8 w-32" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conciliación no encontrada"
          description="No se pudo cargar la información de la conciliación."
          actions={
            <Button
              variant="outline"
              onClick={() => router.push("/admin/conciliacion")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          }
        />
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Conciliación ${data.numero}`}
        description={`${data.cuentaBancaria.nombre} \u00B7 ${formatDate(data.periodoDesde)} \u2014 ${formatDate(data.periodoHasta)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={data.estado} className="text-sm px-3 py-1" />
            <Button
              variant="outline"
              onClick={() => router.push("/admin/conciliacion")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Total Extractos</p>
                <p className="text-2xl font-bold text-t-primary">
                  {data.totalExtractos}
                </p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Conciliados</p>
                <p className="text-2xl font-bold text-green-500">
                  {data.totalConciliados}
                </p>
              </div>
              <Check className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Pendientes</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    data.totalNoConciliados > 0
                      ? "text-yellow-500"
                      : "text-t-primary"
                  )}
                >
                  {data.totalNoConciliados}
                </p>
              </div>
              <AlertCircle
                className={cn(
                  "h-8 w-8",
                  data.totalNoConciliados > 0
                    ? "text-warning"
                    : "text-t-tertiary"
                )}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Diferencia</p>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    data.diferencia !== 0 ? "text-red-500" : "text-green-500"
                  )}
                >
                  {formatMoney(data.diferencia)}
                </p>
              </div>
              <FileSpreadsheet
                className={cn(
                  "h-8 w-8",
                  data.diferencia !== 0 ? "text-negative" : "text-positive"
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {data.estado === "EN_PROCESO" && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!canBulkApprove || actionLoading === "bulk-approve"}
            onClick={handleBulkApprove}
            className="text-positive border-positive/30 hover:bg-positive/10"
          >
            {actionLoading === "bulk-approve" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Aprobar todos exactos
          </Button>
          <Button
            disabled={!canComplete || actionLoading === "complete"}
            onClick={handleComplete}
          >
            {actionLoading === "complete" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Completar
          </Button>
        </div>
      )}

      {/* Matches Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Link2 className="h-5 w-5" />
            Matches Propuestos ({data.matches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.matches.length === 0 ? (
            <p className="text-sm text-t-secondary text-center py-8">
              No hay matches registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t-secondary border-b border-border">
                    <th className="text-left pb-2">Extracto</th>
                    <th className="text-left pb-2">Sistema</th>
                    <th className="text-center pb-2">Tipo</th>
                    <th className="text-center pb-2">Confianza</th>
                    <th className="text-center pb-2">Estado</th>
                    <th className="text-right pb-2">Diferencia</th>
                    <th className="text-right pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matches.map((match) => {
                    const extracto = data.extractos.find(
                      (e) => e.id === match.extractoId
                    );
                    return (
                      <tr
                        key={match.id}
                        className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                      >
                        {/* Extracto */}
                        <td className="py-2">
                          <div>
                            <p className="font-medium text-t-primary">
                              {extracto
                                ? truncate(extracto.descripcion, 40)
                                : "—"}
                            </p>
                            <p className="text-xs text-t-secondary">
                              {extracto ? formatDate(extracto.fecha) : "—"}{" "}
                              &middot; {formatMoney(match.montoBanco)}
                            </p>
                          </div>
                        </td>
                        {/* Sistema */}
                        <td className="py-2">
                          <div>
                            <p className="font-medium text-t-primary">
                              {match.entidadLabel ?? match.entidadId}
                            </p>
                            <p className="text-xs text-t-secondary">
                              {formatMoney(match.montoSistema)}
                            </p>
                          </div>
                        </td>
                        {/* Tipo Match */}
                        <td className="py-2 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              TIPO_MATCH_COLORS[match.tipoMatch] ??
                                TIPO_MATCH_COLORS.MANUAL
                            )}
                          >
                            {match.tipoMatch}
                          </Badge>
                        </td>
                        {/* Confianza */}
                        <td className="py-2 text-center">
                          <span
                            className={cn(
                              "font-bold tabular-nums",
                              confianzaColor(match.confianza)
                            )}
                          >
                            {match.confianza}%
                          </span>
                        </td>
                        {/* Estado */}
                        <td className="py-2 text-center">
                          <StatusBadge status={match.estado} />
                        </td>
                        {/* Diferencia */}
                        <td className="py-2 text-right tabular-nums">
                          <span
                            className={cn(
                              match.diferencia !== 0
                                ? "text-red-500"
                                : "text-green-500"
                            )}
                          >
                            {formatMoney(match.diferencia)}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td className="py-2 text-right">
                          {match.estado === "PROPUESTO" ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-positive border-positive/30 hover:bg-positive/10"
                                disabled={actionLoading === match.id}
                                onClick={() =>
                                  handleMatchAction(match.id, "aprobar")
                                }
                              >
                                {actionLoading === match.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-negative border-negative/30 hover:bg-negative/10"
                                disabled={actionLoading === match.id}
                                onClick={() =>
                                  handleMatchAction(match.id, "rechazar")
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-t-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extractos Sin Conciliar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-5 w-5" />
            Extractos Sin Conciliar ({extractosSinConciliar.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extractosSinConciliar.length === 0 ? (
            <p className="text-sm text-t-secondary text-center py-8">
              Todos los extractos están conciliados o tienen match asignado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t-secondary border-b border-border">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-left pb-2">Referencia</th>
                    <th className="text-right pb-2">Monto</th>
                    <th className="text-right pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {extractosSinConciliar.map((extracto) => (
                    <tr
                      key={extracto.id}
                      className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                    >
                      <td className="py-2 whitespace-nowrap">
                        {formatDate(extracto.fecha)}
                      </td>
                      <td className="py-2 text-t-primary">
                        {truncate(extracto.descripcion, 60)}
                      </td>
                      <td className="py-2 text-t-secondary font-mono text-xs">
                        {extracto.referencia ?? "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {formatMoney(extracto.monto)}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManualMatchDialog(extracto)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Match manual
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Manual</DialogTitle>
          </DialogHeader>

          {selectedExtracto && (
            <div className="space-y-4">
              {/* Extracto Info */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs text-t-secondary font-medium uppercase tracking-wide">
                  Extracto bancario
                </p>
                <p className="text-sm font-medium text-t-primary">
                  {selectedExtracto.descripcion}
                </p>
                <div className="flex items-center gap-2 text-xs text-t-secondary">
                  <span>{formatDate(selectedExtracto.fecha)}</span>
                  <span>&middot;</span>
                  <span className="font-medium tabular-nums text-t-primary">
                    {formatMoney(selectedExtracto.monto)}
                  </span>
                  {selectedExtracto.referencia && (
                    <>
                      <span>&middot;</span>
                      <span className="font-mono">
                        Ref: {selectedExtracto.referencia}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Entidad Tipo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-t-primary">
                  Tipo de entidad
                </label>
                <Select
                  value={manualEntidadTipo}
                  onValueChange={setManualEntidadTipo}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccioná el tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTIDAD_TIPO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entidad ID */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-t-primary">
                  ID de la entidad
                </label>
                <Input
                  placeholder="Ingresá el ID..."
                  value={manualEntidadId}
                  onChange={(e) => setManualEntidadId(e.target.value)}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMatchDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={
                    !manualEntidadTipo ||
                    !manualEntidadId ||
                    actionLoading === "manual-match"
                  }
                  onClick={handleManualMatch}
                >
                  {actionLoading === "manual-match" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Vincular
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
