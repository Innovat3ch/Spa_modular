# SPA Modular — Estado del Sistema y Documentación Técnica
**Documento consolidado — auditado contra código real**
**Julio 2026 — actualización: resolver de CTA unificado, `openItem` genérico, contrato `items[]` v2 (targets/colecciones)**

Este documento describe el estado real del framework, verificado contra el código fuente vigente. Reemplaza y consolida versiones anteriores (v2.0, v2.1, v3.0) que quedaron fragmentadas entre múltiples sesiones de trabajo. Esta revisión incorpora los cambios de la sesión más reciente: el bug de CTA de WhatsApp (8.1) quedó resuelto, se agregó un mecanismo genérico de apertura de items (`openItem`), y el contrato de `items[]` evolucionó de `target` singular a `targets` (array), con soporte de colecciones y una regla de disambiguación por presencia de `id`.

---

## 1. Objetivo y Metodología

Cada afirmación fue verificada contra el código fuente real o contra una prueba ejecutada (no solo revisión visual). Donde el código y la documentación anterior no coincidían, se documenta el estado real del código y se marca la discrepancia como pendiente de decisión o corrección.

**Alcance:** contrato de datos (`model.json`), núcleo del framework (`layout.js`, `helpers.js`, `cta.js`, `social.js`, `main.js`), los renderers de layout, el sistema de variables CSS, y los módulos estables (`hero`, `about`, `services`) más el primer módulo construido enteramente bajo el contrato v2 (`passenger`, proyecto Mi Ruta).

**Fuera de alcance:** `contact.js` y `location.js` están en proceso de reescritura y se documentan aparte. `split.js` no fue tocado en esta revisión — sigue con la implementación parcial descrita en 8.2; el ajuste de `contentWidth` que el equipo reporta haber hecho no fue auditado contra código real en este corte.

---

## 2. Arquitectura General

El sistema es una SPA modular donde cada sección del sitio es un módulo independiente, con su propio JSON de datos, JS de entrada y CSS de personalización. Un núcleo compartido ("core") resuelve layout, estilos y contenido de forma centralizada.

### 2.1 Flujo de ejecución

```
main.js
  ├── carga config_web.json
  └── inicializa la SPA
        │
        ▼
router.js
  ├── valida navigation[key].show === true
  ├── carga el módulo JS ({key}.js)
  ├── invoca window.load(config, key)
  ├── controla navegación e historial (pushState / popstate)
  └── dispara evento "sectionChanged" → actualiza el dock
        │
        ▼
{key}.js
  ├── cargarJSON(`data/${key}.json`)
  ├── renderLayout(data, config)
  └── setup.after()   ← asigna id, activa dark mode
        │
        ▼
layout.js (fachada)
  ├── normalizeLayout()      resuelve alias y fallback a default_layout
  ├── loadCSS() / loadJS()   carga el renderer bajo demanda
  ├── resolveItems()         resuelve referencias/colecciones (v2: targets[], id, _children)
  ├── buildLayoutControl()   resuelve align, valign, text_align, columns, contentWidth
  ├── wrapSection()          genera el <section> con data-attrs y CSS vars
  └── renderer(data, config, control)
              │
              ▼
        Genera SOLO HTML interno (.layout-content + contenido)
        NUNCA: genera <section> · carga JSON · resuelve items ·
               resuelve align/valign/text_align · resuelve contentWidth ·
               conoce navegación
```

### 2.2 Flujo paralelo — dock flotante

```
router.js → evento "sectionChanged" → main.js → actualizarDock(floating.items)
                                                        │
                                                        ▼
                                                   social.js
                                                        ├── lee social.json
                                                        ├── resuelve source/target de cada item
                                                        │   vía resolveSocialChannel() (helpers.js)
                                                        ├── WhatsApp: número desde config.business.whatsapp
                                                        │   (config leído vía window.getConfig(), ya no
                                                        │   pasado como parámetro — ver 5.2/5.4)
                                                        └── inyecta HTML en #floating-dock
```

El dock se resuelve independientemente del render de la sección — un fallo en el render no impide que el dock se actualice, y viceversa.

### 2.3 Nota operativa — overlayfs sin aislamiento entre proyectos

El core (`layout.js`, `helpers.js`, `cta.js`, `social.js`, los renderers) se comparte entre proyectos distintos (Mi Ruta, Presencia Digital, y cualquier otro que corra sobre la misma base) vía overlayfs. **No hay aislamiento entre proyectos a nivel de core** — cualquier cambio subido se propaga de inmediato a todos los sitios que no tengan una personalización propia superpuesta. Ver sección 13 para el checklist de migración obligatorio antes de cualquier despliegue del core.

---

## 3. Contrato de Archivos

### 3.1 Core — nunca se tocan por módulo

