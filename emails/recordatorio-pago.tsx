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

export interface RecordatorioPagoEmailProps {
  clienteNombre: string;
  contratoNumero: string;
  motoModelo: string;
  cuotaNumero: number;
  monto: number;
  fechaVencimiento: string; // "15 de marzo de 2026"
  diasVencida?: number;     // si ya venció
  linkPago?: string;
}

export default function RecordatorioPagoEmail({
  clienteNombre,
  contratoNumero,
  motoModelo,
  cuotaNumero,
  monto,
  fechaVencimiento,
  diasVencida,
  linkPago,
}: RecordatorioPagoEmailProps) {
  const vencida = typeof diasVencida === "number" && diasVencida > 0;
  const previewText = vencida
    ? `Cuota #${cuotaNumero} vencida hace ${diasVencida} días — $${monto.toLocaleString("es-AR")}`
    : `Recordatorio: tu cuota #${cuotaNumero} vence el ${fechaVencimiento}`;

  return (
    <BaseLayout previewText={previewText}>
      {/* Warning banner si vencida */}
      {vencida && (
        <Section style={warningBanner}>
          <Text style={warningText}>
            ⚠️ Cuota vencida hace {diasVencida} {diasVencida === 1 ? "día" : "días"}
          </Text>
        </Section>
      )}

      <Heading style={heading}>
        {vencida ? "Tenés una cuota vencida" : "Recordatorio de pago"}
      </Heading>

      <Text style={greeting}>Hola {clienteNombre},</Text>

      <Text style={body}>
        {vencida
          ? `Tu cuota #${cuotaNumero} del contrato ${contratoNumero} venció el ${fechaVencimiento} y aún no fue acreditada.`
          : `Te recordamos que tu cuota #${cuotaNumero} del contrato ${contratoNumero} vence el ${fechaVencimiento}.`}
      </Text>

      {/* Monto destacado */}
      <Section style={amountBox}>
        <Row>
          <Column>
            <Text style={amountLabel}>Monto a pagar</Text>
            <Text style={amountValue}>
              ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </Text>
          </Column>
          <Column>
            <Text style={amountLabel}>Moto</Text>
            <Text style={amountDetail}>{motoModelo}</Text>
          </Column>
          <Column>
            <Text style={amountLabel}>Vencimiento</Text>
            <Text style={amountDetail}>{fechaVencimiento}</Text>
          </Column>
        </Row>
      </Section>

      {linkPago && (
        <>
          <Hr style={divider} />
          <Section style={ctaSection}>
            <Button href={linkPago} style={ctaButton}>
              Pagar ahora →
            </Button>
          </Section>
        </>
      )}

      <Hr style={divider} />

      <Text style={footer}>
        Si ya realizaste el pago, ignorá este mensaje. Puede demorar hasta 48 hs
        en verse reflejado en el sistema.
      </Text>
    </BaseLayout>
  );
}

// Styles
const warningBanner = {
  backgroundColor: "#fef3c7",
  border: "1px solid #f59e0b",
  borderRadius: "6px",
  padding: "12px 16px",
  marginBottom: "20px",
};

const warningText = {
  color: "#92400e",
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

const greeting = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 8px",
};

const body = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const amountBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const amountLabel = {
  color: "#6b7280",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const amountValue = {
  color: "#0f0f0f",
  fontSize: "24px",
  fontWeight: "bold",
  fontFamily: "monospace",
  margin: "0",
};

const amountDetail = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
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

const footer = {
  color: "#9ca3af",
  fontSize: "13px",
  fontStyle: "italic" as const,
  margin: "0",
};

RecordatorioPagoEmail.defaultProps = {
  clienteNombre: "María González",
  contratoNumero: "ML-0027",
  motoModelo: "Honda CB 300R",
  cuotaNumero: 7,
  monto: 35000,
  fechaVencimiento: "5 de marzo de 2026",
  diasVencida: 3,
  linkPago: "https://motolibre.com.ar/pagar",
} satisfies RecordatorioPagoEmailProps;
