"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Loader2, QrCode } from "lucide-react";

export function QRGenerator({ motoId }: { motoId: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function fetchQR() {
    if (svg) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/motos/${motoId}/qr`);
      const json = await res.json();
      if (res.ok) {
        setSvg(json.data.svgString);
        setUrl(json.data.url);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function downloadSVG() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `moto-${motoId}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={fetchQR}>
          <QrCode className="h-4 w-4 mr-2" />
          QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR de la moto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-t-tertiary" />
            </div>
          ) : svg ? (
            <>
              <div
                className="flex justify-center bg-white rounded-xl p-4"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="text-xs text-t-tertiary text-center break-all">
                {url}
              </p>
              <Button onClick={downloadSVG} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Descargar SVG
              </Button>
            </>
          ) : (
            <p className="text-sm text-t-secondary text-center py-4">
              Error al generar QR
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
