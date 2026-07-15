// ==========================================================================
// contact.js — Módulo de la sección Contacto
// Responsabilidad: SOLO formulario de contacto
// Layout: split-left / split-right — consumen layout.css
// Media: se resuelve vía window.resolverMedia (main.js global)
// Expone: window.renderContact
// ==========================================================================

if (!window.ContactModuleLoaded) {
window.ContactModuleLoaded = true;

// ==========================================================================
// HELPERS
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
// FORMULARIO
// ==========================================================================

function _renderForm(data) {
  const ph   = data.placeholders      || {};
  const req  = data.required_fields   || { name: true, email: true, message: true };
  const msgs = data.feedback_messages || {};
  const r    = (k) => req[k] ? 'required' : '';

  return `
    <form id="web-contact-form" class="contact-form-wrapper">
      <div class="contact-field">
        <input type="text"  id="cf-name"    name="name"
               placeholder="${ph.name    || 'Tu nombre completo'}"             ${r('name')}>
      </div>
      <div class="contact-field">
        <input type="email" id="cf-email"   name="email"
               placeholder="${ph.email   || 'Tu correo electrónico'}"          ${r('email')}>
      </div>
      <div class="contact-field">
        <input type="tel"   id="cf-phone"   name="phone"
               placeholder="${ph.phone   || 'Tu teléfono (opcional)'}"         ${r('phone')}>
      </div>
      <div class="contact-field">
        <textarea           id="cf-message" name="message"
               placeholder="${ph.message || 'Cuéntanos sobre tu proyecto...'}" ${r('message')}></textarea>
      </div>
      <div class="contact-field">
        <button type="submit" id="cf-submit" class="btn-submit"
                data-sending="${msgs.sending       || 'Enviando...'}"
                data-success="${msgs.success       || '✅ Mensaje enviado. Te contactaremos pronto.'}"
                data-error="${msgs.error_default   || '❌ Error al enviar el mensaje.'}"
                data-conn="${msgs.connection_error || '❌ Error de conexión con el servidor.'}">
          ${data.button_label || 'Enviar Mensaje'}
        </button>
      </div>
      <div id="cf-status" style="margin-top:1rem; font-weight:500; font-size:0.9rem;"></div>
    </form>`;
}

// ==========================================================================
// ENVÍO DEL FORMULARIO
// ==========================================================================

async function _enviarFormulario(e) {
  e.preventDefault();

  const form   = document.getElementById('web-contact-form');
  const status = document.getElementById('cf-status');
  const btn    = document.getElementById('cf-submit');

  for (const input of form.querySelectorAll('[required]')) {
    if (!input.value.trim()) {
      status.style.color = 'red';
      status.innerText = 'Por favor completa los campos obligatorios.';
      input.focus();
      return;
    }
  }

  btn.disabled = true;
  const originalText = btn.innerText;
  btn.innerText = btn.dataset.sending;
  status.innerText = '';

  try {
    const res    = await fetch('/mailer.php', { method: 'POST', body: new FormData(form) });
    const result = await res.json();

    if (result.success) {
      status.style.color = 'green';
      status.innerText = btn.dataset.success;
      form.reset();
    } else {
      status.style.color = 'red';
      status.innerText = '❌ ' + (result.error || result.message || btn.dataset.error);
    }
  } catch (_) {
    status.style.color = 'red';
    status.innerText = btn.dataset.conn;
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

// ==========================================================================
// API PÚBLICA
// ==========================================================================

window.renderContact = async function(config) {

  const root = document.getElementById('app');

  const data = await _fetchJSON('/data/contact.json');

  if (!data) {
    root.innerHTML = '<div class="page-section"><p>Error cargando contacto.</p></div>';
    return;
  }

  // Resolver panel media desde data.media (declarativo)
  // La carga del módulo, validación de show, y renderizado del panel
  // lo maneja resolverMedia en main.js globalmente
  const mediaPanel = data.media && window.resolverMedia
    ? await window.resolverMedia(data.media, config)
    : null;

  const layout    = data.layout    || 'split-left';
  const titulo    = data.title     || 'Contacto';
  const subtitulo = data.subtitle  || '';
  const styleAttr = window.resolveSectionStyle(data, config);
  const background = window.resolveSectionBackground(data, config);
  const sectionClasses = ['page-section', 'layout--split', `layout--${layout}`];
  if (background.backgroundClass) sectionClasses.push(background.backgroundClass);
  const mergedStyle = window.mergeStyleAttrs(styleAttr, background.styleAttr);

  const mediaHtml  = mediaPanel?.mediaHtml || mediaPanel?.html || '';
  const infoHtml   = mediaPanel?.infoHtml  || '';
  const mediaTitulo = mediaPanel?.titulo   || '';
  const hasMedia   = !!(mediaHtml || infoHtml);

  root.innerHTML = `
    <section id="contact" class="${sectionClasses.join(' ')}" ${mergedStyle}>

      <div class="layout-content">
        <h2 class="section-title">${titulo}</h2>
        ${subtitulo ? `<p class="contact-subtitle">${subtitulo}</p>` : ''}
        ${_renderForm(data)}
      </div>

      ${hasMedia ? `
      <div class="layout-media">
        <div class="media-section">
          ${mediaTitulo ? `<h2 class="section-title">${mediaTitulo}</h2>` : ''}
          ${mediaHtml}
          ${infoHtml}
        </div>
      </div>` : ''}

    </section>`;

  const form = document.getElementById('web-contact-form');
  if (form) form.addEventListener('submit', _enviarFormulario);

  if (window.initLocationEvents) window.initLocationEvents();
};

} // fin if (!window.ContactModuleLoaded)
