"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/format";
import {
  ShoppingCart,
  Clock,
  DollarSign,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Truck,
  CheckCircle,
} from "lucide-react";

// ── Types ──

interface OrdenItem {
  id: string;
  codigoSnapshot: string;
  nombreSnapshot: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  repuesto: {
    id: string;
    nombre: string;
    stock: number;
  };
}

interface Orden {
  id: string;
  numero: number;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string | null;
  direccionEnvio: string | null;
  metodoEntrega: string;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  estado: string;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
  items?: OrdenItem[];
}

interface Stats {
  total: number;
  pendientes: number;
  ingresoTotal: number;
}

// ── Constants ──

const ESTADOS = [
  "PENDIENTE_PAGO",
  "PAGADA",
  "EN_PREPARACION",
  "LISTA_RETIRO",
  "ENVIADA",
  "ENTREGADA",
  "CANCELADA",
] as const;

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADA: "Pagada",
  EN_PREPARACION: "En preparacion",
  LISTA_RETIRO: "Lista para retiro",
  ENVIADA: "Enviada",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
};

// ── Component ──

export default function VentasRepuestosPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <VentasRepuestosContent />
    </Suspense>
  );
}

function VentasRepuestosContent() {
  const searchParams = useSearchParams();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pendientes: 0, ingresoTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filtroEstado, setFiltroEstado] = useState(searchParams.get("estado") || "");
  const [busqueda, setBusqueda] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setDebouncedBusqueda(busqueda);
      setPage(1);
    }, 400);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado && filtroEstado !== "all") params.set("estado", filtroEstado);
    if (debouncedBusqueda) params.set("busqueda", debouncedBusqueda);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/ventas-repuestos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrdenes(data.ordenes);
        setTotalPages(data.totalPages);
        setStats(data.stats);
      }
    } catch (error: unknown) {
      console.error("Error fetching ordenes:", error);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, debouncedBusqueda, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleViewDetail(orden: Orden) {
    setDetailLoading(true);
    setSelectedOrden(orden);
    try {
      const res = await fetch(`/api/ventas-repuestos/${orden.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrden(data.orden);
      }
    } catch (error: unknown) {
      console.error("Error fetching orden detail:", error);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleTransition(ordenId: string, nuevoEstado: string) {
    try {
      const res = await fetch(`/api/ventas-repuestos/${ordenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        void fetchData();
      }
    } catch (error: unknown) {
      console.error("Error updating orden:", error);
    }
  }

  function getTransitionActions(estado: string): { label: string; estado: string; icon: React.ReactNode }[] {
    switch (estado) {
      case "PAGADA":
        return [
          { label: "Preparar pedido", estado: "EN_PREPARACION", icon: <Package className="h-4 w-4 mr-2" /> },
        ];
      case "EN_PREPARACION":
        return [
          { label: "Listo para retiro", estado: "LISTA_RETIRO", icon: <Clock className="h-4 w-4 mr-2" /> },
          { label: "Enviar", estado: "ENVIADA", icon: <Truck className="h-4 w-4 mr-2" /> },
        ];
      case "LISTA_RETIRO":
      case "ENVIADA":
        return [
          { label: "Marcar entregado", estado: "ENTREGADA", icon: <CheckCircle className="h-4 w-4 mr-2" /> },
        ];
      default:
        return [];
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas Repuestos"
        description="Gestion de pedidos online de repuestos"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-display font-bold text-t-primary">
                  {stats.total}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-display font-bold text-t-primary">
                  {stats.pendientes}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Total</p>
                <p className="text-2xl font-display font-bold text-t-primary">
                  {formatMoney(Number(stats.ingresoTotal))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Estado</Label>
          <Select
            value={filtroEstado}
            onValueChange={(v) => {
              setFiltroEstado(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_LABELS[e] ?? e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input
            placeholder="Nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-[250px]"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              Cargando...
            </p>
          ) : ordenes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay pedidos
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      #Numero
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Items
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                      Estado
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Fecha
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((orden) => {
                    const actions = getTransitionActions(orden.estado);
                    return (
                      <tr
                        key={orden.id}
                        className="border-b hover:bg-bg-card-hover transition-colors"
                      >
                        <td className="py-3 px-2 font-mono font-medium">
                          #{orden.numero}
                        </td>
                        <td className="py-3 px-2 font-medium">
                          {orden.nombreCliente}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {orden.emailCliente}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {orden._count.items}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {formatMoney(Number(orden.total))}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <StatusBadge status={orden.estado} />
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(orden.createdAt).toLocaleDateString(
                            "es-AR"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(orden)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {actions.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {actions.map((action) => (
                                    <DropdownMenuItem
                                      key={action.estado}
                                      onClick={() =>
                                        handleTransition(
                                          orden.id,
                                          action.estado
                                        )
                                      }
                                    >
                                      {action.icon}
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedOrden}
        onOpenChange={(open) => !open && setSelectedOrden(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrden?.numero}
            </DialogTitle>
          </DialogHeader>
          {selectedOrden && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrden.nombreCliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedOrden.emailCliente}</p>
                </div>
                {selectedOrden.telefonoCliente && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium">
                      {selectedOrden.telefonoCliente}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Entrega</p>
                  <p className="font-medium">
                    {selectedOrden.metodoEntrega === "ENVIO"
                      ? "Envio"
                      : "Retiro en local"}
                  </p>
                </div>
                {selectedOrden.direccionEnvio && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Direccion de envio
                    </p>
                    <p className="font-medium">
                      {selectedOrden.direccionEnvio}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <StatusBadge status={selectedOrden.estado} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(selectedOrden.createdAt).toLocaleDateString(
                      "es-AR"
                    )}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-display font-bold text-t-primary mb-2">
                  Items
                </h3>
                {detailLoading ? (
                  <p className="text-center py-4 text-muted-foreground">
                    Cargando items...
                  </p>
                ) : selectedOrden.items && selectedOrden.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            Codigo
                          </th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            Nombre
                          </th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                            Cant.
                          </th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                            Precio Unit.
                          </th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrden.items.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="py-2 px-2 font-mono text-xs">
                              {item.codigoSnapshot}
                            </td>
                            <td className="py-2 px-2">
                              {item.nombreSnapshot}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">
                              {item.cantidad}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {formatMoney(Number(item.precioUnitario))}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {formatMoney(Number(item.subtotal))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Sin items
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-right">
                <p className="text-sm text-muted-foreground">
                  Subtotal:{" "}
                  <span className="font-mono text-t-primary">
                    {formatMoney(Number(selectedOrden.subtotal))}
                  </span>
                </p>
                {Number(selectedOrden.descuento) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Descuento:{" "}
                    <span className="font-mono text-t-primary">
                      -{formatMoney(Number(selectedOrden.descuento))}
                    </span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  IVA:{" "}
                  <span className="font-mono text-t-primary">
                    {formatMoney(Number(selectedOrden.iva))}
                  </span>
                </p>
                <p className="text-lg font-display font-bold text-t-primary">
                  Total: {formatMoney(Number(selectedOrden.total))}
                </p>
              </div>

              {/* Notes */}
              {selectedOrden.notas && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{selectedOrden.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
