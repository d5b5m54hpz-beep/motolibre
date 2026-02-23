"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Users, DollarSign, CalendarOff, Receipt,
  UserPlus, Calculator, Check, X,
} from "lucide-react";

interface Stats {
  empleadosActivos: number;
  masaSalarial: number;
  ausenciasEsteMes: number;
  costoTotalMes: number;
}

interface Ausencia {
  id: string;
  tipo: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
  diasHabiles: number;
  motivo: string | null;
  empleado: {
    nombre: string;
    apellido: string;
    legajo: string;
  };
}

export default function RRHHDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, ausRes] = await Promise.all([
      fetch("/api/rrhh/stats"),
      fetch("/api/rrhh/ausencias?estado=SOLICITADA"),
    ]);

    if (statsRes.ok) {
      const j = await statsRes.json();
      setStats(j.data);
    }
    if (ausRes.ok) {
      const j = await ausRes.json();
      setAusencias(j.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleAusencia(id: string, estado: "APROBADA" | "RECHAZADA") {
    setProcessingId(id);
    const res = await fetch(`/api/rrhh/ausencias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      setAusencias((prev) => prev.filter((a) => a.id !== id));
    }
    setProcessingId(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recursos Humanos"
          description="Panel de gestión de personal"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos Humanos"
        description="Panel de gestión de personal"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/rrhh/empleados">
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </Link>
            <Link href="/admin/rrhh/liquidacion">
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Liquidar Mes
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Empleados Activos</p>
                <p className="text-2xl font-bold text-t-primary">
                  {stats?.empleadosActivos ?? 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-ds-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Masa Salarial</p>
                <p className="text-2xl font-bold text-t-primary">
                  {formatMoney(stats?.masaSalarial ?? 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-positive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Ausencias Este Mes</p>
                <p className={`text-2xl font-bold ${(stats?.ausenciasEsteMes ?? 0) > 0 ? "text-warning" : "text-t-primary"}`}>
                  {stats?.ausenciasEsteMes ?? 0}
                </p>
              </div>
              <CalendarOff className={`h-8 w-8 ${(stats?.ausenciasEsteMes ?? 0) > 0 ? "text-warning" : "text-t-tertiary"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-t-secondary">Costo Total Mes</p>
                <p className="text-2xl font-bold text-t-primary">
                  {formatMoney(stats?.costoTotalMes ?? 0)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-accent-DEFAULT" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ausencias pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarOff className="h-5 w-5" />
            Ausencias pendientes de aprobación ({ausencias.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ausencias.length === 0 ? (
            <p className="text-sm text-t-secondary text-center py-8">
              No hay ausencias pendientes de aprobación
            </p>
          ) : (
            <div className="space-y-3">
              {ausencias.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border border-border rounded-2xl p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-t-primary">
                        {a.empleado.apellido}, {a.empleado.nombre}
                      </span>
                      <span className="text-xs text-t-tertiary">
                        ({a.empleado.legajo})
                      </span>
                      <StatusBadge status={a.tipo} />
                    </div>
                    <p className="text-sm text-t-secondary mt-1">
                      {formatDate(a.fechaDesde)} — {formatDate(a.fechaHasta)} ·{" "}
                      {a.diasHabiles} día{a.diasHabiles !== 1 ? "s" : ""} hábil
                      {a.diasHabiles !== 1 ? "es" : ""}
                    </p>
                    {a.motivo && (
                      <p className="text-xs text-t-tertiary mt-1">{a.motivo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-positive border-positive/30 hover:bg-positive/10"
                      disabled={processingId === a.id}
                      onClick={() => handleAusencia(a.id, "APROBADA")}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-negative border-negative/30 hover:bg-negative/10"
                      disabled={processingId === a.id}
                      onClick={() => handleAusencia(a.id, "RECHAZADA")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
