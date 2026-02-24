import { PageHeader } from "@/components/layout/page-header";
import { ConfigComunicacion } from "../_components/config-comunicacion";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Plantillas de mensaje y reglas de autonomía"
      />
      <ConfigComunicacion />
    </div>
  );
}
