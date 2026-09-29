# Plan de unificación — alignux.alexendros.dev ↔ alexendros.dev

### Propósito de este documento

- **Objetivo:** corregir las premisas del plan original con los datos reales del
  repositorio, cerrar los **tres** bugs de producción detectados y fijar las fases
  de ejecución, decisiones y Definition of Done para terminar + endurecer +
  desplegar el frontend `alignux-app`.
- **Destinatarios:** agente de código y rol Mantenedor.
- **Fuentes de verdad:** `README.md`, `AGENTS.md` del repo `alignux-app`, la
  arquitectura real de despliegue (repos `alignux` y `alignux-app`), y el estado
  verificado en vivo de `alignux.alexendros.dev`.
- **Estado:** validado contra datos reales (rama `main` y sitio en producción,
  2026-09-29).

---

## 0. Corrección de premisas

El plan original partía de tres supuestos que **no se cumplen**. Quedan corregidos:

| # | Supuesto original | Realidad verificada |
|---|---|---|
| 1 | `alignux-app` es un repo «starter» (3 commits, README sin editar) | Existe un puerto Astro sustancial pero **incompleto** y **ya desplegado** vía CI |
| 2 | El sitio vivo es el `index.html` estático de raíz | El sitio vivo es el **build de Astro**; el `index.html` raíz es **vestigial** |
| 3 | La marca es teal (hue ~167) | La marca en producción es **Matrix** `#00ff41` (hue ~145); el teal es vestigial |

Consecuencia: el reframe correcto es **«terminar + endurecer + desplegar el puerto
existente»**, no «migrar desde cero».

---

## 1. Arquitectura real de despliegue

```
alignux (monorepo, Soluciones-Alexendros/alignux)
└── app/  ──▶ submódulo git → Soluciones-Alexendros/alignux-app
                 (pin 353390f6e8eb0e7acb5136cae5cbae92a80406e7 == main HEAD)

alignux/.github/workflows/
├── status.yml   cron `0 * * * *` + manual
│     submodules: recursive
│     python3 tools/status-export.py --out app/status.json
│     python3 -m json.tool + tools/status-validate.py (vs tools/status.schema.json)
│     cd app && npm ci && npm run build
│     ./tools/check-frontend.sh
│     publica app/dist/. + app/CNAME  → rama huérfana gh-pages (force push)
└── pages.yml    workflow_run (Status) + workflow_dispatch
      checkout gh-pages · configure-pages · upload-pages-artifact · deploy-pages
```

- El frontend **no tiene CI propio** en `alignux-app`; el deploy vive en `alignux`.
- `app/` es **submódulo git**, no un árbol. El checkout local queda en
  **detached HEAD** (pin de submódulo).
- `tools/status-export.py` (en `alignux`) consulta la API de GitHub (issues por
  etiqueta, milestones, runs de workflows) y lee el pin de `VERSIONS.toml`
  (`sel4 16.0.0`, `microkit 2.3.1`, `rust_sel4 5.0.0`). Regla de honestidad: si la
  API falla conserva el último dato bueno con `data_fresh:false` y `last_good_at`;
  nunca inventa.

---

## 2. Bugs de producción (P0)

### P0-a — `status.json` → 404

`https://alignux.alexendros.dev/status.json` devuelve **404**, por lo que el
dashboard (`fetch('status.json')`) falla y todo muestra «Sin datos».

- **Causa:** `status.json` está en la **raíz** de `alignux-app`, no en `public/`;
  el build de Astro no lo copia a `dist/`.
- **Fix:** mover `status.json` → `public/status.json` (y/o que el workflow escriba
  en `app/public/status.json`).

### P0-b — Reglas de layout CSS ausentes

El bundle CSS desplegado **no** contiene: `.tabs`, `.tab-btn[aria-selected]`,
`section.panel` / `[data-active]`, `header.top`, `.brand`, `.brand .dot`,
`.subtitle`, `.theme-toggle-*`. Sí contiene `.tab-btn` (solo la regla de
`transition`), `color-scheme`, `prefers-reduced-motion`, `.sr-only`,
`:focus-visible`, `scroll-behavior`.

