"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import type { BulkAction } from "@/components/data-table/data-table-bulk-actions";
import {
  SheetDetail,
  DetailField,
  DetailGrid,
  TimelineItem,
} from "@/components/ui/sheet-detail";
import { StatusBadge } from "@/components/ui/status-badge";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { otColumns, type OTRow } from "./ot-columns";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import {
  Wrench,
  Download,
  Plus,
  ExternalLink,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Filter options ──
const ESTADO_OPTIONS = [
  "SOLICITADA",
  "APROBADA",
  "PROGRAMADA",
  "EN_ESPERA_REPUESTOS",
  "EN_EJECUCION",
  "EN_REVISION",
  "COMPLETADA",
  "CANCELADA",
].map((e) => ({ label: e.replace(/_/g, " "), value: e }));

const TIPO_OPTIONS = ["PREVENTIVO", "CORRECTIVO", "EMERGENCIA"].map((t) => ({
  label: t,
  value: t,
}));

const PRIORIDAD_OPTIONS = ["BAJA", "MEDIA", "ALTA", "URGENTE"].map((p) => ({
  label: p,
  value: p,
}));

const filterableColumns: FilterableColumn[] = [
  { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
  { id: "tipo", title: "Tipo", options: TIPO_OPTIONS },
  { id: "prioridad", title: "Prioridad", options: PRIORIDAD_OPTIONS },
];

// ── Types ──
interface MotoOption {
  id: string;
  patente: string | null;
  marca: string;
  modelo: string;
}

interface OTTableProps {
  data: OTRow[];
  motos: MotoOption[];
}

// ── Main Component ──
export function OTTable({ data, motos }: OTTableProps) {
  const router = useRouter();
  const [selectedOT, setSelectedOT] = useState<OTRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const bulkActions: BulkAction<OTRow>[] = useMemo(
    () => [
      {
        label: "Exportar CSV",
        icon: Download,
        onClick: (rows) => {
          const csv = [
            [
              "Número",
              "Moto",
              "Tipo",
              "Prioridad",
              "Estado",
              "Mecánico",
              "Costo",
            ].join(","),
            ...rows.map((r) =>
              [
                r.numero,
                r.moto
                  ? `${r.moto.patente ?? ""} ${r.moto.marca} ${r.moto.modelo}`
                  : r.motoId,
                r.tipo,
                r.prioridad,
                r.estado,
                r.mecanicoNombre ?? "",
                r.costoTotal ? Number(r.costoTotal) : "",
              ].join(",")
            ),
          ].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "ordenes-trabajo.csv";
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={otColumns}
        data={data}
        searchableColumns={["numero", "motoInfo", "mecanicoNombre"]}
        searchPlaceholder="Buscar por Nº OT, moto, mecánico..."
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        onRowClick={(row) => setSelectedOT(row)}
        emptyState={{
          icon: Wrench,
          title: "Sin órdenes de trabajo",
          description:
            "Creá la primera OT para gestionar mantenimientos y reparaciones.",
          action: {
            label: "Nueva OT",
            onClick: () => setDialogOpen(true),
          },
        }}
        defaultPageSize={20}
        toolbar={
          <div className="ml-auto">
            <NuevaOTDialog
              motos={motos}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </div>
        }
      />

      {selectedOT && (
        <OTSheet
          ot={selectedOT}
          open={!!selectedOT}
          onOpenChange={(open) => !open && setSelectedOT(null)}
        />
      )}
    </>
  );
}

// ── Nueva OT Dialog ─────────────────────────────────────────────────────────
const TIPOS_OT = ["PREVENTIVO", "CORRECTIVO", "EMERGENCIA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

function NuevaOTDialog({
  motos,
  open,
  onOpenChange,
}: {
  motos: MotoOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    tipo: "CORRECTIVO",
    prioridad: "MEDIA",
    motoId: "",
    descripcion: "",
  });
  const [motoOpen, setMotoOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedMoto = motos.find((m) => m.id === form.motoId);

  const handleCreate = useCallback(async () => {
    if (!form.motoId || !form.descripcion) return;
    setCreating(true);
    try {
      const res = await fetch("/api/mantenimientos/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const j = await res.json();
        onOpenChange(false);
        router.push(`/admin/mantenimientos/ordenes/${j.data.id}`);
      }
    } finally {
      setCreating(false);
    }
  }, [form, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Nueva OT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
          <DialogDescription>
            Completá los datos para crear una nueva OT.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Moto autocomplete */}
          <div className="space-y-2">
            <Label>Moto *</Label>
            <Popover open={motoOpen} onOpenChange={setMotoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={motoOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedMoto
                    ? `${selectedMoto.patente ?? "Sin patentar"} — ${selectedMoto.marca} ${selectedMoto.modelo}`
                    : "Buscar moto..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por patente, marca, modelo..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron motos.</CommandEmpty>
                    <CommandGroup>
                      {motos.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={`${m.patente ?? ""} ${m.marca} ${m.modelo}`}
                          onSelect={() => {
                            setForm({ ...form, motoId: m.id });
                            setMotoOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.motoId === m.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div>
                            <span className="font-mono font-bold text-sm">
                              {m.patente ?? "Sin patentar"}
                            </span>
                            <span className="text-muted-foreground ml-2 text-sm">
                              {m.marca} {m.modelo}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_OT.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={form.prioridad}
                onValueChange={(v) => setForm({ ...form, prioridad: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción *</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Qué se necesita hacer..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!form.motoId || !form.descripcion || creating}
            className="w-full"
          >
            {creating ? "Creando..." : "Crear OT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── OT Sheet lateral ────────────────────────────────────────────────────────
function OTSheet({
  ot,
  open,
  onOpenChange,
}: {
  ot: OTRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const tabs = [
    {
      id: "info",
      label: "Info General",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField label="Número" value={ot.numero} mono />
            <DetailField label="Tipo" value={ot.tipo} />
            <DetailField
              label="Prioridad"
              value={<StatusBadge status={ot.prioridad} />}
            />
            <DetailField
              label="Estado"
              value={<StatusBadge status={ot.estado} />}
            />
            <DetailField
              label="Tipo Service"
              value={ot.tipoService?.replace(/_/g, " ")}
            />
            <DetailField label="Mecánico" value={ot.mecanicoNombre} />
            <DetailField label="Taller" value={ot.tallerNombre} />
          </DetailGrid>

          {ot.moto && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Moto</h4>
              <DetailGrid>
                <DetailField
                  label="Patente"
                  value={ot.moto.patente ?? "Sin patentar"}
                  mono
                />
                <DetailField
                  label="Marca / Modelo"
                  value={`${ot.moto.marca} ${ot.moto.modelo}`}
                />
              </DetailGrid>
            </div>
          )}

          {ot.descripcion && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Descripción</h4>
              <p className="text-sm text-muted-foreground">{ot.descripcion}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "fechas",
      label: "Fechas",
      content: (
        <div className="space-y-3">
          <FechaField
            label="Solicitud"
            fecha={ot.fechaSolicitud}
          />
          <FechaField
            label="Programada"
            fecha={ot.fechaProgramada}
          />
          <FechaField
            label="Finalizada"
            fecha={ot.fechaFinReal}
          />
        </div>
      ),
    },
    {
      id: "costos",
      label: "Costos",
      content: (
        <div className="space-y-4">
          <div className="font-mono text-sm space-y-2 max-w-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano de Obra</span>
              <span className="tabular-nums">
                {formatMoney(Number(ot.costoManoObra ?? 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repuestos</span>
              <span className="tabular-nums">
                {formatMoney(Number(ot.costoRepuestos ?? 0))}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(Number(ot.costoTotal ?? 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "tareas",
      label: "Tareas",
      count: ot._count.tareas,
      content: (
        <div className="text-center py-8">
          {ot._count.tareas === 0 ? (
            <p className="text-sm text-muted-foreground">Sin tareas registradas</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ot._count.tareas} tarea(s) registradas.
              <br />
              <button
                onClick={() =>
                  router.push(`/admin/mantenimientos/ordenes/${ot.id}`)
                }
                className="text-primary hover:underline text-xs mt-1"
              >
                Ver detalle completo
              </button>
            </p>
          )}
        </div>
      ),
    },
    {
      id: "repuestos",
      label: "Repuestos",
      count: ot._count.repuestos,
      content: (
        <div className="text-center py-8">
          {ot._count.repuestos === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin repuestos registrados
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ot._count.repuestos} repuesto(s) registrados.
              <br />
              <button
                onClick={() =>
                  router.push(`/admin/mantenimientos/ordenes/${ot.id}`)
                }
                className="text-primary hover:underline text-xs mt-1"
              >
                Ver detalle completo
              </button>
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={ot.numero}
      subtitle={
        ot.moto
          ? `${ot.moto.patente ?? "Sin patentar"} · ${ot.moto.marca} ${ot.moto.modelo}`
          : ot.descripcion.slice(0, 60)
      }
      status={ot.estado}
      tabs={tabs}
      actions={[
        {
          label: "Ver detalle",
          icon: ExternalLink,
          variant: "outline",
          onClick: () =>
            router.push(`/admin/mantenimientos/ordenes/${ot.id}`),
        },
      ]}
    />
  );
}

// ── Helpers ──
function FechaField({
  label,
  fecha,
}: {
  label: string;
  fecha: Date | string | null;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sm">
        {fecha ? formatDateTime(new Date(fecha)) : "—"}
      </span>
    </div>
  );
}
