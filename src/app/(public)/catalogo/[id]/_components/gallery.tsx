"use client";

import { useState } from "react";
import Image from "next/image";
import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryProps {
  fotos: string[];
  alt: string;
}

export function Gallery({ fotos, alt }: GalleryProps) {
  const [selected, setSelected] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-bg-card border border-border flex items-center justify-center">
        <Bike className="h-24 w-24 text-t-tertiary/30" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-bg-input border border-border">
        <Image
          key={fotos[selected]}
          src={fotos[selected]!}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto}
              onClick={() => setSelected(i)}
              className={cn(
                "relative shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                i === selected
                  ? "border-[var(--ds-accent)] ring-1 ring-[var(--ds-accent)]"
                  : "border-border hover:border-t-tertiary"
              )}
            >
              <Image
                src={foto}
                alt={`${alt} — foto ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
