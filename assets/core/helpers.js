// ==========================================================================
// helpers.js — Utilidades globales del sistema
// Expone: window.cargarJSON | window.escapeHTML | window.capitalize |
//         window.resolveItems | window.resolveSocialChannel |
//         window.renderBase | window.dataBusiness
// ==========================================================================

;(function() {
  'use strict';

  if (window.__helpersLoaded) return;
  window.__helpersLoaded = true;

// ==========================================================================
// RUTA BASE DE DATOS
// ==========================================================================

window.DATA_PATH = window.DATA_PATH || 'data/';

// ==========================================================================
// JSON LOADER
// ==========================================================================

window.cargarJSON = async function(path) {
  try {
    const res = await fetch(window.resolveAssetUrl ? window.resolveAssetUrl(path) : path);
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.trim() ? JSON.parse(txt) : null;
  } catch {
    return null;
  }
};

// ==========================================================================
// ESCAPE HTML
// ==========================================================================

window.escapeHTML = function(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

window.formatText = function(value) {
  if (value == null) return '';
  return window.escapeHTML(value).replace(/\r\n|\r|\n/g, '<br>');
};

// ==========================================================================
// ASSET URL RESOLVER
// Convierte rutas relativas del sitio a rutas absolutas desde la raíz web.
// Conserva URLs externas, data:, blob:, mailto:, tel:, etc.
// ==========================================================================

window.resolveAssetUrl = function(value) {
  if (value == null) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) ||
    /^(?:data|blob|mailto|tel):/i.test(raw) ||
    raw.startsWith('#')
  ) {
    return raw;
  }

  if (raw.startsWith('/')) return raw;

  try {
    const url = new URL(raw, window.location.origin + '/');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return `/${raw.replace(/^\.\/+/, '').replace(/^\/+/, '')}`;
  }
};

// ==========================================================================
// CAPITALIZE
// ==========================================================================

window.capitalize = function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ==========================================================================
// APPEARANCE
// ==========================================================================

window.resolveSectionAppearance = function(data = {}, config = {}) {
  return {
    ...(config?.appearance || {}),
    ...(data?.appearance || {})
  };
};

// ==========================================================================
// SECTION WIDTH
// ==========================================================================

window.resolveSectionWidth = function(value) {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return /^\d+(?:\.\d+)?$/.test(raw) ? `${raw}%` : raw;
};

// ==========================================================================
// SECTION STYLE
// ==========================================================================

window.resolveSectionStyle = function(data = {}, config = {}, extraStyles = []) {
  const styles = [];
  const appearance = window.resolveSectionAppearance(data, config);
  // NOTA: --section-content-width NO se inyecta aquí.
  // Es responsabilidad exclusiva de layout.js → buildLayoutControl()
  // para que el mecanismo var(--module-content-width, fallback) funcione correctamente.

  if (appearance.font_family) {
    styles.push(`--font-family: ${window.escapeHTML(appearance.font_family)}`);
  }

  if (appearance.font_secondary) {
    styles.push(`--font-secondary: ${window.escapeHTML(appearance.font_secondary)}`);
  }

  if (appearance.background_opacity != null && appearance.background_opacity !== '') {
    const opacityValue = Number(appearance.background_opacity);
    if (Number.isFinite(opacityValue)) {
      const normalized = opacityValue > 1 ? opacityValue / 100 : opacityValue;
      styles.push(`--section-bg-overlay-opacity: ${normalized}`);
    }
  }

  if (Array.isArray(extraStyles) && extraStyles.length) {
    styles.push(...extraStyles.filter(Boolean));
  }

  return styles.length ? `style="${styles.join('; ')}"` : '';
};

// ==========================================================================
// SECTION BACKGROUND
// ==========================================================================

window.resolveSectionBackground = function(data = {}, config = {}) {
  return {
    hasBackground: true,
    styleAttr: '',
    backgroundClass: 'section-background'
  };
};

// ==========================================================================
// STYLE ATTR MERGE
// ==========================================================================

window.mergeStyleAttrs = function(...attrs) {
  const styles = [];
  attrs.flat().filter(Boolean).forEach(attr => {
    const match = String(attr).match(/style="([^"]*)"/i);
    if (!match) return;
    match[1]
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(rule => styles.push(rule));
  });
  return styles.length ? `style="${styles.join('; ')}"` : '';
};

