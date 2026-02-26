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

export interface BienvenidaTallerEmailProps {
  contactoNombre: string;
  nombreTaller: string;
  codigoRed: string;
  email: string;
  tempPassword: string;
  appUrl: string;
}

export default function BienvenidaTallerEmail({
  contactoNombre,
  nombreTaller,
  codigoRed,
  email,
  tempPassword,
  appUrl,
}: BienvenidaTallerEmailProps) {
  const previewText = `¡Bienvenido a la Red MotoLibre! Tu taller ${nombreTaller} fue activado.`;

  return (
    <BaseLayout previewText={previewText}>
      <Heading style={heading}>¡Hola {contactoNombre}!</Heading>

      <Text style={body}>
        Tu taller <strong>{nombreTaller}</strong> fue activado exitosamente en
        la Red de Talleres MotoLibre.
      </Text>

      {/* Código de red */}
      <Section style={codeBox}>
        <Text style={codeLabel}>Código de red asignado</Text>
        <Text style={codeValue}>{codigoRed}</Text>
      </Section>

      <Hr style={divider} />

      {/* Credenciales */}
      <Section style={credentialsBox}>
        <Text style={credentialsTitle}>Credenciales de acceso al Portal</Text>

        <Row style={{ marginBottom: "12px" }}>
          <Column>
            <Text style={credLabel}>Usuario (email)</Text>
            <Text style={credValue}>{email}</Text>
          </Column>
        </Row>

        <Row>
          <Column>
            <Text style={credLabel}>Contraseña temporal</Text>
            <Text style={tempPasswordStyle}>{tempPassword}</Text>
          </Column>
        </Row>

        <Text style={warningText}>
          ⚠️ Cambiá esta contraseña desde tu portal en el primer ingreso.
        </Text>
      </Section>

      <Hr style={divider} />

      {/* CTA */}
      <Section style={ctaSection}>
        <Button href={`${appUrl}/portal-taller`} style={ctaButton}>
          Acceder al Portal Taller →
        </Button>
      </Section>

      <Text style={helpText}>
        Ante cualquier duda respondé este email o llamá al +54 11 0000-0000.
      </Text>
    </BaseLayout>
  );
}

const heading = {
  color: "#0f0f0f",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const body = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const codeBox = {
  backgroundColor: "#0f0f0f",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const codeLabel = {
  color: "#9ca3af",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px",
};

const codeValue = {
  color: "#23e0ff",
  fontSize: "22px",
  fontWeight: "bold",
  fontFamily: "monospace",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const credentialsBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const credentialsTitle = {
  color: "#6b7280",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const credLabel = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 4px",
};

const credValue = {
  color: "#374151",
  fontSize: "14px",
  fontFamily: "monospace",
  backgroundColor: "transparent",
};

const tempPasswordStyle = {
  color: "#dc2626",
  fontSize: "18px",
  fontFamily: "monospace",
  fontWeight: "bold",
  backgroundColor: "transparent",
};

const warningText = {
  color: "#dc2626",
  fontSize: "12px",
  margin: "12px 0 0",
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

const helpText = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0",
};
