# Plan para Corregir Problemas Bloqueantes

## Problema 30: getFirstEnabled() no está expuesto en Router

### Ubicación: assets/js/router.js
- **Problema**: La función `getFirstEnabled()` está definida como privada dentro del IIFE de `router.js` pero no está incluida en el objeto público retornado. El listener de `sectionChanged` en `main.js` intenta llamarla como función global, causando un `ReferenceError`.
- **Efecto**: El dock no se actualiza en toda la sesión y `abrirServicioPendiente()` nunca se ejecuta.
- **Solución**: 
  1. Exponer `getFirstEnabled` en el API público de Router
  2. Actualizar la llamada en main.js para usar el método expuesto

### Cambios necesarios:

**En assets/js/router.js:**
Agregar `getFirstEnabled` al objeto retornado:
```javascript
// --------------------------------------------------------------------------
// API PÚBLICA
// --------------------------------------------------------------------------
return {
  init,
  navigate,
  render,
  isEnabled,
  getFirstEnabled  // ← AGREGAR ESTA LÍNEA
};
```

**En assets/js/main.js (línea 514):**
Cambiar:
```javascript
_activeSection = (key === getFirstEnabled()) ? null : key;
```
Por:
```javascript
// Sincroniza _activeSection en TODOS los caminos de navegación
// (clic en menú, CTA interna Y botón atrás/adelante → popstate).
_activeSection = (key === Router.getFirstEnabled()) ? null : key;
```

## Problema 31: Falta de CSS para .accordion-members

### Ubicación: assets/core/accordion.js (línea 151) y archivos CSS relacionados
- **Problema**: `accordion.js` cambió de usar `buildCTAList()` a `buildMembersList()` pero no existe CSS para la clase `.accordion-members` que genera.
- **Efecto**: La lista de paraderos bajo cada ruta en `#rutas` aparece sin estilo, quedando huérfanas las reglas en `rutas.css` que esperaban esta estructura.

### Solución necesaria:
Agregar reglas CSS para `.accordion-members` y elementos relacionados en `assets/core/accordion.css`.

### CSS recomendado para agregar a accordion.css:
```css
/* ==========================================================================
   LISTA DE MIEMBROS (usada en acordeón para sub-items como paraderos)
   ========================================================================== */
.accordion-members {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
}

.accordion-members li {
  margin-bottom: 0.75rem;
}

.accordion-members a {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--layout-bg);
  border: 1px solid var(--layout-border);
  border-radius: 6px;
  color: var(--layout-text);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.accordion-members a:hover {
  background: var(--layout-icon-bg);
  border-color: var(--accent);
  color: var(--accent);
}

/* Opcional: estilo para estado activo si se necesita */
.accordion-members a.active,
.accordion-members a[aria-current="page"] {
  background: var(--accent);
  color: var(--text-light);
}
```

## Notas adicionales sobre otros puntos del plan:

- **Punto 18**: El comentario de `setup.before` fue eliminado correctamente (era fantasma), pero se llevó consigo la documentación real de `setup.after`. Se debería restaurar solo la línea de `setup.after` en el comentario de cabecera de router.js.
- **Punto 33**: `resaltarSeccionActiva()` agrega clase `.active` a los links del menú pero no existe CSS para esta clase. Se debería agregar regla correspondiente en main.css o similar.
- **Puntos pendientes (8, 9, 11, 14, 16, 19, 23, 25, 27, 28)**: Requieren análisis adicional y pueden abordarse en iteraciones futuras después de resolver los bloqueantes actuales.

## Validación esperada tras aplicar estos fixes:
1. No hay más `ReferenceError: getFirstEnabled is not defined` en consola
2. El dock se actualiza correctamente al cambiar de sección (por menú, CTA interna o botones atrás/adelante)
3. `abrirServicioPendiente()` se ejecuta cuando hay un serviceId pendiente
4. La lista de paraderos en las rutas aparece con estilo adecuado (similar a otras listas en el acordeón)