# Audaz LifeHub

Audaz LifeHub is a full-stack productivity web app in Brazilian Portuguese — a personal command center with task management (CRUD, timer, Kanban/List/Calendar views), weekly/annual planning, goals, projects with milestones, and Clerk-based auth with Google OAuth.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/lifehub run dev` — run the Vite frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — Clerk auth keys
- Required env: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL` — Frontend Clerk config

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Shadcn/ui, @clerk/react, Zustand (timer), wouter (routing), @tanstack/react-query, chrono-node (date parsing)
- API: Express 5 + @clerk/express
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — Drizzle ORM schema (users, sectors, projects, goals, tasks, time_sessions, milestones)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — Generated hooks from codegen (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/requireAuth.ts` — Clerk auth middleware + JIT user provisioning
- `artifacts/lifehub/src/App.tsx` — React app root with Clerk provider + wouter routing
- `artifacts/lifehub/src/pages/` — All pages (Dashboard, Tasks, Hoje, Planejamento, Anual, Concluidas, Metas, Projetos, Configuracoes)
- `artifacts/lifehub/src/store/timerStore.ts` — Zustand timer store
- `artifacts/lifehub/src/lib/dateParser.ts` — chrono-node PT date parsing + extractTitle

## Architecture decisions

- **Drizzle ORM (not Prisma)** — workspace template uses Drizzle; do not switch.
- **Clerk for auth** — both frontend (@clerk/react) and backend (@clerk/express). Auth token set via `setAuthTokenGetter` in App.tsx using `useAuth().getToken()`.
- **JIT user provisioning** — the `requireAuth` middleware creates the DB user + 3 default sectors on first API call after sign-up; no webhook needed.
- **Single proxy domain** — frontend `/` and API `/api` share the same Replit proxy domain; session cookies are same-origin.
- **Orval codegen** — always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`. Generated files must not be edited manually.

## Product

- **Tarefas** — Create/read/update/cancel tasks; start/pause/stop/done timer with per-task session tracking; list and kanban views; priority P1–P4; sector/project/goal tagging
- **Hoje** — Today's tasks + overdue tasks
- **Planejamento** — Weekly calendar view with week navigation
- **Anual** — GitHub-style heatmap of completed tasks over 365 days
- **Metas** — Goals with numeric progress tracking; at-risk detection (7d window, <30%)
- **Projetos** — Projects with milestones, progress bar, color picker
- **Dashboard** — Stats overview: total/done/pending tasks, hours tracked, weekly bar chart, today's tasks, at-risk goals
- **Configurações** — Profile view, notification prefs (push/WhatsApp), sign-out

## Design tokens

- Navy: `#0D1B2A` (bg), `#162236` (card bg), `#1A2B42` (elevated)
- Gold: `#C9A84C` (primary), `#E2C06E` (hover)
- Text: `#F0EBE3` (primary), `#A89880` (muted), `#6B7A8D` (subtle)
- Danger: `#E53E3E`, Success: `#38A169`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Mutations from codegen use `{ id }` objects, not positional args — e.g. `executeTask.mutate({ id: taskId })`.
- `useUpdateMe` mutation uses `{ data: UserUpdate }` format.
- The `extractTitle` helper in `dateParser.ts` strips date tokens from task text for QuickAdd.
- Do not run `pnpm dev` at root — use the workflow system.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk configuration reference
