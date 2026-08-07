# Design System — Jefe de Guerra

Guía **prescriptiva** para humanos y agentes de IA que tocan la UI de este repo. No es teoría: son reglas de "usa esto, no aquello". Si dudas, sigue el patrón que ya existe en `src/lib/components/**` — la consistencia de la estética (metal oscuro + rojo lava/sangre, texto grabado, glows) importa más que la elegancia del código.

**Stack:** SvelteKit 2 + Svelte 5 (runes: `$state`/`$derived`/`$props`), Tailwind **v4** (sin `tailwind.config`; tokens en `@theme` dentro de `src/app.css`), Cloudflare Pages SSR + D1 (Drizzle).

---

## 1. Filosofía: utilidad vs. CSS scoped

El proyecto tiene **escalas tokenizadas** para tipografía, tracking y breakpoints (§3, §4) — usa siempre el token, nunca un valor suelto ni un arbitrario `text-[...]`. Lo que **sí** vive bespoke en el `<style>` de cada componente es el "look" (gradientes, glows, `color-mix()`, animaciones, headings `clamp()`). La política:

### Usa utilidades de Tailwind para...

- **Andamiaje estructural:** `flex`, `grid`, `items-center`, `justify-between`, `gap-4`, `relative`, `absolute`, `hidden`, `w-full`, `max-w-*`.
- **Colores de token:** `text-steel`, `bg-iron`, `border-steel`, `text-blood`, `bg-stone`. (Generados automáticamente desde `@theme` — ver §2.)
- **Familia y tracking de token:** `font-display`, `font-sans`, `tracking-caps`, `tracking-heading`, `tracking-eyebrow`.

### Usa `@utility label-caps` para...

El patrón recurrente "etiqueta pequeña en mayúsculas display" (pills, botones, eyebrows, enlaces "logs", notas). Ya está definido en `app.css`:

```css
@utility label-caps {
	font-family: var(--font-display);
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: var(--tracking-caps);
}
```

El caller pone su propio `font-size` y color; `label-caps` posee familia/peso/transform/tracking. Ejemplo real (`StatusPill.svelte`):

```svelte
<span class="pill label-caps" class:pill--open={open}>Reclutando</span>
```

### Usa `<style>` scoped (CSS en el componente) para...

Todo lo distintivo de la estética. **No lo repliques con utilidades arbitrarias:**

- Gradientes, glows, `box-shadow`, `text-shadow`.
- `color-mix(in srgb, ...)` para tintes translúcidos.
- Animaciones, pseudo-elementos (`::before`/`::after`), `clip-path`, `mask`.
- **`font-size` fuera de escala** (incluyendo `clamp()` responsivo). Ponlo en `<style>`, **nunca** como `text-[0.82rem]`.

Ejemplo real (`ParseBadge.svelte` — número tintado por tier vía variable CSS):

```svelte
<span class="parse-badge" style="--parse-color: {tier.color}">{score}</span>

<style>
	.parse-badge {
		background: color-mix(in srgb, var(--parse-color) 18%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 65%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 28%, transparent);
	}
</style>
```

**Regla rápida:** si es _layout o color de marca_ → utilidad Tailwind. Si es _el "look" (glow/gradiente/tamaño custom/animación)_ → `<style>` scoped. Nunca uses valores arbitrarios de Tailwind (`text-[...]`, `bg-[#...]`, `w-[...px]`) para tipografía o efectos.

---

## 2. Paleta de color

Definida como tokens en `@theme` (`src/app.css`). Cada `--color-X` genera utilidades `text-X`, `bg-X`, `border-X` automáticamente.

