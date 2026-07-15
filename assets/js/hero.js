// ==========================================================================
// hero.js - Módulo Hero
// Delega todo el renderizado a layout.js (fachada)
// ==========================================================================

window.load = async function(config, key) {
  const root = document.getElementById('app');
  if (!root) return;

  const data = await window.cargarJSON(`/data/${key}.json`) || {};

  // La fachada se encarga de normalizar layouts e inyectar HTML completo
  const html = await window.renderLayout(data, config);
  root.innerHTML = html;

  // Post-render: ajustes específicos del hero sin romper clases core
  if (window.setup?.after) await window.setup.after(data, config);
};

window.setup = {
  after: async function(data, config) {
    const section = document.querySelector('#app section');
    if (!section) return;

    section.id = 'hero';

    const dm = getComputedStyle(section).getPropertyValue('--dark-mode').trim();
    if (dm === '1') section.setAttribute('data-dark', '1');
  }
};