- **Consecuencia:** `initTabs` (JS) alterna `aria-selected` / `data-active` pero
  sin CSS los 8 paneles se apilan y header/tabs quedan sin estilo.
- **Causa:** esas reglas solo existen en el `index.html` **vestigial**
  (líneas 25-35) y nunca se portaron a `src/styles/`.

### P0-c — Anotaciones TypeScript inválidas en `public/scripts/`

`public/scripts/tabs.js` y `public/scripts/theme.js` contienen **anotaciones de
tipo TypeScript** (`initTabs(initialTab?: string)`, `(e: KeyboardEvent)`,
`entry.target as HTMLElement`, `as const`, `type Theme = …`, `Record<Theme, string>`,
`as Theme | null`, campos `private`, etc.). `public/` se copia **verbatim** a
`dist/`, de modo que el navegador recibe `.js` con sintaxis TypeScript inválida y
al cargar el módulo lanza **`SyntaxError`**.

- **Consecuencia:** `initTabs`/`initPanels` **nunca se exportan** (los 8 paneles no
  conmutan **aunque se arregle P0-b**) y el conmutador de tema nunca se inicializa.
  Es más severo que P0-b: rompe la interacción JS, no solo el estilo.
- **Causa:** ficheros escritos como TS con extensión `.js`, colocados en `public/`
  (fuera del pipeline de Vite, que sí los transformaría). `src/scripts/tabs.js` y
  `src/scripts/theme.js` tienen exactamente las mismas anotaciones.
- **Fix inmediato (Fase 0):** quitar las anotaciones TS de ambos ficheros en
  `public/scripts/` (versión JS válida).
- **Fix de raíz (Fase 1):** moverlos a `src/scripts/*.ts` y dejar que Vite los
  bundlee (Opción B, §4-Fase 1).
- **Alcance:** `public/scripts/{terminal-typewriter,status-loader,scroll-reveal}.js`
  ya son JS limpio; el problema afecta solo a `tabs.js` y `theme.js`. Las reglas
  `.theme-toggle-*` no existen en ningún CSS (solo en el `btn.style.cssText` de
  `theme.js`), por lo que deben crearse en Fase 0.

---

## 3. Validación reclamación-a-reclamación

| # | Afirmación del plan original | Estado real |
|---|---|---|
| 1 | Repo starter, 3 commits | Puerto Astro sustancial (10 paneles, 3 CSS, 5 scripts, 2 datasets) |
| 2 | Google Fonts + Space Grotesk | Fuentes ya autoalojadas: Inter + JetBrains Mono (no hay Space Grotesk) |
| 3 | `index.html` teal (hue 167) | Producción usa Matrix `#00ff41` (hue ~145); teal es vestigial |
| 4 | Migrar tokens a OKLCH | ✅ Hecho (Fase 3); tabla del plan corregida a la paleta real |
| 5 | CLS por «Cargando…» | ✅ Resuelto (Fase 2: skeletons con altura reservada) |
| 6 | `innerHTML` + `style=` inline | ✅ Resuelto (Fase 2: DOM + clases) |
| 7 | `status.json` en raíz (riesgo 404) | **Materializado** (P0-a) |
| 8 | Bug `nav.tabs` vs `<div class=tabs>` | ✅ Resuelto: `nav.tabs` + reglas de layout portadas (Fase 0, P0-b) |
| 9 | Sin skip-link / CSP / reduced-motion | ✅ Resuelto: skip-link + CSP añadidos en Fase 2 |
| 10 | `.sr-only` duplicada | Ya es única en `global.css` |
| 11 | — (no contemplado) | `public/scripts/tabs.js` y `theme.js` con anotaciones TS → `SyntaxError` en runtime; tabs y tema muertos (**P0-c**) |

---

## 4. Plan por fases

### Fase 0 — Reparar producción (P0)

