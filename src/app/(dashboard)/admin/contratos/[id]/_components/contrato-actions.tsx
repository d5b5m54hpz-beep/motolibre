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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, XCircle, CheckCircle, ShoppingCart } from "lucide-react";

interface ContratoActionsProps {
  contratoId: string;
  estado: string;
  tieneOpcionCompra: boolean;
  precioCompraDefault?: number | null;
}

export function ContratoActions({
  contratoId,
  estado,
  tieneOpcionCompra,
  precioCompraDefault,
}: ContratoActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancelar dialog state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [penalidad, setPenalidad] = useState("");

  // Ejercer compra dialog state
  const [compraOpen, setCompraOpen] = useState(false);
  const [precioCompra, setPrecioCompra] = useState(
    precioCompraDefault ? String(precioCompraDefault) : ""
  );

  async function callAction(action: string, body?: Record<string, unknown>) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al ejecutar acción");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {estado === "BORRADOR" && (
        <Button
          onClick={() => callAction("activar")}
          disabled={loading === "activar"}
          className="bg-positive hover:bg-positive/90"
        >
          {loading === "activar" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Activar Contrato
        </Button>
      )}

      {estado === "ACTIVO" && (
        <>
          <Button
            variant="outline"
            onClick={() => callAction("finalizar")}
            disabled={loading === "finalizar"}
          >
            {loading === "finalizar" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Finalizar
          </Button>

          {tieneOpcionCompra && (
            <Dialog open={compraOpen} onOpenChange={setCompraOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Ejercer Opción Compra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ejercer Opción de Compra</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Precio de venta ($)</Label>
                    <Input
                      type="number"
                      value={precioCompra}
                      onChange={(e) => setPrecioCompra(e.target.value)}
                      placeholder="Precio final de compra"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCompraOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={async () => {
                        await callAction("ejercer-compra", {
                          precioCompra: Number(precioCompra),
                        });
                        setCompraOpen(false);
                      }}
                      disabled={!precioCompra || loading === "ejercer-compra"}
                    >
                      {loading === "ejercer-compra" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirmar Compra
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {(estado === "ACTIVO" || estado === "BORRADOR") && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Contrato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo de cancelación *</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describe el motivo..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Penalidad ($) — opcional</Label>
                <Input
                  type="number"
                  value={penalidad}
                  onChange={(e) => setPenalidad(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCancelOpen(false)}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await callAction("cancelar", {
                      motivoCancelacion: motivo,
                      penalidad: penalidad ? Number(penalidad) : undefined,
                    });
                    setCancelOpen(false);
                  }}
                  disabled={!motivo || loading === "cancelar"}
                >
                  {loading === "cancelar" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Confirmar Cancelación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {error && <p className="w-full text-sm text-negative mt-1">{error}</p>}
    </div>
  );
}
