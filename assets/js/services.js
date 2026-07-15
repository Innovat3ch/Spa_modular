// ==========================================================================
// services.js — Módulo Services
// ==========================================================================
window.load = async function (config, key) {
  const root = document.getElementById('app');
  if (!root) return;

  const data = await window.cargarJSON(`/data/${key}.json`) || {};
  const html = await window.renderLayout(data, config);
  root.innerHTML = html;

  if (window.setup?.after) await window.setup.after(data, config);
};

window.setup = {
  after: async function (data, config) {
    const section = document.querySelector('#app section');
    if (!section) return;

    section.id = 'services';

    const dm = getComputedStyle(section).getPropertyValue('--dark-mode').trim();
    if (dm === '1') section.setAttribute('data-dark', '1');
  }
};
