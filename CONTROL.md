# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F3 — Operaciones |
| **Punto Actual** | 3.2 — siguiente punto |
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
| 1.4 | Pagos MercadoPago | 2026-02-21 | SDK MP (Checkout Pro + PreApproval + PaymentRefund), webhook, suscripción recurrente, refund, /admin/pagos, PagoMercadoPago + SuscripcionMP modelos |
| 1.5 | Facturación | 2026-02-21 | Factura A/B (condición IVA), CAE stub, PDF con pdfkit, email con Resend, auto-generación en webhook, 4 API routes, /admin/facturas + detalle, KPIs dashboard |
| 2.1 | Plan de Cuentas y Asientos Contables | 2026-02-21 | Plan FACPCE 65 cuentas (4 niveles), CuentaContable + AsientoContable + LineaAsiento + PeriodoContable, partida doble estricta, helper crearAsiento(), CUENTAS constante, 7 API routes, 5 páginas (árbol cuentas, asientos listado/detalle/nuevo, períodos), sidebar Contabilidad |
| 2.2 | Handlers de Contabilidad Automática | 2026-02-21 | 16 event handlers contables (8 completos + 8 stubs), asientos automáticos en partida doble, eventBus.emit() conectado en webhook MP + facturación + rechazo solicitud, API diagnóstico /api/admin/contabilidad/verificar, prioridad P50 |
| 2.3 | Gastos + Presupuestos + NC + FC | 2026-02-21 | 4 modelos (Gasto, PresupuestoMensual, NotaCredito, FacturaCompra), 6 enums, 10 API routes, 4 páginas admin, 2 handlers contables nuevos (NC completo + purchaseInvoice create/pay), gastos-utils helper, 4 validaciones Zod, KPIs dashboard |
| 2.4 | Reportes Financieros | 2026-02-21 | 5 APIs cálculo tiempo real (resumen, estado-resultados, flujo-caja, indicadores, rentabilidad), 5 páginas con Recharts (dashboard financiero, EERR formato contable, flujo diario, indicadores 3 secciones, rentabilidad por moto con gráfico barras), sidebar grupo Finanzas 5 items, Quick Actions +2 — **FASE 2 COMPLETA** |
| 3.1 | Mantenimientos (OT) | 2026-02-21 | 8 modelos (OrdenTrabajo, TareaOT, RepuestoOT, FotoInspeccion, HistorialOT, PlanMantenimiento, TareaPlan, RepuestoTareaPlan), 6 enums (EstadoOT, TipoOT, PrioridadOT, TipoService, CategoriaTarea, ResultadoTarea), flujo 8 estados con validación transiciones, 11 API routes (OT CRUD + estado + tareas + repuestos + fotos + planes CRUD + generar-ot + estadísticas), 3 páginas (listado OT con stats, detalle OT con acciones por estado, planes con generar OT), seed 2 planes, completar MantenimientoProgramado puede generar OT, sidebar Flota +2 items, dashboard OTs Activas KPI, Quick Actions +1 |

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
| D010 | 2026-02-21 | Pagos 100% automáticos vía MP webhook. Admin NO registra pagos manualmente. PaymentRefund.create (no Payment.refund) para reembolsos. |
| D011 | 2026-02-21 | Contabilidad: partida doble es LEY. Asientos automáticos NO se crean en 2.1, se conectan en 2.2 con event handlers. Motos son Bienes de Uso con amortización lineal. |

## Próxima Acción

Ir al chat CTO y pedir: **"Dame el prompt del punto 3.2"**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| P001 | Google OAuth no funciona sin GOOGLE_CLIENT_ID/SECRET | Media | Pendiente (se configura en Railway) |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 18 / 35 (+ REFACTOR-A + REFACTOR-B) |
| **Fase F0** | ✅ COMPLETA (5/5 puntos) |
| **Fase F1** | ✅ COMPLETA (5 puntos + 2 refactors) |
| **Fase F2** | ✅ COMPLETA (4 puntos: 2.1-2.4) |
| Fase actual | F3 — Operaciones (3.1 completado) |
| Modelos Prisma | 42 (+8 OT) |
| Enums | 26 (+6 OT) |
| API routes | 94 (+11 mantenimientos) |
| Páginas | 37 (+3 OT: listado, detalle, planes) |
| Event handlers contables | 18 (10 completos + 8 stubs) |
| Cuentas contables seeded | 65 (4 niveles FACPCE) |
| Tests | 0 |
| PermissionProfiles seeded | 8 |
| Deploy | Railway — motolibre-production.up.railway.app |

## Flujo de Negocio Implementado

```
Cliente se autoregistra → sube docs → POST /api/solicitudes/crear-con-pago → link MP Checkout Pro
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