| Token                  | Utilidad                  | Hex       | Uso previsto                                                              |
| ---------------------- | ------------------------- | --------- | ------------------------------------------------------------------------- |
| `--color-blood`        | `text-blood` / `bg-blood` | `#a10613` | Rojo primario de identidad. Botón primario, acentos.                      |
| `--color-crimson-deep` | `bg-crimson-deep`         | `#6b0410` | Rojo sombra. Inicio de gradientes, scrollbar.                             |
| `--color-lava`         | `text-lava`               | `#ff3b21` | Acento brillante de glow. Focus outlines, `text-lava-glow`, dots activos. |
| `--color-ember`        | `text-ember`              | `#ff6b2c` | Highlight naranja-rojo. Estados "completo", finales de gradiente.         |
| `--color-silver`       | `text-silver`             | `#e5e5e5` | **Texto por defecto** (body). Texto de logo, "engraved".                  |
| `--color-steel`        | `border-steel`            | `#b8bcc2` | Gris/borde metálico. Bordes (vía `color-mix`), valores secundarios.       |
| `--color-steel-dim`    | `text-steel-dim`          | `#9ca2aa` | Texto gris apagado. Contraste ≥4.5:1 AA sobre `stone`/`iron`.             |
| `--color-ash`          | `bg-ash`                  | `#0a0708` | Fondo base casi-negro cálido (body).                                      |
| `--color-stone`        | `bg-stone`                | `#14100f` | Superficie oscura más clara. Tracks, pills cerradas.                      |
| `--color-iron`         | `bg-iron`                 | `#1c1815` | Fondo de card/superficie. Base de `.surface`.                             |

**Reglas de color:**

- Fondo de página = `ash`. Superficies elevadas = `iron` (usa `.surface` o `.metal-border`, no `bg-iron` a secas para cards).
- Texto = `silver` (default), secundario = `steel`/`steel-dim`. **No inventes grises**; no uses `text-gray-400` de Tailwind.
- Nunca hardcodees `#a10613` etc. en un componente — usa `var(--color-blood)` en `<style>` o `text-blood` en markup.

### Colores de clase de WoW — `CLASS_COLORS`

En `src/lib/wow-icons.ts`. Úsalos **solo** para tintar nombres de personaje/clase, nunca para UI de marca. Accede vía el helper `classColor(name)` (case-insensitive, `undefined` si desconocido):

| Clase   | Hex       |     | Clase   | Hex       |
| ------- | --------- | --- | ------- | --------- |
| warrior | `#C79C6E` |     | shaman  | `#0070DE` |
| paladin | `#F58CBA` |     | mage    | `#69CCF0` |
| hunter  | `#ABD473` |     | warlock | `#8787ED` |
| rogue   | `#FFF569` |     | druid   | `#FF7D0A` |
| priest  | `#FFFFFF` |     |         |           |

### Tiers de parse de WarcraftLogs — `parseTier()` / `parseColor()`

En `src/lib/parse.ts`. Mapean un score 0–100 al color estándar de WCL + label en español. **No hardcodees estos colores**; siempre pasa por el helper (y preferentemente por el componente `ParseBadge`).

| Score | Color  | Hex       | Label (ES) |
| ----- | ------ | --------- | ---------- |
| 99+   | gold   | `#e5cc80` | Legendario |
| 95–98 | pink   | `#e268a8` | Insano     |
| 75–94 | purple | `#a335ee` | Épico      |
| 50–74 | blue   | `#0070ff` | Raro       |
| 25–49 | green  | `#1eff00` | Común      |
| <25   | grey   | `#9d9d9d` | Pobre      |

---

## 3. Tipografía

Dos familias, ambas self-hosted vía `@fontsource` (sin request a Google Fonts):

| Familia                    | Token / utilidad                  | Uso                                                                                                                |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Cinzel** (serif display) | `--font-display` / `font-display` | Headings (`h1`–`h6` la usan por defecto), labels en mayúsculas, botones, números de badge. Pesos: 500 / 700 / 900. |
| **Inter** (sans)           | `--font-sans` / `font-sans`       | Texto de cuerpo (body por defecto), párrafos, contenido de badge normal. Pesos: 400 / 500 / 600 / 700.             |

`h1`–`h6` heredan `font-display` automáticamente (regla base en `app.css`). El body hereda `font-sans` + `text-silver`.

