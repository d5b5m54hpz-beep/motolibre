"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  talleresColumns,
  mecanicosColumns,
  defaultHiddenTallerColumns,
  type TallerRow,
  type MecanicoRow,
} from "./talleres-columns";
import { formatMoney } from "@/lib/format";
import {
  Building2,
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  Download,
  Wrench,
  User,
} from "lucide-react";

// ── Predefined specialties ──
const ESPECIALIDADES = [
  "Motor",
  "Frenos",
  "Electricidad",
  "Suspensión",
  "Carrocería",
  "Transmisión",
  "Inyección",
  "General",
] as const;

// ── Filter options ──
const TIPO_OPTIONS = [
  { label: "Interno", value: "INTERNO" },
  { label: "Externo", value: "EXTERNO" },
];

const ESTADO_OPTIONS = [
  { label: "Activo", value: "Activo" },
  { label: "Inactivo", value: "Inactivo" },
];

const tallerFilterColumns: FilterableColumn[] = [
  { id: "tipo", title: "Tipo", options: TIPO_OPTIONS },
  { id: "activo", title: "Estado", options: ESTADO_OPTIONS },
];

const mecanicoFilterColumns: FilterableColumn[] = [
  { id: "activo", title: "Estado", options: ESTADO_OPTIONS },
];

// ── Props ──
interface TalleresTableProps {
  talleres: TallerRow[];
  mecanicos: MecanicoRow[];
}

