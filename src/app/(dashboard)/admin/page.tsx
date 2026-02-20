import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login-admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D1B2A] p-8">
      <h1 className="text-3xl font-bold text-[#23e0ff]">
        Dashboard Admin
      </h1>
      <p className="mt-4 text-gray-400">
        Bienvenido, {session.user.name}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Rol: {session.user.role}
      </p>
      <p className="mt-2 text-xs text-gray-600">
        Punto 0.2 completado — Layout completo en punto 0.4
      </p>
    </main>
  );
}
