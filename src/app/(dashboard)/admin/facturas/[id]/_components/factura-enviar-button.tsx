"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FacturaEnviarButtonProps {
  facturaId: string;
}

export function FacturaEnviarButton({ facturaId }: FacturaEnviarButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnviar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/${facturaId}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });

      const json = await res.json() as { data?: { email: string }; error?: string };

      if (!res.ok) {
        toast.error(json.error ?? "Error enviando email");
        return;
      }

      toast.success(`Factura enviada a ${json.data?.email ?? email}`);
      setOpen(false);
    } catch {
      toast.error("Error de red al enviar email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="mr-2 h-4 w-4" />
        Enviar Email
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Factura por Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (dejar vacío para usar el del cliente)</Label>
              <Input
                id="email"
                type="email"
                placeholder="override@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
