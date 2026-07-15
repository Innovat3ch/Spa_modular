// ==========================================================================
// location.js — Módulo completo de ubicación
// Expone: window.renderLocation / window.renderLocationPanel / window.initLocationEvents
// REGLAS:
//   - Si está vacío, no se pone
//   - Datos de config_web.json (business, appearance) como fuente
//   - service_mode controla qué campos mostrar
// ==========================================================================

// ==========================================================================
// HELPERS
// ==========================================================================

function _val(value, key) {
  if (!value || !String(value).trim()) return false;
  if (key && String(value).trim().toLowerCase() === String(key).toLowerCase()) return false;
  return String(value).trim();
}

function _buildMapaUrl(loc, biz) {
  if (loc.lat && loc.lng) {
    return `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
  if (biz?.google_maps) return biz.google_maps;
  if (biz?.address || biz?.city) {
    const q = encodeURIComponent(
      `${biz.address || ''} ${biz.city || ''} ${biz.country || ''}`.trim()
    );
    return `https://maps.google.com/maps?q=${q}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
  return '';
}

// ==========================================================================
// RENDER MEDIA VIEWER
// Foto: media.photo → appearance.office_image → appearance.background_image → appearance.logo_path
// Mapa: solo si show_map=true y hay URL
// Toggle: solo si hay foto Y mapa
// Altura fija: 280px para que imagen y mapa tengan mismo tamaño
// ==========================================================================

function _renderMediaViewer(loc, config) {
  const media = loc.media || {};
  const app   = config.appearance || {};

  const mapaUrl     = _buildMapaUrl(loc, config.business || {});
  const imgSrc      = window.resolveAssetUrl
    ? window.resolveAssetUrl(media.photo || app.office_image || app.background_image || app.hero_image || app.logo_path || '')
    : (media.photo || app.office_image || app.background_image || app.hero_image || app.logo_path || '');
  const imgFallback = window.resolveAssetUrl
    ? window.resolveAssetUrl(app.office_image || app.background_image || app.hero_image || app.logo_path || '')
    : (app.office_image || app.background_image || app.hero_image || app.logo_path || '');

  const tieneFoto  = media.show_photo && imgSrc;
  const tieneMapa  = media.show_map && mapaUrl;
  const tieneAmbos = tieneFoto && tieneMapa;

  const photoBlock = tieneFoto ? `
    <div class="business-image-view">
      <img src="${window.escapeHTML(imgSrc)}"
           onerror="this.onerror=null; this.src='${window.escapeHTML(imgFallback)}'; this.onerror=function(){this.style.display='none'}"
           alt="Nuestra empresa">
    </div>` : '';

  const mapBlock = tieneMapa ? `
    <div class="map-iframe-view">
      <iframe width="100%" height="100%" loading="lazy" allowfullscreen src="${mapaUrl}"></iframe>
    </div>` : '';

  // Estado inicial: foto visible (sin .show-map), botón dice VER MAPA
  const toggleBtn = tieneAmbos ? `
    <button type="button" id="btn-toggle-map" class="toggle-media-btn">
      📍 <span>VER MAPA</span>
    </button>` : '';

  if (!photoBlock && !mapBlock) return '';

  return `
    <div id="media-viewer" class="media-viewer-container">
      ${photoBlock}
      ${mapBlock}
      ${toggleBtn}
    </div>`;
}

// ==========================================================================
// RENDER INFO BOX
// Orden según service_mode:
//   online:     subtitle → horario → email → telf → whatsapp
//   presencial: subtitle → dirección → referencia → horario → email → telf → whatsapp
//   hybrid:     subtitle → dirección → referencia → horario → email → telf → whatsapp + nota online
// REGLA: si está vacío, no se pone
// ==========================================================================

function _renderInfoBox(loc, biz) {
  const lc  = loc.content    || {};
  const vis = loc.visibility || {};

  const mode     = (loc.service_mode || 'online').toLowerCase();
  const esFisico = mode === 'presencial' || mode === 'hybrid';

  const rows = [];

  // subtitle — todas las modalidades
  if (_val(lc.subtitle, 'subtitle')) {
    rows.push({ html: `<div class="info-row info-subtitle"><span>${lc.subtitle}</span></div>` });
  }

  // dirección — solo presencial/hybrid
  if (esFisico && vis.address !== false && _val(biz.address)) {
    rows.push({ html: `<div class="info-row"><strong>📍 Dirección:</strong> <span>${biz.address}</span></div>` });
  }

  // referencia — solo presencial/hybrid
  if (esFisico && _val(lc.reference, 'reference')) {
    rows.push({ html: `<div class="info-row"><strong>🗺️ Referencia:</strong> <span>${lc.reference}</span></div>` });
  }

  // horario — todas las modalidades
  if (_val(lc.hours)) {
    const label = _val(lc.hours_label) || 'Horario:';
    const weekend = _val(lc.hours_weekend) ? ` &nbsp;·&nbsp; ${lc.hours_weekend}` : '';
    rows.push({ html: `<div class="info-row"><strong>🕒 ${label}</strong> <span>${lc.hours}${weekend}</span></div>` });
  }

  // email — todas las modalidades
  if (vis.email !== false && _val(biz.email)) {
    rows.push({ html: `<div class="info-row"><strong>✉️ Email:</strong> <a href="mailto:${biz.email}">${biz.email}</a></div>` });
  }

  // teléfono — todas las modalidades
  if (vis.phone !== false && _val(biz.phone)) {
    rows.push({ html: `<div class="info-row"><strong>📞 Telf:</strong> <span>${biz.phone}</span></div>` });
  }

  // whatsapp — todas las modalidades
  if (_val(biz.whatsapp)) {
    const clean = String(biz.whatsapp).replace(/[^0-9]/g, '');
    rows.push({ html: `<div class="info-row"><strong>📱 WhatsApp:</strong> <a href="https://wa.me/${clean}" target="_blank">+${biz.whatsapp}</a></div>` });
  }

  // nota online — solo hybrid
  if (mode === 'hybrid' && _val(lc.online_note, 'online_note')) {
    rows.push({ html: `<div class="info-row info-online-note"><span>🌐 ${lc.online_note}</span></div>` });
  }

  if (!rows.length) return '';

  return `<div class="extended-info-box">${rows.map(r => r.html).join('')}</div>`;
}

// ==========================================================================
// EVENTOS TOGGLE
// ==========================================================================

function _initToggle() {
  const btn    = document.getElementById('btn-toggle-map');
  const viewer = document.getElementById('media-viewer');
  if (!btn || !viewer) {
    console.warn('[location.js] Toggle elements not found');
    return;
  }

  // Clonar para evitar listeners duplicados si se llama más de una vez
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    const mapActivo = viewer.classList.toggle('show-map');
    const span = newBtn.querySelector('span');
    if (span) span.innerText = mapActivo ? 'VER LOCAL' : 'VER MAPA';
  });
}

