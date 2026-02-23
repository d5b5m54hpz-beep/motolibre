import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ChatInbox } from "./_components/chat-inbox";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversaciones"
        description="Chat con clientes por contrato"
      />
      <ChatInbox
        currentUserId={session.user.id}
        currentUserName={session.user.name || "Admin"}
        currentUserRole={session.user.role || "ADMIN"}
      />
    </div>
  );
}
