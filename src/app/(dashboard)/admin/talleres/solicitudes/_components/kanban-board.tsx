"use client";

import { useState, useCallback, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { MapPin, Clock } from "lucide-react";
import type { SolicitudTallerRow } from "./solicitudes-columns";

// ── Props ───────────────────────────────────────────────────────────────────
interface KanbanBoardProps {
  solicitudes: SolicitudTallerRow[];
  onCardClick: (solicitud: SolicitudTallerRow) => void;
  onRefresh: () => void;
}

// ── Column definitions ──────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: "nuevas",
    label: "Nuevas",
    color: "bg-blue-500",
    borderColor: "border-t-blue-500",
    estados: ["BORRADOR", "RECIBIDA", "INCOMPLETA"],
  },
  {
    id: "evaluacion",
    label: "Evaluación",
    color: "bg-yellow-500",
    borderColor: "border-t-yellow-500",
    estados: ["EN_EVALUACION", "EN_ESPERA"],
  },
  {
    id: "aprobadas",
    label: "Aprobadas",
    color: "bg-green-500",
    borderColor: "border-t-green-500",
    estados: ["APROBADA"],
  },
  {
    id: "convenio",
    label: "Convenio",
    color: "bg-purple-500",
    borderColor: "border-t-purple-500",
    estados: ["CONVENIO_ENVIADO", "CONVENIO_FIRMADO"],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    color: "bg-orange-500",
    borderColor: "border-t-orange-500",
    estados: ["ONBOARDING"],
  },
  {
    id: "activos",
    label: "Activos",
    color: "bg-emerald-500",
    borderColor: "border-t-emerald-500",
    estados: ["ACTIVO"],
  },
  {
    id: "rechazadas",
    label: "Rechazadas",
    color: "bg-red-500",
    borderColor: "border-t-red-500",
    estados: ["RECHAZADA"],
  },
] as const;

// ── Valid state transitions (mirrors backend) ───────────────────────────────
const TRANSICIONES: Record<string, string[]> = {
  RECIBIDA: ["EN_EVALUACION", "INCOMPLETA"],
  INCOMPLETA: ["RECIBIDA"],
  EN_EVALUACION: ["APROBADA", "RECHAZADA", "EN_ESPERA"],
  EN_ESPERA: ["EN_EVALUACION", "APROBADA"],
  APROBADA: ["CONVENIO_ENVIADO"],
  CONVENIO_ENVIADO: ["CONVENIO_FIRMADO"],
  CONVENIO_FIRMADO: ["ONBOARDING"],
  ONBOARDING: ["ACTIVO"],
};

// ── Estado labels for display ───────────────────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  RECIBIDA: "Recibida",
  INCOMPLETA: "Incompleta",
  EN_EVALUACION: "En Evaluación",
  EN_ESPERA: "En Espera",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CONVENIO_ENVIADO: "Convenio Enviado",
  CONVENIO_FIRMADO: "Convenio Firmado",
  ONBOARDING: "Onboarding",
  ACTIVO: "Activo",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function getDaysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  );
}

function getPreScoreColor(score: number): string {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= 4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

// ── Component ───────────────────────────────────────────────────────────────
export function KanbanBoard({
  solicitudes,
  onCardClick,
  onRefresh,
}: KanbanBoardProps) {
  const [items, setItems] = useState<SolicitudTallerRow[]>(solicitudes);

  // Keep items in sync when parent re-fetches
  const prevSolicitudesRef = useRef(solicitudes);
  if (prevSolicitudesRef.current !== solicitudes) {
    prevSolicitudesRef.current = solicitudes;
    setItems(solicitudes);
  }

  // Group solicitudes into columns
  const columnData = COLUMNS.map((col) => ({
    ...col,
    items: items.filter((s) => (col.estados as readonly string[]).includes(s.estado)),
  }));

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination } = result;

      if (!destination) return;

      const targetColumn = COLUMNS.find(
        (col) => col.id === destination.droppableId
      );
      if (!targetColumn) return;

      const solicitud = items.find((s) => s.id === draggableId);
      if (!solicitud) return;

      // Already in same column -- no state change needed
      if ((targetColumn.estados as readonly string[]).includes(solicitud.estado)) return;

      // Determine target estado (first estado of the target column)
      const targetEstado = targetColumn.estados[0];

      // Validate transition
      const permitidos = TRANSICIONES[solicitud.estado] ?? [];
      if (!permitidos.includes(targetEstado)) {
        toast.error(
          `No se puede cambiar de ${ESTADO_LABELS[solicitud.estado] ?? solicitud.estado} a ${ESTADO_LABELS[targetEstado] ?? targetEstado}`
        );
        return;
      }

      // Optimistic update
      const previousItems = [...items];
      setItems((prev) =>
        prev.map((s) =>
          s.id === solicitud.id ? { ...s, estado: targetEstado } : s
        )
      );

      try {
        const res = await fetch(
          `/api/solicitudes-taller/${solicitud.id}/cambiar-estado`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nuevoEstado: targetEstado }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ??
              "Error al cambiar estado"
          );
        }

        toast.success(
          `${solicitud.nombreTaller} movido a ${ESTADO_LABELS[targetEstado] ?? targetEstado}`
        );
        onRefresh();
      } catch (error: unknown) {
        // Revert optimistic update
        setItems(previousItems);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al cambiar estado"
        );
      }
    },
    [items, onRefresh]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columnData.map((column) => (
          <div
            key={column.id}
            className="flex flex-col min-w-[220px] max-w-[260px] bg-muted/30 rounded-lg shrink-0"
          >
            {/* Column header */}
            <div
              className={`p-3 font-semibold text-sm flex items-center justify-between rounded-t-lg border-t-[3px] ${column.borderColor}`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
                <span>{column.label}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
                {column.items.length}
              </span>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] transition-colors ${
                    snapshot.isDraggingOver
                      ? "bg-muted/50"
                      : ""
                  }`}
                >
                  {column.items.map((solicitud, index) => (
                    <Draggable
                      key={solicitud.id}
                      draggableId={solicitud.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onCardClick(solicitud)}
                          className={`p-3 bg-card rounded-lg border shadow-sm cursor-pointer hover:border-primary/50 transition-colors ${
                            dragSnapshot.isDragging
                              ? "opacity-80 shadow-lg"
                              : ""
                          }`}
                        >
                          {/* Taller name */}
                          <p className="font-semibold text-sm leading-tight truncate">
                            {solicitud.nombreTaller}
                          </p>

                          {/* Location */}
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {solicitud.ciudad}, {solicitud.provincia}
                            </span>
                          </div>

                          {/* Bottom row: status badge + pre-score + days */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <StatusBadge
                              status={solicitud.estado}
                              label={
                                ESTADO_LABELS[solicitud.estado] ??
                                solicitud.estado
                              }
                              className="text-[10px] px-1.5 py-0"
                            />

                            {/* Pre-score badge */}
                            {(solicitud as SolicitudTallerRow & { preScore?: number }).preScore != null && (
                              <span
                                className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${getPreScoreColor(
                                  (solicitud as SolicitudTallerRow & { preScore?: number }).preScore!
                                )}`}
                              >
                                {(solicitud as SolicitudTallerRow & { preScore?: number }).preScore!.toFixed(1)}
                              </span>
                            )}

                            {/* Days since creation */}
                            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
                              <Clock className="h-3 w-3" />
                              {getDaysSince(solicitud.createdAt)}d
                            </span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
