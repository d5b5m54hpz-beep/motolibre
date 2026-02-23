import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Error en el pago | MotoLibre",
};

export default function ErrorPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-red-500/10 p-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-t-primary">
          Hubo un problema con el pago
        </h1>
        <p className="text-t-secondary">
          Tu solicitud está guardada. Podés reintentar el pago desde tu cuenta.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild size="lg" className="flex-1">
          <Link href="/dashboard">Reintentar desde Mi Cuenta</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/catalogo">Volver al catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
