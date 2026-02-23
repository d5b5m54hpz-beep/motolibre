"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePusherChat } from "@/hooks/use-pusher-chat";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mensaje {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  texto: string;
  tipo: string;
  createdAt: string;
}

interface ChatPanelProps {
  contratoId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  height?: string;
}

export function ChatPanel({
  contratoId,
  currentUserId,
  currentUserName,
  currentUserRole,
  height = "h-[600px]",
}: ChatPanelProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [texto, setTexto] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasPusher = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

  const { mensajesRealtime, typing, clearRealtime } = usePusherChat({
    contratoId,
    enabled: hasPusher,
  });

  // Cargar mensajes iniciales
  const fetchMensajes = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/chat/${contratoId}/mensajes?cursor=${cursor}&limit=50`
        : `/api/chat/${contratoId}/mensajes?limit=50`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cursor) {
        setMensajes((prev) => [...data.data, ...prev]);
      } else {
        setMensajes(data.data);
      }
      setNextCursor(data.nextCursor);
    } catch {
      // Silenciar
    }
  }, [contratoId]);

  useEffect(() => {
    setLoading(true);
    fetchMensajes().finally(() => setLoading(false));
  }, [fetchMensajes]);

  // Marcar como leídos al abrir
  useEffect(() => {
    fetch(`/api/chat/${contratoId}/leer`, { method: "POST" }).catch(() => {});
  }, [contratoId]);

  // Scroll al final al cargar y al recibir mensajes nuevos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, mensajesRealtime]);

  // Polling fallback si no hay Pusher
  useEffect(() => {
    if (hasPusher) return;
    const interval = setInterval(() => {
      fetchMensajes();
    }, 5000);
    return () => clearInterval(interval);
  }, [hasPusher, fetchMensajes]);

  // Combinar mensajes de DB con los de realtime (evitar duplicados)
  const allMensajes = [...mensajes];
  for (const rtMsg of mensajesRealtime) {
    if (!allMensajes.find((m) => m.id === rtMsg.id)) {
      allMensajes.push(rtMsg);
    }
  }

  // Cargar más (scroll infinito hacia arriba)
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchMensajes(nextCursor);
    setLoadingMore(false);
  }

  // Enviar mensaje
  async function handleSend() {
    const trimmed = texto.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${contratoId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        // Si no hay Pusher, agregamos manualmente
        if (!hasPusher) {
          setMensajes((prev) => [...prev, {
            ...data.data,
            createdAt: data.data.createdAt,
          }]);
        }
        setTexto("");
        clearRealtime();
        inputRef.current?.focus();
      }
    } catch {
      // Silenciar
    } finally {
      setSending(false);
    }
  }

  // Typing indicator
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleTyping() {
    if (!hasPusher) return;
    if (typingTimeoutRef.current) return; // Throttle
    fetch(`/api/chat/${contratoId}/typing`, { method: "POST" }).catch(() => {});
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Agrupar por fecha
  function formatDateSeparator(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }

  let lastDate = "";

  return (
    <div className={cn("flex flex-col border border-border rounded-2xl bg-bg-card/80 backdrop-blur-sm overflow-hidden", height)}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" />
          </div>
        ) : (
          <>
            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full text-center text-xs text-t-tertiary hover:text-t-secondary py-2"
              >
                {loadingMore ? "Cargando..." : "Cargar mensajes anteriores"}
              </button>
            )}

            {allMensajes.length === 0 && (
              <p className="text-center text-sm text-t-tertiary py-8">
                No hay mensajes aún. Escribí el primero!
              </p>
            )}

            {allMensajes.map((msg) => {
              const dateStr = formatDateSeparator(msg.createdAt);
              const showDate = dateStr !== lastDate;
              lastDate = dateStr;

              const isOwn = msg.userId === currentUserId;
              const isSystem = msg.tipo === "sistema";

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 border-t border-border/50" />
                      <span className="text-[10px] text-t-tertiary font-medium uppercase tracking-wider">
                        {dateStr}
                      </span>
                      <div className="flex-1 border-t border-border/50" />
                    </div>
                  )}

                  {isSystem ? (
                    <div className="text-center py-1">
                      <span className="text-xs text-t-tertiary italic">{msg.texto}</span>
                    </div>
                  ) : (
                    <div className={cn("flex mb-1", isOwn ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2",
                          isOwn
                            ? "bg-[var(--ds-accent)] text-white rounded-br-md"
                            : "bg-bg-input border border-border rounded-bl-md"
                        )}
                      >
                        {!isOwn && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-semibold">
                              {msg.userName}
                            </span>
                            <span className={cn(
                              "text-[9px] px-1.5 py-px rounded-full font-medium",
                              msg.userRole === "CLIENTE"
                                ? "bg-positive/10 text-positive"
                                : "bg-[var(--ds-accent)]/10 text-[var(--ds-accent)]"
                            )}>
                              {msg.userRole === "CLIENTE" ? "Cliente" : "Equipo"}
                            </span>
                          </div>
                        )}
                        <p className={cn(
                          "text-sm whitespace-pre-wrap break-words",
                          isOwn ? "text-white" : "text-t-primary"
                        )}>
                          {msg.texto}
                        </p>
                        <p className={cn(
                          "text-[10px] mt-0.5 text-right",
                          isOwn ? "text-white/60" : "text-t-tertiary"
                        )}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Typing indicator */}
        {typing && typing !== currentUserName && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-t-tertiary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-t-tertiary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-t-tertiary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-t-tertiary">{typing} está escribiendo...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje..."
          rows={1}
          className="flex-1 resize-none bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:ring-1 focus:ring-[var(--ds-accent)] min-h-[38px] max-h-[120px]"
        />
        <Button
          onClick={handleSend}
          disabled={!texto.trim() || sending}
          size="icon"
          className="shrink-0 rounded-xl"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
