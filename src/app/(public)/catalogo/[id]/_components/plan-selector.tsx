"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, Shield, Wrench, CheckCircle } from "lucide-react";

interface Plan {
  planId: string;
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

export function PlanSelector({ planes }: { planes: Plan[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg text-t-primary">
        Elegí tu plan
      </h2>

      <div className="space-y-3">
        {planes.map((plan, i) => {
          const isSelected = i === selectedIdx;
          const freq = plan.frecuencia === "SEMANAL" ? "semana" : "mes";

          return (
            <button
              key={plan.planId}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-[var(--ds-accent)] bg-[var(--ds-accent)]/5"
                  : "border-border bg-bg-card/80 hover:border-t-tertiary"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-t-primary">
                      {plan.nombre}
                    </span>
                    {plan.descuento > 0 && (
                      <DSBadge variant="positive">-{plan.descuento}%</DSBadge>
                    )}
                    {plan.incluyeTransferencia && (
                      <DSBadge variant="info">Incluye transferencia</DSBadge>
                    )}
                  </div>
                  {plan.duracionMeses && (
                    <p className="text-xs text-t-tertiary">
                      {plan.duracionMeses} meses de contrato
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {plan.descuento > 0 && (
                    <span className="text-xs text-t-tertiary line-through block">
                      {formatMoney(plan.precioBase)}
                    </span>
                  )}
                  <span className="font-display font-extrabold text-xl text-[var(--ds-accent)]">
                    {formatMoney(plan.precioFinal)}
                  </span>
                  <span className="text-xs text-t-secondary">/{freq}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <Button className="w-full" size="lg" asChild>
        <Link href="/registro">
          Solicitar esta moto
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <span className="flex items-center gap-1.5 text-xs text-t-tertiary">
          <Shield className="h-3.5 w-3.5" /> Seguro incluido
        </span>
        <span className="flex items-center gap-1.5 text-xs text-t-tertiary">
          <Wrench className="h-3.5 w-3.5" /> Service incluido
        </span>
        <span className="flex items-center gap-1.5 text-xs text-t-tertiary">
          <CheckCircle className="h-3.5 w-3.5" /> Sin depósito
        </span>
      </div>
    </div>
  );
}
