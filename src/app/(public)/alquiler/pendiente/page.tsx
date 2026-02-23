import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pago pendiente | MotoLibre",
};

export default function PendientePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-yellow-500/10 p-4">
          <Clock className="h-16 w-16 text-yellow-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-t-primary">
          Tu pago está siendo procesado
        </h1>
        <p className="text-t-secondary">
          Te notificamos por email cuando esté confirmado. Esto puede demorar
          algunas horas.
        </p>
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
