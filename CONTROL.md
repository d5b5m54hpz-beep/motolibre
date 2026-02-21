# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F1 — GESTIÓN DE FLOTA |
| **Punto Actual** | 1.4 — siguiente punto |
| **Estado** | ✅ LISTO |
| **Última Actualización** | 2026-02-21 |
| **Bloqueadores** | Google OAuth requiere GOOGLE_CLIENT_ID/SECRET (se configura en Railway) |

## Puntos Completados

| Punto | Nombre | Fecha | Notas |
|-------|--------|-------|-------|
| 0.1 | Scaffolding del Proyecto | 2026-02-20 | Proyecto creado, Prisma 6, utils listos |
| 0.2 | Autenticación y Middleware | 2026-02-20 | NextAuth v5, seed admin, middleware, 3 páginas auth |
| 0.3 | EventBus + Permissions | 2026-02-20 | OPERATIONS registry, EventBus, requirePermission, 8 perfiles seed |
| 0.4 | Layout Base | 2026-02-20 | Sidebar colapsable, Header + avatar, DataTable, PageHeader, StatusBadge |
| 0.5 | Dashboard Admin Home | 2026-02-20 | 6 KPI cards, Recharts, actividad reciente, acciones rápidas — F0 COMPLETA |
| 1.1 | Gestión de Motos | 2026-02-20 | CRUD completo, 12 estados, máquina transiciones, 6 API routes, listado + detalle con tabs, KPIs reales |
| 1.2 | Gestión de Clientes | 2026-02-20 | CRUD + flujo aprobación, scoring automático, 5 API routes, listado + detalle con tabs, KPI dashboard |
| 1.3 | Contratos de Alquiler | 2026-02-20 | Modelo Contrato + Cuota, flujo BORRADOR→ACTIVO→FIN, preview, 9 API routes, listado + detalle con cuotas |
| REFACTOR-A | Pricing + Solicitudes | 2026-02-21 | Flujo real corregido: cliente paga → evaluación → espera → asignación. TarifaAlquiler + Solicitud (10 estados), 9 API routes, /admin/solicitudes + /admin/pricing, UI corrections |
| REFACTOR-B | Auto-asignación + Entrega + Mantenimientos + Lease-to-Own | 2026-02-21 | Cierre del flujo: asignación automática al liberar moto, Registrar Entrega crea contrato+cuotas+mantenimientos, MantenimientoProgramado, lease-to-own plan 24m |

## Decisiones Tomadas

| # | Fecha | Decisión |
|---|-------|----------|
| D001 | 2026-02-20 | Reconstrucción desde cero (no iterativo sobre v2) |
| D002 | 2026-02-20 | Repo: motolibre. DB: Neon PostgreSQL. Deploy: Railway + dev local |
| D003 | 2026-02-20 | Stack: Next.js 15, Prisma 6, NextAuth v5, Shadcn/ui, Tailwind 4 |
| D004 | 2026-02-20 | Arquitectura event-driven obligatoria |
| D005 | 2026-02-20 | Prisma 6 (Prisma 7 descartado — breaking changes en adapter pattern) |
| D006 | 2026-02-20 | Tailwind 4 (latest) — colores custom en @theme inline en globals.css |
| D007 | 2026-02-20 | Deploy: Railway (GitHub auto-deploy). URL: motolibre-production.up.railway.app |
| D008 | 2026-02-21 | Flujo negocio: cliente se autoregistra + paga primer mes → operador evalúa → lista espera → sistema asigna moto. Admin NO crea clientes ni contratos directamente. |
| D009 | 2026-02-21 | Contrato se crea automáticamente al registrar entrega (NO existe "Crear Contrato" ni "Activar Contrato" manual) |

## Próxima Acción

Ir al chat CTO y pedir: **"Dame el prompt del punto 1.4"**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| P001 | Google OAuth no funciona sin GOOGLE_CLIENT_ID/SECRET | Media | Pendiente (se configura en Railway) |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 11 / 35 (+ REFACTOR-A + REFACTOR-B) |
| **Fase F0** | ✅ COMPLETA (5/5 puntos) |
| Fase actual | F1 — Gestión de Flota (3/? puntos + 2 refactors) |
| Modelos Prisma | 23 (+ MantenimientoProgramado) |
| Enums Prisma | + EstadoMantenimiento |
| API routes | 49 (+ 7 REFACTOR-B: entregar, procesar-cola, procesar-lease-to-own, mantenimientos GET, completar, no-asistio) |
| Páginas | 17 (+ /admin/mantenimientos) |
| Tests | 0 |
| PermissionProfiles seeded | 8 |
| Componentes UI | DataTable, DataTableColumnHeader, PageHeader, AppSidebar, AppHeader, StatusBadge, KPICards, EventsChart, UsersByRole, RecentActivity, QuickActions, SolicitudesTable, PricingModelCard, MantenimientosTable |
| Deploy | Railway — motolibre-production.up.railway.app |

## Flujo de Negocio Implementado

```
Cliente se autoregistra → sube docs → paga primer mes (MP, en 1.4)
  ↓
Solicitud PAGADA → Operador evalúa → aprueba → EN_ESPERA con prioridad
  ↓
Moto se libera → sistema detecta cola → ASIGNADA automáticamente (moto RESERVADA)
  ↓
Operador coordina entrega → Registrar Entrega →
  - Contrato ACTIVO creado con cuotas semanales
  - Moto → ALQUILADA
  - Mantenimientos programados cada 30 días
  - Solicitud → ENTREGADA
  ↓
Plan 24 meses → todas cuotas pagadas → procesarLeaseToOwn → Moto TRANSFERIDA
```
