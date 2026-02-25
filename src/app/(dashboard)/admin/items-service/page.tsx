"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wrench,
  Plus,
  ClipboardList,
  Link2,
  Search,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ItemService {
  id: string;
  nombre: string;
  categoria: string;
  accion: string;
  descripcion: string | null;
  tiempoEstimado: number | null;
  activo: boolean;
}

interface RepuestoMapping {
  itemServiceId: string;
  repuestoId: string;
  cantidadDefault: number;
  obligatorio: boolean;
  notas: string | null;
  origenIA: boolean;
  repuesto: {
    id: string;
    nombre: string;
    codigo: string;
    precioCompra: number;
    unidad: string;
    stock: number;
    categoria: string;
  };
}

interface RepuestoSearchResult {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stock: number;
  unidad: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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
  { value: "CHECK", label: "Verificar" },
  { value: "REPLACE", label: "Reemplazar" },
  { value: "CHECK_AND_ADJUST", label: "Verificar y Ajustar" },
  { value: "ADJUST", label: "Ajustar" },
] as const;

const ACCION_LABELS: Record<string, string> = {
  CHECK: "Verificar",
  REPLACE: "Reemplazar",
  CHECK_AND_ADJUST: "Verificar y Ajustar",
  ADJUST: "Ajustar",
};

const CATEGORIA_COLORS: Record<string, string> = {
  MOTOR: "bg-info-bg text-ds-info",
  FRENOS: "bg-negative-bg text-negative",
  SUSPENSION: "bg-warning-bg text-warning",
  ELECTRICA: "bg-accent-DEFAULT/10 text-accent-DEFAULT",
  CARROCERIA: "bg-t-tertiary/10 text-t-tertiary",
  NEUMATICOS: "bg-t-tertiary/10 text-t-tertiary",
  TRANSMISION: "bg-t-secondary/10 text-t-secondary",
  LUBRICACION: "bg-warning-bg text-warning",
  INSPECCION: "bg-positive-bg text-positive",
  OTRO: "bg-t-secondary/10 text-t-secondary",
};

