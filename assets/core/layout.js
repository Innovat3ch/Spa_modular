// ==========================================================================
// layout.js - Fachada completa del sistema de layouts SPA Modular v2
// ==========================================================================

(function() {
  'use strict';

  const RENDERERS = {
    'fullscreen':   'renderFullscreen',
    'split':        'renderSplit',
    'blocks':       'renderBlocks',
    'accordion':    'renderAccordion',
    'default':      null
  };

  const ALIASES = {
    'block':        'blocks',
    'cards':        'blocks',
    'split-left':   'split',
    'split-right':  'split'
  };

  const _loadedCss = new Set();
  const _loadedJs  = new Set();

  function loadCSS(path) {
    if (!path || _loadedCss.has(path)) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = path;
      link.onload = () => { _loadedCss.add(path); resolve(); };
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  async function loadJS(path) {
    if (!path || _loadedJs.has(path)) return;
    if (typeof window.loadScript === 'function') {
      await window.loadScript(path);
      _loadedJs.add(path);
      return;
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${path}"]`);
      if (existing) { _loadedJs.add(path); resolve(); return; }
      const script = document.createElement('script');
      script.src = path;
      script.onload = () => { _loadedJs.add(path); resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function normalizeLayout(layout, config) {
    if (!layout || layout === 'default') {
      layout = config?.layouts?.default_layout || 'blocks';
    }
    const canonical = ALIASES[layout] || layout;
    if (!RENDERERS[canonical]) {
      console.warn(`[layout.js] Layout desconocido: "${layout}". Fallback a blocks.`);
      return 'blocks';
    }
    return canonical;
  }

  function resolveProp(data, config, key, defaultValue) {
    if (data?.[key] != null && data[key] !== '') return data[key];
    if (config?.layouts?.[`default_${key}`] != null) return config.layouts[`default_${key}`];
    return defaultValue;
  }

  function resolveContentWidth(data, config) {
    const explicit = data?.contentWidth || data?.content_width || data?.appearance?.content_width;
    if (explicit != null && explicit !== '') {
      const raw = String(explicit).trim();
      if (/^\d+(?:\.\d+)?$/.test(raw)) return `${raw}%`;
      return raw;
    }
    const align = resolveProp(data, config, 'align', 'center');
    if (align === 'center') return '90%';
    return '50%';
  }

  function buildLayoutControl(data, config, layout) {
    const align     = resolveProp(data, config, 'align', 'center');
    const valign    = resolveProp(data, config, 'valign', 'middle');
    const textAlign = resolveProp(data, config, 'text_align', '');
    const columns   = resolveProp(data, config, 'columns', 1);
    const contentWidth = resolveContentWidth(data, config);

    const classes = ['page-section', `layout--${layout}`];
    if (layout === 'split' && data?.layout) {
      classes.push(`layout--${data.layout}`);
    }

    const background = window.resolveSectionBackground(data, config);
    if (background.backgroundClass) {
      classes.push(background.backgroundClass);
    }

    const dataAttrs = [
      `data-align="${window.escapeHTML(align)}"`,
      `data-valign="${window.escapeHTML(valign)}"`
    ];
    if (textAlign) {
      dataAttrs.push(`data-text-align="${window.escapeHTML(textAlign)}"`);
    }

    const styleAttr = window.resolveSectionStyle(data, config);
    const mergedStyle = window.mergeStyleAttrs(styleAttr, background.styleAttr);

    // --section-content-width usa el valor del JSON como fallback;
    // el CSS del módulo puede dominarlo definiendo --module-content-width en .page-section
    const cssVars = [
      `--section-content-width: var(--module-content-width, ${window.escapeHTML(contentWidth)})`,
      `--columns: ${window.escapeHTML(String(columns))}`
    ];

    return {
      classes: classes.join(' '),
      dataAttrs: dataAttrs.join(' '),
      styleAttr: mergedStyle,
      cssVars: cssVars.join('; '),
      contentWidth,
      align, valign, textAlign, columns
    };
  }

  function wrapSection(control, contentHtml) {
    let finalStyle = control.styleAttr || '';
    if (control.cssVars) {
      if (finalStyle.includes('style="')) {
        finalStyle = finalStyle.replace('style="', `style="${control.cssVars}; `);
      } else {
        finalStyle = `style="${control.cssVars}" ${finalStyle}`;
      }
    }

    return `
      <section class="${control.classes}"
               ${control.dataAttrs}
               ${finalStyle}>
        ${contentHtml}
      </section>
    `;
  }

  async function renderLayout(data, config) {
    const rawLayout = data?.layout;
    const layout = normalizeLayout(rawLayout, config);

    await loadCSS('/assets/css/layout.css');
    await loadCSS(`/assets/core/${layout}.css`);

    const rendererName = RENDERERS[layout];
    if (!window[rendererName]) {
      await loadJS(`/assets/core/${layout}.js`);
    }

    const control = buildLayoutControl(data, config, layout);
    const renderer = window[rendererName];

    if (typeof renderer !== 'function') {
      console.error(`[layout.js] Renderer no encontrado: "${rendererName}"`);
      return wrapSection(control, `
        <div class="layout-content">
          <p class="section-error">Error: renderer "${layout}" no disponible.</p>
        </div>
      `);
    }

    const resolvedItems = await window.resolveItems(data.items || []);
    control.items = resolvedItems;
    const enrichedData = { ...data, items: resolvedItems };

    const contentHtml = await renderer(enrichedData, control);
    return wrapSection(control, contentHtml);
  }

  window.renderLayout = renderLayout;
  window.resolveLayoutProp = resolveProp;
  window.buildLayoutControl = buildLayoutControl;

  // ========================================================================
  // OPEN ITEM
  // Abre/resalta un item por id, sin importar la sección ni el layout
  // (accordion, blocks, fullscreen — todos comparten data-id en su raíz).
  // Reemplaza el antiguo openServiceAccordion (hardcodeado a "services"
  // + accordion, que ya no aplica desde que services.json usa blocks).
  // ========================================================================
  window.openItem = function(id) {
    if (!id) return;

    const el = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
    if (!el) return;

    // accordion: expandir el <details>
    if (el.tagName === 'DETAILS') {
      el.open = true;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    el.classList.add('item-highlight');
    setTimeout(() => el.classList.remove('item-highlight'), 2000);
  };

})();
