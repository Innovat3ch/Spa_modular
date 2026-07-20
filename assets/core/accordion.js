// ==========================================================================
// accordion.js - Accordion
// data.items ya viene resuelto desde layout.js (D1)
// Solo genera HTML interno — el <section> lo pone layout.js (D5)
// API: renderAccordion(data, control)
// ==========================================================================

window.renderAccordion = async function(data, control) {
  const items = control.items || [];
  const columns = control.columns || data.columns || 1;

  const base = await window.renderBase(data);
  if (!items.length) {
    const emptyStyle = '--section-content-width: var(--module-content-width, ' + window.escapeHTML(control.contentWidth) + ')';
    return '<div class="layout-content" style="' + emptyStyle + '">' + base.html + '</div>';
  }

  const itemsHtml = await Promise.all(items.map(async (item) => {
      const isReference = item._source && Array.isArray(item._targets) && item._targets.length;
      const hasCTA = item.cta && item.cta.label && item.cta.source;

const iconHtml = item.icon ? `
         <span class="accordion-icon">
           <img src="${window.escapeHTML(window.resolveAssetUrl(item.icon))}" alt="" loading="lazy">
         </span>
       ` : '';

      const summaryHtml = item.summary
        ? `<p class="accordion-summary item-header">${window.formatText(item.summary)}</p>`
        : '';

      if (isReference) {
        const refTarget = item._targets[0];
        const linkAttrs = `href="#${window.escapeHTML(item._source)}" data-section="${window.escapeHTML(item._source)}"${refTarget ? ` data-service="${window.escapeHTML(refTarget)}"` : ''}`;
        return `
          <a class="accordion-item accordion-item--reference" ${linkAttrs} data-id="${window.escapeHTML(item.id || '')}">
            <div class="accordion-header">
              ${iconHtml}
              <span class="accordion-info">
                <h3 class="accordion-title item-header">${window.escapeHTML(item.title || '')}</h3>
                ${summaryHtml}
              </span>
              <span class="accordion-arrow" aria-hidden="true">→</span>
            </div>
          </a>
        `;
      }

      const features = (item.features || []).length
        ? `<ul class="accordion-features item-content">${item.features.map(f => `<li>${window.escapeHTML(f)}</li>`).join('')}</ul>`
        : '';

const mediaHtml = item.image ? `
         <figure class="accordion-media">
           <img src="${window.escapeHTML(window.resolveAssetUrl(item.image))}" alt="${window.escapeHTML(item.title || '')}" loading="lazy">
         </figure>
       ` : '';

      const bodyClass = mediaHtml ? 'accordion-body has-media' : 'accordion-body';

      // Footer: lista de hipervínculos si hay colección (_children),
      // botón CTA si es una acción simple. Nunca ambos, y siempre
      // full-width debajo de features — no compite en columnas con nada.
      const hasChildren = (item._children || []).length;
      const footerHtml = hasChildren
        ? await window.buildMembersList(item._children, {
            section: data?.members_source || data?.id || 'passenger'
          })
        : (hasCTA ? await window.buildCTA(item.cta) : '');

      return `
        <details class="accordion-item" data-id="${window.escapeHTML(item.id || '')}">
          <summary class="accordion-header">
            ${iconHtml}
            <span class="accordion-info">
              <h3 class="accordion-title item-header">${window.escapeHTML(item.title || '')}</h3>
              ${summaryHtml}
            </span>
            <span class="accordion-toggle" aria-hidden="true">+</span>
          </summary>
          <div class="${bodyClass}">
            <div class="accordion-content-text">
              ${item.description ? `<p class="accordion-description item-content">${window.formatText(item.description)}</p>` : ''}
              ${features}
              ${footerHtml}
            </div>
            ${mediaHtml}
          </div>
        </details>
      `;
    }));

  return `
    <div class="layout-content" style="--section-content-width: var(--module-content-width, ${window.escapeHTML(control.contentWidth)});">
      ${base.html}
      <div class="section-accordion" style="--columns: ${window.escapeHTML(String(columns))};">
        ${itemsHtml.join('')}
      </div>
    </div>
  `;
};