import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

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

export function StepPlan({
  planes,
  selectedCodigo,
  motoNombre,
  onSelect,
  onPrev,
  onNext,
}: {
  planes: PlanData[];
  selectedCodigo: string;
  motoNombre: string;
  onSelect: (codigo: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const selected = planes.find((p) => p.codigo === selectedCodigo) ?? planes[0];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-extrabold text-t-primary">
          Elegí tu plan para la {motoNombre}
        </h2>
        <p className="text-sm text-t-secondary">
          Seleccioná la frecuencia de pago que más te convenga
        </p>
      </div>

      <div className="space-y-4">
        {planes.map((plan) => {
          const isSelected = plan.codigo === selected?.codigo;
          const freq = plan.frecuencia === "SEMANAL" ? "semana" : "mes";
          const isLTO = plan.incluyeTransferencia;

          return (
            <button
              key={plan.id}
              onClick={() => onSelect(plan.codigo)}
              className={cn(
                "w-full text-left p-5 rounded-xl border-2 transition-all relative",
                isSelected
                  ? "border-[var(--ds-accent)] bg-[var(--ds-accent)]/5"
                  : "border-border bg-bg-card/80 hover:border-t-tertiary",
                isLTO && "ring-1 ring-[var(--ds-accent)]/20"
              )}
            >
              {isLTO && (
                <DSBadge
                  variant="warning"
                  className="absolute -top-2.5 right-4 gap-1"
                >
                  <Star className="h-3 w-3" /> POPULAR
                </DSBadge>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-lg text-t-primary">
                      {plan.nombre}
                    </span>
                    {plan.descuento > 0 && (
                      <DSBadge variant="positive">-{plan.descuento}%</DSBadge>
                    )}
                    {plan.incluyeTransferencia && (
                      <DSBadge variant="info">Incluye transferencia</DSBadge>
                    )}
                  </div>

                  <ul className="text-sm text-t-secondary space-y-1">
                    {plan.frecuencia === "SEMANAL" && (
                      <>
                        <li>· Flexible</li>
                        <li>· Devolvé cuando quieras</li>
                      </>
                    )}
                    {plan.frecuencia === "MENSUAL" && !isLTO && (
                      <>
                        <li>· Ahorrá {plan.descuento}%</li>
                        <li>· Pago mensual</li>
                        <li>· Más económico</li>
                      </>
                    )}
                    {isLTO && (
                      <>
                        <li>· {plan.duracionMeses} cuotas y la moto es tuya</li>
                        <li>· Transferencia incluida</li>
                        <li>· Mayor descuento</li>
                      </>
                    )}
                  </ul>

                  {plan.duracionMeses && (
                    <p className="text-xs text-t-tertiary">
                      Total del contrato:{" "}
                      {formatMoney(plan.precioFinal * (plan.duracionMeses ?? 1))}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {plan.descuento > 0 && (
                    <span className="text-xs text-t-tertiary line-through block">
                      {formatMoney(plan.precioBase)}
                    </span>
                  )}
                  <span className="font-display font-extrabold text-2xl text-[var(--ds-accent)]">
                    {formatMoney(plan.precioFinal)}
                  </span>
                  <span className="text-sm text-t-secondary">/{freq}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" size="lg" onClick={onPrev} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button size="lg" onClick={onNext} className="flex-1">
          Siguiente
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
