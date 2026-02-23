"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ReintentarCAEButton({ facturaId }: { facturaId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReintentar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/${facturaId}/reintentar-cae`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al reintentar CAE");
        return;
      }

      if (data.data.afipResultado === "A") {
        toast.success("CAE obtenido exitosamente");
      } else if (data.data.afipResultado === "STUB") {
        toast.info("CAE stub generado (sin certificado AFIP)");
      } else {
        toast.error(`AFIP rechazó: ${data.data.afipObservaciones || "Sin detalle"}`);
      }

      router.refresh();
    } catch {
      toast.error("Error de conexión al reintentar CAE");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleReintentar} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Reintentar CAE
    </Button>
  );
}
