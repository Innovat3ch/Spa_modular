// ==========================================================================
// router.js — Orquestador SPA Modular v2.0 (Automatizado para Layouts)
// Naming: siempre minúsculas, sin espacios — router.js
// REGLA: si show !== true, la sección NO existe. No se consulta JSON.
// Contrato del módulo: window.load(config, key) → inyecta HTML al DOM
// ==========================================================================

window.Router = (function () {

  // --------------------------------------------------------------------------
  // CONFIG GLOBAL (inyectada desde main.js)
  // --------------------------------------------------------------------------
  let CONFIG = null;

  // cache de módulos cargados
  const moduleCache = {};

  // contenedor principal DOM
  const ROOT_ID = "app";

  // --------------------------------------------------------------------------
  // UTIL: root DOM
  // --------------------------------------------------------------------------
  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  // --------------------------------------------------------------------------
  // UTIL: nav DOM
  // --------------------------------------------------------------------------
  function getNav() {
    return document.querySelector('nav');
  }

  // --------------------------------------------------------------------------
  // UTIL: detectar si el primer key con show:true es landing (in_menu:false)
  // Regla: primer key con show:true e in_menu:false → oculta nav
  // --------------------------------------------------------------------------
  function _isLandingKey(key) {
    const nav = CONFIG?.navigation || {};
    for (const [k, val] of Object.entries(nav)) {
      if (val.show !== true) continue;
      return k === key && val.in_menu === false;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // UTIL: toggle nav según sección
  // --------------------------------------------------------------------------
  function _toggleNav(key) {
    const nav = getNav();
    if (!nav) return;

    if (_isLandingKey(key)) {
      nav.style.display = 'none';
    } else {
      nav.style.display = '';
    }
  }

  // --------------------------------------------------------------------------
  // UTIL: inyectar CSS del módulo y su layout dinámico si aplica
  // --------------------------------------------------------------------------
  function loadModuleCSS(key, layout) {
    // Limpia las hojas de estilo inyectadas por módulos anteriores
    document.querySelectorAll('link[id^="css-module-"]').forEach(link => {
      link.remove();
    });

    // 1. Inyectar el CSS base de la sección (ej: assets/css/about.css)
    _injectLink(`css-module-${key}`, `/assets/css/${key}.css`);

    // 2. AUTOMATIZACIÓN: Si el JSON define un layout con CSS propio en assets/core/, lo inyecta al vuelo.
    // - 'default' y 'standard' no tienen CSS propio (son aliases resueltos por layout.js en runtime).
    // - 'fullscreen', 'split-left', 'split-right' viven en layout.css (ya cargado de forma global).
    // - 'blocks' y 'accordion' sí tienen su propio CSS en assets/core/.
    const LAYOUTS_WITH_CORE_CSS = ['blocks', 'accordion'];
    if (layout && LAYOUTS_WITH_CORE_CSS.includes(layout)) {
      _injectLink(`css-module-layout-${layout}`, `/assets/core/${layout}.css`);
    }
  }

  // Helper interno para evitar duplicación de tags link en el head
  function _injectLink(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  // --------------------------------------------------------------------------
  // UTIL: cargar JSON de la seccion actual para eventos/dock
  // --------------------------------------------------------------------------
  async function loadSectionData(key) {
    return window.cargarJSON(`/data/${key}.json`);
  }

  // --------------------------------------------------------------------------
  // UTIL: verificar si una sección está habilitada
  // REGLA ESTRÍCTA: solo config_web.json decide. No se consulta JSON.
  // --------------------------------------------------------------------------
  function isEnabled(key) {
    return CONFIG?.navigation?.[key]?.show === true;
  }

  // --------------------------------------------------------------------------
  // UTIL: obtener primera sección habilitada
  // --------------------------------------------------------------------------
  function getFirstEnabled() {
    return Object.entries(CONFIG?.navigation || {})
      .find(([k, v]) => v?.show === true)?.[0] || 'hero';
  }

  // --------------------------------------------------------------------------
  // UTIL: cargar módulo JS dinámicamente
  // Reusa window.loadScript (definido en main.js) para inyectar en <head> y
  // evitar duplicados, en vez de crear un tercer cargador que metía en <body>.
  // --------------------------------------------------------------------------
  async function loadModule(key) {

    if (moduleCache[key]) return moduleCache[key];

    try {
      await window.loadScript(`/assets/js/${key}.js`);

      // Capturar window.load inmediatamente tras el onload del script.
      // CRÍTICO: window.load es sobreescrito en cada carga de módulo,
      // por eso se captura aquí y se guarda en caché bajo la key del módulo.
      const module = window.load;

      if (typeof module !== 'function') {
        console.warn(`[Router] Módulo ${key} no expone window.load como función`);
        return null;
      }

      moduleCache[key] = module;
      return module;

    } catch (err) {
      console.error(`[Router] Error cargando módulo ${key}`, err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // RENDER CORE
  // --------------------------------------------------------------------------
  async function render(key) {

    const root = getRoot();

    if (!root) {
      console.error("[Router] #app no existe");
      return;
    }

    // ----------------------------------------------------------------------
    // VALIDACIÓN ESTRÍCTA: show debe ser EXACTAMENTE true
    // ----------------------------------------------------------------------
    if (!isEnabled(key)) {
      console.warn(`[Router] "${key}" deshabilitado (show≠true). Redirigiendo...`);
      return navigate(getFirstEnabled());
    }

    // ----------------------------------------------------------------------
    // OPTIMIZACIÓN LAZY: Leer data del JSON al inicio para extraer el layout
    // ----------------------------------------------------------------------
    const sectionData = await loadSectionData(key);
    const currentLayout = sectionData?.layout || null;

    // ----------------------------------------------------------------------
    // CARGAR MÓDULO JS
    // ----------------------------------------------------------------------
    const module = await loadModule(key);

    if (!module) {
      console.warn(`[Router] Módulo inválido: ${key}`);
      return;
    }

    // ----------------------------------------------------------------------
    // TOGGLE NAV — oculta si es landing, muestra si no
    // ----------------------------------------------------------------------
    _toggleNav(key);

    // ----------------------------------------------------------------------
    // CARGAR CSS DEL MÓDULO + LAYOUT DINÁMICO
    // ----------------------------------------------------------------------
    loadModuleCSS(key, currentLayout);

    // ----------------------------------------------------------------------
    // LIMPIAR DOM
    // ----------------------------------------------------------------------
    root.innerHTML = '<div class="section-loading">Cargando...</div>';

    // ----------------------------------------------------------------------
    // EJECUTAR window.load(config, key)
    // El módulo se encarga de inyectar al DOM y ejecutar setup.before/after
    // ----------------------------------------------------------------------
    let renderOk = true;
    try {
      await module(CONFIG, key);
      // Módulo async — ya escribió al DOM directamente

    } catch (err) {
      console.error(`[Router] Error renderizando ${key}`, err);
      root.innerHTML = '<div class="section-loading">Error cargando la sección.</div>';
      renderOk = false;
    }

    // ----------------------------------------------------------------------
    // EFECTOS DE ÉXITO — SOLO si el render no falló.
    // Antes la URL y el evento sectionChanged se disparaban igual en fallo,
    // dejando la app en estado inconsistente (URL cambiada sin contenido).
    // ----------------------------------------------------------------------
    if (!renderOk) return;

    // ----------------------------------------------------------------------
    // ACTUALIZAR URL
    // ----------------------------------------------------------------------
    history.pushState({ key }, "", key === getFirstEnabled() ? '#' : `#${key}`);

    // DISPARAR EVENTO CUSTOM PARA QUE MAIN.JS ACTUALICE EL DOCK
    // Reutiliza sectionData precargada arriba para evitar un segundo fetch innecesario
    // ----------------------------------------------------------------------
    const event = new CustomEvent('sectionChanged', { detail: { key, data: sectionData } });
    document.dispatchEvent(event);
  }

  // --------------------------------------------------------------------------
  // INIT ROUTER
  // --------------------------------------------------------------------------
  function init(config) {
    CONFIG = config;
    console.log("[Router] inicializado v2.0");
  }

  // --------------------------------------------------------------------------
  // NAVIGATE PUBLIC API
  // --------------------------------------------------------------------------
  function navigate(key) {
    return render(key);
  }

  // --------------------------------------------------------------------------
  // BACK/FORWARD NAVIGATION
  // popstate NO toca _activeSection: ese estado vive en main.js y se sincroniza
  // de forma centralizada vía el evento 'sectionChanged' (que render() dispara
  // en todos los caminos, incluido este). Así no hay estado duplicado ni
  // doble-disparo entre router.js y main.js.
  // --------------------------------------------------------------------------
  window.addEventListener("popstate", (e) => {
    const key = e.state?.key;

    if (!key || !isEnabled(key)) {
      render(getFirstEnabled());
      return;
    }

    render(key);
  });

  // --------------------------------------------------------------------------
  // API PÚBLICA
  // --------------------------------------------------------------------------
return {
     init,
     navigate,
     render,
     isEnabled,
     getFirstEnabled
   };

})();
