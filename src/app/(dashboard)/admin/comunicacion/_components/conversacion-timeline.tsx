"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Sparkles,
  FileText,
  StickyNote,
  Bot,
  Mail,
  MailOpen,
  CheckCircle,
  Archive,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Contacto {
  id: string;
  nombre: string;
  email: string;
  tipo: string;
}

interface Aprobacion {
  id: string;
  estado: string;
  comentario: string | null;
}

interface Mensaje {
  id: string;
  direccion: string;
  estado: string;
  de: string;
  para: string[];
  cc: string[];
  asunto: string;
  cuerpo: string;
  analisisIA: Record<string, unknown> | null;
  borradorIA: string | null;
  aprobacion: Aprobacion | null;
  createdAt: string;
}

interface Conversacion {
  id: string;
  asunto: string;
  estado: string;
  prioridad: string;
  resumenIA: string | null;
  contactos: Array<{ contacto: Contacto }>;
  mensajes: Mensaje[];
}

interface Plantilla {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
}

const prioridadColors: Record<string, string> = {
  URGENTE: "bg-red-500/20 text-red-400 border-red-500/30",
  ALTA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAJA: "bg-green-500/20 text-green-400 border-green-500/30",
};

const estadoMensajeLabels: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_APROBACION: "Pendiente aprobación",
  APROBADO: "Aprobado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  REBOTADO: "Rebotado",
  FALLIDO: "Fallido",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function ConversacionTimeline({
  conversacionId,
}: {
  conversacionId: string;
}) {
  const router = useRouter();
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);

  // Compose state
  const [composing, setComposing] = useState(false);
  const [composeType, setComposeType] = useState<"SALIENTE" | "INTERNO">(
    "SALIENTE"
  );
  const [composeBody, setComposeBody] = useState("");
  const [composePara, setComposePara] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [resumiendo, setResumiendo] = useState(false);

  const fetchConv = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/comunicacion/conversaciones/${conversacionId}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setConv(json.data);
      // Pre-fill "para" from contacts
      const emails = (json.data.contactos || [])
        .map((c: { contacto: Contacto }) => c.contacto.email)
        .join(", ");
      setComposePara(emails);
    } catch {
      toast.error("Error al cargar conversación");
    } finally {
      setLoading(false);
    }
  }, [conversacionId]);

  useEffect(() => {
    fetchConv();
    fetch("/api/comunicacion/plantillas")
      .then((r) => r.json())
      .then((j) => setPlantillas(j.data || []))
      .catch(() => {});
  }, [fetchConv]);

  const handleChangeState = async (nuevoEstado: string) => {
    try {
      const res = await fetch(
        `/api/comunicacion/conversaciones/${conversacionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: nuevoEstado }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(`Conversación ${nuevoEstado.toLowerCase()}`);
      fetchConv();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleResumirIA = async () => {
    setResumiendo(true);
    try {
      const res = await fetch(
        `/api/comunicacion/conversaciones/${conversacionId}/resumir`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      toast.success("Resumen generado");
      fetchConv();
    } catch {
      toast.error("Error al resumir");
    } finally {
      setResumiendo(false);
    }
  };

  const handleSendMessage = async () => {
    if (!composeBody.trim()) {
      toast.error("Escribí un mensaje");
      return;
    }

    setSending(true);
    try {
      // Create message
      const createRes = await fetch(
        `/api/comunicacion/conversaciones/${conversacionId}/mensajes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direccion: composeType,
            para: composePara
              ? composePara.split(",").map((e) => e.trim())
              : undefined,
            cc: composeCc
              ? composeCc.split(",").map((e) => e.trim())
              : undefined,
            asunto: conv ? `Re: ${conv.asunto}` : "Re:",
            cuerpo: composeBody,
          }),
        }
      );

      if (!createRes.ok) throw new Error();
      const { data: newMsg } = await createRes.json();

      // If SALIENTE, submit for approval/send
      if (composeType === "SALIENTE") {
        const sendRes = await fetch(
          `/api/comunicacion/mensajes/${newMsg.id}/enviar`,
          { method: "POST" }
        );
        if (!sendRes.ok) throw new Error();
        const sendData = await sendRes.json();
        if (sendData.data?.pendienteAprobacion) {
          toast.success("Mensaje enviado para aprobación");
        } else {
          toast.success("Mensaje enviado");
        }
      } else {
        toast.success("Nota interna guardada");
      }

      setComposeBody("");
      setComposing(false);
      fetchConv();
    } catch {
      toast.error("Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  const handleGenerateDraft = async () => {
    // Find last incoming message
    const lastIncoming = [...(conv?.mensajes || [])]
      .reverse()
      .find((m) => m.direccion === "ENTRANTE");

    if (!lastIncoming) {
      toast.error("No hay mensaje entrante para responder");
      return;
    }

    setGeneratingDraft(true);
    try {
      const res = await fetch(
        `/api/comunicacion/mensajes/${lastIncoming.id}/borrador-ia`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setComposeBody(json.data.borrador);
      setComposing(true);
      setComposeType("SALIENTE");
      toast.success("Borrador IA generado");
    } catch {
      toast.error("Error al generar borrador");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleUsePlantilla = (plantillaId: string) => {
    const p = plantillas.find((pl) => pl.id === plantillaId);
    if (p) {
      setComposeBody(p.cuerpo);
      setComposing(true);
      setComposeType("SALIENTE");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-DEFAULT" />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="text-center py-20 text-t-secondary">
        Conversación no encontrada
      </div>
    );
  }

  const contacto = conv.contactos[0]?.contacto;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/comunicacion")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-t-primary">
                {conv.asunto}
              </h1>
              <Badge
                variant="outline"
                className={cn(prioridadColors[conv.prioridad])}
              >
                {conv.prioridad}
              </Badge>
            </div>
            {contacto && (
              <p className="text-sm text-t-secondary mt-1">
                Con: {contacto.nombre} ({contacto.email}) &middot;{" "}
                {contacto.tipo}
              </p>
            )}
            {conv.resumenIA && (
              <p className="text-sm text-accent-DEFAULT mt-1 flex items-center gap-1">
                <Bot className="h-3 w-3" /> {conv.resumenIA}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResumirIA}
            disabled={resumiendo}
          >
            {resumiendo ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Bot className="h-4 w-4 mr-1" />
            )}
            Resumir
          </Button>
          {conv.estado === "ABIERTA" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangeState("RESUELTA")}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Resolver
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangeState("ARCHIVADA")}
              >
                <Archive className="h-4 w-4 mr-1" /> Archivar
              </Button>
            </>
          )}
          {conv.estado !== "ABIERTA" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeState("ABIERTA")}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {conv.mensajes.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Compose */}
      <div className="bg-bg-card/80 border border-border rounded-xl p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={composing && composeType === "SALIENTE" ? "default" : "outline"}
            size="sm"
            onClick={handleGenerateDraft}
            disabled={generatingDraft}
          >
            {generatingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Borrador IA
          </Button>

          {plantillas.length > 0 && (
            <Select onValueChange={handleUsePlantilla}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Usar plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {plantillas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setComposing(true);
              setComposeType("INTERNO");
            }}
          >
            <StickyNote className="h-4 w-4 mr-1" /> Nota interna
          </Button>

          {!composing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setComposing(true);
                setComposeType("SALIENTE");
              }}
            >
              <Mail className="h-4 w-4 mr-1" /> Responder
            </Button>
          )}
        </div>

        {composing && (
          <div className="space-y-3">
            {composeType === "SALIENTE" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Para</Label>
                  <Input
                    value={composePara}
                    onChange={(e) => setComposePara(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">CC</Label>
                  <Input
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="cc@ejemplo.com"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <Textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={
                composeType === "INTERNO"
                  ? "Nota interna (no se envía)..."
                  : "Escribí tu respuesta..."
              }
              rows={6}
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setComposing(false);
                  setComposeBody("");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {composeType === "INTERNO"
                  ? "Guardar nota"
                  : "Enviar para aprobación"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Mensaje }) {
  const isIncoming = msg.direccion === "ENTRANTE";
  const isOutgoing = msg.direccion === "SALIENTE";
  const isInternal = msg.direccion === "INTERNO";
  const isIA = msg.direccion === "NOTA_IA";

  const analisis = msg.analisisIA as {
    urgencia?: string;
    acciones?: string[];
    resumen?: string;
  } | null;

  return (
    <div
      className={cn("flex", {
        "justify-start": isIncoming,
        "justify-end": isOutgoing,
        "justify-center": isInternal || isIA,
      })}
    >
      <div
        className={cn("max-w-[75%] rounded-xl p-4 space-y-2", {
          "bg-blue-500/10 border border-blue-500/20": isIncoming,
          "bg-accent-bg border border-accent-DEFAULT/20": isOutgoing,
          "bg-bg-card/50 border border-border": isInternal,
          "bg-purple-500/10 border border-purple-500/20": isIA,
        })}
      >
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-t-tertiary">
          {isIncoming && <MailOpen className="h-3 w-3" />}
          {isOutgoing && <Send className="h-3 w-3" />}
          {isInternal && <StickyNote className="h-3 w-3" />}
          {isIA && <Bot className="h-3 w-3" />}
          <span className="font-medium">
            {isIncoming
              ? msg.de
              : isIA
                ? "Agente IA"
                : isInternal
                  ? "Nota interna"
                  : "MotoLibre"}
          </span>
          <span>
            {format(new Date(msg.createdAt), "dd/MM/yy HH:mm", {
              locale: es,
            })}
          </span>
          {isOutgoing && (
            <Badge
              variant="outline"
              className={cn("text-[10px]", {
                "text-green-400": msg.estado === "ENVIADO" || msg.estado === "ENTREGADO",
                "text-yellow-400": msg.estado === "PENDIENTE_APROBACION" || msg.estado === "BORRADOR",
                "text-red-400": msg.estado === "FALLIDO" || msg.estado === "REBOTADO",
              })}
            >
              {estadoMensajeLabels[msg.estado] || msg.estado}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="text-sm text-t-primary whitespace-pre-wrap">
          {stripHtml(msg.cuerpo)}
        </div>

        {/* AI Analysis on incoming messages */}
        {isIncoming && analisis && (
          <div className="bg-purple-500/10 rounded-lg p-2 text-xs space-y-1 border border-purple-500/20">
            <div className="flex items-center gap-1 font-medium text-purple-400">
              <Bot className="h-3 w-3" /> Análisis IA
            </div>
            <div className="text-t-secondary">
              Urgencia: <span className="font-medium">{analisis.urgencia}</span>
              {analisis.acciones && analisis.acciones.length > 0 && (
                <span> · Acciones: {analisis.acciones.join(", ")}</span>
              )}
            </div>
            {analisis.resumen && (
              <div className="text-t-tertiary">{analisis.resumen}</div>
            )}
          </div>
        )}

        {/* AI Draft shown on NOTA_IA */}
        {isIA && msg.borradorIA && (
          <div className="bg-bg-card/50 rounded-lg p-3 text-sm border border-border mt-2">
            <div className="flex items-center gap-1 text-xs font-medium text-accent-DEFAULT mb-2">
              <FileText className="h-3 w-3" /> Borrador sugerido
            </div>
            <div className="text-t-secondary whitespace-pre-wrap">
              {msg.borradorIA}
            </div>
          </div>
        )}

        {/* Approval info */}
        {msg.aprobacion && (
          <div className="text-xs text-t-tertiary">
            Aprobación: {msg.aprobacion.estado}
            {msg.aprobacion.comentario && ` — "${msg.aprobacion.comentario}"`}
          </div>
        )}
      </div>
    </div>
  );
}
