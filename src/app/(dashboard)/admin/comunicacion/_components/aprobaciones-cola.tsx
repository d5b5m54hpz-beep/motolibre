"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Pencil,
  Loader2,
  Inbox,
  User,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Contacto {
  nombre: string;
  email: string;
  tipo: string;
}

interface Aprobacion {
  id: string;
  estado: string;
  createdAt: string;
  mensaje: {
    id: string;
    de: string;
    para: string[];
    asunto: string;
    cuerpo: string;
    userId: string | null;
    conversacion: {
      id: string;
      asunto: string;
      contactos: Array<{ contacto: Contacto }>;
    };
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function AprobacionesCola() {
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchAprobaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/comunicacion/aprobaciones?estado=PENDIENTE");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAprobaciones(json.data || []);
    } catch {
      toast.error("Error al cargar aprobaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAprobaciones();
  }, [fetchAprobaciones]);

  const handleAprobar = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(
        `/api/comunicacion/aprobaciones/${id}/aprobar`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      toast.success("Mensaje aprobado y enviado");
      fetchAprobaciones();
    } catch {
      toast.error("Error al aprobar");
    } finally {
      setProcessing(null);
    }
  };

  const handleRechazar = async () => {
    if (!rejectId || !rejectComment.trim()) {
      toast.error("Escribí un comentario");
      return;
    }

    setProcessing(rejectId);
    try {
      const res = await fetch(
        `/api/comunicacion/aprobaciones/${rejectId}/rechazar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comentario: rejectComment }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Mensaje rechazado — vuelve a borrador");
      setRejectId(null);
      setRejectComment("");
      fetchAprobaciones();
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setProcessing(null);
    }
  };

  const handleEditar = async () => {
    if (!editId || !editText.trim()) {
      toast.error("El texto no puede estar vacío");
      return;
    }

    setProcessing(editId);
    try {
      const res = await fetch(
        `/api/comunicacion/aprobaciones/${editId}/editar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textoEditado: editText }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Mensaje editado y enviado");
      setEditId(null);
      setEditText("");
      fetchAprobaciones();
    } catch {
      toast.error("Error al editar y enviar");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-DEFAULT" />
      </div>
    );
  }

  if (aprobaciones.length === 0) {
    return (
      <div className="text-center py-20 text-t-secondary">
        <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No hay mensajes pendientes de aprobación</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {aprobaciones.map((aprob) => {
          const contacto = aprob.mensaje.conversacion.contactos[0]?.contacto;
          const isAIDraft = !aprob.mensaje.userId;

          return (
            <div
              key={aprob.id}
              className="bg-bg-card/80 border border-border rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-t-primary">
                      Para:{" "}
                      {contacto
                        ? `${contacto.nombre} (${contacto.email})`
                        : aprob.mensaje.para.join(", ")}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Re: {aprob.mensaje.conversacion.asunto}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-t-tertiary">
                    {isAIDraft ? (
                      <>
                        <Bot className="h-3 w-3" />
                        <span>Borrador automático (IA)</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span>Escrito por operador</span>
                      </>
                    )}
                    <span className="mx-1">&middot;</span>
                    <span>
                      {format(new Date(aprob.createdAt), "dd/MM HH:mm", {
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message preview */}
              <div className="bg-bg-card/50 rounded-lg p-4 text-sm text-t-primary whitespace-pre-wrap border border-border">
                {stripHtml(aprob.mensaje.cuerpo)}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={() => handleAprobar(aprob.id)}
                  disabled={processing === aprob.id}
                >
                  {processing === aprob.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Aprobar y enviar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditId(aprob.id);
                    setEditText(stripHtml(aprob.mensaje.cuerpo));
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar y enviar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => setRejectId(aprob.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Rechazar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editId}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar y enviar</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={10}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditar}
              disabled={!!processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Enviar editado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar mensaje</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Motivo del rechazo..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={!!processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Rechazar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
