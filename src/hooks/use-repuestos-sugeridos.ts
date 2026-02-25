"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

export interface RepuestoSugerido {
  itemServiceId: string;
  itemServiceNombre: string;
  repuestoId: string;
  repuestoNombre: string;
  repuestoCodigo: string | null;
  repuestoPrecio: number | null;
  repuestoUnidad: string | null;
  repuestoStock: number | null;
  cantidadDefault: number;
  obligatorio: boolean;
  notas: string | null;
  origenIA?: boolean;
}

interface UseRepuestosSugeridosParams {
  tareaItems: {
    itemServiceId?: string;
    descripcion: string;
    categoria: string;
    accion: string;
  }[];
  assignments: Record<string, boolean>;
  milestones: { km: number }[];
  repuestoItems: { repuestoId?: string; nombre: string }[];
  marcaMoto?: string;
  modeloMoto?: string;
}

export function useRepuestosSugeridos({
  tareaItems,
  assignments,
  milestones,
  repuestoItems,
  marcaMoto,
  modeloMoto,
}: UseRepuestosSugeridosParams) {
  const [rawSugerencias, setRawSugerencias] = useState<RepuestoSugerido[]>([]);
  const [iaSugerencias, setIaSugerencias] = useState<RepuestoSugerido[]>([]);
  const [loading, setLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const iaRequestedRef = useRef<string>("");

  // Extract active tarea indices and itemServiceIds
  const activeInfo = useMemo(() => {
    const ids = new Set<string>();
    const indices: number[] = [];
    tareaItems.forEach((t, tIdx) => {
      const isAssigned = milestones.some(
        (_, mIdx) => assignments[`tarea-${tIdx}-${mIdx}`]
      );
      if (isAssigned) {
        indices.push(tIdx);
        if (t.itemServiceId) ids.add(t.itemServiceId);
      }
    });
    return {
      activeItemServiceIds: Array.from(ids).sort().join(","),
      activeIndices: indices,
    };
  }, [tareaItems, assignments, milestones]);

  // Debounced fetch from DB
  useEffect(() => {
    if (!activeInfo.activeItemServiceIds) {
      setRawSugerencias([]);
      return;
    }

    const ids = activeInfo.activeItemServiceIds.split(",");
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "/api/mantenimientos/planes/builder/sugerencias",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemServiceIds: ids }),
          }
        );
        const json = await res.json();
        setRawSugerencias(json.data ?? []);
      } catch {
        setRawSugerencias([]);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [activeInfo.activeItemServiceIds]);

  // IA fallback: for active tareas that have no DB mapping results
  useEffect(() => {
    if (!activeInfo.activeIndices.length) {
      setIaSugerencias([]);
      return;
    }

    // Find tasks without DB mappings
    const mappedItemServiceIds = new Set(
      rawSugerencias.map((s) => s.itemServiceId)
    );
    const unmappedTareas = activeInfo.activeIndices
      .map((idx) => tareaItems[idx])
      .filter(
        (t): t is NonNullable<typeof t> =>
          !!t && (!t.itemServiceId || !mappedItemServiceIds.has(t.itemServiceId))
      );

    if (unmappedTareas.length === 0) {
      setIaSugerencias([]);
      return;
    }

    // Build a stable key to avoid redundant requests
    const requestKey = unmappedTareas
      .map((t) => `${t.categoria}:${t.descripcion}`)
      .sort()
      .join("|");

    if (iaRequestedRef.current === requestKey) return;

    const timeout = setTimeout(async () => {
      iaRequestedRef.current = requestKey;
      setIaLoading(true);
      try {
        const res = await fetch(
          "/api/mantenimientos/planes/builder/sugerencias-ia",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tareas: unmappedTareas.map((t) => ({
                descripcion: t.descripcion,
                categoria: t.categoria,
                accion: t.accion,
              })),
              marcaMoto: marcaMoto || undefined,
              modeloMoto: modeloMoto || undefined,
            }),
          }
        );
        const json = await res.json();
        if (json.aiAvailable === false) {
          setIaSugerencias([]);
        } else {
          setIaSugerencias(json.data ?? []);
        }
      } catch {
        setIaSugerencias([]);
      }
      setIaLoading(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeInfo.activeIndices, rawSugerencias, tareaItems, marcaMoto, modeloMoto]);

  // Merge DB + IA suggestions, filter out already-added and dismissed
  const sugerencias = useMemo(() => {
    const merged = [...rawSugerencias, ...iaSugerencias];
    const existingIds = new Set(
      repuestoItems.map((r) => r.repuestoId).filter(Boolean)
    );
    const existingNames = new Set(repuestoItems.map((r) => r.nombre));

    // Deduplicate by repuestoId (DB wins over IA)
    const seen = new Set<string>();
    return merged.filter((s) => {
      if (seen.has(s.repuestoId)) return false;
      seen.add(s.repuestoId);
      return (
        !existingIds.has(s.repuestoId) &&
        !existingNames.has(s.repuestoNombre) &&
        !dismissed.has(s.repuestoId)
      );
    });
  }, [rawSugerencias, iaSugerencias, repuestoItems, dismissed]);

  const dismiss = useCallback((repuestoId: string) => {
    setDismissed((prev) => new Set(prev).add(repuestoId));
  }, []);

  const resetDismissed = useCallback(() => {
    setDismissed(new Set());
    iaRequestedRef.current = "";
  }, []);

  return {
    sugerencias,
    allSugerencias: rawSugerencias,
    loading: loading || iaLoading,
    dismissed,
    dismiss,
    resetDismissed,
  };
}