1. Mover `status.json` → `public/status.json` (resuelve P0-a).
2. Portar a `src/styles/global.css` las reglas de layout del `index.html`
   vestigial: `header.top`, `.brand`, `.brand .dot`, `.subtitle`, `nav.tabs`,
   `.tab-btn` base + `.tab-btn:hover` + `.tab-btn[aria-selected="true"]`, `main`,
   `section.panel { display:none }` + `section.panel[data-active="true"] { display:block }`,
   y crear `.theme-toggle-container` / `.theme-toggle-btn` (no existen en ningún
   CSS; hoy solo los define el `btn.style.cssText` de `theme.js`).
   **Traducir la paleta teal obsoleta** del vestigial (`--accent #00d9a3`,
   `--txt`, `--muted`, `--panel`…) a los tokens vigentes (`--brand`, `--fg`,
   `--fg-muted`, `--bg-elevated`, `--border`…) y la tipografía `Space Grotesk` a
   `--font-sans`. (resuelve P0-b).
3. **Eliminar las anotaciones TypeScript** de `public/scripts/tabs.js` y
   `public/scripts/theme.js` (versión JS válida, sin `?`, `: tipo`, `as …`,
   `as const`, `type …`, `private`, ni tipos de retorno) para que el navegador no
   reciba `SyntaxError` (resuelve P0-c). El fix de raíz llega en Fase 1.
4. Verificar que los 8 paneles conmutan, el tema alterna y hay paridad visual
   (Playwright) contra el `index.html` vestigial antes de considerarla cerrada.

### Fase 1 — Consolidar fuentes: **Opción B** — `src/` única + bundle Vite (decidida)

**Decisión del usuario:** una única fuente de verdad en `src/`, procesada por el
build de Astro/Vite. Se elimina `public/scripts/`, `public/data/` y
`public/utils/`.

1. Fuente única en TypeScript dentro de `src/`:
   - `src/scripts/tabs.ts`, `theme.ts`, `terminal-typewriter.ts`,
     `status-loader.ts`, `scroll-reveal.ts` (ya existe el borrador TS; corregir).
   - `src/data/risks.ts`, `sources.ts` (ya existen). Eliminar `src/data/gates.ts`
     y `src/utils/dom.ts` si siguen sin uso… salvo `dom.ts`, que se **conserva**
     para Fase 2.
   - `src/utils/format.ts` (ya existe).
2. Reescribir los imports a rutas **relativas TS**
   (p. ej. `import { badgeFor } from '../utils/format.ts'`), eliminar los imports
   `/src/...` del `status-loader.ts` obsoleto y sustituir el `interface StatusData`
   solo si aporta valor (el TS del proyecto valida sin runtime types).
3. Cargar el JS desde plantillas `.astro` con `<script>` de Astro (Vite bundlea),
   **no** con `src="/scripts/..."`:
   - `BaseLayout.astro`: importar `theme.ts` desde el `<script>` en lugar de
     `<script type="module" src="/scripts/theme.js">`.
   - `Header.astro`: `import { initTabs } from '../scripts/tabs.ts'`.
   - `TabPanels.astro`: `import { initPanels } from '../scripts/tabs.ts'` e
     importar `status-loader.ts`/`scroll-reveal.ts`.
   - `status-loader.ts` importa `RISKS`/`SOURCES`/`format` como módulos (no vía
     `fetch` de `/data/...`).
4. Dejar `public/` solo con `favicon.*`, `fonts/` y `status.json`; eliminar los
   duplicados de `public/scripts|data|utils/`.
5. Verificar que `dist/` ya **no** copia `scripts/`, `data/`, `utils/` y que el
   bundle Vite contiene los módulos transformados (sin anotaciones TS).

### Fase 2 — Endurecimiento

- Eliminar CLS: sustituir «Cargando…» por skeleton con **altura reservada**.
- Reemplazar `innerHTML` por construcción de DOM (`src/utils/dom.ts`).
- Reemplazar `style=` inline por clases (transiciones, retrasos).
- Añadir skip-link y CSP.
- Añadir `color-scheme: light` en `[data-theme="light"]` (hoy solo hay `dark`).

### Fase 3 — Migración a OKLCH (confirmada)

Migrar los tokens de `src/styles/tokens.css` de `hex + color-mix(srgb)` a **OKLCH**.
Tabla de conversión exacta (sRGB→OKLCH, matrices Björn Ottosson):

