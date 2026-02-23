"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TIPO_MOTO_LABELS } from "@/lib/catalog-utils";
import type { TipoMoto } from "@prisma/client";

interface FilterBarProps {
  filtros: { marcas: string[]; tipos: string[] };
  marca: string;
  tipo: string;
  orden: string;
  precioMin: string;
  precioMax: string;
  hasActiveFilters: boolean;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function FilterBar({
  filtros,
  marca,
  tipo,
  orden,
  precioMin,
  precioMax,
  hasActiveFilters,
  onFilterChange,
  onClear,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl bg-bg-card/80 backdrop-blur-sm border border-border">
      {/* Marca */}
      <div className="w-full sm:w-auto sm:min-w-[160px]">
        <label className="text-xs text-t-tertiary mb-1 block">Marca</label>
        <Select value={marca || "ALL"} onValueChange={(v) => onFilterChange("marca", v === "ALL" ? "" : v)}>
          <SelectTrigger className="bg-bg-input border-border">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las marcas</SelectItem>
            {filtros.marcas.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo */}
      <div className="w-full sm:w-auto sm:min-w-[140px]">
        <label className="text-xs text-t-tertiary mb-1 block">Tipo</label>
        <Select value={tipo || "ALL"} onValueChange={(v) => onFilterChange("tipo", v === "ALL" ? "" : v)}>
          <SelectTrigger className="bg-bg-input border-border">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {filtros.tipos.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_MOTO_LABELS[t as TipoMoto] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Precio min/max */}
      <div className="flex gap-2 w-full sm:w-auto">
        <div>
          <label className="text-xs text-t-tertiary mb-1 block">Precio mín.</label>
          <Input
            type="number"
            placeholder="$0"
            value={precioMin}
            onChange={(e) => onFilterChange("precioMin", e.target.value)}
            className="w-28 bg-bg-input border-border"
          />
        </div>
        <div>
          <label className="text-xs text-t-tertiary mb-1 block">Precio máx.</label>
          <Input
            type="number"
            placeholder="∞"
            value={precioMax}
            onChange={(e) => onFilterChange("precioMax", e.target.value)}
            className="w-28 bg-bg-input border-border"
          />
        </div>
      </div>

      {/* Orden */}
      <div className="w-full sm:w-auto sm:min-w-[170px]">
        <label className="text-xs text-t-tertiary mb-1 block">Ordenar por</label>
        <Select value={orden} onValueChange={(v) => onFilterChange("orden", v)}>
          <SelectTrigger className="bg-bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="marca">Marca A-Z</SelectItem>
            <SelectItem value="precio_asc">Precio menor</SelectItem>
            <SelectItem value="precio_desc">Precio mayor</SelectItem>
            <SelectItem value="newest">Más nueva</SelectItem>
            <SelectItem value="km">Menos km</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-t-tertiary hover:text-t-primary">
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
