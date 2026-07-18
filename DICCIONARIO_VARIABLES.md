# Variables Visuales

Este archivo sirve como diccionario rápido de variables visuales del SPA.

## Niveles

- `main.css`: tokens globales del sitio.
- `layout.css`: aplica la estructura y consume variables.
- `key.css`: capa base de layout o familia de páginas.
- `{modulo}.css`: override específico de una sección.

## Ancho

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--section-content-width-base` | `layout.css` | Ancho base de respaldo | `layout.css` |
| `--section-content-width` | `layout.js` / inline | Ancho activo del contenido | `layout.css` |
| `--module-content-width` | `key.css` o `{modulo}.css` | Override del módulo para el ancho del contenido | `layout.js` y `layout.css` |

## Fondo

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--section-bg-image` | `key.css` o `{modulo}.css` | Imagen de fondo de la sección | `layout.css` |
| `--section-bg-mobile` | `key.css` o `{modulo}.css` | Fondo específico para móvil | `layout.css` |
| `--section-bg-color` | `main.css`, `key.css` o `{modulo}.css` | Color base del fondo de sección | `layout.css` |
| `--layout-bg` | `layout.css` / dark mode | Fondo visual de superficies internas | `layout.css` y renderers |

## Color

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--accent` | `main.css` | Color principal de acento | Todo el sistema |
| `--ink` | `main.css` | Negro base | `main.css` y módulos |
| `--paper` | `main.css` | Fondo general del sitio | `main.css` |
| `--surface` | `main.css` | Fondo de tarjetas y superficies | `layout.css`, renderers |
| `--text-main` | `main.css` | Color de texto normal | Todo el sistema |
| `--text-title` | `main.css` | Color de títulos | `layout.css` |
| `--text-light` | `main.css` | Texto claro para fondos oscuros | Dark mode |
| `--layout-border` | `layout.css` | Color del borde de cards | `layout.css` y renderers |
| `--layout-icon-bg` | `layout.css` | Fondo del icono en cards | Renderers |
| `--layout-text` | `layout.css` / dark mode | Color de texto de superficies | `layout.css` |

## Tipografía

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--font-family` | `main.css` / `key.css` / `{modulo}.css` | Tipografía principal | `layout.css`, renderers |
| `--font-secondary` | `main.css` / `key.css` / `{modulo}.css` | Tipografía secundaria | `layout.css` |
| `--type-title-size` | `main.css` | Tamaño base del título | `layout.css` |
| `--type-title-size-hero` | `main.css` | Tamaño semántico para hero | Futuro uso de bosquejos |
| `--type-title-size-page` | `main.css` | Tamaño semántico para página interna | Futuro uso de bosquejos |
| `--type-title-size-section` | `main.css` | Tamaño semántico para sección interna | Futuro uso de bosquejos |
| `--type-eyebrow-size` | `main.css` | Tamaño del subtítulo/eyebrow | `layout.css` |
| `--type-intro-size` | `main.css` | Tamaño del intro | `layout.css` |
| `--type-item-title-size` | `main.css` | Tamaño del título de item | `layout.css` |
| `--type-item-summary-size` | `main.css` | Tamaño del summary de item | `layout.css` |
| `--type-item-body-size` | `main.css` | Tamaño del cuerpo de item | `layout.css` |

## Estructura

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--section-padding` | `layout.css` | Padding lateral del contenido | `layout.css` |
| `--section-gap` | `layout.css` | Separación entre bloques del layout | `layout.css` |
| `--section-content-top-gap` | `layout.css` | Separación superior del contenido | `layout.css` |
| `--section-content-top-gap-mobile` | `layout.css` | Separación superior en móvil | `layout.css` |
| `--columns` | JSON / `layout.js` | Cantidad de columnas del layout | `blocks`, `accordion` |

## Estado visual

| Variable | Nivel típico | Qué hace | Quién la consume |
|---|---|---|---|
| `--dark-mode` | `{modulo}.css` | Bandera de modo oscuro | `setup.after()` y CSS del módulo |
| `data-dark="1"` | `setup.after()` | Activa la variante oscura en la sección | `layout.css` |

## Regla práctica

- Si la variable afecta a todo el sitio, vive en `main.css`.
- Si la variable define estructura o comportamiento visual común, se resuelve en `layout.css`.
- Si la variable pertenece al esquema de una familia de páginas, documentarla como `key.css`.
- Si la variable es exclusiva de una sección, documentarla como `{modulo}.css`.