| Archivo | Rol |
|---|---|
| `assets/core/layout.js` | Fachada central — normaliza, resuelve, construye, delega. Expone también `window.openItem(id)` (nuevo) |
| `assets/core/helpers.js` | Utilidades globales — cargarJSON, escapeHTML, resolveItems (v2), resolveSocialChannel (nuevo), renderBase |
| `assets/core/cta.js` | Constructor de CTAs — infiere comportamiento desde source/target. Reescrito: separa `resolveCTALink()` de `buildCTA()` |
| `assets/core/social.js` | Dock flotante — resuelve social.json vía `resolveSocialChannel()`, ya no con lógica propia de WhatsApp |
| `assets/core/blocks.js / .css` | Renderer de cards/bloques — ahora con `data-id` y pintado de `_children` |
| `assets/core/accordion.js / .css` | Renderer de acordeón — pintado de `_children` agregado |
| `assets/core/fullscreen.js / .css` | Renderer de pantalla completa — ahora con `data-id` y pintado de `_children` |
| `assets/core/split.js / .css` | Renderer de split (contenido + media) — sin cambios en este corte |
| `assets/css/layout.css` | CSS base universal — estructura, align, valign, dark mode, tipografía. Se agregó `.item-highlight` |
| `assets/css/main.css` | Estilos globales — navbar, tokens de diseño, dock |
| `assets/js/router.js` | Orquestador de navegación y carga de módulos |
| `assets/js/main.js` | Punto de entrada — inicializa config, dock, resolvedores de media. Expone `window.getConfig()` (nuevo); `abrirServicioPendiente()` ya no depende de `openServiceAccordion` ni está hardcodeada a la sección "services" |

### 3.2 Por módulo

| Archivo | Rol |
|---|---|
| `data/{key}.json` | Datos y configuración del módulo — debe cumplir model.json |
| `assets/js/{key}.js` | Entry point — carga JSON, llama renderLayout, ejecuta setup.after |
| `assets/css/{key}.css` | Estilos específicos — variables de override, padding, tipografía |

### 3.3 Datos globales

| Archivo | Rol |
|---|---|
| `data/config_web.json` | Contrato del sitio — cliente, negocio, apariencia, navegación, layouts por defecto |
| `data/social.json` | Canales sociales — id/icon/source/target/color por canal |
| `model.json` | Contrato de referencia de una sección (no se carga en runtime) |

---

## 4. Contrato de Datos — model.json

`model.json` es la única fuente de verdad sobre qué campos puede tener el JSON de cualquier módulo. No se carga en runtime — es la referencia contra la que se valida cualquier `{key}.json`.

### 4.1 Esquema completo vigente

```json
{
  "layout": "",       // fullscreen | split-left | split-right | accordion | blocks | default
  "align": "",        // left | center | right
  "valign": "",       // top | middle | bottom
  "text_align": "",   // left | center | right | justify
  "columns": 2,       // número positivo — usado por blocks, accordion, grid

  "title": "",
  "subtitle": "",
  "intro": "",

  "cta": {
    "label": "",
    "source": "",   // "url" | "social" | "<key-de-sección>"
    "target": "",   // url/recurso externo | id social | id opcional dentro de la sección
    "message": ""   // mensaje pre-cargado (WhatsApp)
  },

  "floating": {
    "direction": "",  // vertical | horizontal
    "items": [
      { "source": "social", "target": "" }  // target = id en social.json
    ]
  },

  "media": {
    "source": "",  // "section" | "image" | "video" | "pdf" | "url"
    "target": ""   // key de sección | path | url
  },

  "items": [
    {
      "id": "",           // presente → entidad (nunca se pisa); ausente → referencia pura
      "source": "",       // nombre del catálogo externo (ej: "services", "paraderos")
      "targets": [],      // ids a resolver — 1 elemento = referencia simple, 2+ = colección
      "query": "",        // [PENDIENTE, no implementado] catálogo donde buscar referencias inversas
      "title": "",
      "summary": "",
      "description": "",
      "icon": "",
      "image": "",
      "features": [],
      "cta": { "label": "", "source": "", "target": "", "message": "" }
    }
  ]
}
```

### 4.2 Reglas del contrato

- **Sin campo `type`:** el comportamiento de un CTA se infiere exclusivamente desde `source + target`. Confirmado en `cta.js`.
- **`cta` / `floating.items` / `media` mantienen `target` SINGULAR, a propósito.** Los tres describen un único destino cada uno — un CTA no navega a dos lugares a la vez. No se unificaron a `targets[]`; solo `items[]` migró.
- **`items[]` migró de `target` a `targets` (array).** Un array de un solo elemento es una referencia simple; de varios, una colección. El resolver (`resolveItems()`, `helpers.js`) trata ambos casos con la misma lógica — no hay dos caminos de código para "uno" vs "varios".
- **Regla de disambiguación — referencia pura vs. entidad/colección**, decidida por presencia de `id` en el item declarado:
  - **Sin `id` propio** → referencia pura. El item se reemplaza por completo con el item externo (`source + targets[0]`). Comportamiento equivalente al contrato v1, solo que ahora lee `targets[0]` en vez de `target`.
  - **Con `id` propio** → entidad. Nunca se pisa; conserva `title`/`summary`/etc. propios. Si además trae `source + targets`, esa combinación describe su colección de hijos, resuelta en un campo de salida `_children` (no se declara en el JSON de autor — lo produce el resolver).
  - La resolución es **recursiva**: un item externo traído por una referencia pura puede él mismo ser una colección (tiene su propio `id + source + targets`) — se detecta después del merge, no antes. Caso real: `passenger.json` referencia `rutas.json` (referencia pura, sin `id`); la ruta resuelta trae su propia colección de paraderos.
