# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F0 — FUNDACIÓN |
| **Punto Actual** | 0.1 — Scaffolding del Proyecto |
| **Estado** | ✅ COMPLETADO |
| **Última Actualización** | 2026-02-20 |
| **Bloqueadores** | Ninguno |

## Puntos Completados

| Punto | Nombre | Fecha | Notas |
|-------|--------|-------|-------|
| 0.1 | Scaffolding del Proyecto | 2026-02-20 | Proyecto creado, Prisma configurado, utils listos |

## Decisiones Tomadas

| # | Fecha | Decisión |
|---|-------|----------|
| D001 | 2026-02-20 | Reconstrucción desde cero (no iterativo sobre v2) |
| D002 | 2026-02-20 | Repo: motolibre. DB: Neon PostgreSQL. Deploy: Railway + dev local |
| D003 | 2026-02-20 | Stack: Next.js 15, Prisma 7, NextAuth v5, Shadcn/ui, Tailwind 4 |
| D004 | 2026-02-20 | Arquitectura event-driven obligatoria |
| D005 | 2026-02-20 | Prisma 7 (latest) — cliente en src/generated/prisma, config en prisma.config.ts |
| D006 | 2026-02-20 | Tailwind 4 (latest) — colores custom en @theme inline en globals.css |

## Próxima Acción

Ir al chat CTO y pedir: **"Dame el prompt del punto 0.2"**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| — | Ninguno | — | — |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 1 / 35 |
| Fase actual | F0 (1/5 puntos) |
| Modelos Prisma | 2 (User, ConfiguracionEmpresa) |
| API routes | 0 |
| Páginas | 1 (home temporal) |
| Tests | 0 |
