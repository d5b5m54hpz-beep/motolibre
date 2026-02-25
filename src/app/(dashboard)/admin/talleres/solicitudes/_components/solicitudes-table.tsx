"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import type { BulkAction } from "@/components/data-table/data-table-bulk-actions";
import {
  SheetDetail,
  DetailField,
  DetailGrid,
} from "@/components/ui/sheet-detail";
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
import {
  solicitudesColumns,
  defaultHiddenSolicitudColumns,
  type SolicitudTallerRow,
} from "./solicitudes-columns";
import {
  ClipboardList,
  Download,
  ArrowRight,
  Star,
  FileText,
  Handshake,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  RECIBIDA: "Recibida",
  INCOMPLETA: "Incompleta",
  EN_EVALUACION: "En Evaluación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EN_ESPERA: "En Espera",
  CONVENIO_ENVIADO: "Convenio Enviado",
  CONVENIO_FIRMADO: "Convenio Firmado",
  ONBOARDING: "Onboarding",
  ACTIVO: "Activo",
};

const ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TRANSICIONES: Record<string, string[]> = {
  RECIBIDA: ["EN_EVALUACION", "INCOMPLETA"],
  INCOMPLETA: ["RECIBIDA"],
  EN_EVALUACION: ["APROBADA", "RECHAZADA", "EN_ESPERA"],
  EN_ESPERA: ["EN_EVALUACION", "APROBADA"],
  APROBADA: ["CONVENIO_ENVIADO"],
  CONVENIO_ENVIADO: ["CONVENIO_FIRMADO"],
  CONVENIO_FIRMADO: ["ONBOARDING"],
  ONBOARDING: ["ACTIVO"],
};

const CATEGORIAS_EVAL = [
  "INFRAESTRUCTURA",
  "EQUIPAMIENTO",
  "PERSONAL",
  "DOCUMENTACION",
  "UBICACION",
  "EXPERIENCIA",
  "REFERENCIAS",
] as const;

interface SolicitudesTableProps {
  solicitudes: SolicitudTallerRow[];
}

