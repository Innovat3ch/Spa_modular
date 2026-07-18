const fs = require('fs');
const path = require('path');
const vm = require('vm');
const helpersSource = fs.readFileSync(path.resolve(__dirname, '../assets/core/helpers.js'), 'utf8');
const context = {window:{}, document:{querySelector(){return null;},querySelectorAll(){return [];},createElement(){return {};}} , console, setTimeout, clearTimeout, URL, location:{href:'http://localhost/'}, navigator:{userAgent:'node'}};
context.window = context;
context.globalThis = context;
context.window.window = context.window;
context.window.document = context.document;
context.window.console = console;
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
context.window.location = context.location;
context.window.navigator = context.navigator;
context.window.DATA_PATH = '/data/';
context.window.getConfig = () => ({});
context.window.cargarJSON = async (url) => {
  console.log('loading', url);
  if (url === '/data/catalog.json') return { items: [{ id: 'item-1', title: 'Item 1' }] };
  return null;
};
vm.createContext(context);
vm.runInContext(helpersSource, context, { filename: 'helpers.js' });
(async()=>{
  const resolved = await context.window.resolveItems([{ source: 'catalog', target: 'item-1' }]);
  console.log('resolved', JSON.stringify(resolved));
})();
