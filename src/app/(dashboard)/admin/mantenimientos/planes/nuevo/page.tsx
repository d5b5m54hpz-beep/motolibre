"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Wrench,
  Package,
  DollarSign,
  Search,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// ── Constants ──
const TIPOS_SERVICE = [
  { value: "SERVICE_5000KM", label: "Service 5.000 km" },
  { value: "SERVICE_10000KM", label: "Service 10.000 km" },
  { value: "SERVICE_15000KM", label: "Service 15.000 km" },
  { value: "SERVICE_20000KM", label: "Service 20.000 km" },
  { value: "SERVICE_GENERAL", label: "Service General" },
  { value: "REPARACION", label: "Reparación" },
  { value: "INSPECCION", label: "Inspección" },
  { value: "OTRO", label: "Otro" },
];

const CATEGORIAS = [
  "MOTOR",
  "FRENOS",
  "SUSPENSION",
  "ELECTRICA",
  "CARROCERIA",
  "NEUMATICOS",
  "TRANSMISION",
  "LUBRICACION",
  "INSPECCION",
  "OTRO",
] as const;

const ACCIONES = [
  { value: "CHECK", label: "Check" },
  { value: "REPLACE", label: "Reemplazo" },
  { value: "CHECK_AND_ADJUST", label: "Check & Ajuste" },
  { value: "ADJUST", label: "Ajuste" },
];

const STEPS = [
  { id: 1, label: "Info General" },
  { id: 2, label: "Tareas" },
  { id: 3, label: "Repuestos" },
  { id: 4, label: "Costos y Publicar" },
];

// ── Types ──
interface Tarea {
  tempId: string;
  categoria: string;
  descripcion: string;
  accion: string;
  tiempoEstimado: number | null;
  itemServiceId?: string | null;
  saveToItemCatalog?: boolean;
}

interface Repuesto {
  tempId: string;
  nombre: string;
  codigoOEM: string;
  cantidad: number;
  unidad: string;
  capacidad: string;
  precioUnitario: number | null;
  repuestoId?: string | null;
}

interface MarcaModelo {
  marca: string;
  modelos: string[];
}

interface ItemServiceResult {
  id: string;
  categoria: string;
  descripcion: string;
  accion: string;
  tiempoEstimado: number | null;
}

interface RepuestoSearchResult {
  id: string;
  nombre: string;
  codigoOEM: string | null;
  precioUnitario: number | null;
  unidad: string | null;
  stock: number | null;
}

// ── Helpers ──
function formatPriceInput(value: number | null): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("es-AR").format(value);
}

