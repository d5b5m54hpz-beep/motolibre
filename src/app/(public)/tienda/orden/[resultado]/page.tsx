"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

const RESULTADOS = {
  exito: {
    icon: CheckCircle2,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    title: "\u00a1Compra exitosa!",
    description:
      "Tu pedido fue procesado. Te notificaremos cuando este listo.",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    title: "Hubo un problema",
    description:
      "El pago no pudo procesarse. Podes intentar de nuevo.",
  },
  pendiente: {
    icon: Clock,
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-500/10",
    title: "Pago pendiente",
    description:
      "Tu pago esta siendo procesado. Te notificaremos cuando se confirme.",
  },
} as const;

function OrdenResultadoContent() {
  const params = useParams<{ resultado: string }>();
  const searchParams = useSearchParams();
  const resultado = params.resultado as keyof typeof RESULTADOS;

  const config = RESULTADOS[resultado];
  const externalReference = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");

  if (!config) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <p className="text-t-secondary">Pagina no encontrada</p>
        <Button asChild>
          <Link href="/tienda">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className={`rounded-full ${config.iconBg} p-4`}>
          <Icon className={`h-16 w-16 ${config.iconColor}`} />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-t-primary">
          {config.title}
        </h1>
        <p className="text-t-secondary">{config.description}</p>
      </div>

      {(externalReference || paymentId) && (
        <div className="rounded-xl border border-border bg-bg-card/80 p-6 text-left space-y-2">
          {externalReference && (
            <p className="text-sm text-t-secondary">
              <span className="font-medium text-t-primary">Referencia: </span>
              {externalReference}
            </p>
          )}
          {paymentId && (
            <p className="text-sm text-t-secondary">
              <span className="font-medium text-t-primary">
                ID de pago:{" "}
              </span>
              {paymentId}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild size="lg" className="flex-1">
          <Link href="/tienda">Volver a la tienda</Link>
        </Button>
        {resultado === "error" && (
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/tienda/carrito">Reintentar</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function OrdenResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-t-secondary">Cargando...</p>
        </div>
      }
    >
      <OrdenResultadoContent />
    </Suspense>
  );
}
