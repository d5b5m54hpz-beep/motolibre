"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { cn } from "@/lib/utils";
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Conversacion {
  contratoId: string;
  clienteNombre: string;
  moto: string | null;
  ultimoMensaje: {
    texto: string;
    userName: string;
    userRole: string;
    createdAt: string;
  } | null;
  noLeidos: number;
}

interface ChatInboxProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}

export function ChatInbox({ currentUserId, currentUserName, currentUserRole }: ChatInboxProps) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedContrato = searchParams.get("contrato");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/chat/conversaciones");
        if (res.ok) {
          const data = await res.json();
          setConversaciones(data.data);
        }
      } catch {
        // Silenciar
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedContrato]);

  function selectConversacion(contratoId: string) {
    router.push(`/admin/chat?contrato=${contratoId}`);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} hs`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "ayer" : `hace ${days} días`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" />
      </div>
    );
  }

  // Mobile: si hay contrato seleccionado, mostrar chat fullscreen
  if (selectedContrato) {
    const conv = conversaciones.find((c) => c.contratoId === selectedContrato);

    return (
      <div className="space-y-3">
        {/* Mobile back button */}
        <div className="lg:hidden">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/chat")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista (hidden on mobile when chat selected) */}
          <div className="hidden lg:block">
            <ConversacionList
              conversaciones={conversaciones}
              selectedContrato={selectedContrato}
              onSelect={selectConversacion}
              timeAgo={timeAgo}
            />
          </div>

          {/* Chat */}
          <div>
            {conv && (
              <p className="text-sm text-t-secondary mb-2">
                {conv.clienteNombre} {conv.moto ? `— ${conv.moto}` : ""}
              </p>
            )}
            <ChatPanel
              contratoId={selectedContrato}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              height="h-[calc(100vh-280px)]"
            />
          </div>
        </div>
      </div>
    );
  }

  // Sin contrato seleccionado: mostrar lista
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <ConversacionList
        conversaciones={conversaciones}
        selectedContrato={null}
        onSelect={selectConversacion}
        timeAgo={timeAgo}
      />

      {/* Placeholder */}
      <div className="hidden lg:flex items-center justify-center border border-border rounded-2xl bg-bg-card/80 h-[calc(100vh-280px)]">
        <div className="text-center text-t-tertiary">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Seleccioná una conversación</p>
        </div>
      </div>
    </div>
  );
}

function ConversacionList({
  conversaciones,
  selectedContrato,
  onSelect,
  timeAgo,
}: {
  conversaciones: Conversacion[];
  selectedContrato: string | null;
  onSelect: (id: string) => void;
  timeAgo: (d: string) => string;
}) {
  if (conversaciones.length === 0) {
    return (
      <div className="border border-border rounded-2xl bg-bg-card/80 p-8 text-center">
        <MessageCircle className="h-10 w-10 mx-auto mb-3 text-t-tertiary opacity-30" />
        <p className="text-sm text-t-tertiary">No hay conversaciones aún</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl bg-bg-card/80 overflow-hidden divide-y divide-border/50 max-h-[calc(100vh-280px)] overflow-y-auto">
      {conversaciones.map((conv) => (
        <button
          key={conv.contratoId}
          onClick={() => onSelect(conv.contratoId)}
          className={cn(
            "w-full text-left p-3.5 hover:bg-bg-card-hover transition-colors",
            selectedContrato === conv.contratoId && "bg-[var(--ds-accent)]/5 border-l-2 border-l-[var(--ds-accent)]"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-t-primary truncate">
                  {conv.clienteNombre}
                </span>
                {conv.noLeidos > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-[var(--ds-accent)] text-white text-[10px] font-bold rounded-full">
                    {conv.noLeidos}
                  </span>
                )}
              </div>
              {conv.moto && (
                <p className="text-[11px] text-t-tertiary truncate">{conv.moto}</p>
              )}
              {conv.ultimoMensaje && (
                <p className="text-xs text-t-secondary mt-0.5 truncate">
                  {conv.ultimoMensaje.texto}
                </p>
              )}
            </div>
            {conv.ultimoMensaje && (
              <span className="text-[10px] text-t-tertiary whitespace-nowrap shrink-0">
                {timeAgo(conv.ultimoMensaje.createdAt)}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
