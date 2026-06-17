# Despliegue — Cloudflare Pages (GitHub Actions + Wrangler)

CI/CD: cada push a `main` ejecuta `npm ci` → `npm run check` (gate) → `npm run build`
→ `wrangler pages deploy`. El sitio es estático (`build/`) y la API del formulario
es una Cloudflare Pages Function (`functions/api/apply.js`, ruta `/api/apply`).

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
4. **Secreto del formulario** — crea el webhook en Discord
   (Ajustes del servidor → Integraciones → Webhooks → copia la URL) y guárdalo en el
   proyecto Pages:
   - Dashboard: proyecto → Settings → Variables and secrets → add **`DISCORD_WEBHOOK_URL`**
     (como *Secret*, en Production y Preview), **o**
   - CLI: `npx wrangler pages secret put DISCORD_WEBHOOK_URL --project-name jefe-de-guerra`

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

## Probar localmente la Function (no corre en `vite dev`)

```bash
npm run build
npx wrangler pages dev build --binding DISCORD_WEBHOOK_URL=<tu-webhook>
```

## Notas

- Node se fija con `.nvmrc` (22), tanto en CI como en local/Docker.
- El gate `npm run check` aborta el deploy si hay errores de tipos/Svelte.
- `wrangler.toml` define el nombre del proyecto y la carpeta de salida; `functions/`
  se detecta y despliega automáticamente.
