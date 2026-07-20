// ==========================================================================
// blocks.js - Layout Blocks/Cards
// data.items ya viene resuelto desde layout.js (D1)
// columns llega resuelto en control (D2)
// titleAlign eliminado — usar text_align del contrato (D3)
// API: renderBlocks(data, control) — solo genera HTML interno (D5)
// ==========================================================================

window.renderBlocks = async function(data, control) {
  const base = await window.renderBase(data);
  const items = control.items || [];

  // Layout.js ya resolvió columns
  const columns = control.columns || 1;

  const itemsHtml = (await Promise.all(items.map(async item => {
    const isReference = item._source && Array.isArray(item._targets) && item._targets.length;
    const hasCTA = item.cta && item.cta.label && item.cta.source;

    const featuresHtml = !isReference && (item.features || []).length
      ? `<ul class="block-features item-content">
          ${item.features.map(f => `<li>${window.escapeHTML(f)}</li>`).join('')}
        </ul>`
      : '';

    const ctaHtml = !isReference && hasCTA ? await window.buildCTA(item.cta) : '';

    const descHtml = !isReference && item.description
      ? `<p class="block-desc item-content">${window.formatText(item.description)}</p>`
      : '';

    const summaryHtml = item.summary
      ? `<p class="block-summary">${window.formatText(item.summary)}</p>`
      : '';

const iconHtml = item.icon
       ? `<img class="block-icon" src="${window.escapeHTML(window.resolveAssetUrl(item.icon))}" alt="" loading="lazy">`
       : '';

    const hasMembers = !isReference && (item._children || []).length;
    const membersHtml = hasMembers
      ? await window.buildMembersList(item._children, {
          section: data?.members_source || data?.id || 'passenger'
        })
      : '';
    const footerHtml = hasMembers ? membersHtml : ctaHtml;

    let contentHtml;

    if (isReference) {
      const refTarget = item._targets[0];
      const linkAttrs =
        `href="#${window.escapeHTML(item._source)}" ` +
        `data-section="${window.escapeHTML(item._source)}"` +
        (refTarget
          ? ` data-service="${window.escapeHTML(refTarget)}"`
          : '');

      contentHtml = `
        <a class="block-link" ${linkAttrs}>
          <div class="block-head block-head--center">
            ${iconHtml}
            <div class="block-info item-header">
              <h3 class="block-title item-header">${window.escapeHTML(item.title || '')}</h3>
              ${summaryHtml}
            </div>
          </div>
        </a>
      `;
    } else {
      contentHtml = `
        <div class="block-head">
          ${iconHtml}
          <div class="block-info item-header">
            <h3 class="block-title item-header">${window.escapeHTML(item.title || '')}</h3>
            ${summaryHtml}
          </div>
        </div>
        ${descHtml}
        ${featuresHtml}
        ${footerHtml || ''}
      `;
    }

    const variantClass = isReference ? ' block-item--reference' : '';
    const noIconClass  = !item.icon ? ' block-item--no-icon' : '';

    return `
      <article class="block-item${variantClass}${noIconClass}"
        data-id="${window.escapeHTML(item.id || '')}"
        ${isReference
          ? `data-source="${window.escapeHTML(item._source)}"
             data-target="${window.escapeHTML(item._targets[0] || '')}"`
          : ''}>
        ${contentHtml}
      </article>
    `;
  }))).join('');

  return `
    <div class="layout-content"
         style="--section-content-width: var(--module-content-width, ${window.escapeHTML(control.contentWidth)});">

      ${base.html}

      <div class="blocks-grid"
           style="--columns: ${window.escapeHTML(String(columns))};">

        ${itemsHtml}

      </div>
    </div>
  `;
};
