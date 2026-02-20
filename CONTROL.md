# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F1 — GESTIÓN DE FLOTA |
| **Punto Actual** | 1.4 — siguiente punto |
| **Estado** | ✅ LISTO |
| **Última Actualización** | 2026-02-20 |
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

## Próxima Acción

Ir al chat CTO y pedir: **"Dame el prompt del punto 1.4"**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| P001 | Google OAuth no funciona sin GOOGLE_CLIENT_ID/SECRET | Media | Pendiente (se configura en Railway) |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 8 / 35 |
| **Fase F0** | ✅ COMPLETA (5/5 puntos) |
| Fase actual | F1 — Gestión de Flota (3/? puntos) |
| Modelos Prisma | 20 (+ Contrato, Cuota) |
| Enums Prisma | + EstadoContrato, FrecuenciaPago, EstadoCuota |
| API routes | 25 (+ 9 de contratos: GET/POST, [id] GET, activar/cancelar/finalizar/ejercer-compra POST, clientes/aprobados GET, motos/disponibles GET) |
| Páginas | 12 (+ /admin/contratos, /admin/contratos/[id]) |
| Tests | 0 |
| PermissionProfiles seeded | 8 |
| Componentes UI | DataTable, DataTableColumnHeader, PageHeader, AppSidebar, AppHeader, StatusBadge, KPICards, EventsChart, UsersByRole, RecentActivity, QuickActions |
| Deploy | Railway — motolibre-production.up.railway.app |
