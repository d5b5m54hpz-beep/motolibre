"use client";

import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Bike,
  Users,
  Package,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImportEntity = "motos" | "clientes" | "repuestos";

interface ImportResult {
  importados?: number;
  creados?: number;
  actualizados?: number;
  existentes?: number;
  errores: number;
  total: number;
  detalleErrores?: string[];
}

// ---------------------------------------------------------------------------
// Export config
// ---------------------------------------------------------------------------

interface ExportRow {
  key: string;
  label: string;
  baseUrl: string;
  filters?: ExportFilter[];
}

interface ExportFilter {
  key: string;
  label: string;
  type: "select" | "date";
  options?: { value: string; label: string }[];
}

const EXPORT_ROWS: ExportRow[] = [
  {
    key: "motos",
    label: "Motos",
    baseUrl: "/api/export/motos",
  },
  {
    key: "clientes",
    label: "Clientes",
    baseUrl: "/api/export/clientes",
  },
  {
    key: "contratos",
    label: "Contratos",
    baseUrl: "/api/export/contratos",
    filters: [
      {
        key: "estado",
        label: "Estado",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "BORRADOR", label: "Borrador" },
          { value: "ACTIVO", label: "Activo" },
          { value: "FINALIZADO", label: "Finalizado" },
          { value: "CANCELADO", label: "Cancelado" },
          { value: "VENCIDO", label: "Vencido" },
        ],
      },
    ],
  },
  {
    key: "pagos",
    label: "Pagos",
    baseUrl: "/api/export/pagos",
    filters: [
      {
        key: "estado",
        label: "Estado",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "PENDIENTE", label: "Pendiente" },
          { value: "APROBADO", label: "Aprobado" },
          { value: "RECHAZADO", label: "Rechazado" },
          { value: "REEMBOLSADO", label: "Reembolsado" },
        ],
      },
      { key: "desde", label: "Desde", type: "date" },
      { key: "hasta", label: "Hasta", type: "date" },
    ],
  },
  {
    key: "repuestos",
    label: "Repuestos",
    baseUrl: "/api/export/repuestos",
  },
  {
    key: "empleados",
    label: "Empleados",
    baseUrl: "/api/export/empleados",
  },
  {
    key: "facturas",
    label: "Facturas",
    baseUrl: "/api/export/facturas",
    filters: [
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "A", label: "Factura A" },
          { value: "B", label: "Factura B" },
          { value: "C", label: "Factura C" },
        ],
      },
      { key: "desde", label: "Desde", type: "date" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Import entity cards config
// ---------------------------------------------------------------------------

const IMPORT_ENTITIES: {
  key: ImportEntity;
  label: string;
  icon: typeof Bike;
}[] = [
  { key: "motos", label: "Motos", icon: Bike },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "repuestos", label: "Repuestos", icon: Package },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportImportPage() {
  // ── Export state ──
  const [exportFilters, setExportFilters] = useState<
    Record<string, Record<string, string>>
  >({});
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Import state ──
  const [importTipo, setImportTipo] = useState<ImportEntity>("motos");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------
  // Export handlers
  // ----------------------------------

  function updateFilter(entityKey: string, filterKey: string, value: string) {
    setExportFilters((prev) => ({
      ...prev,
      [entityKey]: { ...prev[entityKey], [filterKey]: value },
    }));
  }

  async function handleExport(row: ExportRow) {
    setExporting(row.key);
    try {
      const params = new URLSearchParams();
      const filters = exportFilters[row.key] ?? {};
      for (const [k, v] of Object.entries(filters)) {
        if (v) params.set(k, v);
      }

      const qs = params.toString();
      const url = qs ? `${row.baseUrl}?${qs}` : row.baseUrl;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Error al exportar");
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${row.key}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success(`${row.label} exportados correctamente`);
    } catch {
      toast.error(`Error al exportar ${row.label.toLowerCase()}`);
    } finally {
      setExporting(null);
    }
  }

  // ----------------------------------
  // Import handlers
  // ----------------------------------

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setImportFile(droppedFile);
      setImportResult(null);
    } else {
      toast.error("Solo se aceptan archivos CSV");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setImportFile(selected);
      setImportResult(null);
    }
  }

  async function handleImport() {
    if (!importFile) {
      toast.error("Selecciona un archivo CSV primero");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const res = await fetch(`/api/import/${importTipo}`, {
        method: "POST",
        body: text,
        headers: { "Content-Type": "text/plain" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Error al importar");
      }

      const result: ImportResult = await res.json();
      setImportResult(result);

      const imported =
        result.importados ?? result.creados ?? 0;
      if (result.errores > 0) {
        toast.warning(
          `Importacion parcial: ${imported} exitosos, ${result.errores} errores`,
        );
      } else {
        toast.success(
          `Importacion completada: ${imported} registros procesados`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al importar datos";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate(entity: ImportEntity) {
    try {
      const res = await fetch(`/api/import/templates/${entity}`);
      if (!res.ok) throw new Error("Error al descargar template");

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `template_${entity}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Error al descargar el template");
    }
  }

  // ----------------------------------
  // Render
  // ----------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar / Importar Datos"
        description="Descarga o carga informacion masiva en formato CSV"
      />

      {/* ══════════════════════════════════════════════
          EXPORT SECTION
          ══════════════════════════════════════════════ */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Download className="h-5 w-5 text-accent-DEFAULT" />
          <h2 className="text-lg font-display font-bold text-t-primary">
            Exportar Datos
          </h2>
        </div>

        <div className="space-y-3">
          {EXPORT_ROWS.map((row) => {
            const isExporting = exporting === row.key;

            return (
              <div
                key={row.key}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-bg-input/50 px-4 py-3"
              >
                {/* Entity name */}
                <span className="text-sm font-medium text-t-primary min-w-[100px]">
                  {row.label}
                </span>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {row.filters?.map((filter) => {
                    const value =
                      exportFilters[row.key]?.[filter.key] ?? "";

                    if (filter.type === "select" && filter.options) {
                      return (
                        <select
                          key={filter.key}
                          value={value}
                          onChange={(e) =>
                            updateFilter(row.key, filter.key, e.target.value)
                          }
                          className="bg-bg-input border border-border rounded-xl px-3 py-1.5 text-xs text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                        >
                          {filter.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    if (filter.type === "date") {
                      return (
                        <div key={filter.key} className="flex items-center gap-1.5">
                          <label className="text-xs text-t-secondary">
                            {filter.label}
                          </label>
                          <input
                            type="date"
                            value={value}
                            onChange={(e) =>
                              updateFilter(
                                row.key,
                                filter.key,
                                e.target.value,
                              )
                            }
                            className="bg-bg-input border border-border rounded-xl px-2 py-1.5 text-xs text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleExport(row)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-accent-DEFAULT hover:bg-accent-hover text-white transition-colors disabled:opacity-50 shrink-0"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Descargar CSV
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          IMPORT SECTION
          ══════════════════════════════════════════════ */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="h-5 w-5 text-accent-DEFAULT" />
          <h2 className="text-lg font-display font-bold text-t-primary">
            Importar Datos
          </h2>
        </div>

        {/* Template cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {IMPORT_ENTITIES.map((entity) => {
            const Icon = entity.icon;
            return (
              <div
                key={entity.key}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-input/50 px-4 py-3"
              >
                <Icon className="h-5 w-5 text-accent-DEFAULT shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-t-primary">
                    {entity.label}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadTemplate(entity.key)}
                  className="inline-flex items-center gap-1.5 text-xs text-accent-DEFAULT hover:underline shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Descargar template
                </button>
              </div>
            );
          })}
        </div>

        {/* Import form */}
        <div className="space-y-4">
          {/* Entity type select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Tipo de entidad
            </label>
            <select
              value={importTipo}
              onChange={(e) => {
                setImportTipo(e.target.value as ImportEntity);
                setImportFile(null);
                setImportResult(null);
              }}
              className="w-full max-w-xs bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            >
              {IMPORT_ENTITIES.map((entity) => (
                <option key={entity.key} value={entity.key}>
                  {entity.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
              dragOver
                ? "border-accent-DEFAULT bg-accent-DEFAULT/5"
                : "border-border hover:border-border-hover bg-bg-input/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 text-t-tertiary" />
            {importFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-t-primary">
                  {importFile.name}
                </p>
                <p className="text-xs text-t-secondary mt-1">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-t-secondary">
                  Arrastra un archivo CSV o{" "}
                  <span className="text-accent-DEFAULT font-medium">
                    hace click para seleccionar
                  </span>
                </p>
                <p className="text-xs text-t-tertiary mt-1">
                  Usa los templates de arriba como referencia
                </p>
              </div>
            )}
          </div>

          {/* Import button */}
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-accent-DEFAULT hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar
            </button>
          </div>

          {/* Import results */}
          {importResult && (
            <div className="rounded-xl border border-border bg-bg-input/50 p-4 space-y-3">
              <h3 className="text-sm font-medium text-t-primary">
                Resultado de la importacion
              </h3>

              <div className="flex flex-wrap gap-4">
                {/* Success count */}
                {importResult.importados != null && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-positive" />
                    <span className="text-sm text-t-secondary">
                      Importados:{" "}
                      <span className="font-medium text-positive">
                        {importResult.importados}
                      </span>
                    </span>
                  </div>
                )}
                {importResult.creados != null && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-positive" />
                    <span className="text-sm text-t-secondary">
                      Creados:{" "}
                      <span className="font-medium text-positive">
                        {importResult.creados}
                      </span>
                    </span>
                  </div>
                )}
                {importResult.actualizados != null && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-ds-info" />
                    <span className="text-sm text-t-secondary">
                      Actualizados:{" "}
                      <span className="font-medium text-ds-info">
                        {importResult.actualizados}
                      </span>
                    </span>
                  </div>
                )}
                {importResult.existentes != null && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" />
                    <span className="text-sm text-t-secondary">
                      Existentes:{" "}
                      <span className="font-medium text-warning">
                        {importResult.existentes}
                      </span>
                    </span>
                  </div>
                )}

                {/* Error count */}
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-negative" />
                  <span className="text-sm text-t-secondary">
                    Errores:{" "}
                    <span className="font-medium text-negative">
                      {importResult.errores}
                    </span>
                  </span>
                </div>

                {/* Total */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-t-tertiary">
                    Total: {importResult.total}
                  </span>
                </div>
              </div>

              {/* Error details */}
              {importResult.detalleErrores &&
                importResult.detalleErrores.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-negative mb-2">
                      Detalle de errores:
                    </p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.detalleErrores.map((err, i) => (
                        <li
                          key={i}
                          className="text-xs text-t-secondary bg-negative-bg rounded-lg px-3 py-1.5"
                        >
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
