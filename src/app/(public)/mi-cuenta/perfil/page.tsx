"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save } from "lucide-react";

interface PerfilData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  calle: string | null;
  numero: string | null;
  piso: string | null;
  depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
}

interface CuentaData {
  email: string;
  provider: string;
  createdAt: string;
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [cuenta, setCuenta] = useState<CuentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    email: "",
    telefono: "",
    calle: "",
    numero: "",
    piso: "",
    depto: "",
    localidad: "",
    provincia: "",
    codigoPostal: "",
  });

  useEffect(() => {
    fetch("/api/mi-cuenta/perfil")
      .then((r) => r.json())
      .then((json) => {
        const c = json.data.cliente;
        if (c) {
          setPerfil(c);
          setForm({
            email: c.email ?? "",
            telefono: c.telefono ?? "",
            calle: c.calle ?? "",
            numero: c.numero ?? "",
            piso: c.piso ?? "",
            depto: c.depto ?? "",
            localidad: c.localidad ?? "",
            provincia: c.provincia ?? "",
            codigoPostal: c.codigoPostal ?? "",
          });
        }
        setCuenta(json.data.cuenta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/mi-cuenta/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email || undefined,
          telefono: form.telefono || undefined,
          calle: form.calle || null,
          numero: form.numero || null,
          piso: form.piso || null,
          depto: form.depto || null,
          localidad: form.localidad || null,
          provincia: form.provincia || null,
          codigoPostal: form.codigoPostal || null,
        }),
      });
      if (res.ok) {
        setMessage({ type: "ok", text: "Perfil actualizado" });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error ?? "Error al guardar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card/80 p-8 text-center">
        <p className="text-t-secondary">
          No tenés un perfil de cliente. Alquilá una moto para crear tu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only card */}
      <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
            Datos personales
          </h3>
          <p className="text-xs text-t-tertiary mt-1">
            Para modificar nombre o DNI contactá a soporte
          </p>
        </div>
        <div className="p-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-t-tertiary">Nombre</p>
            <p className="text-t-primary font-medium">{perfil.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-t-tertiary">Apellido</p>
            <p className="text-t-primary font-medium">{perfil.apellido}</p>
          </div>
          <div>
            <p className="text-xs text-t-tertiary">DNI</p>
            <p className="text-t-primary font-medium">{perfil.dni}</p>
          </div>
        </div>
      </div>

      {/* Editable form */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
              Datos de contacto
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            <p className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
              Dirección
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calle">Calle</Label>
                <Input
                  id="calle"
                  value={form.calle}
                  onChange={(e) => setForm((p) => ({ ...p, calle: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="num">N°</Label>
                  <Input
                    id="num"
                    value={form.numero}
                    onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piso">Piso</Label>
                  <Input
                    id="piso"
                    value={form.piso}
                    onChange={(e) => setForm((p) => ({ ...p, piso: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depto">Depto</Label>
                  <Input
                    id="depto"
                    value={form.depto}
                    onChange={(e) => setForm((p) => ({ ...p, depto: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="localidad">Localidad</Label>
                <Input
                  id="localidad"
                  value={form.localidad}
                  onChange={(e) => setForm((p) => ({ ...p, localidad: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={form.provincia}
                  onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp">Código Postal</Label>
                <Input
                  id="cp"
                  value={form.codigoPostal}
                  onChange={(e) => setForm((p) => ({ ...p, codigoPostal: e.target.value }))}
                />
              </div>
            </div>

            {message && (
              <p className={message.type === "ok" ? "text-sm text-green-500" : "text-sm text-red-500"}>
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>

      {/* Account info */}
      {cuenta && (
        <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-xs text-t-tertiary uppercase tracking-wider font-medium">
              Cuenta
            </h3>
          </div>
          <div className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-t-secondary">Conectado con:</span>
              <span className="text-sm text-t-primary font-medium capitalize">
                {cuenta.provider === "credentials" ? "Email y contraseña" : cuenta.provider}
              </span>
            </div>
            <p className="text-sm text-t-secondary">
              Email de cuenta: {cuenta.email}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