- **`query` está reservado en el contrato pero NO implementado en el resolver.** Documentado para que quede declarado antes de programarse. Ver sección 13.3 para el diseño previsto.
- **Existencia condicional:** ningún campo opcional vacío genera HTML. No hay placeholders ni contenido por defecto — confirmado en los renderers estables.
- **Cadena de resolución de valores (layout):** valor del módulo JSON → `default_X` de `config_web.json` (`layouts.default_*`) → valor hardcodeado en `layout.js`.

```json
"layouts": {
  "default_layout":     "accordion",
  "default_align":      "center",
  "default_valign":     "middle",
  "default_text_align": "center",
  "default_columns":    2
}
```

### 4.3 Tabla de layouts y su función

| Layout | Función | columns | media |
|---|---|---|---|
| `fullscreen` | Sección 100vh con fondo e imagen opcional | — | — |
| `split-left / split-right` | Contenido + panel media; contentWidth controla la proporción | — | SÍ |
| `blocks` | Bloques/cards de contenido | SÍ | — |
| `accordion` | Items apilados con cabecera desplegable | SÍ | — |
| `default` | Fallback a `config_web.json → layouts.default_layout` | — | — |

**Layouts conceptuales — no implementados:** `list`, `timeline`, `carousel`, `tabs`. Se preservan en el diseño del sistema para desarrollo futuro. Cualquier implementación futura debe respetar el contrato D5: `renderer(data, config, control)`, solo HTML interno, nunca el `<section>`.

### 4.4 Alias de layout

Definidos en `layout.js → ALIASES`:

```js
{
  'block':      'blocks',
  'cards':      'blocks',   // alias por limitación de nombres de archivo en Windows/VSCode
  'split-left': 'split',
  'split-right':'split'
}
```

**Nota sobre `cards`:** el archivo canónico es `blocks.js` — el nombre `cards.js` no pudo crearse por conflicto de nombre reservado en Windows/VSCode. Es una limitación técnica, no una decisión de diseño.

---

## 5. Núcleo del Framework (Core)

### 5.1 layout.js — Fachada

Responsabilidad única: traducir el contrato JSON a control de render, sin conocer el contenido HTML final de ningún layout específico.

- `normalizeLayout(layout, config)` — resuelve alias, cae a `default_layout` si no hay valor o el valor es desconocido.
- `buildLayoutControl(data, config, layout)` — resuelve `align`, `valign`, `textAlign`, `columns`, `contentWidth` y arma clases, `data-attrs` y variables CSS inline.
- `wrapSection(control, html)` — único punto del sistema que genera la etiqueta `<section>`.
- `renderLayout(data, config)` — orquesta todo: carga CSS/JS del renderer bajo demanda, resuelve items (v2), invoca al renderer, envuelve el resultado.
- **`openItem(id)` — nuevo.** Función genérica de apertura/resaltado de items, agnóstica a sección y a layout:

```js
window.openItem = function(id) {
  if (!id) return;
  const el = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if (!el) return;
  if (el.tagName === 'DETAILS') el.open = true;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('item-highlight');
  setTimeout(() => el.classList.remove('item-highlight'), 2000);
};
```

Reemplaza el antiguo `openServiceAccordion` (nunca implementado, hardcodeado al nombre de sección "services" y al layout accordion pese a que `services.json` usa `blocks`). `openItem` no asume ninguna sección ni ningún layout — busca por `data-id`, presente hoy en los tres renderers estables.

**Firma oficial del renderer** — válida para los cuatro renderers implementados y cualquier futuro:
```js
renderer(data, config, control) → string HTML interno (sin <section>)
```

**Estado confirmado en este corte:** auditando los tres renderers estables (`accordion.js`, `blocks.js`, `fullscreen.js`), **ninguno usa `config`** — ni siquiera `cta.js`/`buildCTA()`, que ahora resuelve `config` vía `getConfig()` global en vez de recibirlo como parámetro. La firma no se tocó por decisión explícita: cambiarla exige editar la línea de invocación en `renderLayout()` más las cuatro firmas de renderer a la vez, y no hay urgencia funcional. Candidata a `renderer(data, control)` si se decide abordar en otra sesión — ver 8.7.

### 5.2 helpers.js — Utilidades globales

