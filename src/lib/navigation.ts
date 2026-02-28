import {
  LayoutDashboard, Bike, Users, FileText, CreditCard, Receipt,
  Wrench, Building2, Package, Truck, Ship, ShoppingCart,
  PiggyBank, BookOpen, FileSpreadsheet,
  BarChart3, UserCog, Shield, AlertTriangle, Settings,
  ClipboardList, Calendar, Cog, MapPin, Scale,
  Activity, Upload, Inbox, Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  pinned?: boolean;
}

export const navigation: NavGroup[] = [
  // ── General (no collapsible) ───────────────────────────────────────────────
  {
    title: "General",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },

  // ── Operaciones ────────────────────────────────────────────────────────────
  {
    title: "Operaciones",
    icon: Bike,
    items: [
      { title: "Motos", href: "/admin/motos", icon: Bike },
      { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench },
      {
        title: "Talleres",
        href: "/admin/talleres",
        icon: Building2,
        children: [
          { title: "Red de Talleres", href: "/admin/talleres", icon: Building2 },
          { title: "Solicitudes", href: "/admin/talleres/solicitudes", icon: ClipboardList },
          { title: "Mapa de Red", href: "/admin/talleres/mapa", icon: MapPin },
        ],
      },
      { title: "Items Service", href: "/admin/items-service", icon: Cog },
    ],
  },

  // ── Comercial ──────────────────────────────────────────────────────────────
  {
    title: "Comercial",
    icon: Users,
    items: [
      { title: "Solicitudes", href: "/admin/solicitudes", icon: FileText },
      { title: "Clientes", href: "/admin/clientes", icon: Users },
      { title: "Contratos", href: "/admin/contratos", icon: Receipt },
      { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
      { title: "Morosidad", href: "/admin/morosidad", icon: AlertTriangle },
    ],
  },

  // ── Inventario ─────────────────────────────────────────────────────────────
  {
    title: "Inventario",
    icon: Package,
    items: [
      { title: "Repuestos", href: "/admin/repuestos", icon: Package },
      { title: "Proveedores", href: "/admin/proveedores", icon: Truck },
      { title: "Ordenes de Compra", href: "/admin/ordenes-compra", icon: ShoppingCart },
      { title: "Importaciones", href: "/admin/importaciones", icon: Ship },
    ],
  },

  // ── Finanzas (merged con Contabilidad) ─────────────────────────────────────
  {
    title: "Finanzas",
    icon: BarChart3,
    items: [
      { title: "Dashboard", href: "/admin/finanzas", icon: BarChart3 },
      { title: "Facturación", href: "/admin/facturas", icon: FileSpreadsheet },
      { title: "Gastos", href: "/admin/gastos", icon: PiggyBank },
      { title: "Presupuestos", href: "/admin/presupuestos", icon: Wallet },
      { title: "Contabilidad", href: "/admin/cuentas-contables", icon: BookOpen },
      { title: "Conciliación", href: "/admin/conciliacion", icon: Scale },
    ],
  },

  // ── RRHH ───────────────────────────────────────────────────────────────────
  {
    title: "RRHH",
    icon: UserCog,
    items: [
      { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog },
      { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: Calendar },
      { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Receipt },
    ],
  },

  // ── Configuración (pinned al fondo) ────────────────────────────────────────
  {
    title: "Configuración",
    icon: Settings,
    pinned: true,
    items: [
      { title: "Empresa", href: "/admin/configuracion/empresa", icon: Settings },
      { title: "Usuarios", href: "/admin/usuarios", icon: Shield },
      { title: "Sistema", href: "/admin/sistema", icon: Activity },
      { title: "Comunicación", href: "/admin/comunicacion", icon: Inbox },
      { title: "Export/Import", href: "/admin/configuracion/export-import", icon: Upload },
    ],
  },
];
