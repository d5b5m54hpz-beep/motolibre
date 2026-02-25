import {
  LayoutDashboard, Bike, Users, FileText, CreditCard, Receipt,
  Wrench, Building2, Package, Truck, Ship, ShoppingCart,
  TrendingUp, PiggyBank, Calculator, BookOpen, FileSpreadsheet,
  BarChart3, UserCog, Shield, Bell, AlertTriangle, Settings,
  ClipboardList, Gauge, Calendar, Cog,
  ArrowUpDown, Target, MapPin, ShoppingBag, Tags, Sparkles, Scale,
  Activity, Radio, Stethoscope, Clock, Upload, MessageCircle,
  Inbox, CheckSquare, BookUser, ListChecks, Wallet, CalendarClock,
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
}

export const navigation: NavGroup[] = [
  {
    title: "General",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Flota",
    icon: Bike,
    items: [
      { title: "Motos", href: "/admin/motos", icon: Bike },
      { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench },
      { title: "Órdenes de Trabajo", href: "/admin/mantenimientos/ordenes", icon: ClipboardList },
      { title: "Planes Service", href: "/admin/mantenimientos/planes", icon: ListChecks },
      { title: "Catálogo Servicios", href: "/admin/items-service", icon: Cog },
      {
        title: "Talleres",
        href: "/admin/talleres",
        icon: Building2,
        children: [
          { title: "Red de Talleres", href: "/admin/talleres", icon: Building2 },
          { title: "Solicitudes", href: "/admin/talleres/solicitudes", icon: ClipboardList },
        ],
      },
    ],
  },
  {
    title: "Comercial",
    icon: Users,
    items: [
      { title: "Solicitudes", href: "/admin/solicitudes", icon: FileText },
      { title: "Clientes", href: "/admin/clientes", icon: Users },
      { title: "Contratos", href: "/admin/contratos", icon: Receipt },
      { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
      { title: "Facturas", href: "/admin/facturas", icon: FileSpreadsheet },
      { title: "Notas de Crédito", href: "/admin/notas-credito", icon: FileText },
      { title: "Ventas Repuestos", href: "/admin/ventas-repuestos", icon: ShoppingBag },
      { title: "Conversaciones", href: "/admin/chat", icon: MessageCircle },
    ],
  },
  {
    title: "Pricing",
    icon: Calculator,
    items: [
      { title: "Pricing Alquiler", href: "/admin/pricing", icon: Calculator },
      { title: "Pricing Repuestos", href: "/admin/pricing-repuestos", icon: Tags },
    ],
  },
  {
    title: "Supply Chain",
    icon: Package,
    items: [
      { title: "Proveedores", href: "/admin/proveedores", icon: Truck },
      { title: "Órdenes de Compra", href: "/admin/ordenes-compra", icon: ShoppingCart },
      { title: "Inventario", href: "/admin/repuestos", icon: Package },
      { title: "Ubicaciones", href: "/admin/repuestos/ubicaciones", icon: MapPin },
      { title: "Sugerencia Compra", href: "/admin/repuestos/sugerencia-compra", icon: Target },
      { title: "Importaciones", href: "/admin/importaciones", icon: Ship },
    ],
  },
  {
    title: "Finanzas",
    icon: BarChart3,
    items: [
      { title: "Dashboard", href: "/admin/finanzas", icon: BarChart3 },
      { title: "Estado Resultados", href: "/admin/finanzas/estado-resultados", icon: TrendingUp },
      { title: "Flujo de Caja", href: "/admin/finanzas/flujo-caja", icon: ArrowUpDown },
      { title: "Indicadores", href: "/admin/finanzas/indicadores", icon: Gauge },
      { title: "Rentabilidad", href: "/admin/finanzas/rentabilidad", icon: Target },
      { title: "Gastos", href: "/admin/gastos", icon: PiggyBank },
      { title: "Presupuestos", href: "/admin/presupuestos", icon: Wallet },
    ],
  },
  {
    title: "Contabilidad",
    icon: BookOpen,
    items: [
      { title: "Plan de Cuentas", href: "/admin/cuentas-contables", icon: BookOpen },
      { title: "Asientos", href: "/admin/asientos", icon: Calculator },
      { title: "Períodos", href: "/admin/periodos", icon: CalendarClock },
      { title: "Facturas Compra", href: "/admin/facturas-compra", icon: FileSpreadsheet },
      { title: "Conciliación", href: "/admin/conciliacion", icon: Scale },
    ],
  },
  {
    title: "Inteligencia",
    icon: Sparkles,
    items: [
      { title: "Anomalías", href: "/admin/anomalias", icon: AlertTriangle },
      { title: "Asistente Eve", href: "/admin/asistente", icon: Sparkles },
    ],
  },
  {
    title: "RRHH",
    icon: UserCog,
    items: [
      { title: "Dashboard", href: "/admin/rrhh", icon: LayoutDashboard },
      { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog },
      { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: Calendar },
      { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Receipt },
    ],
  },
  {
    title: "Comunicación",
    icon: Inbox,
    items: [
      { title: "Bandeja", href: "/admin/comunicacion", icon: Inbox },
      { title: "Aprobaciones", href: "/admin/comunicacion/aprobaciones", icon: CheckSquare },
      { title: "Contactos", href: "/admin/comunicacion/contactos", icon: BookUser },
      { title: "Configuración", href: "/admin/comunicacion/configuracion", icon: Settings },
    ],
  },
  {
    title: "Sistema",
    icon: Activity,
    items: [
      { title: "Monitor", href: "/admin/sistema", icon: Activity },
      { title: "Eventos", href: "/admin/sistema/eventos", icon: Radio },
      { title: "Diagnóstico", href: "/admin/sistema/diagnostico", icon: Stethoscope },
      { title: "Cron Jobs", href: "/admin/sistema/cron", icon: Clock },
      { title: "Alertas", href: "/admin/alertas", icon: Bell },
      { title: "Usuarios", href: "/admin/usuarios", icon: Shield },
      { title: "Empresa", href: "/admin/configuracion/empresa", icon: Settings },
      { title: "Export/Import", href: "/admin/configuracion/export-import", icon: Upload },
    ],
  },
];