// ==========================================================================
// JSON LOADER
// ==========================================================================

async function _fetchJSON(path) {
  try {
    const res = await fetch(window.resolveAssetUrl ? window.resolveAssetUrl(path) : path);
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.trim() ? JSON.parse(txt) : null;
  } catch { return null; }
}

// ==========================================================================
// API PÚBLICA: PANEL (para contact.js u otros módulos)
// Devuelve { titulo, mediaHtml, infoHtml } — titulo null si no hay
// ==========================================================================

window.renderLocationPanel = async function(config) {
  const loc = await _fetchJSON('/data/location.json');
  if (!loc) return null;

  const biz   = config.business || {};
  // Título: usa el de location.json, si no hay usa brand_name, si no hay usa 'Ubicación'
  const titulo = _val(loc.content?.title, 'title')
               || _val(config.business?.brand_name)
               || 'Ubicación';

  return {
    titulo:    titulo,
    mediaHtml: _renderMediaViewer(loc, config),
    infoHtml:  _renderInfoBox(loc, biz)
  };
};

// ==========================================================================
// API PÚBLICA: STANDALONE (sección independiente)
// ==========================================================================

window.renderLocation = async function(config) {
  const root = document.getElementById('app');
  const loc  = await _fetchJSON('/data/location.json');

  if (!loc) {
    root.innerHTML = '<section class="page-section"><p>Error cargando ubicación.</p></section>';
    return;
  }

  const biz   = config.business || {};
  const titulo = _val(loc.content?.title, 'title') || 'Nuestra ubicación';
  const styleAttr = window.resolveSectionStyle(loc, config);
  const background = window.resolveSectionBackground(loc, config);
  const sectionClasses = ['page-section', 'layout--fullscreen'];
  if (background.backgroundClass) sectionClasses.push(background.backgroundClass);
  const mergedStyle = window.mergeStyleAttrs(styleAttr, background.styleAttr);

  root.innerHTML = `
    <section id="location" class="${sectionClasses.join(' ')}" data-align="left" ${mergedStyle}>
      <div class="layout-content">
        <h2 class="section-title">${titulo}</h2>
        ${_renderMediaViewer(loc, config)}
        ${_renderInfoBox(loc, biz)}
      </div>
    </section>`;

  _initToggle();
};

// ==========================================================================
// EVENTOS (expuesto para que contact.js lo llame)
// ==========================================================================

window.initLocationEvents = function() {
  _initToggle();
};