// ==========================================================================
// INSPECT LAYOUT STATE
// Devuelve el estado real que recibe el navegador para una seccion renderizada.
// Sirve para revisar align, valign, text-align y el estado de cada item.
// ==========================================================================

window.inspectLayoutState = function(sectionOrSelector = '#app section', options = {}) {
  const section = typeof sectionOrSelector === 'string'
    ? document.querySelector(sectionOrSelector)
    : sectionOrSelector;

  if (!section) return null;

  const layoutContent = section.querySelector('.layout-content');
  const sectionStyle = getComputedStyle(section);
  const layoutStyle = layoutContent ? getComputedStyle(layoutContent) : null;

  const readNode = (node) => {
    if (!node) return null;
    const cs = getComputedStyle(node);
    return {
      tag: node.tagName.toLowerCase(),
      className: node.className,
      text: (node.textContent || '').trim(),
      textAlign: cs.textAlign,
      display: cs.display,
      width: cs.width,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
      lineHeight: cs.lineHeight
    };
  };

  const itemNodes = [...section.querySelectorAll('.fs-item, .block-item, .accordion-item')];
  const items = itemNodes.map((item, index) => {
    const titleNode = item.querySelector(
      '.fs-item-title, .block-title, .accordion-title, .item-header h1, .item-header h2, .item-header h3, h1, h2, h3'
    );
    const descNode = item.querySelector(
      '.fs-item-desc, .block-desc, .accordion-description, .item-content'
    );
    const summaryNode = item.querySelector(
      '.fs-item-summary, .block-summary, .accordion-summary'
    );

    return {
      index,
      className: item.className,
      title: readNode(titleNode),
      summary: readNode(summaryNode),
      description: readNode(descNode)
    };
  });

  const state = {
    section: {
      id: section.id || '',
      className: section.className,
      dataAlign: section.getAttribute('data-align') || '',
      dataValign: section.getAttribute('data-valign') || '',
      dataTextAlign: section.getAttribute('data-text-align') || '',
      columns: section.style.getPropertyValue('--columns').trim() || '',
      sectionContentWidth: section.style.getPropertyValue('--section-content-width').trim() || '',
      moduleContentWidth: section.style.getPropertyValue('--module-content-width').trim() || '',
      computed: {
        justifyContent: sectionStyle.justifyContent,
        alignItems: sectionStyle.alignItems,
        textAlign: sectionStyle.textAlign,
        width: sectionStyle.width
      }
    },
    layoutContent: layoutStyle ? {
      textAlign: layoutStyle.textAlign,
      alignItems: layoutStyle.alignItems,
      justifyContent: layoutStyle.justifyContent,
      width: layoutStyle.width,
      display: layoutStyle.display
    } : null,
    nodes: {
      subtitle: readNode(section.querySelector('.section-eyebrow, .section-subtitle')),
      title: readNode(section.querySelector('.section-title')),
      intro: readNode(section.querySelector('.section-intro'))
    },
    items
  };

  if (options.log !== false) {
    console.log('[inspectLayoutState] state:', state);
    console.table(items.map(item => ({
      index: item.index,
      titleAlign: item.title?.textAlign || '',
      descAlign: item.description?.textAlign || '',
      title: item.title?.text || '',
      desc: item.description?.text || ''
    })));
  }

  return state;
};

// Wrapper corto para pegar directo en la consola de DevTools.
window.debugLayoutState = function(sectionOrSelector = '#app section') {
  return window.inspectLayoutState(sectionOrSelector, { log: true });
};

