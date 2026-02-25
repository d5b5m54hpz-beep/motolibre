"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

interface ApplyImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marca: string;
  modelo: string;
  motoId: string;
  imageUrl: string;
}

export function ApplyImageDialog({
  open,
  onOpenChange,
  marca,
  modelo,
  motoId,
  imageUrl,
}: ApplyImageDialogProps) {
  const router = useRouter();
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMatchCount(null);

    fetch(
      `/api/motos/batch-image?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}&excludeId=${motoId}`
    )
      .then((r) => r.json())
      .then((res) => setMatchCount(res.data?.count ?? 0))
      .catch(() => setMatchCount(0));
  }, [open, marca, modelo, motoId]);

  async function handleApplyAll() {
    setIsApplying(true);
    try {
      const res = await fetch("/api/motos/batch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca,
          modelo,
          imagenUrl: imageUrl,
          excludeMotoId: motoId,
        }),
      });
      if (!res.ok) throw new Error("Error al aplicar");
      const { data } = await res.json();
      toast.success(`Imagen aplicada a ${data.count} moto(s)`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error al aplicar imagen a las demás motos");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar a todas</DialogTitle>
          <DialogDescription>
            {marca} {modelo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {matchCount === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando motos del mismo modelo...
            </div>
          ) : matchCount === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              No hay otras motos de este modelo. La imagen ya fue guardada.
            </div>
          ) : (
            <p className="text-sm">
              Hay{" "}
              <span className="font-semibold">
                {matchCount} {marca} {modelo}
              </span>{" "}
              más en la flota. Aplicar la misma imagen a todas?
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Solo esta moto
          </Button>
          {matchCount !== null && matchCount > 0 && (
            <Button onClick={handleApplyAll} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar a todas (${matchCount})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
