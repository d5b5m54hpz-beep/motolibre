import {
  LayoutDashboard, Bike, Users, FileText, CreditCard, Receipt,
  Wrench, Building2, Package, Truck, Ship, DollarSign,
  TrendingUp, PiggyBank, Calculator, BookOpen, FileSpreadsheet,
  BarChart3, UserCog, Shield, Bell, AlertTriangle, Settings,
  Bot, Mail, Languages, ClipboardList, Gauge,
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
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: "General",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Flota",
    items: [
      { title: "Motos", href: "/admin/motos", icon: Bike },
      { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench },
      { title: "Talleres", href: "/admin/talleres", icon: Building2 },
    ],
  },
  {
    title: "Comercial",
    items: [
      { title: "Clientes", href: "/admin/clientes", icon: Users },
      { title: "Contratos", href: "/admin/contratos", icon: FileText },
      { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
      { title: "Facturas", href: "/admin/facturas", icon: Receipt },
      { title: "Notas de Crédito", href: "/admin/notas-credito", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      { title: "Inventario", href: "/admin/repuestos", icon: Package },
      { title: "Proveedores", href: "/admin/proveedores", icon: Truck },
      { title: "Importaciones", href: "/admin/importaciones", icon: Ship },
      { title: "Precios Repuestos", href: "/admin/pricing-repuestos", icon: DollarSign },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { title: "Dashboard Financiero", href: "/admin/finanzas", icon: TrendingUp },
      { title: "Gastos", href: "/admin/gastos", icon: PiggyBank },
      { title: "Presupuestos", href: "/admin/presupuestos", icon: ClipboardList },
      { title: "Rentabilidad", href: "/admin/rentabilidad", icon: Gauge },
    ],
  },
  {
    title: "Contabilidad",
    items: [
      { title: "Plan de Cuentas", href: "/admin/cuentas-contables", icon: BookOpen },
      { title: "Asientos", href: "/admin/asientos-contables", icon: Calculator },
      { title: "Facturas Compra", href: "/admin/facturas-compra", icon: FileSpreadsheet },
      { title: "Reportes", href: "/admin/reportes-contables", icon: BarChart3 },
    ],
  },
  {
    title: "RRHH",
    items: [
      { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog },
      { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: ClipboardList },
      { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Receipt },
    ],
  },
  {
    title: "Sistema",
    items: [
      { title: "Usuarios", href: "/admin/usuarios", icon: Users },
      { title: "Permisos", href: "/admin/permisos", icon: Shield },
      { title: "Alertas", href: "/admin/alertas", icon: Bell },
      { title: "Anomalías", href: "/admin/anomalias", icon: AlertTriangle },
      { title: "Configuración", href: "/admin/configuracion", icon: Settings },
      { title: "Diagnóstico", href: "/admin/diagnostico", icon: Gauge },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { title: "Asistente IA", href: "/admin/asistente", icon: Bot },
      { title: "Comunicación", href: "/admin/comunicacion", icon: Mail },
      { title: "Traducciones", href: "/admin/traducciones", icon: Languages },
    ],
  },
];
