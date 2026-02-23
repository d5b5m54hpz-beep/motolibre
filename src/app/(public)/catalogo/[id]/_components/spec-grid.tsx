import {
  Gauge,
  Zap,
  Cog,
  Power,
  Disc,
  Fuel,
  Weight,
  Route,
} from "lucide-react";
import type { ReactNode } from "react";

interface Specs {
  cilindrada: string | null;
  potencia: string | null;
  tipoMotor: string | null;
  arranque: string | null;
  frenos: string | null;
  capacidadTanque: string | null;
  peso: string | null;
  km: string;
}

interface SpecItem {
  icon: ReactNode;
  label: string;
  value: string;
}

const specConfig: { key: keyof Specs; icon: ReactNode; label: string }[] = [
  { key: "cilindrada", icon: <Gauge className="h-4 w-4" />, label: "Cilindrada" },
  { key: "potencia", icon: <Zap className="h-4 w-4" />, label: "Potencia" },
  { key: "tipoMotor", icon: <Cog className="h-4 w-4" />, label: "Motor" },
  { key: "arranque", icon: <Power className="h-4 w-4" />, label: "Arranque" },
  { key: "frenos", icon: <Disc className="h-4 w-4" />, label: "Frenos" },
  { key: "capacidadTanque", icon: <Fuel className="h-4 w-4" />, label: "Tanque" },
  { key: "peso", icon: <Weight className="h-4 w-4" />, label: "Peso" },
  { key: "km", icon: <Route className="h-4 w-4" />, label: "Kilometraje" },
];

export function SpecGrid({ specs }: { specs: Specs }) {
  const items: SpecItem[] = specConfig
    .filter((s) => specs[s.key])
    .map((s) => ({
      icon: s.icon,
      label: s.label,
      value: specs[s.key]!,
    }));

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg text-t-primary">
        Especificaciones
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl bg-bg-card/80 border border-border space-y-2"
          >
            <div className="flex items-center gap-2 text-t-tertiary">
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <p className="font-display font-bold text-sm text-t-primary">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
