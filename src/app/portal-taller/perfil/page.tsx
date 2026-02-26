"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function PerfilPortalPage() {
  const [form, setForm] = useState({
    passwordActual: "",
    passwordNueva: "",
    passwordConfirm: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCambiar() {
    if (form.passwordNueva !== form.passwordConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (form.passwordNueva.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/portal-taller/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordActual: form.passwordActual,
          passwordNueva: form.passwordNueva,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Error al cambiar contraseña");
      }

      toast.success("Contraseña actualizada correctamente");
      setDone(true);
      setForm({ passwordActual: "", passwordNueva: "", passwordConfirm: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Link href="/portal-taller">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al dashboard
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Seguridad</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Actualizá tu contraseña de acceso al portal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <ShieldCheck className="h-10 w-10 text-positive" />
              <p className="font-medium">Contraseña actualizada</p>
              <p className="text-sm text-muted-foreground">
                Tu nueva contraseña está activa.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDone(false)}
              >
                Cambiar nuevamente
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label>Contraseña actual</Label>
                <Input
                  type="password"
                  value={form.passwordActual}
                  onChange={(e) =>
                    setForm({ ...form, passwordActual: e.target.value })
                  }
                  placeholder="Tu contraseña actual"
                />
              </div>
              <div>
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={form.passwordNueva}
                  onChange={(e) =>
                    setForm({ ...form, passwordNueva: e.target.value })
                  }
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <Label>Confirmar nueva contraseña</Label>
                <Input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) =>
                    setForm({ ...form, passwordConfirm: e.target.value })
                  }
                  placeholder="Repetí la nueva contraseña"
                />
              </div>
              <Button
                onClick={handleCambiar}
                disabled={
                  saving ||
                  !form.passwordActual ||
                  !form.passwordNueva ||
                  !form.passwordConfirm
                }
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Actualizar Contraseña
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
