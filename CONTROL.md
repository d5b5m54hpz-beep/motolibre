# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F0 — FUNDACIÓN |
| **Punto Actual** | 0.4 — siguiente punto |
| **Estado** | ✅ LISTO |
| **Última Actualización** | 2026-02-20 |
| **Bloqueadores** | Google OAuth requiere GOOGLE_CLIENT_ID/SECRET (se configura en Railway) |

## Puntos Completados

| Punto | Nombre | Fecha | Notas |
|-------|--------|-------|-------|
| 0.1 | Scaffolding del Proyecto | 2026-02-20 | Proyecto creado, Prisma 6, utils listos |
| 0.2 | Autenticación y Middleware | 2026-02-20 | NextAuth v5, seed admin, middleware, 3 páginas auth |
| 0.3 | EventBus + Permissions | 2026-02-20 | OPERATIONS registry, EventBus, requirePermission, 8 perfiles seed |

## Decisiones Tomadas

| # | Fecha | Decisión |
|---|-------|----------|
| D001 | 2026-02-20 | Reconstrucción desde cero (no iterativo sobre v2) |
| D002 | 2026-02-20 | Repo: motolibre. DB: Neon PostgreSQL. Deploy: Railway + dev local |
| D003 | 2026-02-20 | Stack: Next.js 15, Prisma 6, NextAuth v5, Shadcn/ui, Tailwind 4 |
| D004 | 2026-02-20 | Arquitectura event-driven obligatoria |
| D005 | 2026-02-20 | Prisma 6 (Prisma 7 descartado — breaking changes en adapter pattern) |
| D006 | 2026-02-20 | Tailwind 4 (latest) — colores custom en @theme inline en globals.css |

## Próxima Acción

Ir al chat CTO y pedir: **"Dame el prompt del punto 0.4"**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| P001 | Google OAuth no funciona sin GOOGLE_CLIENT_ID/SECRET | Media | Pendiente (se configura en Railway) |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 3 / 35 |
| Fase actual | F0 (3/5 puntos) |
| Modelos Prisma | 9 (User, ConfiguracionEmpresa, Account, Session, VerificationToken, PermissionProfile, PermissionGrant, UserProfile, BusinessEvent) |
| API routes | 4 (/api/auth/[...nextauth], /api/system/events, /api/system/handlers, /api/system/permissions) |
| Páginas | 6 (home, login, login-admin, registro, admin temp, mi-cuenta temp) |
| Tests | 0 |
| PermissionProfiles seeded | 8 (Administrador, Operador Flota, Contador, RRHH Manager, Comercial, Mecánico, Cliente, Auditor) |
