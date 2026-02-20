# CLAUDE.md — MotoLibre System Guide

## 1. System Overview

**MotoLibre** is an event-driven ERP for motorcycle rental management, operating in Buenos Aires, Argentina.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Prisma 6, PostgreSQL (Neon), NextAuth v5, Tailwind CSS 4 + Shadcn/ui, Recharts, Sonner, Zod.

**Deploy:** Railway (auto-deploy from main) with custom `server.js` binding to `0.0.0.0`. Dev: `npm run dev` locally.

**Plan:** 35 development points in 7 phases. See CONTROL.md for current status.

## 2. Critical Rules — ALWAYS FOLLOW

### Styling
- **ONLY** Tailwind CSS utility classes + Shadcn/ui components
- **NEVER** inline styles (`style={{}}`) or custom CSS classes
- Use `cn()` from `@/lib/utils` for conditional classes
- Add Shadcn components: `npx shadcn@latest add <component>`
- Brand colors available as: `text-motolibre-cyan`, `bg-motolibre-dark`, `bg-motolibre-dark-lighter`

### API Routes
- Validate with Zod (`src/lib/validations.ts`)
- Protect with `requirePermission(OPERATIONS.x.y.z, permType, fallbackRoles)`
- Paginate list endpoints (`page`, `limit` query params)
- Return `NextResponse.json()`
- Use `catch (error: unknown)` — never `catch (error: any)`
- Emit events for all write operations
- Operation IDs from `OPERATIONS` constant — never string literals
- Money fields: always `Decimal` (never Float)

### Database
- Prisma client from `@/lib/prisma` (imports from `@/generated/prisma`)
- Never use raw SQL
- After schema changes: `npx prisma generate && npx prisma db push`

### Components
- Server Components by default; `"use client"` only when needed
- ONE component per file
- Import with `@/` alias
- DataTable from `@/components/data-table/data-table.tsx` for all data tables

### Conventions
- Business entities in Spanish: motos, contratos, pagos, facturas
- Code/variables/functions in English
- Operation naming: `domain.entity.action` (lowercase, dots)
- Argentine formatting: `formatMoney()` for currency, `es-AR` locale for dates

## 3. Common Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB
npm run db:seed          # Seed initial data
npm run db:studio        # Open Prisma Studio
npx shadcn@latest add X  # Add Shadcn component
npm run typecheck        # Type check (zero errors expected)
```

## 4. Prisma Notes (v6)

- Schema + datasource: `prisma/schema.prisma`
- Generated client: `node_modules/@prisma/client` (standard)
- Import via singleton: `import { prisma } from "@/lib/prisma"`
