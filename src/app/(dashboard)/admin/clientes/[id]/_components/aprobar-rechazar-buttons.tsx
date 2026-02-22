"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";

export function AprobarRechazarButtons({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprobar" | "rechazar" | null>(null);
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function handleAprobar() {
    setLoading("aprobar");
    try {
      const res = await fetch(`/api/clientes/${clienteId}/aprobar`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al aprobar");
        return;
      }
      toast.success("Cliente aprobado correctamente");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  async function handleRechazar() {
    if (!motivo.trim()) {
      toast.error("El motivo es requerido");
      return;
    }
    setLoading("rechazar");
    try {
      const res = await fetch(`/api/clientes/${clienteId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoRechazo: motivo }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al rechazar");
        return;
      }
      toast.success("Cliente rechazado");
      setRechazarOpen(false);
      setMotivo("");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-positive text-positive hover:bg-positive/10"
        onClick={handleAprobar}
        disabled={loading !== null}
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        {loading === "aprobar" ? "Aprobando..." : "Aprobar"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="border-negative text-negative hover:bg-negative/10"
        onClick={() => setRechazarOpen(true)}
        disabled={loading !== null}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Rechazar
      </Button>

      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-t-secondary">
              Ingresá el motivo del rechazo. El cliente no será notificado automáticamente.
            </p>
            <Textarea
              placeholder="Motivo del rechazo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={loading === "rechazar"}
            >
              {loading === "rechazar" ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
