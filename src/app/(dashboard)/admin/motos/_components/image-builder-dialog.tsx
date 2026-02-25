"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  RotateCcw,
  RotateCw,
  Eraser,
  Undo2,
  Loader2,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Save,
  FlipHorizontal2,
  FlipVertical2,
  Maximize,
} from "lucide-react";
import { getCroppedImg } from "./crop-utils";
import { ApplyImageDialog } from "./apply-image-dialog";

interface ImageBuilderDialogProps {
  motoId: string;
  marca: string;
  modelo: string;
  currentImageUrl?: string | null;
  onSuccess: (url: string) => void;
  trigger?: React.ReactNode;
}

type Step = "upload" | "edit";

export function ImageBuilderDialog({
  motoId,
  marca,
  modelo,
  currentImageUrl,
  onSuccess,
  trigger,
}: ImageBuilderDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");

  // Image sources
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);

  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Processing state
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Apply-to-all state
  const [showApplyAll, setShowApplyAll] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Flip state
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reset ──
  function resetState() {
    setStep("upload");
    setImageSrc(null);
    setOriginalSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setIsRemovingBg(false);
    setBgRemoved(false);
    setIsUploading(false);
    setFlipH(false);
    setFlipV(false);
    setIsDragging(false);
  }

  // ── File handling ──
  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se aceptan imágenes");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Imagen demasiado grande (máx 15MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageSrc(dataUrl);
      setOriginalSrc(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setBgRemoved(false);
      setStep("edit");
    };
    reader.readAsDataURL(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  }

  // ── Drag & Drop ──
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  // ── Crop complete ──
  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  // ── Rotation ──
  function rotate90(direction: "cw" | "ccw") {
    setRotation((prev) => {
      const delta = direction === "cw" ? 90 : -90;
      return ((prev + delta) % 360 + 360) % 360;
    });
  }

  // ── Fit to frame ──
  function fitToFrame() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }

  // ── Background removal ──
  async function handleRemoveBackground() {
    if (!imageSrc) return;
    setIsRemovingBg(true);
    try {
      const { removeBackground } = await import(
        "@imgly/background-removal"
      );
      const blob = await removeBackground(imageSrc);
      const url = URL.createObjectURL(blob);
      setImageSrc(url);
      setBgRemoved(true);
      toast.success("Fondo removido");
    } catch (err) {
      console.error("Background removal failed:", err);
      toast.error("Error al remover fondo. Intentá con otra imagen.");
    } finally {
      setIsRemovingBg(false);
    }
  }

  function restoreOriginal() {
    if (originalSrc) {
      setImageSrc(originalSrc);
      setBgRemoved(false);
    }
  }

  // ── Save ──
  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Ajustá el recorte primero");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Crop via Canvas (with rotation + flip)
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        flipH,
        flipV
      );

      // 2. Compress to WebP
      const croppedFile = new File([croppedBlob], "image.webp", {
        type: "image/webp",
      });
      const compressed = await imageCompression(croppedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        fileType: "image/webp",
        useWebWorker: true,
      });

      // 3. Upload to Supabase
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("motoId", motoId);

      const uploadRes = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Error al subir imagen");
      }
      const { data: uploadData } = await uploadRes.json();

      // 4. Update moto imagenUrl
      const updateRes = await fetch(`/api/motos/${motoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenUrl: uploadData.url }),
      });
      if (!updateRes.ok) {
        throw new Error("Error al actualizar moto");
      }

      setUploadedUrl(uploadData.url);
      toast.success("Imagen guardada");
      onSuccess(uploadData.url);
      setOpen(false);
      resetState();

      // Show apply-to-all after closing editor
      setShowApplyAll(true);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Error al guardar imagen"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetState();
        }}
      >
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Cambiar imagen
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editor de Imagen</DialogTitle>
            <DialogDescription>
              {marca} {modelo}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">
                  Arrastrá una imagen o hacé click para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP — hasta 15MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onInputChange}
                  className="hidden"
                />
              </div>

              {currentImageUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Imagen actual:</p>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Editor ── */}
          {step === "edit" && imageSrc && (
            <div className="space-y-4 flex-1 min-h-0">
              {/* Crop area */}
              <div className="relative h-[350px] bg-muted rounded-lg overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  }}
                >
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={16 / 9}
                    objectFit="contain"
                    minZoom={0.3}
                    maxZoom={3}
                    restrictPosition={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    min={0.3}
                    max={3}
                    step={0.05}
                    value={[zoom]}
                    onValueChange={(vals) => setZoom(vals[0] ?? zoom)}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => rotate90("ccw")}
                    title="Rotar 90° izquierda"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Slider
                    min={0}
                    max={360}
                    step={1}
                    value={[rotation]}
                    onValueChange={(vals) => setRotation(vals[0] ?? rotation)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => rotate90("cw")}
                    title="Rotar 90° derecha"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                    {rotation}°
                  </span>
                </div>

                {/* Flip + Fit + Background removal */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={flipH ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlipH((v) => !v)}
                    title="Voltear horizontal"
                  >
                    <FlipHorizontal2 className="h-4 w-4 mr-1" />
                    Voltear H
                  </Button>
                  <Button
                    variant={flipV ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlipV((v) => !v)}
                    title="Voltear vertical"
                  >
                    <FlipVertical2 className="h-4 w-4 mr-1" />
                    Voltear V
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fitToFrame}
                    title="Encajar en el marco"
                  >
                    <Maximize className="h-4 w-4 mr-1" />
                    Encajar
                  </Button>

                  <div className="w-px h-6 bg-border mx-1" />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg || bgRemoved}
                  >
                    {isRemovingBg ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removiendo fondo...
                      </>
                    ) : (
                      <>
                        <Eraser className="h-4 w-4 mr-2" />
                        {bgRemoved ? "Fondo removido" : "Quitar fondo"}
                      </>
                    )}
                  </Button>
                  {bgRemoved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={restoreOriginal}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Restaurar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {step === "edit" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetState();
                    setStep("upload");
                  }}
                  disabled={isUploading}
                >
                  Volver
                </Button>
                <Button onClick={handleSave} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply-to-all dialog (renders after save) */}
      {uploadedUrl && (
        <ApplyImageDialog
          open={showApplyAll}
          onOpenChange={setShowApplyAll}
          marca={marca}
          modelo={modelo}
          motoId={motoId}
          imageUrl={uploadedUrl}
        />
      )}
    </>
  );
}