### El patrón `label-caps`

Para cualquier etiqueta en mayúsculas display (pills, eyebrows, botones, enlaces "logs", notas tz). Ya explicado en §1. **Prefiérelo** sobre repetir `font-display font-bold uppercase tracking-caps` a mano.

### Los 3 tokens de tracking (letter-spacing)

| Token                | Utilidad           | Valor    | Uso                                                   |
| -------------------- | ------------------ | -------- | ----------------------------------------------------- |
| `--tracking-heading` | `tracking-heading` | `0.04em` | Headings display.                                     |
| `--tracking-caps`    | `tracking-caps`    | `0.1em`  | Labels/pills en mayúsculas (lo que usa `label-caps`). |
| `--tracking-eyebrow` | `tracking-eyebrow` | `0.08em` | Eyebrows pequeños en mayúsculas.                      |

Nombres no-colisionantes a propósito (Tailwind ya trae `tracking-tight`/`tracking-wide` con otros valores). En la práctica hay valores de tracking sueltos en `<style>` (0.02–0.2em) — está bien dentro de un componente, pero **si tu tracking coincide con un token, usa el token.**

### Escala tipográfica (tokens `--text-*`)

Racionalizada desde los valores reales que había (antes 59 sueltos). Usa el **token**, no un rem literal ni `text-[...]` arbitrario:

| Token         | Valor   | Uso                              |
| ------------- | ------- | -------------------------------- |
| `--text-2xs`  | 0.65rem | micro-labels, eyebrows diminutos |
| `--text-xs`   | 0.72rem | labels en mayúsculas, meta       |
| `--text-sm`   | 0.85rem | texto secundario (el más común)  |
| `--text-base` | 0.95rem | texto UI base                    |
| `--text-md`   | 1.05rem | párrafos lead                    |
| `--text-lg`   | 1.15rem | subtítulos                       |
| `--text-xl`   | 1.4rem  | títulos de card                  |

- En `<style>` scoped: `font-size: var(--text-sm)`. También existen utilidades `text-sm`… generadas por el `@theme`.
- **Headings display responsivos** (≥1.5rem): siguen con `clamp(min, vw, max)` en el componente (no hay token; el patrón fluido es intencional). Ver `Section.svelte` / `.hero__name`.
- Un tamaño puntual fuera de escala se deja literal, pero **prefiere el token**.

```css
/* heading fluido (fuera de la escala de tokens, a propósito) */
.section__title {
	font-size: clamp(2rem, 5vw, 3.2rem);
	font-weight: 900;
	line-height: 1.05;
}
```

---

## 4. Espaciado y layout

### Spacing (tokens `--spacing-*`)

Escala de shift-mínimo para `gap` / `padding` / `margin` (los valores dominantes son exactos; los raros se ajustaron al más cercano). Namespace Tailwind → también genera utilidades `gap-md`, `p-lg`, `m-sm`… (además del `gap-4` numérico). Usa el token:

`--spacing-3xs` 0.25 · `--spacing-2xs` 0.4 · `--spacing-xs` 0.5 · `--spacing-sm` 0.6 · `--spacing-md` 0.75 · `--spacing-lg` 0.85 · `--spacing-xl` 1 · `--spacing-2xl` 1.25 · `--spacing-3xl` 1.5 · `--spacing-4xl` 2 (rem).

- En `<style>`: `gap: var(--spacing-md)`, `padding: var(--spacing-sm) var(--spacing-lg)`. En markup: `gap-md`, `p-lg`.
- Se dejan literales: `clamp()`/`calc()` (paddings fluidos), márgenes negativos, y micro-valores `<0.25rem` (ej. `0.08rem` de un chip).

### Border-radius (tokens `--radius-*`)

`--radius-sm` 3px (chips) · `--radius-md` 6px (inputs) · `--radius-lg` 8px (cards) · `--radius-xl` 12px (hero/avatares) · `--radius-full` 999px (pills/dots). `border-radius: 50%` (círculos) se deja literal.

