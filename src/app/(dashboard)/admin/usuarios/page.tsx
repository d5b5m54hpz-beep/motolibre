"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { Plus, Search, RotateCcw, ChevronLeft, ChevronRight, MoreVertical, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  activo: boolean;
  phone: string | null;
  createdAt: string;
  _count: { sessions: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ── Constants ──────────────────────────────────────────────────────

const ROLES = ["ADMIN", "OPERADOR", "CLIENTE", "CONTADOR", "RRHH_MANAGER", "COMERCIAL", "VIEWER"] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OPERADOR: "Operador",
  CLIENTE: "Cliente",
  CONTADOR: "Contador",
  RRHH_MANAGER: "RRHH",
  COMERCIAL: "Comercial",
  VIEWER: "Viewer",
};

// ── Page ───────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterRole, setFilterRole] = useState("");
  const [filterActivo, setFilterActivo] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "OPERADOR" });
  const [createLoading, setCreateLoading] = useState(false);

  // Reset password dialog state
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

  // ── Debounce search ──
  useEffect(() => {
    const timeout = setTimeout(() => setSearchDebounced(searchQuery), 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ── Fetch users ──
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRole) params.set("rol", filterRole);
    if (filterActivo) params.set("activo", "true");
    if (searchDebounced) params.set("busqueda", searchDebounced);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/usuarios?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data);
        setPagination(json.pagination);
      } else {
        toast.error("Error al cargar usuarios");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterActivo, searchDebounced]);

  useEffect(() => {
    void fetchUsers(1);
  }, [fetchUsers]);

  // ── Actions ──

  async function handleChangeRole(userId: string, newRole: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al cambiar rol");
      }
      toast.success("Rol actualizado");
      setChangingRole(null);
      void fetchUsers(pagination.page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar rol");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleActivo(userId: string, currentActivo: boolean) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !currentActivo }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al cambiar estado");
      }
      toast.success(currentActivo ? "Usuario desactivado" : "Usuario activado");
      setOpenMenu(null);
      void fetchUsers(pagination.page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetPassword(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/usuarios/${userId}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al resetear password");
      }
      const json = await res.json();
      setResetPasswordResult(json.password);
      setOpenMenu(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al resetear password");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreate() {
    if (createForm.name.trim().length === 0) { toast.error("El nombre es requerido"); return; }
    if (createForm.email.trim().length === 0) { toast.error("El email es requerido"); return; }
    if (createForm.password.length < 8) { toast.error("La contrasena debe tener al menos 8 caracteres"); return; }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al crear usuario");
      }
      toast.success("Usuario creado");
      setShowCreateDialog(false);
      setCreateForm({ name: "", email: "", password: "", role: "OPERADOR" });
      void fetchUsers(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Helpers ──

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const isSelf = (userId: string) => userId === currentUserId;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestion de usuarios del sistema"
        actions={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 bg-accent-DEFAULT hover:bg-accent-hover text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      />

      {/* ── Filters ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterActivo(!filterActivo)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              filterActivo
                ? "bg-positive/10 border-positive/30 text-positive"
                : "bg-bg-input border-border text-t-secondary"
            }`}
          >
            {filterActivo ? "Activos" : "Todos"}
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-t-secondary" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-t-primary placeholder:text-t-secondary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-accent-DEFAULT border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-t-secondary text-sm">
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-input/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-secondary uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-secondary uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-secondary uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-t-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                  >
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-accent-DEFAULT/15 flex items-center justify-center">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-accent-DEFAULT">
                              {getInitials(user.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-t-primary">
                            {user.name}
                            {isSelf(user.id) && (
                              <span className="ml-2 text-xs text-t-tertiary">(tu)</span>
                            )}
                          </p>
                          {user.phone && (
                            <p className="text-xs text-t-tertiary">{user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-t-primary">
                      {user.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {changingRole === user.id ? (
                        <select
                          defaultValue={user.role}
                          autoFocus
                          disabled={actionLoading === user.id}
                          onChange={(e) => void handleChangeRole(user.id, e.target.value)}
                          onBlur={() => setChangingRole(null)}
                          className="bg-bg-input border border-border rounded-xl px-2 py-1 text-xs text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={user.role} />
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      {user.activo ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-positive">
                          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-t-secondary">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                          Inactivo
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {isSelf(user.id) ? (
                        <span className="text-xs text-t-tertiary">--</span>
                      ) : (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl hover:bg-bg-card-hover transition-colors text-t-secondary hover:text-t-primary disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-accent-DEFAULT border-t-transparent rounded-full" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>

                          {openMenu === user.id && (
                            <>
                              {/* Backdrop to close menu */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-bg-card border border-border rounded-xl shadow-lg py-1">
                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setChangingRole(user.id);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-t-primary hover:bg-bg-card-hover transition-colors"
                                >
                                  Cambiar rol
                                </button>
                                <button
                                  onClick={() => void handleToggleActivo(user.id, user.activo)}
                                  className="w-full text-left px-3 py-2 text-sm text-t-primary hover:bg-bg-card-hover transition-colors"
                                >
                                  {user.activo ? "Desactivar" : "Activar"}
                                </button>
                                <button
                                  onClick={() => void handleResetPassword(user.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-t-primary hover:bg-bg-card-hover transition-colors"
                                >
                                  Reset password
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-t-secondary">
              {pagination.total} usuario{pagination.total !== 1 ? "s" : ""} total{pagination.total !== 1 ? "es" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border hover:bg-bg-card-hover transition-colors text-t-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-t-primary font-medium tabular-nums">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => void fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border hover:bg-bg-card-hover transition-colors text-t-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create User Dialog ── */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-bg-card border border-border rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-semibold text-t-primary">Nuevo usuario</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-bg-card-hover transition-colors text-t-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-t-secondary mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Nombre completo"
                  className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-secondary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-t-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="usuario@motolibre.com"
                  className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-secondary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-t-secondary mb-1.5">
                  Contrasena <span className="text-t-tertiary">(min 8 caracteres)</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="********"
                  className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary placeholder:text-t-secondary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-t-secondary mb-1.5">
                  Rol
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-t-primary focus:outline-none focus:ring-2 focus:ring-accent-DEFAULT/50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => void handleCreate()}
                disabled={createLoading}
                className="w-full bg-accent-DEFAULT hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Creando...
                  </span>
                ) : (
                  "Crear usuario"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Result Dialog ── */}
      {resetPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setResetPasswordResult(null)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-bg-card border border-border rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-t-primary mb-2">
              Password reseteado
            </h2>
            <p className="text-sm text-t-secondary mb-4">
              La nueva contrasena generada es:
            </p>
            <div className="bg-bg-input border border-border rounded-xl px-4 py-3 text-center">
              <code className="text-lg font-mono font-bold text-accent-DEFAULT select-all">
                {resetPasswordResult}
              </code>
            </div>
            <p className="text-xs text-t-tertiary mt-3">
              Copia esta contrasena. No se mostrara de nuevo.
            </p>
            <button
              onClick={() => setResetPasswordResult(null)}
              className="mt-4 w-full bg-accent-DEFAULT hover:bg-accent-hover text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
