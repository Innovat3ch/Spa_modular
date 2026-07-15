// ==========================================================================
// social.js — Dock flotante dinámico (assets/core/)
// Resuelve los items del floating usando resolveSocialChannel (helpers.js) —
// mismo mecanismo que cta.js, un solo lugar de verdad para WhatsApp/canales.
// ==========================================================================

window.renderSocialDock = async function(floatingArray) {
  if (!floatingArray?.length) return '';

  const htmlParts = await Promise.all(floatingArray.map(async item => {
    if (item.source !== 'social') return '';

    const resolved = await window.resolveSocialChannel(item.target);
    if (!resolved?.href) return '';

    const { channel, href, external, section } = resolved;

    const targetAttr = external ? 'target="_blank" rel="noopener"' : '';
    const dataAttr   = section ? `data-section="${window.escapeHTML(section)}"` : '';
    const colorStyle = channel.color ? `style="--social-color: ${window.escapeHTML(channel.color)};"` : '';
    const icon       = window.resolveAssetUrl
      ? window.resolveAssetUrl(channel.icon || `assets/images/${channel.id}.svg`)
      : (channel.icon || `assets/images/${channel.id}.svg`);
    const label      = window.escapeHTML(channel.id);

    return `
      <a class="social-circle"
         href="${window.escapeHTML(href)}"
         aria-label="${label}"
         ${targetAttr}
         ${dataAttr}
         ${colorStyle}>
        <img src="${window.escapeHTML(icon)}" alt="${label}" width="24" height="24">
      </a>
    `;
  }));

  return htmlParts.filter(Boolean).join('');
};

window.actualizarDock = async function(floating) {
  const dock = document.getElementById('floating-dock');
  if (!dock) return;

  const items     = floating?.items || [];
  const direction = floating?.direction || 'vertical';

  // Sección activa — donde se inyecta --dock-offset
  const section = document.querySelector('#app section');

  function limpiarDock() {
    dock.innerHTML = '';
    dock.style.display = 'none';
    dock.removeAttribute('data-floating-direction');
    if (section) section.style.removeProperty('--dock-offset');
  }

  if (!items.length) {
    limpiarDock();
    return;
  }

  const html = await window.renderSocialDock(items);

  if (!html.trim()) {
    limpiarDock();
    return;
  }

  dock.innerHTML = html;
  dock.style.display = 'flex';
  dock.setAttribute('data-floating-direction', direction);

  // --dock-offset solo cuando el dock ocupa espacio horizontal (vertical | middle)
  // horizontal queda debajo del contenido y no empuja el padding
  if (section) {
    if (direction === 'vertical' || direction === 'middle') {
      section.style.setProperty('--dock-offset', 'var(--dock-width, 70px)');
    } else {
      section.style.removeProperty('--dock-offset');
    }
  }
};