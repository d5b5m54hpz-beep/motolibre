"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, Truck } from "lucide-react";

interface SolicitudActionsProps {
  solicitudId: string;
  estado: string;
}

export function SolicitudActions({ solicitudId, estado }: SolicitudActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  if (estado === "ASIGNADA") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Dialog open={entregaOpen} onOpenChange={setEntregaOpen}>
          <DialogTrigger asChild>
            <Button className="bg-positive hover:bg-positive/90">
              <Truck className="mr-2 h-4 w-4" />
              Registrar Entrega
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Entrega de Moto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Al confirmar, se creará el contrato automáticamente con cuotas y se programará la agenda de mantenimientos. Esta acción no puede deshacerse.
              </p>
              {error && <p className="text-sm text-negative">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEntregaOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-positive hover:bg-positive/90"
                  disabled={loading === "entregar"}
                  onClick={async () => {
                    setLoading("entregar");
                    setError(null);
                    try {
                      const res = await fetch(`/api/solicitudes/${solicitudId}/entregar`, {
                        method: "POST",
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        setError(json.error ?? "Error al registrar entrega");
                        return;
                      }
                      setEntregaOpen(false);
                      router.refresh();
                    } finally {
                      setLoading(null);
                    }
                  }}
                >
                  {loading === "entregar" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Entrega
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (estado !== "PAGADA" && estado !== "EN_EVALUACION") {
    return null;
  }

  async function aprobar() {
    setLoading("aprobar");
    setError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}/aprobar`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al aprobar");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function rechazar() {
    setLoading("rechazar");
    setError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoRechazo: motivo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al rechazar");
        return;
      }
      setRejectOpen(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={aprobar}
        disabled={loading === "aprobar"}
        className="bg-positive hover:bg-positive/90"
      >
        {loading === "aprobar" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Aprobar → Lista de Espera
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <XCircle className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo del rechazo *</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica por qué se rechaza la solicitud..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={rechazar}
                disabled={!motivo || loading === "rechazar"}
              >
                {loading === "rechazar" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && <p className="w-full text-sm text-negative">{error}</p>}
    </div>
  );
}