// ==========================================================================
// RESOLVE ITEMS v2
// Contrato unificado: siempre "targets" (array), nunca "target" singular.
//
// - Sin "id" propio  → referencia pura. Se reemplaza por completo con el
//                       item externo (comportamiento equivalente al v1,
//                       solo que ahora targets[0] en vez de target).
// - Con "id" propio   → entidad real. Nunca se pisa. Si además trae
//                       source+targets, es una colección: se resuelve en
//                       _children, sin tocar su identidad.
// - Con "query"       → consulta inversa. Busca en el catálogo indicado
//                       quién referencia a este item y expone el resultado
//                       en _children.
//
// La resolución es recursiva: un item externo (traído por una referencia
// pura) puede él mismo ser una colección — se detecta después del merge,
// no antes. Ej: passenger.json referencia "rutas" (referencia pura, sin id);
// la ruta resuelta desde rutas.json SÍ tiene id + source + targets propios
// (su colección de paraderos) — se resuelve en el mismo paso.
// ==========================================================================

const _jsonCache = {};

async function _loadSource(source) {
  if (!_jsonCache[source]) {
    const data = await window.cargarJSON(`${window.DATA_PATH}${source}.json`);
    if (data) _jsonCache[source] = data;
  }
  return _jsonCache[source];
}

async function _resolveQuery(item) {
  if (!item?.id || !item?.query) return [];

  const querySource = await _loadSource(item.query);
  const candidates = querySource?.items || [];

  return candidates.filter(candidate => {
    if (!candidate || !candidate.source || !Array.isArray(candidate.targets)) return false;
    return candidate.targets.includes(item.id);
  });
}

function _resolveKey(item) {
  if (!item) return '';
  if (item.id) return `${item.source || ''}::${item.id}`;
  const target = Array.isArray(item.targets) ? item.targets[0] || '' : '';
  return `${item.source || ''}::${target}`;
}

async function _resolveOne(item, seen = new Set()) {
  const key = _resolveKey(item);
  if (key && seen.has(key)) {
    return item;
  }
  const nextSeen = key ? new Set(seen).add(key) : new Set(seen);

  const directTargets = Array.isArray(item?.targets) && item.targets.length
    ? item.targets
    : (item?.target ? [item.target] : []);

  // Inline, sin referencia — se devuelve tal cual
  const hasDirectReference = !!(item?.source && directTargets.length);
  const hasQuery = !!item.query;

  if (!hasDirectReference && !hasQuery) {
    return item;
  }

  const sourceData = hasDirectReference ? await _loadSource(item.source) : null;

  // Con id propio → ENTIDAD. Nunca se pisa. Resolver su colección.
  if (item.id) {
    const children = hasDirectReference
      ? (
          await Promise.all(directTargets.map(async t => {
            const found = (sourceData?.items || []).find(s => s.id === t);
            return found ? _resolveOne(found, nextSeen) : null;   // recursivo: un hijo puede ser colección también
          }))
        ).filter(Boolean)
      : [];

    const queryChildren = hasQuery
      ? (
          await Promise.all((await _resolveQuery(item)).map(async found => _resolveOne(found, nextSeen)))
        ).filter(Boolean)
      : [];

    const mergedChildren = [...children, ...queryChildren];

    return {
      ...item,
      ...(mergedChildren.length ? { _children: mergedChildren } : {})
    };
  }

  // Sin id propio → REFERENCIA PURA. Se reemplaza por el externo.
  if (hasQuery) {
    const queryChildren = (
      await Promise.all((await _resolveQuery(item)).map(async found => _resolveOne(found, nextSeen)))
    ).filter(Boolean);

    if (queryChildren.length) {
      return {
        ...item,
        _children: queryChildren
      };
    }
  }

  const externalItem = (sourceData?.items || []).find(s => s.id === directTargets[0]);
  if (!externalItem) return null;

  const { source, targets, target, ...localOverrides } = item;
  const merged = {
    ...externalItem,
    ...localOverrides,
    _source: source,
    _targets: directTargets
  };

  // El objeto externo puede él mismo ser una colección (id + source + targets
  // propios) — se detecta recién ahora, después del merge.
  return _resolveOne(merged, nextSeen);
}