### Contenedor de sección

Usa el componente `Section` (`src/lib/components/layout/Section.svelte`) para todo bloque de página. Aporta: padding vertical fluido `clamp(4rem, 9vw, 7rem)`, `max-width: 72rem` centrado, y una cabecera opcional (`eyebrow` + `title` + regla animada) con `reveal` incorporado.

```svelte
<Section id="equipos" eyebrow="La hueste" title="Equipos de Raid">
	<!-- contenido -->
</Section>
```

### Grids responsivos

El patrón consistente es **1 columna en móvil → N columnas en un breakpoint**, definido en `<style>` scoped (no con las clases `grid-cols-*` de Tailwind, para poder afinar gaps y breakpoints por componente):

```css
.grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 1.5rem;
}
@media (min-width: 720px) {
	.grid {
		grid-template-columns: repeat(3, 1fr);
	}
}
```

Formas comunes ya usadas: `1fr` / `1fr 1fr` / `repeat(3, 1fr)` / `repeat(auto-fill, minmax(15rem, 1fr))`. Usa `minmax(0, 1fr)` cuando haya riesgo de overflow por contenido largo (ya se usa en tablas de roster).

### Breakpoints — set canónico

Tres breakpoints, definidos en `@theme` (`--breakpoint-sm/md/lg`). **Usa solo estos:**

- **`sm` = 600px** — móvil grande / apilado → 2 col.
- **`md` = 768px** — tablet / → 2–3 col.
- **`lg` = 1024px** — desktop / 3 col, colapso de nav.

