# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Landing + admin site for a World of Warcraft (TBC Classic) guild, "Jefe de Guerra". SvelteKit 2 + Svelte 5 (runes) rendered **SSR on Cloudflare Pages**, with dynamic content in a Cloudflare **D1** database accessed via Drizzle. UI copy is in Spanish.

## Commands

```bash
npm run dev              # Vite dev server (or: docker compose up web)
npm run build            # Production build → .svelte-kit/cloudflare
npm run check            # svelte-kit sync + svelte-check (types)
npm run lint             # ESLint (flat config)
npm run format           # Prettier write   (format:check = verify only)
npm test                 # Vitest run       (test:watch / test:coverage)
npx vitest run src/lib/parse.test.ts      # run a single test file
npm run db:schema        # regenerate db/schema.sql from Drizzle schema
npm run db:schema:check  # regen + fail if db/schema.sql is out of sync (CI gate)
```

CI (`.github/workflows/deploy.yml`) runs, in order and as hard gates before deploy: **check → lint → format:check → test → db:schema:check → build**. Match these locally before pushing.

Database (re)creation is manual via wrangler (see `DEPLOY.md`):

```bash
npx wrangler d1 execute jefe-de-guerra --remote --file=db/schema.sql
npx wrangler d1 execute jefe-de-guerra --remote --file=db/seed.sql
```

## Architecture

**Data flow (the core pattern).** `src/lib/server/data.ts` is the orchestrator: it builds the `GuildData` the UI consumes by composing **repositories** (`src/lib/server/repositories/*`, which own the SQL and row→domain mapping) reading from the D1 binding `platform.env.DB`. If there is no D1 binding or any query throws, it falls back to the **static constants in `src/lib/data/*`** — so the site never crashes when D1 is down or during build/SSR without a binding.

**`src/lib/data/*` is dual-purpose:** each file exports both the TypeScript _types_ (imported as `import type` by components) and the _seed/fallback data_ (imported by repositories and by `data.ts`'s static fallback). Edit these to change types or default content.

**WarcraftLogs integration.** `src/lib/server/warcraftlogs.ts` (GraphQL against the WCL API) provides live guild progress, feats, Hall of Fame, per-character detail, attendance and rankings. Results are **D1-cached** via the `wclCache` repository and the `load*Cached` helpers in `data.ts` (each key has its own TTL). Fully resilient: missing creds / any error → `null` → the static fallback is used. Guild/team WCL IDs live in `src/lib/data/teams.ts`.

**Admin panel (`/admin/*`).** `src/hooks.server.ts` gates every `/admin` request: it verifies the signed session cookie (`src/lib/server/auth.ts`), resolves the user via the `users` repository, and exposes `event.locals.user`. It **fails closed** — no `platform`/`env`/`DB` ⇒ not authenticated. Passwords use PBKDF2 over WebCrypto (`src/lib/server/password.ts`); the stored string is self-describing (`pbkdf2$<iters>$<salt>$<hash>`) so iteration counts can evolve without migration (currently 30k to fit Cloudflare's per-request CPU limit). Users with `mustChange` are trapped at `/admin/cambiar-password`.

**Routes.** Public landing is `src/routes/+page.svelte`, composed of section components in `src/lib/components/sections/*`. `/equipos/[id]` (team detail + roster) and `/jugador/[name]` (internal player parses, `noindex`) are SSR pages backed by `+page.server.ts`. `/api/apply` posts guild applications to a Discord webhook (honeypot + size caps for spam).

## Database schema

`src/lib/server/db/schema.ts` (Drizzle) is the **single source of truth**. `db/schema.sql` is **generated** from it (`npm run db:schema`, via `scripts/gen-schema.mjs`) — never hand-edit it. `db/seed.sql` holds initial data. After changing `schema.ts`: regenerate, then re-apply `schema.sql` + `seed.sql` with wrangler.

## Conventions

- **Svelte 5 runes only** (`$state`, `$derived`, `$props`, `$effect`) — no legacy `export let` / reactive `$:`.
- **Styling:** Tailwind v4 (no config file; `@theme` tokens + `@layer` + `@utility` in `src/app.css`) combined with scoped `<style>` blocks. There is **no consistent size/spacing scale** — the design is deliberately bespoke. See **`DESIGN_SYSTEM.md`** for the rules: use utilities for structural layout + token colors, `@utility label-caps` for uppercase labels, and scoped CSS for gradients/glows/animations/custom sizes.
- **Shared helpers over duplication:** parse tiers via `parseTier`/`parseColor` (`src/lib/parse.ts`); class/spec icons, class colors and player links via `specOrClassIcon`/`classColor`/`playerHref` (`src/lib/wow-icons.ts`); reusable UI atoms in `src/lib/components/ui/` (`ParseBadge`, `StatusPill`, `Card`, `Button`, `Badge`, `ProgressBar`).
- **Secrets:** `.dev.vars` locally (see `.dev.vars.example`); `wrangler pages secret put` in prod. Keys: `ADMIN_PASSWORD`, WarcraftLogs client creds, `DISCORD_WEBHOOK_URL`.