| Función | Rol | Estado |
|---|---|---|
| `cargarJSON(path)` | Fetch + parseo seguro de JSON, retorna null si falla | Sin cambios |
| `escapeHTML(value)` | Sanitiza texto antes de interpolar en HTML | Sin cambios |
| `resolveSectionWidth(value)` | Normaliza `"50"` → `"50%"`; deja pasar strings con unidad | Sin cambios |
| `resolveSectionStyle(data, config)` | Arma el atributo `style=` con fuentes y opacidad de overlay | Sin cambios |
| `resolveSectionBackground(data, config)` | Stub — ver pendiente 8.4 | Sin cambios |
| `mergeStyleAttrs(...attrs)` | Combina varios atributos `style=` en uno solo, evitando duplicados | Sin cambios |
| `resolveItems(items)` | **Reescrito (v2).** Contrato `targets[]`, disambiguación por `id`, resolución recursiva de colecciones (`_children`) | ✅ Probado con datos reales |
| `resolveSocialChannel(channelId, message)` | **Nuevo.** Resuelve un canal contra `social.json` (WhatsApp vía `config.business.whatsapp`, resto vía `source: "url"/"section"`). Lee `config` de `window.getConfig()`, no como parámetro | ✅ Compartido por `cta.js` y `social.js` |
| `renderBase(data)` | Genera título, eyebrow, intro y CTA principal — bloque común a todos los layouts. Firma sin cambios (no recibe `config`) | Sin cambios |
| `dataBusiness(config)` | Normaliza campos de negocio para consumo de módulos | Sin cambios |
| `inspectLayoutState() / debugLayoutState()` | Utilidades de depuración en consola del navegador | Sin cambios |

**Orden real generado por `renderBase()`:** `title → eyebrow (subtitle) → intro → cta`. El orden visual `subtitle → title → intro` se logra con la propiedad CSS `order` en `hero.css`, no en el HTML generado.

**Excepción deliberada — acceso global a `config`:** `resolveSocialChannel()` no recibe `config` como parámetro; lo lee de `window.getConfig()` (expuesto por `main.js`). Es la única función del sistema que accede a `config` de forma global — el resto de la cadena (`resolveSectionStyle`, `resolverMedia`, `buildLayoutControl`) sigue con paso explícito. Justificación: `config` es un singleton real (se carga una sola vez al boot, antes de cualquier render), y esta función vive en el extremo de contenido (leaf), no en la cadena de resolución de layout.

### 5.3 cta.js — Resolver de CTA

**Bug 8.1 resuelto en este corte.** `cta.js` separa `resolveCTALink(cta)` (lógica pura, sin HTML) de `buildCTA(cta)` (presentación). Ninguna de las dos recibe `config`:

- `source: "url"` → recurso externo explícito. Reemplaza el heurístico previo `target.startsWith('http')` — ahora también cubre PDFs e imágenes servidas como recurso relativo, no solo URLs que empiecen con `http`.
- `source: "social"` → delega en `resolveSocialChannel()`, el mismo mecanismo que usa el dock. WhatsApp ya no depende de `social.json.item.url` (campo inexistente, causa raíz del bug) — se arma desde `config.business.whatsapp`.
- Cualquier otro `source` → navegación interna SPA (`href="#{source}"`, `data-section`, `data-service` opcional) — sin cambios de comportamiento respecto a la versión anterior.

### 5.4 social.js — Dock flotante

Resuelve `floating.items` de cualquier módulo contra `social.json`. `renderSocialDock()` y `actualizarDock()` ya no reciben `config` como parámetro — usan `resolveSocialChannel()` internamente, mismo mecanismo que `cta.js`. `main.js` se ajustó (`actualizarDock(data?.floating)`, sin segundo argumento) para no dejar un parámetro muerto en la llamada.

### 5.5 Convenciones no documentadas previamente

Estas convenciones existen en `main.js`:

- **`resolverMedia(media, config)`** — vive en `main.js`. Resuelve `media.source/target` del contrato, incluyendo el caso `"section"` (cargar el panel de otra sección dentro de la actual). Sin cambios en este corte.
- **Convención `render{Capitalize}Panel(config, null)`** — cualquier módulo que quiera exponerse como "media embebida" de otra sección debe implementar esta función. `location.js` ya implementaba esta convención en su versión previa.
- **`window.getConfig()` — nuevo.** Único getter global de `config`, usado exclusivamente por `resolveSocialChannel()` (ver 5.2). El resto del sistema sigue recibiendo `config` por parámetro.

---

## 6. Renderers de Layout

| Renderer | Estado | Nota |
|---|---|---|
| `fullscreen.js / .css` | ✅ Confirmado | Fondo vía cascada CSS. `data-id` agregado en ambas ramas (`fs-item`, `fs-item--link`) — antes solo lo tenía `accordion.js`. Pinta `_children` como `.item-stops` |
| `blocks.js / .css` | ✅ Confirmado | Soporta items inline y por referencia. `data-id` agregado en `block-item`. Pinta `_children` |
| `accordion.js / .css` | ✅ Confirmado | Distribuye items en N columnas. Ya tenía `data-id` desde antes. Pinta `_children` |
| `split.js / .css` | 🟡 Parcial, sin auditar en este corte | Ver 8.2. Solo resuelve media como imagen en la última versión confirmada; el equipo reporta ajustes propios de `contentWidth` no verificados contra código en esta revisión |

### 6.1 Reglas comunes a los tres renderers estables

