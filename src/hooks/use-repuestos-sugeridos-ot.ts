"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { RepuestoSugerido } from "./use-repuestos-sugeridos";

interface UseRepuestosSugeridosOTParams {
  tareas: {
    itemServiceId?: string | null;
    descripcion: string;
    categoria: string;
  }[];
  existingRepuestoIds: string[];
  existingRepuestoNames: string[];
  marcaMoto?: string;
  modeloMoto?: string;
}

export function useRepuestosSugeridosOT({
  tareas,
  existingRepuestoIds,
  existingRepuestoNames,
  marcaMoto,
  modeloMoto,
}: UseRepuestosSugeridosOTParams) {
  const [rawSugerencias, setRawSugerencias] = useState<RepuestoSugerido[]>([]);
  const [iaSugerencias, setIaSugerencias] = useState<RepuestoSugerido[]>([]);
  const [loading, setLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const iaRequestedRef = useRef<string>("");

  // Collect itemServiceIds from tareas
  const itemServiceIds = useMemo(
    () =>
      tareas
        .map((t) => t.itemServiceId)
        .filter((id): id is string => !!id)
        .sort()
        .join(","),
    [tareas]
  );

  // DB-based suggestions
  useEffect(() => {
    if (!itemServiceIds) {
      setRawSugerencias([]);
      return;
    }

    const ids = itemServiceIds.split(",");
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
  }, [itemServiceIds]);

  // IA fallback for unmapped tareas
  useEffect(() => {
    if (tareas.length === 0) {
      setIaSugerencias([]);
      return;
    }

    const mappedIds = new Set(rawSugerencias.map((s) => s.itemServiceId));
    const unmapped = tareas.filter(
      (t) => !t.itemServiceId || !mappedIds.has(t.itemServiceId)
    );

    if (unmapped.length === 0) {
      setIaSugerencias([]);
      return;
    }

    const requestKey = unmapped
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
              tareas: unmapped.map((t) => ({
                descripcion: t.descripcion,
                categoria: t.categoria,
                accion: "CHECK",
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
  }, [tareas, rawSugerencias, marcaMoto, modeloMoto]);

  // Merge, dedup, filter already-added and dismissed
  const sugerencias = useMemo(() => {
    const merged = [...rawSugerencias, ...iaSugerencias];
    const existingIds = new Set(existingRepuestoIds);
    const existingNames = new Set(existingRepuestoNames);
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
  }, [rawSugerencias, iaSugerencias, existingRepuestoIds, existingRepuestoNames, dismissed]);

  const dismiss = useCallback((repuestoId: string) => {
    setDismissed((prev) => new Set(prev).add(repuestoId));
  }, []);

  return {
    sugerencias,
    loading: loading || iaLoading,
    dismiss,
  };
}
