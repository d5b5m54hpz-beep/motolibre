"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  Loader2,
  Grid3X3,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  Package,
  Wrench,
  X,
  BookOpen,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

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

const CATEGORY_ICONS: Record<string, string> = {
  MOTOR: "M",
  FRENOS: "F",
  SUSPENSION: "S",
  ELECTRICA: "E",
  CARROCERIA: "C",
  NEUMATICOS: "N",
  TRANSMISION: "T",
  LUBRICACION: "L",
  INSPECCION: "I",
  OTRO: "O",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface MarcaModelo {
  marca: string;
  modelos: string[];
}

interface Milestone {
  km: number;
  nombre: string;
  diasIntervalo?: number;
}

interface TareaItem {
  itemServiceId?: string;
  categoria: string;
  descripcion: string;
  accion: string;
  tiempoEstimado?: number;
}

interface RepuestoItem {
  repuestoId?: string;
  nombre: string;
  codigoOEM?: string;
  unidad?: string;
  precioUnitario?: number;
  cantidadDefault: number;
}

interface BuilderState {
  marca: string;
  modelo: string;
  milestones: Milestone[];
  tareaItems: TareaItem[];
  repuestoItems: RepuestoItem[];
  assignments: Record<string, boolean>;
  repuestoCantidades: Record<string, number>;
}

interface ItemServiceResult {
  id: string;
  nombre: string;
  categoria: string;
  accion: string;
  tiempoEstimado: number | null;
}

interface RepuestoSearchResult {
  id: string;
  nombre: string;
  codigo: string | null;
  precioCompra: number | null;
  unidad: string | null;
  stock: number | null;
}

interface ExistingPlan {
  id: string;
  nombre: string;
  kmIntervalo: number | null;
  diasIntervalo: number | null;
  marcaMoto: string | null;
  modeloMoto: string | null;
  estado: string;
  tareas: {
    categoria: string;
    descripcion: string;
    accion: string;
    tiempoEstimado: number | null;
    itemServiceId: string | null;
  }[];
  repuestos: {
    nombre: string;
    codigoOEM: string | null;
    cantidad: number;
    unidad: string | null;
    precioUnitario: number | null;
    repuestoId: string | null;
  }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function assignmentKey(
  type: "tarea" | "repuesto",
  itemIndex: number,
  milestoneIndex: number
): string {
  return `${type}-${itemIndex}-${milestoneIndex}`;
}

function cantidadKey(itemIndex: number, milestoneIndex: number): string {
  return `repuesto-${itemIndex}-${milestoneIndex}`;
}

function deriveNameFromKm(km: number): string {
  if (km <= 1000) return "Rodaje";
  if (km <= 3000) return "Inicial";
  if (km <= 5000) return "Menor";
  if (km <= 10000) return "Estandar";
  if (km <= 15000) return "Intermedio";
  if (km <= 20000) return "Mayor";
  return `Service ${km.toLocaleString("es-AR")} km`;
}

// ── Inline Autocomplete Component ──────────────────────────────────────────────

function InlineAutocomplete<T extends { id: string }>({
  placeholder,
  onSearch,
  onSelect,
  renderItem,
  isAdded,
  icon: Icon,
}: {
  placeholder: string;
  onSearch: (query: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  renderItem: (item: T, added: boolean) => React.ReactNode;
  isAdded: (item: T) => boolean;
  icon: React.ElementType;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await onSearch(query);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/10">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            placeholder={placeholder}
            className="h-8 pl-8 text-xs"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-4 right-4 z-20 mt-0.5 rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((item) => {
            const added = isAdded(item);
            return (
              <button
                key={item.id}
                type="button"
                disabled={added}
                onClick={() => {
                  onSelect(item);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 text-xs",
                  added && "opacity-50 cursor-not-allowed"
                )}
              >
                {renderItem(item, added)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PlanBuilderPage() {
  const router = useRouter();

  // ── Core state ──
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tareaItems, setTareaItems] = useState<TareaItem[]>([]);
  const [repuestoItems, setRepuestoItems] = useState<RepuestoItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, boolean>>({});
  const [repuestoCantidades, setRepuestoCantidades] = useState<
    Record<string, number>
  >({});

  // ── Data fetching state ──
  const [marcasModelos, setMarcasModelos] = useState<MarcaModelo[]>([]);
  const [existingPlans, setExistingPlans] = useState<ExistingPlan[]>([]);
  const [existingAlert, setExistingAlert] = useState(false);
  const [tarifaHora, setTarifaHora] = useState<number | null>(null);

  // ── Search dialogs ──
  const [tareaSearchOpen, setTareaSearchOpen] = useState(false);
  const [repuestoSearchOpen, setRepuestoSearchOpen] = useState(false);

  // ── Milestone dialog ──
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<number | null>(
    null
  );
  const [milestoneForm, setMilestoneForm] = useState<Milestone>({
    km: 0,
    nombre: "",
  });
  const [copyFromPrevious, setCopyFromPrevious] = useState(false);

  // ── Confirmation dialog ──
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishEstado, setPublishEstado] = useState<
    "BORRADOR" | "PUBLICADO"
  >("BORRADOR");
  const [generating, setGenerating] = useState(false);

  // ── Search state ──
  const [tareaQuery, setTareaQuery] = useState("");
  const [tareaResults, setTareaResults] = useState<ItemServiceResult[]>([]);
  const [tareaSearching, setTareaSearching] = useState(false);
  const [repuestoQuery, setRepuestoQuery] = useState("");
  const [repuestoResults, setRepuestoResults] = useState<
    RepuestoSearchResult[]
  >([]);
  const [repuestoSearching, setRepuestoSearching] = useState(false);

  // ── Catalog sidebar state (Task 1) ──
  const [catalogItems, setCatalogItems] = useState<ItemServiceResult[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogCollapsed, setCatalogCollapsed] = useState<
    Record<string, boolean>
  >({});

  // ── Category grouping collapsed state (Task 4) ──
  const [categoryCollapsed, setCategoryCollapsed] = useState<
    Record<string, boolean>
  >({});

  // ── Fetch marcas/modelos ──
  useEffect(() => {
    fetch("/api/motos/marcas-modelos")
      .then((r) => r.json())
      .then((d) => setMarcasModelos(d.data ?? []))
      .catch(() => {});
  }, []);

  // ── Fetch tarifa ──
  useEffect(() => {
    fetch("/api/configuracion/tarifa-mano-obra")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.tarifaHora != null) {
          setTarifaHora(d.data.tarifaHora);
        }
      })
      .catch(() => {});
  }, []);

  // ── Pre-load catalog items when marca/modelo selected (Task 1) ──
  useEffect(() => {
    if (!marca || !modelo) {
      setCatalogItems([]);
      return;
    }
    setCatalogLoading(true);
    fetch("/api/items-service")
      .then((r) => r.json())
      .then((d) => {
        const items: ItemServiceResult[] = (d.data ?? []).map(
          (item: {
            id: string;
            nombre: string;
            categoria: string;
            accion: string;
            tiempoEstimado: number | null;
          }) => ({
            id: item.id,
            nombre: item.nombre,
            categoria: item.categoria,
            accion: item.accion,
            tiempoEstimado: item.tiempoEstimado,
          })
        );
        setCatalogItems(items);
        setCatalogOpen(true);
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  }, [marca, modelo]);

  // ── Check existing plans when modelo changes ──
  useEffect(() => {
    if (!marca || !modelo) {
      setExistingPlans([]);
      setExistingAlert(false);
      return;
    }
    fetch("/api/mantenimientos/planes")
      .then((r) => r.json())
      .then((d) => {
        const plans: ExistingPlan[] = (d.data ?? []).filter(
          (p: ExistingPlan) =>
            p.marcaMoto === marca && p.modeloMoto === modelo
        );
        if (plans.length > 0) {
          setExistingPlans(plans);
          setExistingAlert(true);
        } else {
          setExistingPlans([]);
          setExistingAlert(false);
        }
      })
      .catch(() => {});
  }, [marca, modelo]);

  // ── Load draft from localStorage ──
  useEffect(() => {
    if (!marca || !modelo) return;
    const key = `builder-${marca}-${modelo}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const saved: BuilderState = JSON.parse(raw);
      if (
        saved.milestones?.length > 0 ||
        saved.tareaItems?.length > 0 ||
        saved.repuestoItems?.length > 0
      ) {
        setMilestones(saved.milestones);
        setTareaItems(saved.tareaItems);
        setRepuestoItems(saved.repuestoItems);
        setAssignments(saved.assignments);
        setRepuestoCantidades(saved.repuestoCantidades);
      }
    } catch {
      // ignore
    }
  }, [marca, modelo]);

  // ── Debounced tarea search ──
  useEffect(() => {
    if (tareaQuery.length < 2) {
      setTareaResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setTareaSearching(true);
      try {
        const res = await fetch(
          `/api/items-service/search?q=${encodeURIComponent(tareaQuery)}`
        );
        const json = await res.json();
        setTareaResults(json.data ?? []);
      } catch {
        setTareaResults([]);
      }
      setTareaSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [tareaQuery]);

  // ── Debounced repuesto search ──
  useEffect(() => {
    if (repuestoQuery.length < 2) {
      setRepuestoResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setRepuestoSearching(true);
      try {
        const res = await fetch(
          `/api/repuestos/search?q=${encodeURIComponent(repuestoQuery)}`
        );
        const json = await res.json();
        setRepuestoResults(json.data ?? []);
      } catch {
        setRepuestoResults([]);
      }
      setRepuestoSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [repuestoQuery]);

  // ── Derived values ──
  const modelosDisponibles =
    marca
      ? marcasModelos.find((m) => m.marca === marca)?.modelos ?? []
      : [];

  const sortedMilestones = [...milestones].sort((a, b) => a.km - b.km);

  // ── Group catalog items by category (Task 1) ──
  const catalogByCategory = useMemo(() => {
    const grouped: Record<string, ItemServiceResult[]> = {};
    for (const item of catalogItems) {
      if (!grouped[item.categoria]) grouped[item.categoria] = [];
      grouped[item.categoria]!.push(item);
    }
    return grouped;
  }, [catalogItems]);

  // ── Group tarea items by category (Task 4) ──
  const tareasByCategory = useMemo(() => {
    const grouped: { category: string; items: { item: TareaItem; originalIndex: number }[] }[] = [];
    const categoryMap = new Map<string, { item: TareaItem; originalIndex: number }[]>();

    tareaItems.forEach((item, idx) => {
      const cat = item.categoria;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push({ item, originalIndex: idx });
    });

    // Order by CATEGORIAS constant order
    for (const cat of CATEGORIAS) {
      const items = categoryMap.get(cat);
      if (items && items.length > 0) {
        grouped.push({ category: cat, items });
      }
    }
    // Also catch any unknown categories
    for (const [cat, items] of categoryMap) {
      if (!CATEGORIAS.includes(cat as (typeof CATEGORIAS)[number]) && items.length > 0) {
        grouped.push({ category: cat, items });
      }
    }

    return grouped;
  }, [tareaItems]);

  // ── Computed stats per milestone ──
  const milestoneStats = useCallback(
    (mIdx: number) => {
      let tareasCount = 0;
      let tiempoTotal = 0;
      let costoRepuestos = 0;
      let repuestosCount = 0;

      tareaItems.forEach((t, tIdx) => {
        const key = assignmentKey("tarea", tIdx, mIdx);
        if (assignments[key]) {
          tareasCount++;
          tiempoTotal += t.tiempoEstimado ?? 0;
        }
      });

      repuestoItems.forEach((r, rIdx) => {
        const key = assignmentKey("repuesto", rIdx, mIdx);
        if (assignments[key]) {
          repuestosCount++;
          const qty =
            repuestoCantidades[cantidadKey(rIdx, mIdx)] ?? r.cantidadDefault;
          costoRepuestos += (r.precioUnitario ?? 0) * qty;
        }
      });

      const tarifaMinuto = tarifaHora != null ? tarifaHora / 60 : 0;
      const costoManoObra = tiempoTotal * tarifaMinuto;

      return {
        tareasCount,
        repuestosCount,
        tiempoTotal,
        costoRepuestos,
        costoManoObra,
        costoTotal: costoManoObra + costoRepuestos,
      };
    },
    [tareaItems, repuestoItems, assignments, repuestoCantidades, tarifaHora]
  );

  // ── Assignment toggles ──
  function toggleAssignment(key: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }

  function toggleColumnAll(mIdx: number) {
    const totalItems = tareaItems.length + repuestoItems.length;
    let checkedCount = 0;
    tareaItems.forEach((_, tIdx) => {
      if (assignments[assignmentKey("tarea", tIdx, mIdx)]) checkedCount++;
    });
    repuestoItems.forEach((_, rIdx) => {
      if (assignments[assignmentKey("repuesto", rIdx, mIdx)]) checkedCount++;
    });

    const shouldCheck = checkedCount < totalItems;
    setAssignments((prev) => {
      const next = { ...prev };
      tareaItems.forEach((_, tIdx) => {
        const key = assignmentKey("tarea", tIdx, mIdx);
        if (shouldCheck) next[key] = true;
        else delete next[key];
      });
      repuestoItems.forEach((_, rIdx) => {
        const key = assignmentKey("repuesto", rIdx, mIdx);
        if (shouldCheck) next[key] = true;
        else delete next[key];
      });
      return next;
    });
  }

  function toggleRowAll(type: "tarea" | "repuesto", itemIdx: number) {
    let checkedCount = 0;
    milestones.forEach((_, mIdx) => {
      if (assignments[assignmentKey(type, itemIdx, mIdx)]) checkedCount++;
    });

    const shouldCheck = checkedCount < milestones.length;
    setAssignments((prev) => {
      const next = { ...prev };
      milestones.forEach((_, mIdx) => {
        const key = assignmentKey(type, itemIdx, mIdx);
        if (shouldCheck) next[key] = true;
        else delete next[key];
      });
      return next;
    });
  }

  function isColumnAllChecked(mIdx: number): boolean {
    const total = tareaItems.length + repuestoItems.length;
    if (total === 0) return false;
    let checked = 0;
    tareaItems.forEach((_, tIdx) => {
      if (assignments[assignmentKey("tarea", tIdx, mIdx)]) checked++;
    });
    repuestoItems.forEach((_, rIdx) => {
      if (assignments[assignmentKey("repuesto", rIdx, mIdx)]) checked++;
    });
    return checked === total;
  }

  function isRowAllChecked(type: "tarea" | "repuesto", itemIdx: number): boolean {
    if (milestones.length === 0) return false;
    return milestones.every((_, mIdx) =>
      assignments[assignmentKey(type, itemIdx, mIdx)]
    );
  }

  // ── Milestone CRUD ──
  function openNewMilestone() {
    setEditingMilestoneIdx(null);
    setMilestoneForm({ km: 0, nombre: "" });
    setCopyFromPrevious(false);
    setMilestoneDialogOpen(true);
  }

  function openEditMilestone(idx: number) {
    const m = milestones[idx];
    if (!m) return;
    setEditingMilestoneIdx(idx);
    setMilestoneForm({ km: m.km, nombre: m.nombre, diasIntervalo: m.diasIntervalo });
    setCopyFromPrevious(false);
    setMilestoneDialogOpen(true);
  }

  function saveMilestone() {
    const form = {
      ...milestoneForm,
      nombre:
        milestoneForm.nombre.trim() || deriveNameFromKm(milestoneForm.km),
    };

    if (editingMilestoneIdx !== null) {
      setMilestones((prev) =>
        prev.map((m, i) => (i === editingMilestoneIdx ? form : m))
      );
    } else {
      setMilestones((prev) => [...prev, form]);

      if (copyFromPrevious && milestones.length > 0) {
        const prevMIdx = milestones.length - 1;
        const newMIdx = milestones.length;
        setAssignments((prev) => {
          const next = { ...prev };
          tareaItems.forEach((_, tIdx) => {
            const prevKey = assignmentKey("tarea", tIdx, prevMIdx);
            if (prev[prevKey]) {
              next[assignmentKey("tarea", tIdx, newMIdx)] = true;
            }
          });
          repuestoItems.forEach((_, rIdx) => {
            const prevKey = assignmentKey("repuesto", rIdx, prevMIdx);
            if (prev[prevKey]) {
              next[assignmentKey("repuesto", rIdx, newMIdx)] = true;
            }
          });
          return next;
        });
        setRepuestoCantidades((prev) => {
          const next = { ...prev };
          repuestoItems.forEach((_, rIdx) => {
            const prevKey = cantidadKey(rIdx, prevMIdx);
            if (prev[prevKey] != null) {
              next[cantidadKey(rIdx, newMIdx)] = prev[prevKey];
            }
          });
          return next;
        });
      }
    }
    setMilestoneDialogOpen(false);
  }

  function removeMilestone(idx: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
    // Clean up assignments for this milestone and reindex higher ones
    setAssignments((prev) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split("-");
        const type = parts[0] as "tarea" | "repuesto";
        const itemIdx = parseInt(parts[1] ?? "0");
        const mIdx = parseInt(parts[2] ?? "0");
        if (mIdx === idx) return;
        const newMIdx = mIdx > idx ? mIdx - 1 : mIdx;
        next[assignmentKey(type, itemIdx, newMIdx)] = val;
      });
      return next;
    });
    setRepuestoCantidades((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split("-");
        const itemIdx = parseInt(parts[1] ?? "0");
        const mIdx = parseInt(parts[2] ?? "0");
        if (mIdx === idx) return;
        const newMIdx = mIdx > idx ? mIdx - 1 : mIdx;
        next[cantidadKey(itemIdx, newMIdx)] = val;
      });
      return next;
    });
  }

  // ── Item add from search ──
  function addTareaFromCatalog(item: ItemServiceResult) {
    const exists = tareaItems.some(
      (t) => t.descripcion === item.nombre && t.categoria === item.categoria
    );
    if (exists) return;
    setTareaItems((prev) => [
      ...prev,
      {
        itemServiceId: item.id,
        categoria: item.categoria,
        descripcion: item.nombre,
        accion: item.accion,
        tiempoEstimado: item.tiempoEstimado ?? undefined,
      },
    ]);
    setTareaQuery("");
    setTareaResults([]);
  }

  function addTareaManual() {
    setTareaItems((prev) => [
      ...prev,
      {
        categoria: "MOTOR",
        descripcion: tareaQuery.trim() || "Nueva tarea",
        accion: "CHECK",
      },
    ]);
    setTareaQuery("");
    setTareaResults([]);
    setTareaSearchOpen(false);
  }

  function addRepuestoFromInventory(item: RepuestoSearchResult) {
    const exists = repuestoItems.some((r) => r.nombre === item.nombre);
    if (exists) return;
    setRepuestoItems((prev) => [
      ...prev,
      {
        repuestoId: item.id,
        nombre: item.nombre,
        codigoOEM: item.codigo ?? undefined,
        unidad: item.unidad ?? undefined,
        precioUnitario:
          item.precioCompra != null ? Number(item.precioCompra) : undefined,
        cantidadDefault: 1,
      },
    ]);
    setRepuestoQuery("");
    setRepuestoResults([]);
  }

  function addRepuestoManual() {
    setRepuestoItems((prev) => [
      ...prev,
      {
        nombre: repuestoQuery.trim() || "Nuevo repuesto",
        cantidadDefault: 1,
      },
    ]);
    setRepuestoQuery("");
    setRepuestoResults([]);
    setRepuestoSearchOpen(false);
  }

  function removeTarea(idx: number) {
    setTareaItems((prev) => prev.filter((_, i) => i !== idx));
    setAssignments((prev) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split("-");
        const type = parts[0] ?? "";
        const itemIdx = parseInt(parts[1] ?? "0");
        const mIdx = parseInt(parts[2] ?? "0");
        if (type === "tarea") {
          if (itemIdx === idx) return;
          const newIdx = itemIdx > idx ? itemIdx - 1 : itemIdx;
          next[assignmentKey("tarea", newIdx, mIdx)] = val;
        } else {
          next[key] = val;
        }
      });
      return next;
    });
  }

  function removeRepuesto(idx: number) {
    setRepuestoItems((prev) => prev.filter((_, i) => i !== idx));
    setAssignments((prev) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split("-");
        const type = parts[0] ?? "";
        const itemIdx = parseInt(parts[1] ?? "0");
        const mIdx = parseInt(parts[2] ?? "0");
        if (type === "repuesto") {
          if (itemIdx === idx) return;
          const newIdx = itemIdx > idx ? itemIdx - 1 : itemIdx;
          next[assignmentKey("repuesto", newIdx, mIdx)] = val;
        } else {
          next[key] = val;
        }
      });
      return next;
    });
    setRepuestoCantidades((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split("-");
        const itemIdx = parseInt(parts[1] ?? "0");
        const mIdx = parseInt(parts[2] ?? "0");
        if (itemIdx === idx) return;
        const newIdx = itemIdx > idx ? itemIdx - 1 : itemIdx;
        next[cantidadKey(newIdx, mIdx)] = val;
      });
      return next;
    });
  }

  // ── Inline search callbacks (Task 2) ──
  const searchTareasInline = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/items-service/search?q=${encodeURIComponent(query)}`
    );
    const json = await res.json();
    return (json.data ?? []) as ItemServiceResult[];
  }, []);

  const searchRepuestosInline = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/repuestos/search?q=${encodeURIComponent(query)}`
    );
    const json = await res.json();
    return (json.data ?? []) as RepuestoSearchResult[];
  }, []);

  const isTareaAdded = useCallback(
    (item: ItemServiceResult) =>
      tareaItems.some(
        (t) => t.descripcion === item.nombre && t.categoria === item.categoria
      ),
    [tareaItems]
  );

  const isRepuestoAdded = useCallback(
    (item: RepuestoSearchResult) =>
      repuestoItems.some((r) => r.nombre === item.nombre),
    [repuestoItems]
  );

  // ── Load existing plans into matrix ──
  function loadExistingPlans() {
    const allTareas: TareaItem[] = [];
    const allRepuestos: RepuestoItem[] = [];
    const newMilestones: Milestone[] = [];
    const newAssignments: Record<string, boolean> = {};
    const newCantidades: Record<string, number> = {};

    // Build milestones from existing plans
    existingPlans.forEach((plan) => {
      newMilestones.push({
        km: plan.kmIntervalo ?? 0,
        nombre:
          plan.nombre ||
          deriveNameFromKm(plan.kmIntervalo ?? 0),
        diasIntervalo: plan.diasIntervalo ?? undefined,
      });
    });

    // Deduplicate tareas across all plans by descripcion
    existingPlans.forEach((plan) => {
      (plan.tareas ?? []).forEach((t) => {
        const existingIdx = allTareas.findIndex(
          (at) => at.descripcion === t.descripcion
        );
        if (existingIdx === -1) {
          allTareas.push({
            itemServiceId: t.itemServiceId ?? undefined,
            categoria: t.categoria,
            descripcion: t.descripcion,
            accion: t.accion ?? "CHECK",
            tiempoEstimado: t.tiempoEstimado ?? undefined,
          });
        }
      });
    });

    // Deduplicate repuestos across all plans by nombre
    existingPlans.forEach((plan) => {
      (plan.repuestos ?? []).forEach((r) => {
        const existingIdx = allRepuestos.findIndex(
          (ar) => ar.nombre === r.nombre
        );
        if (existingIdx === -1) {
          allRepuestos.push({
            repuestoId: r.repuestoId ?? undefined,
            nombre: r.nombre,
            codigoOEM: r.codigoOEM ?? undefined,
            unidad: r.unidad ?? undefined,
            precioUnitario:
              r.precioUnitario != null
                ? Number(r.precioUnitario)
                : undefined,
            cantidadDefault: r.cantidad,
          });
        }
      });
    });

    // Build assignments
    existingPlans.forEach((plan, mIdx) => {
      (plan.tareas ?? []).forEach((t) => {
        const tIdx = allTareas.findIndex(
          (at) => at.descripcion === t.descripcion
        );
        if (tIdx !== -1) {
          newAssignments[assignmentKey("tarea", tIdx, mIdx)] = true;
        }
      });
      (plan.repuestos ?? []).forEach((r) => {
        const rIdx = allRepuestos.findIndex((ar) => ar.nombre === r.nombre);
        if (rIdx !== -1) {
          newAssignments[assignmentKey("repuesto", rIdx, mIdx)] = true;
          if (r.cantidad !== 1) {
            newCantidades[cantidadKey(rIdx, mIdx)] = r.cantidad;
          }
        }
      });
    });

    setMilestones(newMilestones);
    setTareaItems(allTareas);
    setRepuestoItems(allRepuestos);
    setAssignments(newAssignments);
    setRepuestoCantidades(newCantidades);
    setExistingAlert(false);
  }

  function startEmpty() {
    setMilestones([]);
    setTareaItems([]);
    setRepuestoItems([]);
    setAssignments({});
    setRepuestoCantidades({});
    setExistingAlert(false);
  }

  // ── Save draft to localStorage ──
  function saveDraft() {
    if (!marca || !modelo) return;
    const key = `builder-${marca}-${modelo}`;
    const state: BuilderState = {
      marca,
      modelo,
      milestones,
      tareaItems,
      repuestoItems,
      assignments,
      repuestoCantidades,
    };
    localStorage.setItem(key, JSON.stringify(state));
  }

  // ── Generate plans ──
  async function generatePlans() {
    setGenerating(true);
    try {
      const body = {
        marca,
        modelo,
        estado: publishEstado,
        milestones: milestones
          .sort((a, b) => a.km - b.km)
          .map((m, mIdx) => {
            const tareas: {
              itemServiceId?: string;
              categoria: string;
              descripcion: string;
              accion: string;
              tiempoEstimado?: number;
              orden: number;
            }[] = [];
            const repuestos: {
              repuestoId?: string;
              nombre: string;
              codigoOEM?: string;
              cantidad: number;
              unidad?: string;
              precioUnitario?: number;
            }[] = [];

            tareaItems.forEach((t, tIdx) => {
              const key = assignmentKey("tarea", tIdx, mIdx);
              if (assignments[key]) {
                tareas.push({
                  itemServiceId: t.itemServiceId,
                  categoria: t.categoria,
                  descripcion: t.descripcion,
                  accion: t.accion,
                  tiempoEstimado: t.tiempoEstimado,
                  orden: tareas.length + 1,
                });
              }
            });

            repuestoItems.forEach((r, rIdx) => {
              const key = assignmentKey("repuesto", rIdx, mIdx);
              if (assignments[key]) {
                repuestos.push({
                  repuestoId: r.repuestoId,
                  nombre: r.nombre,
                  codigoOEM: r.codigoOEM,
                  cantidad:
                    repuestoCantidades[cantidadKey(rIdx, mIdx)] ??
                    r.cantidadDefault,
                  unidad: r.unidad,
                  precioUnitario: r.precioUnitario,
                });
              }
            });

            return {
              km: m.km,
              nombre: m.nombre,
              diasIntervalo: m.diasIntervalo,
              tareas,
              repuestos,
            };
          }),
      };

      const res = await fetch("/api/mantenimientos/planes/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Clear draft
        if (marca && modelo) {
          localStorage.removeItem(`builder-${marca}-${modelo}`);
        }
        router.push("/admin/mantenimientos/planes");
        router.refresh();
      }
    } finally {
      setGenerating(false);
      setConfirmOpen(false);
    }
  }

  // ── Derived: count active milestones with at least one assignment ──
  const activeMilestoneCount = milestones.filter((_, mIdx) => {
    return (
      tareaItems.some(
        (_, tIdx) => assignments[assignmentKey("tarea", tIdx, mIdx)]
      ) ||
      repuestoItems.some(
        (_, rIdx) => assignments[assignmentKey("repuesto", rIdx, mIdx)]
      )
    );
  }).length;

  const hasContent =
    milestones.length > 0 &&
    (tareaItems.length > 0 || repuestoItems.length > 0);

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Plan Builder"
        description="Define todos los planes de servicio para un modelo en una sola matriz"
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/mantenimientos/planes">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </Link>
          </Button>
        }
      />

      {/* ── Marca/Modelo Selection ── */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Vehiculo</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Marca *</Label>
            <Select
              value={marca || "__PLACEHOLDER__"}
              onValueChange={(v) => {
                if (v === "__PLACEHOLDER__") return;
                setMarca(v);
                setModelo("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__PLACEHOLDER__" disabled>
                  Seleccionar marca
                </SelectItem>
                {marcasModelos.map((m) => (
                  <SelectItem key={m.marca} value={m.marca}>
                    {m.marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo *</Label>
            <Select
              value={modelo || "__PLACEHOLDER__"}
              onValueChange={(v) => {
                if (v === "__PLACEHOLDER__") return;
                setModelo(v);
              }}
              disabled={!marca}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__PLACEHOLDER__" disabled>
                  Seleccionar modelo
                </SelectItem>
                {modelosDisponibles.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Existing plans alert ── */}
        {existingAlert && existingPlans.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Ya existen {existingPlans.length} plan(es) para {marca}{" "}
                {modelo}
              </p>
              <p className="text-xs text-muted-foreground">
                Podes cargarlos en la matriz para editarlos o empezar desde
                cero.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={loadExistingPlans}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Cargar en matriz
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startEmpty}
                >
                  Empezar vacio
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Builder Content ── */}
      {marca && modelo && (
        <>
          {/* ── Milestones Header ── */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Hitos de Kilometraje
                </h2>
                <Badge variant="outline" className="font-mono">
                  {milestones.length}
                </Badge>
              </div>
              <Button size="sm" onClick={openNewMilestone}>
                <Plus className="h-4 w-4 mr-1.5" />
                Agregar Hito
              </Button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Agrega hitos de kilometraje para las columnas de la matriz
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedMilestones.map((m, i) => {
                  const origIdx = milestones.indexOf(m);
                  return (
                    <button
                      key={origIdx}
                      onClick={() => openEditMilestone(origIdx)}
                      className="group flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:border-primary/50 transition-colors"
                    >
                      <span className="font-mono tabular-nums font-semibold">
                        {m.km.toLocaleString("es-AR")} km
                      </span>
                      <span className="text-muted-foreground">
                        {m.nombre}
                      </span>
                      {m.diasIntervalo && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-mono"
                        >
                          {m.diasIntervalo}d
                        </Badge>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMilestone(origIdx);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Main Layout: Catalog Sidebar + Matrix ── */}
          <div className="flex gap-4">
            {/* ── Catalog Sidebar (Task 1) ── */}
            {catalogOpen && catalogItems.length > 0 && (
              <div className="w-72 shrink-0 rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Catalogo</h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {catalogItems.length}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setCatalogOpen(false)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <ScrollArea className="h-[calc(100vh-420px)] max-h-[600px]">
                  <div className="p-1">
                    {Object.entries(catalogByCategory).map(
                      ([category, items]) => {
                        const isCollapsed = catalogCollapsed[category];
                        const addedCount = items.filter((item) =>
                          tareaItems.some(
                            (t) =>
                              t.descripcion === item.nombre &&
                              t.categoria === item.categoria
                          )
                        ).length;
                        return (
                          <div key={category} className="mb-0.5">
                            <button
                              onClick={() =>
                                setCatalogCollapsed((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }))
                              }
                              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                {isCollapsed ? (
                                  <ChevronRight className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                                <span>{category}</span>
                                <span className="font-mono text-[10px]">
                                  ({items.length})
                                </span>
                              </div>
                              {addedCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20"
                                >
                                  {addedCount} agregado{addedCount !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </button>
                            {!isCollapsed && (
                              <div className="space-y-0.5 pb-1">
                                {items.map((item) => {
                                  const alreadyAdded = tareaItems.some(
                                    (t) =>
                                      t.descripcion === item.nombre &&
                                      t.categoria === item.categoria
                                  );
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        if (!alreadyAdded)
                                          addTareaFromCatalog(item);
                                      }}
                                      disabled={alreadyAdded}
                                      className={cn(
                                        "w-full text-left px-3 py-1.5 rounded text-xs transition-colors",
                                        alreadyAdded
                                          ? "opacity-50 cursor-not-allowed bg-muted/30"
                                          : "hover:bg-accent cursor-pointer"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="truncate">
                                          {item.nombre}
                                        </span>
                                        {alreadyAdded ? (
                                          <Check className="h-3 w-3 text-primary shrink-0" />
                                        ) : (
                                          <Plus className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                        <span>
                                          {ACCIONES.find(
                                            (a) => a.value === item.accion
                                          )?.label ?? item.accion}
                                        </span>
                                        {item.tiempoEstimado != null && (
                                          <span className="font-mono tabular-nums">
                                            {item.tiempoEstimado} min
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ── Items & Matrix ── */}
            <div className="flex-1 min-w-0 rounded-lg border bg-card">
              {/* ── Add Items Toolbar ── */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  Matriz de Asignacion
                </h2>
                <div className="flex gap-2">
                  {!catalogOpen && catalogItems.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCatalogOpen(true)}
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                      Catalogo
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTareaQuery("");
                      setTareaResults([]);
                      setTareaSearchOpen(true);
                    }}
                  >
                    <Wrench className="h-3.5 w-3.5 mr-1.5" />
                    Agregar Tarea
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRepuestoQuery("");
                      setRepuestoResults([]);
                      setRepuestoSearchOpen(true);
                    }}
                  >
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                    Agregar Repuesto
                  </Button>
                </div>
              </div>

              {/* ── Matrix Grid ── */}
              {tareaItems.length === 0 && repuestoItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Grid3X3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Sin items
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Agrega tareas y repuestos para construir la matriz de
                    asignacion.
                    {catalogItems.length > 0 && (
                      <span>
                        {" "}Usa el catalogo a la izquierda para agregar
                        rapidamente.
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {/* Sticky item name column header */}
                        <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-medium text-muted-foreground min-w-[280px]">
                          Item
                        </th>
                        {/* Row-all toggle header */}
                        <th className="px-2 py-3 text-center font-medium text-muted-foreground text-xs w-10">
                          All
                        </th>
                        {/* Milestone columns */}
                        {sortedMilestones.map((m) => {
                          const origIdx = milestones.indexOf(m);
                          return (
                            <th
                              key={origIdx}
                              className="px-3 py-3 text-center font-medium min-w-[100px]"
                            >
                              <div className="space-y-1">
                                <div className="font-mono tabular-nums text-xs font-semibold">
                                  {m.km.toLocaleString("es-AR")} km
                                </div>
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  {m.nombre}
                                </div>
                                {/* Column toggle-all */}
                                <div className="pt-1">
                                  <Checkbox
                                    checked={isColumnAllChecked(origIdx)}
                                    onCheckedChange={() =>
                                      toggleColumnAll(origIdx)
                                    }
                                    className="mx-auto"
                                  />
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* ── TAREAS Section — Grouped by Category (Task 4) ── */}
                      {tareaItems.length > 0 && (
                        <tr className="bg-muted/10">
                          <td
                            colSpan={milestones.length + 2}
                            className="sticky left-0 z-10 bg-muted/10 px-4 py-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <Wrench className="h-3.5 w-3.5" />
                              Tareas ({tareaItems.length})
                            </div>
                          </td>
                        </tr>
                      )}

                      {tareasByCategory.map(({ category, items: catItems }) => (
                        <>
                          {/* Category header row (Task 4) */}
                          {tareasByCategory.length > 1 && (
                            <tr
                              key={`cat-header-${category}`}
                              className="bg-muted/5"
                            >
                              <td
                                colSpan={milestones.length + 2}
                                className="sticky left-0 z-10 bg-muted/5"
                              >
                                <button
                                  onClick={() =>
                                    setCategoryCollapsed((prev) => ({
                                      ...prev,
                                      [category]: !prev[category],
                                    }))
                                  }
                                  className="flex items-center gap-2 px-4 py-1.5 w-full text-left hover:bg-muted/20 transition-colors"
                                >
                                  {categoryCollapsed[category] ? (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                    {CATEGORY_ICONS[category] ?? "?"}
                                  </span>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {category}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 font-mono"
                                  >
                                    {catItems.length}
                                  </Badge>
                                </button>
                              </td>
                            </tr>
                          )}

                          {/* Category items */}
                          {!categoryCollapsed[category] &&
                            catItems.map(({ item: tarea, originalIndex: tIdx }) => (
                              <tr
                                key={`tarea-${tIdx}`}
                                className="group border-b border-border/50 hover:bg-muted/20 transition-colors"
                              >
                                {/* Sticky item name */}
                                <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/20 px-4 py-2.5 transition-colors">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 shrink-0"
                                        >
                                          {tarea.categoria}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 shrink-0 bg-primary/5 text-primary border-primary/20"
                                        >
                                          {ACCIONES.find(
                                            (a) => a.value === tarea.accion
                                          )?.label ?? tarea.accion}
                                        </Badge>
                                      </div>
                                      <p className="text-sm mt-0.5 truncate">
                                        {tarea.descripcion}
                                      </p>
                                      {tarea.tiempoEstimado != null && (
                                        <p className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5">
                                          {tarea.tiempoEstimado} min
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => removeTarea(tIdx)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                                {/* Row toggle-all */}
                                <td className="px-2 py-2.5 text-center">
                                  <Checkbox
                                    checked={isRowAllChecked("tarea", tIdx)}
                                    onCheckedChange={() =>
                                      toggleRowAll("tarea", tIdx)
                                    }
                                  />
                                </td>
                                {/* Milestone checkboxes */}
                                {sortedMilestones.map((m) => {
                                  const origIdx = milestones.indexOf(m);
                                  const key = assignmentKey(
                                    "tarea",
                                    tIdx,
                                    origIdx
                                  );
                                  return (
                                    <td
                                      key={origIdx}
                                      className="px-3 py-2.5 text-center"
                                    >
                                      <Checkbox
                                        checked={!!assignments[key]}
                                        onCheckedChange={() =>
                                          toggleAssignment(key)
                                        }
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </>
                      ))}

                      {/* ── Inline quick-add for tareas (Task 2) ── */}
                      {tareaItems.length > 0 && (
                        <tr>
                          <td
                            colSpan={milestones.length + 2}
                            className="sticky left-0 z-10 bg-card p-0"
                          >
                            <InlineAutocomplete<ItemServiceResult>
                              placeholder="Buscar tarea para agregar..."
                              onSearch={searchTareasInline}
                              onSelect={addTareaFromCatalog}
                              isAdded={isTareaAdded}
                              icon={Plus}
                              renderItem={(item, added) => (
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      {item.nombre}
                                    </span>
                                    {added && (
                                      <Check className="h-3 w-3 text-primary shrink-0 ml-1" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                    <span className="px-1 py-0.5 rounded bg-muted uppercase tracking-wider font-medium">
                                      {item.categoria}
                                    </span>
                                    <span>
                                      {ACCIONES.find(
                                        (a) => a.value === item.accion
                                      )?.label ?? item.accion}
                                    </span>
                                    {item.tiempoEstimado != null && (
                                      <span className="font-mono tabular-nums">
                                        {item.tiempoEstimado} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            />
                          </td>
                        </tr>
                      )}

                      {/* ── Divider ── */}
                      {tareaItems.length > 0 &&
                        repuestoItems.length > 0 && (
                          <tr>
                            <td
                              colSpan={milestones.length + 2}
                              className="sticky left-0 z-10 bg-card"
                            >
                              <div className="border-t-2 border-dashed border-border/60" />
                            </td>
                          </tr>
                        )}

                      {/* ── REPUESTOS Section ── */}
                      {repuestoItems.length > 0 && (
                        <tr className="bg-muted/10">
                          <td
                            colSpan={milestones.length + 2}
                            className="sticky left-0 z-10 bg-muted/10 px-4 py-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <Package className="h-3.5 w-3.5" />
                              Repuestos ({repuestoItems.length})
                            </div>
                          </td>
                        </tr>
                      )}
                      {repuestoItems.map((repuesto, rIdx) => (
                        <tr
                          key={`repuesto-${rIdx}`}
                          className="group border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          {/* Sticky item name */}
                          <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/20 px-4 py-2.5 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {repuesto.nombre}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {repuesto.codigoOEM && (
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {repuesto.codigoOEM}
                                    </span>
                                  )}
                                  {repuesto.precioUnitario != null && (
                                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                                      {formatMoney(repuesto.precioUnitario)}
                                      /u
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => removeRepuesto(rIdx)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          {/* Row toggle-all */}
                          <td className="px-2 py-2.5 text-center">
                            <Checkbox
                              checked={isRowAllChecked("repuesto", rIdx)}
                              onCheckedChange={() =>
                                toggleRowAll("repuesto", rIdx)
                              }
                            />
                          </td>
                          {/* Milestone checkboxes + quantity */}
                          {sortedMilestones.map((m) => {
                            const origIdx = milestones.indexOf(m);
                            const aKey = assignmentKey(
                              "repuesto",
                              rIdx,
                              origIdx
                            );
                            const cKey = cantidadKey(rIdx, origIdx);
                            const isChecked = !!assignments[aKey];
                            const qty =
                              repuestoCantidades[cKey] ??
                              repuesto.cantidadDefault;
                            return (
                              <td
                                key={origIdx}
                                className="px-3 py-2.5 text-center"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() =>
                                      toggleAssignment(aKey)
                                    }
                                  />
                                  {isChecked && (
                                    <Input
                                      type="number"
                                      min={1}
                                      value={qty}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value) || 1;
                                        setRepuestoCantidades(
                                          (prev) => ({
                                            ...prev,
                                            [cKey]: val,
                                          })
                                        );
                                      }}
                                      className="h-6 w-14 text-center text-xs font-mono tabular-nums px-1"
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* ── Inline quick-add for repuestos (Task 2) ── */}
                      {repuestoItems.length > 0 && (
                        <tr>
                          <td
                            colSpan={milestones.length + 2}
                            className="sticky left-0 z-10 bg-card p-0"
                          >
                            <InlineAutocomplete<RepuestoSearchResult>
                              placeholder="Buscar repuesto para agregar..."
                              onSearch={searchRepuestosInline}
                              onSelect={addRepuestoFromInventory}
                              isAdded={isRepuestoAdded}
                              icon={Plus}
                              renderItem={(item, added) => (
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium truncate">
                                      {item.nombre}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                      {added && (
                                        <Check className="h-3 w-3 text-primary" />
                                      )}
                                      {!added &&
                                        item.precioCompra != null && (
                                          <span className="font-mono tabular-nums text-primary">
                                            {formatMoney(
                                              Number(item.precioCompra)
                                            )}
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                    {item.codigo && (
                                      <span className="font-mono">
                                        {item.codigo}
                                      </span>
                                    )}
                                    {item.stock != null && (
                                      <span
                                        className={cn(
                                          "font-mono tabular-nums",
                                          item.stock > 0
                                            ? "text-green-600"
                                            : "text-red-500"
                                        )}
                                      >
                                        Stock: {item.stock}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            />
                          </td>
                        </tr>
                      )}

                      {/* ── Inline quick-add when sections are empty (Task 2) ── */}
                      {tareaItems.length === 0 &&
                        repuestoItems.length > 0 && (
                          <tr>
                            <td
                              colSpan={milestones.length + 2}
                              className="sticky left-0 z-10 bg-card p-0"
                            >
                              <InlineAutocomplete<ItemServiceResult>
                                placeholder="Buscar tarea para agregar..."
                                onSearch={searchTareasInline}
                                onSelect={addTareaFromCatalog}
                                isAdded={isTareaAdded}
                                icon={Plus}
                                renderItem={(item, added) => (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {item.nombre}
                                      </span>
                                      {added && (
                                        <Check className="h-3 w-3 text-primary shrink-0 ml-1" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                      <span className="px-1 py-0.5 rounded bg-muted uppercase tracking-wider font-medium">
                                        {item.categoria}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              />
                            </td>
                          </tr>
                        )}
                    </tbody>

                    {/* ── Improved Summary Footer (Task 3) ── */}
                    {milestones.length > 0 &&
                      (tareaItems.length > 0 ||
                        repuestoItems.length > 0) && (
                        <tfoot>
                          {/* Repuestos cost row */}
                          <tr className="border-t-2 bg-muted/10">
                            <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2 text-[11px] font-medium text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3 w-3" />
                                Costo Repuestos
                              </div>
                            </td>
                            <td />
                            {sortedMilestones.map((m) => {
                              const origIdx = milestones.indexOf(m);
                              const stats = milestoneStats(origIdx);
                              return (
                                <td
                                  key={origIdx}
                                  className="px-3 py-2 text-center"
                                >
                                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                                    {stats.costoRepuestos > 0
                                      ? formatMoney(stats.costoRepuestos)
                                      : "—"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {/* Mano de obra cost row */}
                          <tr className="bg-muted/10">
                            <td className="sticky left-0 z-10 bg-muted/10 px-4 py-2 text-[11px] font-medium text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Wrench className="h-3 w-3" />
                                Mano de Obra
                                {tarifaHora != null && (
                                  <span className="font-mono tabular-nums text-[10px]">
                                    ({formatMoney(tarifaHora)}/h)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td />
                            {sortedMilestones.map((m) => {
                              const origIdx = milestones.indexOf(m);
                              const stats = milestoneStats(origIdx);
                              return (
                                <td
                                  key={origIdx}
                                  className="px-3 py-2 text-center"
                                >
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-mono tabular-nums text-muted-foreground">
                                      {stats.costoManoObra > 0
                                        ? formatMoney(stats.costoManoObra)
                                        : "—"}
                                    </div>
                                    {stats.tiempoTotal > 0 && (
                                      <div className="text-[10px] font-mono tabular-nums text-muted-foreground/70">
                                        {stats.tiempoTotal} min
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          {/* Total cost row */}
                          <tr className="bg-muted/20 border-t">
                            <td className="sticky left-0 z-10 bg-muted/20 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                Costo Total
                              </div>
                            </td>
                            <td />
                            {sortedMilestones.map((m) => {
                              const origIdx = milestones.indexOf(m);
                              const stats = milestoneStats(origIdx);
                              return (
                                <td
                                  key={origIdx}
                                  className="px-3 py-3 text-center"
                                >
                                  <div className="space-y-0.5">
                                    <div className="text-sm font-mono tabular-nums font-semibold text-foreground">
                                      {formatMoney(stats.costoTotal)}
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-0.5">
                                        <Wrench className="h-2.5 w-2.5" />
                                        <span className="font-mono tabular-nums">
                                          {stats.tareasCount}
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-0.5">
                                        <Package className="h-2.5 w-2.5" />
                                        <span className="font-mono tabular-nums">
                                          {stats.repuestosCount}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">
              {milestones.length > 0 && (
                <span className="font-mono tabular-nums">
                  {milestones.length} hito(s)
                </span>
              )}
              {tareaItems.length > 0 && (
                <span>
                  {" "}
                  &middot;{" "}
                  <span className="font-mono tabular-nums">
                    {tareaItems.length}
                  </span>{" "}
                  tarea(s)
                </span>
              )}
              {repuestoItems.length > 0 && (
                <span>
                  {" "}
                  &middot;{" "}
                  <span className="font-mono tabular-nums">
                    {repuestoItems.length}
                  </span>{" "}
                  repuesto(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={!marca || !modelo}
              >
                Guardar Borrador
              </Button>
              <Button
                onClick={() => {
                  setPublishEstado("BORRADOR");
                  setConfirmOpen(true);
                }}
                disabled={!hasContent || activeMilestoneCount === 0}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Generar {activeMilestoneCount} Plan(es)
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Milestone Dialog ── */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingMilestoneIdx !== null
                ? "Editar Hito"
                : "Nuevo Hito"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Kilometraje *</Label>
              <Input
                type="number"
                value={milestoneForm.km || ""}
                onChange={(e) => {
                  const km = parseInt(e.target.value) || 0;
                  setMilestoneForm((prev) => ({
                    ...prev,
                    km,
                    nombre: prev.nombre || deriveNameFromKm(km),
                  }));
                }}
                placeholder="5000"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={milestoneForm.nombre}
                onChange={(e) =>
                  setMilestoneForm((prev) => ({
                    ...prev,
                    nombre: e.target.value,
                  }))
                }
                placeholder="Ej: Menor, Estandar, Mayor..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias intervalo (opcional)</Label>
              <Input
                type="number"
                value={milestoneForm.diasIntervalo ?? ""}
                onChange={(e) =>
                  setMilestoneForm((prev) => ({
                    ...prev,
                    diasIntervalo: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="90"
                className="font-mono tabular-nums"
              />
            </div>

            {/* Copy from previous option */}
            {editingMilestoneIdx === null && milestones.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="copyPrevious"
                  checked={copyFromPrevious}
                  onCheckedChange={(checked) =>
                    setCopyFromPrevious(checked === true)
                  }
                />
                <label
                  htmlFor="copyPrevious"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  <Copy className="inline h-3.5 w-3.5 mr-1" />
                  Copiar asignaciones del hito anterior
                </label>
              </div>
            )}

            <Button
              onClick={saveMilestone}
              disabled={!milestoneForm.km}
              className="w-full"
            >
              {editingMilestoneIdx !== null ? "Guardar" : "Agregar Hito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tarea Search Dialog ── */}
      <Dialog open={tareaSearchOpen} onOpenChange={setTareaSearchOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={tareaQuery}
                onChange={(e) => setTareaQuery(e.target.value)}
                placeholder="Buscar tarea en catalogo..."
                className="pl-9"
                autoFocus
              />
              {tareaSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search results */}
            {tareaResults.length > 0 && (
              <div className="rounded-md border max-h-60 overflow-y-auto">
                {tareaResults.map((item) => {
                  const alreadyAdded = tareaItems.some(
                    (t) =>
                      t.descripcion === item.nombre &&
                      t.categoria === item.categoria
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addTareaFromCatalog(item)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0",
                        alreadyAdded && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {item.nombre}
                        </span>
                        {alreadyAdded && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 shrink-0 ml-2"
                          >
                            Ya agregada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wider font-medium">
                          {item.categoria}
                        </span>
                        <span>
                          {ACCIONES.find(
                            (a) => a.value === item.accion
                          )?.label ?? item.accion}
                        </span>
                        {item.tiempoEstimado != null && (
                          <span className="font-mono tabular-nums">
                            {item.tiempoEstimado} min
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {tareaQuery.length >= 2 &&
              !tareaSearching &&
              tareaResults.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No se encontraron resultados en el catalogo
                </p>
              )}

            {/* Separator */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  &mdash; o crear manualmente &mdash;
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={addTareaManual}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Crear tarea:{" "}
              {tareaQuery.trim() ? `"${tareaQuery.trim()}"` : "Nueva tarea"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Repuesto Search Dialog ── */}
      <Dialog
        open={repuestoSearchOpen}
        onOpenChange={setRepuestoSearchOpen}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Repuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={repuestoQuery}
                onChange={(e) => setRepuestoQuery(e.target.value)}
                placeholder="Buscar repuesto en inventario..."
                className="pl-9"
                autoFocus
              />
              {repuestoSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search results */}
            {repuestoResults.length > 0 && (
              <div className="rounded-md border max-h-60 overflow-y-auto">
                {repuestoResults.map((item) => {
                  const alreadyAdded = repuestoItems.some(
                    (r) => r.nombre === item.nombre
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addRepuestoFromInventory(item)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0",
                        alreadyAdded && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {item.nombre}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {alreadyAdded && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Ya agregado
                            </Badge>
                          )}
                          {!alreadyAdded &&
                            item.precioCompra != null && (
                              <span className="text-sm font-mono tabular-nums text-primary">
                                {formatMoney(
                                  Number(item.precioCompra)
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {item.codigo && (
                          <span className="font-mono">
                            {item.codigo}
                          </span>
                        )}
                        {item.stock != null && (
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              item.stock > 0
                                ? "text-green-600"
                                : "text-red-500"
                            )}
                          >
                            Stock: {item.stock}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {repuestoQuery.length >= 2 &&
              !repuestoSearching &&
              repuestoResults.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No se encontraron resultados en inventario
                </p>
              )}

            {/* Separator */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  &mdash; o crear manualmente &mdash;
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={addRepuestoManual}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Crear repuesto:{" "}
              {repuestoQuery.trim()
                ? `"${repuestoQuery.trim()}"`
                : "Nuevo repuesto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Generar {activeMilestoneCount} Plan(es) de Mantenimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Se crearan los siguientes planes para{" "}
              <span className="font-semibold text-foreground">
                {marca} {modelo}
              </span>
              :
            </p>

            {/* Plans summary table */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Plan
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      Km
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      Tareas
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Costo Est.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMilestones.map((m) => {
                    const origIdx = milestones.indexOf(m);
                    const stats = milestoneStats(origIdx);
                    if (
                      stats.tareasCount === 0 &&
                      !repuestoItems.some(
                        (_, rIdx) =>
                          assignments[
                            assignmentKey("repuesto", rIdx, origIdx)
                          ]
                      )
                    )
                      return null;
                    return (
                      <tr key={origIdx} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">
                          {m.nombre}
                        </td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums">
                          {m.km.toLocaleString("es-AR")}
                        </td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums">
                          {stats.tareasCount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {formatMoney(stats.costoTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Estado selector */}
            <div className="space-y-2">
              <Label>Estado de publicacion</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPublishEstado("BORRADOR")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-center",
                    publishEstado === "BORRADOR"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                  )}
                >
                  Borrador
                </button>
                <button
                  onClick={() => setPublishEstado("PUBLICADO")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-center",
                    publishEstado === "PUBLICADO"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                  )}
                >
                  Publicado
                </button>
              </div>
            </div>

            {/* Overwrite warning */}
            {existingPlans.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Atencion: ya existen planes para este modelo
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Los planes generados se crearan de forma adicional. Si
                    queres reemplazar los existentes, eliminalos primero.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={generating}
            >
              Cancelar
            </Button>
            <Button onClick={generatePlans} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Generar {activeMilestoneCount} Plan(es)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
