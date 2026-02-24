"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DSStatCard } from "@/components/ui/ds-stat-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Inbox,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Contacto {
  id: string;
  nombre: string;
  email: string;
  tipo: string;
}

interface Conversacion {
  id: string;
  asunto: string;
  estado: string;
  prioridad: string;
  resumenIA: string | null;
  updatedAt: string;
  contactos: Array<{
    contacto: Contacto;
  }>;
  mensajes: Array<{
    id: string;
    cuerpo: string;
    de: string;
    direccion: string;
    createdAt: string;
  }>;
  _count: { mensajes: number };
}

const prioridadColors: Record<string, string> = {
  URGENTE: "bg-red-500/20 text-red-400 border-red-500/30",
  ALTA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAJA: "bg-green-500/20 text-green-400 border-green-500/30",
};

const tipoContactoLabel: Record<string, string> = {
  PROVEEDOR: "Proveedor",
  CONTADOR: "Contador",
  ABOGADO: "Abogado",
  DESPACHANTE: "Despachante",
  ASEGURADORA: "Aseguradora",
  TALLER_EXTERNO: "Taller Ext.",
  CLIENTE_POTENCIAL: "Cliente Pot.",
  OTRO: "Otro",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").slice(0, 120);
}

export function BandejaComunicacion() {
  const router = useRouter();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("ABIERTA");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    pendientes: 0,
    aprobaciones: 0,
    hoy: 0,
  });

  // New conversation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [newAsunto, setNewAsunto] = useState("");
  const [newContactoId, setNewContactoId] = useState("");

  const fetchConversaciones = useCallback(async () => {
    try {
      const params = new URLSearchParams({ estado });
      if (search) params.set("search", search);
      const res = await fetch(
        `/api/comunicacion/conversaciones?${params.toString()}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setConversaciones(json.data);
    } catch {
      toast.error("Error al cargar conversaciones");
    } finally {
      setLoading(false);
    }
  }, [estado, search]);

  const fetchStats = useCallback(async () => {
    try {
      const [convRes, aprobRes] = await Promise.all([
        fetch("/api/comunicacion/conversaciones?estado=ABIERTA&limit=1000"),
        fetch("/api/comunicacion/aprobaciones?estado=PENDIENTE"),
      ]);
      const convJson = await convRes.json();
      const aprobJson = await aprobRes.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMessages = (convJson.data || []).reduce(
        (count: number, c: Conversacion) => {
          const lastMsg = c.mensajes?.[0];
          if (lastMsg && new Date(lastMsg.createdAt) >= today) return count + 1;
          return count;
        },
        0
      );

      setStats({
        pendientes: convJson.total || 0,
        aprobaciones: (aprobJson.data || []).length,
        hoy: todayMessages,
      });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchConversaciones();
    fetchStats();
  }, [fetchConversaciones, fetchStats]);

  const fetchContactos = async () => {
    try {
      const res = await fetch("/api/comunicacion/contactos?limit=100");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setContactos(json.data || []);
    } catch {
      toast.error("Error al cargar contactos");
    }
  };

  const handleCreateConversacion = async () => {
    if (!newAsunto.trim() || !newContactoId) {
      toast.error("Completá asunto y contacto");
      return;
    }

    try {
      const res = await fetch("/api/comunicacion/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asunto: newAsunto,
          contactoIds: [newContactoId],
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setDialogOpen(false);
      setNewAsunto("");
      setNewContactoId("");
      router.push(`/admin/comunicacion/conversaciones/${json.data.id}`);
    } catch {
      toast.error("Error al crear conversación");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DSStatCard
          title="Abiertas"
          value={stats.pendientes}
          icon={Inbox}
          iconColor="warning"
        />
        <DSStatCard
          title="Pendientes aprobación"
          value={stats.aprobaciones}
          icon={Clock}
          iconColor="info"
        />
        <DSStatCard
          title="Mensajes hoy"
          value={stats.hoy}
          icon={Mail}
          iconColor="accent"
        />
      </div>

      {/* Tabs + Search + New */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-bg-card/50 rounded-lg p-1 border border-border">
          {["ABIERTA", "RESUELTA", "ARCHIVADA"].map((tab) => (
            <button
              key={tab}
              onClick={() => setEstado(tab)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                estado === tab
                  ? "bg-accent-DEFAULT text-white"
                  : "text-t-secondary hover:text-t-primary"
              )}
            >
              {tab === "ABIERTA"
                ? "Abiertas"
                : tab === "RESUELTA"
                  ? "Resueltas"
                  : "Archivadas"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-t-tertiary" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) fetchContactos();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva conversación</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Asunto</Label>
                  <Input
                    value={newAsunto}
                    onChange={(e) => setNewAsunto(e.target.value)}
                    placeholder="Asunto de la conversación"
                  />
                </div>
                <div>
                  <Label>Contacto</Label>
                  <Select
                    value={newContactoId}
                    onValueChange={setNewContactoId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar contacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateConversacion} className="w-full">
                  Crear conversación
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Conversation list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-t-secondary">Cargando...</div>
        ) : conversaciones.length === 0 ? (
          <div className="text-center py-12 text-t-secondary">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay conversaciones {estado.toLowerCase()}s</p>
          </div>
        ) : (
          conversaciones.map((conv) => {
            const contacto = conv.contactos[0]?.contacto;
            const lastMsg = conv.mensajes[0];
            return (
              <button
                key={conv.id}
                onClick={() =>
                  router.push(
                    `/admin/comunicacion/conversaciones/${conv.id}`
                  )
                }
                className="w-full text-left bg-bg-card/80 border border-border rounded-xl p-4 hover:border-border-hover hover:shadow-lg hover:shadow-accent-glow/5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold",
                          prioridadColors[conv.prioridad]
                        )}
                      >
                        {conv.prioridad}
                      </Badge>
                      <span className="text-xs text-t-tertiary">
                        {formatDistanceToNow(new Date(conv.updatedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-t-primary truncate">
                      {conv.asunto}
                    </h3>
                    {contacto && (
                      <p className="text-sm text-t-secondary">
                        {contacto.nombre}
                        {contacto.tipo && (
                          <span className="text-t-tertiary">
                            {" "}
                            ({tipoContactoLabel[contacto.tipo] || contacto.tipo})
                          </span>
                        )}
                      </p>
                    )}
                    {lastMsg && (
                      <p className="text-sm text-t-tertiary mt-1 truncate">
                        {stripHtml(lastMsg.cuerpo)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {conv.estado === "RESUELTA" && (
                      <CheckCircle className="h-4 w-4 text-positive" />
                    )}
                    {conv.prioridad === "URGENTE" && (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-xs text-t-tertiary">
                      {conv._count.mensajes} msg
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
