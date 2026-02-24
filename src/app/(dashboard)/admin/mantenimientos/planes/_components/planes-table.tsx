"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { planesColumns, type PlanRow } from "./planes-columns";
import { formatMoney } from "@/lib/format";
import {
  ClipboardList,
  Plus,
  Download,
  Wrench,
  FileText,
  Copy,
  Trash2,
  Package,
  Clock,
  DollarSign,
  Search,
  AlertTriangle,
  CheckCircle,
  Link2,
} from "lucide-react";

// ── Types ──
interface MotoOption {
  id: string;
  patente: string | null;
  marca: string;
  modelo: string;
  km: number;
}

interface PlanDetail {
  id: string;
  nombre: string;
  tipoService: string;
  descripcion: string | null;
  marcaMoto: string | null;
  modeloMoto: string | null;
  kmIntervalo: number | null;
  diasIntervalo: number | null;
  garantiaMeses: number | null;
  garantiaKm: number | null;
  estado: string;
  activo: boolean;
  tareas: {
    id: string;
    categoria: string;
    descripcion: string;
    accion?: string;
    orden: number;
    tiempoEstimado?: number | null;
  }[];
  repuestos: {
    id: string;
    nombre: string;
    codigoOEM?: string | null;
    cantidad: number;
    unidad?: string | null;
    precioUnitario?: number | null;
    repuestoId?: string | null;
  }[];
}

// ── Filter options ──
const TIPO_OPTIONS = [
  { label: "5.000 km", value: "SERVICE_5000KM" },
  { label: "10.000 km", value: "SERVICE_10000KM" },
  { label: "15.000 km", value: "SERVICE_15000KM" },
  { label: "20.000 km", value: "SERVICE_20000KM" },
  { label: "General", value: "SERVICE_GENERAL" },
  { label: "Reparación", value: "REPARACION" },
  { label: "Inspección", value: "INSPECCION" },
  { label: "Otro", value: "OTRO" },
];

const ESTADO_OPTIONS = [
  { label: "Borrador", value: "BORRADOR" },
  { label: "Publicado", value: "PUBLICADO" },
  { label: "Archivado", value: "ARCHIVADO" },
];

