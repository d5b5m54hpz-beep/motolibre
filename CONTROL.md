# CONTROL.md — MotoLibre Estado del Proyecto

> **IMPORTANTE**: Todo chat nuevo DEBE leer este archivo antes de hacer cualquier cosa. Todo chat que complete trabajo DEBE actualizarlo.

## Estado Actual

| Campo | Valor |
|-------|-------|
| **Fase Actual** | F5 — Público y Comunicación |
| **Punto Actual** | 5.4 — COMPLETO, siguiente: 5.5 |
| **Estado** | ✅ LISTO |
| **Última Actualización** | 2026-02-23 |
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
| 3.2 | Talleres y Mecánicos | 2026-02-21 | 2 modelos (Taller, Mecanico), 1 enum (TipoTaller), tallerId/mecanicoId FK en OrdenTrabajo, 4 API routes (talleres CRUD + mecánicos CRUD), página /admin/talleres con tabla expandible y mecánicos, OT detalle muestra taller/mecánico vinculados con select FK, seed 2 talleres + 3 mecánicos |
| 3.3 | Proveedores y Órdenes de Compra | 2026-02-22 | 3 modelos (Proveedor, OrdenCompra, ItemOrdenCompra), 2 enums (TipoProveedor, EstadoOrdenCompra), proveedorId FK en FacturaCompra, flujo OC 5 estados con validación transiciones, IVA 21% auto para RI nacionales, 7 API routes (proveedores CRUD + OC CRUD + estado + items + items/[itemId]), 3 páginas (proveedores listado, OC listado con Suspense, OC detalle con acciones por estado), recepción parcial/total, seed 2 proveedores, sidebar Supply Chain + Quick Actions |
| 3.4 | Inventario de Repuestos | 2026-02-22 | 4 modelos (Repuesto, MovimientoStock, UbicacionDeposito, HistorialCostoRepuesto), 2 enums (CategoriaRepuesto 12 vals, TipoMovimientoStock 6 vals), registrarMovimiento() central, 10 API routes (repuestos CRUD + ajuste-stock + movimientos + sugerencia-compra + dashboard + ubicaciones CRUD), 4 páginas (inventario con stats/filtros, detalle con gauge+movimientos+historial, ubicaciones grilla visual, sugerencia compra con OC auto), integración OT egreso/devolución automática, integración OC ingreso+precio historial, seed 5 ubicaciones + 8 repuestos (4 stock bajo), sidebar +2 items, dashboard KPI Stock Bajo, Quick Action Stock Bajo |
| 3.5 | Importaciones | 2026-02-22 | 5 modelos (EmbarqueImportacion, ItemEmbarque, DespachoAduanero, AsignacionCostoImportacion, PortalProveedorToken), 1 enum (EstadoEmbarque 10 vals), flujo 10 estados con validación transiciones, FOB→CIF→nacionalizado con distribución proporcional, 10 API routes (embarques CRUD + estado + items + despacho + confirmar-costos + recepción + generar-link-proveedor + supplier portal), 3 handlers contables completados (Merc.Tránsito/Prov.Exterior, despacho IVA CF, recepción inventario), 2 cuentas nuevas (Merc.Tránsito 1.1.05.001, Prov.Exterior 2.1.01.002, Inventario 1.1.06.001), portal proveedor público bilingüe /supplier/[token], 2 páginas admin (listado con stats, detalle con progress bar + despacho + costos + recepción), seed cuentas contables, dashboard KPI Embarques Activos, Quick Action Embarques en Tránsito — **FASE 3 COMPLETA** |
| REFACTOR-UI-1 | Design System Infrastructure | 2026-02-22 | Dark-first crypto/fintech theme. Google Fonts (Inter, Space Grotesk, JetBrains Mono), CSS variables dark/light, Tailwind 4 @theme inline config, ThemeProvider + ThemeToggle, sidebar gradient logo + topbar greeting + bell, mobile bottom tab bar, DSCard/DSCardHero/DSStatCard/DSBadge, Button re-estilizado gradiente accent, Skeleton shimmer, scrollbar custom |
| REFACTOR-UI-2 | Migración de Páginas al DS | 2026-02-22 | 44 páginas admin migradas al design system dark-first, glassmorphism cards, stat cards con íconos y trends, badges semánticos, tablas estilizadas, formularios consistentes |
| 4.1 | Pricing de Alquiler | 2026-02-22 | 5 modelos (PlanAlquiler, PrecioModeloAlquiler, CostoOperativoConfig, HistorialPrecioAlquiler, TipoCambioCache), motor de pricing con planes y tarifas, simulador de rentabilidad, costos operativos configurables, cache de tipo de cambio, API routes pricing, páginas admin pricing |
| 4.2 | Pricing de Repuestos | 2026-02-22 | 6 modelos (ListaPrecio, ItemListaPrecio, ReglaMarkup, GrupoCliente, MiembroGrupoCliente, LoteCambioPrecio), markup por categoría, listas de precio múltiples, grupos de clientes con descuentos, cambios batch de precios, API routes pricing-repuestos, páginas admin pricing-repuestos |
| 4.3 | Detección de Anomalías | 2026-02-23 | 2 modelos (Anomalia, AnalisisFinanciero), 3 enums (TipoAnomalia 9 vals, SeveridadAnomalia 4 vals, EstadoAnomalia 4 vals), 9 algoritmos (gasto inusual, pago duplicado, factura sin pago, margen bajo, stock crítico, desvío presupuesto, flujo caja negativo, vencimientos, patrón sospechoso), detección batch ejecutarDeteccionCompleta(), 3 handlers real-time P500, anti-duplicados, 7 API routes (listado, detalle, resolver, descartar, revisar, ejecutar, resumen), 2 páginas admin (listado con severidad visual, detalle con acciones), badge topbar anomalías ALTA+CRITICA, sidebar grupo Inteligencia |
| 4.4 | Asistente IA Eve | 2026-02-23 | ToolRegistry singleton con 21 tools en 6 módulos (flota 7, comercial 2, finanzas 6, contabilidad 3, rrhh 2, sistema 1), system prompt dinámico por rol (español argentino, personalidad Eve), Vercel AI SDK v6 + Claude Sonnet streaming, role-based access filtering, rate limit 30 msg/min in-memory, stopWhen stepCountIs(5), chat UI full-height con markdown rendering (react-markdown + remark-gfm), sugerencias iniciales clickeables, DefaultChatTransport, stock_bajo con raw SQL, sidebar Inteligencia "Asistente Eve" — **FASE 4 COMPLETA** |
| 5.2 | Catálogo Público de Motos | 2026-02-23 | 8 campos nuevos Moto (fotos, destacada, potencia, tipoMotor, arranque, frenos, capacidadTanque, peso), 2 API routes públicas (/api/public/motos + /api/public/motos/[id]), layout público (navbar glassmorphism + footer), /catalogo con filtros (marca, tipo, precio, orden), grid MotoCards con next/image, paginación, /catalogo/[id] con gallery thumbnails, plan selector radio cards (3 planes), spec grid 2x4, motos relacionadas, SEO dinámico generateMetadata(), catalog-utils (TIPO_MOTO_LABELS, getCondicion), seed actualizado con specs + Yamaha FZ 25 pricing |
| 5.3 | Flow de Alquiler (Wizard) | 2026-02-23 | planAlquilerId FK en Solicitud (bridge old/new pricing), middleware /alquiler whitelisted, 4 Zod schemas, 4 API routes nuevas (register, iniciar, solicitud, confirmar), MP backUrls param, webhook moto RESERVADA→ALQUILADA en 1ra cuota, catalog CTA → wizard link, wizard 5 pasos (moto summary, plan selection, auth+datos, contract preview, MP redirect), sessionStorage para Google OAuth recovery, 3 result pages (exito/error/pendiente), race condition protection via $transaction |
| 5.4 | Portal Cliente (Mi Cuenta) | 2026-02-23 | 7 API routes mi-cuenta (dashboard, pagos, pagar, perfil, contratos, scan, qr), /mi-cuenta bajo (public) group con layout+tabs (Dashboard/Pagos/Perfil), dashboard moto card + contrato + LTO progress + últimos pagos, pagos con tabla cuotas + stats + Pagar→MP, resultado post-pago 3 estados, perfil editable (contacto+dirección), /scan/[id] público con info moto + branding, QR generator en admin moto detail, navbar auth-conditional (Avatar+DropdownMenu si logueado), /login con Google+credentials, /registro con Google+email, qrcode npm para SVG server-side |

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

