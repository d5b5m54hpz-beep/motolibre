"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSession } from "next-auth/react";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";

const SUGERENCIAS = [
  "¿Cuántas motos hay disponibles?",
  "Mostrame el resumen financiero del mes",
  "¿Hay cuotas vencidas?",
  "¿Cuál es el tipo de cambio hoy?",
  "¿Hay anomalías nuevas?",
];

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

const TOOL_COUNTS: Record<string, number> = {
  ADMIN: 21,
  OPERADOR: 13,
  COMERCIAL: 7,
  CONTADOR: 10,
  VIEWER: 8,
  RRHH_MANAGER: 4,
  CLIENTE: 0,
};

export default function AsistentePage() {
  const { data: session } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const toolCount = TOOL_COUNTS[session?.user?.role ?? ""] ?? 0;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleSuggestionClick(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold text-t-primary">
            Eve — Asistente MotoLibre
          </h1>
          <p className="text-xs text-t-tertiary">
            Asistente IA con acceso a datos en tiempo real
          </p>
        </div>
        {toolCount > 0 && (
          <Badge
            variant="outline"
            className="ml-auto bg-accent/10 text-accent border-accent/20 text-xs"
          >
            {toolCount} herramientas
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/10">
              <Sparkles className="h-8 w-8 text-violet-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-display font-bold text-t-primary">
                Hola, soy Eve
              </h2>
              <p className="text-sm text-t-tertiary max-w-md">
                Tu asistente virtual de MotoLibre. Puedo consultar datos de la
                flota, finanzas, clientes y más. Preguntame lo que necesites.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-2 rounded-xl text-xs bg-bg-input border border-border hover:border-border-hover hover:bg-bg-card-hover transition-all duration-200 text-t-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const text = getTextFromParts(m.parts as Array<{ type: string; text?: string }>);

            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[75%]">
                    <div className="px-4 py-3 rounded-2xl rounded-br-md bg-accent/10 border border-accent/10 text-sm text-t-primary">
                      {text}
                    </div>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-bg-input border border-border shrink-0">
                      <User className="h-4 w-4 text-t-tertiary" />
                    </div>
                  </div>
                </div>
              );
            }

            if (!text) return null;

            // Assistant message
            return (
              <div key={m.id} className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <Card className="px-4 py-3 bg-bg-card/80 backdrop-blur-sm border-border rounded-2xl rounded-bl-md">
                    <div className="prose prose-sm prose-invert max-w-none text-t-primary [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-border [&_th]:text-t-tertiary [&_td]:p-2 [&_td]:border-b [&_td]:border-border/50 [&_code]:bg-bg-input [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-bg-input [&_pre]:rounded-xl [&_pre]:p-3 [&_a]:text-accent [&_strong]:text-t-primary [&_h1]:text-t-primary [&_h2]:text-t-primary [&_h3]:text-t-primary [&_li]:text-t-secondary [&_p]:text-t-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                      </ReactMarkdown>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-sm text-t-tertiary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Eve está pensando...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-bg-primary/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Preguntale algo a Eve..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none rounded-xl bg-bg-input border border-border px-4 py-3 pr-12 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-xl bg-accent hover:bg-accent/90 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-t-tertiary text-center mt-2">
          Eve puede cometer errores. Verificá la información importante.
        </p>
      </div>
    </div>
  );
}
