"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

function ResultadoContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? searchParams.get("collection_status") ?? "pending";

  if (status === "approved") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500/10 p-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-extrabold text-t-primary">
            ¡Pago confirmado!
          </h2>
          <p className="text-t-secondary">
            Tu cuota está al día. Gracias por tu pago.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/mi-cuenta/pagos">Volver a mis pagos</Link>
        </Button>
      </div>
    );
  }

  if (status === "rejected" || status === "failure") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-extrabold text-t-primary">
            El pago no pudo procesarse
          </h2>
          <p className="text-t-secondary">
            Podés intentar de nuevo desde tus pagos.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/mi-cuenta/pagos">Reintentar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-yellow-500/10 p-4">
          <Clock className="h-16 w-16 text-yellow-500" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-extrabold text-t-primary">
          Tu pago está siendo procesado
        </h2>
        <p className="text-t-secondary">
          Te notificamos por email cuando esté confirmado.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/mi-cuenta/pagos">Volver a mis pagos</Link>
      </Button>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Clock className="h-8 w-8 animate-spin text-t-tertiary" />
        </div>
      }
    >
      <ResultadoContent />
    </Suspense>
  );
}