function parsePriceInput(raw: string): number | null {
  const cleaned = raw.replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export default function NuevoPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // ── Marcas/Modelos data ──
  const [marcasModelos, setMarcasModelos] = useState<MarcaModelo[]>([]);

  useEffect(() => {
    fetch("/api/motos/marcas-modelos")
      .then((r) => r.json())
      .then((d) => setMarcasModelos(d.data ?? []))
      .catch(() => {});
  }, []);

  // ── Form state ──
  const [info, setInfo] = useState({
    nombre: "",
    tipoService: "SERVICE_GENERAL",
    descripcion: "",
    marcaMoto: "",
    modeloMoto: "",
    kmIntervalo: "",
    diasIntervalo: "",
    garantiaMeses: "",
    garantiaKm: "",
  });

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);

  // Dialog state for adding items
  const [tareaDialog, setTareaDialog] = useState(false);
  const [repuestoDialog, setRepuestoDialog] = useState(false);
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
  const [editingRepuesto, setEditingRepuesto] = useState<Repuesto | null>(null);

  // ── Computed ──
  const tiempoTotal = tareas.reduce((sum, t) => sum + (t.tiempoEstimado ?? 0), 0);
  const costoRepuestos = repuestos.reduce(
    (sum, r) => sum + (r.precioUnitario ?? 0) * r.cantidad,
    0
  );

  // ── Navigation ──
  function canProceed(): boolean {
    if (step === 1) return !!info.nombre && !!info.tipoService;
    return true;
  }

  // ── Tarea helpers ──
  function moveTarea(index: number, direction: "up" | "down") {
    const newTareas = [...tareas];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newTareas.length) return;
    const temp = newTareas[index]!;
    newTareas[index] = newTareas[newIndex]!;
    newTareas[newIndex] = temp;
    setTareas(newTareas);
  }

  // ── Save ──
  async function handleSave(estado: "BORRADOR" | "PUBLICADO") {
    setSaving(true);
    try {
      // For tareas that need to be saved to the catalog, POST them first
      const tareasWithCatalogIds = await Promise.all(
        tareas.map(async (t) => {
          if (t.saveToItemCatalog && !t.itemServiceId) {
            try {
              const res = await fetch("/api/items-service", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  categoria: t.categoria,
                  descripcion: t.descripcion,
                  accion: t.accion,
                  tiempoEstimado: t.tiempoEstimado,
                }),
              });
              if (res.ok) {
                const json = await res.json();
                return { ...t, itemServiceId: json.data?.id ?? null };
              }
            } catch {
              // Continue without catalog save
            }
          }
          return t;
        })
      );

      const body = {
        nombre: info.nombre,
        tipoService: info.tipoService,
        descripcion: info.descripcion || null,
        marcaMoto: info.marcaMoto || null,
        modeloMoto: info.modeloMoto || null,
        kmIntervalo: info.kmIntervalo ? parseInt(info.kmIntervalo) : null,
        diasIntervalo: info.diasIntervalo ? parseInt(info.diasIntervalo) : null,
        garantiaMeses: info.garantiaMeses ? parseInt(info.garantiaMeses) : null,
        garantiaKm: info.garantiaKm ? parseInt(info.garantiaKm) : null,
        estado,
        tareas: tareasWithCatalogIds.map((t) => ({
          categoria: t.categoria,
          descripcion: t.descripcion,
          accion: t.accion,
          tiempoEstimado: t.tiempoEstimado,
          itemServiceId: t.itemServiceId ?? null,
        })),
        repuestos: repuestos.map((r) => ({
          nombre: r.nombre,
          codigoOEM: r.codigoOEM || null,
          cantidad: r.cantidad,
          unidad: r.unidad || null,
          capacidad: r.capacidad || null,
          precioUnitario: r.precioUnitario,
          repuestoId: r.repuestoId ?? null,
        })),
      };

      const res = await fetch("/api/mantenimientos/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/admin/mantenimientos/planes");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Plan de Mantenimiento"
        description="Defini las tareas, repuestos y costos del service"
      />

      {/* ── Stepper ── */}
      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => s.id <= step && setStep(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : s.id < step
                  ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                  step === s.id
                    ? "bg-primary-foreground text-primary"
                    : s.id < step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/30 text-muted-foreground"
                )}
              >
                {s.id < step ? <Check className="h-3 w-3" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="h-px w-4 sm:w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step Content ── */}
      <div className="rounded-lg border bg-card p-6">
        {step === 1 && (
          <StepInfoGeneral
            info={info}
            onChange={setInfo}
            marcasModelos={marcasModelos}
          />
        )}

        {step === 2 && (
          <StepTareas
            tareas={tareas}
            onAdd={() => {
              setEditingTarea(null);
              setTareaDialog(true);
            }}
            onEdit={(t) => {
              setEditingTarea(t);
              setTareaDialog(true);
            }}
            onRemove={(id) => setTareas(tareas.filter((t) => t.tempId !== id))}
            onMove={moveTarea}
            tiempoTotal={tiempoTotal}
          />
        )}

        {step === 3 && (
          <StepRepuestos
            repuestos={repuestos}
            onAdd={() => {
              setEditingRepuesto(null);
              setRepuestoDialog(true);
            }}
            onEdit={(r) => {
              setEditingRepuesto(r);
              setRepuestoDialog(true);
            }}
            onRemove={(id) => setRepuestos(repuestos.filter((r) => r.tempId !== id))}
            costoTotal={costoRepuestos}
          />
        )}

        {step === 4 && (
          <StepResumen
            info={info}
            tareas={tareas}
            repuestos={repuestos}
            tiempoTotal={tiempoTotal}
            costoRepuestos={costoRepuestos}
          />
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) {
                router.push("/admin/mantenimientos/planes");
              } else {
                setStep(step - 1);
              }
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancelar" : "Anterior"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave("BORRADOR")}
                disabled={saving}
              >
                Guardar Borrador
              </Button>
              <Button
                onClick={() => handleSave("PUBLICADO")}
                disabled={saving || !info.nombre}
              >
                {saving ? "Guardando..." : "Publicar Plan"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tarea Dialog ── */}
      <TareaDialog
        open={tareaDialog}
        onOpenChange={setTareaDialog}
        tarea={editingTarea}
        onSave={(t) => {
          if (editingTarea) {
            setTareas(tareas.map((x) => (x.tempId === editingTarea.tempId ? { ...t, tempId: editingTarea.tempId } : x)));
          } else {
            setTareas([...tareas, { ...t, tempId: crypto.randomUUID() }]);
          }
          setTareaDialog(false);
        }}
      />

      {/* ── Repuesto Dialog ── */}
      <RepuestoDialog
        open={repuestoDialog}
        onOpenChange={setRepuestoDialog}
        repuesto={editingRepuesto}
        onSave={(r) => {
          if (editingRepuesto) {
            setRepuestos(repuestos.map((x) => (x.tempId === editingRepuesto.tempId ? { ...r, tempId: editingRepuesto.tempId } : x)));
          } else {
            setRepuestos([...repuestos, { ...r, tempId: crypto.randomUUID() }]);
          }
          setRepuestoDialog(false);
        }}
      />
    </div>
  );
}