const filterableColumns: FilterableColumn[] = [
  { id: "tipoService", title: "Tipo", options: TIPO_OPTIONS },
  { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
];

const TIPO_LABELS: Record<string, string> = {
  SERVICE_5000KM: "5.000 km",
  SERVICE_10000KM: "10.000 km",
  SERVICE_15000KM: "15.000 km",
  SERVICE_20000KM: "20.000 km",
  SERVICE_GENERAL: "General",
  REPARACION: "Reparación",
  INSPECCION: "Inspección",
  OTRO: "Otro",
};

const ACCION_LABELS: Record<string, string> = {
  CHECK: "Check",
  REPLACE: "Reemplazo",
  CHECK_AND_ADJUST: "Check & Ajuste",
  ADJUST: "Ajuste",
};

// ── Props ──
interface PlanesTableProps {
  data: PlanRow[];
  planes: PlanDetail[];
  marcas: string[];
}

export function PlanesTable({ data, planes, marcas }: PlanesTableProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [generarOtPlan, setGenerarOtPlan] = useState<PlanDetail | null>(null);

  // Add marca filter dynamically
  const filters: FilterableColumn[] = [
    ...filterableColumns,
    ...(marcas.length > 0
      ? [{ id: "modelo" as const, title: "Marca", options: marcas.map((m) => ({ label: m, value: m })) }]
      : []),
  ];

  const bulkActions: BulkAction<PlanRow>[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows) => {
        const csv = [
          ["Nombre", "Tipo", "Marca", "Modelo", "Km Intervalo", "Tareas", "Repuestos", "Estado"].join(","),
          ...rows.map((r) =>
            [r.nombre, r.tipoService, r.marcaMoto ?? "", r.modeloMoto ?? "", r.kmIntervalo ?? "", r.tareasCount, r.repuestosCount, r.estado].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "planes-service.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  function handleRowClick(row: PlanRow) {
    const plan = planes.find((p) => p.id === row.id);
    if (plan) setSelectedPlan(plan);
  }

  async function handleDuplicate(planId: string) {
    const plan = planes.find((p) => p.id === planId);
    if (!plan) return;

    const res = await fetch("/api/mantenimientos/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: `${plan.nombre} (copia)`,
        tipoService: plan.tipoService,
        descripcion: plan.descripcion,
        marcaMoto: plan.marcaMoto,
        modeloMoto: plan.modeloMoto,
        kmIntervalo: plan.kmIntervalo,
        diasIntervalo: plan.diasIntervalo,
        tareas: plan.tareas.map((t) => ({
          categoria: t.categoria,
          descripcion: t.descripcion,
          accion: t.accion,
          tiempoEstimado: t.tiempoEstimado,
        })),
        repuestos: plan.repuestos.map((r) => ({
          nombre: r.nombre,
          codigoOEM: r.codigoOEM,
          cantidad: r.cantidad,
          unidad: r.unidad,
          precioUnitario: r.precioUnitario,
        })),
      }),
    });

    if (res.ok) {
      router.refresh();
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm("¿Seguro que querés eliminar este plan? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/mantenimientos/planes/${planId}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedPlan(null);
      router.refresh();
    }
  }

  return (
    <>
      <DataTable
        columns={planesColumns}
        data={data}
        searchableColumns={["nombre", "modelo"]}
        searchPlaceholder="Buscar por nombre, marca, modelo..."
        filterableColumns={filters}
        bulkActions={bulkActions}
        onRowClick={handleRowClick}
        emptyState={{
          icon: ClipboardList,
          title: "No hay planes de mantenimiento",
          description: "Creá tu primer plan para estandarizar los services de tu flota.",
          action: {
            label: "Crear plan",
            onClick: () => router.push("/admin/mantenimientos/planes/nuevo"),
          },
        }}
        defaultPageSize={20}
        toolbar={
          <Button
            size="sm"
            className="h-8"
            onClick={() => router.push("/admin/mantenimientos/planes/nuevo")}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Plan
          </Button>
        }
      />

      {/* ── Plan SheetDetail ── */}
      {selectedPlan && (
        <PlanSheet
          plan={selectedPlan}
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
          onGenerarOT={() => {
            setGenerarOtPlan(selectedPlan);
          }}
          onDuplicate={() => handleDuplicate(selectedPlan.id)}
          onDelete={() => handleDelete(selectedPlan.id)}
          onEdit={() => router.push(`/admin/mantenimientos/planes/${selectedPlan.id}/editar`)}
        />
      )}

      {/* ── Generar OT Dialog ── */}
      {generarOtPlan && (
        <GenerarOTDialog
          plan={generarOtPlan}
          open={!!generarOtPlan}
          onOpenChange={(open) => !open && setGenerarOtPlan(null)}
          onSuccess={() => {
            setGenerarOtPlan(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ── Plan Sheet Detail ──
function PlanSheet({
  plan,
  open,
  onOpenChange,
  onGenerarOT,
  onDuplicate,
  onDelete,
  onEdit,
}: {
  plan: PlanDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerarOT: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const tiempoTotal = plan.tareas.reduce((sum, t) => sum + (t.tiempoEstimado ?? 0), 0);
  const tareasConTiempo = plan.tareas.filter((t) => t.tiempoEstimado).length;
  const tiempoParcial = tareasConTiempo < plan.tareas.length && tareasConTiempo > 0;
  const costoRepuestos = plan.repuestos.reduce(
    (sum, r) => sum + (r.precioUnitario ?? 0) * r.cantidad,
    0
  );
  const repuestosSinPrecio = plan.repuestos.filter((r) => !r.precioUnitario);
  const repuestosManuales = plan.repuestos.filter((r) => !r.repuestoId);

  // Fetch labor cost
  const [tarifaHora, setTarifaHora] = useState<number | null>(null);
  const [tarifaFuente, setTarifaFuente] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/configuracion/tarifa-mano-obra")
      .then((r) => r.json())
      .then((json) => {
        setTarifaHora(json.data?.tarifaHora ?? null);
        setTarifaFuente(json.data?.fuente ?? null);
      })
      .catch(() => {});
  }, []);

  const costoManoObra = tarifaHora && tiempoTotal > 0 ? (tarifaHora / 60) * tiempoTotal : 0;
  const costoTotal = costoManoObra + costoRepuestos;

  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold font-mono tabular-nums">
                {tiempoTotal > 0 ? `${tiempoTotal} min` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Tiempo{tiempoParcial ? " (parcial)" : ""}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Wrench className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold font-mono tabular-nums">{plan.tareas.length}</p>
              <p className="text-[10px] text-muted-foreground">Tareas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold font-mono tabular-nums">{plan.repuestos.length}</p>
              <p className="text-[10px] text-muted-foreground">Repuestos</p>
            </div>
          </div>

          {/* Legacy / incomplete warnings */}
          {repuestosSinPrecio.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {repuestosSinPrecio.length} repuesto(s) sin precio. Editá el plan para vincularlos al inventario.
              </p>
            </div>
          )}

          <DetailGrid>
            <DetailField label="Nombre" value={plan.nombre} />
            <DetailField
              label="Tipo"
              value={
                <StatusBadge
                  status={plan.tipoService}
                  variant="info"
                  showDot={false}
                  label={TIPO_LABELS[plan.tipoService] ?? plan.tipoService}
                />
              }
            />
            <DetailField label="Descripción" value={plan.descripcion} className="col-span-2" />
            <DetailField label="Marca" value={plan.marcaMoto ?? "Todos"} />
            <DetailField label="Modelo" value={plan.modeloMoto ?? "Todos"} />
            <DetailField
              label="Intervalo Km"
              value={plan.kmIntervalo ? `${plan.kmIntervalo.toLocaleString("es-AR")} km` : undefined}
              mono
            />
            <DetailField
              label="Intervalo Días"
              value={plan.diasIntervalo ? `${plan.diasIntervalo} días` : undefined}
              mono
            />
            {(plan.garantiaMeses || plan.garantiaKm) && (
              <>
                <DetailField
                  label="Garantía Meses"
                  value={plan.garantiaMeses ? `${plan.garantiaMeses} meses` : undefined}
                  mono
                />
                <DetailField
                  label="Garantía Km"
                  value={plan.garantiaKm ? `${plan.garantiaKm.toLocaleString("es-AR")} km` : undefined}
                  mono
                />
              </>
            )}
          </DetailGrid>

          {/* ── Costos estimados ── */}
          <div className="border-t pt-4">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Costos estimados
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Mano de obra</p>
                <p className="text-lg font-bold font-mono tabular-nums">
                  {costoManoObra > 0 ? formatMoney(costoManoObra) : "—"}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Repuestos</p>
                <p className="text-lg font-bold font-mono tabular-nums">
                  {costoRepuestos > 0 ? formatMoney(costoRepuestos) : "—"}
                </p>
              </div>
            </div>
            {costoTotal > 0 && (
              <div className="flex items-center justify-between mt-3 p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-semibold">Costo Total</span>
                <span className="text-lg font-bold font-mono tabular-nums">
                  {formatMoney(costoTotal)}
                </span>
              </div>
            )}
            {!tarifaHora && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Tarifa de mano de obra no configurada. Configurala en Talleres → Tarifa/hora.
              </p>
            )}
            {tarifaFuente && (
              <p className="text-[10px] text-muted-foreground mt-1">
                * Tarifa: {formatMoney(tarifaHora!)}/hora ({tarifaFuente})
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "tareas",
      label: "Tareas",
      count: plan.tareas.length,
      content: (
        <div className="space-y-2">
          {plan.tareas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin tareas</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Editá el plan para agregar tareas de mantenimiento.
              </p>
            </div>
          ) : (
            <>
              {plan.tareas.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="text-xs font-mono tabular-nums text-muted-foreground bg-muted rounded px-1.5 py-0.5 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {t.categoria}
                      </Badge>
                      {t.accion && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-primary/5 text-primary border-primary/20">
                          {ACCION_LABELS[t.accion] ?? t.accion}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{t.descripcion}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                    {t.tiempoEstimado ? `${t.tiempoEstimado} min` : "— min"}
                  </span>
                </div>
              ))}
              <div className="text-right text-xs text-muted-foreground font-mono tabular-nums pt-2 border-t">
                Tiempo total: {tiempoTotal} min{tiempoParcial ? " (parcial)" : ""}
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      id: "repuestos",
      label: "Repuestos",
      count: plan.repuestos.length,
      content: (
        <div className="space-y-2">
          {plan.repuestos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin repuestos</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Editá el plan para agregar repuestos e insumos.
              </p>
            </div>
          ) : (
            <>
              {plan.repuestos.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {r.repuestoId ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      <p className="text-sm font-medium">{r.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-[18px]">
                      {r.codigoOEM && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {r.codigoOEM}
                        </span>
                      )}
                      {r.unidad && (
                        <span className="text-xs text-muted-foreground">
                          {r.unidad}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-mono tabular-nums">×{r.cantidad}</span>
                    {r.precioUnitario ? (
                      <span className="text-sm font-mono tabular-nums font-semibold">
                        {formatMoney(r.precioUnitario)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin precio</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t">
                {repuestosManuales.length > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {repuestosManuales.length} no vinculado(s) al inventario
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
                  Total: {formatMoney(costoRepuestos)}
                </span>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={plan.nombre}
      subtitle={`${TIPO_LABELS[plan.tipoService] ?? plan.tipoService}${plan.marcaMoto ? ` · ${plan.marcaMoto} ${plan.modeloMoto ?? ""}` : ""}`}
      status={plan.estado}
      tabs={tabs}
      actions={[
        {
          label: "Generar OT",
          icon: Wrench,
          variant: "default",
          onClick: onGenerarOT,
        },
        {
          label: "Editar",
          icon: FileText,
          variant: "outline",
          onClick: onEdit,
        },
        {
          label: "Duplicar",
          icon: Copy,
          variant: "outline",
          onClick: onDuplicate,
        },
        {
          label: "Eliminar",
          icon: Trash2,
          variant: "destructive",
          onClick: onDelete,
        },
      ]}
    />
  );
}

// ── Generar OT Dialog ──
function GenerarOTDialog({
  plan,
  open,
  onOpenChange,
  onSuccess,
}: {
  plan: PlanDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const [motos, setMotos] = useState<MotoOption[]>([]);
  const [selectedMoto, setSelectedMoto] = useState<MotoOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function searchMotos(query: string) {
    if (query.length < 2) {
      setMotos([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/motos?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        setMotos(
          (json.data ?? json).map((m: Record<string, unknown>) => ({
            id: m.id,
            patente: m.patente,
            marca: m.marca,
            modelo: m.modelo,
            km: m.km,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerar() {
    if (!selectedMoto) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mantenimientos/planes/${plan.id}/generar-ot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motoId: selectedMoto.id }),
      });
      if (res.ok) {
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Generar OT desde Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">{plan.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {TIPO_LABELS[plan.tipoService]} · {plan.tareas.length} tareas · {plan.repuestos.length} repuestos
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Identificar Moto *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedMoto(null);
                  void searchMotos(e.target.value);
                }}
                placeholder="Buscar por patente, VIN o modelo..."
                className="pl-9"
              />
            </div>
            {motos.length > 0 && !selectedMoto && (
              <div className="max-h-[160px] overflow-y-auto rounded-md border bg-popover">
                {motos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMoto(m);
                      setSearch(m.patente ?? `${m.marca} ${m.modelo}`);
                      setMotos([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold">{m.patente ?? "Sin patentar"}</span>
                      <span className="text-muted-foreground ml-2">{m.marca} {m.modelo}</span>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {m.km.toLocaleString("es-AR")} km
                    </span>
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <p className="text-xs text-muted-foreground">Buscando...</p>
            )}
          </div>

          {selectedMoto && (
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-sm">
                    {selectedMoto.patente ?? "Sin patentar"}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {selectedMoto.marca} {selectedMoto.modelo}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Km actual: {selectedMoto.km.toLocaleString("es-AR")} km
              </p>
            </div>
          )}

          <Button
            onClick={handleGenerar}
            disabled={!selectedMoto || saving}
            className="w-full"
          >
            {saving ? "Generando..." : "Generar OT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