- **D1 — Items ya resueltos:** reciben `data.items` ya procesado por `resolveItems()` v2. Ningún renderer llama `resolveItems()` directamente.
- **D2 — Fuente única de ancho:** `--section-content-width` se resuelve una sola vez en `layout.js` y se consume como fallback en `.layout-content`.
- **D3 — Sin `titleAlign`:** eliminado del framework. Se usa exclusivamente `text_align` del contrato.
- **D5 — API oficial:** `renderer(data, config, control)`, solo genera HTML interno, nunca el `<section>`.
- **Clases `item-header` / `item-content`:** implementadas en los tres renderers, garantizan alineación consistente de título (izquierda) y cuerpo (justificado) sin importar el `text_align` del módulo.
- **Detección de referencia (actualizada):** `isReference` pasa de `item._source && item._target` a `item._source && Array.isArray(item._targets) && item._targets.length`, consistente con el contrato v2.
- **Pintado de colecciones (nuevo):** si un item trae `item._children` (array no vacío), los tres renderers agregan un bloque `<div class="item-stops">` con un `<span data-id="...">` por hijo, ubicado junto al CTA. Sin CSS propio todavía — ver 8.8.

---

## 7. Diccionario de Variables CSS

### 7.1 Cadena de resolución general

```
config_web.json → main.js → variables globales (:root)
data/{key}.json → layout.js → variables de sección (<section> inline)
{módulo}.css → override vía --module-*
layout.css → consume las variables y aplica estructura
```

### 7.2 Ancho de contenido

| Variable | Definida en | Rol |
|---|---|---|
| `--section-content-width-base` | `layout.css :root` | Fallback final (90% desktop / 100% mobile) |
| `--section-content-width` | `layout.js`, inline en `<section>` | Variable activa consumida por `.layout-content` |
| `--module-content-width` | `{módulo}.css`, en `.page-section` | Override del módulo — domina sobre el valor del JSON |

**Cadena de prioridad (mayor → menor):**
```
--module-content-width  →  valor del JSON (fallback inyectado por layout.js)  →  --section-content-width-base
```

### 7.3 Layout y estructura

| Variable | Default | Rol |
|---|---|---|
| `--section-padding` | `5%` / `6%` mobile | Padding horizontal de `.layout-content` |
| `--section-gap` | `0.6rem` / `1rem` mobile | Separación entre elementos |
| `--section-content-top-gap[-mobile]` | `1.7rem` / `2.5rem` | Separación bajo la navegación |
| `--columns` | JSON o default | Columnas del grid — blocks, accordion |

### 7.4 Tokens visuales de items

| Variable | Default | Rol |
|---|---|---|
| `--layout-border` | `rgba(13,13,13,.10)` | Borde de cards/items |
| `--layout-bg` | `var(--surface)` | Fondo de cards/items |
| `--layout-icon-bg` | `rgba(200,65,42,.08)` | Fondo del icono |
| `--layout-text` | `var(--text-main)` | Texto de items |
| `--title-color` | `var(--text-title)` | Color de títulos |

### 7.5 Escala tipográfica unificada

Definida en `main.css :root`, consumida globalmente en `layout.css`. Reemplaza los `font-size` hardcodeados que existían por renderer en versiones anteriores.

| Variable | Consumida en |
|---|---|
| `--type-title-size / -line / -spacing` | `.section-title` |
| `--type-eyebrow-size / -line / -spacing` | `.section-eyebrow`, `.section-subtitle` |
| `--type-intro-size / -line` | `.section-intro` |
| `--type-item-title-size / -line` | `.block-title`, `.accordion-title`, `.fs-item-title` |
| `--type-item-summary-size / -line` | `.block-summary`, `.accordion-summary`, `.fs-item-summary` |
| `--type-item-body-size / -line` | `.block-desc`, `.accordion-description`, `.fs-item-desc`, `.item-content` |
| `--type-item-list-size / -line` | `.block-features`, `.accordion-features`, `.fs-item-features` |

### 7.6 Marca global

| Variable | Rol |
|---|---|
| `--accent / --ink / --paper / --surface` | Paleta base |
| `--text-main / --text-title / --text-light` | Colores de texto |
| `--font-family / --font-secondary` | Tipografías display y de cuerpo |
| `--nav-height[-mobile]` | Altura de navegación |
| `--tracking-wide / -titles / -brand / -brand-tagline` | Letter-spacing |
| `--menu-toggle-size / -icon-width / -transition-* / -z-index / -shadow` | Sistema del menú hamburguesa mobile |

### 7.7 Dark mode

Activado por `data-dark="1"` en `.page-section`, seteado por `setup.after()` de cada módulo según el valor de `--dark-mode` declarado en su CSS.

```css
.page-section[data-dark="1"] {
  --layout-bg:      rgba(255, 255, 255, 0.06);
  --layout-border:  rgba(255, 255, 255, 0.12);
  --layout-text:    var(--text-light);
  --title-color:    var(--text-light);
  --eyebrow-color:  var(--accent);
  --subtitle-color: var(--accent);
  --intro-color:    var(--text-light);
}
```