| Token | Hex | OKLCH |
|---|---|---|
| `--blue-950` | `#081f47` | `oklch(0.249 0.0805 260.6)` |
| `--blue-900` | `#0f3778` | `oklch(0.352 0.1199 260.0)` |
| `--blue-700` | `#1b56b8` | `oklch(0.476 0.1666 260.3)` |
| `--blue-500` | `#3f7de0` | `oklch(0.599 0.1639 259.4)` |
| `--blue-100` | `#e6eefb` | `oklch(0.947 0.0195 260.2)` |
| `--ink-900` | `#0b1220` | `oklch(0.183 0.0309 263.4)` |
| `--ink-700` | `#33415c` | `oklch(0.375 0.0501 263.1)` |
| `--ink-500` | `#5b6885` | `oklch(0.518 0.0488 265.9)` |
| `--paper-0` | `#ffffff` | `oklch(1.000 0 0)` |
| `--paper-50` | `#f6f8fc` | `oklch(0.979 0.0057 264.5)` |
| `--line` | `#d9e0ee` | `oklch(0.906 0.0206 264.5)` |
| `--ok` | `#157347` | `oklch(0.492 0.1095 157.0)` |
| `--warn` | `#b45309` | `oklch(0.555 0.1455 49.0)` |
| `--err` | `#b42318` | `oklch(0.500 0.1821 29.5)` |
| `--matrix` | `#00ff41` | `oklch(0.869 0.2776 144.5)` |
| `--matrix-hover` | `#00e63a` | `oklch(0.803 0.2566 144.5)` |

Nota: la tabla OKLCH del plan original apuntaba a la paleta teal **obsoleta**; la
de arriba corresponde a la paleta real en producción (azul + Matrix).

### Fase 4 — Unificación con alexendros.dev (opcional, aligerada)

- **Objetivo:** compartir **características esenciales**, no ser idéntico
  (decisión del usuario).
- `alexendros.dev` no expone capa central de tokens (HTML con 0 custom properties);
  exige **extraer** primero una capa de tokens compartida (requiere acceso a su
  repo/CSS, no localizado). Se aplaza hasta disponer de ese acceso.

---

## 5. Decisiones

| Decisión | Estado | Resolución |
|---|---|---|
| D1 — Color de marca | ✅ Resuelta | Matrix `#00ff41` (hue ~145) |
| D2 — Tipografía | ✅ Resuelta | Inter + JetBrains Mono autoalojadas |
| D3 — Tokenización OKLCH | ✅ Confirmada | Migrar a OKLCH (tabla §4-Fase 3) |
| D4 — Unificación tokens | ✅ Aligerada | Compartir características esenciales, no idéntico |
| D5 — CLS / innerHTML / inline style | ✅ Resuelta | Fase 2 completada |
| D6 — CSP / skip-link | ✅ Resuelta | Fase 2 completada |
| D7 — Despliegue | ✅ Resuelta | Deploy vive en `alignux` (status.yml + pages.yml) |
| D8 — Deriva `src/` ↔ `public/` | ✅ Decidida | **Opción B**: `src/` única fuente + bundle Vite (§4-Fase 1) |
| D9 — P0-c (sintaxis TS en `public/scripts/`) | ✅ Decidida | Arreglo inmediato en Fase 0 + eliminación de raíz en Fase 1 |

---

## 6. Riesgos

| Riesgo | Estado | Nota |
|---|---|---|
| R-A / R-D (sin CI / deploy) | ✅ Resuelto | Deploy en `alignux` |
| R-B (`status.json` 404) | 🟢 Reparado | P0-a: movido a `public/status.json` (Fase 0) |
| R-C (generador) | ✅ Resuelto | `tools/status-export.py` en `alignux` |
| R-N (detached HEAD del submódulo) | 🟠 Nuevo | El checkout local de `app/` está en detached HEAD; hay que hacer `git checkout main` antes de commitear |
| R-N (CSS de layout solo en index.html vestigial) | 🟠 Nuevo | Fuente única de las reglas faltantes; portar antes de borrar el vestigial |
| R-N (P0-c: TS inválido en `public/scripts/`) | 🟢 Reparado | `public/scripts/` eliminado; TS a `src/` (Fase 0/1) |

---

## 7. Definition of Done

