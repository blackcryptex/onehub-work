# OneHub — System Architecture & Tech Stack

```mermaid
flowchart TB
  subgraph Client [Client]
    UI[Next.js 14 App Router\nReact 18 + TS\nTailwind + shadcn/ui]
  end

  subgraph App[Web App (Next.js)]
    RHandlers[Route Handlers / Server Actions]
    TRPC[tRPC Router]
    Auth[Auth.js (NextAuth)\nCredentials + Google]
    Logger[Pino + request-id]
    Sentry[(Sentry SDK optional)]
  end

  DB[(PostgreSQL)]

  UI --> App
  App --> TRPC
  TRPC --> DB
  Auth --> DB
  Logger --> App
  Sentry -. optional .- App
```

## Packages
- Frontend: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, shadcn/ui, Radix, Lucide, TanStack Query, Zustand, Zod
- Backend: Next.js API routes and server actions, tRPC
- Database: PostgreSQL + Prisma ORM
- Auth: Auth.js (NextAuth) with Credentials + Google; JWT sessions
- Observability: Pino logger, request-id middleware, optional Sentry
- Testing: Vitest, React Testing Library, Playwright
- Tooling: ESLint, Prettier, Husky + lint-staged, Commitlint, pnpm

## Rationale
- tRPC selected for end-to-end type-safety and strong DX over raw REST.
- Next.js Route Handlers + server actions keep the backend co-located and simple.
- JWT sessions reduce DB writes; Prisma models include Sessions/Accounts for flexibility.
- Tailwind + shadcn/ui ensure consistent, accessible UI primitives with speed.
- Pino is fast and structured; request-id aids cross-tier tracing; Sentry is opt-in.
- Testing stack covers units (Vitest), components (RTL), and flows (Playwright).
