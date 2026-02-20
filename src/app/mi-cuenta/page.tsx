import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MiCuentaPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D1B2A] p-8">
      <h1 className="text-3xl font-bold text-[#23e0ff]">
        Mi Cuenta
      </h1>
      <p className="mt-4 text-gray-400">
        Bienvenido, {session.user.name}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Email: {session.user.email}
      </p>
    </main>
  );
}
