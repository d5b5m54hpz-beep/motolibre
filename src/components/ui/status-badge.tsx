import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Motos
  EN_DEPOSITO: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  EN_PATENTAMIENTO: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  DISPONIBLE: "bg-green-500/10 text-green-500 border-green-500/20",
  RESERVADA: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ALQUILADA: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  EN_SERVICE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  EN_REPARACION: "bg-red-500/10 text-red-500 border-red-500/20",
  INMOVILIZADA: "bg-red-700/10 text-red-700 border-red-700/20",
  RECUPERACION: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  BAJA_TEMP: "bg-gray-600/10 text-gray-600 border-gray-600/20",
  BAJA_DEFINITIVA: "bg-gray-800/10 text-gray-800 border-gray-800/20",
  TRANSFERIDA: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",

  // Contratos
  PENDIENTE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ACTIVO: "bg-green-500/10 text-green-500 border-green-500/20",
  FINALIZADO: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  CANCELADO: "bg-red-500/10 text-red-500 border-red-500/20",
  FINALIZADO_COMPRA: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  VENCIDO: "bg-red-600/10 text-red-600 border-red-600/20",

  // Pagos
  APROBADO: "bg-green-500/10 text-green-500 border-green-500/20",
  RECHAZADO: "bg-red-500/10 text-red-500 border-red-500/20",
  REEMBOLSADO: "bg-purple-500/10 text-purple-500 border-purple-500/20",

  // OTs
  SOLICITADA: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APROBADA: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PROGRAMADA: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  EN_ESPERA_REPUESTOS: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  EN_EJECUCION: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  EN_REVISION: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETADA: "bg-green-500/10 text-green-500 border-green-500/20",

  // RRHH — Empleados
  LICENCIA: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  SUSPENDIDO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DESVINCULADO: "bg-gray-600/10 text-gray-600 border-gray-600/20",

  // RRHH — Recibos
  LIQUIDADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PAGADO: "bg-green-500/10 text-green-500 border-green-500/20",
  ANULADO: "bg-red-500/10 text-red-500 border-red-500/20",

  // Conciliación
  EN_PROCESO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PROPUESTO: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  EXACTO: "bg-green-500/10 text-green-500 border-green-500/20",
  APROXIMADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REFERENCIA_MATCH: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  MANUAL: "bg-gray-500/10 text-gray-500 border-gray-500/20",

  // Monitor — Salud
  SALUDABLE: "bg-green-500/10 text-green-500 border-green-500/20",
  DEGRADADO: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CRITICO: "bg-red-700/10 text-red-700 border-red-700/20",

  // Monitor — Niveles log
  DEBUG: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  WARNING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ERROR: "bg-red-500/10 text-red-500 border-red-500/20",
  CRITICAL: "bg-red-700/10 text-red-700 border-red-700/20",

  // Diagnóstico
  COMPLETADO: "bg-green-500/10 text-green-500 border-green-500/20",

  // Prioridad alertas
  BAJA: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIA: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ALTA: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  URGENTE: "bg-red-600/10 text-red-600 border-red-600/20",

  // Genéricos
  BORRADOR: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  ENVIADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ENTREGADO: "bg-green-500/10 text-green-500 border-green-500/20",
};

const defaultColor = "bg-gray-500/10 text-gray-500 border-gray-500/20";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] ?? defaultColor;
  const label = status.replace(/_/g, " ");

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {label}
    </Badge>
  );
}