### 7.8 item-highlight — nuevo

Usado por `window.openItem()` (ver 5.1) para resaltar temporalmente el item al que se navega desde otra sección (ej. CTA con `{source: "services", target: "web"}`, o al abrir un hijo de colección). Genérico: aplica igual en `accordion-item`, `block-item`, `fs-item`.

```css
.item-highlight {
  animation: item-highlight-pulse 2s ease-out;
}
@keyframes item-highlight-pulse {
  0%   { box-shadow: 0 0 0 3px var(--accent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
```

**Pendiente (8.8):** `.item-stops` / `.item-stop` (contenedor y cada hijo de una colección resuelta) todavía no tienen estilo propio.

---

## 8. Pendientes y Bugs Conocidos

Registro consolidado de todo lo detectado durante la auditoría.

### 8.1 CTA de WhatsApp — ✅ RESUELTO

**Estado anterior:** `cta.js` buscaba en `social.json` un campo `item.url` para construir el link de WhatsApp. Ese campo no existía en el contrato de `social.json` (solo tiene `id/icon/source/target/color`), así que la función siempre retornaba cadena vacía.

**Resolución:** `resolveSocialChannel()` (nuevo, en `helpers.js`) unifica la resolución de WhatsApp entre CTA de item y dock flotante — ambos arman el link desde `config.business.whatsapp`, ninguno depende de `social.json.url`. Confirmado contra `services.json` (ids `web`, `catalogo`, `source: "social", target: "whatsapp"`).

### 8.2 split.js — implementación parcial de media

**`[PENDIENTE]`** El contrato `model.json` declara `media.source` con valores `section | image | video | pdf | url`. En la última versión confirmada, `split.js` solo resolvía imágenes, sin usar `resolverMedia()` de `main.js`. El equipo reporta cambios propios sobre `contentWidth` en `split.js` — no auditados contra código real en este corte.

### 8.3 Doble sistema de carga de CSS de layout

**`[PENDIENTE]`** `router.js` precarga `assets/core/{layout}.css` antes de renderizar. `layout.js` también carga el mismo CSS internamente vía `loadCSS()`. Ambos evitan duplicados, así que no rompe nada, pero hay dos fuentes de verdad para la misma responsabilidad.

### 8.4 resolveSectionBackground — función stub

**`[PENDIENTE]`** Devuelve siempre el mismo objeto fijo, sin leer nada de `data` ni `config`:
```js
{ hasBackground: true, styleAttr: '', backgroundClass: 'section-background' }
```
Toda la resolución real de fondo ocurre por cascada pura en CSS (`--section-bg-image → --global-bg-image → none`). La función no aporta lógica hoy — queda pendiente decidir si se completa o se elimina.

### 8.5 resolveContentWidth — implementación duplicada

**`[PENDIENTE]`** `layout.js` tiene su propia función interna `resolveContentWidth()` con una expresión regular para detectar números sin unidad, en vez de delegar a `window.resolveSectionWidth()` de `helpers.js`, que hace exactamente lo mismo. Dos implementaciones idénticas conviviendo.

### 8.6 data-module en wrapSection

**`[PENDIENTE]`** El CSS de cada módulo usa `.page-section` como selector raíz — sin scope adicional por módulo. `wrapSection()` no agrega ningún `data-module`, por lo que el único aislamiento real hoy es el `id` asignado por `setup.after()`. Requeriría pasar `key` desde el módulo JS hasta `window.render(data, config, key)`.

### 8.7 Firma del renderer — config nunca usado

**`[PENDIENTE, no bloqueante]`** Confirmado en los tres renderers estables: `config` se recibe y nunca se usa dentro de la función. Ver 5.1. No se actúa sobre esto en este corte — candidato documentado para simplificar la firma a `renderer(data, control)` en otra sesión, junto con la línea de invocación en `renderLayout()`.

### 8.8 CSS de colecciones — pendiente

**`[PENDIENTE]`** `.item-stops` / `.item-stop` no tienen ningún estilo definido todavía — se renderizan como texto plano sin tratamiento visual.

### 8.9 Interacción "seleccionar hijo de una colección" — sin definir

**`[SIN DEFINIR]`** Se discutió la posibilidad de que, al hacer click en un elemento de `.item-stops` (ej. un paradero dentro de una ruta), el detalle visible de la entidad padre cambie para mostrar los datos de ese hijo. No se definió el mecanismo de interacción (panel fijo vs. expansión in-place, reemplazo vs. convivencia) ni se implementó nada. Queda abierto explícitamente — no debe inventarse comportamiento sin esta definición previa.

### 8.10 query (búsqueda inversa) — reservado en contrato, no implementado

**`[RESERVADO, no implementado]`** Ver 4.2 y 13.3. `model.json` ya documenta el campo; `resolveItems()` no lo resuelve todavía.

### 8.11 Resumen tabular

