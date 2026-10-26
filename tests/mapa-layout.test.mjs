import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,leaflet,script,sw]=await Promise.all([
  read('index.html'),read('styles.css'),read('vendor/leaflet.css'),
  read('app.js'),read('sw.js')
]);

test('CSS oficial Leaflet é carregado localmente antes dos estilos do app',()=>{
  assert.match(html,/href="\.\/vendor\/leaflet\.css\?v=0\.1\.1"/);
  assert.ok(html.indexOf('vendor/leaflet.css')<html.indexOf('./styles.css'));
  assert.doesNotMatch(html,/miZyo1Y5v3G8G8m\/NCA/);
  assert.match(leaflet,/\.leaflet-pane,/);
  assert.match(leaflet,/\.leaflet-tile,/);
  assert.match(leaflet,/position:\s*absolute/);
  assert.match(leaflet,/\.leaflet-control/);
});

test('O mapa móvel não aplica filtros caros às imagens e mantém altura',()=>{
  assert.doesNotMatch(css,/\.leaflet-tile\s*\{\s*filter:\s*(?!none)/);
  assert.match(css,/\.map-shell #map\{height:clamp\(330px,51vh,420px\);width:100%\}/);
  assert.match(css,/\.hero\{padding:21px 20px;min-height:0\}/);
  assert.match(css,/\.station-item-name\{display:block/);
  assert.match(css,/\.station-item-address\{display:block/);
});

test('Mapa recalcula tamanho quando a tela muda sem recentralizar a cada busca',()=>{
  assert.match(script,/new ResizeObserver\(\(\)=>refreshMapSize\(\)\)/);
  assert.match(script,/invalidateSize\(\{pan:false/);
  assert.match(script,/window\.addEventListener\('orientationchange'/);
  assert.match(script,/function renderMarkers\(stations,focus=false\)/);
  assert.match(script,/if\(focus && stations\.length\)/);
  assert.match(script,/updateWhenIdle:true/);
  assert.match(script,/tileErrors===5/);
});

test('Aplicativo PWA elimina cache antigo e atualiza página e CSS pela rede',()=>{
  assert.match(sw,/voltapp-shell-v0\.1\.1/);
  assert.match(sw,/\.\/vendor\/leaflet\.css/);
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(sw,/const isVersionedResource=/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
  assert.match(sw,/keys\.filter\(key=>key\.startsWith\('voltapp-shell-'\)/);
  assert.match(html,/app\.js\?v=0\.1\.1/);
});

test('Sem funcionamento ao vivo ou tarifas fictícias como fatos',async()=>{
  const real=await read('data/stations.json');
  assert.deepEqual(JSON.parse(real),[]);
  assert.match(script,/s\.is_demo\?' · FICTÍCIO'/);
  assert.match(html,/não sabe se o equipamento está funcionando/i);
});
