import {
  Button,
  Heading,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./components/base-layout";

export interface SolicitudTallerEstadoEmailProps {
  contactoNombre: string;
  nombreTaller: string;
  nuevoEstado: string;
  estadoLabel: string;
  mensaje: string | null;
  tokenPublico: string;
}

const ESTADO_CONFIG: Record<string, { titulo: string; descripcion: string; color: string }> = {
  RECIBIDA: {
    titulo: "Solicitud Recibida",
    descripcion: "Tu solicitud fue recibida correctamente y será procesada por nuestro equipo.",
    color: "#3b82f6",
  },
  EN_EVALUACION: {
    titulo: "En Evaluación",
    descripcion: "Estamos evaluando tu solicitud. Te notificaremos cuando tengamos una resolución.",
    color: "#f59e0b",
  },
  APROBADA: {
    titulo: "¡Solicitud Aprobada!",
    descripcion: "¡Felicitaciones! Tu solicitud fue aprobada. Pronto recibirás el convenio comercial.",
    color: "#22c55e",
  },
  RECHAZADA: {
    titulo: "Solicitud No Aceptada",
    descripcion: "Lamentablemente tu solicitud no fue aceptada en esta oportunidad.",
    color: "#ef4444",
  },
  CONVENIO_ENVIADO: {
    titulo: "Convenio Enviado",
    descripcion: "Te enviamos el convenio comercial para que lo revises y firmes.",
    color: "#8b5cf6",
  },
};

export default function SolicitudTallerEstadoEmail({
  contactoNombre = "Juan",
  nombreTaller = "Taller Demo",
  nuevoEstado = "RECIBIDA",
  estadoLabel = "Recibida",
  mensaje = null,
  tokenPublico = "demo-token",
}: SolicitudTallerEstadoEmailProps) {
  const config = ESTADO_CONFIG[nuevoEstado] ?? {
    titulo: `Estado: ${estadoLabel}`,
    descripcion: `El estado de tu solicitud cambió a ${estadoLabel}.`,
    color: "#6b7280",
  };
  const previewText = `${config.titulo} - ${nombreTaller}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.motolibre.com.ar";

  return (
    <BaseLayout previewText={previewText}>
      <Heading as="h1" style={{ fontSize: "24px", fontWeight: "bold", color: "#f8fafc", marginBottom: "8px" }}>
        {config.titulo}
      </Heading>

      <Text style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
        Hola {contactoNombre},
      </Text>

      <Section style={{ backgroundColor: config.color + "15", borderLeft: `4px solid ${config.color}`, borderRadius: "8px", padding: "16px 20px", marginBottom: "24px" }}>
        <Text style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
          {config.descripcion}
        </Text>
      </Section>

      <Section style={{ backgroundColor: "#1e293b", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px" }}>
        <Text style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
          Taller
        </Text>
        <Text style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0" }}>
          {nombreTaller}
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
          Estado
        </Text>
        <Text style={{ color: config.color, fontSize: "14px", fontWeight: "600", margin: "0" }}>
          {estadoLabel}
        </Text>
      </Section>

      {mensaje && (
        <>
          <Hr style={{ borderColor: "#334155", margin: "16px 0" }} />
          <Text style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Observaciones
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: "14px", fontStyle: "italic", lineHeight: "1.6" }}>
            {mensaje}
          </Text>
        </>
      )}

      <Section style={{ textAlign: "center" as const, marginTop: "32px" }}>
        <Button
          href={`${appUrl}/postulacion-taller/seguimiento?token=${tokenPublico}`}
          style={{ backgroundColor: "#23DFFF", color: "#0f172a", padding: "12px 24px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", textDecoration: "none" }}
        >
          Ver Estado de mi Solicitud
        </Button>
      </Section>

      <Hr style={{ borderColor: "#334155", margin: "32px 0 16px" }} />

      <Text style={{ color: "#64748b", fontSize: "12px", textAlign: "center" as const }}>
        Este email fue enviado automáticamente por MotoLibre.
        Si tenés dudas, respondé a este email o contactanos a soporte@motolibre.com.ar
      </Text>
    </BaseLayout>
  );
}