const ACCION_COLORS: Record<string, string> = {
  CHECK: "bg-info-bg text-ds-info",
  REPLACE: "bg-negative-bg text-negative",
  CHECK_AND_ADJUST: "bg-warning-bg text-warning",
  ADJUST: "bg-accent-DEFAULT/10 text-accent-DEFAULT",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ItemsServicePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <ItemsServiceContent />
    </Suspense>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

function ItemsServiceContent() {
  const [items, setItems] = useState<ItemService[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ItemService | null>(null);

  // Filters
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [search, setSearch] = useState("");

  // Create form
  const [form, setForm] = useState({
    nombre: "",
    categoria: "OTRO" as string,
    accion: "CHECK" as string,
    descripcion: "",
    tiempoEstimado: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items-service");
      if (res.ok) {
        const json = await res.json();
        setItems(json.data);
      } else {
        toast.error("Error al cargar items de servicio");
      }
    } catch {
      toast.error("Error de conexion");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Filter items locally
  const filteredItems = items.filter((item) => {
    if (filtroCategoria && filtroCategoria !== "all" && item.categoria !== filtroCategoria) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        item.nombre.toLowerCase().includes(q) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // KPI calculations
  const totalItems = items.length;

  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // We don't have repuestos count from the list API, so we track it when detail is opened
  // For KPI, we do a simple estimation: items that likely have repuestos are REPLACE actions
  const replaceItems = items.filter((i) => i.accion === "REPLACE").length;

  async function handleCreate() {
    if (!form.nombre) {
      toast.error("El nombre es requerido");
      return;
    }

    const payload: Record<string, unknown> = {
      nombre: form.nombre,
      categoria: form.categoria,
      accion: form.accion,
    };
    if (form.descripcion) payload.descripcion = form.descripcion;
    if (form.tiempoEstimado) {
      const mins = parseInt(form.tiempoEstimado);
      if (!isNaN(mins) && mins > 0) payload.tiempoEstimado = mins;
    }

    try {
      const res = await fetch("/api/items-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Item de servicio creado");
        setCreateDialogOpen(false);
        setForm({
          nombre: "",
          categoria: "OTRO",
          accion: "CHECK",
          descripcion: "",
          tiempoEstimado: "",
        });
        void fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error?.formErrors?.[0] || "Error al crear item");
      }
    } catch {
      toast.error("Error de conexion");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogo de Servicios"
        description="Items de servicio para ordenes de trabajo — tareas, inspecciones y reemplazos"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorias Principales</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {topCategories.map(([cat, count]) => (
                    <Badge
                      key={cat}
                      className={`text-xs ${CATEGORIA_COLORS[cat] ?? ""}`}
                    >
                      {cat} ({count})
                    </Badge>
                  ))}
                  {topCategories.length === 0 && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <Wrench className="h-8 w-8 text-accent-DEFAULT" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items con Repuestos (Reemplazo)</p>
                <p className="text-2xl font-bold">{replaceItems}</p>
              </div>
              <Link2 className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Categoria</Label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input
            placeholder="Nombre, descripcion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
        </div>
        <div className="ml-auto">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo Item de Servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    placeholder="Ej: Cambio de aceite motor"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(v) =>
                        setForm({ ...form, categoria: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Accion</Label>
                    <Select
                      value={form.accion}
                      onValueChange={(v) =>
                        setForm({ ...form, accion: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCIONES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descripcion</Label>
                  <Input
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm({ ...form, descripcion: e.target.value })
                    }
                    placeholder="Descripcion opcional del servicio"
                  />
                </div>
                <div>
                  <Label>Tiempo Estimado (minutos)</Label>
                  <Input
                    type="number"
                    value={form.tiempoEstimado}
                    onChange={(e) =>
                      setForm({ ...form, tiempoEstimado: e.target.value })
                    }
                    placeholder="Ej: 30 min"
                    min={1}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!form.nombre}
                  className="w-full"
                >
                  Crear Item de Servicio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Items de Servicio ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              Cargando...
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay items de servicio
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Nombre
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Categoria
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Accion
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Tiempo Est.
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="py-3 px-2">
                        <div>
                          <span className="font-medium">{item.nombre}</span>
                          {item.descripcion && (
                            <span className="text-xs text-muted-foreground block truncate max-w-xs">
                              {item.descripcion}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          className={`text-xs ${CATEGORIA_COLORS[item.categoria] ?? ""}`}
                        >
                          {item.categoria}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          className={`text-xs ${ACCION_COLORS[item.accion] ?? ""}`}
                        >
                          {ACCION_LABELS[item.accion] ?? item.accion}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center font-mono">
                        {item.tiempoEstimado
                          ? `${item.tiempoEstimado} min`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.activo ? (
                          <Badge className="bg-positive-bg text-positive text-xs">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Inactivo
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailItem && (
        <ItemDetailDialog
          item={detailItem}
          open={!!detailItem}
          onOpenChange={(open) => {
            if (!open) setDetailItem(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Item Detail Dialog ──────────────────────────────────────────────────────

function ItemDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ItemService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [repuestos, setRepuestos] = useState<RepuestoMapping[]>([]);
  const [loadingRepuestos, setLoadingRepuestos] = useState(true);
  const [addRepuestoOpen, setAddRepuestoOpen] = useState(false);

  const fetchRepuestos = useCallback(async () => {
    setLoadingRepuestos(true);
    try {
      const res = await fetch(`/api/items-service/${item.id}/repuestos`);
      if (res.ok) {
        const json = await res.json();
        setRepuestos(json.data);
      }
    } catch {
      toast.error("Error al cargar repuestos asociados");
    }
    setLoadingRepuestos(false);
  }, [item.id]);

  useEffect(() => {
    if (open) {
      void fetchRepuestos();
    }
  }, [open, fetchRepuestos]);

  async function handleUnlinkRepuesto(repuestoId: string) {
    try {
      const res = await fetch(`/api/items-service/${item.id}/repuestos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repuestoId }),
      });
      if (res.ok) {
        toast.success("Repuesto desvinculado");
        void fetchRepuestos();
      } else {
        toast.error("Error al desvincular repuesto");
      }
    } catch {
      toast.error("Error de conexion");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {item.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Item Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <Badge
                className={`text-xs mt-1 ${CATEGORIA_COLORS[item.categoria] ?? ""}`}
              >
                {item.categoria}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accion</p>
              <Badge
                className={`text-xs mt-1 ${ACCION_COLORS[item.accion] ?? ""}`}
              >
                {ACCION_LABELS[item.accion] ?? item.accion}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tiempo Estimado</p>
              <p className="font-mono text-sm mt-1">
                {item.tiempoEstimado ? `${item.tiempoEstimado} min` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <div className="mt-1">
                {item.activo ? (
                  <Badge className="bg-positive-bg text-positive text-xs">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Inactivo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {item.descripcion && (
            <div>
              <p className="text-xs text-muted-foreground">Descripcion</p>
              <p className="text-sm mt-1">{item.descripcion}</p>
            </div>
          )}

          {/* Repuestos Asociados */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Repuestos Asociados ({repuestos.length})
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddRepuestoOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Vincular Repuesto
              </Button>
            </div>

            {loadingRepuestos ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                Cargando repuestos...
              </p>
            ) : repuestos.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                Sin repuestos asociados
              </p>
            ) : (
              <div className="space-y-2">
                {repuestos.map((mapping) => (
                  <div
                    key={mapping.repuestoId}
                    className="flex items-center justify-between border rounded-lg p-3 hover:bg-bg-card-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {mapping.repuesto.nombre}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {mapping.repuesto.codigo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Cantidad: <span className="font-mono font-bold">{mapping.cantidadDefault}</span>
                        </span>
                        {mapping.obligatorio && (
                          <Badge className="bg-negative-bg text-negative text-xs">
                            Obligatorio
                          </Badge>
                        )}
                        {mapping.origenIA && (
                          <Badge variant="outline" className="text-xs">
                            IA
                          </Badge>
                        )}
                        {mapping.notas && (
                          <span className="text-xs text-muted-foreground truncate">
                            — {mapping.notas}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        Stock: {mapping.repuesto.stock}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-negative hover:text-negative"
                        onClick={() =>
                          handleUnlinkRepuesto(mapping.repuestoId)
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Repuesto Sub-dialog */}
        {addRepuestoOpen && (
          <AddRepuestoDialog
            itemId={item.id}
            open={addRepuestoOpen}
            onOpenChange={setAddRepuestoOpen}
            onAdded={() => {
              void fetchRepuestos();
            }}
            existingRepuestoIds={repuestos.map((r) => r.repuestoId)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Repuesto Dialog ─────────────────────────────────────────────────────

function AddRepuestoDialog({
  itemId,
  open,
  onOpenChange,
  onAdded,
  existingRepuestoIds,
}: {
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  existingRepuestoIds: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RepuestoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState<RepuestoSearchResult | null>(null);
  const [cantidadDefault, setCantidadDefault] = useState(1);
  const [obligatorio, setObligatorio] = useState(false);
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/repuestos?search=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (res.ok) {
          const json = await res.json();
          const results = (json.data as RepuestoSearchResult[]).filter(
            (r) => !existingRepuestoIds.includes(r.id)
          );
          setSearchResults(results);
        }
      } catch {
        // Silently fail search
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, existingRepuestoIds]);

  async function handleLink() {
    if (!selectedRepuesto) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/items-service/${itemId}/repuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repuestoId: selectedRepuesto.id,
          cantidadDefault,
          obligatorio,
          notas: notas || undefined,
          origenIA: false,
        }),
      });

      if (res.ok) {
        toast.success(`Repuesto "${selectedRepuesto.nombre}" vinculado`);
        onAdded();
        setSelectedRepuesto(null);
        setSearchQuery("");
        setCantidadDefault(1);
        setObligatorio(false);
        setNotas("");
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error?.formErrors?.[0] || "Error al vincular repuesto");
      }
    } catch {
      toast.error("Error de conexion");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Vincular Repuesto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search Repuestos */}
          {!selectedRepuesto ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar repuesto por nombre o codigo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {searching && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Buscando...
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {searchResults.map((rep) => (
                    <button
                      key={rep.id}
                      className="w-full text-left px-3 py-2 hover:bg-bg-card-hover transition-colors"
                      onClick={() => setSelectedRepuesto(rep)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">
                            {rep.nombre}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground ml-2">
                            {rep.codigo}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          Stock: {rep.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 &&
                !searching &&
                searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No se encontraron repuestos
                  </p>
                )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected repuesto info */}
              <div className="border rounded-lg p-3 bg-bg-card-hover">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {selectedRepuesto.nombre}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {selectedRepuesto.codigo}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedRepuesto(null);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Link configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad Default</Label>
                  <Input
                    type="number"
                    value={cantidadDefault}
                    onChange={(e) =>
                      setCantidadDefault(parseInt(e.target.value) || 1)
                    }
                    min={1}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Checkbox
                    checked={obligatorio}
                    onCheckedChange={(checked) =>
                      setObligatorio(checked === true)
                    }
                    id="obligatorio"
                  />
                  <Label htmlFor="obligatorio" className="cursor-pointer">
                    Obligatorio
                  </Label>
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas opcionales sobre el repuesto"
                />
              </div>

              <Button
                onClick={handleLink}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Vinculando..." : "Vincular Repuesto"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
