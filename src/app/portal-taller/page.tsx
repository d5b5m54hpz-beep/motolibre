"use client";

import { useState, useEffect, useCallback } from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Wrench,
  XCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TallerInfo {
  id: string;
  nombre: string;
  codigoRed: string | null;
  tarifaHora: number | null;
  scoreCalidad: number | null;
  otCompletadas: number;
  capacidadOTMes: number | null;
}

interface Stats {
  pendientes: number;
  aceptadas: number;
  completadasMes: number;
}

interface Asignacion {
  id: string;
  ordenTrabajoId: string;
  estado: string;
  fechaLimite: string;
  fechaRespuesta: string | null;
  motivoRechazo: string | null;
  precioEstimado: number | null;
  tiempoEstimado: number | null;
  notasTaller: string | null;
  confirmRepuestos: boolean | null;
  createdAt: string;
  ordenTrabajo: {
    id: string;
    numero: string;
    tipo: string;
    prioridad: string;
    estado: string;
    descripcion: string;
    tipoService: string | null;
    fechaProgramada: string | null;
    costoTotal: number | null;
    tareas: { categoria: string; descripcion: string }[];
    moto: { marca: string; modelo: string; patente: string } | null;
  } | null;
}

const PRIORIDAD_ICON: Record<string, string> = {
  BAJA: "bg-emerald-100 text-emerald-700",
  MEDIA: "bg-sky-100 text-sky-700",
  ALTA: "bg-amber-100 text-amber-700",
  URGENTE: "bg-red-100 text-red-700",
};