Pedir: **Prompt del punto 5.5**

## Problemas Conocidos

| # | Descripción | Severidad | Resuelto |
|---|------------|-----------|----------|
| P001 | Google OAuth no funciona sin GOOGLE_CLIENT_ID/SECRET | Media | Pendiente (se configura en Railway) |

## Métricas

| Métrica | Valor |
|---------|-------|
| Puntos completados | 30 / 35 (+ REFACTOR-A + REFACTOR-B + REFACTOR-UI-1 + REFACTOR-UI-2) |
| **Fase F0** | ✅ COMPLETA (5/5 puntos) |
| **Fase F1** | ✅ COMPLETA (5 puntos + 2 refactors) |
| **Fase F2** | ✅ COMPLETA (4 puntos: 2.1-2.4) |
| **Fase F3** | ✅ COMPLETA (5 puntos: 3.1-3.5) |
| **Fase F4** | ✅ COMPLETA (5 puntos: 4.1-4.4 + UI refactors) |
| **Fase F5** | En progreso (5.2, 5.3, 5.4 completos) |
| Modelos Prisma | 69 |
| Enums | 49 |
| API routes | 156 |
| Páginas admin | 45 |
| Páginas públicas | 13 (/catalogo, /catalogo/[id], /alquiler/[motoId], /alquiler/exito, /alquiler/error, /alquiler/pendiente, /mi-cuenta, /mi-cuenta/pagos, /mi-cuenta/pagos/resultado, /mi-cuenta/perfil, /scan/[id], /login, /registro) |
| Event handlers contables | 18 (13 completos + 5 stubs) |
| Event handlers anomalías | 3 (P500: payment.approve, expense.create, adjustStock) |
| AI Tools | 21 (flota 7, comercial 2, finanzas 6, contabilidad 3, rrhh 2, sistema 1) |
| Cuentas contables seeded | 71 |
| Tests | 0 |
| PermissionProfiles seeded | 8 |
| Deploy | Railway — motolibre-production.up.railway.app (auto-deploy from main) |