| Elemento | Estado | Nota |
|---|---|---|
| CTA WhatsApp (`cta.js`) | ✅ Resuelto | `resolveSocialChannel()` unificado — ver 8.1 |
| `split.js` — media | 🟡 Pendiente, sin auditar | Ver 8.2 |
| Carga de CSS de layout | 🟡 Pendiente | Duplicada entre `router.js` y `layout.js` — inofensivo pero redundante |
| `resolveSectionBackground()` | 🟡 Pendiente | Stub sin lógica real — el fondo se resuelve por CSS puro |
| `resolveContentWidth()` | 🟡 Pendiente | Duplica `resolveSectionWidth()` de `helpers.js` |
| `data-module` en `wrapSection` | 🟡 Pendiente | CSS de módulo sin scope propio más allá del `id` |
| Firma `renderer(data, config, control)` | 🟡 Candidato a simplificar | `config` confirmado sin uso en los 3 renderers estables |
| CSS de `.item-stops` | 🟡 Pendiente | Sin estilo definido — ver 8.8 |
| Interacción de selección de hijo de colección | ⚪ Sin definir | Ver 8.9 — requiere decisión de UX antes de programar |
| `query` (búsqueda inversa) | ⚪ Reservado, no implementado | Ver 13.3 |

---

## 9. Estado de Módulos Estables

`hero`, `about` y `services` fueron auditados contra el contrato `model.json` y el core. Siguen el patrón estándar de módulo JS:

```js
window.load = async function (config, key) {
  const root = document.getElementById('app');
  if (!root) return;
  const data = await window.cargarJSON(`data/${key}.json`) || {};
  const html = await window.renderLayout(data, config);
  root.innerHTML = html;
  if (window.setup?.after) await window.setup.after(data, config);
};

window.setup = {
  after: async function (data, config) {
    const section = document.querySelector('#app section');
    if (!section) return;
    section.id = '{key}';
    const dm = getComputedStyle(section).getPropertyValue('--dark-mode').trim();
    if (dm === '1') section.setAttribute('data-dark', '1');
  }
};
```

| Elemento | Estado | Nota |
|---|---|---|
| `hero` — JS/CSS | ✅ Confirmado | Sigue el patrón estándar. Ver nota de CSS muerto en 9.1. CTA de items migrados a `source: "passenger"` / `source: "contact"`, sin campo `type` colgado |
| `about` — JS/CSS | ✅ Confirmado | Sin observaciones — cumple el contrato completo |
| `services` — JSON (CTA y floating) | ✅ Resuelto | CTA de item ya incluyen `source`; `floating` ya usa formato `{direction, items:[{source, target}]}`. CTAs de WhatsApp (`web`, `catalogo`) ahora resuelven de verdad — ver 8.1 |

### 9.1 Nota — CSS muerto

`.section-subtitle` se estiliza en `hero.css` y `services.css`, pero `renderBase()` nunca genera ese elemento — solo emite `.section-eyebrow`, `.section-title`, `.section-intro` y el CTA. Esas reglas CSS no tienen ningún efecto hoy; son deuda de una versión anterior del contrato en la que existían `eyebrow` y `subtitle` como campos separados.

### 9.2 passenger — nuevo módulo, primer consumidor del contrato v2

Proyecto Mi Ruta. Sigue el patrón estándar de módulo (idéntico a `services.js`, solo cambia `section.id = 'passenger'`). `passenger.json` referencia `rutas.json` mediante referencia pura (sin `id` en el item declarado); cada ruta resuelta trae su propia colección de paraderos vía `_children` (la ruta sí tiene `id` propio, más `source: "paraderos"` y `targets`).

Probado end-to-end con datos reales (`rutas.json` + `paraderos.json`, 10 paraderos genéricos):

- `map-centro` → 5 paraderos (`p01, p02, p05, p07, p08`)
- `jm-centro` → 4 paraderos, comparte `p07, p08` con `map-centro` (tramo final común hacia el centro)
- `map-daule` → 3 paraderos, comparte `p01, p02` con las rutas que parten de Mapasingue
- `map-alborada` → 3 paraderos, mismo patrón de overlap

No se considera "estable" en el mismo sentido que `hero`/`about`/`services` porque le falta CSS propio para `.item-stops` (8.8) y la interacción de selección de hijo (8.9) sigue sin definir. `passenger.css` existe pero es un placeholder sin identidad visual propia (sin fondo, ancho de módulo ajustado a `78%`).

---

## 10. Módulos en Reescritura — Fuera de Este Corte

`contact.js` y `location.js` están siendo actualizados activamente. El código auditado corresponde a una versión previa y no se evalúa contra el contrato vigente.

- No exponen `window.load` — el router actual no puede invocarlos vía navegación estándar.
- Arman el `<section>` manualmente en vez de pasar por `layout.js / buildLayoutControl() / wrapSection()`.
- `location.js` expone `window.renderLocationPanel(config)`, que sí seguía la convención `render{Capitalize}Panel` documentada en 5.5 — punto de partida útil para la reescritura.

Se retoma la auditoría de estos dos módulos cuando exista una versión nueva estable.

---

## 11. Reglas de Oro