- En markup: variantes Tailwind `sm:` / `md:` / `lg:` (ej. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- En `<style>` scoped: `@media (min-width: 600px|768px|1024px)` con el px literal (las variables CSS no valen dentro de una media query).
- Excepción: micro-ajustes de móvil pequeño (`380px`/`414px`) se dejan literales — casos raros por debajo de `sm`.

---

## 5. Inventario de componentes reutilizables

Todos en `src/lib/components/ui/`. **Antes de escribir UI nueva, comprueba si uno de estos ya cubre el caso.** Todos usan runes de Svelte 5 (`$props`, `$derived`) y son SSR-safe.

| Componente        | Cuándo usarlo                                                                                                                                             | Props clave                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Button`**      | Cualquier acción/CTA o enlace con estilo de botón. Renderiza `<a>` si pasas `href`, si no `<button>`.                                                     | `variant: 'primary' \| 'ghost'`, `href`, `pulse` (respiración continua, para el CTA principal de Discord), `beam` (haz de luz recorriendo el borde). |
| **`Card`**        | Superficie elevada de contenido (equipos, oficiales, etc.). Trae spotlight que sigue el cursor (solo puntero fino), sheen metálico en hover y `.surface`. | `beam` (haz de borde continuo).                                                                                                                      |
| **`Badge`**       | Etiqueta genérica tipo "pill" (metadatos, tags). Estilo píldora con `.metal-border`.                                                                      | `class`, children.                                                                                                                                   |
| **`ParseBadge`**  | Mostrar un número de parse/percentil de WCL, tintado por su tier. **Úsalo siempre** en vez de tintar a mano.                                              | `score` (0–100, dirige color y número), `size: 'sm' \| 'md'`, `title`, `ariaLabel`.                                                                  |
| **`StatusPill`**  | Estado de reclutamiento (Reclutando/Cerrado). Punto lava parpadeante cuando abierto.                                                                      | `open: boolean`.                                                                                                                                     |
| **`ProgressBar`** | Progreso de raid / cualquier 0–100%. Barra con shine continuo; glow especial al 100%. Incluye `role="progressbar"` + aria.                                | `value` (0–100, se clampa), `label`, `complete`.                                                                                                     |

Layout: `Section` (§4), `Navbar`, `Footer` en `src/lib/components/layout/`.

### Helpers (no reinventar)

De `src/lib/wow-icons.ts`:

- **`classColor(class)`** → hex de color de clase, o `undefined`. Para tintar nombres.
- **`specOrClassIcon(class, spec)`** → URL del icono de spec, con fallback al icono de clase, o `null`. El icono que quiere toda fila de roster/leaderboard.
- **`classIconUrl` / `specIconUrl`** → variantes individuales (defensivas, `null` si desconocido).
- **`bossIconUrl(name)`** → **siempre** devuelve una URL válida (icono mapeado o `_generic.jpg`, nunca 404). Lookups insensibles a acentos/caso/puntuación (sirve para nombres WCL en inglés y ES).
- **`resolveRecruitNeed(label)`** → resuelve una etiqueta de reclutamiento en español ("Chamán elemental") a `{ wowClass, spec, iconUrl, color }`. Defensivo (nulls si no reconoce).
- **`playerHref(name)`** → ruta interna `/jugador/<name>` (URL-safe).

De `src/lib/parse.ts`:

- **`parseTier(score)`** → `{ color, label }`. **`parseColor(score)`** → solo el hex.
- **`roleLabelEs(role)`** → 'DPS'/'Sanador'/'Tanque'.
- **`formatDuration(ms)`** → "m:ss", o `null` si vacío/cero.

### Clases utilitarias de `app.css` (composables en markup)

| Clase                                     | Efecto                                                              | Dónde                            |
| ----------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `.surface`                                | Fondo iron + borde metálico + gradiente interno. Base de cards.     | `@layer components`              |
| `.metal-border`                           | Borde 1px cepillado que se ilumina en hover.                        | `@layer components`              |
| `.text-engraved`                          | Texto plata con sombra grabada oscura.                              | Títulos, labels de progreso.     |
| `.text-lava-glow`                         | Texto lava con glow suave.                                          | Eyebrows, acentos.               |
| `.glow-red`                               | `box-shadow` de glow rojo para hover.                               | Estados hover.                   |
| `.jdg-pulse` / `.jdg-gleam` / `.jdg-beam` | Helpers de animación (§6).                                          | Opt-in vía props de Button/Card. |
| `.label-caps`                             | `@utility` — familia/peso/transform/tracking de etiqueta mayúscula. | Pills, botones, eyebrows.        |

---

## 6. Motion / animación

**Regla obligatoria: toda animación debe respetar `prefers-reduced-motion`.** Ya hay una regla global en `app.css` que neutraliza (`duration ~0`) todas las `animation`/`transition`, pero **además**:

- Anima **solo propiedades GPU-baratas:** `transform`, `opacity`, `box-shadow`, `filter`. Evita animar `width`/`height`/`top`/`left` (la barra de progreso anima `width` a propósito, pero es la excepción).
- Cuando el reduced-motion global no baste (ej. un `transform: none` de hover, o esconder un shine band), añade tu propio bloque en el `<style>` del componente:

```css
@media (prefers-reduced-motion: reduce) {
	.jdg-card:hover {
		transform: none;
	}
	.jdg-card__spotlight {
		display: none;
	}
}
```

- Acciones de JS (`reveal`, `tilt`, `parallax`, `cursorTilt`) ya consultan `getReducedMotion()` (`src/lib/utils/reducedMotion.ts`) y muestran el contenido de inmediato sin transform. Reutilízalas en vez de escribir IntersectionObservers a mano.
- Keyframes compartidos viven en `@layer animations` de `app.css` (`jdg-pulse`, `jdg-shine-sweep`, `jdg-complete-glow`, `jdg-beam-spin`). Reutilízalos.
- La animación **nunca** debe ser necesaria para la usabilidad (es puramente decorativa).

Acciones reutilizables (`src/lib/actions/`): `reveal` (fade+slide al entrar en viewport, con `delay`/`direction`/`blur`/`onreveal`), `tilt` / `cursorTilt`, `parallax`, `countUp`, `scrollProgress`, `scrollSpy`.

---

## 7. Accesibilidad

Patrones ya establecidos — **mantenlos**:

- **Skip-link:** `.skip-link` ("saltar al contenido") oculto hasta recibir foco por teclado. On-theme (borde lava). No lo quites.
- **Focus visible:** el patrón estándar es outline lava. Replícalo en todo elemento interactivo custom:
  ```css
  .algo:focus-visible {
  	outline: 2px solid var(--color-lava);
  	outline-offset: 2px;
  }
  ```
- **ARIA en componentes:** `ProgressBar` usa `role="progressbar"` + `aria-valuenow/min/max` + `aria-label`. `ParseBadge` acepta `ariaLabel`/`title` (pasa el label del tier para lectores de pantalla). Capas decorativas (`spotlight`, `sheen`, `rule`) llevan `aria-hidden="true"`.
- **Contraste:** `steel-dim` (`#9ca2aa`) fue elegido para cumplir ≥4.5:1 AA sobre `stone`/`iron`. No uses grises más oscuros para texto sobre esas superficies.
- **Color no es el único indicador:** los tiers de parse y el estado de pill llevan también número/texto, no solo color.
- Fondos y texturas decorativas van en pseudo-elementos con `pointer-events: none`.

---

## 8. Deuda / decisiones de diseño

1. ✅ **RESUELTO — Escala tipográfica.** Rationalizada a tokens `--text-2xs … --text-xl` (§3) y aplicada en todo el código (los ~85 `font-size` fijos ≤1.4rem ahora usan tokens; los headings display siguen con `clamp()`). Regla: usa el token, nunca un rem suelto.

2. ✅ **RESUELTO — Breakpoints.** Set canónico `sm 600 / md 768 / lg 1024` en `@theme` (§4), aplicado (`@media` literales + variantes `sm:/md:/lg:`). Solo `380/414px` quedan como micro-ajustes bajo `sm`.

3. ✅ **RESUELTO — Letter-spacing.** Escala de 6 tokens `--tracking-snug/heading/wide/eyebrow/caps/widest` (§3), aplicada. Solo `0.16–0.2em` (eyebrows extra-anchos, ~3 usos raros) quedan literales.

4. **Efecto "shine/gleam" — revisado: dejar como está.** `jdg-gleam::before` (Button), `.jdg-card__sheen` (Card) y `.jdg-progress__shine` (ProgressBar) _parecen_ el mismo barrido, pero al inspeccionarlos son tres efectos afinados por contexto: el shine de la barra es una **animación continua infinita** (sin skew, recortada al relleno); el gleam del botón es un barrido **en hover** blanco brillante; el sheen de la card es un barrido en hover **sutil acero** que vive en una capa `<span>` dedicada a propósito para no pelear con el `transform` del action `tilt`. Unificarlos exigiría igualarlos visualmente (cambia el look) o un helper con ~6 parámetros + reestructurar la capa de Card — más complejo y arriesgado que los tres bloques comentados actuales. **Decisión: no deduplicar.** Si se toca uno, conservar la coherencia del gradiente (banda `transparent → luz → transparent`).

Hasta que se decidan, **sigue el patrón existente** (tamaño/breakpoint en `<style>` scoped, reutilizando breakpoints frecuentes). No introduzcas una segunda convención en paralelo.

---

## TL;DR para agentes

1. Layout y color de marca → **utilidades Tailwind** (`flex`, `grid`, `gap-*`, `text-steel`, `bg-iron`).
2. Etiqueta mayúscula → **`label-caps`**.
3. Glows, gradientes, `color-mix`, animaciones, tamaños de fuente custom → **`<style>` scoped**. Nunca valores arbitrarios de Tailwind (`text-[...]`, `bg-[#...]`).
4. Colores solo desde tokens (`var(--color-*)` / `text-*`); clases/tiers de WoW solo vía `classColor` / `parseTier` / `ParseBadge`.
5. Reutiliza componentes `ui/` y helpers de `wow-icons.ts` / `parse.ts` antes de escribir algo nuevo.
6. Toda animación GPU-barata + respeta `prefers-reduced-motion`; focus-visible con outline lava.
