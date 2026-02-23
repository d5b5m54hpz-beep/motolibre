"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfiguracionEmpresa {
  id: string;
  razonSocial: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  condicionIva:
    | "RESPONSABLE_INSCRIPTO"
    | "MONOTRIBUTISTA"
    | "EXENTO"
    | "CONSUMIDOR_FINAL";
  moneda: string;
  ivaDefault: number;
  diasGraciaVencimiento: number;
  diasReservaMaxima: number;
  puntoVenta: number;
  tipoFacturaDefault: string;
  emailNotificaciones: string;
}

const CONDICION_IVA_OPTIONS: {
  value: ConfiguracionEmpresa["condicionIva"];
  label: string;
}[] = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable Inscripto" },
  { value: "MONOTRIBUTISTA", label: "Monotributista" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor Final" },
];

const TIPO_FACTURA_OPTIONS = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
  { value: "C", label: "Factura C" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfiguracionEmpresaPage() {
  const [data, setData] = useState<ConfiguracionEmpresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Form state ──
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [condicionIva, setCondicionIva] =
    useState<ConfiguracionEmpresa["condicionIva"]>("RESPONSABLE_INSCRIPTO");
  const [moneda, setMoneda] = useState("");
  const [ivaDefault, setIvaDefault] = useState(21);
  const [diasGraciaVencimiento, setDiasGraciaVencimiento] = useState(0);
  const [diasReservaMaxima, setDiasReservaMaxima] = useState(0);
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [tipoFacturaDefault, setTipoFacturaDefault] = useState("A");
  const [emailNotificaciones, setEmailNotificaciones] = useState("");

  // ── Populate form from fetched data ──
  const populateForm = useCallback((d: ConfiguracionEmpresa) => {
    setRazonSocial(d.razonSocial);
    setCuit(d.cuit);
    setDireccion(d.direccion);
    setTelefono(d.telefono);
    setEmail(d.email);
    setCondicionIva(d.condicionIva);
    setMoneda(d.moneda);
    setIvaDefault(d.ivaDefault);
    setDiasGraciaVencimiento(d.diasGraciaVencimiento);
    setDiasReservaMaxima(d.diasReservaMaxima);
    setPuntoVenta(d.puntoVenta);
    setTipoFacturaDefault(d.tipoFacturaDefault);
    setEmailNotificaciones(d.emailNotificaciones);
  }, []);

  // ── Fetch config ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/configuracion/empresa");
        if (!res.ok) throw new Error("Error al cargar configuracion");
        const json = await res.json();
        const config: ConfiguracionEmpresa = json.data;
        setData(config);
        populateForm(config);
      } catch {
        toast.error("No se pudo cargar la configuracion de la empresa");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [populateForm]);

  // ── Save config ──
  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        razonSocial,
        cuit,
        direccion,
        telefono,
        email,
        condicionIva,
        moneda,
        ivaDefault,
        diasGraciaVencimiento,
        diasReservaMaxima,
        puntoVenta,
        tipoFacturaDefault,
        emailNotificaciones,
      };

      const res = await fetch("/api/configuracion/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Error al guardar");
      }

      const json = await res.json();
      setData(json.data);
      toast.success("Configuracion guardada correctamente");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar configuracion";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Configuracion de la Empresa"
          description="Datos fiscales, operativos y de facturacion"
        />
        <div className="flex flex-col items-center justify-center py-20 text-t-tertiary">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Cargando configuracion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracion de la Empresa"
        description="Datos fiscales, operativos y de facturacion"
      />

      {/* ── Card 1: Datos Fiscales ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h2 className="text-lg font-display font-bold text-t-primary mb-5">
          Datos Fiscales
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Razon Social */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Razon Social
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="Nombre de la empresa"
            />
          </div>

          {/* CUIT */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">CUIT</label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="XX-XXXXXXXX-X"
            />
          </div>

          {/* Direccion */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Direccion
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="Calle, numero, ciudad"
            />
          </div>

          {/* Telefono */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Telefono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="+54 11 XXXX-XXXX"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="empresa@ejemplo.com"
            />
          </div>

          {/* Condicion IVA */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Condicion ante IVA
            </label>
            <select
              value={condicionIva}
              onChange={(e) =>
                setCondicionIva(
                  e.target.value as ConfiguracionEmpresa["condicionIva"],
                )
              }
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            >
              {CONDICION_IVA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Card 2: Configuracion Operativa ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h2 className="text-lg font-display font-bold text-t-primary mb-5">
          Configuracion Operativa
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Moneda */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">Moneda</label>
            <input
              type="text"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="ARS"
            />
          </div>

          {/* IVA Default */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              IVA por defecto (%)
            </label>
            <input
              type="number"
              value={ivaDefault}
              onChange={(e) => setIvaDefault(Number(e.target.value))}
              min={0}
              max={100}
              step={0.01}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            />
          </div>

          {/* Dias gracia vencimiento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Dias de gracia (vencimiento)
            </label>
            <input
              type="number"
              value={diasGraciaVencimiento}
              onChange={(e) => setDiasGraciaVencimiento(Number(e.target.value))}
              min={0}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            />
          </div>

          {/* Dias reserva maxima */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Dias de reserva maxima
            </label>
            <input
              type="number"
              value={diasReservaMaxima}
              onChange={(e) => setDiasReservaMaxima(Number(e.target.value))}
              min={0}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            />
          </div>

          {/* Email notificaciones */}
          <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
            <label className="text-sm font-medium text-t-secondary">
              Email de notificaciones
            </label>
            <input
              type="email"
              value={emailNotificaciones}
              onChange={(e) => setEmailNotificaciones(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
              placeholder="notificaciones@empresa.com"
            />
          </div>
        </div>
      </div>

      {/* ── Card 3: Facturacion ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h2 className="text-lg font-display font-bold text-t-primary mb-5">
          Facturacion
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Punto de Venta */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Punto de Venta
            </label>
            <input
              type="number"
              value={puntoVenta}
              onChange={(e) => setPuntoVenta(Number(e.target.value))}
              min={1}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            />
          </div>

          {/* Tipo Factura Default */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-t-secondary">
              Tipo de factura por defecto
            </label>
            <select
              value={tipoFacturaDefault}
              onChange={(e) => setTipoFacturaDefault(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            >
              {TIPO_FACTURA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-accent-DEFAULT hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
