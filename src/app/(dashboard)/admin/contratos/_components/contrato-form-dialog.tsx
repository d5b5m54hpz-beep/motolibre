"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { contratoCreateSchema, type ContratoCreateInput } from "@/lib/validations/contrato";
import { formatMoney } from "@/lib/format";

type ClienteOption = { id: string; nombre: string; apellido: string; dni: string };
type MotoOption = {
  id: string;
  marca: string;
  modelo: string;
  patente: string | null;
  precioAlquilerMensual: number | null;
  cilindrada: number | null;
};
type Preview = {
  montoPeriodo: number;
  totalCuotas: number;
  frecuencia: string;
  duracionMeses: number;
  deposito: number;
  totalAlquiler: number;
  totalConDeposito: number;
  tieneOpcionCompra: boolean;
  precioCompra: number | null;
};

export function ContratoFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [motos, setMotos] = useState<MotoOption[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<ContratoCreateInput>({
    resolver: zodResolver(contratoCreateSchema),
    defaultValues: {
      frecuenciaPago: "MENSUAL",
      duracionMeses: 12,
      deposito: 0,
      tieneOpcionCompra: false,
      renovacionAuto: false,
    },
  });

  const motoId = watch("motoId");
  const frecuenciaPago = watch("frecuenciaPago");
  const duracionMeses = watch("duracionMeses");
  const deposito = watch("deposito");
  const tieneOpcionCompra = watch("tieneOpcionCompra");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/clientes/aprobados").then((r) => r.json()),
      fetch("/api/motos/disponibles").then((r) => r.json()),
    ]).then(([c, m]) => {
      setClientes(c.data ?? []);
      setMotos(m.data ?? []);
    });
  }, [open]);

  const fetchPreview = useCallback(async () => {
    if (!motoId || !frecuenciaPago || !duracionMeses) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/contratos/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          frecuenciaPago,
          duracionMeses: Number(duracionMeses),
          deposito: Number(deposito) || 0,
          tieneOpcionCompra: Boolean(tieneOpcionCompra),
        }),
      });
      const json = await res.json();
      if (res.ok) setPreview(json.data);
    } finally {
      setLoadingPreview(false);
    }
  }, [motoId, frecuenciaPago, duracionMeses, deposito, tieneOpcionCompra]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  async function onSubmit(data: ContratoCreateInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          duracionMeses: Number(data.duracionMeses),
          deposito: Number(data.deposito),
          precioCompra: data.precioCompra ? Number(data.precioCompra) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al crear contrato");
        return;
      }
      reset();
      setPreview(null);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMoto = motos.find((m) => m.id === motoId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Contrato de Alquiler</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Controller
              name="clienteId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente aprobado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No hay clientes aprobados disponibles
                      </SelectItem>
                    )}
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.apellido}, {c.nombre} — DNI {c.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clienteId && (
              <p className="text-sm text-red-500">{errors.clienteId.message}</p>
            )}
          </div>

          {/* Moto */}
          <div className="space-y-2">
            <Label>Moto</Label>
            <Controller
              name="motoId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moto disponible..." />
                  </SelectTrigger>
                  <SelectContent>
                    {motos.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No hay motos disponibles
                      </SelectItem>
                    )}
                    {motos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.marca} {m.modelo}{m.patente ? ` — ${m.patente}` : ""}{" "}
                        {m.precioAlquilerMensual
                          ? `(${formatMoney(Number(m.precioAlquilerMensual))}/mes)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.motoId && (
              <p className="text-sm text-red-500">{errors.motoId.message}</p>
            )}
            {selectedMoto && (
              <p className="text-xs text-muted-foreground">
                Precio mensual: {formatMoney(Number(selectedMoto.precioAlquilerMensual))} ·{" "}
                {selectedMoto.cilindrada}cc
              </p>
            )}
          </div>

          {/* Parámetros */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frecuencia de pago</Label>
              <Controller
                name="frecuenciaPago"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Duración (meses)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                {...register("duracionMeses", { valueAsNumber: true })}
              />
              {errors.duracionMeses && (
                <p className="text-sm text-red-500">{errors.duracionMeses.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Depósito ($)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                {...register("deposito", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <Controller
                name="tieneOpcionCompra"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2 pb-2">
                    <Checkbox
                      id="tieneOpcionCompra"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="tieneOpcionCompra" className="cursor-pointer">
                      Opción a compra
                    </Label>
                  </div>
                )}
              />
            </div>
          </div>

          {tieneOpcionCompra && (
            <div className="space-y-2">
              <Label>Precio de compra ($)</Label>
              <Input
                type="number"
                min={0}
                step={10000}
                placeholder="Precio si el cliente ejerce la opción"
                {...register("precioCompra", { valueAsNumber: true })}
              />
            </div>
          )}

          {/* Preview */}
          {(preview || loadingPreview) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold">Preview del contrato</p>
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculando...
                </div>
              ) : preview ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Monto por período:</span>
                  <span className="font-medium">{formatMoney(preview.montoPeriodo)}</span>
                  <span className="text-muted-foreground">Total cuotas:</span>
                  <span className="font-medium">{preview.totalCuotas}</span>
                  <span className="text-muted-foreground">Total alquiler:</span>
                  <span className="font-medium">{formatMoney(preview.totalAlquiler)}</span>
                  <span className="text-muted-foreground">Depósito:</span>
                  <span className="font-medium">{formatMoney(preview.deposito)}</span>
                  <span className="text-muted-foreground font-semibold border-t pt-1">
                    Total con depósito:
                  </span>
                  <span className="font-bold border-t pt-1">{formatMoney(preview.totalConDeposito)}</span>
                  {preview.tieneOpcionCompra && preview.precioCompra !== null && (
                    <>
                      <span className="text-muted-foreground">Precio compra:</span>
                      <span className="font-medium">{formatMoney(preview.precioCompra)}</span>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input {...register("notas")} placeholder="Observaciones del contrato..." />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Contrato (BORRADOR)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
