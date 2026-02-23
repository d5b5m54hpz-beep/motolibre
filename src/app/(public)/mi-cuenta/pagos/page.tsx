"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { CreditCard, Loader2 } from "lucide-react";

interface CuotaData {
  id: string;
  numero: number;
  monto: number;
  fechaVencimiento: string;
  fechaPago: string | null;
  estado: string;
  montoPagado: number | null;
}

interface ContratoInfo {
  id: string;
  numero: string;
  motoLabel: string;
  frecuencia: string;
  montoCuota: number;
}

export default function PagosPage() {
  const [contrato, setContrato] = useState<ContratoInfo | null>(null);
  const [cuotas, setCuotas] = useState<CuotaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mi-cuenta/pagos")
      .then((r) => r.json())
      .then((json) => {
        setContrato(json.data.contrato);
        setCuotas(json.data.cuotas);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePagar(cuotaId: string) {
    setPayingId(cuotaId);
    try {
      const res = await fetch("/api/mi-cuenta/pagos/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuotaId }),
      });
      const json = await res.json();
      if (res.ok && json.data.pagoUrl) {
        window.location.href = json.data.pagoUrl;
      }
    } catch {
      // ignore
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!contrato || cuotas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card/80 p-8 text-center">
        <p className="text-t-secondary">No tenés pagos activos.</p>
      </div>
    );
  }

  const pagadas = cuotas.filter((c) => c.estado === "PAGADA").length;
  const pendientes = cuotas.filter((c) => c.estado === "PENDIENTE").length;
  const vencidas = cuotas.filter((c) => c.estado === "VENCIDA").length;
  const totalPagado = cuotas
    .filter((c) => c.estado === "PAGADA")
    .reduce((s, c) => s + (c.montoPagado ?? c.monto), 0);

  function estadoVariant(estado: string) {
    switch (estado) {
      case "PAGADA": return "positive" as const;
      case "PENDIENTE": return "warning" as const;
      case "VENCIDA": return "negative" as const;
      case "CANCELADA": return "neutral" as const;
      default: return "neutral" as const;
    }
  }

  function estadoLabel(estado: string) {
    switch (estado) {
      case "PAGADA": return "Pagada";
      case "PENDIENTE": return "Pendiente";
      case "VENCIDA": return "Vencida";
      case "PARCIAL": return "Parcial";
      case "CANCELADA": return "Cancelada";
      default: return estado;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <p className="text-sm text-t-secondary">
        {contrato.motoLabel} · {contrato.numero}
      </p>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-card/80 p-4">
          <p className="text-xs text-t-tertiary">Total pagado</p>
          <p className="font-display font-extrabold text-xl text-t-primary mt-1">
            {formatMoney(totalPagado)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-4">
          <p className="text-xs text-t-tertiary">Pagos al día</p>
          <p className="font-display font-extrabold text-xl text-green-500 mt-1">
            {pagadas} de {cuotas.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card/80 p-4">
          <p className="text-xs text-t-tertiary">Pendientes / Vencidas</p>
          <p className="font-display font-extrabold text-xl text-t-primary mt-1">
            {pendientes} / <span className={vencidas > 0 ? "text-red-400" : ""}>{vencidas}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium">#</th>
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium">Monto</th>
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium">Vencimiento</th>
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium">Estado</th>
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium">Pagado</th>
                <th className="px-5 py-3 text-xs text-t-tertiary font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cuotas.map((cuota) => (
                <tr key={cuota.id} className="hover:bg-bg-input/30 transition-colors">
                  <td className="px-5 py-3 text-t-primary font-medium">{cuota.numero}</td>
                  <td className="px-5 py-3 text-t-primary">{formatMoney(cuota.monto)}</td>
                  <td className="px-5 py-3 text-t-secondary">{formatDate(cuota.fechaVencimiento)}</td>
                  <td className="px-5 py-3">
                    <DSBadge variant={estadoVariant(cuota.estado)}>
                      {estadoLabel(cuota.estado)}
                    </DSBadge>
                  </td>
                  <td className="px-5 py-3 text-t-secondary">
                    {cuota.fechaPago ? formatDate(cuota.fechaPago) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {(cuota.estado === "PENDIENTE" || cuota.estado === "VENCIDA") && (
                      <Button
                        size="sm"
                        onClick={() => handlePagar(cuota.id)}
                        disabled={payingId === cuota.id}
                      >
                        {payingId === cuota.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <CreditCard className="h-3 w-3 mr-1" />
                        )}
                        Pagar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
