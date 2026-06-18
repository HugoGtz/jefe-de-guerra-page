# Despliegue — Cloudflare Pages (GitHub Actions + Wrangler)

CI/CD: cada push a `main` ejecuta `npm ci` → `npm run check` (gate) → `npm run build`
→ `wrangler pages deploy`. El sitio es **SSR** (`@sveltejs/adapter-cloudflare`, salida
`.svelte-kit/cloudflare`); el contenido dinámico vive en una base **D1** (binding `DB`)
y el formulario es un endpoint SvelteKit (`src/routes/api/apply/+server.ts`, `/api/apply`)
que reenvía a Discord con un webhook secreto del servidor.

## 1. Una sola vez — Cloudflare

1. **Crear el proyecto Pages** como **Direct Upload** (NO "Connect to Git"):
   Dashboard → Workers & Pages → Create → Pages → **"Upload assets"**.
   Nómbralo **`jefe-de-guerra`** (debe coincidir con `name` en `wrangler.toml`).

   > ¿Por qué "Upload assets" y no "Connect to Git"? Porque **GitHub Actions** hace
   > el build y sube el resultado con `wrangler pages deploy` (eso ES un direct
   > upload). El push a git solo dispara el workflow; Cloudflare NO buildea. Si
   > conectaras el proyecto a Git, CF intentaría buildear por su cuenta y chocaría
   > con el workflow. (En el primer "Upload assets" puedes subir cualquier carpeta
   > rápida para crear el proyecto; el deploy real lo hará Actions.)
2. **API token** con permiso de Pages:
   My Profile → API Tokens → Create Token → plantilla *"Edit Cloudflare Workers"*
   o un token custom con **Account › Cloudflare Pages › Edit**. Copia el token.
3. Anota tu **Account ID** (barra lateral del dashboard).
4. **Secretos del proyecto Pages** — añádelos como *Secret* (Production y Preview)
   en Dashboard → proyecto → Settings → Variables and secrets, **o** por CLI
   (`npx wrangler pages secret put <NOMBRE> --project-name jefe-de-guerra`):
   - **`DISCORD_WEBHOOK_URL`** — webhook de Discord (Ajustes del servidor →
     Integraciones → Webhooks → copia la URL); recibe las aplicaciones del formulario.
   - **`WCL_CLIENT_ID`** y **`WCL_CLIENT_SECRET`** — credenciales OAuth de WarcraftLogs
     (warcraftlogs.com → Settings → API Clients) para el progreso/feats/rankings en vivo.
   - (Futuro) **`ADMIN_PASSWORD`** — reservado para el panel de admin (aún sin construir).

   En local estos viven en `.dev.vars` (gitignored), nunca en el repo.

## 1bis. Una sola vez — D1 (base de datos)

El binding `DB` ya está en `wrangler.toml` (`database_id` incluido). La capa de
datos usa **Drizzle ORM**: la **fuente de verdad del esquema es
`src/lib/server/db/schema.ts`** (tablas Drizzle). Las lecturas pasan por
repositorios (`src/lib/server/repositories/*`) que devuelven los modelos de
dominio de `src/lib/data/*`; `src/lib/server/data.ts` es solo el orquestador.

`db/schema.sql` es un **artefacto GENERADO** desde `schema.ts` (no se edita a
mano), y `db/seed.sql` (datos) sigue siendo la fuente de los datos iniciales —
no hay archivos sueltos de migración.

```bash
# Regenerar db/schema.sql desde schema.ts (drizzle-kit export, idempotente):
docker compose run --rm web npm run db:schema
```

El flujo de recreado de la base **no cambia** (sigue siendo wrangler):

```bash
# Estructura (idempotente: CREATE TABLE IF NOT EXISTS):
npx wrangler d1 execute jefe-de-guerra --remote --file=db/schema.sql
# Datos (idempotente: borra cada tabla y reinserta; NO toca wcl_cache):
npx wrangler d1 execute jefe-de-guerra --remote --file=db/seed.sql
```

> Usa `--local` en vez de `--remote` para la base de desarrollo (Docker/vite).
> Tras tocar `schema.ts`, regenera `db/schema.sql` con `npm run db:schema` y
> vuelve a aplicar `schema.sql` + `seed.sql`.
> El sitio cae a los datos estáticos de `src/lib/data/*` si D1 falla, así que un
> reseed nunca tumba la web. El progreso/feats de WarcraftLogs se cachean en la
> tabla `wcl_cache` en runtime; no se siembra.

## 2. Una sola vez — GitHub

1. Crea el repo remoto y haz push (ver §3).
2. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `CLOUDFLARE_API_TOKEN` = el token del paso 1.2
   - `CLOUDFLARE_ACCOUNT_ID` = tu Account ID

## 3. Primer push

```bash
git add -A
git commit -m "Initial commit: Jefe de Guerra site"
git branch -M main
git remote add origin git@github.com:<usuario>/<repo>.git
git push -u origin main
```

El workflow `.github/workflows/deploy.yml` se dispara solo y despliega.

## 4. Dominio

- Por defecto: `https://jefe-de-guerra.pages.dev` (ya configurado en `siteUrl`,
  `sitemap.xml` y `robots.txt`).
- **Si usas otro nombre de proyecto o un dominio custom**, actualiza ese valor en:
  `src/routes/+page.svelte` (`siteUrl`), `static/sitemap.xml`, `static/robots.txt`.
  Dominio custom: proyecto Pages → Custom domains → Set up a domain.

## Probar localmente (SSR + D1 + secretos)

El dev server (Docker/vite) ya emula la plataforma Cloudflare: lee el binding `DB`
de `wrangler.toml` (D1 local) y los secretos de `.dev.vars`, así que SSR, D1 y
`/api/apply` funcionan en `docker compose up -d web` (http://localhost:5173).

Para una prueba más cercana a producción sobre el build:

```bash
docker compose run --rm web npm run build
npx wrangler pages dev .svelte-kit/cloudflare
```

## Notas

- Node se fija con `.nvmrc` (22), tanto en CI como en local/Docker.
- El gate `npm run check` aborta el deploy si hay errores de tipos/Svelte.
- `wrangler.toml` define el nombre del proyecto y la carpeta de salida; `functions/`
  se detecta y despliega automáticamente.
