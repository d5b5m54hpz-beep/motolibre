"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  User,
  Wrench,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

const PROVINCIAS = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const ESPECIALIDADES = [
  "Motor",
  "Frenos",
  "Suspensión",
  "Eléctrica",
  "Carrocería",
  "Neumáticos",
  "Transmisión",
  "Inyección",
  "Diagnóstico",
  "Service General",
];

const MARCAS = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "Bajaj",
  "TVS",
  "Benelli",
  "Royal Enfield",
  "KTM",
  "Motomel",
  "Zanella",
  "Corven",
  "Gilera",
  "Otra",
];

type FormData = {
  // Step 1: Datos del taller
  nombreTaller: string;
  razonSocial: string;
  cuit: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  email: string;
  sitioWeb: string;
  // Step 2: Contacto
  contactoNombre: string;
  contactoCargo: string;
  contactoCelular: string;
  // Step 3: Capacidad
  cantidadMecanicos: number;
  especialidades: string[];
  marcasExperiencia: string[];
  capacidadOTMes: string;
  horariosAtencion: string;
  superficieM2: string;
  cantidadElevadores: string;
  tieneDeposito: boolean;
  tieneEstacionamiento: boolean;
};

const INITIAL_FORM: FormData = {
  nombreTaller: "",
  razonSocial: "",
  cuit: "",
  direccion: "",
  ciudad: "",
  provincia: "",
  codigoPostal: "",
  telefono: "",
  email: "",
  sitioWeb: "",
  contactoNombre: "",
  contactoCargo: "",
  contactoCelular: "",
  cantidadMecanicos: 1,
  especialidades: [],
  marcasExperiencia: [],
  capacidadOTMes: "",
  horariosAtencion: "",
  superficieM2: "",
  cantidadElevadores: "",
  tieneDeposito: false,
  tieneEstacionamiento: false,
};

const STEPS = [
  { icon: Building2, label: "Taller" },
  { icon: User, label: "Contacto" },
  { icon: Wrench, label: "Capacidad" },
  { icon: FileText, label: "Confirmar" },
];