1. El módulo CSS domina definiendo `--module-content-width` en `.page-section`
2. El JS inyecta fallbacks, nunca valores fijos
3. `helpers.js` no inyecta `--section-content-width` — es responsabilidad exclusiva de `layout.js`
4. `!important` en variables CSS no funciona como override — el mecanismo real es herencia y especificidad
5. El inline style siempre gana sobre CSS — por eso el fallback va en el inline, no en una regla de clase
6. Ningún módulo CSS pone `justify-content` en `.layout-content` — esa responsabilidad es de `valign` vía `layout.css`
7. `data-X` en HTML no alimenta `var(--X)` por sí solo — el puente HTML→CSS requiere estilo inline (`style="--X: valor"`)
8. El módulo CSS usa `.page-section` como selector raíz, nunca `#id` (pendiente: `data-module`, ver 8.6)
9. El renderer nunca genera `<section>` — es responsabilidad exclusiva de `layout.js`
10. El renderer nunca llama `resolveItems()` — los items llegan ya resueltos desde `layout.js`
11. Sin valores hardcodeados: rutas de imagen, colores, nombres de clase de layout — todo viene de JSON de configuración o de variables CSS
12. **`cta` / `floating.items` / `media` mantienen `target` singular a propósito** — no se unifican a `targets[]` como `items[]`, porque describen un único destino por naturaleza, no una colección
13. **Ningún cambio de contrato en `items[]` es retrocompatible.** El resolver no mantiene fallback a `target` singular — un item con el formato viejo no resuelve, y falla en silencio (sin excepción visible). Decisión consciente para no sostener dos contratos válidos en simultáneo (ver 13.2)

---

## 12. Glosario de Contrato source / target

| Contexto | source | target(s) |
|---|---|---|
| CTA externo | `"url"` | recurso externo (http, pdf, imagen) |
| CTA WhatsApp | `"social"` | `"whatsapp"` |
| CTA navegación interna | key de sección | id opcional dentro de esa sección |
| `floating.items` | siempre `"social"` | id del item en `social.json` (singular) |
| `media` | `"section"` \| `"image"` \| `"video"` \| `"pdf"` \| `"url"` | key de sección \| path \| url (singular) |
| `items[]` — referencia pura | nombre del JSON externo | `targets: [id]` — un solo elemento, sin `id` propio en el item declarado |
| `items[]` — colección | nombre del JSON externo | `targets: [id, id, ...]` — el item declarado SÍ tiene `id` propio, se resuelve en `_children` |

---

## 13. Sistema de Referencias v2 — Nota Operativa

### 13.1 Qué cambió, en una frase

`items[]` pasó de un mecanismo de referencia simple (`target` singular) a un mecanismo unificado de referencia/colección (`targets` array + disambiguación por `id`). Ver 4.2 para el contrato y 5.2 para la implementación.

### 13.2 Riesgo de despliegue — overlayfs sin aislamiento

El core (`helpers.js` con `resolveItems()` v2 incluido) se comparte entre proyectos vía overlayfs — ver 2.3. **Al momento de este corte, los cambios existen solo en entorno local; no se han subido a producción.** Antes de desplegar:

- Debe auditarse **todo** `items[].target` (singular, dentro del array de items — no `cta`/`floating`/`media`, que no cambian) en **todos** los proyectos que comparten el core (Mi Ruta, Presencia Digital, cualquier otro).
- Un `items[].target` sin migrar no genera error — el item simplemente no se resuelve (comportamiento silencioso, confirmado en 4.2).
- Confirmado durante esta sesión: Presencia Digital tiene al menos un caso (`hero_presencia.json`) ya migrado a `targets`. Falta confirmar `about.json`/`contact.json` de ese proyecto si existen con referencias externas.
- Comando sugerido para localizar candidatos: `grep -rln '"target"[[:space:]]*:' --include="*.json" <carpeta-de-datos>` — revisar a mano cuáles son `items[].target` (migrar) vs. `cta`/`floating`/`media` (dejar igual).
- Se decidió explícitamente **no** mantener compatibilidad con el formato viejo (sin fallback `target`→`targets` en el resolver), para no sostener dos contratos válidos en simultáneo y reducir superficie de error.

### 13.3 query — diseño reservado, no implementado

Concepto: un item con `id` puede declarar `"query": "<nombre-de-catálogo>"` para que el resolver busque, en sentido inverso, qué entidades de ese catálogo tienen a este item dentro de su propio `targets`. No se guarda la relación en ambos lados — se calcula al consultar.

Caso de uso motivador: un paradero puede pertenecer a varias rutas (ej. `p07` en `map-centro` y `jm-centro`). Un QR en la calle solo puede identificar el paradero, no la ruta — la búsqueda inversa permite, al escanear, mostrar todas las rutas que pasan por ahí y dejar que la persona elija, o navegar directo si solo hay una.

**No implementado en `resolveItems()` a la fecha de este corte.** Documentado en `model.json` como contrato reservado para evitar que se use antes de tener resolver real, y para no perder el diseño acordado entre sesiones de trabajo.

---
