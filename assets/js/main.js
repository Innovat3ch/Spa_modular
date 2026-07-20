// ==========================================================================
// CONFIGURACIÓN BASE / PLACEHOLDERS GLOBALES
// ==========================================================================

const DEFAULT_CONFIG = {
  appearance: {
    primary_color: '#c8412a',
    secondary_color: '#0d0d0d',
    background_color: '#f5f2ec',
    surface_color: '#ffffff',
    text_primary: '#333333',
    text_title: '#0d0d0d',
    text_light: '#ffffff',
    font_family: 'Bebas Neue',
    font_secondary: 'DM Sans',
    logo_path: '/assets/images/logo.png',
    favicon_path: '/assets/images/logo.png'
  },
  business: {
    brand_name: 'Presencia Digital',
    tagline: ''
  }
};

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================

let _config = null;
let _nav = null;
let _activeSection = null;
let _pendingServiceId = null;

// ==========================================================================
// CONFIG GETTER — único punto de acceso global a config.
// Excepción deliberada: leafs de contenido (cta.js → resolveSocialChannel)
// leen config acá en vez de recibirlo como parámetro. El resto de la cadena
// (layout.js, resolveSectionStyle, resolverMedia, social.js) sigue con
// paso explícito.
// ==========================================================================

window.getConfig = function() {
  return _config;
};

// ==========================================================================
// HELPERS (cargados desde assets/core/helpers.js)
// ==========================================================================

function obtenerValorConfig(real, fallback) {
  if (real == null || String(real).trim() === '') return fallback;
  return real;
}

// ==========================================================================
// SCRIPT LOADER — unificado para cargar cores y módulos bajo demanda
// ==========================================================================

window.loadScript = function(src) {
  return new Promise((resolve, reject) => {
    const normalizedSrc = window.resolveAssetUrl ? window.resolveAssetUrl(src) : src;
    const existing = document.querySelector(`script[src="${normalizedSrc}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = normalizedSrc;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

window.loadModuleScript = function(key) {
  return window.loadScript(`/assets/js/${key}.js`);
};

// ==========================================================================
// GOOGLE FONTS DINÁMICO
// ==========================================================================

function cargarFuentes(config) {
  // Guarda de doble ejecución: DOMContentLoaded no debería disparar dos
  // veces, pero por si el módulo se recarga o se llama en otro lado.
  if (cargarFuentes._done) return;
  cargarFuentes._done = true;

  const app = {
    ...DEFAULT_CONFIG.appearance,
    ...(config.appearance || {})
  };

  const fuentes = [app.font_family, app.font_secondary]
    .filter(Boolean)
    .map(f => f.trim().replace(/'/g, ''))
    .filter((f, i, arr) => arr.indexOf(f) === i);

  if (!fuentes.length) return;

  const query = fuentes
    .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;700`)
    .join('&');

  // Preconnect completo: el CSS de Google y el host de las fuentes (gstatic).
  ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach(href => {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = href;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
  });

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  document.head.appendChild(link);
}

// ==========================================================================
// CSS VARIABLES
// ==========================================================================

function aplicarVariablesCSS(config) {
  const root = document.documentElement;
  const app = { ...DEFAULT_CONFIG.appearance, ...(config.appearance || {}) };
  const map = {
    primary_color: '--accent',
    secondary_color: '--ink',
    background_color: '--paper',
    surface_color: '--surface',
    text_primary: '--text-main',
    text_title: '--text-title',
    text_light: '--text-light',
    font_family: '--font-family',
    font_secondary: '--font-secondary'
  };

  Object.entries(map).forEach(([key, cssVar]) => {
    let value = obtenerValorConfig(app[key], DEFAULT_CONFIG.appearance[key]);
    if (!value) return;
    root.style.setProperty(cssVar, value);
  });

  // ==========================================================================
  // FONDOS GLOBALES — Disponibles para que layout.css o los módulos los usen
  // ==========================================================================
  
  const bgImage = app.background_image;
  const bgMobile = app.background_mobile;

  if (bgImage) {
    const path = window.resolveAssetUrl ? window.resolveAssetUrl(bgImage) : bgImage;
    root.style.setProperty('--global-bg-image', `url('${path}')`);
  }

  if (bgMobile) {
    const path = window.resolveAssetUrl ? window.resolveAssetUrl(bgMobile) : bgMobile;
    root.style.setProperty('--global-bg-mobile', `url('${path}')`);
  }
}

// ==========================================================================
// BRANDING
// ==========================================================================

function configurarBranding(config) {
  const biz = { ...DEFAULT_CONFIG.business, ...(config.business || {}) };
  const app = { ...DEFAULT_CONFIG.appearance, ...(config.appearance || {}) };

  document.title = biz.brand_name;

  const favicon = document.getElementById('favicon-link');
  if (favicon) favicon.href = window.resolveAssetUrl
    ? window.resolveAssetUrl(app.favicon_path || DEFAULT_CONFIG.appearance.favicon_path)
    : (app.favicon_path || DEFAULT_CONFIG.appearance.favicon_path);

  const logo = document.getElementById('nav-logo-img');
  if (logo) {
    const logoPath = window.resolveAssetUrl
      ? window.resolveAssetUrl(app.logo_path || DEFAULT_CONFIG.appearance.logo_path)
      : (app.logo_path || DEFAULT_CONFIG.appearance.logo_path);
    logo.alt = biz.brand_name;
    // Si la imagen falla, ocultamos el <img> y dejamos visible el texto de marca.
    logo.onerror = () => {
      logo.style.display = 'none';
      logo.onerror = null;
    };
    logo.src = logoPath;
    logo.style.display = 'block';
  }

  const title = document.getElementById('nav-logo-text');
  if (title) title.innerText = biz.brand_name;

  const lema = document.getElementById('nav-lema-text');
  if (lema) {
    lema.innerText = biz.tagline || '';
    lema.hidden = !biz.tagline;
    lema.style.removeProperty('display');
  }
}

// ==========================================================================
// MENÚ
// ==========================================================================

function construirMenu() {
  const container = document.getElementById('menu-dinamico');
  if (!container) return;
  container.innerHTML = '';

  for (const [key, val] of Object.entries(_nav)) {
    if (!val.show || !val.in_menu || !val.label) continue;
    const a = document.createElement('a');
    a.href = `#${key}`;
    a.innerText = val.label;
    a.dataset.section = key;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      cargarSeccion(key);
      closeNavMenu();
    });
    container.appendChild(a);
  }

  resaltarSeccionActiva(_activeSection);
}

