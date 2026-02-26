import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function BaseLayout({ previewText, children }: BaseLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brand}>MotoLibre</Text>
            <Text style={brandSub}>Red de Movilidad</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              MotoLibre S.A. — CUIT 30-71617222-4
            </Text>
            <Text style={footerText}>
              Este es un mensaje automático. Para consultas respondé este email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f4f4f5",
  fontFamily: "Arial, sans-serif",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
};

const header = {
  backgroundColor: "#0f0f0f",
  padding: "24px 32px",
  borderRadius: "8px 8px 0 0",
};

const brand = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};

const brandSub = {
  color: "#23e0ff",
  fontSize: "12px",
  margin: "4px 0 0",
  padding: "0",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "32px",
  border: "1px solid #e5e7eb",
  borderTop: "none",
};

const footer = {
  backgroundColor: "#ffffff",
  padding: "16px 32px 24px",
  borderLeft: "1px solid #e5e7eb",
  borderRight: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  borderRadius: "0 0 8px 8px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "2px 0",
};
