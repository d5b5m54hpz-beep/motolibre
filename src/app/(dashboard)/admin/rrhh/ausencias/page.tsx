"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DSBadge } from "@/components/ui/ds-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Loader2, CalendarOff, Check, X } from "lucide-react";

interface Ausencia {
  id: string;
  empleadoId: string;
  tipo: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
  diasHabiles: number;
  motivo: string | null;
  empleado: {
    nombre: string;
    apellido: string;
    legajo: string;
  };
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}

const TIPOS_AUSENCIA = [
  "VACACIONES",
  "ENFERMEDAD",
  "INJUSTIFICADA",
  "LICENCIA_ESPECIAL",
  "MATERNIDAD",
  "PATERNIDAD",
  "ESTUDIO",
  "FALLECIMIENTO_FAMILIAR",
] as const;

const TIPO_LABELS: Record<string, string> = {
  VACACIONES: "Vacaciones",
  ENFERMEDAD: "Enfermedad",
  INJUSTIFICADA: "Injustificada",
  LICENCIA_ESPECIAL: "Licencia Especial",
  MATERNIDAD: "Maternidad",
  PATERNIDAD: "Paternidad",
  ESTUDIO: "Estudio",
  FALLECIMIENTO_FAMILIAR: "Fallecimiento Familiar",
};

const ESTADOS_AUSENCIA = ["SOLICITADA", "APROBADA", "RECHAZADA", "CANCELADA"] as const;

const ESTADO_BADGE_VARIANT: Record<string, "info" | "positive" | "negative" | "neutral"> = {
  SOLICITADA: "info",
  APROBADA: "positive",
  RECHAZADA: "negative",
  CANCELADA: "neutral",
};

export default function AusenciasPage() {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [form, setForm] = useState({
    empleadoId: "",
    tipo: "",
    fechaDesde: "",
    fechaHasta: "",
    motivo: "",
  });

  const fetchAusencias = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo && filtroTipo !== "all") params.set("tipo", filtroTipo);
    if (filtroEstado && filtroEstado !== "all") params.set("estado", filtroEstado);

    const res = await fetch(`/api/rrhh/ausencias?${params}`);
    if (res.ok) {
      const j = await res.json();
      setAusencias(j.data);
    }
    setLoading(false);
  }, [filtroTipo, filtroEstado]);

  useEffect(() => {
    void fetchAusencias();
  }, [fetchAusencias]);

  useEffect(() => {
    void fetch("/api/rrhh/empleados?estado=ACTIVO").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setEmpleados(j.data);
      }
    });
  }, []);

  async function handleCreate() {
    if (!form.empleadoId || !form.tipo || !form.fechaDesde || !form.fechaHasta) return;
    setSubmitting(true);

    const res = await fetch("/api/rrhh/ausencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empleadoId: form.empleadoId,
        tipo: form.tipo,
        fechaDesde: form.fechaDesde,
        fechaHasta: form.fechaHasta,
        motivo: form.motivo || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Ausencia registrada correctamente");
      setDialogOpen(false);
      setForm({ empleadoId: "", tipo: "", fechaDesde: "", fechaHasta: "", motivo: "" });
      void fetchAusencias();
    } else {
      const j = await res.json();
      toast.error(j.error?.toString() || "Error al registrar ausencia");
    }
    setSubmitting(false);
  }

  async function handleUpdateEstado(id: string, estado: "APROBADA" | "RECHAZADA") {
    const res = await fetch(`/api/rrhh/ausencias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });

    if (res.ok) {
      toast.success(`Ausencia ${estado === "APROBADA" ? "aprobada" : "rechazada"}`);
      void fetchAusencias();
    } else {
      toast.error("Error al actualizar ausencia");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ausencias"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nueva Ausencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva Ausencia</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Empleado *</Label>
                  <Select
                    value={form.empleadoId}
                    onValueChange={(v) => setForm({ ...form, empleadoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {empleados.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.legajo} - {e.apellido}, {e.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_AUSENCIA.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha Desde *</Label>
                    <Input
                      type="date"
                      value={form.fechaDesde}
                      onChange={(e) => setForm({ ...form, fechaDesde: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fecha Hasta *</Label>
                    <Input
                      type="date"
                      value={form.fechaHasta}
                      onChange={(e) => setForm({ ...form, fechaHasta: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Input
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    placeholder="Motivo (opcional)"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={
                    submitting ||
                    !form.empleadoId ||
                    !form.tipo ||
                    !form.fechaDesde ||
                    !form.fechaHasta
                  }
                  className="w-full"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Ausencia
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[200px] bg-bg-input border-border">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPOS_AUSENCIA.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px] bg-bg-input border-border">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS_AUSENCIA.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-t-tertiary text-xs uppercase tracking-wider">
                <th className="text-left p-4">Empleado</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Fechas</th>
                <th className="text-center p-4">Dias Hab.</th>
                <th className="text-center p-4">Estado</th>
                <th className="text-right p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-44" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-10 mx-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : ausencias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-t-tertiary">
                    <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No se encontraron ausencias
                  </td>
                </tr>
              ) : (
                ausencias.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border/50 hover:bg-bg-card-hover transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-xs text-t-tertiary mr-2">
                        {a.empleado.legajo}
                      </span>
                      <span className="text-t-primary font-medium">
                        {a.empleado.apellido}, {a.empleado.nombre}
                      </span>
                    </td>
                    <td className="p-4 text-t-secondary">
                      {TIPO_LABELS[a.tipo] || a.tipo}
                    </td>
                    <td className="p-4 text-t-primary">
                      {formatDate(a.fechaDesde)} - {formatDate(a.fechaHasta)}
                    </td>
                    <td className="p-4 text-center text-t-primary font-medium">
                      {a.diasHabiles}
                    </td>
                    <td className="p-4 text-center">
                      <DSBadge variant={ESTADO_BADGE_VARIANT[a.estado] ?? "neutral"}>
                        {a.estado}
                      </DSBadge>
                    </td>
                    <td className="p-4 text-right">
                      {a.estado === "SOLICITADA" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-positive hover:text-positive hover:bg-positive-bg"
                            onClick={() => handleUpdateEstado(a.id, "APROBADA")}
                          >
                            <Check className="h-4 w-4 mr-1" /> Aprobar
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-negative hover:text-negative hover:bg-negative-bg"
                            onClick={() => handleUpdateEstado(a.id, "RECHAZADA")}
                          >
                            <X className="h-4 w-4 mr-1" /> Rechazar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-t-tertiary">--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ausencias.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-t-tertiary">
            {ausencias.length} ausencia{ausencias.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