function resaltarSeccionActiva(key) {
  const container = document.getElementById('menu-dinamico');
  if (!container) return;
  container.querySelectorAll('a[data-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.section === key);
  });
}

function closeNavMenu() {
  const nav = document.querySelector('nav');
  const toggle = document.getElementById('nav-toggle');
  if (nav) nav.classList.remove('nav-open');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  }
}

// ==========================================================================
// ACCORDION EXCLUSIVE
// ==========================================================================

function configurarAccordionExclusive() {
  if (configurarAccordionExclusive._init) return;
  configurarAccordionExclusive._init = true;

  function getColumnCount(grid) {
    if (window.matchMedia('(max-width: 768px)').matches) return 1;
    const raw = grid?.style?.getPropertyValue('--columns')?.trim()
      || getComputedStyle(grid)?.getPropertyValue('--columns')?.trim();
    const columns = Number(raw || 1);
    return Number.isFinite(columns) && columns > 0 ? columns : 1;
  }

  function getGridItems(grid) {
    if (!grid) return [];
    return [...grid.children].filter(node => node.classList?.contains('accordion-item'));
  }

  function getItemColumn(item, grid = null) {
    const currentGrid = grid || item.closest('.section-accordion');
    if (!currentGrid) return 0;
    const columns = getColumnCount(currentGrid);
    const items = getGridItems(currentGrid);
    const index = items.indexOf(item);
    return index >= 0 ? index % columns : 0;
  }

  function closeOtherItems(item) {
    const grid = item.closest('.section-accordion');
    if (!grid) return;
    const activeColumn = getItemColumn(item, grid);

    grid.querySelectorAll('.accordion-item[open]').forEach(other => {
      if (other === item) return;
      if (getItemColumn(other, grid) === activeColumn) {
        other.removeAttribute('open');
      }
    });
  }

  function normalizeAccordionOpenState(grid) {
    if (!grid) return;
    const columns = getColumnCount(grid);
    const items = getGridItems(grid);

    for (let c = 0; c < columns; c += 1) {
      const columnItems = items.filter((_, index) => index % columns === c);
      if (!columnItems.length) continue;

      const openItems = columnItems.filter(item => item.open);
      if (openItems.length > 1) {
        openItems.slice(1).forEach(item => item.removeAttribute('open'));
      } else if (openItems.length === 0) {
        columnItems[0].setAttribute('open', '');
      }
    }
  }

  function bindItem(item) {
    if (item.dataset.exclusiveBound) return;
    item.dataset.exclusiveBound = '1';
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      closeOtherItems(item);
    });
  }

  document.querySelectorAll('.accordion-item').forEach(bindItem);
  document.querySelectorAll('.section-accordion').forEach(normalizeAccordionOpenState);

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.accordion-item:not([data-exclusive-bound])').forEach(bindItem);
    requestAnimationFrame(() => {
      document.querySelectorAll('.section-accordion').forEach(normalizeAccordionOpenState);
    });
  });

  const root = document.getElementById('app');
  if (root) observer.observe(root, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.section-accordion').forEach(normalizeAccordionOpenState);
  });
}

// ==========================================================================
// NAV TOGGLE
// ==========================================================================

function configurarNavToggle() {
  const nav = document.querySelector('nav');
  const toggle = document.getElementById('nav-toggle');
  if (!nav || !toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('nav-open')) return;
    const target = event.target;
    if (target === toggle || nav.contains(target)) return;
    closeNavMenu();
  });
}

// ==========================================================================
// DOCK DINÁMICO — delegado a social.js
// ==========================================================================

