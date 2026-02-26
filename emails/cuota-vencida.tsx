import {
  Button,
  Heading,
  Row,
  Column,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./components/base-layout";

export interface CuotaVencidaEmailProps {
  clienteNombre: string;
  contratoNumero: string;
  motoModelo: string;
  cuotaNumero: number;
  monto: number;
  diasVencida: number;
  linkPago?: string;
  mensajeIA: string; // personalizado por Claude
}

export default function CuotaVencidaEmail({
  clienteNombre,
  contratoNumero,
  motoModelo,
  cuotaNumero,
  monto,
  diasVencida,
  linkPago,
  mensajeIA,
}: CuotaVencidaEmailProps) {
  const previewText = `${clienteNombre}, tu cuota vencida requiere atención — $${monto.toLocaleString("es-AR")}`;

  return (
    <BaseLayout previewText={previewText}>
      {/* Header de urgencia */}
      <Section style={urgencyBanner}>
        <Text style={urgencyText}>
          🔴 Cuota vencida hace {diasVencida} {diasVencida === 1 ? "día" : "días"}
        </Text>
      </Section>

      <Heading style={heading}>Acción requerida en tu cuenta</Heading>

      {/* Mensaje personalizado IA */}
      <Section style={aiMessageBox}>
        <Text style={aiMessage}>{mensajeIA}</Text>
      </Section>

      <Hr style={divider} />

      {/* Detalle cuota */}
      <Section style={detailBox}>
        <Row>
          <Column style={detailCol}>
            <Text style={detailLabel}>Contrato</Text>
            <Text style={detailValue}>{contratoNumero}</Text>
          </Column>
          <Column style={detailCol}>
            <Text style={detailLabel}>Moto</Text>
            <Text style={detailValue}>{motoModelo}</Text>
          </Column>
          <Column style={detailCol}>
            <Text style={detailLabel}>Cuota</Text>
            <Text style={detailValue}>#{cuotaNumero}</Text>
          </Column>
        </Row>

        <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />

        <Row>
          <Column>
            <Text style={detailLabel}>Monto pendiente</Text>
            <Text style={amountValue}>
              ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </Text>
          </Column>
        </Row>
      </Section>

      {linkPago && (
        <Section style={ctaSection}>
          <Button href={linkPago} style={ctaButton}>
            Regularizar mi cuenta →
          </Button>
        </Section>
      )}

      <Hr style={divider} />

      <Text style={footerNote}>
        Si ya realizaste el pago, puede demorar hasta 48 hs en acreditarse.
        Para consultas respondé este email o contactate con nuestro equipo.
      </Text>
    </BaseLayout>
  );
}

const urgencyBanner = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fca5a5",
  borderRadius: "6px",
  padding: "12px 16px",
  marginBottom: "20px",
};

const urgencyText = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
};

const heading = {
  color: "#0f0f0f",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const aiMessageBox = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderLeft: "4px solid #23e0ff",
  borderRadius: "0 6px 6px 0",
  padding: "16px",
  marginBottom: "24px",
};

const aiMessage = {
  color: "#0c4a6e",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const detailBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const detailCol = {
  paddingRight: "16px",
};

const detailLabel = {
  color: "#6b7280",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const detailValue = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const amountValue = {
  color: "#dc2626",
  fontSize: "28px",
  fontWeight: "bold",
  fontFamily: "monospace",
  margin: "0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const ctaButton = {
  backgroundColor: "#23e0ff",
  color: "#0f0f0f",
  borderRadius: "6px",
  padding: "12px 28px",
  fontWeight: "bold",
  fontSize: "15px",
  textDecoration: "none",
  display: "inline-block",
};

const footerNote = {
  color: "#9ca3af",
  fontSize: "13px",
  fontStyle: "italic" as const,
  margin: "0",
};