export default function PortalTallerPage() {
  const [taller, setTaller] = useState<TallerInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDIENTE" | "ACEPTADA" | "ALL">("PENDIENTE");
  const [respondDialog, setRespondDialog] = useState<Asignacion | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/portal-taller/dashboard");
      if (res.ok) {
        const json = await res.json();
        setTaller(json.data.taller);
        setStats(json.data.stats);
      }
    } catch {
      toast.error("Error al cargar dashboard");
    }
  }, []);

  const fetchAsignaciones = useCallback(async () => {
    try {
      const params = tab !== "ALL" ? `?estado=${tab}` : "";
      const res = await fetch(`/api/portal-taller/asignaciones${params}`);
      if (res.ok) {
        const json = await res.json();
        setAsignaciones(json.data);
      }
    } catch {
      toast.error("Error al cargar asignaciones");
    }
  }, [tab]);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchAsignaciones()]).then(() =>
      setLoading(false)
    );
  }, [fetchDashboard, fetchAsignaciones]);

  useEffect(() => {
    fetchAsignaciones();
  }, [tab, fetchAsignaciones]);

  function refresh() {
    fetchDashboard();
    fetchAsignaciones();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Taller header */}
      {taller && (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">
              {taller.nombre}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {taller.codigoRed && (
                <Badge variant="outline" className="font-mono text-xs">
                  {taller.codigoRed}
                </Badge>
              )}
              {taller.tarifaHora && (
                <span>
                  ${taller.tarifaHora.toLocaleString()}/hora
                </span>
              )}
              {taller.scoreCalidad && (
                <span>Score: {taller.scoreCalidad.toFixed(1)}/10</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard
            label="Pendientes de Respuesta"
            value={stats.pendientes}
            icon={Clock}
            description="Requieren tu atención"
          />
          <KPICard
            label="OTs Aceptadas"
            value={stats.aceptadas}
            icon={CheckCircle2}
          />
          <KPICard
            label="Completadas este Mes"
            value={stats.completadasMes}
            icon={Wrench}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b">
          {(
            [
              { key: "PENDIENTE", label: "Pendientes", count: stats?.pendientes },
              { key: "ACEPTADA", label: "Aceptadas", count: stats?.aceptadas },
              { key: "ALL", label: "Todas", count: undefined as number | undefined },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className="ml-1.5 bg-primary/10 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Assignment cards */}
        {asignaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium">No hay asignaciones</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "PENDIENTE"
                ? "No tenés OTs pendientes de respuesta"
                : "No hay asignaciones en esta categoría"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {asignaciones.map((a) => (
              <AsignacionCard
                key={a.id}
                asignacion={a}
                onRespond={() => setRespondDialog(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Respond dialog */}
      {respondDialog && (
        <ResponderDialog
          asignacion={respondDialog}
          open={!!respondDialog}
          onOpenChange={(open) => !open && setRespondDialog(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

// ── Assignment Card ──

function AsignacionCard({
  asignacion: a,
  onRespond,
}: {
  asignacion: Asignacion;
  onRespond: () => void;
}) {
  const ot = a.ordenTrabajo;
  const isExpired =
    a.estado === "PENDIENTE" && new Date(a.fechaLimite) < new Date();
  const timeLeft = a.estado === "PENDIENTE" && !isExpired
    ? formatDistanceToNow(new Date(a.fechaLimite), { locale: es })
    : null;

  return (
    <div className="border rounded-xl bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">
              {ot?.numero ?? "—"}
            </span>
            <StatusBadge status={a.estado} />
            {ot && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORIDAD_ICON[ot.prioridad] ?? ""}`}
              >
                {ot.prioridad}
              </span>
            )}
            {isExpired && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                EXPIRADA
              </span>
            )}
          </div>
          {ot && (
            <p className="text-sm mt-1">{ot.descripcion}</p>
          )}
          {ot?.moto && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {ot.moto.marca} {ot.moto.modelo} · {ot.moto.patente}
            </p>
          )}
        </div>

        {a.estado === "PENDIENTE" && !isExpired && (
          <Button size="sm" onClick={onRespond}>
            Responder
          </Button>
        )}
      </div>

      {/* Tareas summary */}
      {ot && ot.tareas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ot.tareas.slice(0, 5).map((t, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {t.descripcion}
            </Badge>
          ))}
          {ot.tareas.length > 5 && (
            <Badge variant="secondary" className="text-[10px]">
              +{ot.tareas.length - 5} más
            </Badge>
          )}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {ot?.fechaProgramada && (
          <span>
            Programada:{" "}
            {new Date(ot.fechaProgramada).toLocaleDateString("es-AR")}
          </span>
        )}
        {timeLeft && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Respondé en {timeLeft}
          </span>
        )}
        {a.fechaRespuesta && (
          <span>
            Respondida:{" "}
            {formatDistanceToNow(new Date(a.fechaRespuesta), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Respond Dialog ──

function ResponderDialog({
  asignacion,
  open,
  onOpenChange,
  onSuccess,
}: {
  asignacion: Asignacion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [accion, setAccion] = useState<"ACEPTAR" | "RECHAZAR" | null>(null);
  const [form, setForm] = useState({
    precioEstimado: "",
    tiempoEstimado: "",
    notasTaller: "",
    confirmRepuestos: false,
    motivoRechazo: "",
  });
  const [saving, setSaving] = useState(false);

  const ot = asignacion.ordenTrabajo;

  async function handleSubmit() {
    if (!accion) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { accion };
      if (accion === "ACEPTAR") {
        body.precioEstimado = form.precioEstimado
          ? parseFloat(form.precioEstimado)
          : null;
        body.tiempoEstimado = form.tiempoEstimado
          ? parseInt(form.tiempoEstimado)
          : null;
        body.notasTaller = form.notasTaller || null;
        body.confirmRepuestos = form.confirmRepuestos;
      } else {
        body.motivoRechazo = form.motivoRechazo || null;
      }

      const res = await fetch(
        `/api/portal-taller/asignaciones/${asignacion.id}/responder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        toast.success(
          accion === "ACEPTAR" ? "OT aceptada" : "OT rechazada"
        );
        onOpenChange(false);
        onSuccess();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al responder");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Responder Asignación — {ot?.numero ?? "OT"}
          </DialogTitle>
        </DialogHeader>

        {/* OT Summary */}
        {ot && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <p className="font-medium">{ot.descripcion}</p>
            {ot.moto && (
              <p className="text-muted-foreground">
                {ot.moto.marca} {ot.moto.modelo} · {ot.moto.patente}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={ot.prioridad} showDot={false} />
              {ot.tipoService && (
                <Badge variant="outline" className="text-xs">
                  {ot.tipoService.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action selection */}
        {!accion && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
              onClick={() => setAccion("ACEPTAR")}
            >
              <ThumbsUp className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium">Aceptar</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-400"
              onClick={() => setAccion("RECHAZAR")}
            >
              <ThumbsDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Rechazar</span>
            </Button>
          </div>
        )}

        {/* Accept form */}
        {accion === "ACEPTAR" && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Precio Estimado ($)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="Opcional"
                  value={form.precioEstimado}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, precioEstimado: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Tiempo Estimado (min)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="Opcional"
                  value={form.tiempoEstimado}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tiempoEstimado: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input
                className="mt-1"
                placeholder="Comentarios para MotoLibre..."
                value={form.notasTaller}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notasTaller: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.confirmRepuestos}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, confirmRepuestos: !!v }))
                }
              />
              <Label className="text-sm">
                Confirmo que tengo los repuestos necesarios
              </Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setAccion(null)}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Confirmar Aceptación
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {accion === "RECHAZAR" && (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Motivo del Rechazo</Label>
              <Input
                className="mt-1"
                placeholder="¿Por qué no podés tomar esta OT?"
                value={form.motivoRechazo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, motivoRechazo: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setAccion(null)}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1.5" />
                )}
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
