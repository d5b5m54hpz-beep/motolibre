"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { formatMoney } from "@/lib/format";
import {
  ChevronLeft,
  CreditCard,
  FileText,
  Loader2,
  Shield,
  Wrench,
  HeadphonesIcon,
  XCircle,
} from "lucide-react";

interface MotoData {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  km: number;
  color: string | null;
  tipo: string;
  foto: string | null;
  condicion: string;
}

interface PlanData {
  id: string;
  nombre: string;
  codigo: string;
  frecuencia: string;
  duracionMeses: number | null;
  descuento: number;
  incluyeTransferencia: boolean;
  precioBase: number;
  precioFinal: number;
  moneda: string;
}

interface PreviewData {
  montoPeriodo: number;
  totalCuotas: number;
  frecuencia: string;
  duracionMeses: number;
  totalAlquiler: number;
  montoPrimerPago: number;
}

export function StepPreview({
  moto,
  plan,
  preview,
  solicitudId,
  onConfirmed,
  onPrev,
}: {
  moto: MotoData;
  plan: PlanData;
  preview: PreviewData | null;
  solicitudId: string;
  onConfirmed: (pagoUrl: string) => void;
  onPrev: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freq = plan.frecuencia === "SEMANAL" ? "semana" : "mes";
  const duracion = plan.duracionMeses ?? 12;

  async function handleConfirm() {
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/public/alquiler/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitudId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al confirmar");
        return;
      }

      if (json.data.pagoUrl) {
        onConfirmed(json.data.pagoUrl);
      } else {
        setError(json.data.error ?? "No se pudo generar el link de pago");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-extrabold text-t-primary">
          Revisá tu contrato
        </h2>
        <p className="text-sm text-t-secondary">
          Confirmá los datos antes de proceder al pago
        </p>
      </div>

      {/* Contract preview card */}
      <div className="rounded-xl border-2 border-border bg-bg-card/80 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--ds-accent)]" />
          <span className="font-display font-bold text-t-primary">
            Resumen del contrato
          </span>
        </div>

        <div className="p-5 space-y-4 font-mono text-sm">
          {/* Moto */}
          <div className="space-y-1">
            <p className="text-xs text-t-tertiary uppercase tracking-wider">Moto</p>
            <p className="text-t-primary font-semibold">
              {moto.marca} {moto.modelo} ({moto.anio})
            </p>
            <p className="text-t-secondary">
              {moto.cilindrada ? `${moto.cilindrada}cc · ` : ""}
              {moto.km.toLocaleString("es-AR")} km · {moto.condicion}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Plan */}
          <div className="space-y-1">
            <p className="text-xs text-t-tertiary uppercase tracking-wider">Plan</p>
            <div className="flex items-center gap-2">
              <p className="text-t-primary font-semibold">{plan.nombre}</p>
              {plan.incluyeTransferencia && (
                <DSBadge variant="info">Lease-to-own</DSBadge>
              )}
            </div>
            <p className="text-t-secondary">
              Frecuencia: {plan.frecuencia === "SEMANAL" ? "Semanal" : "Mensual"}
              {plan.duracionMeses ? ` · ${plan.duracionMeses} meses` : ""}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Payment */}
          <div className="space-y-1">
            <p className="text-xs text-t-tertiary uppercase tracking-wider">Pago</p>
            <p className="text-t-primary font-semibold">
              {formatMoney(plan.precioFinal)}/{freq}
            </p>
            {preview && (
              <p className="text-t-secondary">
                {preview.totalCuotas} cuotas · Total{" "}
                {formatMoney(plan.precioFinal * (plan.duracionMeses
                  ? (plan.frecuencia === "SEMANAL"
                    ? Math.ceil(plan.duracionMeses * 4.33)
                    : plan.duracionMeses)
                  : preview.totalCuotas))}
              </p>
            )}
            <p className="text-t-secondary">
              Primer vencimiento: {new Date(Date.now() + 7 * 86400000).toLocaleDateString("es-AR")}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Included */}
          <div className="space-y-2">
            <p className="text-xs text-t-tertiary uppercase tracking-wider">
              Incluye
            </p>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-t-secondary">
                <Shield className="h-4 w-4 text-green-500" />
                Seguro contra terceros
              </div>
              <div className="flex items-center gap-2 text-t-secondary">
                <Wrench className="h-4 w-4 text-green-500" />
                Service programado
              </div>
              <div className="flex items-center gap-2 text-t-secondary">
                <HeadphonesIcon className="h-4 w-4 text-green-500" />
                Asistencia mecánica 24/7
              </div>
              {plan.incluyeTransferencia && (
                <div className="flex items-center gap-2 text-t-secondary">
                  <FileText className="h-4 w-4 text-green-500" />
                  Transferencia incluida al final
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Not included */}
          <div className="space-y-2">
            <p className="text-xs text-t-tertiary uppercase tracking-wider">
              No incluye
            </p>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-t-secondary">
                <XCircle className="h-4 w-4 text-t-tertiary" />
                Combustible
              </div>
              <div className="flex items-center gap-2 text-t-secondary">
                <XCircle className="h-4 w-4 text-t-tertiary" />
                Patente
              </div>
              <div className="flex items-center gap-2 text-t-secondary">
                <XCircle className="h-4 w-4 text-t-tertiary" />
                Multas de tránsito
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MP redirect notice */}
      <div className="rounded-lg bg-[var(--ds-accent)]/5 border border-[var(--ds-accent)]/20 p-4 flex items-start gap-3">
        <CreditCard className="h-5 w-5 text-[var(--ds-accent)] shrink-0 mt-0.5" />
        <p className="text-sm text-t-secondary">
          Al confirmar, serás redirigido a{" "}
          <span className="font-semibold text-t-primary">MercadoPago</span> para
          realizar el primer pago de{" "}
          <span className="font-semibold text-[var(--ds-accent)]">
            {formatMoney(plan.precioFinal)}
          </span>
          .
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={onPrev}
          className="flex-1"
          disabled={confirming}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button
          size="lg"
          onClick={handleConfirm}
          className="flex-1"
          disabled={confirming}
        >
          {confirming ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CreditCard className="h-4 w-4 mr-2" />
          )}
          Confirmar y pagar
        </Button>
      </div>
    </div>
  );
}