export function TalleresTable({ talleres, mecanicos }: TalleresTableProps) {
  const router = useRouter();
  const [selectedTaller, setSelectedTaller] = useState<TallerRow | null>(null);
  const [selectedMecanico, setSelectedMecanico] = useState<MecanicoRow | null>(null);
  const [tallerDialog, setTallerDialog] = useState(false);
  const [mecanicoDialog, setMecanicoDialog] = useState(false);

  const tallerBulkActions: BulkAction<TallerRow>[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows) => {
        const csv = [
          ["Nombre", "Tipo", "Dirección", "Teléfono", "Email", "Especialidades", "Tarifa/h"].join(","),
          ...rows.map((r) =>
            [r.nombre, r.tipo, r.direccion ?? "", r.telefono ?? "", r.email ?? "", r.especialidades.join("; "), r.tarifaHora ?? ""].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "talleres.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <>
      <Tabs defaultValue="talleres" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="talleres" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Talleres
            <span className="inline-flex items-center justify-center rounded-full px-1.5 h-5 min-w-5 text-[10px] font-mono tabular-nums font-semibold bg-primary/10 text-primary">
              {talleres.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="mecanicos" className="gap-1.5">
            <Users className="h-4 w-4" />
            Mecánicos
            <span className="inline-flex items-center justify-center rounded-full px-1.5 h-5 min-w-5 text-[10px] font-mono tabular-nums font-semibold bg-primary/10 text-primary">
              {mecanicos.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Talleres tab ── */}
        <TabsContent value="talleres">
          <DataTable
            columns={talleresColumns}
            data={talleres}
            searchableColumns={["nombre", "especialidades", "contacto"]}
            searchPlaceholder="Buscar por nombre, especialidad, contacto..."
            filterableColumns={tallerFilterColumns}
            bulkActions={tallerBulkActions}
            onRowClick={(row) => setSelectedTaller(row)}
            emptyState={{
              icon: Building2,
              title: "No hay talleres",
              description: "Creá el primer taller para gestionar tu red de service.",
              action: {
                label: "Crear taller",
                onClick: () => setTallerDialog(true),
              },
            }}
            defaultPageSize={20}
            defaultColumnVisibility={defaultHiddenTallerColumns}
            toolbar={
              <TallerDialogButton
                open={tallerDialog}
                onOpenChange={setTallerDialog}
                talleres={talleres}
                onSuccess={() => router.refresh()}
              />
            }
          />
        </TabsContent>

        {/* ── Mecánicos tab ── */}
        <TabsContent value="mecanicos">
          <DataTable
            columns={mecanicosColumns}
            data={mecanicos}
            searchableColumns={["nombreCompleto", "taller", "especialidad"]}
            searchPlaceholder="Buscar por nombre, taller, especialidad..."
            filterableColumns={mecanicoFilterColumns}
            onRowClick={(row) => setSelectedMecanico(row)}
            emptyState={{
              icon: User,
              title: "No hay mecánicos",
              description: "Agregá mecánicos a los talleres para asignarlos a OT.",
              action: {
                label: "Crear mecánico",
                onClick: () => setMecanicoDialog(true),
              },
            }}
            defaultPageSize={20}
            toolbar={
              <MecanicoDialogButton
                open={mecanicoDialog}
                onOpenChange={setMecanicoDialog}
                talleres={talleres}
                onSuccess={() => router.refresh()}
              />
            }
          />
        </TabsContent>
      </Tabs>

      {/* ── Taller SheetDetail ── */}
      {selectedTaller && (
        <TallerSheet
          taller={selectedTaller}
          mecanicos={mecanicos.filter((m) => m.tallerId === selectedTaller.id)}
          open={!!selectedTaller}
          onOpenChange={(open) => !open && setSelectedTaller(null)}
        />
      )}

      {/* ── Mecánico SheetDetail ── */}
      {selectedMecanico && (
        <MecanicoSheet
          mecanico={selectedMecanico}
          open={!!selectedMecanico}
          onOpenChange={(open) => !open && setSelectedMecanico(null)}
        />
      )}
    </>
  );
}

// ── Taller Sheet ──
function TallerSheet({
  taller,
  mecanicos,
  open,
  onOpenChange,
}: {
  taller: TallerRow;
  mecanicos: MecanicoRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField label="Nombre" value={taller.nombre} />
            <DetailField
              label="Tipo"
              value={
                <StatusBadge
                  status={taller.tipo}
                  variant={taller.tipo === "INTERNO" ? "info" : "warning"}
                  showDot={false}
                  label={taller.tipo === "INTERNO" ? "Interno" : "Externo"}
                />
              }
            />
            <DetailField label="Dirección" value={taller.direccion} />
            <DetailField label="Teléfono" value={taller.telefono} />
            <DetailField label="Email" value={taller.email} />
            <DetailField label="Contacto" value={taller.contacto} />
            <DetailField
              label="Tarifa/hora"
              value={taller.tarifaHora ? formatMoney(taller.tarifaHora) : undefined}
              mono
            />
            <DetailField
              label="Estado"
              value={
                <StatusBadge
                  status={taller.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
                  label={taller.activo ? "Activo" : "Inactivo"}
                />
              }
            />
          </DetailGrid>
          {taller.notas && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notas
              </p>
              <p className="text-sm bg-muted/50 rounded-lg p-3">{taller.notas}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "especialidades",
      label: "Especialidades",
      count: taller.especialidades.length,
      content: (
        <div className="space-y-4">
          {taller.especialidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin especialidades</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Asigná especialidades al taller para filtrar y asignar OT más fácilmente.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {taller.especialidades.map((e) => (
                <Badge key={e} variant="outline" className="text-sm px-3 py-1">
                  {e}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "mecanicos",
      label: "Mecánicos",
      count: mecanicos.length,
      content: (
        <div className="space-y-3">
          {mecanicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin mecánicos</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Asigná mecánicos a este taller para poder incluirlos en órdenes de trabajo.
              </p>
            </div>
          ) : (
            mecanicos.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {m.nombre[0]}{m.apellido[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.nombre} {m.apellido}</p>
                    {m.especialidad && (
                      <p className="text-xs text-muted-foreground">{m.especialidad}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {m.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {m.telefono}
                    </span>
                  )}
                  <StatusBadge
                    status={m.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
                    label={m.activo ? "Activo" : "Inactivo"}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={taller.nombre}
      subtitle={`${taller.tipo === "INTERNO" ? "Taller Interno" : "Taller Externo"}${taller.direccion ? ` · ${taller.direccion}` : ""}`}
      status={taller.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
      statusVariant={taller.activo ? "success" : "danger"}
      tabs={tabs}
      headerExtra={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {taller.telefono && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {taller.telefono}
            </span>
          )}
          {taller.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {taller.email}
            </span>
          )}
        </div>
      }
    />
  );
}

// ── Mecánico Sheet ──
function MecanicoSheet({
  mecanico,
  open,
  onOpenChange,
}: {
  mecanico: MecanicoRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tabs = [
    {
      id: "info",
      label: "Info",
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {mecanico.nombre[0]}{mecanico.apellido[0]}
            </div>
            <div>
              <p className="text-lg font-bold">{mecanico.nombre} {mecanico.apellido}</p>
              <p className="text-sm text-muted-foreground">{mecanico.tallerNombre}</p>
            </div>
          </div>
          <DetailGrid>
            <DetailField label="Especialidad" value={mecanico.especialidad} />
            <DetailField
              label="Estado"
              value={
                <StatusBadge
                  status={mecanico.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
                  label={mecanico.activo ? "Activo" : "Inactivo"}
                />
              }
            />
            <DetailField label="Teléfono" value={mecanico.telefono} />
            <DetailField label="Email" value={mecanico.email} />
          </DetailGrid>
        </div>
      ),
    },
    {
      id: "carga",
      label: "Carga de Trabajo",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold font-mono tabular-nums">{mecanico.otHoy}</p>
              <p className="text-xs text-muted-foreground mt-1">OT Hoy</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold font-mono tabular-nums">{mecanico.otMes}</p>
              <p className="text-xs text-muted-foreground mt-1">OT este Mes</p>
            </div>
          </div>
          {mecanico.otHoy === 0 && mecanico.otMes === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin OT asignadas</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Este mecánico no tiene órdenes de trabajo asignadas actualmente.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={`${mecanico.nombre} ${mecanico.apellido}`}
      subtitle={mecanico.tallerNombre}
      status={mecanico.activo ? "ACTIVO" : "BAJA_DEFINITIVA"}
      statusVariant={mecanico.activo ? "success" : "danger"}
      tabs={tabs}
    />
  );
}

// ── Create Taller Dialog ──
function TallerDialogButton({
  open,
  onOpenChange,
  talleres,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talleres: TallerRow[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    tipo: "INTERNO" as "INTERNO" | "EXTERNO",
    direccion: "",
    telefono: "",
    email: "",
    contacto: "",
    especialidades: [] as string[],
    notas: "",
    tarifaHora: "",
  });
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({
      nombre: "",
      tipo: "INTERNO",
      direccion: "",
      telefono: "",
      email: "",
      contacto: "",
      especialidades: [],
      notas: "",
      tarifaHora: "",
    });
  }

  async function handleSubmit() {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const res = await fetch("/api/talleres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          direccion: form.direccion || null,
          telefono: form.telefono || null,
          email: form.email || null,
          contacto: form.contacto || null,
          especialidades: form.especialidades,
          notas: form.notas || null,
          tarifaHora: form.tarifaHora ? parseFloat(form.tarifaHora) : null,
        }),
      });
      if (res.ok) {
        onOpenChange(false);
        resetForm();
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Taller
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nuevo Taller</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre del taller"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "INTERNO" | "EXTERNO" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNO">Interno</SelectItem>
                  <SelectItem value="EXTERNO">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Dirección del taller"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Persona de contacto</Label>
            <Input
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Especialidades *</Label>
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map((esp) => {
                const selected = form.especialidades.includes(esp);
                return (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        especialidades: selected
                          ? form.especialidades.filter((e) => e !== esp)
                          : [...form.especialidades, esp],
                      });
                    }}
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-input"
                    }`}
                  >
                    {esp}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tarifa por hora {form.tipo === "EXTERNO" && "(recomendado para externos)"}</Label>
            <Input
              type="number"
              value={form.tarifaHora}
              onChange={(e) => setForm({ ...form, tarifaHora: e.target.value })}
              placeholder="$ 0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.nombre || saving}
            className="w-full"
          >
            {saving ? "Creando..." : "Crear Taller"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Mecánico Dialog ──
function MecanicoDialogButton({
  open,
  onOpenChange,
  talleres,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talleres: TallerRow[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    especialidad: "",
    tallerId: "",
  });
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({ nombre: "", apellido: "", telefono: "", email: "", especialidad: "", tallerId: "" });
  }

  async function handleSubmit() {
    if (!form.nombre || !form.apellido || !form.tallerId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mecanicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono || null,
          email: form.email || null,
          especialidad: form.especialidad || null,
          tallerId: form.tallerId,
        }),
      });
      if (res.ok) {
        onOpenChange(false);
        resetForm();
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  const activeTalleres = talleres.filter((t) => t.activo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Mecánico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Mecánico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Taller *</Label>
            <Select value={form.tallerId} onValueChange={(v) => setForm({ ...form, tallerId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar taller" /></SelectTrigger>
              <SelectContent>
                {activeTalleres.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Especialidad</Label>
            <Select value={form.especialidad} onValueChange={(v) => setForm({ ...form, especialidad: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar especialidad" /></SelectTrigger>
              <SelectContent>
                {ESPECIALIDADES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.nombre || !form.apellido || !form.tallerId || saving}
            className="w-full"
          >
            {saving ? "Creando..." : "Crear Mecánico"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
