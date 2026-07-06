---
name: Audaz LifeHub architecture
description: Key non-obvious decisions for the Audaz LifeHub productivity app
---

**Why:** These decisions are non-obvious and should not be re-litigated.

**Auth flow:** Clerk for both frontend (`@clerk/react`) and backend (`@clerk/express`). Frontend sets auth token via `setAuthTokenGetter(() => getToken())` from `useAuth()` in a `ClerkAuthSetup` component inside `QueryClientProvider`. Backend uses `clerkMiddleware` + `getAuth(req)`.

**JIT user provisioning:** `requireAuth.ts` middleware creates the DB user + 3 default sectors (Pessoal, Empresarial, Novos Projetos) on first API call after sign-up. No webhook needed.

**Drizzle (not Prisma):** The workspace uses Drizzle ORM. Do not switch to Prisma.

**Orval codegen:** Mutation variables use object destructuring — e.g. `executeTask.mutate({ id })`, `createTask.mutate({ data: TaskInput })`, `updateMe.mutate({ data: UserUpdate })`. Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml.

**Clerk localization:** Do NOT pass `localization={{ ptBR: true }}` to ClerkProvider — it's an invalid format. Remove it. The UI text is already in Portuguese.

**Design tokens:** Navy `#0D1B2A` / `#162236` / `#1A2B42`, Gold `#C9A84C` / `#E2C06E`, Text `#F0EBE3` / `#A89880` / `#6B7A8D`.

**How to apply:** When editing any component, use these tokens directly as Tailwind arbitrary values. Do not introduce new colors.
