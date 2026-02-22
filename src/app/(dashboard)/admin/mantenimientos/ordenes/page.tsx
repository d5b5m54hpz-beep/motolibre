"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  Timer,
} from "lucide-react";
interface OT {
  id: string;
  numero: string;
  tipo: string;
  prioridad: string;
  tipoService: string | null;
  estado: string;
  motoId: string;
  descripcion: string;
  fechaSolicitud: string;
  fechaProgramada: string | null;
  costoTotal: number | null;
  _count: { tareas: number; repuestos: number };
}

interface Stats {
  otActivas: number;
  otCompletadasMes: number;
  costoTotalMes: number;
  tiempoPromedioResolucion: number;
}

const ESTADOS_OT = [
  "SOLICITADA",
  "APROBADA",
  "PROGRAMADA",
  "EN_ESPERA_REPUESTOS",
  "EN_EJECUCION",
  "EN_REVISION",
  "COMPLETADA",
  "CANCELADA",
];

const TIPOS_OT = ["PREVENTIVO", "CORRECTIVO", "EMERGENCIA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const ESTADO_COLORS: Record<string, string> = {
  SOLICITADA: "bg-t-secondary/10 text-t-secondary border-border",
  APROBADA: "bg-info-bg text-ds-info border-ds-info/20",
  PROGRAMADA: "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20",
  EN_ESPERA_REPUESTOS: "bg-warning-bg text-warning border-warning/20",
  EN_EJECUCION: "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20",
  EN_REVISION: "bg-info-bg text-ds-info border-ds-info/20",
  COMPLETADA: "bg-positive-bg text-positive border-positive/20",
  CANCELADA: "bg-negative-bg text-negative border-negative/20",
};

const PRIORIDAD_COLORS: Record<string, string> = {
  BAJA: "bg-t-tertiary/10 text-t-tertiary",
  MEDIA: "bg-info-bg text-ds-info",
  ALTA: "bg-warning-bg text-warning",
  URGENTE: "bg-negative-bg text-negative",
};

export default function OrdenesTrabajoPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Cargando...</div>}>
      <OrdenesTrabajoContent />
    </Suspense>
  );
}

function OrdenesTrabajoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ordenes, setOrdenes] = useState<OT[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtros
  const [estado, setEstado] = useState(searchParams.get("estado") || "");
  const [tipo, setTipo] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [search, setSearch] = useState("");

  // Nuevo OT form
  const [form, setForm] = useState({
    tipo: "CORRECTIVO",
    prioridad: "MEDIA",
    motoId: "",
    descripcion: "",
    tipoService: "",
  });
  const [motos, setMotos] = useState<Array<{ id: string; patente: string; marca: string; modelo: string }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (tipo) params.set("tipo", tipo);
    if (prioridad) params.set("prioridad", prioridad);
    if (search) params.set("search", search);

    const [r1, r2] = await Promise.all([
      fetch(`/api/mantenimientos/ordenes?${params}`),
      fetch("/api/mantenimientos/estadisticas"),
    ]);

    if (r1.ok) {
      const j = await r1.json();
      setOrdenes(j.data);
      setTotal(j.total);
    }
    if (r2.ok) {
      const j = await r2.json();
      setStats(j.data);
    }
    setLoading(false);
  }, [estado, tipo, prioridad, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetch("/api/motos?limit=200").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        setMotos(j.data);
      }
    });
  }, []);

  async function handleCreate() {
    if (!form.motoId || !form.descripcion) return;
    const res = await fetch("/api/mantenimientos/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tipoService: form.tipoService || undefined,
      }),
    });
    if (res.ok) {
      const j = await res.json();
      setDialogOpen(false);
      router.push(`/admin/mantenimientos/ordenes/${j.data.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de Trabajo"
        description="Gestión de mantenimientos y reparaciones"
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OTs Activas</p>
                  <p className="text-2xl font-bold">{stats.otActivas}</p>
                </div>
                <Clock className="h-8 w-8 text-ds-info" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas (mes)</p>
                  <p className="text-2xl font-bold text-positive">{stats.otCompletadasMes}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-positive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Costo Total (mes)</p>
                  <p className="text-2xl font-bold">{formatMoney(stats.costoTotalMes)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                  <p className="text-2xl font-bold">
                    {stats.tiempoPromedioResolucion > 0
                      ? `${stats.tiempoPromedioResolucion.toFixed(1)} días`
                      : "N/A"}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-accent-DEFAULT" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros + Nueva OT */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS_OT.map((e) => (
                <SelectItem key={e} value={e}>
                  {e.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS_OT.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridad</Label>
          <Select value={prioridad} onValueChange={setPrioridad}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input
            placeholder="Número, descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px]"
          />
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nueva OT
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Moto *</Label>
                  <Select value={form.motoId} onValueChange={(v) => setForm({ ...form, motoId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moto" />
                    </SelectTrigger>
                    <SelectContent>
                      {motos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.patente} — {m.marca} {m.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_OT.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridad</Label>
                    <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORIDADES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descripción *</Label>
                  <Textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Qué se necesita hacer..."
                  />
                </div>
                <Button onClick={handleCreate} disabled={!form.motoId || !form.descripcion} className="w-full">
                  Crear OT
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Órdenes de Trabajo ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : ordenes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay órdenes de trabajo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Número</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Moto</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Prioridad</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Costo</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Tareas</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((ot) => (
                    <tr
                      key={ot.id}
                      className="border-b hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/mantenimientos/ordenes/${ot.id}`)}
                    >
                      <td className="py-3 px-2 font-mono font-medium">{ot.numero}</td>
                      <td className="py-3 px-2">
                        <MotoLabel motoId={ot.motoId} motos={motos} />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className="text-xs">{ot.tipo}</Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={`text-xs ${PRIORIDAD_COLORS[ot.prioridad] ?? ""}`}>
                          {ot.prioridad}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={`text-xs ${ESTADO_COLORS[ot.estado] ?? ""}`}>
                          {ot.estado.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                        {ot.fechaProgramada
                          ? formatDate(new Date(ot.fechaProgramada))
                          : formatDate(new Date(ot.fechaSolicitud))}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {ot.costoTotal ? formatMoney(Number(ot.costoTotal)) : "-"}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                        {ot._count.tareas}T / {ot._count.repuestos}R
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MotoLabel({
  motoId,
  motos,
}: {
  motoId: string;
  motos: Array<{ id: string; patente: string; marca: string; modelo: string }>;
}) {
  const moto = motos.find((m) => m.id === motoId);
  if (!moto) return <span className="text-muted-foreground text-xs">{motoId.slice(0, 8)}</span>;
  return (
    <div>
      <span className="font-medium">{moto.marca} {moto.modelo}</span>
      <br />
      <span className="text-xs text-muted-foreground">{moto.patente}</span>
    </div>
  );
}
