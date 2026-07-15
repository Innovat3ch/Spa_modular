// ==========================================================================
// fullscreen.js — Layout Fullscreen
// ==========================================================================
// D1: data.items ya viene resuelto desde layout.js — no llamar resolveItems()
// D2: --section-content-width lo maneja layout.js via control
// D5: Solo genera HTML interno — el <section> lo genera layout.js
// API: renderFullscreen(data, control)
// ==========================================================================

window.renderFullscreen = async function(data, control) {
  const base = await window.renderBase(data);
  const items = control.items || [];

  let itemsHtml = '';
  if (items.length) {
    const itemsContent = await Promise.all(items.map(async item => {
      const isReference = item._source && Array.isArray(item._targets) && item._targets.length;
      const hasCTA = item.cta && item.cta.label && item.cta.source;

      const itemIcon = item.icon
        ? `<img class="fs-item-icon" src="${window.escapeHTML(item.icon)}" alt="" loading="lazy">`
        : '';

      const itemTitle = item.title
        ? `<strong class="fs-item-title item-header">${window.escapeHTML(item.title)}</strong>`
        : '';

      const itemSummary = item.summary
        ? `<span class="fs-item-summary item-header">${window.escapeHTML(item.summary)}</span>`
        : '';

      // Colección resuelta (_children) — items.json v2, ej. paraderos dentro de una ruta
      const childrenHtml = !isReference && (item._children || []).length
        ? `<div class="item-stops">
            ${item._children.map(c => `<span class="item-stop" data-id="${window.escapeHTML(c.id)}">${window.escapeHTML(c.title || c.id)}</span>`).join('')}
          </div>`
        : '';

      const itemBody = !isReference
        ? `
          <span class="fs-item-body item-content">
            ${item.description ? `<span class="fs-item-desc">${window.escapeHTML(item.description)}</span>` : ''}
            ${(item.features || []).length ? `<ul class="fs-item-features">${item.features.map(f => `<li>${window.escapeHTML(f)}</li>`).join('')}</ul>` : ''}
            ${childrenHtml}
            ${hasCTA ? await window.buildCTA(item.cta) : ''}
          </span>
        `
        : '';

      const content = `
        ${itemIcon}
        <span class="fs-item-head">
          ${itemTitle}
          ${itemSummary}
        </span>
        ${itemBody}
      `;

      if (isReference) {
        const refTarget = item._targets[0];
        const linkAttrs = `href="#${window.escapeHTML(item._source)}" data-section="${window.escapeHTML(item._source)}"${refTarget ? ` data-service="${window.escapeHTML(refTarget)}"` : ''}`;
        return `<a class="fs-item fs-item--link" data-id="${window.escapeHTML(item.id || '')}" ${linkAttrs}>${content}</a>`;
      } else {
        return `<div class="fs-item" data-id="${window.escapeHTML(item.id || '')}">${content}</div>`;
      }
    }));

    itemsHtml = `<div class="fs-items" style="--columns: ${window.escapeHTML(String(control.columns || 1))}">${itemsContent.join('')}</div>`;
  }

  return `
    <div class="layout-content" style="--section-content-width: var(--module-content-width, ${window.escapeHTML(control.contentWidth)});">
      ${base.html}
      ${itemsHtml}
    </div>
  `;
};
