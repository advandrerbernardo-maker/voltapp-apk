import {formatBRL,daysSince,isTariffVerified,validateStation,tariffLabel,estimateRoute} from './logic.mjs';

const $=id=>document.getElementById(id);
const state={real:[],example:[],demo:false,map:null,markers:[],currentCoords:null,routing:false,installPrompt:null,mapEngine:null,gl:null,userMarker:null};
const center=[-3.119027,-60.021731]; // Centro de Manaus, apenas referência de enquadramento.
const tabLabels={explorar:'Explorar eletropostos',planejar:'Planejar viagem',clube:'Clube VIP',sobre:'Sobre os dados'};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const distanceFormat=x=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(x);
const visibleStations=()=>state.demo?state.example:state.real;
const shownStations=()=>{
  const search=$('searchInput').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const connector=$('connectorSelect').value;
  return visibleStations().filter(s=>[s.name,s.operator,s.address,s.city,s.state].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(search)&&
    (connector==='all'||s.connectors.includes(connector)));
};
let toastTimer;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),4000)}
function switchTab(tab){
  if(!tabLabels[tab])tab='explorar';
  document.querySelectorAll('.view').forEach(el=>{const active=el.id===tab;el.hidden=!active;el.classList.toggle('active',active)});
  document.querySelectorAll('[data-tab]').forEach(btn=>{const active=btn.dataset.tab===tab;btn.classList.toggle('active',active);if(btn.classList.contains('nav-link')||btn.classList.contains('bottom-link'))btn.setAttribute('aria-current',active?'page':'false')});
  $('pageTitle').textContent=tabLabels[tab];
  if(tab==='explorar'&&state.map){
    requestAnimationFrame(refreshMapSize);
    setTimeout(refreshMapSize,180);
  }
  window.scrollTo({top:0,behavior:'instant'});
}
function safeNavigate(tab){switchTab(tab);if(location.hash!=='#'+tab)history.replaceState(null,'','#'+tab)}
function renderList(){
  const visible=shownStations();const all=visibleStations();
  $('stationCount').textContent=String(visible.length);$('mapCount').textContent=all.length+' CADASTRADOS';
  $('listSubtitle').textContent=state.demo?'Exemplos fictícios de interface':'Locais registrados com dados reais';
  const list=$('stationList');list.replaceChildren();
  if(!visible.length){
    const div=document.createElement('div');div.className='empty-state';
    div.innerHTML=state.demo?'<span class="empty-illustration">⌕</span><strong>Nenhum exemplo encontrado</strong><p>Tente outra busca ou retire o filtro de conector.</p>':
      '<span class="empty-illustration">ϟ</span><strong>Seu mapa começa aqui.</strong><p>Ainda não há eletropostos reais verificados nesta base piloto. Não inventaremos pontos nem preços.</p><small>Ative a demonstração abaixo para conhecer a interface.</small>';
    list.appendChild(div);
  }
  for(const s of visible){
    const btn=document.createElement('button');btn.className='station-item';btn.type='button';
    const price=tariffLabel(s);
    btn.innerHTML='<span class="station-chip" aria-hidden="true">ϟ</span><span class="station-item-inner"><span class="station-item-name">'+escapeHTML(s.name)+'</span><span class="station-item-address">'+escapeHTML(s.address)+'</span><span class="station-item-meta">'+
      '<span class="small-chip '+(s.is_demo?'demo':'')+'">'+escapeHTML(s.is_demo?'FICTÍCIO':isTariffVerified(s)?'TARIFA VERIFICADA':'VERIFICAÇÃO PENDENTE')+'</span>'+
      '<span class="small-chip">'+escapeHTML(price)+'</span></span></span><span aria-hidden="true">›</span>';
    btn.addEventListener('click',()=>openStation(s));list.appendChild(btn);
  }
  renderMarkers(visible);
  refreshDestinations();
}
function mapIcon(s){return window.L.divIcon({className:'map-pin-wrap',html:'<div class="map-pin '+(s.is_demo?'demo-pin':'')+'">ϟ</div>',iconSize:[36,36],iconAnchor:[18,18]})}
// Renderização vetorial WebGL acelera gestos e zoom; Leaflet permanece como fallback.
const MAPLIBRE_MODULE='https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';
const VECTOR_STYLE='https://tiles.openfreemap.org/styles/liberty';
let mapResizeFrame=0;
let mapResizeObserver=null;
let mapControlsBound=false;
function refreshMapSize(){
  if(!state.map||$('explorar').hidden)return;
  if(mapResizeFrame)cancelAnimationFrame(mapResizeFrame);
  mapResizeFrame=requestAnimationFrame(()=>{
    mapResizeFrame=0;
    if(!state.map||$('explorar').hidden)return;
    if(state.mapEngine==='vector')state.map.resize();
    else state.map.invalidateSize({pan:false,debounceMoveend:true});
  });
}
function bindMapResize(){
  if(mapControlsBound)return;
  mapControlsBound=true;
  const elem=$('map');
  if('ResizeObserver' in window){
    mapResizeObserver=new ResizeObserver(refreshMapSize);
    mapResizeObserver.observe(elem);
  }
  window.addEventListener('orientationchange',()=>setTimeout(refreshMapSize,240));
  window.addEventListener('resize',refreshMapSize,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)refreshMapSize();
  });
}
function makePin(s,extra=''){
  const div=document.createElement('div');
  div.className='map-pin '+(s?.is_demo?'demo-pin ':'')+extra;
  div.textContent='ϟ';
  div.setAttribute('aria-label',s?.name||'Localização');
  return div;
}
function initRasterFallback(){
  const elem=$('map');
  elem.replaceChildren();
  if(!window.L){
    elem.innerHTML='<div class="map-loading">O mapa não pôde ser carregado. Confira sua conexão. A lista de locais continua disponível.</div>';
    state.map=null;state.mapEngine=null;
    return;
  }
  state.mapEngine='raster';
  state.map=window.L.map(elem,{
    zoomControl:true,scrollWheelZoom:false,
    preferCanvas:true,fadeAnimation:false,
    inertia:true,inertiaDeceleration:2400,
    wheelPxPerZoomLevel:80
  }).setView(center,12,{animate:false});
  const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,updateWhenIdle:true,keepBuffer:2,detectRetina:false,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  });
  let failures=0;
  tiles.on('tileerror',()=>{if(++failures===5)toast('Algumas imagens do mapa não carregaram. Verifique a internet.')});
  tiles.addTo(state.map);
  renderMarkers(shownStations(),true);
  bindMapResize();
  setTimeout(refreshMapSize,180);
}
async function loadMapLibre(){
  // A rota CDN tem limite curto; falhas de rede/WebGL não devem bloquear o app.
  let timeout;
  try{
    return await Promise.race([
      import(MAPLIBRE_MODULE),
      new Promise((_,reject)=>{
        timeout=setTimeout(()=>reject(new Error('Biblioteca vetorial demorou a responder')),7000);
      })
    ]);
  }finally{clearTimeout(timeout)}
}
async function initMap(){
  const elem=$('map');
  if(!window.WebGL2RenderingContext){
    initRasterFallback();
    return;
  }
  let map=null;
  try{
    const gl=await loadMapLibre();
    if(!gl?.Map||!gl?.Marker)throw new Error('Módulo MapLibre incompleto');
    const gpuTest=document.createElement('canvas');
    if(!gpuTest.getContext('webgl2',{failIfMajorPerformanceCaveat:true})){
      throw new Error('WebGL acelerado indisponível neste aparelho');
    }
    elem.replaceChildren();
    map=new gl.Map({
      container:elem,
      style:VECTOR_STYLE,
      center:[center[1],center[0]],
      zoom:12,
      pixelRatio:Math.min(window.devicePixelRatio||1,2),
      minZoom:3,
      maxZoom:19,
      bearing:0,pitch:0,maxPitch:0,
      dragRotate:false,touchPitch:false,
      touchZoomRotate:true,
      cooperativeGestures:false,
      attributionControl:true,
      renderWorldCopies:false,
      fadeDuration:0,
      antialias:false,
      trackResize:true
    });
    let failures=0;
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        if(error)reject(error);
        else resolve();
      };
      const timer=setTimeout(()=>finish(new Error('Mapa vetorial demorou a carregar')),10500);
      map.once('load',()=>finish());
      map.on('error',e=>{
        // Uma falha isolada de tile não deve desmontar o mapa.
        if(++failures>=6&&!settled)finish(new Error('Falha ao baixar o mapa vetorial'));
        if(settled&&failures===8)toast('Parte do mapa não carregou. Confira a internet.');
      });
    });
    state.gl=gl;state.map=map;state.mapEngine='vector';
    map.addControl(new gl.NavigationControl({showCompass:false,visualizePitch:false}),'bottom-right');
    renderMarkers(shownStations(),true);
    bindMapResize();
    refreshMapSize();
    $('mapStatus').textContent='Mapa vetorial · arraste com 1 dedo, amplie com 2';
  }catch(error){
    console.warn('Mapa vetorial indisponível; ativando mapa alternativo:',error?.message||error);
    try{map?.remove()}catch(_){}
    state.map=null;state.gl=null;
    initRasterFallback();
    $('mapStatus').textContent='Modo compatibilidade · mapa com gestos';
  }
}
function renderMarkers(stations,focus=false){
  if(!state.map)return;
  if(state.mapEngine==='vector'){
    state.markers.forEach(m=>m.remove());
    state.markers=[];
    for(const s of stations){
      const pin=makePin(s);
      pin.style.cursor='pointer';
      const marker=new state.gl.Marker({element:pin,anchor:'center'})
        .setLngLat([s.longitude,s.latitude]).addTo(state.map);
      pin.addEventListener('click',()=>openStation(s));
      state.markers.push(marker);
    }
    if(focus&&stations.length){
      if(stations.length===1){
        const s=stations[0];
        state.map.easeTo({center:[s.longitude,s.latitude],zoom:Math.max(13,state.map.getZoom()),duration:400});
      }else{
        const bounds=new state.gl.LngLatBounds();
        for(const s of stations)bounds.extend([s.longitude,s.latitude]);
        state.map.fitBounds(bounds,{padding:{top:65,bottom:85,left:45,right:45},maxZoom:13,duration:420});
      }
    }else if(focus){
      state.map.jumpTo({center:[center[1],center[0]],zoom:12});
    }
  }else if(state.mapEngine==='raster'&&window.L){
    state.markers.forEach(m=>state.map.removeLayer(m));state.markers=[];
    for(const s of stations){
      const marker=window.L.marker([s.latitude,s.longitude],{icon:mapIcon(s)})
        .addTo(state.map).bindTooltip(escapeHTML(s.name)+(s.is_demo?' · FICTÍCIO':''));
      marker.on('click',()=>openStation(s));state.markers.push(marker);
    }
    if(focus&&stations.length){
      const group=window.L.featureGroup(state.markers);
      state.map.fitBounds(group.getBounds().pad(.25),{maxZoom:13,animate:true,duration:0.35});
    }else if(focus)state.map.setView(center,12,{animate:false});
  }
  refreshMapSize();
}
function sourceMarkup(s){
  if(s.is_demo)return '<span style="color:#ffd38a">Exemplo fictício — nenhuma fonte real.</span>';
  if(typeof s.source_url==='string'&&/^https:\/\//.test(s.source_url)){
    const safe=escapeHTML(s.source_url);
    return '<a class="source-link" href="'+safe+'" target="_blank" rel="noopener noreferrer">Consultar fonte original ↗</a>';
  }
  return 'Fonte ainda não informada';
}
function modalRow(label,value){return '<div class="modal-row"><span>'+escapeHTML(label)+'</span><span>'+escapeHTML(value)+'</span></div>'}
function openStation(s){
  const t=s.tariff||{};
  const status=s.is_demo?'DEMONSTRAÇÃO FICTÍCIA':isTariffVerified(s)?'TARIFA VERIFICADA EM DATA':'TARIFA NÃO CONFIRMADA';
  const age=daysSince(s.verified_at);
  const verification=s.is_demo?'Não se aplica (exemplo)':s.verified_at?new Date(s.verified_at+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'})+(age!==null?' · há '+age+' dia(s)':''):'Não disponível';
  $('modalContent').innerHTML=
    '<h2 id="modalTitle" class="modal-title">'+escapeHTML(s.name)+'</h2><p class="modal-subtitle">'+escapeHTML(s.address)+' · '+escapeHTML(s.city)+'/ '+escapeHTML(s.state)+'</p>'+
    '<div class="modal-tags"><span class="small-chip '+(s.is_demo?'demo':'')+'">'+escapeHTML(status)+'</span>'+s.connectors.map(c=>'<span class="small-chip">'+escapeHTML(c)+'</span>').join('')+'</div>'+
    '<div class="modal-section"><h3>Tarifas e condições</h3>'+modalRow('Preço documentado',tariffLabel(s))+modalRow('Taxa por sessão',t.session_fee_brl==null?'Não confirmada':formatBRL(t.session_fee_brl))+
    modalRow('Estacionamento',s.parking||'Não confirmado')+modalRow('Operador',s.operator||'Não informado')+'</div>'+
    '<div class="modal-section"><h3>Acesso e equipamento</h3>'+modalRow('Horário de acesso',s.hours)+modalRow('Regras de acesso',s.access_rules)+modalRow('Potência nominal',s.power_kw? s.power_kw+' kW':'Não confirmada')+'</div>'+
    '<div class="modal-section"><h3>Rastreabilidade</h3>'+modalRow('Última verificação',verification)+'<div class="modal-row"><span>Origem</span><span>'+sourceMarkup(s)+'</span></div></div>'+
    '<div class="modal-warning">'+(s.is_demo?'ATENÇÃO: todas as informações desta ficha são inventadas apenas para demonstrar a experiência. Não é um eletroposto confirmado.':'Os dados refletem apenas a data informada. Este aplicativo não confirma se o carregador está funcionando ou livre em tempo real. Consulte o operador antes de se deslocar.')+'</div>'+
    '<button id="stationPlanBtn" class="modal-action">↗ Planejar até este ponto</button>';
  $('stationModal').hidden=false;document.body.style.overflow='hidden';
  $('stationPlanBtn').addEventListener('click',()=>{closeModal();safeNavigate('planejar');$('destinationSelect').value=s.id});
}
function closeModal(){ $('stationModal').hidden=true; document.body.style.overflow=''; }
function refreshDestinations(){
  const select=$('destinationSelect');const current=select.value;
  select.replaceChildren(new Option('Selecione um posto para simular',''));
  for(const s of visibleStations()){select.add(new Option(s.name+(s.is_demo?' [EXEMPLO FICTÍCIO]':''),s.id))}
  if(visibleStations().some(x=>x.id===current))select.value=current;
}
async function loadStations(){
  try{
    const resp=await fetch('./data/stations.json',{cache:'no-store'});if(!resp.ok)throw new Error('HTTP '+resp.status);
    const stations=await resp.json();if(!Array.isArray(stations))throw new Error('Arquivo de dados inválido');
    const accepted=stations.filter(validateStation).filter(x=>!x.is_demo);
    const ids=new Set();state.real=accepted.filter(x=>!ids.has(x.id)&&ids.add(x.id));
    if(accepted.length!==stations.length)toast('Alguns registros inválidos foram ignorados.');
  }catch(err){console.error('Falha ao carregar dados reais:',err);toast('Não foi possível atualizar a lista de locais.');}
  try{const resp=await fetch('./data/stations.example.json');const json=await resp.json();state.example=json.filter(validateStation).filter(x=>x.is_demo)}
  catch(err){console.warn('Sem exemplos para demonstração',err);state.example=[]}
  renderList();
}
function getGPS(){return new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('GPS indisponível'));
  navigator.geolocation.getCurrentPosition(({coords})=>resolve([coords.latitude,coords.longitude]),()=>reject(new Error('A localização não foi autorizada ou não pôde ser obtida.')),{enableHighAccuracy:false,timeout:10000,maximumAge:120000});
})}
async function geolocate(){
  try{
    const coords=await getGPS();
    state.currentCoords=coords;
    if(state.map){
      if(state.userMarker){
        if(state.mapEngine==='vector')state.userMarker.remove();
        else state.map.removeLayer(state.userMarker);
      }
      if(state.mapEngine==='vector'){
        const el=document.createElement('div');
        el.className='map-pin marker-user';
        el.textContent='●';
        el.title='Sua localização aproximada';
        state.userMarker=new state.gl.Marker({element:el,anchor:'center'})
          .setLngLat([coords[1],coords[0]]).addTo(state.map);
        state.map.flyTo({center:[coords[1],coords[0]],zoom:15,duration:550,essential:true});
      }else if(state.mapEngine==='raster'){
        state.map.setView(coords,14,{animate:true});
        const icon=window.L.divIcon({className:'map-pin-wrap',html:'<div class="map-pin marker-user">●</div>',iconSize:[36,36],iconAnchor:[18,18]});
        state.userMarker=window.L.marker(coords,{icon}).addTo(state.map).bindPopup('Sua localização aproximada');
      }
    }
    toast('Mapa centralizado na sua localização aproximada.');
  }catch(e){toast(e.message)}
}
function showRouteResult({route,station,isDemo}){
  const el=$('routeResult');el.className='calc-card';
  const warning=route.feasible?'<div class="calc-warning calc-good">A autonomia estimada cobre este trecho com a reserva definida. Isso não garante que o percurso real será viável em todas as condições.</div>':
    '<div class="calc-warning">Atenção: este trecho excede a autonomia estimada com reserva. Uma parada intermediária é necessária; este protótipo ainda não calcula a sequência de paradas.</div>';
  const cost=route.costBrl==null?'Não estimável':formatBRL(route.costBrl);
  el.innerHTML='<p class="calc-meta">Distância rodoviária estimada</p><div class="calc-value">'+distanceFormat(route.distanceKm)+' km</div>'+[
    ['Energia da viagem',distanceFormat(route.energyKwh)+' kWh'],
    ['Autonomia com reserva',distanceFormat(route.maxDistanceKm)+' km'],
    ['Energia para repor na tomada',distanceFormat(route.rechargeGridKwh)+' kWh'],
    ['Custo da reposição estimado',cost]
  ].map(([key,val])=>'<div class="calc-detail"><span>'+escapeHTML(key)+'</span><strong>'+escapeHTML(val)+'</strong></div>').join('')+
    warning+'<p class="caption">'+escapeHTML(route.costReason)+'</p>'+
    (isDemo?'<div class="modal-warning">Simulação com posto e tarifa FICTÍCIOS. Não use estes valores para viajar.</div>':'');
}
async function planRoute(event){
  event.preventDefault();if(state.routing)return;
  const s=visibleStations().find(s=>s.id===$('destinationSelect').value);
  if(!s){toast('Selecione primeiro um eletroposto.');return}
  let origin=center;
  if($('originPreset').value==='current'){
    try{origin=state.currentCoords||await getGPS();state.currentCoords=origin}
    catch(e){toast(e.message);return}
  }
  const consumption=Number($('consumption').value),battery=Number($('battery').value),chargeStart=Number($('chargeStart').value),reserve=Number($('chargeReserve').value),eff=Number($('chargeEfficiency').value);
  if([consumption,battery,chargeStart,reserve,eff].some(x=>!Number.isFinite(x))||reserve>=chargeStart){toast('Preencha os dados do veículo e deixe a reserva menor que a bateria inicial.');return}
  const submit=event.target.querySelector('button[type="submit"]');const original=submit.textContent;submit.disabled=true;submit.textContent='Calculando trajeto...';state.routing=true;
  try{
    // OSRM público somente como demonstração técnica. Produção exige serviço apropriado com SLA/licença.
    const url=`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${s.longitude},${s.latitude}?overview=false&steps=false`;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    let resp;
    try{resp=await fetch(url,{signal:controller.signal})}finally{clearTimeout(timeout)}
    if(!resp.ok)throw new Error('Serviço de rotas indisponível. Tente novamente.');
    const data=await resp.json();
    const distance=data?.routes?.[0]?.distance;
    if(data.code!=='Ok'||!Number.isFinite(distance))throw new Error('Não foi possível encontrar um trajeto rodoviário válido.');
    const route=estimateRoute({distanceKm:distance/1000,consumptionKwh100:consumption,batteryKwh:battery,startPct:chargeStart,reservePct:reserve,efficiencyPct:eff,station:s});
    showRouteResult({route,station:s,isDemo:s.is_demo});
  }catch(err){console.error(err);toast(err.name==='AbortError'?'A consulta de rotas expirou.':err.message||'Não foi possível calcular a rota.');}
  finally{submit.disabled=false;submit.textContent=original;state.routing=false}
}
async function init(){
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>safeNavigate(btn.dataset.tab)));
  $('searchInput').addEventListener('input',renderList);$('connectorSelect').addEventListener('change',renderList);
  $('demoToggle').addEventListener('change',e=>{state.demo=e.target.checked;$('searchInput').value='';$('connectorSelect').value='all';renderList();renderMarkers(shownStations(),true);toast(state.demo?'MODO DEMONSTRAÇÃO: todos os postos e preços exibidos são fictícios.':'Demonstração desativada. Somente dados reais cadastrados aparecerão.')});
  $('geolocateBtn').addEventListener('click',geolocate);
  $('mapToListBtn')?.addEventListener('click',()=>document.querySelector('.list-shell')?.scrollIntoView({behavior:'smooth',block:'start'}));
  $('routeForm').addEventListener('submit',planRoute);
  $('modalClose').addEventListener('click',closeModal);
  $('stationModal').addEventListener('click',e=>{if(e.target.dataset.close==='true')closeModal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  const hash=location.hash.slice(1);switchTab(tabLabels[hash]?hash:'explorar');
  window.addEventListener('hashchange',()=>switchTab(location.hash.slice(1)));
  await loadStations();initMap();
  if('serviceWorker'in navigator && /^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SW',err));
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;$('installBtn').hidden=false});
$('installBtn').addEventListener('click',async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('installBtn').hidden=true});
init();