export function SolicitudesTable({ solicitudes }: SolicitudesTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SolicitudTallerRow | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Derive unique provinces for filter
  const provinciaOptions = useMemo(() => {
    const set = new Set(solicitudes.map((s) => s.provincia));
    return Array.from(set)
      .sort()
      .map((p) => ({ value: p, label: p }));
  }, [solicitudes]);

  const filterColumns: FilterableColumn[] = [
    { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
    { id: "provincia", title: "Provincia", options: provinciaOptions },
  ];

  const bulkActions: BulkAction<SolicitudTallerRow>[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows) => {
        const csv = [
          ["Taller", "Estado", "Ciudad", "Provincia", "Email", "Score"].join(
            ","
          ),
          ...rows.map((r) =>
            [
              r.nombreTaller,
              r.estado,
              r.ciudad,
              r.provincia,
              r.email,
              r.scoreTotal ?? "",
            ].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "solicitudes-taller.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/solicitudes-taller/${id}`);
      const json = await res.json();
      setDetailData(json.data);
    } catch {
      toast.error("Error al cargar detalle");
    }
    setLoadingDetail(false);
  }

  function handleRowClick(row: SolicitudTallerRow) {
    setSelected(row);
    loadDetail(row.id);
  }

  return (
    <>
      <DataTable
        columns={solicitudesColumns}
        data={solicitudes}
        searchableColumns={["nombreTaller", "contactoNombre", "email"]}
        searchPlaceholder="Buscar por taller, contacto, email..."
        filterableColumns={filterColumns}
        bulkActions={bulkActions}
        onRowClick={handleRowClick}
        emptyState={{
          icon: ClipboardList,
          title: "No hay solicitudes",
          description:
            "Las solicitudes de talleres aparecerán aquí cuando se postulen.",
        }}
        defaultPageSize={20}
        defaultColumnVisibility={defaultHiddenSolicitudColumns}
      />

      {selected && (
        <SolicitudSheet
          solicitud={selected}
          detailData={detailData}
          loadingDetail={loadingDetail}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setDetailData(null);
            }
          }}
          onRefresh={() => {
            loadDetail(selected.id);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ── Detail Sheet ──

interface SolicitudSheetProps {
  solicitud: SolicitudTallerRow;
  detailData: Record<string, unknown> | null;
  loadingDetail: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

function SolicitudSheet({
  solicitud,
  detailData,
  loadingDetail,
  open,
  onOpenChange,
  onRefresh,
}: SolicitudSheetProps) {
  const [changing, setChanging] = useState(false);
  const [evalDialog, setEvalDialog] = useState(false);

  const estado = (detailData?.estado as string) ?? solicitud.estado;
  const transiciones = TRANSICIONES[estado] ?? [];

  async function cambiarEstado(nuevoEstado: string, motivo?: string) {
    setChanging(true);
    try {
      const res = await fetch(
        `/api/solicitudes-taller/${solicitud.id}/cambiar-estado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nuevoEstado, motivo }),
        }
      );
      if (res.ok) {
        toast.success(`Estado cambiado a ${ESTADO_LABELS[nuevoEstado]}`);
        onRefresh();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al cambiar estado");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setChanging(false);
  }

  async function activarTaller() {
    setChanging(true);
    try {
      const res = await fetch(
        `/api/solicitudes-taller/${solicitud.id}/activar`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success("Taller activado exitosamente");
        onRefresh();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al activar");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setChanging(false);
  }

  const detail = detailData as Record<string, unknown> | null;
  const evaluaciones = (detail?.evaluaciones ?? []) as Array<{
    categoria: string;
    puntaje: number;
    peso: number;
    observaciones: string | null;
  }>;
  const convenio = detail?.convenio as Record<string, unknown> | null;

  const tabs = [
    {
      id: "general",
      label: "General",
      content: loadingDetail ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField label="Taller" value={solicitud.nombreTaller} />
            <DetailField
              label="Razón Social"
              value={detail?.razonSocial as string}
            />
            <DetailField label="CUIT" value={detail?.cuit as string} mono />
            <DetailField label="Dirección" value={solicitud.direccion} />
            <DetailField label="Ciudad" value={solicitud.ciudad} />
            <DetailField label="Provincia" value={solicitud.provincia} />
            <DetailField label="Teléfono" value={solicitud.telefono} />
            <DetailField label="Email" value={solicitud.email} />
            <DetailField
              label="Sitio Web"
              value={detail?.sitioWeb as string}
            />
          </DetailGrid>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Contacto Principal</h4>
            <DetailGrid>
              <DetailField label="Nombre" value={solicitud.contactoNombre} />
              <DetailField
                label="Cargo"
                value={detail?.contactoCargo as string}
              />
              <DetailField
                label="Celular"
                value={detail?.contactoCelular as string}
              />
            </DetailGrid>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Capacidad</h4>
            <DetailGrid>
              <DetailField
                label="Mecánicos"
                value={solicitud.cantidadMecanicos}
                mono
              />
              <DetailField
                label="Capacidad OT/Mes"
                value={detail?.capacidadOTMes as number}
                mono
              />
              <DetailField
                label="Superficie m²"
                value={detail?.superficieM2 as number}
                mono
              />
              <DetailField
                label="Elevadores"
                value={detail?.cantidadElevadores as number}
                mono
              />
            </DetailGrid>
            {solicitud.especialidades.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Especialidades
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {solicitud.especialidades.map((e) => (
                    <Badge key={e} variant="outline" className="text-xs">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {solicitud.marcasExperiencia.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Marcas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {solicitud.marcasExperiencia.map((m) => (
                    <Badge
                      key={m}
                      variant="secondary"
                      className="text-xs"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!!detail?.notasInternas && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Notas Internas
              </p>
              <p className="text-sm bg-muted/50 rounded-lg p-3">
                {String(detail.notasInternas)}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "evaluacion",
      label: "Evaluación",
      count: evaluaciones.length,
      content: (
        <div className="space-y-4">
          {evaluaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Sin evaluaciones</p>
              <p className="text-xs text-muted-foreground mt-1">
                Evaluá esta solicitud para calcular su score
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setEvalDialog(true)}
              >
                Evaluar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Score Total</p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {solicitud.scoreTotal?.toFixed(1) ?? "—"}/10
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEvalDialog(true)}
                >
                  Re-evaluar
                </Button>
              </div>
              <div className="space-y-2">
                {evaluaciones.map((ev) => (
                  <div
                    key={ev.categoria}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {ev.categoria.replace(/_/g, " ")}
                      </p>
                      {ev.observaciones && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ev.observaciones}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono tabular-nums text-sm font-bold">
                        {ev.puntaje}/10
                      </span>
                      {ev.peso !== 1 && (
                        <p className="text-[10px] text-muted-foreground">
                          ×{ev.peso}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <EvaluacionDialog
            open={evalDialog}
            onOpenChange={setEvalDialog}
            solicitudId={solicitud.id}
            existing={evaluaciones}
            onSuccess={onRefresh}
          />
        </div>
      ),
    },
    {
      id: "documentos",
      label: "Documentos",
      content: loadingDetail ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <DocField label="CUIT" url={detail?.docCuit as string} />
          <DocField
            label="Habilitación"
            url={detail?.docHabilitacion as string}
          />
          <DocField label="Seguro" url={detail?.docSeguro as string} />
          <DocList label="Fotos" urls={detail?.docFotos as string[]} />
          <DocList label="Otros" urls={detail?.docOtros as string[]} />
          {!detail?.docCuit &&
            !detail?.docHabilitacion &&
            !detail?.docSeguro &&
            !(detail?.docFotos as string[])?.length &&
            !(detail?.docOtros as string[])?.length && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Sin documentos</p>
              </div>
            )}
        </div>
      ),
    },
    {
      id: "convenio",
      label: "Convenio",
      content: (
        <ConvenioTab
          convenio={convenio}
          solicitudId={solicitud.id}
          estado={estado}
          onRefresh={onRefresh}
        />
      ),
    },
  ];

  const actions = transiciones.length > 0
    ? transiciones.map((t) => ({
        label: ESTADO_LABELS[t] ?? t,
        icon: t === "RECHAZADA" ? XCircle : t === "ACTIVO" ? CheckCircle2 : ArrowRight,
        variant: (t === "RECHAZADA" ? "destructive" : "outline") as
          | "destructive"
          | "outline",
        onClick: () => {
          if (t === "ACTIVO") {
            activarTaller();
          } else {
            cambiarEstado(t);
          }
        },
      }))
    : [];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={solicitud.nombreTaller}
      subtitle={`${solicitud.ciudad}, ${solicitud.provincia} · ${solicitud.contactoNombre}`}
      status={estado}
      tabs={tabs}
      actions={changing ? [] : actions}
      headerExtra={
        changing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : undefined
      }
    />
  );
}

// ── Evaluación Dialog ──

function EvaluacionDialog({
  open,
  onOpenChange,
  solicitudId,
  existing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string;
  existing: Array<{
    categoria: string;
    puntaje: number;
    observaciones: string | null;
  }>;
  onSuccess: () => void;
}) {
  const existingMap = Object.fromEntries(
    existing.map((e) => [e.categoria, e])
  );

  const [scores, setScores] = useState<
    Record<string, { puntaje: number; observaciones: string }>
  >(() => {
    const init: Record<string, { puntaje: number; observaciones: string }> = {};
    for (const cat of CATEGORIAS_EVAL) {
      init[cat] = {
        puntaje: existingMap[cat]?.puntaje ?? 5,
        observaciones: existingMap[cat]?.observaciones ?? "",
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const evaluaciones = CATEGORIAS_EVAL.map((cat) => ({
        categoria: cat,
        puntaje: scores[cat]?.puntaje ?? 5,
        peso: 1.0,
        observaciones: scores[cat]?.observaciones || null,
      }));

      const res = await fetch(
        `/api/solicitudes-taller/${solicitudId}/evaluar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluaciones }),
        }
      );

      if (res.ok) {
        toast.success("Evaluación guardada");
        onOpenChange(false);
        onSuccess();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluar Solicitud</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {CATEGORIAS_EVAL.map((cat) => (
            <div
              key={cat}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">
                  {cat.replace(/_/g, " ")}
                </Label>
                <Input
                  placeholder="Observaciones..."
                  className="mt-1.5 h-8 text-xs"
                  value={scores[cat]?.observaciones ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScores((p) => ({
                      ...p,
                      [cat]: { puntaje: p[cat]?.puntaje ?? 5, observaciones: val },
                    }));
                  }}
                />
              </div>
              <div className="shrink-0 w-16 text-center">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  className="h-8 text-center font-mono text-sm"
                  value={scores[cat]?.puntaje ?? 5}
                  onChange={(e) => {
                    const val = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                    setScores((p) => ({
                      ...p,
                      [cat]: { puntaje: val, observaciones: p[cat]?.observaciones ?? "" },
                    }));
                  }}
                />
                <span className="text-[10px] text-muted-foreground">/10</span>
              </div>
            </div>
          ))}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? "Guardando..." : "Guardar Evaluación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Convenio Tab ──

function ConvenioTab({
  convenio,
  solicitudId,
  estado,
  onRefresh,
}: {
  convenio: Record<string, unknown> | null;
  solicitudId: string;
  estado: string;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    tarifaHoraBase: "",
    margenRepuestos: "",
    plazoFacturaDias: "30",
    fechaInicio: new Date().toISOString().split("T")[0],
    zonaCobertura: "",
    otMaxMes: "",
  });

  async function handleCreate() {
    if (!form.tarifaHoraBase || !form.fechaInicio) return;
    setCreating(true);
    try {
      const res = await fetch(
        `/api/solicitudes-taller/${solicitudId}/generar-convenio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tarifaHoraBase: parseFloat(form.tarifaHoraBase),
            margenRepuestos: form.margenRepuestos
              ? parseFloat(form.margenRepuestos)
              : null,
            plazoFacturaDias: parseInt(form.plazoFacturaDias) || 30,
            fechaInicio: form.fechaInicio,
            zonaCobertura: form.zonaCobertura || null,
            otMaxMes: form.otMaxMes ? parseInt(form.otMaxMes) : null,
          }),
        }
      );
      if (res.ok) {
        toast.success("Convenio generado");
        onRefresh();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al generar convenio");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setCreating(false);
  }

  if (convenio) {
    return (
      <div className="space-y-4">
        <DetailGrid>
          <DetailField
            label="Tarifa Hora"
            value={`$${Number(convenio.tarifaHoraBase).toLocaleString()}`}
            mono
          />
          <DetailField
            label="Margen Repuestos"
            value={
              convenio.margenRepuestos
                ? `${convenio.margenRepuestos}%`
                : undefined
            }
            mono
          />
          <DetailField
            label="Plazo Factura"
            value={`${convenio.plazoFacturaDias} días`}
            mono
          />
          <DetailField
            label="OT Máx/Mes"
            value={convenio.otMaxMes as number}
            mono
          />
          <DetailField
            label="Zona Cobertura"
            value={convenio.zonaCobertura as string}
          />
          <DetailField
            label="Firmado"
            value={
              convenio.firmadoDigital ? (
                <StatusBadge
                  status="COMPLETADA"
                  label="Firmado"
                  showDot={false}
                />
              ) : (
                <StatusBadge
                  status="PENDIENTE"
                  label="Pendiente"
                  showDot={false}
                />
              )
            }
          />
        </DetailGrid>
      </div>
    );
  }

  if (!["APROBADA", "CONVENIO_ENVIADO"].includes(estado)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Handshake className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">Sin convenio</p>
        <p className="text-xs text-muted-foreground mt-1">
          Aprobá la solicitud primero para generar un convenio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Definí las condiciones comerciales del convenio.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Tarifa Hora ($) *</Label>
          <Input
            type="number"
            placeholder="2500"
            className="mt-1"
            value={form.tarifaHoraBase}
            onChange={(e) =>
              setForm((p) => ({ ...p, tarifaHoraBase: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Margen Repuestos (%)</Label>
          <Input
            type="number"
            placeholder="15"
            className="mt-1"
            value={form.margenRepuestos}
            onChange={(e) =>
              setForm((p) => ({ ...p, margenRepuestos: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Plazo Factura (días)</Label>
          <Input
            type="number"
            className="mt-1"
            value={form.plazoFacturaDias}
            onChange={(e) =>
              setForm((p) => ({ ...p, plazoFacturaDias: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs">OT Máx/Mes</Label>
          <Input
            type="number"
            placeholder="50"
            className="mt-1"
            value={form.otMaxMes}
            onChange={(e) =>
              setForm((p) => ({ ...p, otMaxMes: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Fecha Inicio *</Label>
          <Input
            type="date"
            className="mt-1"
            value={form.fechaInicio}
            onChange={(e) =>
              setForm((p) => ({ ...p, fechaInicio: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs">Zona Cobertura</Label>
          <Input
            placeholder="CABA + GBA Norte"
            className="mt-1"
            value={form.zonaCobertura}
            onChange={(e) =>
              setForm((p) => ({ ...p, zonaCobertura: e.target.value }))
            }
          />
        </div>
      </div>
      <Button
        onClick={handleCreate}
        disabled={!form.tarifaHoraBase || !form.fechaInicio || creating}
        className="w-full"
      >
        {creating ? "Generando..." : "Generar Convenio"}
      </Button>
    </div>
  );
}

// ── Doc Helpers ──

function DocField({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        Ver documento
      </a>
    </div>
  );
}

function DocList({ label, urls }: { label: string; urls?: string[] | null }) {
  if (!urls?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label} ({urls.length})
      </p>
      {urls.map((url, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2 rounded border bg-card"
        >
          <span className="text-xs truncate max-w-[300px]">{url.split("/").pop()}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline shrink-0 ml-2"
          >
            Ver
          </a>
        </div>
      ))}
    </div>
  );
}
