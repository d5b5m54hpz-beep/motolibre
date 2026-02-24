import { PageHeader } from "@/components/layout/page-header";
import { BandejaComunicacion } from "./_components/bandeja-comunicacion";

export default function ComunicacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicación"
        description="Bandeja de comunicaciones corporativas"
      />
      <BandejaComunicacion />
    </div>
  );
}
