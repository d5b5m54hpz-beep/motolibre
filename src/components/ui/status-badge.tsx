import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Semantic variant type ──────────────────────────────────────────────────
export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral" | "default";

// ── Variant styles ─────────────────────────────────────────────────────────
const variantStyles: Record<StatusVariant, { base: string; dot: string }> = {
  success: {
    base: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  warning: {
    base: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  danger: {
    base: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    dot: "bg-red-500",
  },
  info: {
    base: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  neutral: {
    base: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
  default: {
    base: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
};

// ── Auto-map: status string → semantic variant ─────────────────────────────
const statusToVariant: Record<string, StatusVariant> = {
  // Motos
  DISPONIBLE: "success",
  ALQUILADA: "info",
  EN_SERVICE: "warning",
  EN_REPARACION: "warning",
  EN_DEPOSITO: "neutral",
  EN_PATENTAMIENTO: "neutral",
  RESERVADA: "info",
  INMOVILIZADA: "danger",
  RECUPERACION: "warning",
  BAJA_TEMP: "danger",
  BAJA_DEFINITIVA: "danger",
  TRANSFERIDA: "neutral",

  // Contratos
  ACTIVO: "success",
  FINALIZADO: "neutral",
  CANCELADO: "danger",
  FINALIZADO_COMPRA: "info",
  VENCIDO: "danger",

  // Pagos / Genéricos
  PENDIENTE: "warning",
  APROBADO: "success",
  RECHAZADO: "danger",
  REEMBOLSADO: "info",

  // OT
  SOLICITADA: "neutral",
  APROBADA: "info",
  PROGRAMADA: "info",
  EN_ESPERA_REPUESTOS: "warning",
  EN_EJECUCION: "info",
  EN_REVISION: "warning",
  COMPLETADA: "success",
  CANCELADA: "danger",

  // Mantenimientos
  PROGRAMADO: "neutral",
  NOTIFICADO: "info",
  COMPLETADO: "success",
  NO_ASISTIO: "danger",
  REPROGRAMADO: "warning",

  // RRHH
  LICENCIA: "warning",
  SUSPENDIDO: "warning",
  DESVINCULADO: "neutral",
  LIQUIDADO: "info",
  PAGADO: "success",
  PAGADA: "success",
  ANULADO: "danger",

  // Conciliación
  EN_PROCESO: "info",
  PROPUESTO: "warning",
  EXACTO: "success",
  APROXIMADO: "info",
  REFERENCIA_MATCH: "info",
  MANUAL: "neutral",

  // Monitor
  SALUDABLE: "success",
  DEGRADADO: "warning",
  CRITICO: "danger",

  // Log levels
  DEBUG: "neutral",
  INFO: "info",
  WARNING: "warning",
  ERROR: "danger",
  CRITICAL: "danger",

  // Prioridades
  BAJA: "success",
  MEDIA: "info",
  ALTA: "warning",
  URGENTE: "danger",

  // Órdenes venta
  PENDIENTE_PAGO: "neutral",
  EN_PREPARACION: "info",
  LISTA_RETIRO: "info",
  ENVIADA: "info",
  ENTREGADA: "success",

  // Solicitudes
  PAGO_PENDIENTE: "neutral",
  EN_EVALUACION: "info",
  EN_ESPERA: "warning",
  ASIGNADA: "info",

  // Genéricos
  BORRADOR: "neutral",
  ENVIADO: "info",
  ENTREGADO: "success",
};

// ── Props ──────────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  showDot?: boolean;
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  variant,
  showDot = true,
  label,
  className,
}: StatusBadgeProps) {
  const resolved = variant ?? statusToVariant[status] ?? "default";
  const styles = variantStyles[resolved];
  const displayLabel = label ?? status.replace(/_/g, " ");

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs px-2 py-0.5 rounded-md font-medium border gap-1.5 inline-flex items-center",
        styles.base,
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", styles.dot)} />
      )}
      {displayLabel}
    </Badge>
  );
}
