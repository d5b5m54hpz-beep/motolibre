import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Moto" },
  { label: "Plan" },
  { label: "Datos" },
  { label: "Contrato" },
  { label: "Pago" },
];

export function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-bold transition-all",
                  i < currentStep
                    ? "bg-[var(--ds-accent)] border-[var(--ds-accent)] text-white"
                    : i === currentStep
                      ? "border-[var(--ds-accent)] text-[var(--ds-accent)] shadow-[0_0_12px_var(--accent-glow)]"
                      : "border-border text-t-tertiary"
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  i <= currentStep ? "text-t-primary" : "text-t-tertiary"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-2 mb-6",
                  i < currentStep ? "bg-[var(--ds-accent)]" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="sm:hidden text-center">
        <p className="text-sm text-t-secondary">
          Paso {currentStep + 1} de {STEPS.length} —{" "}
          <span className="font-bold text-t-primary">{STEPS[currentStep]?.label}</span>
        </p>
      </div>
    </>
  );
}
