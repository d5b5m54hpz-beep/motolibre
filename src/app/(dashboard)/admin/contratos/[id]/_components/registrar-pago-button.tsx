"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface RegistrarPagoButtonProps {
  contratoId: string;
  cuotaId: string;
  cuotaNumero: number;
  montoCuota: number;
}

const METODOS = [
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "AJUSTE", label: "Ajuste contable" },
  { value: "OTRO", label: "Otro" },
];

export function RegistrarPagoButton({
  contratoId,
  cuotaId,
  cuotaNumero,
  montoCuota,
}: RegistrarPagoButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    monto: String(montoCuota),
    metodoPago: "TRANSFERENCIA",
    referenciaPago: "",
    notas: "",
    fecha: new Date().toISOString().split("T")[0],
  });

  async function handleSubmit() {
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/contratos/${contratoId}/cuotas/${cuotaId}/registrar-pago`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monto,
            metodoPago: form.metodoPago,
            referenciaPago: form.referenciaPago || null,
            notas: form.notas || null,
            fecha: form.fecha,
          }),
        }
      );

      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Error al registrar");

      toast.success(`Pago de la cuota #${cuotaNumero} registrado correctamente`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        <Banknote className="h-3 w-3 mr-1" />
        Registrar pago
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago — Cuota #{cuotaNumero}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Método de pago</Label>
                <Select
                  value={form.metodoPago}
                  onValueChange={(v) => setForm({ ...form, metodoPago: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                placeholder={`Monto cuota: $${montoCuota.toLocaleString("es-AR")}`}
              />
              {parseFloat(form.monto) < montoCuota && parseFloat(form.monto) > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Pago parcial — la cuota quedará en estado PARCIAL
                </p>
              )}
            </div>

            <div>
              <Label>Referencia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                value={form.referenciaPago}
                onChange={(e) => setForm({ ...form, referenciaPago: e.target.value })}
                placeholder="Nro. operación, CBU, nro. cheque..."
              />
            </div>

            <div>
              <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Observaciones del pago..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Banknote className="h-4 w-4 mr-2" />
              )}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