window.resolveItems = async function(items) {
  if (!Array.isArray(items) || !items.length) return [];

  // Precargar en paralelo todos los sources únicos de este nivel
  const sources = [...new Set(items.flatMap(i => [i.source, i.query]).filter(Boolean))];
  await Promise.all(sources.map(_loadSource));

  const resolved = await Promise.all(items.map(item => _resolveOne(item)));
  return resolved.filter(Boolean);
};

// ==========================================================================
// SOCIAL CHANNEL RESOLVER
// Resuelve un canal (whatsapp, email, instagram, etc.) contra social.json.
// Contrato único, compartido por cta.js (CTAs) y social.js (dock flotante).
// social.json → { id, icon, source: "url"|"section", target, color }
//
// config no se recibe como parámetro — se lee de window.getConfig(),
// que main.js expone como único punto de acceso global. Es una excepción
// deliberada: este es un leaf de contenido, no forma parte de la cadena
// de resolución de layout (esa sigue con paso explícito de config).
// ==========================================================================

const _jsonCacheSocial = {};

window.resolveSocialChannel = async function(channelId, message) {
  if (!channelId) return null;

  const config = window.getConfig ? window.getConfig() : null;

  if (!_jsonCacheSocial.data) {
    _jsonCacheSocial.data = await window.cargarJSON('/data/social.json');
  }
  const socialData = _jsonCacheSocial.data;

  const channel = socialData?.items?.find(i => i.id === channelId);
  if (!channel) return null;

  if (channel.source === 'url') {
    // WhatsApp — número desde config.business.whatsapp, no desde social.json
    if (channelId === 'whatsapp' || channel.target === 'whatsapp') {
      const num = String(config?.business?.whatsapp || '').replace(/\D/g, '');
      if (!num) return null;
      const href = message
        ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${num}`;
      return { href, external: true, channel };
    }
    // Cualquier otro canal externo — email, instagram, futuros canales
    if (!channel.target) return null;
    return { href: channel.target, external: true, channel };
  }

  if (channel.source === 'section') {
    if (!channel.target) return null;
    return { href: `#${channel.target}`, external: false, section: channel.target, channel };
  }

  return null;
};

// ==========================================================================
// RENDER BASE
// ==========================================================================

window.renderBase = async function(data) {
  const eyebrow = data.subtitle ? `<p class="section-eyebrow">${window.formatText(data.subtitle)}</p>` : '';
  const title = data.title ? `<h2 class="section-title">${window.formatText(data.title)}</h2>` : '';
  const intro = data.intro ? `<p class="section-intro">${window.formatText(data.intro)}</p>` : '';
  const cta = data.cta ? await window.buildCTA(data.cta) : '';

  return {
    eyebrow,
    title,
    intro,
    cta,
    html: `${title}${eyebrow}${intro}${cta}`
  };
};

// ==========================================================================
// DATA BUSINESS
// ==========================================================================

window.dataBusiness = function(config) {
  const biz = config?.business || {};
  const app = config?.appearance || {};

  return {
    brand: biz.brand_name || '',
    legal: biz.legal_name || '',
    tagline: biz.tagline || '',
    phone: biz.phone || '',
    whatsapp: biz.whatsapp || '',
    email: biz.email || '',
    address: biz.address || '',
    city: biz.city || '',
    country: biz.country || '',
    googleMaps: biz.google_maps || '',
    social: config?.social || {},
    logo_path: app.logo_path || '',
    favicon_path: app.favicon_path || '',
    background_image: app.background_image || '',
    background_mobile: app.background_mobile || '',
    office_image: app.office_image || ''
  };
};

})();
