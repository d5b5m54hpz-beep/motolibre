"use client";

import { useRouter } from "next/navigation";
import { ImageBuilderDialog } from "../../_components/image-builder-dialog";

interface MotoImageActionsProps {
  motoId: string;
  marca: string;
  modelo: string;
  currentImageUrl?: string | null;
}

export function MotoImageActions({
  motoId,
  marca,
  modelo,
  currentImageUrl,
}: MotoImageActionsProps) {
  const router = useRouter();

  return (
    <ImageBuilderDialog
      motoId={motoId}
      marca={marca}
      modelo={modelo}
      currentImageUrl={currentImageUrl}
      onSuccess={() => router.refresh()}
    />
  );
}
