import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PortalTallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login-admin");
  }

  if (session.user.role !== "TALLER_EXTERNO") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-lg font-display font-bold tracking-tight">
              MotoLibre
            </span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Portal Taller
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{session.user.name}</span>
            <Link
              href="/portal-taller/perfil"
              className="text-xs hover:text-foreground transition-colors"
            >
              Seguridad
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs hover:text-foreground transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
