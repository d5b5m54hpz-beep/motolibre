import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MiCuentaTabs } from "./_components/mi-cuenta-tabs";

export default async function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-t-primary">
          Mi Cuenta
        </h1>
        <p className="text-sm text-t-secondary mt-1">
          Gestioná tu contrato y pagos
        </p>
      </div>
      <MiCuentaTabs />
      {children}
    </div>
  );
}
