"use client";

import { useState } from "react";
import Image from "next/image";
import { Bike, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MotoData {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  foto: string | null;
}

interface PlanData {
  nombre: string;
  codigo: string;
  frecuencia: string;
  duracionMeses: number | null;
  precioFinal: number;
  incluyeTransferencia: boolean;
}

interface PreviewData {
  montoPeriodo: number;
  totalCuotas: number;
  frecuencia: string;
  duracionMeses: number;
  totalAlquiler: number;
  montoPrimerPago: number;
}

export function WizardSummary({
  moto,
  plan,
  preview,
  step,
}: {
  moto: MotoData | null;
  plan: PlanData | undefined;
  preview: PreviewData | null;
  step: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!moto) return null;

  const freq = plan?.frecuencia === "SEMANAL" ? "semana" : "mes";

  const content = (
    <div className="space-y-4">
      {/* Moto photo + name */}
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-bg-input shrink-0">
          {moto.foto ? (
            <Image
              src={moto.foto}
              alt={`${moto.marca} ${moto.modelo}`}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Bike className="h-6 w-6 text-t-tertiary/30" />
            </div>
          )}
        </div>
        <div>
          <p className="font-display font-bold text-t-primary text-sm">
            {moto.marca} {moto.modelo}
          </p>
          <p className="text-xs text-t-secondary">{moto.anio}</p>
        </div>
      </div>

      {/* Plan details (visible from step 1+) */}
      {step >= 1 && plan && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-t-secondary">Plan</span>
              <span className="text-t-primary font-medium">{plan.nombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t-secondary">Cuota</span>
              <span className="font-display font-extrabold text-[var(--ds-accent)]">
                {formatMoney(plan.precioFinal)}/{freq}
              </span>
            </div>
            {preview && (
              <div className="flex justify-between text-sm">
                <span className="text-t-secondary">Cuotas</span>
                <span className="text-t-primary">{preview.totalCuotas}</span>
              </div>
            )}
            {plan.incluyeTransferencia && (
              <p className="text-xs text-green-500 font-medium">
                Transferencia incluida
              </p>
            )}
          </div>
        </>
      )}

      {/* Payment info (visible from step 2+) */}
      {step >= 2 && plan && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-1">
            <p className="text-xs text-t-tertiary">Primer pago</p>
            <p className="font-display font-extrabold text-xl text-t-primary">
              {formatMoney(plan.precioFinal)}
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: sticky card */}
      <div className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-border bg-bg-card/80 p-5">
          <p className="text-xs text-t-tertiary uppercase tracking-wider mb-4">
            Resumen
          </p>
          {content}
        </div>
      </div>

      {/* Mobile: collapsible banner */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-bg-card border-t border-border shadow-lg">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <p className="font-display font-bold text-sm text-t-primary">
                {moto.marca} {moto.modelo}
              </p>
              {plan && (
                <span className="font-display font-extrabold text-[var(--ds-accent)]">
                  {formatMoney(plan.precioFinal)}/{freq}
                </span>
              )}
            </div>
            {mobileOpen ? (
              <ChevronDown className="h-4 w-4 text-t-tertiary" />
            ) : (
              <ChevronUp className="h-4 w-4 text-t-tertiary" />
            )}
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all",
              mobileOpen ? "max-h-80 px-4 pb-4" : "max-h-0"
            )}
          >
            {content}
          </div>
        </div>
      </div>
    </>
  );
}