## Flujos de Negocio Implementados

### Flujo Admin (original)
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

### Flujo Wizard Self-Service (5.3)
```
/catalogo/[id] → "Solicitar esta moto →" → /alquiler/[motoId]?plan=CODIGO
  ↓
Paso 1: Moto summary → Paso 2: Elegir plan (semanal/mensual/LTO 24M)
  ↓
Paso 3: Registrarse (email/Google OAuth) + datos personales (nombre, DNI, tel)
  → POST /api/public/alquiler/solicitud → Solicitud PAGO_PENDIENTE
  ↓
Paso 4: Preview contrato → "Confirmar y pagar"
  → POST /api/public/alquiler/confirmar ($transaction):
    - Solicitud → APROBADA, Moto → RESERVADA
    - Contrato ACTIVO + todas las cuotas generadas
    - MP preference → redirect a MercadoPago
  ↓
Webhook MP: 1ra cuota pagada → Moto RESERVADA → ALQUILADA, Solicitud → ENTREGADA
```

### Portal Cliente (5.4)
```
/login → Google OAuth o email+contraseña → /mi-cuenta
/registro → crear cuenta (Google o email) → auto sign-in → /mi-cuenta
  ↓
/mi-cuenta → Dashboard: moto card, contrato activo, LTO progress, próximo pago, últimos pagos
/mi-cuenta/pagos → Tabla cuotas: stats (pagado/al día/vencidas), Pagar → MP redirect → /mi-cuenta/pagos/resultado
/mi-cuenta/perfil → Datos personales (read-only) + contacto/dirección (editable) + cuenta
  ↓
/scan/[id] → Página pública QR: info moto, branding MotoLibre, CTA catálogo si disponible
Admin → Moto detail → QR button → Dialog SVG → Download/Print
```
