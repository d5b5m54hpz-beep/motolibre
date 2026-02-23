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
import { formatMoney } from "@/lib/format";
import { Users, Plus } from "lucide-react";

interface Empleado {
  id: string;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  departamento: string;
  cargo: string;
  estado: string;
  sueldoBasico: number;
  jornada: string;
  _count: {
    ausencias: number;
    recibos: number;
  };
}

const DEPARTAMENTOS = [
  "ADMINISTRACION",
  "OPERACIONES",
  "TALLER",
  "COMERCIAL",
  "GERENCIA",
];

const ESTADOS_EMPLEADO = ["ACTIVO", "LICENCIA", "SUSPENDIDO", "DESVINCULADO"];

const JORNADAS = ["COMPLETA", "MEDIA", "REDUCIDA"];

const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "bg-green-500/10 text-green-500 border-green-500/20",
  LICENCIA: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  SUSPENDIDO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DESVINCULADO: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function EmpleadosPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-t-secondary">Cargando...</div>
      }
    >
      <EmpleadosContent />
    </Suspense>
  );
}

function EmpleadosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filtroDepartamento, setFiltroDepartamento] = useState(
    searchParams.get("departamento") || ""
  );
  const [filtroEstado, setFiltroEstado] = useState(
    searchParams.get("estado") || ""
  );
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    departamento: "ADMINISTRACION",
    cargo: "",
    fechaIngreso: "",
    sueldoBasico: 0,
    jornada: "COMPLETA",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroDepartamento && filtroDepartamento !== "all")
      params.set("departamento", filtroDepartamento);
    if (filtroEstado && filtroEstado !== "all")
      params.set("estado", filtroEstado);
    if (search) params.set("q", search);

    const res = await fetch(`/api/rrhh/empleados?${params}`);
    if (res.ok) {
      const j = await res.json();
      setEmpleados(j.data);
    }
    setLoading(false);
  }, [filtroDepartamento, filtroEstado, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreate() {
    if (!form.nombre || !form.apellido || !form.dni || !form.cargo || !form.fechaIngreso) return;
    const res = await fetch("/api/rrhh/empleados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sueldoBasico: Number(form.sueldoBasico),
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({
        nombre: "",
        apellido: "",
        dni: "",
        departamento: "ADMINISTRACION",
        cargo: "",
        fechaIngreso: "",
        sueldoBasico: 0,
        jornada: "COMPLETA",
      });
      void fetchData();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Gestión del personal de MotoLibre"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo Empleado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={form.nombre}
                      onChange={(e) =>
                        setForm({ ...form, nombre: e.target.value })
                      }
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <Label>Apellido *</Label>
                    <Input
                      value={form.apellido}
                      onChange={(e) =>
                        setForm({ ...form, apellido: e.target.value })
                      }
                      placeholder="Pérez"
                    />
                  </div>
                </div>
                <div>
                  <Label>DNI *</Label>
                  <Input
                    value={form.dni}
                    onChange={(e) =>
                      setForm({ ...form, dni: e.target.value })
                    }
                    placeholder="12345678"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Departamento</Label>
                    <Select
                      value={form.departamento}
                      onValueChange={(v) =>
                        setForm({ ...form, departamento: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTAMENTOS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cargo *</Label>
                    <Input
                      value={form.cargo}
                      onChange={(e) =>
                        setForm({ ...form, cargo: e.target.value })
                      }
                      placeholder="Analista"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha de Ingreso *</Label>
                    <Input
                      type="date"
                      value={form.fechaIngreso}
                      onChange={(e) =>
                        setForm({ ...form, fechaIngreso: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Jornada</Label>
                    <Select
                      value={form.jornada}
                      onValueChange={(v) => setForm({ ...form, jornada: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JORNADAS.map((j) => (
                          <SelectItem key={j} value={j}>
                            {j}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Sueldo Básico</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.sueldoBasico}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sueldoBasico: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !form.nombre ||
                    !form.apellido ||
                    !form.dni ||
                    !form.cargo ||
                    !form.fechaIngreso
                  }
                  className="w-full"
                >
                  Crear Empleado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label>Departamento</Label>
          <Select
            value={filtroDepartamento}
            onValueChange={setFiltroDepartamento}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {DEPARTAMENTOS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS_EMPLEADO.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input
            placeholder="Nombre, legajo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-5 w-5" /> Empleados ({empleados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-t-secondary">Cargando...</p>
          ) : empleados.length === 0 ? (
            <p className="text-center py-8 text-t-secondary">
              No hay empleados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">
                      Legajo
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">
                      Nombre Completo
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">
                      Departamento
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">
                      Cargo
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">
                      Sueldo
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">
                      Estado
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-border hover:bg-bg-card-hover transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/rrhh/empleados/${e.id}`)
                      }
                    >
                      <td className="py-3 px-2 font-mono font-medium text-xs">
                        {e.legajo}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-t-primary">
                          {e.apellido}, {e.nombre}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {e.departamento}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-t-secondary">{e.cargo}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">
                        {formatMoney(Number(e.sueldoBasico))}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${ESTADO_COLORS[e.estado] ?? ""}`}
                        >
                          {e.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            router.push(`/admin/rrhh/empleados/${e.id}`);
                          }}
                        >
                          Ver
                        </Button>
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