// ── Info type ──
type InfoState = {
  nombre: string;
  tipoService: string;
  descripcion: string;
  marcaMoto: string;
  modeloMoto: string;
  kmIntervalo: string;
  diasIntervalo: string;
  garantiaMeses: string;
  garantiaKm: string;
};

// ── Step 1: Info General ──
function StepInfoGeneral({
  info,
  onChange,
  marcasModelos,
}: {
  info: InfoState;
  onChange: (info: InfoState) => void;
  marcasModelos: MarcaModelo[];
}) {
  const set = (key: keyof InfoState, value: string) => onChange({ ...info, [key]: value });

  const [customMarca, setCustomMarca] = useState(false);
  const [customModelo, setCustomModelo] = useState(false);

  // Get modelos filtered by selected marca
  const modelosDisponibles =
    info.marcaMoto && info.marcaMoto !== "__TODOS__"
      ? marcasModelos.find((m) => m.marca === info.marcaMoto)?.modelos ?? []
      : [];

  const marcaIsTodos = info.marcaMoto === "__TODOS__" || info.marcaMoto === "";
  const modeloDisabled = marcaIsTodos && !customMarca;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>Nombre del Plan *</Label>
        <Input
          value={info.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Service 5000km Honda CB 125F"
          className="text-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo de Service *</Label>
          <Select value={info.tipoService} onValueChange={(v) => set("tipoService", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_SERVICE.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div />
      </div>

      <div className="space-y-1.5">
        <Label>Descripcion</Label>
        <Textarea
          value={info.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Service preventivo estandar para motos 125cc..."
          rows={2}
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Vehiculo</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Marca */}
          <div className="space-y-1.5">
            <Label>Marca</Label>
            {customMarca ? (
              <div className="flex gap-2">
                <Input
                  value={info.marcaMoto}
                  onChange={(e) => set("marcaMoto", e.target.value)}
                  placeholder="Escribi la marca..."
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setCustomMarca(false);
                    set("marcaMoto", "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select
                value={info.marcaMoto || "__TODOS__"}
                onValueChange={(v) => {
                  if (v === "__AGREGAR_OTRO__") {
                    setCustomMarca(true);
                    set("marcaMoto", "");
                    return;
                  }
                  if (v === "__TODOS__") {
                    onChange({ ...info, marcaMoto: "", modeloMoto: "" });
                    setCustomModelo(false);
                  } else {
                    onChange({ ...info, marcaMoto: v, modeloMoto: "" });
                    setCustomModelo(false);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__TODOS__">Todos</SelectItem>
                  {marcasModelos.map((m) => (
                    <SelectItem key={m.marca} value={m.marca}>
                      {m.marca}
                    </SelectItem>
                  ))}
                  <SelectItem value="__AGREGAR_OTRO__">
                    <span className="text-primary font-medium">+ Agregar otro...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            {customModelo ? (
              <div className="flex gap-2">
                <Input
                  value={info.modeloMoto}
                  onChange={(e) => set("modeloMoto", e.target.value)}
                  placeholder="Escribi el modelo..."
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setCustomModelo(false);
                    set("modeloMoto", "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : customMarca ? (
              <Input
                value={info.modeloMoto}
                onChange={(e) => set("modeloMoto", e.target.value)}
                placeholder="Escribi el modelo..."
              />
            ) : (
              <Select
                value={info.modeloMoto || "__TODOS__"}
                onValueChange={(v) => {
                  if (v === "__AGREGAR_OTRO__") {
                    setCustomModelo(true);
                    set("modeloMoto", "");
                    return;
                  }
                  set("modeloMoto", v === "__TODOS__" ? "" : v);
                }}
                disabled={modeloDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__TODOS__">Todos</SelectItem>
                  {modelosDisponibles.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  {!modeloDisabled && (
                    <SelectItem value="__AGREGAR_OTRO__">
                      <span className="text-primary font-medium">+ Agregar otro...</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Intervalos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Km Intervalo</Label>
            <Input
              type="number"
              value={info.kmIntervalo}
              onChange={(e) => set("kmIntervalo", e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dias Intervalo</Label>
            <Input
              type="number"
              value={info.diasIntervalo}
              onChange={(e) => set("diasIntervalo", e.target.value)}
              placeholder="90"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Garantia (opcional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Meses</Label>
            <Input
              type="number"
              value={info.garantiaMeses}
              onChange={(e) => set("garantiaMeses", e.target.value)}
              placeholder="24"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Km</Label>
            <Input
              type="number"
              value={info.garantiaKm}
              onChange={(e) => set("garantiaKm", e.target.value)}
              placeholder="30000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Tareas ──
function StepTareas({
  tareas,
  onAdd,
  onEdit,
  onRemove,
  onMove,
  tiempoTotal,
}: {
  tareas: Tarea[];
  onAdd: () => void;
  onEdit: (t: Tarea) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  tiempoTotal: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Tareas del Plan</h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar Tarea
        </Button>
      </div>

      {tareas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
          <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Sin tareas</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Agrega las tareas de mantenimiento que componen este plan.
          </p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar primera tarea
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[2rem_1fr_6rem_5rem_4rem_4rem] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Tarea</span>
            <span>Accion</span>
            <span>Tiempo</span>
            <span></span>
            <span></span>
          </div>
          {tareas.map((t, i) => (
            <div
              key={t.tempId}
              className="grid grid-cols-[2rem_1fr_6rem_5rem_4rem_4rem] gap-2 items-center px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {t.categoria}
                  </Badge>
                  {t.itemServiceId && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                      catalogo
                    </Badge>
                  )}
                </div>
                <p className="text-sm mt-0.5 truncate">{t.descripcion}</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20 justify-center">
                {ACCIONES.find((a) => a.value === t.accion)?.label ?? t.accion}
              </Badge>
              <span className="text-xs font-mono tabular-nums text-muted-foreground text-center">
                {t.tiempoEstimado ? `${t.tiempoEstimado} min` : "\u2014"}
              </span>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onMove(i, "up")}
                  disabled={i === 0}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onMove(i, "down")}
                  disabled={i === tareas.length - 1}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(t)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  title="Editar"
                >
                  <Wrench className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onRemove(t.tempId)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {tiempoTotal > 0 && (
            <div className="text-right text-sm text-muted-foreground font-mono tabular-nums pt-2">
              Tiempo total: <span className="font-semibold text-foreground">{tiempoTotal} min</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Repuestos ──
function StepRepuestos({
  repuestos,
  onAdd,
  onEdit,
  onRemove,
  costoTotal,
}: {
  repuestos: Repuesto[];
  onAdd: () => void;
  onEdit: (r: Repuesto) => void;
  onRemove: (id: string) => void;
  costoTotal: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Repuestos del Plan</h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar Repuesto
        </Button>
      </div>

      {repuestos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Sin repuestos</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Agrega los repuestos e insumos necesarios para este service.
          </p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar primer repuesto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_8rem_4rem_6rem_4rem] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Repuesto</span>
            <span>Codigo</span>
            <span className="text-center">Cant</span>
            <span className="text-right">Precio</span>
            <span></span>
          </div>
          {repuestos.map((r) => (
            <div
              key={r.tempId}
              className="grid grid-cols-[1fr_8rem_4rem_6rem_4rem] gap-2 items-center px-3 py-2.5 rounded-lg border bg-card"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{r.nombre}</p>
                  {r.repuestoId && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-green-500/10 text-green-600 border-green-500/20">
                      inventario
                    </Badge>
                  )}
                </div>
                {r.unidad && <p className="text-xs text-muted-foreground">{r.unidad}</p>}
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate">
                {r.codigoOEM || "\u2014"}
              </span>
              <span className="text-sm font-mono tabular-nums text-center">{r.cantidad}</span>
              <span className="text-sm font-mono tabular-nums text-right">
                {r.precioUnitario ? formatMoney(r.precioUnitario) : "\u2014"}
              </span>
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => onEdit(r)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <Package className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onRemove(r.tempId)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {costoTotal > 0 && (
            <div className="text-right text-sm text-muted-foreground font-mono tabular-nums pt-2">
              Total repuestos: <span className="font-semibold text-foreground">{formatMoney(costoTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 4: Resumen y Costos ──
function StepResumen({
  info,
  tareas,
  repuestos,
  tiempoTotal,
  costoRepuestos,
}: {
  info: InfoState;
  tareas: Tarea[];
  repuestos: Repuesto[];
  tiempoTotal: number;
  costoRepuestos: number;
}) {
  const [tarifaHora, setTarifaHora] = useState<number | null>(null);
  const [tarifaFuente, setTarifaFuente] = useState<string | null>(null);
  const [tarifaLoading, setTarifaLoading] = useState(true);
  const [tarifaError, setTarifaError] = useState(false);

  useEffect(() => {
    setTarifaLoading(true);
    fetch("/api/configuracion/tarifa-mano-obra")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.tarifaHora != null) {
          setTarifaHora(d.data.tarifaHora);
          setTarifaFuente(d.data.fuente ?? null);
        } else {
          setTarifaError(true);
        }
      })
      .catch(() => setTarifaError(true))
      .finally(() => setTarifaLoading(false));
  }, []);

  const tarifaMinuto = tarifaHora != null ? tarifaHora / 60 : null;
  const costoManoObra = tarifaMinuto != null ? tiempoTotal * tarifaMinuto : null;
  const costoTotal = (costoManoObra ?? 0) + costoRepuestos;

  // Proyeccion mensual
  const kmIntervalo = info.kmIntervalo ? parseInt(info.kmIntervalo) : null;
  // Assume avg 1500 km/month for a rental moto
  const AVG_KM_MES = 1500;
  const mesesEntreService = kmIntervalo ? Math.round(kmIntervalo / AVG_KM_MES) : null;
  const costoMensualEstimado =
    mesesEntreService && mesesEntreService > 0 ? costoTotal / mesesEntreService : null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">
        Resumen: {info.nombre || "Sin nombre"}
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold font-mono tabular-nums">
            {tiempoTotal > 0 ? `${tiempoTotal}` : "\u2014"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">minutos</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <Wrench className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold font-mono tabular-nums">{tareas.length}</p>
          <p className="text-xs text-muted-foreground mt-1">tareas</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <Package className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold font-mono tabular-nums">{repuestos.length}</p>
          <p className="text-xs text-muted-foreground mt-1">repuestos</p>
        </div>
      </div>

      {/* Tarifa warning */}
      {tarifaError && !tarifaLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Tarifa de mano de obra no configurada
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configurala en Talleres &rarr; Taller Central &rarr; Tarifa/hora
            </p>
          </div>
        </div>
      )}

      {/* Costos */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Costos estimados</h4>
        <div className="space-y-3">
          {/* Mano de obra */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Mano de obra
            </p>
            {tarifaLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando tarifa...
              </div>
            ) : tarifaMinuto != null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-mono tabular-nums">{tiempoTotal}</span> min &times;{" "}
                  <span className="font-mono tabular-nums">{formatMoney(tarifaMinuto)}</span>/min
                </span>
                <span className="font-mono tabular-nums font-medium">
                  {formatMoney(costoManoObra ?? 0)}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Sin tarifa configurada
              </div>
            )}
          </div>

          {/* Repuestos breakdown */}
          {repuestos.filter((r) => r.precioUnitario).length > 0 && (
            <div className="space-y-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Repuestos
              </p>
              {repuestos
                .filter((r) => r.precioUnitario)
                .map((r) => (
                  <div key={r.tempId} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {r.nombre} &times; <span className="font-mono tabular-nums">{r.cantidad}</span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatMoney((r.precioUnitario ?? 0) * r.cantidad)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Subtotals */}
          <div className="space-y-2 pt-3 border-t">
            {costoManoObra != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Subtotal mano de obra</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatMoney(costoManoObra)}
                </span>
              </div>
            )}
            {costoRepuestos > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Subtotal repuestos</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatMoney(costoRepuestos)}
                </span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-base pt-3 border-t-2">
            <span className="font-bold">COSTO TOTAL ESTIMADO</span>
            <span className="font-mono tabular-nums font-bold text-lg">
              {formatMoney(costoTotal)}
            </span>
          </div>

          {/* Proyeccion mensual */}
          {kmIntervalo && mesesEntreService && mesesEntreService > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4 mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Proyeccion mensual
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  1 service cada{" "}
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {mesesEntreService}
                  </span>{" "}
                  meses (basado en ~{AVG_KM_MES} km/mes promedio)
                </p>
                {costoMensualEstimado != null && (
                  <p>
                    Costo mensual estimado por moto:{" "}
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {formatMoney(costoMensualEstimado)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {tarifaMinuto != null && (
            <p className="text-xs text-muted-foreground">
              * El precio al rider se define en el modulo de Pricing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Tarea Dialog ──
function TareaDialog({
  open,
  onOpenChange,
  tarea,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarea: Tarea | null;
  onSave: (t: Tarea) => void;
}) {
  const [form, setForm] = useState<Omit<Tarea, "tempId">>({
    categoria: tarea?.categoria ?? "MOTOR",
    descripcion: tarea?.descripcion ?? "",
    accion: tarea?.accion ?? "CHECK",
    tiempoEstimado: tarea?.tiempoEstimado ?? null,
    itemServiceId: tarea?.itemServiceId ?? null,
    saveToItemCatalog: false,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ItemServiceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFromCatalog, setSelectedFromCatalog] = useState(!!tarea?.itemServiceId);

  // Reset when dialog opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm({
        categoria: tarea?.categoria ?? "MOTOR",
        descripcion: tarea?.descripcion ?? "",
        accion: tarea?.accion ?? "CHECK",
        tiempoEstimado: tarea?.tiempoEstimado ?? null,
        itemServiceId: tarea?.itemServiceId ?? null,
        saveToItemCatalog: false,
      });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedFromCatalog(!!tarea?.itemServiceId);
    }
  }

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/items-service/search?q=${encodeURIComponent(searchQuery)}`
        );
        const json = await res.json();
        setSearchResults(json.data ?? []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function selectCatalogItem(item: ItemServiceResult) {
    setForm({
      ...form,
      categoria: item.categoria,
      descripcion: item.descripcion,
      accion: item.accion,
      tiempoEstimado: item.tiempoEstimado,
      itemServiceId: item.id,
      saveToItemCatalog: false,
    });
    setSelectedFromCatalog(true);
    setSearchQuery("");
    setSearchResults([]);
  }

  function clearCatalogSelection() {
    setForm({
      ...form,
      itemServiceId: null,
    });
    setSelectedFromCatalog(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarea ? "Editar Tarea" : "Agregar Tarea"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Search from catalog */}
          {!tarea && (
            <div className="space-y-2">
              <Label>Buscar en catalogo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarea existente..."
                  className="pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-md border max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectCatalogItem(item)}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {item.categoria}
                        </Badge>
                        <span className="text-sm truncate">{item.descripcion}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{ACCIONES.find((a) => a.value === item.accion)?.label ?? item.accion}</span>
                        {item.tiempoEstimado && (
                          <span className="font-mono tabular-nums">{item.tiempoEstimado} min</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground">No se encontraron resultados</p>
              )}

              {/* Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    &mdash; o crear tarea nueva &mdash;
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selected from catalog indicator */}
          {selectedFromCatalog && form.itemServiceId && (
            <div className="flex items-center justify-between rounded-md bg-blue-500/10 px-3 py-2">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Seleccionada del catalogo (podes editar los campos)
              </span>
              <button
                type="button"
                onClick={clearCatalogSelection}
                className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Desvincular
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descripcion *</Label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Cambio de aceite motor"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Accion *</Label>
            <div className="grid grid-cols-2 gap-2">
              {ACCIONES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setForm({ ...form, accion: a.value })}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    form.accion === a.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tiempo estimado (min)</Label>
            <Input
              type="number"
              value={form.tiempoEstimado ?? ""}
              onChange={(e) => setForm({ ...form, tiempoEstimado: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="15"
            />
          </div>

          {/* Save to catalog checkbox */}
          {!tarea && !selectedFromCatalog && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="saveToItemCatalog"
                checked={form.saveToItemCatalog ?? false}
                onCheckedChange={(checked) =>
                  setForm({ ...form, saveToItemCatalog: checked === true })
                }
              />
              <label
                htmlFor="saveToItemCatalog"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Guardar en catalogo para futuro reuso
              </label>
            </div>
          )}

          <Button
            onClick={() => onSave({ ...form, tempId: "" })}
            disabled={!form.descripcion}
            className="w-full"
          >
            {tarea ? "Guardar Cambios" : "Agregar Tarea"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add/Edit Repuesto Dialog ──
function RepuestoDialog({
  open,
  onOpenChange,
  repuesto,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repuesto: Repuesto | null;
  onSave: (r: Repuesto) => void;
}) {
  const [form, setForm] = useState<Omit<Repuesto, "tempId">>({
    nombre: repuesto?.nombre ?? "",
    codigoOEM: repuesto?.codigoOEM ?? "",
    cantidad: repuesto?.cantidad ?? 1,
    unidad: repuesto?.unidad ?? "",
    capacidad: repuesto?.capacidad ?? "",
    precioUnitario: repuesto?.precioUnitario ?? null,
    repuestoId: repuesto?.repuestoId ?? null,
  });

  // Price input display value
  const [precioDisplay, setPrecioDisplay] = useState(
    repuesto?.precioUnitario != null ? formatPriceInput(repuesto.precioUnitario) : ""
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RepuestoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFromInventory, setSelectedFromInventory] = useState(!!repuesto?.repuestoId);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm({
        nombre: repuesto?.nombre ?? "",
        codigoOEM: repuesto?.codigoOEM ?? "",
        cantidad: repuesto?.cantidad ?? 1,
        unidad: repuesto?.unidad ?? "",
        capacidad: repuesto?.capacidad ?? "",
        precioUnitario: repuesto?.precioUnitario ?? null,
        repuestoId: repuesto?.repuestoId ?? null,
      });
      setPrecioDisplay(
        repuesto?.precioUnitario != null ? formatPriceInput(repuesto.precioUnitario) : ""
      );
      setSearchQuery("");
      setSearchResults([]);
      setSelectedFromInventory(!!repuesto?.repuestoId);
    }
  }

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/repuestos/search?q=${encodeURIComponent(searchQuery)}`
        );
        const json = await res.json();
        setSearchResults(json.data ?? []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function selectInventoryItem(item: RepuestoSearchResult) {
    const precio = item.precioUnitario ?? null;
    setForm({
      ...form,
      nombre: item.nombre,
      codigoOEM: item.codigoOEM ?? "",
      precioUnitario: precio,
      unidad: item.unidad ?? form.unidad,
      repuestoId: item.id,
    });
    setPrecioDisplay(precio != null ? formatPriceInput(precio) : "");
    setSelectedFromInventory(true);
    setSearchQuery("");
    setSearchResults([]);
  }

  function clearInventorySelection() {
    setForm({
      ...form,
      repuestoId: null,
    });
    setSelectedFromInventory(false);
  }

  function handlePrecioChange(raw: string) {
    // Allow only digits and dots for thousands separator
    const cleaned = raw.replace(/[^\d.]/g, "");
    setPrecioDisplay(cleaned);
    setForm({ ...form, precioUnitario: parsePriceInput(cleaned) });
  }

  function handlePrecioBlur() {
    // Re-format on blur
    if (form.precioUnitario != null) {
      setPrecioDisplay(formatPriceInput(form.precioUnitario));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{repuesto ? "Editar Repuesto" : "Agregar Repuesto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Search from inventory */}
          {!repuesto && (
            <div className="space-y-2">
              <Label>Buscar en inventario</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar repuesto en inventario..."
                  className="pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-md border max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectInventoryItem(item)}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.nombre}</span>
                        {item.precioUnitario != null && (
                          <span className="text-sm font-mono tabular-nums text-primary shrink-0 ml-2">
                            {formatMoney(item.precioUnitario)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {item.codigoOEM && (
                          <span className="font-mono">{item.codigoOEM}</span>
                        )}
                        {item.stock != null && (
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              item.stock > 0 ? "text-green-600" : "text-red-500"
                            )}
                          >
                            Stock: {item.stock}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground">No se encontraron resultados</p>
              )}

              {/* Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    &mdash; o crear repuesto nuevo &mdash;
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selected from inventory indicator */}
          {selectedFromInventory && form.repuestoId && (
            <div className="flex items-center justify-between rounded-md bg-green-500/10 px-3 py-2">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                Vinculado al inventario (podes editar los campos)
              </span>
              <button
                type="button"
                onClick={clearInventorySelection}
                className="text-xs text-green-600 dark:text-green-400 underline hover:no-underline"
              >
                Desvincular
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Aceite motor 10W-40 1L"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Codigo OEM</Label>
            <Input
              value={form.codigoOEM}
              onChange={(e) => setForm({ ...form, codigoOEM: e.target.value })}
              placeholder="MOT-10W40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="litro">Litro</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="metro">Metro</SelectItem>
                  <SelectItem value="juego">Juego</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Capacidad (para liquidos)</Label>
            <Input
              value={form.capacidad}
              onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
              placeholder="1.1L +/- 0.1L"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Precio unitario</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={precioDisplay}
                onChange={(e) => handlePrecioChange(e.target.value)}
                onBlur={handlePrecioBlur}
                placeholder="4.500"
                className="pl-9 font-mono tabular-nums"
              />
            </div>
          </div>

          <Button
            onClick={() => onSave({ ...form, tempId: "" })}
            disabled={!form.nombre}
            className="w-full"
          >
            {repuesto ? "Guardar Cambios" : "Agregar Repuesto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
