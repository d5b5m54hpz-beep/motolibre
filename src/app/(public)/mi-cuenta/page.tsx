"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Bike,
  Calendar,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface DashboardData {
  cliente: { nombre: string; apellido: string } | null;
  contratoActivo: {
    id: string;
    numero: string;
    plan: string;
    frecuencia: string;
    montoCuota: number;
    estado: string;
    fechaInicio: string;
    incluyeTransferencia: boolean;
    cuotasPagadas: number;
    cuotasTotal: number;
    progreso: number;
  } | null;
  moto: {
    id: string;
    marca: string;
    modelo: string;
    anio: number;
    km: number;
    foto: string | null;
    patente: string;
    color: string;
    estado: string;
  } | null;
  proximoPago: {
    cuotaId: string;
    numero: number;
    monto: number;
    fechaVencimiento: string;
    diasRestantes: number | null;
    estado: string;
  } | null;
  resumenPagos: {
    totalPagado: number;
    pagosAlDia: number;
    pagosVencidos: number;
    pagosPendientes: number;
  } | null;
  ultimosPagos: {
    cuotaNumero: number;
    monto: number;
    fechaPago: string;
  }[];
}

export default function MiCuentaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mi-cuenta/dashboard")
      .then((r) => r.json())
      .then((json) => setData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (!data?.contratoActivo) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card/80 p-8 text-center space-y-4">
        <Bike className="h-16 w-16 text-t-tertiary/30 mx-auto" />
        <h2 className="font-display text-xl font-bold text-t-primary">
          No tenés una moto activa
        </h2>
        <p className="text-sm text-t-secondary">
          ¿Querés empezar? Elegí tu moto y plan en el catálogo.
        </p>
        <Button asChild>
          <Link href="/catalogo">Ver catálogo de motos</Link>
        </Button>
      </div>
    );
  }

  const { contratoActivo, moto, proximoPago, resumenPagos, ultimosPagos, cliente } = data;
  const freq = contratoActivo.frecuencia === "SEMANAL" ? "semana" : "mes";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <p className="text-lg text-t-secondary">
        ¡Hola, <span className="font-bold text-t-primary">{cliente?.nombre}</span>!
      </p>

      {/* Moto card */}
      {moto && (
        <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
              Tu moto
            </h3>
          </div>
          <div className="p-5 flex gap-5 items-center">
            <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-bg-input shrink-0">
              {moto.foto ? (
                <Image src={moto.foto} alt={`${moto.marca} ${moto.modelo}`} fill className="object-cover" sizes="112px" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Bike className="h-10 w-10 text-t-tertiary/30" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-lg text-t-primary">
                {moto.marca} {moto.modelo}
              </p>
              <p className="text-sm text-t-secondary">
                {moto.anio} · {moto.patente} · {moto.color}
              </p>
              <p className="text-sm text-t-secondary">
                {moto.km.toLocaleString("es-AR")} km
              </p>
              <DSBadge variant={moto.estado === "ALQUILADA" ? "positive" : "warning"}>
                {moto.estado === "ALQUILADA" ? "En servicio" : moto.estado}
              </DSBadge>
            </div>
          </div>
        </div>
      )}

      {/* Contrato + próximo pago */}
      <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
            Tu contrato
          </h3>
          <span className="text-xs text-t-tertiary">{contratoActivo.numero}</span>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-t-primary">{contratoActivo.plan}</p>
              <p className="text-sm text-t-secondary">
                Desde {formatDate(contratoActivo.fechaInicio)}
              </p>
            </div>
            <DSBadge variant="positive">{contratoActivo.estado}</DSBadge>
          </div>

          {/* Próximo pago */}
          {proximoPago && (
            <div className="rounded-xl border border-border bg-bg-input/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-t-secondary">Cuota {proximoPago.numero}</p>
                {proximoPago.diasRestantes !== null && (
                  <span
                    className={
                      proximoPago.diasRestantes < 0
                        ? "text-xs font-medium text-red-400"
                        : proximoPago.diasRestantes <= 7
                          ? "text-xs font-medium text-yellow-400"
                          : "text-xs text-t-tertiary"
                    }
                  >
                    {proximoPago.diasRestantes < 0 ? (
                      <>
                        <AlertTriangle className="inline h-3 w-3 mr-1" />
                        Vencida hace {Math.abs(proximoPago.diasRestantes)} días
                      </>
                    ) : proximoPago.diasRestantes === 0 ? (
                      "Vence hoy"
                    ) : (
                      <>
                        <Clock className="inline h-3 w-3 mr-1" />
                        {proximoPago.diasRestantes} días
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-display font-extrabold text-2xl text-[var(--ds-accent)]">
                    {formatMoney(proximoPago.monto)}
                  </p>
                  <p className="text-xs text-t-tertiary">
                    Vto: {formatDate(proximoPago.fechaVencimiento)}
                  </p>
                </div>
                <Button asChild>
                  <Link href="/mi-cuenta/pagos">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar cuota
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Summary */}
          {resumenPagos && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-t-secondary">
                  {resumenPagos.pagosAlDia} al día
                </span>
              </div>
              {resumenPagos.pagosVencidos > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400">
                    {resumenPagos.pagosVencidos} vencidas
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LTO progress */}
          {contratoActivo.incluyeTransferencia && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-t-secondary">Progreso Lease-to-Own</span>
                <span className="font-medium text-t-primary">
                  {contratoActivo.cuotasPagadas}/{contratoActivo.cuotasTotal} ({contratoActivo.progreso}%)
                </span>
              </div>
              <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--ds-accent)] to-[var(--ds-info)] rounded-full transition-all"
                  style={{ width: `${contratoActivo.progreso}%` }}
                />
              </div>
              <p className="text-xs text-t-tertiary">
                {contratoActivo.cuotasTotal - contratoActivo.cuotasPagadas > 0
                  ? `Faltan ${contratoActivo.cuotasTotal - contratoActivo.cuotasPagadas} cuotas para que la moto sea tuya`
                  : "¡Todas las cuotas pagas! La moto es tuya."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Últimos pagos */}
      {ultimosPagos.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
              Últimos pagos
            </h3>
            <Link
              href="/mi-cuenta/pagos"
              className="text-xs text-[var(--ds-accent)] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-border">
            {ultimosPagos.map((pago) => (
              <div key={pago.cuotaNumero} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-t-primary">Cuota {pago.cuotaNumero}</p>
                    <p className="text-xs text-t-tertiary">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(pago.fechaPago)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-t-primary">
                  {formatMoney(pago.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
