"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Moto } from "@prisma/client";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterableColumn } from "@/components/data-table/data-table-filters";
import type { BulkAction } from "@/components/data-table/data-table-bulk-actions";
import { SheetDetail, DetailField, DetailGrid, TimelineItem } from "@/components/ui/sheet-detail";
import { StatusBadge } from "@/components/ui/status-badge";
import { motosColumns, type MotoRow } from "./motos-columns";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { Bike, Download, QrCode, ExternalLink } from "lucide-react";
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
          ["Patente", "Marca", "Modelo", "Estado", "KM", "Ubicación"].join(","),
          ...rows.map((r) =>
            [r.patente ?? "", r.marca, r.modelo, r.estado, r.km, r.ubicacion ?? ""].join(",")
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
        searchableColumns={["patente", "marcaModelo", "numChasis", "numMotor"]}
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

// ── Gallery card ────────────────────────────────────────────────────────────
function MotoGalleryCard({ moto }: { moto: MotoRow }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
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
            <Bike className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm">
            {moto.patente ?? "Sin patentar"}
          </span>
          <StatusBadge status={moto.estado} />
        </div>
        <p className="text-sm font-medium">{moto.marca} {moto.modelo}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{moto.km.toLocaleString("es-AR")} km</span>
          <span>{moto.ubicacion ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

// ── Sheet lateral ───────────────────────────────────────────────────────────
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
        <div className="space-y-1">
          {moto._count.historialEstados === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin cambios de estado registrados
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {moto._count.historialEstados} cambios de estado.
              <br />
              <Link
                href={`/admin/motos/${moto.id}`}
                className="text-primary hover:underline text-xs"
              >
                Ver historial completo
              </Link>
            </p>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin documentos adjuntos
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {moto._count.documentos} documento(s).
              <br />
              <Link
                href={`/admin/motos/${moto.id}`}
                className="text-primary hover:underline text-xs"
              >
                Ver documentos
              </Link>
            </p>
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
