"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import {
  SheetDetail,
  DetailField,
  DetailGrid,
} from "@/components/ui/sheet-detail";
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
import {
  tarifasColumns,
  type TarifaRow,
  PLAN_LABELS,
  FRECUENCIA_LABELS,
  CONDICION_LABELS,
} from "./tarifas-columns";
import { formatMoney } from "@/lib/format";
import {
  DollarSign,
  Plus,
  Download,
  Pencil,
  Trash2,
  Calculator,
} from "lucide-react";

// -- Filter options --
const CONDICION_OPTIONS = [
  { label: "Nueva", value: "NUEVA" },
  { label: "Usada", value: "USADA" },
];

const PLAN_OPTIONS = [
  { label: "3 meses", value: "MESES_3" },
  { label: "6 meses", value: "MESES_6" },
  { label: "9 meses", value: "MESES_9" },
  { label: "12 meses", value: "MESES_12" },
  { label: "24 meses", value: "MESES_24" },
];

const ESTADO_OPTIONS = [
  { label: "Activo", value: "ACTIVO" },
  { label: "Inactivo", value: "INACTIVO" },
];

// -- Props --
interface TarifasTableProps {
  data: TarifaRow[];
  marcas: string[];
}

export function TarifasTable({ data, marcas }: TarifasTableProps) {
  const router = useRouter();
  const [selectedTarifa, setSelectedTarifa] = useState<TarifaRow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarifa, setEditTarifa] = useState<TarifaRow | null>(null);

  const filterableColumns: FilterableColumn[] = [
    ...(marcas.length > 0
      ? [
          {
            id: "marca" as const,
            title: "Marca",
            options: marcas.map((m) => ({ label: m, value: m })),
          },
        ]
      : []),
    { id: "condicion", title: "Condicion", options: CONDICION_OPTIONS },
    { id: "plan", title: "Plan", options: PLAN_OPTIONS },
    { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
  ];

  const bulkActions = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows: TarifaRow[]) => {
        const csv = [
          [
            "Marca",
            "Modelo",
            "Condicion",
            "Plan",
            "Frecuencia",
            "Precio",
            "Estado",
          ].join(","),
          ...rows.map((r) =>
            [
              r.marca,
              r.modelo,
              r.condicion,
              r.plan,
              r.frecuencia,
              r.precio,
              r.activo ? "Activo" : "Inactivo",
            ].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tarifas-alquiler.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  function handleRowClick(row: TarifaRow) {
    setSelectedTarifa(row);
  }

  async function handleDelete(tarifaId: string) {
    if (
      !confirm(
        "Se desactivara esta tarifa. Confirmas?"
      )
    )
      return;
    const res = await fetch(`/api/tarifas-alquiler/${tarifaId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedTarifa(null);
      router.refresh();
    }
  }

  return (
    <>
      <DataTable
        columns={tarifasColumns}
        data={data}
        searchableColumns={["marca", "modelo"]}
        searchPlaceholder="Buscar por marca, modelo..."
        filterableColumns={filterableColumns}
        bulkActions={bulkActions}
        onRowClick={handleRowClick}
        emptyState={{
          icon: DollarSign,
          title: "No hay tarifas de alquiler",
          description:
            "Crea tu primera tarifa o usa el simulador para calcular precios.",
          action: {
            label: "Nueva Tarifa",
            onClick: () => setShowCreateDialog(true),
          },
        }}
        defaultPageSize={20}
        toolbar={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() =>
                router.push("/admin/tarifas-alquiler/simulador")
              }
            >
              <Calculator className="h-4 w-4 mr-1.5" />
              Simulador
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva Tarifa
            </Button>
          </div>
        }
      />

      {/* -- Sheet Detail -- */}
      {selectedTarifa && (
        <TarifaSheet
          tarifa={selectedTarifa}
          open={!!selectedTarifa}
          onOpenChange={(open) => !open && setSelectedTarifa(null)}
          onEdit={() => {
            setEditTarifa(selectedTarifa);
            setSelectedTarifa(null);
          }}
          onDelete={() => handleDelete(selectedTarifa.id)}
        />
      )}

      {/* -- Create Dialog -- */}
      {showCreateDialog && (
        <TarifaFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            router.refresh();
          }}
        />
      )}

      {/* -- Edit Dialog -- */}
      {editTarifa && (
        <TarifaFormDialog
          open={!!editTarifa}
          onOpenChange={(open) => !open && setEditTarifa(null)}
          tarifa={editTarifa}
          onSuccess={() => {
            setEditTarifa(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// -- Sheet Detail --
function TarifaSheet({
  tarifa,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  tarifa: TarifaRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold font-mono tabular-nums">
                {formatMoney(tarifa.precio)}
              </p>
              <p className="text-[10px] text-muted-foreground">Precio</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold font-mono tabular-nums">
                {PLAN_LABELS[tarifa.plan] ?? tarifa.plan}
              </p>
              <p className="text-[10px] text-muted-foreground">Plan</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold font-mono tabular-nums">
                {tarifa.margenPct != null
                  ? `${(tarifa.margenPct * 100).toFixed(0)}%`
                  : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">Margen</p>
            </div>
          </div>

          <DetailGrid>
            <DetailField label="Marca" value={tarifa.marca} />
            <DetailField label="Modelo" value={tarifa.modelo} />
            <DetailField
              label="Condicion"
              value={
                CONDICION_LABELS[tarifa.condicion] ?? tarifa.condicion
              }
            />
            <DetailField
              label="Frecuencia"
              value={
                FRECUENCIA_LABELS[tarifa.frecuencia] ?? tarifa.frecuencia
              }
            />
          </DetailGrid>

          {/* -- Cost breakdown -- */}
          {(tarifa.costoAmortizacion != null ||
            tarifa.costoMantenimiento != null ||
            tarifa.costoSeguro != null ||
            tarifa.costoPatente != null ||
            tarifa.costoOperativo != null) && (
            <div className="border-t pt-4">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
                Desglose de costos
              </h4>
              <div className="space-y-2">
                {[
                  { label: "Amortizacion", value: tarifa.costoAmortizacion },
                  {
                    label: "Mantenimiento",
                    value: tarifa.costoMantenimiento,
                  },
                  { label: "Seguro", value: tarifa.costoSeguro },
                  { label: "Patente", value: tarifa.costoPatente },
                  { label: "Operativo", value: tarifa.costoOperativo },
                ]
                  .filter((c) => c.value != null)
                  .map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between p-2 rounded border bg-muted/30"
                    >
                      <span className="text-sm">{c.label}</span>
                      <span className="font-mono tabular-nums text-sm font-medium">
                        {formatMoney(c.value!)}
                      </span>
                    </div>
                  ))}
                {tarifa.margenPct != null && (
                  <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <span className="text-sm">Margen</span>
                    <span className="font-mono tabular-nums text-sm font-medium">
                      {(tarifa.margenPct * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2">
                  <span className="text-sm font-semibold">Precio Final</span>
                  <span className="text-lg font-bold font-mono tabular-nums">
                    {formatMoney(tarifa.precio)}
                  </span>
                </div>
              </div>
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
      title={`${tarifa.marca} ${tarifa.modelo}`}
      subtitle={`${CONDICION_LABELS[tarifa.condicion]} - ${PLAN_LABELS[tarifa.plan]} - ${FRECUENCIA_LABELS[tarifa.frecuencia]}`}
      status={tarifa.activo ? "ACTIVO" : "INACTIVO"}
      tabs={tabs}
      actions={[
        {
          label: "Editar",
          icon: Pencil,
          variant: "outline",
          onClick: onEdit,
        },
        {
          label: "Desactivar",
          icon: Trash2,
          variant: "destructive",
          onClick: onDelete,
        },
      ]}
    />
  );
}

// -- Create/Edit Dialog --
function TarifaFormDialog({
  open,
  onOpenChange,
  tarifa,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarifa?: TarifaRow;
  onSuccess: () => void;
}) {
  const isEdit = !!tarifa;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    marca: tarifa?.marca ?? "",
    modelo: tarifa?.modelo ?? "",
    condicion: tarifa?.condicion ?? "NUEVA",
    plan: tarifa?.plan ?? "MESES_12",
    frecuencia: tarifa?.frecuencia ?? "MENSUAL",
    precio: tarifa?.precio ?? 0,
    costoAmortizacion: tarifa?.costoAmortizacion ?? null,
    costoMantenimiento: tarifa?.costoMantenimiento ?? null,
    costoSeguro: tarifa?.costoSeguro ?? null,
    costoPatente: tarifa?.costoPatente ?? null,
    costoOperativo: tarifa?.costoOperativo ?? null,
    margenPct: (tarifa?.margenPct ?? 0.15) as number | null,
    activo: tarifa?.activo ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isEdit
        ? `/api/tarifas-alquiler/${tarifa!.id}`
        : "/api/tarifas-alquiler";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Tarifa" : "Nueva Tarifa de Alquiler"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Input
                value={formData.marca}
                onChange={(e) =>
                  setFormData({ ...formData, marca: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo *</Label>
              <Input
                value={formData.modelo}
                onChange={(e) =>
                  setFormData({ ...formData, modelo: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Condicion</Label>
              <Select
                value={formData.condicion}
                onValueChange={(v) =>
                  setFormData({ ...formData, condicion: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUEVA">Nueva</SelectItem>
                  <SelectItem value="USADA">Usada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={(v) =>
                  setFormData({ ...formData, plan: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MESES_3">3 meses</SelectItem>
                  <SelectItem value="MESES_6">6 meses</SelectItem>
                  <SelectItem value="MESES_9">9 meses</SelectItem>
                  <SelectItem value="MESES_12">12 meses</SelectItem>
                  <SelectItem value="MESES_24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <Select
                value={formData.frecuencia}
                onValueChange={(v) =>
                  setFormData({ ...formData, frecuencia: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Precio *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.precio || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  precio: parseFloat(e.target.value) || 0,
                })
              }
              className="font-mono tabular-nums"
              required
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Costos (opcional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "costoAmortizacion" as const,
                  label: "Amortizacion",
                },
                {
                  key: "costoMantenimiento" as const,
                  label: "Mantenimiento",
                },
                { key: "costoSeguro" as const, label: "Seguro" },
                { key: "costoPatente" as const, label: "Patente" },
                { key: "costoOperativo" as const, label: "Operativo" },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData[field.key] ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    className="font-mono tabular-nums h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Margen %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={
                    formData.margenPct != null
                      ? (formData.margenPct * 100).toFixed(0)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      margenPct: e.target.value
                        ? parseFloat(e.target.value) / 100
                        : null,
                    })
                  }
                  className="font-mono tabular-nums h-8 text-sm"
                  placeholder="15"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving
              ? "Guardando..."
              : isEdit
                ? "Guardar Cambios"
                : "Crear Tarifa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
