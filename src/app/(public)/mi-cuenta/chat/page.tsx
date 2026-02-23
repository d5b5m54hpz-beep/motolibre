import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/chat/chat-panel";
import { MessageCircle } from "lucide-react";

export default async function MiCuentaChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Buscar contrato activo del cliente
  const cliente = await prisma.cliente.findFirst({
    where: { userId: session.user.id },
    select: { id: true, nombre: true },
  });

  let contrato = null;
  if (cliente) {
    contrato = await prisma.contrato.findFirst({
      where: {
        clienteId: cliente.id,
        estado: { in: ["ACTIVO", "BORRADOR"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  }

  if (!contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageCircle className="h-12 w-12 text-t-tertiary opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-t-primary mb-1">Sin contrato activo</h2>
        <p className="text-sm text-t-tertiary max-w-md">
          El chat se habilita cuando tenés un contrato activo con MotoLibre.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Chat con MotoLibre</h2>
      <ChatPanel
        contratoId={contrato.id}
        currentUserId={session.user.id}
        currentUserName={session.user.name || cliente?.nombre || "Cliente"}
        currentUserRole="CLIENTE"
        height="h-[calc(100vh-320px)]"
      />
    </div>
  );
}
