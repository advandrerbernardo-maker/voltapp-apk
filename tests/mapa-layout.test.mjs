import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,leaflet,script,sw]=await Promise.all([
  read('index.html'),read('styles.css'),read('vendor/leaflet.css'),
  read('app.js'),read('sw.js')
]);

test('O motor preferencial é MapLibre GL com ruas vetoriais OpenFreeMap e licença permitida',()=>{
  assert.match(script,/maplibre-gl@6\.16\.0\/dist\/maplibre-gl\.mjs/);
  assert.match(script,/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(html,/maplibre-gl@6\.16\.0\/dist\/maplibre-gl\.css/);
  assert.match(script,/state\.mapEngine='vector'/);
  assert.match(script,/new gl\.Map\(/);
  assert.match(script,/getContext\('webgl2'/);
  assert.match(script,/renderWorldCopies:false/);
  assert.match(script,/pixelRatio:Math\.min\(window\.devicePixelRatio\|\|1,2\)/);
});

test('Sem suporte WebGL ou sem internet há mapa Leaflet alternativo em vez de tela quebrada',()=>{
  assert.match(script,/async function initMap\(\)/);
  assert.match(script,/if\(!window\.WebGL2RenderingContext\)/);
  assert.match(script,/initRasterFallback\(\)/);
  assert.match(script,/function initRasterFallback\(\)/);
  assert.match(script,/state\.mapEngine='raster'/);
  assert.match(script,/new state\.gl\.Marker/);
  assert.match(leaflet,/\.leaflet-pane,/);
  assert.match(leaflet,/\.leaflet-tile,/);
  assert.match(html,/href="\.\/vendor\/leaflet\.css\?v=0\.1\.1"/);
  assert.doesNotMatch(html,/miZyo1Y5v3G8G8m\/NCA/);
});

test('Mapa é o primeiro elemento relevante no celular com viewport amplo',()=>{
  assert.match(css,/#explorar \.content-grid\{display:contents\}/);
  assert.match(css,/#explorar \.hero\{display:none\}/);
  assert.match(css,/#explorar \.toolbar\{order:1/);
  assert.match(css,/#explorar \.map-shell\{order:2/);
  assert.match(css,/#explorar \.list-shell\{order:3/);
  assert.match(css,/#explorar \.map-shell #map\{width:100%;height:clamp\(365px,calc\(100dvh - 258px\),800px\)\}/);
  assert.match(css,/\.map-to-list\{position:absolute/);
  assert.match(html,/id="mapToListBtn"/);
  assert.match(html,/id="mapStatus"/);
});

test('Gestos móveis e controles funcionam sem bloquear navegação',()=>{
  assert.match(script,/touchZoomRotate:true/);
  assert.match(script,/dragRotate:false/);
  assert.match(script,/cooperativeGestures:false/);
  assert.match(script,/new gl\.NavigationControl/);
  assert.match(script,/state\.map\.flyTo\(/);
  assert.match(script,/document\.querySelector\('\.list-shell'\)\?\.scrollIntoView/);
  assert.match(script,/new ResizeObserver\(refreshMapSize\)/);
  assert.match(script,/window\.addEventListener\('orientationchange'/);
  assert.match(script,/if\(state\.mapEngine==='vector'\)state\.map\.resize\(\)/);
});

test('Buscar e filtrar não força a câmera de volta ao centro',()=>{
  assert.match(script,/function renderMarkers\(stations,focus=false\)/);
  assert.match(script,/if\(focus&&stations\.length\)/);
  assert.match(script,/state\.map\.fitBounds\(bounds,\{padding:/);
  assert.match(script,/renderMarkers\(visible\);\s*refreshDestinations\(\);/);
  assert.match(script,/updateWhenIdle:true/);
});

test('Carregamento é mais leve e cards mantêm nomes legíveis',()=>{
  assert.doesNotMatch(css,/\.leaflet-tile\s*\{\s*filter:\s*(?!none)/);
  assert.match(css,/\.leaflet-tile\{filter:none\}/);
  assert.match(css,/\.station-item-name\{display:block/);
  assert.match(css,/\.station-item-address\{display:block/);
  assert.match(css,/\.maplibregl-canvas\{position:absolute;left:0;top:0;touch-action:none\}/);
});

test('PWA promove imediatamente CSS/JS novos e invalida cache obsoleto',()=>{
  assert.match(sw,/voltapp-shell-v0\.2\.0/);
  assert.match(sw,/\.\/vendor\/leaflet\.css/);
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(sw,/const isVersionedResource=/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
  assert.match(sw,/keys\.filter\(key=>key\.startsWith\('voltapp-shell-'\)/);
  assert.match(html,/app\.js\?v=0\.2\.0/);
  assert.match(html,/styles\.css\?v=0\.2\.0/);
  assert.doesNotMatch(sw,/voltapp-shell-v0\.1\.1/);
});

test('Política de dados segue sem disponibilidade em tempo real ou tarifa inventada',async()=>{
  const real=await read('data/stations.json');
  assert.deepEqual(JSON.parse(real),[]);
  assert.match(script,/s\.is_demo\?' · FICTÍCIO'/);
  assert.match(html,/não sabe se o equipamento está funcionando/i);
  assert.match(sw,/data\/stations\.json/);
});
