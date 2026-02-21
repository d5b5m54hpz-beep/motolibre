/**
 * Genera la agenda de mantenimientos obligatorios cada 30 días
 * para la duración del contrato.
 */
export function generarFechasMantenimiento(
  fechaEntrega: Date,
  duracionMeses: number
): Date[] {
  const fechas: Date[] = [];
  const totalMantenimientos = duracionMeses; // 1 por mes

  for (let i = 1; i <= totalMantenimientos; i++) {
    const fecha = new Date(fechaEntrega);
    fecha.setDate(fecha.getDate() + i * 30);
    fechas.push(fecha);
  }

  return fechas;
}
