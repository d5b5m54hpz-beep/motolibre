"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ImageOff,
  Trash2,
} from "lucide-react";
import { getTransformedUrl } from "@/lib/supabase-url";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  emptyMessage?: string;
  onDelete?: (index: number) => void;
}

function Thumbnail({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted text-muted-foreground/50",
          className
        )}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export function PhotoGallery({
  photos,
  emptyMessage = "Sin fotos",
  onDelete,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxError, setLightboxError] = useState(false);

  const goNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
  }, [selectedIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIndex, goNext, goPrev]);

  // Reset lightbox error when changing photo
  useEffect(() => {
    setLightboxError(false);
  }, [selectedIndex]);

  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative group">
            <button
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "relative aspect-square w-full rounded-lg overflow-hidden border bg-muted/50",
                "hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
              )}
            >
              <Thumbnail
                src={getTransformedUrl(url, {
                  width: 200,
                  height: 200,
                  quality: 75,
                })}
                alt={`Foto ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(i);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white/80 hover:bg-destructive hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl p-0 gap-0 bg-black/95 border-none overflow-hidden">
          <DialogTitle className="sr-only">Vista de foto</DialogTitle>
          {selectedIndex !== null && (
            <>
              <div className="relative flex items-center justify-center min-h-[60vh] max-h-[85vh]">
                {lightboxError ? (
                  <div className="flex flex-col items-center justify-center text-white/40 gap-2">
                    <ImageOff className="h-12 w-12" />
                    <p className="text-sm">No se pudo cargar la imagen</p>
                    <a
                      href={photos[selectedIndex]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      Abrir URL original
                    </a>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getTransformedUrl(photos[selectedIndex]!, {
                      width: 1200,
                      quality: 85,
                    })}
                    alt={`Foto ${selectedIndex + 1}`}
                    className="max-w-full max-h-[85vh] object-contain"
                    onError={() => setLightboxError(true)}
                  />
                )}

                {photos.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={goPrev}
                      disabled={selectedIndex === 0}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={goNext}
                      disabled={selectedIndex === photos.length - 1}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              <div className="text-center py-2 text-xs text-white/60 font-mono">
                {selectedIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
