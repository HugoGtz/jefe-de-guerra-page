# Design System — Jefe de Guerra

Guía **prescriptiva** para humanos y agentes de IA que tocan la UI de este repo. No es teoría: son reglas de "usa esto, no aquello". Si dudas, sigue el patrón que ya existe en `src/lib/components/**` — la consistencia de la estética (metal oscuro + rojo lava/sangre, texto grabado, glows) importa más que la elegancia del código.

**Stack:** SvelteKit 2 + Svelte 5 (runes: `$state`/`$derived`/`$props`), Tailwind **v4** (sin `tailwind.config`; tokens en `@theme` dentro de `src/app.css`), Cloudflare Pages SSR + D1 (Drizzle).

---

## 1. Filosofía: utilidad vs. CSS scoped

Este proyecto **no tiene una escala tipográfica ni de espaciado consistente** y eso es **deliberado**. Auditando los valores reales encontramos:

- **59 valores distintos de `font-size`** (13 sabores de `0.85rem`, ~20 `clamp()` únicos, etc.).
- **~14 breakpoints distintos** (540px → 980px, mezclando `px` y `rem`).
- **15 valores de `letter-spacing`** (de los cuales solo 3 son tokens).

El estilo es **bespoke por componente**, con muchos gradientes, glows y `color-mix()`. Intentar forzar una escala de utilidades Tailwind sobre esto produciría "sopa de clases arbitrarias" (`text-[0.82rem] tracking-[0.06em] ...`) sin ganar consistencia. Por eso la política es:

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

### Tamaños de fuente — guía honesta

**No existe una escala tipográfica.** Hay 59 valores distintos. Por tanto:

- **Define el `font-size` en el `<style>` scoped del componente**, con el valor exacto que pida el diseño (rem para fijos, `clamp(min, vw, max)` para responsivos — patrón dominante para títulos, ver `Section.svelte`).
- **NUNCA** uses `text-[0.82rem]` ni las utilidades de escala de Tailwind (`text-sm`, `text-lg`, …) para tipografía de contenido. Rompen la coherencia bespoke y crean una segunda fuente de verdad.
- Para tamaños de heading responsivos, copia el patrón `clamp()` existente:

```css
/* Section.svelte — título de sección */
.section__title {
	font-size: clamp(2rem, 5vw, 3.2rem);
	font-weight: 900;
	line-height: 1.05;
}
```

Ver §8 (Deuda de diseño) para la propuesta de racionalizar esto.

---

## 4. Espaciado y layout

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

### Breakpoints — ad-hoc (decisión de diseño pendiente)

Hoy conviven ~14 breakpoints distintos (`540, 560, 620, 720, 760, 820, 880, 920, 940, 980 px` + algunos en `rem`). **No hay un set estándar.** Al añadir CSS responsivo, **reutiliza uno de los breakpoints frecuentes** en vez de inventar uno nuevo:

- `560px` — móvil grande / apilado→2col (el más usado).
- `720px` — tablet / →3col.
- `980px` (≈`60rem`) — desktop / colapso de nav.

Ver §8 para la propuesta de estandarización.

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

## 8. Deuda / decisiones de diseño pendientes

Candidatos a **racionalizar** (esto es rediseño consciente, **no** una migración mecánica — no conviertas nada de esto sin acuerdo de diseño):

1. **Escala tipográfica ad-hoc (59 `font-size` distintos).** Muchos valores casi-idénticos (`0.82` vs `0.85` vs `0.88rem`) sin intención perceptible. Propuesta: definir una escala de ~7–8 tamaños como tokens (`--text-xs … --text-4xl`) y una familia de `clamp()` canónicos para headings, luego consolidar. Beneficio: coherencia visual real y menos decisiones por componente.

2. **~14 breakpoints (540–980px, mezcla px/rem).** Propuesta: fijar 3–4 breakpoints canónicos (p. ej. `560 / 720 / 980px`) como convención documentada y migrar los cercanos. Unificar unidades a `rem`.

3. **15 valores de `letter-spacing`**, de los que solo 3 son tokens. Varios valores sueltos (`0.02`, `0.03`, `0.05`, `0.06em`) podrían absorberse en los 3 tokens existentes o en 1–2 nuevos.

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
