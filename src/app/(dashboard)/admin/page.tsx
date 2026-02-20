import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login-admin");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Bienvenido, ${session.user.name}`}
      />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Dashboard completo en punto 0.5
      </div>
    </div>
  );
}
