"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PusherClient from "pusher-js";

interface MensajeChatRT {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  texto: string;
  tipo: string;
  createdAt: string;
}

interface UsePusherChatOptions {
  contratoId: string;
  enabled?: boolean;
}

export function usePusherChat({ contratoId, enabled = true }: UsePusherChatOptions) {
  const [mensajesRealtime, setMensajesRealtime] = useState<MensajeChatRT[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const pusherRef = useRef<PusherClient | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
    });

    const channel = pusher.subscribe(`contrato-${contratoId}`);

    channel.bind("nuevo-mensaje", (data: MensajeChatRT) => {
      setMensajesRealtime((prev) => [...prev, data]);
    });

    channel.bind("typing", (data: { userName: string }) => {
      setTyping(data.userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
    });

    channel.bind("mensajes-leidos", () => {
      // El componente puede reaccionar a esto si lo necesita
    });

    pusherRef.current = pusher;

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`contrato-${contratoId}`);
      pusher.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [contratoId, enabled]);

  const clearRealtime = useCallback(() => setMensajesRealtime([]), []);

  return { mensajesRealtime, typing, clearRealtime };
}
