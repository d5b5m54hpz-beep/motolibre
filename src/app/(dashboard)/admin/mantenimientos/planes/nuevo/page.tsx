"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  GripVertical,
  ArrowUp,
  ArrowDown,
  Clock,
  Wrench,
  Package,
  DollarSign,
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
}

interface Repuesto {
  tempId: string;
  nombre: string;
  codigoOEM: string;
  cantidad: number;
  unidad: string;
  capacidad: string;
  precioUnitario: number | null;
}

export default function NuevoPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

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
        tareas: tareas.map((t) => ({
          categoria: t.categoria,
          descripcion: t.descripcion,
          accion: t.accion,
          tiempoEstimado: t.tiempoEstimado,
        })),
        repuestos: repuestos.map((r) => ({
          nombre: r.nombre,
          codigoOEM: r.codigoOEM || null,
          cantidad: r.cantidad,
          unidad: r.unidad || null,
          capacidad: r.capacidad || null,
          precioUnitario: r.precioUnitario,
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
        description="Definí las tareas, repuestos y costos del service"
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
          <StepInfoGeneral info={info} onChange={setInfo} />
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
}: {
  info: InfoState;
  onChange: (info: InfoState) => void;
}) {
  const set = (key: keyof InfoState, value: string) => onChange({ ...info, [key]: value });

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
        <Label>Descripción</Label>
        <Textarea
          value={info.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Service preventivo estándar para motos 125cc..."
          rows={2}
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Vehículo</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Input
              value={info.marcaMoto}
              onChange={(e) => set("marcaMoto", e.target.value)}
              placeholder="Honda, Yamaha, Bajaj..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Input
              value={info.modeloMoto}
              onChange={(e) => set("modeloMoto", e.target.value)}
              placeholder="CB 125F, YBR 125..."
            />
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
            <Label>Días Intervalo</Label>
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
        <h3 className="text-sm font-medium mb-3">Garantía (opcional)</h3>
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
            Agregá las tareas de mantenimiento que componen este plan.
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
            <span>Acción</span>
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
                </div>
                <p className="text-sm mt-0.5 truncate">{t.descripcion}</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20 justify-center">
                {ACCIONES.find((a) => a.value === t.accion)?.label ?? t.accion}
              </Badge>
              <span className="text-xs font-mono tabular-nums text-muted-foreground text-center">
                {t.tiempoEstimado ? `${t.tiempoEstimado} min` : "—"}
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
            Agregá los repuestos e insumos necesarios para este service.
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
            <span>Código</span>
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
                <p className="text-sm font-medium truncate">{r.nombre}</p>
                {r.unidad && <p className="text-xs text-muted-foreground">{r.unidad}</p>}
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate">
                {r.codigoOEM || "—"}
              </span>
              <span className="text-sm font-mono tabular-nums text-center">{r.cantidad}</span>
              <span className="text-sm font-mono tabular-nums text-right">
                {r.precioUnitario ? formatMoney(r.precioUnitario) : "—"}
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
            {tiempoTotal > 0 ? `${tiempoTotal}` : "—"}
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

      {/* Costos */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Costos estimados</h4>
        <div className="space-y-3">
          {repuestos.filter((r) => r.precioUnitario).map((r) => (
            <div key={r.tempId} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {r.nombre} × {r.cantidad}
              </span>
              <span className="font-mono tabular-nums">
                {formatMoney((r.precioUnitario ?? 0) * r.cantidad)}
              </span>
            </div>
          ))}
          {costoRepuestos > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="font-medium">Subtotal repuestos</span>
              <span className="font-mono tabular-nums font-semibold">
                {formatMoney(costoRepuestos)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-base pt-3 border-t-2">
            <span className="font-bold">COSTO TOTAL ESTIMADO</span>
            <span className="font-mono tabular-nums font-bold text-lg">
              {formatMoney(costoRepuestos)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            * El costo de mano de obra se calcula al asignar taller en la OT. El precio al rider se define en el módulo de Pricing.
          </p>
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
  });

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
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{tarea ? "Editar Tarea" : "Agregar Tarea"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Categoría *</Label>
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
            <Label>Descripción *</Label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Cambio de aceite motor"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Acción *</Label>
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
  });

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
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{repuesto ? "Editar Repuesto" : "Agregar Repuesto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Aceite motor 10W-40 1L"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Código OEM</Label>
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
            <Label>Capacidad (para líquidos)</Label>
            <Input
              value={form.capacidad}
              onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
              placeholder="1.1L ± 0.1L"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Precio unitario</Label>
            <Input
              type="number"
              value={form.precioUnitario ?? ""}
              onChange={(e) => setForm({ ...form, precioUnitario: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="4500"
            />
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
