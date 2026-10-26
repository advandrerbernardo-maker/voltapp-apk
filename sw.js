// Voltapp 0.2.0: prioriza mapa vetorial WebGL e interface móvel tipo navegador de mapas.
const CACHE='voltapp-shell-v0.2.0';
const STATIC=[
  './','./index.html','./styles.css','./app.js','./logic.mjs',
  './vendor/leaflet.css','./data/stations.example.json',
  './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('voltapp-shell-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  // Nunca utilizar tarifas antigas em cache para comparações de custo.
  if(url.pathname.endsWith('/data/stations.json')){
    event.respondWith(
      fetch(request,{cache:'no-store'}).catch(()=>
        new Response('[]',{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
      )
    );
    return;
  }
  const isPage=request.mode==='navigate';
  const isVersionedResource=/\.(?:css|js|mjs)$/i.test(url.pathname);
  if(isPage||isVersionedResource){
    // HTML e código: rede primeiro; se offline, usar somente a versão local disponível.
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(async response=>{
        if(response.ok){
          const cache=await caches.open(CACHE);
          await cache.put(isPage?'./index.html':request,response.clone());
        }
        return response;
      }).catch(async()=>{
        const cache=await caches.open(CACHE);
        return (await cache.match(isPage?'./index.html':request,{ignoreSearch:true}))||
          new Response('Sem conexão: abra o Voltapp novamente quando a internet retornar.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      })
    );
    return;
  }
  event.respondWith(
    caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetch(request))
  );
});
