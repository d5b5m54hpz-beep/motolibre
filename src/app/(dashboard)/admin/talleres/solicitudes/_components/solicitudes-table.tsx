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
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { getTransformedUrl } from "@/lib/supabase-url";
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
  Upload,
  Eye,
  Trash2,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";

function isImageUrl(url: string): boolean {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp"].includes(ext);
}

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

          {detail?.latitud != null && detail?.longitud != null && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Ubicación
              </p>
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  title="Ubicación del taller"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(detail.longitud) - 0.005}%2C${Number(detail.latitud) - 0.003}%2C${Number(detail.longitud) + 0.005}%2C${Number(detail.latitud) + 0.003}&layer=mapnik&marker=${detail.latitud}%2C${detail.longitud}`}
                />
              </div>
            </div>
          )}

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
      count: (() => {
        const docs = [detail?.docCuit, detail?.docHabilitacion, detail?.docSeguro].filter(Boolean).length;
        const fotos = ((detail?.docFotos as string[]) ?? []).length;
        const otros = ((detail?.docOtros as string[]) ?? []).length;
        return docs + fotos + otros;
      })(),
      content: loadingDetail ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Documentos Requeridos */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Documentos Requeridos
            </p>
            <div className="space-y-2">
              <DocCard
                label="CUIT"
                url={detail?.docCuit as string}
                solicitudId={solicitud.id}
                tipo="cuit"
                onRefresh={onRefresh}
              />
              <DocCard
                label="Habilitación"
                url={detail?.docHabilitacion as string}
                solicitudId={solicitud.id}
                tipo="habilitacion"
                onRefresh={onRefresh}
              />
              <DocCard
                label="Seguro"
                url={detail?.docSeguro as string}
                solicitudId={solicitud.id}
                tipo="seguro"
                onRefresh={onRefresh}
              />
            </div>
          </div>

          {/* Fotos del Taller */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Fotos del Taller
              </p>
              {((detail?.docFotos as string[]) ?? []).length > 0 && (
                <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-mono">
                  {((detail?.docFotos as string[]) ?? []).length}
                </span>
              )}
            </div>
            <PhotoGallery
              photos={(detail?.docFotos as string[]) ?? []}
              emptyMessage="Sin fotos del taller"
              onDelete={async (index) => {
                const fotos = (detail?.docFotos as string[]) ?? [];
                const url = fotos[index];
                if (!url) return;
                try {
                  const res = await fetch(
                    `/api/solicitudes-taller/${solicitud.id}/delete-doc`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tipo: "fotos", url }),
                    }
                  );
                  if (res.ok) {
                    toast.success("Foto eliminada");
                    onRefresh();
                  } else {
                    const json = await res.json();
                    toast.error(json.error || "Error al eliminar");
                  }
                } catch {
                  toast.error("Error de conexión");
                }
              }}
            />
            <div className="mt-3">
              <DocUploadZone
                solicitudId={solicitud.id}
                tipo="fotos"
                label="Agregar fotos"
                hint="JPG, PNG o WebP · máx 10MB"
                accept="image/*"
                onUploaded={onRefresh}
              />
            </div>
          </div>

          {/* Otros Documentos */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Otros Documentos
              </p>
              {((detail?.docOtros as string[]) ?? []).length > 0 && (
                <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-mono">
                  {((detail?.docOtros as string[]) ?? []).length}
                </span>
              )}
            </div>
            {((detail?.docOtros as string[]) ?? []).map((url, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card mb-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">
                    {url.split("/").pop()?.split("?")[0]}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/solicitudes-taller/${solicitud.id}/delete-doc`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tipo: "otros", url }),
                          }
                        );
                        if (res.ok) {
                          toast.success("Documento eliminado");
                          onRefresh();
                        } else {
                          const json = await res.json();
                          toast.error(json.error || "Error al eliminar");
                        }
                      } catch {
                        toast.error("Error de conexión");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <DocUploadZone
              solicitudId={solicitud.id}
              tipo="otros"
              label="Agregar documentos"
              hint="PDF, JPG, PNG o WebP · máx 10MB"
              accept="image/*,application/pdf"
              onUploaded={onRefresh}
            />
          </div>
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

// ── Doc Card ──

function DocCard({
  label,
  url,
  solicitudId,
  tipo,
  onRefresh,
}: {
  label: string;
  url?: string | null;
  solicitudId: string;
  tipo: string;
  onRefresh: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!url) {
    return (
      <DocUploadZone
        solicitudId={solicitudId}
        tipo={tipo}
        label={`Subir ${label}`}
        hint="PDF, JPG, PNG o WebP · máx 10MB"
        accept="image/*,application/pdf"
        onUploaded={onRefresh}
      />
    );
  }

  const isImage = isImageUrl(url) && !imgError;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/solicitudes-taller/${solicitudId}/delete-doc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo }),
        }
      );
      if (res.ok) {
        toast.success(`${label} eliminado`);
        onRefresh();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setDeleting(false);
  }

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
      {isImage ? (
        <div className="w-16 h-11 rounded overflow-hidden bg-muted shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getTransformedUrl(url, { width: 120, height: 80, quality: 70 })}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-16 h-11 rounded bg-muted flex items-center justify-center shrink-0">
          {imgError ? (
            <ImageOff className="h-4 w-4 text-muted-foreground/50" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {url.split("/").pop()?.split("?")[0]}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Upload Drop Zone ──

function DocUploadZone({
  solicitudId,
  tipo,
  label,
  hint,
  accept,
  onUploaded,
}: {
  solicitudId: string;
  tipo: string;
  label: string;
  hint?: string;
  accept: string;
  onUploaded: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);

      const res = await fetch(
        `/api/solicitudes-taller/${solicitudId}/upload`,
        { method: "POST", body: formData }
      );

      if (res.ok) {
        toast.success("Archivo subido");
        onUploaded();
      } else {
        const json = await res.json();
        toast.error(json.error || "Error al subir");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setIsUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-1 h-16 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20 hover:border-primary/40"
      }`}
    >
      {isUploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          {hint && (
            <span className="text-[10px] text-muted-foreground/60">{hint}</span>
          )}
        </>
      )}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