// ==========================================================================
// MEDIA RESOLVER
// ==========================================================================

window.resolverMedia = async function(media, config) {
  const source = media?.source;
  const target = media?.target;

  if (!source) return null;

  if (source === 'section') {
    if (!target) return null;

    const isEnabled = window.Router?.isEnabled?.(target);
    if (isEnabled === false) {
      console.warn(`[resolverMedia] "${target}" deshabilitado. Media ignorado.`);
      return null;
    }

    const cssId = `css-module-${target}`;
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = `/assets/css/${target}.css`;
      document.head.appendChild(link);
    }

    const panelName = `render${window.capitalize(target)}Panel`;
    let panelFn = window[panelName];
    if (typeof panelFn !== 'function') {
      try {
        await window.loadModuleScript(target);
      } catch (err) {
        console.warn(`[resolverMedia] Error cargando módulo ${target}`, err);
        return null;
      }
      panelFn = window[panelName];
      if (typeof panelFn !== 'function') {
        console.warn(`[resolverMedia] No existe ${panelName} después de cargar`);
        return null;
      }
    }

    return await panelFn(config, null);
  }

  if (source === 'image') {
    if (!target) return null;
    return { html: `<img src="${window.escapeHTML(target)}" alt="" class="media-image" loading="lazy">` };
  }

  if (source === 'video') {
    if (!target) return null;
    return { html: `<video src="${window.escapeHTML(target)}" controls playsinline class="media-video"></video>` };
  }

  if (source === 'pdf') {
    if (!target) return null;
    return { html: `<iframe src="${window.escapeHTML(target)}" class="media-iframe" loading="lazy"></iframe>` };
  }

  if (source === 'url') {
    if (!target) return null;
    return { html: `<iframe src="${window.escapeHTML(target)}" class="media-iframe" loading="lazy" allowfullscreen></iframe>` };
  }

  console.warn(`[resolverMedia] Fuente desconocida: ${source}`);
  return null;
};

// ==========================================================================
// ROUTER
// ==========================================================================

async function cargarSeccion(key, serviceId = null) {
  if (_activeSection === key && !serviceId) return;
  _activeSection = key === 'hero' ? null : key;
  if (serviceId) {
    _pendingServiceId = serviceId;
    sessionStorage.setItem('pendingServiceId', serviceId);
  }
  await Router.navigate(key);
}

function abrirServicioPendiente() {
  if (!_pendingServiceId) return;
  window.openItem?.(_pendingServiceId);
  _pendingServiceId = null;
  sessionStorage.removeItem('pendingServiceId');
}

// ==========================================================================
// INIT
// ==========================================================================

// ==========================================================================
// PRELOAD: Cargar fachada de layouts y helpers esenciales
// ==========================================================================

async function preloadLayoutSystem() {
  // Cargar helpers si no están disponibles
  if (typeof window.renderBase !== 'function') {
    await window.loadScript('/assets/core/helpers.js');
  }
  // Cargar CTA builder
  if (typeof window.buildCTA !== 'function') {
    await window.loadScript('/assets/core/cta.js');
  }
  // Cargar fachada de layouts
  if (typeof window.renderLayout !== 'function') {
    await window.loadScript('/assets/core/layout.js');
  }
  // Cargar dock social
  if (typeof window.actualizarDock !== 'function') {
    await window.loadScript('/assets/core/social.js');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await preloadLayoutSystem();

  let _configRaw = null;
  try {
    const res = await fetch('/config_web.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _configRaw = await res.json();
  } catch (err) {
    console.error('[main] No se pudo cargar config_web.json', err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="section-loading">Error cargando la configuración del sitio.</div>';
    }
    return;
  }

  _config = _configRaw;
  _nav = _config.navigation || {};

  cargarFuentes(_config);
  aplicarVariablesCSS(_config);
  configurarBranding(_config);
  construirMenu();
  Router.init(_config);
  configurarNavToggle();
  configurarAccordionExclusive();

  document.addEventListener('sectionChanged', async (e) => {
    const { key, data } = e.detail;
    // Sincroniza _activeSection en TODOS los caminos de navegación
    // (clic en menú, CTA interna Y botón atrás/adelante → popstate).
    _activeSection = (key === Router.getFirstEnabled()) ? null : key;
    resaltarSeccionActiva(key);
    await window.actualizarDock(data?.floating);
    abrirServicioPendiente();
  });

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-section]');
  if (!el) return;
  e.preventDefault();
  const section = el.dataset.section;
  const serviceId = el.dataset.service || null;
  await cargarSeccion(section, serviceId);
  abrirServicioPendiente();
});

const hash = window.location.hash.replace('#', '');
  const pendingFromStorage = sessionStorage.getItem('pendingServiceId');

  if (hash && _nav[hash]?.show) {
    cargarSeccion(hash);
  } else if (pendingFromStorage) {
    _pendingServiceId = pendingFromStorage;
    cargarSeccion('hero', pendingFromStorage);
  } else {
    cargarSeccion('hero');
  }
});
