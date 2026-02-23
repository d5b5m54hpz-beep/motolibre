"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  const isChunkError =
    error.message?.includes("ChunkLoadError") ||
    error.message?.includes("Loading chunk") ||
    error.message?.includes("Failed to fetch dynamically imported module");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-negative/10 border border-negative/20">
        <AlertTriangle className="h-8 w-8 text-negative" />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h2 className="text-lg font-display font-bold text-t-primary">
          {isChunkError ? "Nueva versión disponible" : "Algo salió mal"}
        </h2>
        <p className="text-sm text-t-tertiary">
          {isChunkError
            ? "Se desplegó una nueva versión de MotoLibre. Recargá la página para continuar."
            : "Ocurrió un error inesperado. Intentá recargar la página."}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar página
        </Button>
        {!isChunkError && (
          <Button variant="outline" onClick={reset}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
