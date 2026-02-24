import { PageHeader } from "@/components/layout/page-header";
import { ContactosCrud } from "../_components/contactos-crud";

export default function ContactosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contactos"
        description="Contactos externos: proveedores, contador, abogado, etc."
      />
      <ContactosCrud />
    </div>
  );
}