export default function PostulacionTallerPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    token: string;
    nombre: string;
  } | null>(null);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleArray(key: "especialidades" | "marcasExperiencia", value: string) {
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(value)
        ? p[key].filter((v) => v !== value)
        : [...p[key], value],
    }));
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return !!(
        form.nombreTaller &&
        form.direccion &&
        form.ciudad &&
        form.provincia &&
        form.telefono &&
        form.email
      );
    }
    if (step === 1) {
      return !!form.contactoNombre;
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Create the solicitud
      const res = await fetch("/api/public/solicitud-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreTaller: form.nombreTaller,
          direccion: form.direccion,
          ciudad: form.ciudad,
          provincia: form.provincia,
          telefono: form.telefono,
          email: form.email,
          contactoNombre: form.contactoNombre,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.fieldErrors ? "Datos incompletos" : "Error al crear solicitud");
        setSubmitting(false);
        return;
      }

      const { data } = await res.json();

      // Update with full data
      await fetch(`/api/public/solicitud-taller/${data.tokenPublico}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razonSocial: form.razonSocial || null,
          cuit: form.cuit || null,
          codigoPostal: form.codigoPostal || null,
          sitioWeb: form.sitioWeb || null,
          contactoCargo: form.contactoCargo || null,
          contactoCelular: form.contactoCelular || null,
          cantidadMecanicos: form.cantidadMecanicos,
          especialidades: form.especialidades,
          marcasExperiencia: form.marcasExperiencia,
          capacidadOTMes: form.capacidadOTMes
            ? parseInt(form.capacidadOTMes)
            : null,
          horariosAtencion: form.horariosAtencion || null,
          superficieM2: form.superficieM2
            ? parseInt(form.superficieM2)
            : null,
          cantidadElevadores: form.cantidadElevadores
            ? parseInt(form.cantidadElevadores)
            : null,
          tieneDeposito: form.tieneDeposito,
          tieneEstacionamiento: form.tieneEstacionamiento,
        }),
      });

      // Submit (BORRADOR → RECIBIDA)
      await fetch(
        `/api/public/solicitud-taller/${data.tokenPublico}/enviar`,
        { method: "POST" }
      );

      setResult({
        token: data.tokenPublico,
        nombre: data.nombreTaller,
      });
    } catch {
      toast.error("Error de conexión");
    }
    setSubmitting(false);
  }

  // Success state
  if (result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">
              Solicitud Enviada
            </h1>
            <p className="text-muted-foreground mt-2">
              Tu postulación para <strong>{result.nombre}</strong> fue recibida.
              Nuestro equipo la revisará y te contactaremos.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Código de Seguimiento
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono font-bold">
                {result.token.slice(0, 12)}...
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  navigator.clipboard.writeText(result.token);
                  toast.success("Token copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Guardá este código para consultar el estado de tu solicitud
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = `/postulacion-taller/seguimiento?token=${result.token}`)
            }
          >
            Ver Estado de mi Solicitud
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Postulación Red de Talleres
        </h1>
        <p className="text-muted-foreground mt-2">
          Unite a la red de talleres certificados MotoLibre
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-1 mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px ${isDone ? "bg-emerald-400" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold">Datos del Taller</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nombre del Taller *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Taller Moto Express"
                  value={form.nombreTaller}
                  onChange={(e) => updateField("nombreTaller", e.target.value)}
                />
              </div>
              <div>
                <Label>Razón Social</Label>
                <Input
                  className="mt-1"
                  value={form.razonSocial}
                  onChange={(e) => updateField("razonSocial", e.target.value)}
                />
              </div>
              <div>
                <Label>CUIT</Label>
                <Input
                  className="mt-1"
                  placeholder="XX-XXXXXXXX-X"
                  value={form.cuit}
                  onChange={(e) => updateField("cuit", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Dirección *</Label>
                <Input
                  className="mt-1"
                  placeholder="Calle y número"
                  value={form.direccion}
                  onChange={(e) => updateField("direccion", e.target.value)}
                />
              </div>
              <div>
                <Label>Ciudad *</Label>
                <Input
                  className="mt-1"
                  value={form.ciudad}
                  onChange={(e) => updateField("ciudad", e.target.value)}
                />
              </div>
              <div>
                <Label>Provincia *</Label>
                <Select
                  value={form.provincia}
                  onValueChange={(v) => updateField("provincia", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCIAS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código Postal</Label>
                <Input
                  className="mt-1"
                  value={form.codigoPostal}
                  onChange={(e) => updateField("codigoPostal", e.target.value)}
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  className="mt-1"
                  placeholder="+54 11 XXXX-XXXX"
                  value={form.telefono}
                  onChange={(e) => updateField("telefono", e.target.value)}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Sitio Web</Label>
                <Input
                  className="mt-1"
                  placeholder="https://..."
                  value={form.sitioWeb}
                  onChange={(e) => updateField("sitioWeb", e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold">Contacto Principal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nombre Completo *</Label>
                <Input
                  className="mt-1"
                  value={form.contactoNombre}
                  onChange={(e) =>
                    updateField("contactoNombre", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Dueño, Encargado"
                  value={form.contactoCargo}
                  onChange={(e) =>
                    updateField("contactoCargo", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Celular</Label>
                <Input
                  className="mt-1"
                  placeholder="+54 11 XXXX-XXXX"
                  value={form.contactoCelular}
                  onChange={(e) =>
                    updateField("contactoCelular", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold">Capacidad e Infraestructura</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cantidad de Mecánicos</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  value={form.cantidadMecanicos}
                  onChange={(e) =>
                    updateField(
                      "cantidadMecanicos",
                      parseInt(e.target.value) || 1
                    )
                  }
                />
              </div>
              <div>
                <Label>Capacidad OT/Mes</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="Ej: 50"
                  value={form.capacidadOTMes}
                  onChange={(e) =>
                    updateField("capacidadOTMes", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Superficie (m²)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.superficieM2}
                  onChange={(e) =>
                    updateField("superficieM2", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Elevadores</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={form.cantidadElevadores}
                  onChange={(e) =>
                    updateField("cantidadElevadores", e.target.value)
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Horarios de Atención</Label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Lun-Vie 8-18, Sáb 8-13"
                  value={form.horariosAtencion}
                  onChange={(e) =>
                    updateField("horariosAtencion", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.tieneDeposito}
                  onCheckedChange={(v) =>
                    updateField("tieneDeposito", !!v)
                  }
                />
                <Label className="text-sm">Tiene depósito de repuestos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.tieneEstacionamiento}
                  onCheckedChange={(v) =>
                    updateField("tieneEstacionamiento", !!v)
                  }
                />
                <Label className="text-sm">Tiene estacionamiento</Label>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <Label>Especialidades</Label>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES.map((e) => (
                  <Badge
                    key={e}
                    variant={
                      form.especialidades.includes(e)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArray("especialidades", e)}
                  >
                    {e}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <Label>Marcas con Experiencia</Label>
              <div className="flex flex-wrap gap-2">
                {MARCAS.map((m) => (
                  <Badge
                    key={m}
                    variant={
                      form.marcasExperiencia.includes(m)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArray("marcasExperiencia", m)}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold">Confirmar Postulación</h2>
            <p className="text-sm text-muted-foreground">
              Revisá los datos antes de enviar tu solicitud.
            </p>
            <div className="space-y-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">{form.nombreTaller}</p>
                <p className="text-muted-foreground">{form.direccion}</p>
                <p className="text-muted-foreground">
                  {form.ciudad}, {form.provincia}
                </p>
                <p className="text-muted-foreground">
                  {form.telefono} · {form.email}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">
                  Contacto: {form.contactoNombre}
                  {form.contactoCargo && ` (${form.contactoCargo})`}
                </p>
                {form.contactoCelular && (
                  <p className="text-muted-foreground">
                    {form.contactoCelular}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">
                  {form.cantidadMecanicos} mecánico
                  {form.cantidadMecanicos > 1 ? "s" : ""}
                  {form.capacidadOTMes &&
                    ` · ${form.capacidadOTMes} OT/mes`}
                </p>
                {form.especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.especialidades.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">
                        {e}
                      </Badge>
                    ))}
                  </div>
                )}
                {form.marcasExperiencia.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.marcasExperiencia.map((m) => (
                      <Badge
                        key={m}
                        variant="secondary"
                        className="text-xs"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Postulación"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
