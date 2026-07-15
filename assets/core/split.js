// ==========================================================================
// split.js — Renderer Split (left/right)
// Solo genera el contenido interno. El <section> lo pone layout.js.
// ==========================================================================

window.renderSplit = async function(data, control) {
  const base = await window.renderBase(data);

  // Media opcional
  let mediaHtml = '';
  if (data.media?.source && data.media?.target) {
    const mediaData = await window.resolveItems([data.media]);
    if (mediaData.length && mediaData[0].image) {
      const imgSrc = window.resolveAssetUrl
        ? window.resolveAssetUrl(mediaData[0].image)
        : mediaData[0].image;
      mediaHtml = `<img src="${window.escapeHTML(imgSrc)}" alt="" loading="lazy">`;
    }
  } else if (data.media?.url || data.background_image) {
    const imgSrc = window.resolveAssetUrl
      ? window.resolveAssetUrl(data.media?.url || data.background_image)
      : (data.media?.url || data.background_image);
    mediaHtml = `<img src="${window.escapeHTML(imgSrc)}" alt="" loading="lazy">`;
  }

  return `
    <div class="layout-content">
      ${base.html}
    </div>
    ${mediaHtml ? `<div class="layout-media">${mediaHtml}</div>` : ''}
  `;
};
