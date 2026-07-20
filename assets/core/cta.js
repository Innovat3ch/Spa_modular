// ==========================================================================
// CTA RESOLVER
// Schema:
// {
//   "label":   "",
//   "source":  "url | social | <key-de-sección>",
//   "target":  "https://... | assets/docs/x.pdf | whatsapp | email | id-de-item | ...",
//   "message": ""
// }
//
// Inferencia:
//   source = "url"                          → recurso externo (http, pdf, imagen, cualquiera)
//   source = "social", target = "whatsapp"  → resuelve wa.me vía resolveSocialChannel
//                                              (config.business.whatsapp)
//   source = "social", target = "email"|... → resuelve vía social.json,
//                                              mismo mecanismo que el dock flotante
//   source = palabra simple                 → navegación interna SPA,
//                                              target = id opcional dentro de esa sección
//
// No recibe config como parámetro: resolveSocialChannel() ya lo lee de
// window.getConfig() (helpers.js). buildCTA() queda como pura presentación
// salvo la validación de navegación interna, que sí consulta getConfig() para
// descartar typos o secciones deshabilitadas (sin esto, el botón parece válido
// pero redirige en silencio a la primera sección habilitada).
// ==========================================================================

// Valida que el source de navegación interna exista en navigation y esté
// show:true. Devuelve true solo si la sección es válida y navegable.
function _isInternalSectionEnabled(source) {
  const nav = window.getConfig?.()?.navigation;
  if (!nav || !source) return false;
  const entry = nav[source];
  return entry?.show === true;
}

window.resolveCTALink = async function(cta) {
  if (!cta?.label || !cta?.source) return null;

  // --------------------------------------------------
  // Recurso externo explícito — URL, PDF, imagen, lo que sea
  // --------------------------------------------------
  if (cta.source === 'url') {
    if (!cta.target) return null;
    return { href: cta.target, external: true };
  }

  // --------------------------------------------------
  // Canal social — mismo mecanismo que usa el dock flotante
  // --------------------------------------------------
  if (cta.source === 'social') {
    const resolved = await window.resolveSocialChannel(cta.target, cta.message);
    if (!resolved?.href) return null;
    return { href: resolved.href, external: resolved.external };
  }

  // --------------------------------------------------
  // Navegación interna SPA — source = sección, target = id opcional
  // VALIDACIÓN ESTRICTA: el source debe existir en navigation y estar
  // show:true. Un typo o una sección deshabilitada NO genera botón.
  // --------------------------------------------------
  if (!_isInternalSectionEnabled(cta.source)) {
    console.warn(`[CTA] source de navegación interna inválido o deshabilitado: "${cta.source}"`);
    return null;
  }

  return {
    href: `#${cta.source}`,
    section: cta.source,
    item: cta.target || null,
    external: false
  };
};

window.buildCTA = async function(cta) {
  const resolved = await window.resolveCTALink(cta);
  if (!resolved?.href) return '';

  const label = window.escapeHTML(cta.label);
  const href = window.escapeHTML(resolved.href);

  if (resolved.external) {
    return `
      <a class="btn-nicepage"
         href="${href}"
         target="_blank"
         rel="noopener">
        ${label}
      </a>`;
  }

  const dataAttrs = [
    `data-section="${window.escapeHTML(resolved.section)}"`,
    resolved.item ? `data-service="${window.escapeHTML(resolved.item)}"` : ''
  ].filter(Boolean).join(' ');

  return `
    <a class="btn-nicepage"
       href="${href}"
       ${dataAttrs}>
      ${label}
    </a>`;
};

window.buildCTAList = async function(items = [], options = {}) {
  if (!Array.isArray(items) || !items.length) return '';

  const ctas = await Promise.all(items.map(async item => {
    if (!item) return '';
    if (item.cta && item.cta.label && item.cta.source) {
      return window.buildCTA(item.cta);
    }
    if (!item.id) return '';

    const label = item.title || item.summary || item.id;
    return window.buildCTA({
      label,
      source: options.section || 'passenger',
      target: item.id
    });
  }));

  return ctas.filter(Boolean).join('');
};

window.buildMembersList = async function(items = [], options = {}) {
  if (!Array.isArray(items) || !items.length) return '';

  const lis = await Promise.all(items.map(async item => {
    if (!item?.id) return '';
    const cta = item.cta && item.cta.label && item.cta.source
      ? item.cta
      : { label: item.title || item.summary || item.id, source: options.section || 'passenger', target: item.id };

    const resolved = await window.resolveCTALink(cta);
    const label = window.escapeHTML(cta.label);
    if (!resolved?.href) return `<li>${label}</li>`;

    const href = window.escapeHTML(resolved.href);
    if (resolved.external) {
      return `<li><a href="${href}" target="_blank" rel="noopener">${label}</a></li>`;
    }

    const dataAttrs = [
      `data-section="${window.escapeHTML(resolved.section)}"`,
      resolved.item ? `data-service="${window.escapeHTML(resolved.item)}"` : ''
    ].filter(Boolean).join(' ');

    return `<li><a href="${href}" ${dataAttrs}>${label}</a></li>`;
  }));

  return `<ul class="member-list item-content">${lis.filter(Boolean).join('')}</ul>`;
};
