import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pago exitoso | MotoLibre",
};

export default function ExitoPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-500/10 p-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-t-primary">
          ¡Tu moto te espera!
        </h1>
        <p className="text-t-secondary">
          Tu pago fue procesado exitosamente. Ya estamos preparando tu moto.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-card/80 p-6 text-left space-y-3">
        <h3 className="font-display font-bold text-t-primary">Próximos pasos</h3>
        <ul className="space-y-2 text-sm text-t-secondary">
          <li className="flex items-start gap-2">
            <span className="text-[var(--ds-accent)] font-bold">1.</span>
            Te contactamos en las próximas 24hs para coordinar la entrega
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--ds-accent)] font-bold">2.</span>
            Revisamos la documentación y preparamos tu moto
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--ds-accent)] font-bold">3.</span>
            Coordinamos día, hora y lugar de entrega
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild size="lg" className="flex-1">
          <Link href="/dashboard">Ir a Mi Cuenta</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
