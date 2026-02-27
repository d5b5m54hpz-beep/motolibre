/**
 * Calcula un pre-score automático (0-10) para una solicitud de taller
 * basado en datos objetivos, antes de la evaluación manual.
 */

interface PreScoreInput {
  docCuit: string | null;
  docHabilitacion: string | null;
  docSeguro: string | null;
  cantidadMecanicos: number;
  superficieM2: number | null;
  cantidadElevadores: number | null;
  docFotos: string[];
  tieneDeposito: boolean | null;
  tieneEstacionamiento: boolean | null;
}

function docsScore(s: PreScoreInput): number {
  const count = [s.docCuit, s.docHabilitacion, s.docSeguro].filter(Boolean).length;
  if (count === 3) return 10;
  if (count === 2) return 6;
  if (count === 1) return 3;
  return 0;
}

function mechanicsScore(n: number): number {
  if (n >= 5) return 10;
  if (n >= 3) return 7;
  if (n >= 1) return 4;
  return 0;
}

function surfaceScore(m2: number | null): number {
  if (m2 == null) return 0;
  if (m2 >= 200) return 10;
  if (m2 >= 100) return 7;
  if (m2 >= 50) return 4;
  return 2;
}

function elevatorsScore(n: number | null): number {
  if (n == null) return 0;
  if (n >= 3) return 10;
  if (n >= 1) return 7;
  return 0;
}

function photosScore(count: number): number {
  if (count >= 4) return 10;
  if (count >= 3) return 8;
  if (count >= 2) return 6;
  if (count >= 1) return 3;
  return 0;
}

export function calcularPreScore(solicitud: PreScoreInput): number {
  const factors = [
    { score: docsScore(solicitud), weight: 2 },
    { score: mechanicsScore(solicitud.cantidadMecanicos), weight: 1.5 },
    { score: surfaceScore(solicitud.superficieM2), weight: 1 },
    { score: elevatorsScore(solicitud.cantidadElevadores), weight: 1 },
    { score: photosScore(solicitud.docFotos.length), weight: 0.5 },
    { score: solicitud.tieneDeposito ? 10 : 0, weight: 0.5 },
    { score: solicitud.tieneEstacionamiento ? 10 : 0, weight: 0.5 },
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const totalWeighted = factors.reduce((s, f) => s + f.score * f.weight, 0);
  return totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 10) / 10 : 0;
}
