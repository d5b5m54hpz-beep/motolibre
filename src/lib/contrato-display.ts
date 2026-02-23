export function contratoNumero(contrato: {
  id: string;
  fechaInicio?: Date | null;
  createdAt: Date;
}): string {
  const year = (contrato.fechaInicio ?? contrato.createdAt).getFullYear();
  const suffix = contrato.id.slice(-6).toUpperCase();
  return `ML-${year}-${suffix}`;
}

export function cuotaEstadoLabel(estado: string): string {
  const map: Record<string, string> = {
    PENDIENTE: "Pendiente",
    PAGADA: "Pagada",
    PARCIAL: "Parcial",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
  };
  return map[estado] ?? estado;
}
