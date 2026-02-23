"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WizardProgress } from "./wizard-progress";
import { WizardSummary } from "./wizard-summary";
import { StepMoto } from "./step-moto";
import { StepPlan } from "./step-plan";
import { StepDatos } from "./step-datos";
import { StepPreview } from "./step-preview";

interface MotoData {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  km: number;
  color: string | null;
  tipo: string;
  foto: string | null;
  condicion: string;
}

interface PlanData {
  id: string;
  nombre: string;
  codigo: string;
  frecuencia: string;
  duracionMeses: number | null;
  descuento: number;
  incluyeTransferencia: boolean;
  precioBase: number;
  precioFinal: number;
  moneda: string;
}

interface PreviewData {
  montoPeriodo: number;
  totalCuotas: number;
  frecuencia: string;
  duracionMeses: number;
  totalAlquiler: number;
  montoPrimerPago: number;
}

const STORAGE_KEY = "motolibre_wizard";

export function WizardShell({
  motoId,
  initialPlan,
  initialStep,
}: {
  motoId: string;
  initialPlan: string;
  initialStep: number;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(initialStep);
  const [moto, setMoto] = useState<MotoData | null>(null);
  const [planes, setPlanes] = useState<PlanData[]>([]);
  const [selectedCodigo, setSelectedCodigo] = useState(initialPlan);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [solicitudId, setSolicitudId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [montoPrimerMes, setMontoPrimerMes] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didInit = useRef(false);

  // Restore state from sessionStorage (Google OAuth redirect recovery)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.motoId === motoId) {
          if (data.step !== undefined && initialStep === 0) setStep(data.step);
          if (data.selectedCodigo) setSelectedCodigo(data.selectedCodigo);
          if (data.solicitudId) setSolicitudId(data.solicitudId);
          if (data.clienteId) setClienteId(data.clienteId);
          if (data.montoPrimerMes) setMontoPrimerMes(data.montoPrimerMes);
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore parse errors
    }
  }, [motoId, initialStep]);

  // Fetch moto + plans on mount
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    async function init() {
      try {
        const res = await fetch("/api/public/alquiler/iniciar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motoId, planCodigo: selectedCodigo || "SEMANAL" }),
        });
        if (!res.ok) {
          const json = await res.json();
          setError(json.error ?? "Error al cargar la moto");
          return;
        }
        const json = await res.json();
        const data = json.data;
        setMoto(data.moto);
        setPlanes(data.planes);
        setPreview(data.preview);
        if (!selectedCodigo && data.selectedPlan) {
          setSelectedCodigo(data.selectedPlan.codigo);
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, [motoId, selectedCodigo]);

  // Update preview when plan changes
  const updatePreview = useCallback(
    (codigo: string) => {
      setSelectedCodigo(codigo);
      const plan = planes.find((p) => p.codigo === codigo);
      if (plan) {
        const duracion = plan.duracionMeses ?? 12;
        const freq = plan.frecuencia === "SEMANAL" ? "SEMANAL" : "MENSUAL";
        const precioMensual =
          freq === "SEMANAL"
            ? Math.round(plan.precioFinal * 4.33)
            : plan.precioFinal;
        const totalCuotas =
          freq === "SEMANAL"
            ? Math.ceil(duracion * 4.33)
            : duracion;
        const montoPeriodo =
          freq === "SEMANAL"
            ? plan.precioFinal
            : plan.precioFinal;

        setPreview({
          montoPeriodo,
          totalCuotas,
          frecuencia: freq,
          duracionMeses: duracion,
          totalAlquiler: precioMensual * duracion,
          montoPrimerPago: plan.precioFinal,
        });
      }
    },
    [planes]
  );

  // Save to sessionStorage before OAuth redirect
  const saveStateForOAuth = useCallback(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          motoId,
          step,
          selectedCodigo,
          solicitudId,
          clienteId,
          montoPrimerMes,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [motoId, step, selectedCodigo, solicitudId, clienteId, montoPrimerMes]);

  const handleGoogleSignIn = useCallback(() => {
    saveStateForOAuth();
    void signIn("google", {
      callbackUrl: `/alquiler/${motoId}?plan=${selectedCodigo}&step=2`,
    });
  }, [saveStateForOAuth, motoId, selectedCodigo]);

  // Solicitud creation callback (from step-datos)
  const handleSolicitudCreated = useCallback(
    (data: { solicitudId: string; clienteId: string; montoPrimerMes: number }) => {
      setSolicitudId(data.solicitudId);
      setClienteId(data.clienteId);
      setMontoPrimerMes(data.montoPrimerMes);
      setStep(3);
    },
    []
  );

  // Confirm callback (from step-preview)
  const handleConfirmed = useCallback(
    (pagoUrl: string) => {
      window.location.href = pagoUrl;
    },
    []
  );

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-t-tertiary" />
      </div>
    );
  }

  if (error || !moto) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="font-display font-bold text-t-primary text-xl">
          {error ?? "Moto no encontrada"}
        </p>
        <button
          onClick={() => router.push("/catalogo")}
          className="text-sm text-[var(--ds-accent)] hover:underline"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  const selectedPlan = planes.find((p) => p.codigo === selectedCodigo) ?? planes[0];
  const motoNombre = `${moto.marca} ${moto.modelo}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <WizardProgress currentStep={step} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div>
          {step === 0 && (
            <StepMoto moto={moto} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepPlan
              planes={planes}
              selectedCodigo={selectedCodigo}
              motoNombre={motoNombre}
              onSelect={updatePreview}
              onPrev={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepDatos
              motoId={moto.id}
              planCodigo={selectedCodigo}
              session={session}
              sessionStatus={sessionStatus}
              onGoogleSignIn={handleGoogleSignIn}
              onSolicitudCreated={handleSolicitudCreated}
              onPrev={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepPreview
              moto={moto}
              plan={selectedPlan!}
              preview={preview}
              solicitudId={solicitudId!}
              onConfirmed={handleConfirmed}
              onPrev={() => setStep(2)}
            />
          )}
        </div>

        {/* Sidebar summary */}
        <WizardSummary
          moto={moto}
          plan={selectedPlan}
          preview={preview}
          step={step}
        />
      </div>
    </div>
  );
}
