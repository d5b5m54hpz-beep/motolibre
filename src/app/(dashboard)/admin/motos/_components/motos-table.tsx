"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import type { BulkAction } from "@/components/data-table/data-table-bulk-actions";
import { SheetDetail, DetailField, DetailGrid } from "@/components/ui/sheet-detail";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { motosColumns, defaultHiddenColumns, type MotoRow } from "./motos-columns";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Bike, Download, QrCode, ExternalLink, Plus,
  Clock, FileText, Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// ── Estado options for filter ──
const ESTADO_OPTIONS = [
  "EN_DEPOSITO", "EN_PATENTAMIENTO", "DISPONIBLE", "RESERVADA",
  "ALQUILADA", "EN_SERVICE", "EN_REPARACION", "INMOVILIZADA",
  "RECUPERACION", "BAJA_TEMP", "BAJA_DEFINITIVA", "TRANSFERIDA",
].map((e) => ({ label: e.replace(/_/g, " "), value: e }));

const filterableColumns: FilterableColumn[] = [
  { id: "estado", title: "Estado", options: ESTADO_OPTIONS },
];

interface MotosTableProps {
  data: MotoRow[];
  marcas?: string[];
}

export function MotosTable({ data, marcas = [] }: MotosTableProps) {
  const [selectedMoto, setSelectedMoto] = useState<MotoRow | null>(null);
  const router = useRouter();

  // Add marca filter dynamically if marcas provided
  const filters: FilterableColumn[] = [
    ...filterableColumns,
    ...(marcas.length > 0
      ? [{ id: "marca" as const, title: "Marca", options: marcas.map((m) => ({ label: m, value: m })) }]
      : []),
  ];

  const bulkActions: BulkAction<MotoRow>[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      onClick: (rows) => {
        const csv = [
          ["Patente", "Marca", "Modelo", "Estado", "KM", "Renter", "Ubicación"].join(","),
          ...rows.map((r) =>
            [r.patente ?? "", r.marca, r.modelo, r.estado, r.km, r.renterName ?? "", r.ubicacion ?? ""].join(",")
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "motos.csv";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={motosColumns}
        data={data}
        searchableColumns={["patente", "marcaModelo", "numChasis", "numMotor", "renter"]}
        searchPlaceholder="Buscar por patente, marca, modelo, VIN..."
        filterableColumns={filters}
        bulkActions={bulkActions}
        onRowClick={(row) => setSelectedMoto(row)}
        galleryView={(row) => <MotoGalleryCard moto={row} />}
        emptyState={{
          icon: Bike,
          title: "No hay motos",
          description: "Creá la primera moto para empezar a gestionar tu flota.",
          action: {
            label: "Crear moto",
            onClick: () => router.push("/admin/motos/nueva"),
          },
        }}
        defaultPageSize={20}
        defaultColumnVisibility={defaultHiddenColumns}
        toolbar={
          <Button
            size="sm"
            className="h-8"
            onClick={() => router.push("/admin/motos/nueva")}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva Moto
          </Button>
        }
      />

      {/* Sheet lateral de detalle */}
      {selectedMoto && (
        <MotoSheet
          moto={selectedMoto}
          open={!!selectedMoto}
          onOpenChange={(open) => !open && setSelectedMoto(null)}
        />
      )}
    </>
  );
}

// ── Gallery card (Fix 10: hover state) ──────────────────────────────────────
function MotoGalleryCard({ moto }: { moto: MotoRow }) {
  return (
    <div className="group rounded-lg border bg-card overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className="aspect-video relative bg-muted">
        {moto.imagenUrl ? (
          <Image
            src={moto.imagenUrl}
            alt={`${moto.marca} ${moto.modelo}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Bike className="h-16 w-16 text-muted-foreground/20 group-hover:text-muted-foreground/30 transition-colors" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono font-bold text-sm">
            {moto.patente ?? "Sin patentar"}
          </span>
          <StatusBadge status={moto.estado} />
        </div>
        <p className="text-sm font-medium">{moto.marca} {moto.modelo}</p>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{moto.km.toLocaleString("es-AR")} km</span>
          <span>{moto.ubicacion ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

// ── Sheet lateral (Fix 6: improved empty states) ────────────────────────────
function MotoSheet({
  moto,
  open,
  onOpenChange,
}: {
  moto: MotoRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const tabs = [
    {
      id: "identificacion",
      label: "Identificación",
      content: (
        <div className="space-y-6">
          {moto.imagenUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <Image src={moto.imagenUrl} alt="" fill className="object-cover" sizes="500px" />
            </div>
          )}
          <DetailGrid>
            <DetailField label="Marca" value={moto.marca} />
            <DetailField label="Modelo" value={moto.modelo} />
            <DetailField label="Año" value={String(moto.anio)} mono />
            <DetailField label="Color" value={moto.color} />
            <DetailField label="Tipo" value={moto.tipo} />
            <DetailField label="Cilindrada" value={moto.cilindrada ? `${moto.cilindrada} cc` : undefined} mono />
            <DetailField label="VIN" value={moto.numChasis} mono />
            <DetailField label="Nº Motor" value={moto.numMotor} mono />
            <DetailField label="Patente" value={moto.patente} mono />
            <DetailField label="Ubicación" value={moto.ubicacion} />
          </DetailGrid>
        </div>
      ),
    },
    {
      id: "situacion",
      label: "Situación",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField label="Estado" value={<StatusBadge status={moto.estado} />} />
            <DetailField label="Estado Legal" value={moto.estadoLegal} />
            <DetailField label="Renter" value={moto.renterName} />
            <DetailField label="Patentamiento" value={moto.estadoPatentamiento} />
            <DetailField label="Seguro" value={moto.estadoSeguro} />
            <DetailField label="Aseguradora" value={moto.aseguradora} />
            <DetailField label="Póliza" value={moto.numPoliza} mono />
            <DetailField label="Vto. Seguro" value={moto.fechaFinSeguro ? formatDate(moto.fechaFinSeguro) : undefined} />
            <DetailField label="KM Actual" value={moto.km.toLocaleString("es-AR")} mono />
          </DetailGrid>
        </div>
      ),
    },
    {
      id: "financiero",
      label: "Financiero",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField
              label="Precio Compra"
              value={moto.precioCompra ? `${formatMoney(Number(moto.precioCompra))} ${moto.monedaCompra}` : undefined}
              mono
            />
            <DetailField label="Fecha Compra" value={moto.fechaCompra ? formatDate(moto.fechaCompra) : undefined} />
            <DetailField label="Proveedor" value={moto.proveedorCompra} />
            <DetailField label="Factura" value={moto.numFacturaCompra} mono />
            <DetailField
              label="Alquiler Mensual"
              value={moto.precioAlquilerMensual ? formatMoney(Number(moto.precioAlquilerMensual)) : undefined}
              mono
            />
          </DetailGrid>
        </div>
      ),
    },
    {
      id: "contable",
      label: "Contable",
      content: (
        <div className="space-y-6">
          <DetailGrid>
            <DetailField label="Método" value={moto.metodoAmortizacion} />
            <DetailField label="Vida Útil" value={`${moto.vidaUtilMeses} meses`} mono />
            <DetailField label="Valor Residual" value={formatMoney(Number(moto.valorResidual))} mono />
            <DetailField label="Alta Contable" value={moto.fechaAltaContable ? formatDate(moto.fechaAltaContable) : undefined} />
          </DetailGrid>
        </div>
      ),
    },
    {
      id: "historial",
      label: "Historial",
      count: moto._count.historialEstados,
      content: (
        <div>
          {moto._count.historialEstados === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin cambios registrados</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Los cambios de estado, servicios y eventos de esta moto aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {moto._count.historialEstados} cambios de estado.
              </p>
              <Link
                href={`/admin/motos/${moto.id}`}
                className="text-primary hover:underline text-sm mt-2 font-medium"
              >
                Ver historial completo
              </Link>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "documentos",
      label: "Documentos",
      count: moto._count.documentos,
      content: (
        <div>
          {moto._count.documentos === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Sin documentos adjuntos</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Subí títulos, cédulas verdes, pólizas de seguro y otros documentos de esta moto.
              </p>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Subir documento
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {moto._count.documentos} documento(s).
              </p>
              <Link
                href={`/admin/motos/${moto.id}`}
                className="text-primary hover:underline text-sm mt-2 font-medium"
              >
                Ver documentos
              </Link>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <SheetDetail
      open={open}
      onOpenChange={onOpenChange}
      title={moto.patente ?? "Sin patentar"}
      subtitle={`${moto.marca} ${moto.modelo} · ${moto.anio}`}
      status={moto.estado}
      tabs={tabs}
      actions={[
        {
          label: "Ver detalle",
          icon: ExternalLink,
          variant: "outline",
          onClick: () => router.push(`/admin/motos/${moto.id}`),
        },
        {
          label: "QR",
          icon: QrCode,
          variant: "outline",
          onClick: () => window.open(`/api/motos/${moto.id}/qr`, "_blank"),
        },
      ]}
    />
  );
}
