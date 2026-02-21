"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, XCircle, Save } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface LineaForm {
  cuentaId: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  descripcion: string;
}

interface CuentaOption {
  id: string;
  codigo: string;
  nombre: string;
}

export default function NuevoAsientoPage() {
  const router = useRouter();
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [descripcion, setDescripcion] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([
    { cuentaId: "", cuentaCodigo: "", cuentaNombre: "", debe: 0, haber: 0, descripcion: "" },
    { cuentaId: "", cuentaCodigo: "", cuentaNombre: "", debe: 0, haber: 0, descripcion: "" },
  ]);
  const [cuentas, setCuentas] = useState<CuentaOption[]>([]);
  const [cuentasLoaded, setCuentasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0);
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0);
  const balancea = Math.abs(totalDebe - totalHaber) < 0.01 && totalDebe > 0;

  async function loadCuentas() {
    if (cuentasLoaded) return;
    const res = await fetch("/api/cuentas-contables?soloMovimientos=true");
    if (res.ok) {
      const json = await res.json();
      setCuentas(json.data.map((c: CuentaOption) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre })));
      setCuentasLoaded(true);
    }
  }

  function updateLinea(index: number, field: keyof LineaForm, value: string | number) {
    setLineas((prev) =>
      prev.map((linea, i) => {
        if (i !== index) return linea;
        if (field === "cuentaId") {
          const cuenta = cuentas.find((c) => c.id === value);
          return {
            ...linea,
            cuentaId: value as string,
            cuentaCodigo: cuenta?.codigo ?? "",
            cuentaNombre: cuenta?.nombre ?? "",
          };
        }
        return { ...linea, [field]: value };
      })
    );
  }

  function addLinea() {
    setLineas([...lineas, { cuentaId: "", cuentaCodigo: "", cuentaNombre: "", debe: 0, haber: 0, descripcion: "" }]);
  }

  function removeLinea(index: number) {
    if (lineas.length <= 2) return toast.error("Mínimo 2 líneas");
    setLineas(lineas.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!descripcion.trim()) return toast.error("Descripción requerida");
    if (!balancea) return toast.error("El asiento no balancea");

    const invalidLineas = lineas.some((l) => !l.cuentaId || (l.debe === 0 && l.haber === 0));
    if (invalidLineas) return toast.error("Todas las líneas deben tener cuenta y monto");

    setSaving(true);
    try {
      const res = await fetch("/api/asientos-contables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          tipo: "MANUAL",
          descripcion,
          lineas: lineas.map((l) => ({
            cuentaId: l.cuentaId,
            debe: l.debe,
            haber: l.haber,
            descripcion: l.descripcion || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Error al crear asiento");
      }

      const json = await res.json();
      toast.success(`Asiento #${json.data.numero} creado`);
      router.push(`/admin/asientos/${json.data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear asiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Asiento Manual"
        description="Crear asiento contable en partida doble"
      />

      <Card>
        <CardHeader>
          <CardTitle>Datos del Asiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Badge variant="outline" className="text-sm py-1 px-3">MANUAL</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Ajuste contable por diferencia de cambio"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Líneas del Asiento</CardTitle>
          <Button variant="outline" size="sm" onClick={addLinea}>
            <Plus className="mr-1 h-4 w-4" /> Agregar Línea
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-80">Cuenta</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-36">DEBE</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-36">HABER</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descripción</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-2">
                      <select
                        className="w-full bg-background border rounded px-2 py-1.5 text-sm"
                        value={linea.cuentaId}
                        onFocus={loadCuentas}
                        onChange={(e) => updateLinea(i, "cuentaId", e.target.value)}
                      >
                        <option value="">Seleccionar cuenta...</option>
                        {cuentas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.codigo} — {c.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="text-right font-mono"
                        value={linea.debe || ""}
                        onChange={(e) => updateLinea(i, "debe", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="text-right font-mono"
                        value={linea.haber || ""}
                        onChange={(e) => updateLinea(i, "haber", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={linea.descripcion}
                        onChange={(e) => updateLinea(i, "descripcion", e.target.value)}
                        placeholder="Opcional"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLinea(i)}
                        disabled={lineas.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-3 px-2 text-right">TOTALES</td>
                  <td className="py-3 px-2 text-right font-mono">{formatMoney(totalDebe)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatMoney(totalHaber)}</td>
                  <td colSpan={2} className="py-3 px-2">
                    {balancea ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" /> Balancea
                      </span>
                    ) : totalDebe > 0 || totalHaber > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" /> No balancea (dif: {formatMoney(Math.abs(totalDebe - totalHaber))})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Ingrese montos</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSubmit}
              disabled={saving || !balancea}
              className="min-w-40"
            >
              {saving ? "Guardando..." : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar Asiento
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
