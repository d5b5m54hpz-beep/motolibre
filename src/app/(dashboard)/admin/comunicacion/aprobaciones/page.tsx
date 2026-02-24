import { PageHeader } from "@/components/layout/page-header";
import { AprobacionesCola } from "../_components/aprobaciones-cola";

export default function AprobacionesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprobaciones"
        description="Mensajes pendientes de aprobación del CEO"
      />
      <AprobacionesCola />
    </div>
  );
}
