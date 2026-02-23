"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { Landmark, Plus, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ───────── Types ───────── */

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  tipo: string;
  numero: string | null;
  cbu: string | null;
  alias: string | null;
  saldo: number;
  activa: boolean;
}

interface Conciliacion {
  id: string;
  numero: string;
  periodoDesde: string;
  periodoHasta: string;
  estado: string;
  diferencia: number;
  totalMovimientos: number;
  movimientosConciliados: number;
  cuentaBancaria: {
    id: string;
    nombre: string;
  };
}

interface CsvRow {
  fecha: string;
  descripcion: string;
  monto: string;
}

/* ───────── Page ───────── */

export default function ConciliacionPage() {
  const router = useRouter();

  /* Shared state */
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [conciliaciones, setConciliaciones] = useState<Conciliacion[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(true);
  const [loadingConciliaciones, setLoadingConciliaciones] = useState(true);

  /* Tab 1 — Nueva Cuenta dialog */
  const [cuentaDialogOpen, setCuentaDialogOpen] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({
    nombre: "",
    banco: "",
    tipo: "CORRIENTE",
    numero: "",
    cbu: "",
    alias: "",
  });
  const [creatingCuenta, setCreatingCuenta] = useState(false);

  /* Tab 2 — Filters */
  const [filtroCuentaId, setFiltroCuentaId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  /* Tab 2 — Nueva Conciliacion dialog */
  const [concDialogOpen, setConcDialogOpen] = useState(false);
  const [concForm, setConcForm] = useState({
    cuentaBancariaId: "",
    periodoDesde: "",
    periodoHasta: "",
  });
  const [creatingConc, setCreatingConc] = useState(false);

  /* Tab 3 — Import */
  const [importCuentaId, setImportCuentaId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);

  /* ───────── Data fetching ───────── */

  const fetchCuentas = useCallback(async () => {
    setLoadingCuentas(true);
    const res = await fetch("/api/conciliacion/cuentas");
    if (res.ok) {
      const j = await res.json();
      setCuentas(j.data);
    }
    setLoadingCuentas(false);
  }, []);

  const fetchConciliaciones = useCallback(async () => {
    setLoadingConciliaciones(true);
    const params = new URLSearchParams();
    if (filtroCuentaId && filtroCuentaId !== "all")
      params.set("cuentaBancariaId", filtroCuentaId);
    if (filtroEstado && filtroEstado !== "all")
      params.set("estado", filtroEstado);

    const res = await fetch(`/api/conciliacion?${params}`);
    if (res.ok) {
      const j = await res.json();
      setConciliaciones(j.data);
    }
    setLoadingConciliaciones(false);
  }, [filtroCuentaId, filtroEstado]);

  useEffect(() => {
    void fetchCuentas();
  }, [fetchCuentas]);

  useEffect(() => {
    void fetchConciliaciones();
  }, [fetchConciliaciones]);

  /* ───────── Handlers ───────── */

  async function handleCreateCuenta() {
    if (!cuentaForm.nombre || !cuentaForm.banco) return;
    setCreatingCuenta(true);
    const res = await fetch("/api/conciliacion/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: cuentaForm.nombre,
        banco: cuentaForm.banco,
        tipo: cuentaForm.tipo,
        numero: cuentaForm.numero || undefined,
        cbu: cuentaForm.cbu || undefined,
        alias: cuentaForm.alias || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Cuenta bancaria creada");
      setCuentaDialogOpen(false);
      setCuentaForm({
        nombre: "",
        banco: "",
        tipo: "CORRIENTE",
        numero: "",
        cbu: "",
        alias: "",
      });
      void fetchCuentas();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error ?? "Error al crear la cuenta");
    }
    setCreatingCuenta(false);
  }

  async function handleCreateConciliacion() {
    if (!concForm.cuentaBancariaId || !concForm.periodoDesde || !concForm.periodoHasta) return;
    setCreatingConc(true);
    const res = await fetch("/api/conciliacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(concForm),
    });
    if (res.status === 201 || res.ok) {
      const data = await res.json();
      const id = data.data?.id ?? data.id;
      router.push(`/admin/conciliacion/${id}`);
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error ?? "Error al crear la conciliación");
    }
    setCreatingConc(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);

      // Parse CSV preview (first 10 data rows)
      const lines = text.split("\n").filter((l) => l.trim());
      const rows: CsvRow[] = [];
      for (let i = 1; i < lines.length && rows.length < 10; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 3) {
          rows.push({
            fecha: cols[0] ?? "",
            descripcion: cols[1] ?? "",
            monto: cols[2] ?? "",
          });
        }
      }
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importCuentaId || !csvText) return;
    setImporting(true);
    const res = await fetch("/api/conciliacion/extractos/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuentaBancariaId: importCuentaId, csv: csvText }),
    });
    if (res.ok) {
      const data = await res.json();
      const importados = data.data?.importados ?? data.importados ?? 0;
      toast.success(`${importados} movimientos importados`);
      setCsvText("");
      setCsvPreview([]);
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error ?? "Error al importar extracto");
    }
    setImporting(false);
  }

  /* ───────── Loading skeleton ───────── */

  if (loadingCuentas && loadingConciliaciones) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conciliación Bancaria"
          description="Gestión de cuentas bancarias y conciliaciones"
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ───────── Render ───────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliación Bancaria"
        description="Gestión de cuentas bancarias y conciliaciones"
      />

      <Tabs defaultValue="cuentas">
        <TabsList>
          <TabsTrigger value="cuentas">Cuentas Bancarias</TabsTrigger>
          <TabsTrigger value="conciliaciones">Conciliaciones</TabsTrigger>
          <TabsTrigger value="importar">Importar Extracto</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Cuentas Bancarias ─── */}
        <TabsContent value="cuentas" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={cuentaDialogOpen} onOpenChange={setCuentaDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={cuentaForm.nombre}
                      onChange={(e) =>
                        setCuentaForm({ ...cuentaForm, nombre: e.target.value })
                      }
                      placeholder="Cuenta Principal"
                    />
                  </div>
                  <div>
                    <Label>Banco *</Label>
                    <Input
                      value={cuentaForm.banco}
                      onChange={(e) =>
                        setCuentaForm({ ...cuentaForm, banco: e.target.value })
                      }
                      placeholder="Banco Nación"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={cuentaForm.tipo}
                      onValueChange={(v) =>
                        setCuentaForm({ ...cuentaForm, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CORRIENTE">Corriente</SelectItem>
                        <SelectItem value="AHORRO">Ahorro</SelectItem>
                        <SelectItem value="MERCADOPAGO">MercadoPago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número de cuenta</Label>
                    <Input
                      value={cuentaForm.numero}
                      onChange={(e) =>
                        setCuentaForm({ ...cuentaForm, numero: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label>CBU</Label>
                    <Input
                      value={cuentaForm.cbu}
                      onChange={(e) =>
                        setCuentaForm({ ...cuentaForm, cbu: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label>Alias</Label>
                    <Input
                      value={cuentaForm.alias}
                      onChange={(e) =>
                        setCuentaForm({ ...cuentaForm, alias: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <Button
                    onClick={handleCreateCuenta}
                    disabled={!cuentaForm.nombre || !cuentaForm.banco || creatingCuenta}
                    className="w-full"
                  >
                    {creatingCuenta && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Landmark className="h-5 w-5" />
                Cuentas Bancarias ({cuentas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCuentas ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : cuentas.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  No hay cuentas bancarias registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-t-secondary">Nombre</th>
                        <th className="text-left pb-2 text-t-secondary">Banco</th>
                        <th className="text-left pb-2 text-t-secondary">Tipo</th>
                        <th className="text-left pb-2 text-t-secondary">CBU / Alias</th>
                        <th className="text-right pb-2 text-t-secondary">Saldo</th>
                        <th className="text-center pb-2 text-t-secondary">Activa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentas.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                        >
                          <td className="py-3 px-2 font-medium text-t-primary">
                            {c.nombre}
                          </td>
                          <td className="py-3 px-2 text-t-secondary">{c.banco}</td>
                          <td className="py-3 px-2 text-t-secondary">{c.tipo}</td>
                          <td className="py-3 px-2 text-t-secondary font-mono text-xs">
                            {c.cbu || c.alias || "—"}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums font-medium">
                            {formatMoney(Number(c.saldo))}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <StatusBadge status={c.activa ? "ACTIVO" : "DESVINCULADO"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Conciliaciones ─── */}
        <TabsContent value="conciliaciones" className="space-y-4 pt-4">
          {/* Filters + action */}
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label>Cuenta</Label>
              <Select value={filtroCuentaId} onValueChange={setFiltroCuentaId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                  <SelectItem value="COMPLETADA">Completada</SelectItem>
                  <SelectItem value="ANULADA">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <Dialog open={concDialogOpen} onOpenChange={setConcDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Conciliación
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nueva Conciliación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Cuenta Bancaria *</Label>
                      <Select
                        value={concForm.cuentaBancariaId}
                        onValueChange={(v) =>
                          setConcForm({ ...concForm, cuentaBancariaId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {cuentas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre} — {c.banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Período Desde *</Label>
                        <Input
                          type="date"
                          value={concForm.periodoDesde}
                          onChange={(e) =>
                            setConcForm({ ...concForm, periodoDesde: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Período Hasta *</Label>
                        <Input
                          type="date"
                          value={concForm.periodoHasta}
                          onChange={(e) =>
                            setConcForm({ ...concForm, periodoHasta: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateConciliacion}
                      disabled={
                        !concForm.cuentaBancariaId ||
                        !concForm.periodoDesde ||
                        !concForm.periodoHasta ||
                        creatingConc
                      }
                      className="w-full"
                    >
                      {creatingConc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Crear Conciliación
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-5 w-5" />
                Conciliaciones ({conciliaciones.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConciliaciones ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : conciliaciones.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  No hay conciliaciones registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-t-secondary">Número</th>
                        <th className="text-left pb-2 text-t-secondary">Cuenta</th>
                        <th className="text-left pb-2 text-t-secondary">Período</th>
                        <th className="text-center pb-2 text-t-secondary">Estado</th>
                        <th className="text-center pb-2 text-t-secondary">Conciliados / Total</th>
                        <th className="text-right pb-2 text-t-secondary">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conciliaciones.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors cursor-pointer"
                          onClick={() => router.push(`/admin/conciliacion/${c.id}`)}
                        >
                          <td className="py-3 px-2 font-mono text-xs font-medium">
                            {c.numero}
                          </td>
                          <td className="py-3 px-2 text-t-primary">
                            {c.cuentaBancaria.nombre}
                          </td>
                          <td className="py-3 px-2 text-t-secondary">
                            {formatDate(c.periodoDesde)} — {formatDate(c.periodoHasta)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <StatusBadge status={c.estado} />
                          </td>
                          <td className="py-3 px-2 text-center tabular-nums">
                            {c.movimientosConciliados} / {c.totalMovimientos}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums font-medium">
                            {formatMoney(Number(c.diferencia))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Importar Extracto ─── */}
        <TabsContent value="importar" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-5 w-5" />
                Importar Extracto Bancario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cuenta Bancaria *</Label>
                <Select value={importCuentaId} onValueChange={setImportCuentaId}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} — {c.banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Archivo CSV</Label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full max-w-sm text-sm text-t-secondary
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:bg-bg-card file:text-t-primary
                    hover:file:bg-bg-card-hover file:cursor-pointer file:transition-colors"
                />
              </div>

              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-t-primary">
                    Vista previa (primeras {csvPreview.length} filas)
                  </p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-bg-card">
                          <th className="text-left py-2 px-3 text-t-secondary">Fecha</th>
                          <th className="text-left py-2 px-3 text-t-secondary">Descripción</th>
                          <th className="text-right py-2 px-3 text-t-secondary">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-border last:border-0"
                          >
                            <td className="py-2 px-3 text-t-secondary">{row.fecha}</td>
                            <td className="py-2 px-3 text-t-primary">{row.descripcion}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono">
                              {row.monto}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!importCuentaId || !csvText || importing}
                className="w-full max-w-sm"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
