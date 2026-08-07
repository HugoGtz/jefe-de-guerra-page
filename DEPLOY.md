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
   My Profile → API Tokens → Create Token → plantilla _"Edit Cloudflare Workers"_
   o un token custom con **Account › Cloudflare Pages › Edit**. Copia el token.
3. Anota tu **Account ID** (barra lateral del dashboard).
4. **Secretos del proyecto Pages** — añádelos como _Secret_ (Production y Preview)
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

> ⚠️ **`db/schema.sql` solo usa `CREATE TABLE IF NOT EXISTS`.** Para una tabla
> **nueva** (p. ej. `wcl_boss_kills`) basta con aplicarlo. Pero si agregas una
> **columna a una tabla que ya existe en la D1 remota**, el `CREATE ... IF NOT
EXISTS` es un no-op — la tabla NO gana la columna. Para esos casos aplica
> también un `ALTER TABLE` explícito:
>
> ```bash
> npx wrangler d1 execute jefe-de-guerra --remote --command "ALTER TABLE <tabla> ADD COLUMN <columna> <tipo>;"
> ```
>
> Es seguro repetirlo si ya existe (falla con "duplicate column", ignorable).
>
> **Ya nos pasó dos veces de verdad** — ambas confirmadas y corregidas en
> producción con este mismo comando:
>
> - `wcl_cache.locked_until` (agregada al mismo tiempo que el schema, sí se
>   corrió el `ALTER` a tiempo).
> - `teams.wcl_tag_id` — agregada al schema en el commit `87f83a5` pero el
>   `ALTER` **nunca se corrió**, así que quedó rota en producción desde ese
>   deploy: cualquier lectura de `teams` (`getTeams()`) fallaba con
>   `no such column: wcl_tag_id`, lo cual tumbaba `/admin/teams` y cualquier
>   página que dependiera de esa consulta. Corregido manualmente después.
>
> Antes de dar por bueno un deploy que agrega una columna a una tabla
> existente, verifica con `PRAGMA table_info(<tabla>);` contra `--remote` —
> no basta con que el build/CI pase, porque el gate no valida el estado real
> de la D1 remota.

**Ledger de jefes derrotados (`wcl_boss_kills`).** El progreso SSC/TK mostrado
en `/equipos/[id]` es la unión de esta tabla (permanente, solo suma) con el
resultado del fetch en vivo más reciente — así un kill confirmado nunca
desaparece aunque su reporte salga de la ventana de reportes recientes que WCL
consulta. La fila lleva un `tier` (hoy `'p2-ssc-tk'`, ver `CURRENT_TIER` en
`src/lib/server/wcl-boss-ledger.ts`). Al abrir la siguiente fase de raid:

1. Cambia `CURRENT_TIER` en `wcl-boss-ledger.ts` a un nuevo valor (p. ej. `'p3-...'`).
2. (Opcional) limpia las filas del tier viejo, ya inertes pero innecesarias:
   ```bash
   npx wrangler d1 execute jefe-de-guerra --remote --command "DELETE FROM wcl_boss_kills WHERE tier <> 'p3-...';"
   ```

**Agregar una fase o raid nuevo.** `/admin/raids` solo permite EDITAR fases,
raids y jefes que ya existen (incluye agregar/quitar jefes dentro de un raid
existente). Agregar una fase o un raid completo es un evento de un par de
veces al año (cuando abre contenido nuevo) y se hace a mano:

```bash
npx wrangler d1 execute jefe-de-guerra --remote --command \
  "INSERT INTO phases (id, name, label, status, status_label, sort) VALUES ('phase-3', 'Fase 3', 'Fase 3', 'upcoming', 'Próxima', 2);"
npx wrangler d1 execute jefe-de-guerra --remote --command \
  "INSERT INTO raids (id, phase_id, name, abbr, sort) VALUES ('mount-hyjal', 'phase-3', 'Mount Hyjal', 'MH', 0);"
```

Luego los jefes de ese raid ya se agregan normal desde `/admin/raids`.

**Analíticas de visitas (Cloudflare Web Analytics).** Ya están activas y no
requieren ningún paso adicional: como `jefedeguerra.com` es una zone de
Cloudflare (DNS proxiado), Cloudflare junta Web Analytics automáticamente a
nivel de borde para cada request — sin script, sin cookies, sin banner de
consentimiento. Verlas en dashboard → Analytics & Logs → Web Analytics →
`jefedeguerra.com`. `src/app.html` deja comentado el método alternativo por
JS-beacon (`data-cf-beacon`), solo por si el dominio algún día deja de usar
Cloudflare como DNS — hoy es innecesario.

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