- [ ] `status.json` responde 200 en producción (Fase 0) — pendiente de verificar en vivo tras desplegar.
- [~] Los 8 paneles alternan y header/tabs tienen estilo (Fase 0) — CSS y bundle verificados localmente; falta e2e.
- [x] `public/scripts/` eliminado; scripts TS en `src/` bundleados por Vite (Fase 0/1 — Opción B).
- [x] Consola sin `SyntaxError` al cargar los módulos.
- [ ] Paridad visual Playwright vs `index.html` vestigial.
- [x] `npm run build` y `astro check` verdes (24 archivos, 0 errores).
- [x] Sin deriva `src/` ↔ `public/` (Fase 1).
- [x] Sin `innerHTML` ni `style=` inline estático en el render de datos (Fase 2).
- [x] CLS eliminado (skeleton con altura reservada).
- [x] Tokens en OKLCH (Fase 3).
- [ ] Lighthouse ≥ 90.

---

## 8. Decisiones del usuario (cierre)

1. **Migrar a OKLCH** → confirmado.
2. **Tokens compartidos**: no idénticos, pero con características esenciales comunes.
3. **`status.json` a `public/`** → sí.
4. **Urgencias**: si aparece algo urgente, incluirlo (incorporado: P0-a/P0-b/**P0-c**, R-N).
5. **Deriva `src/` ↔ `public/`** → **Opción B**: mover a `src/` y bundle Vite.
6. **P0-c** (sintaxis TS en `public/scripts/`) → añadir a Fase 0 del plan.

---

## 9. Estado de implementación (2026-09-29)

Rama de trabajo `alignux-app` (submódulo `app/` del monorepo `alignux`).

### Resultado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| Fase 0 — P0-a | ✅ Hecho | `status.json` → `public/status.json`; presente en `dist/` |
| Fase 0 — P0-b | ✅ Hecho | Reglas de layout portadas a `src/styles/global.css` con tokens vigentes |
| Fase 0 — P0-c | ✅ Hecho | `public/scripts/` eliminado; TS movido a `src/` (arreglo de raíz) |
| Fase 1 — Opción B | ✅ Hecho | Fuente única `src/*.ts`, imports relativos, Vite bundlea, sin deriva |
| Fase 2 — Endurecimiento | ✅ Hecho | Skeletons, DOM (sin `innerHTML`), clases (sin `style=`), skip-link, CSP, `color-scheme:light` |
| Fase 3 — OKLCH | ✅ Hecho | `tokens.css` 100% OKLCH (`color-mix(in oklch, …)`); 0 `hex` |
| Fase 4 — Unificación | ⏸ Aplazada | Falta acceso a la capa de tokens de `alexendros.dev` |

### Verificación

- `astro check`: 24 archivos, **0 errores / 0 avisos / 0 hints**.
- `npm run build`: **12 módulos** transformados; `dist/` con `_astro/*.js`, CSS y `status.json`; **sin** `dist/scripts/`.
- `find src public -name '*.js'`: sin duplicados residuales.
- Pendiente en vivo: 200 de `status.json`, paridad Playwright y Lighthouse.

### Hallazgos durante la implementación

1. **Causa del bug de bundle (no contemplada en el plan):** un `<script type="module">` explícito en una plantilla `.astro` **no** se procesa ni bundlea —Astro lo emite verbatim con los imports sin resolver, dejando los módulos muertos—. Con `<script>` plano (sin atributo `type`) Astro sí lo bundlea vía Vite. Corregido en `Header.astro` y `TabPanels.astro`.
2. **Cableado incompleto del port original:** ningún componente `.astro` cargaba `status-loader` ni `scroll-reveal`; el panel dinámico nunca se ejecutaba en el port Astro. Cableados en Fase 1 desde `TabPanels.astro`.
3. **Fase 4 — ruta del generador:** el workflow padre (`alignux/.github/workflows/status.yml`) escribe hoy `app/status.json`; debe actualizarse a **`app/public/status.json`** para que el dato llegue al `dist/`.
4. `--accent` (versión antigua de `terminal-typewriter`) sustituido por `--brand`.

### Nota de despliegue

`app/` es submódulo en **detached HEAD**; antes de commitear en `alignux-app` hay que `git checkout main` (R-N). No se han hecho commits.
