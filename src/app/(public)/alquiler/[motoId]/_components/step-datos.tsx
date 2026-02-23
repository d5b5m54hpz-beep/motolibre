"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Loader2, Mail } from "lucide-react";
import type { Session } from "next-auth";

interface StepDatosProps {
  motoId: string;
  planCodigo: string;
  session: Session | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  onGoogleSignIn: () => void;
  onSolicitudCreated: (data: {
    solicitudId: string;
    clienteId: string;
    montoPrimerMes: number;
  }) => void;
  onPrev: () => void;
}

export function StepDatos({
  motoId,
  planCodigo,
  session,
  sessionStatus,
  onGoogleSignIn,
  onSolicitudCreated,
  onPrev,
}: StepDatosProps) {
  // Auth sub-step: register/login
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [regForm, setRegForm] = useState({ nombre: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Personal data form
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: session?.user?.email ?? "",
    telefono: "",
    dni: "",
    usoMoto: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pre-fill email when session arrives
  if (session?.user?.email && !form.email) {
    setForm((prev) => ({ ...prev, email: session.user!.email! }));
  }
  if (session?.user?.name && !form.nombre) {
    const parts = (session.user.name ?? "").split(" ");
    setForm((prev) => ({
      ...prev,
      nombre: prev.nombre || parts[0] || "",
      apellido: prev.apellido || parts.slice(1).join(" ") || "",
    }));
  }

  // ---- Auth handlers ----

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/public/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error ?? "Error al registrarse");
        return;
      }

      // Auto sign-in after registration
      const signInRes = await signIn("credentials", {
        email: regForm.email,
        password: regForm.password,
        redirect: false,
      });
      if (signInRes?.error) {
        setAuthError("Cuenta creada pero error al iniciar sesión. Intentá iniciar sesión manualmente.");
        return;
      }
      // Session will update via useSession, fields will pre-fill
    } catch {
      setAuthError("Error de conexión");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await signIn("credentials", {
        email: loginForm.email,
        password: loginForm.password,
        redirect: false,
      });
      if (res?.error) {
        setAuthError("Email o contraseña incorrectos");
        return;
      }
    } catch {
      setAuthError("Error de conexión");
    } finally {
      setAuthLoading(false);
    }
  }

  // ---- Solicitud submit ----

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setFormError("Debés aceptar los términos y condiciones");
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/public/alquiler/solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          planCodigo,
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono,
          dni: form.dni,
          usoMoto: form.usoMoto || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Error al crear solicitud");
        return;
      }
      onSolicitudCreated(json.data);
    } catch {
      setFormError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Not authenticated: show register/login ----

  if (sessionStatus === "loading") {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" />
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-display text-2xl font-extrabold text-t-primary">
            Creá tu cuenta
          </h2>
          <p className="text-sm text-t-secondary">
            Necesitamos tus datos para continuar con el alquiler
          </p>
        </div>

        {/* Google sign in */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onGoogleSignIn}
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-t-tertiary">o con email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {authMode === "register" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-nombre">Nombre</Label>
              <Input
                id="reg-nombre"
                value={regForm.nombre}
                onChange={(e) => setRegForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Contraseña</Label>
              <Input
                id="reg-password"
                type="password"
                value={regForm.password}
                onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>

            {authError && (
              <p className="text-sm text-red-500">{authError}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={authLoading}>
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Registrarme
            </Button>

            <p className="text-center text-sm text-t-secondary">
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className="text-[var(--ds-accent)] hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            {authError && (
              <p className="text-sm text-red-500">{authError}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={authLoading}>
              {authLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Iniciar sesión
            </Button>

            <p className="text-center text-sm text-t-secondary">
              ¿No tenés cuenta?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className="text-[var(--ds-accent)] hover:underline"
              >
                Registrarme
              </button>
            </p>
          </form>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="lg" onClick={onPrev} className="flex-1">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
        </div>
      </div>
    );
  }

  // ---- Authenticated: personal data form ----

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-extrabold text-t-primary">
          Completá tus datos
        </h2>
        <p className="text-sm text-t-secondary">
          Necesitamos esta información para generar tu contrato
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              value={form.apellido}
              onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="11 2345-6789"
              value={form.telefono}
              onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              placeholder="12345678"
              value={form.dni}
              onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))}
              minLength={7}
              maxLength={10}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="usoMoto">¿Para qué vas a usar la moto? (opcional)</Label>
          <Input
            id="usoMoto"
            placeholder="Ej: delivery, uso personal, trabajo"
            value={form.usoMoto}
            onChange={(e) => setForm((p) => ({ ...p, usoMoto: e.target.value }))}
          />
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          />
          <label htmlFor="terms" className="text-sm text-t-secondary leading-tight cursor-pointer">
            Acepto los{" "}
            <span className="text-[var(--ds-accent)] hover:underline">
              términos y condiciones
            </span>{" "}
            y la{" "}
            <span className="text-[var(--ds-accent)] hover:underline">
              política de privacidad
            </span>
          </label>
        </div>

        {formError && (
          <p className="text-sm text-red-500">{formError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="lg" onClick={onPrev} className="flex-1" type="button">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={submitting || !acceptTerms}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            Siguiente
          </Button>
        </div>
      </form>
    </div>
  );
}
