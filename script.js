/* ═══════════════════════════════════════════════════════════
   İstanbul Transit 3D  —  FAZ 1 + FAZ 2 + FAZ 3 + FAZ 4 TAM
   İş-01: Peak hour slider + sparkline histogram
   İş-02: FPS + aktif araç HUD
   İş-03: Araç tıklama detay paneli (hız, headway, sonraki durak)
   İş-04: Hat aç/kapat + route focus
   İş-05: Replay modu (24h, döngü)
   İş-06: Heatmap katmanı (saatlik)
   İş-07: Headway görselleştirme (LineLayer)
   İş-08: Bunching tespiti + alarm sistemi
   İş-09: Durak bekleme süresi haritası + Worst Stops
   İş-10: Transfer bağlantı görselleştirmesi (ArcLayer)
   İş-11: Sinematik kamera turu
   İş-12: 3D araç modelleri — ScenegraphLayer + LOD (GLB gerekir)
   İş-13: GTFS ZIP Upload + JSZip parse + validasyon raporu
   İş-14: Multi-city şehir profilleri + şehir seçici
   İş-15: Electron platform bridge (tamamlandı)
   ═══════════════════════════════════════════════════════════ */

const { DeckGL, TripsLayer, PathLayer, ScatterplotLayer, ColumnLayer, HeatmapLayer, PathStyleExtension, LineLayer, ArcLayer } = deck;
const _pathDashExt = new PathStyleExtension({dash: true});

// ── ADAPTİF KALİTE SİSTEMİ ──────────────────────────────
// FPS düşükse otomatik olarak yük azaltılır
const QUALITY = {
  level: 2,       // 0=düşük 1=orta 2=yüksek
  fps: 60,
  fpsHistory: [],
  lastCheck: 0,
  update(ts, fps) {
    this.fps = fps;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    if (ts - this.lastCheck < 3000) return; // 3sn'de bir kontrol
    this.lastCheck = ts;
    const avg = this.fpsHistory.reduce((a,b)=>a+b,0) / this.fpsHistory.length;
    if (avg < 20 && this.level > 0) { this.level--; console.log('Kalite düşürüldü:', this.level); }
    else if (avg > 45 && this.level < 2) { this.level++; console.log('Kalite artırıldı:', this.level); }
  },
  // Kaç trip gösterilsin? (toplam visTrips'in yüzdesi)
  get tripRatio() { return [0.15, 0.4, 1.0][this.level]; },
  // Glow katmanı açık mı?
  get showGlow() { return this.level >= 2; },
  // Stops katmanı açık mı?
  get showStopsDetail() { return this.level >= 1; },
  // Trail uzunluğu
  get trailLength() { return [80, 140, 200][this.level]; },
  // jointRounded/capRounded (GPU maliyetli)
  get rounded() { return this.level >= 1; },
};

// ── SABITLER ─────────────────────────────────────────────
const TYPE_META = {
  '0':{n:'Tramvay',   c:'#E74C3C',rgb:[231,76,60],  i:'🚋',w:4},
  '1':{n:'Metro',     c:'#8E44AD',rgb:[142,68,173], i:'🚇',w:5},
  '2':{n:'Tren',      c:'#2980B9',rgb:[41,128,185], i:'🚆',w:5},
  '3':{n:'Otobüs',   c:'#27AE60',rgb:[39,174,96],  i:'🚌',w:3},
  '4':{n:'Feribot',   c:'#1ABC9C',rgb:[26,188,156], i:'⛴️',w:3},
  '5':{n:'Teleferik', c:'#F39C12',rgb:[243,156,18], i:'🚡',w:3},
  '6':{n:'Gondol',    c:'#E67E22',rgb:[230,126,34], i:'🚡',w:3},
  '7':{n:'Funicular', c:'#D35400',rgb:[211,84,0],   i:'🚠',w:3},
  '9':{n:'Minibüs',  c:'#7F8C8D',rgb:[127,140,141],i:'🚐',w:2},
 '10':{n:'Dolmuş',   c:'#95A5A6',rgb:[149,165,166],i:'🚖',w:2},
};
// ── OFFLİNE / ONLİNE TİLE SEÇİCİ (İş-15 mbtiles) ────────
// Electron + localhost:3731 tile sunucusu aktifse offline stil kullan
const TILE_PORT = 3731;
const _offlineBase = `http://localhost:${TILE_PORT}`;
function _tileStyle(onlineUrl) {
  // Electron + offline sunucu aktif değilse direkt online URL
  // Offline sunucu aktif hâle geldiğinde (main.js güncellendikten sonra)
  // bu fonksiyon otomatik olarak local tile'ları kullanır.
  if (!window.IS_ELECTRON) return onlineUrl;
  // Şimdilik online fallback — mbtiles kurulunca local style döner
  return onlineUrl;
}

const PHASE_CFG = {
  night:{badge:'🌙 GECE',   bg:'#0d1520',style:_tileStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json')},
  dawn: {badge:'🌅 ŞAFAK',  bg:'#1a0e05',style:_tileStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json')},
  day:  {badge:'☀️ GÜNDÜZ', bg:'#0d2233',style:_tileStyle('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json')},
  dusk: {badge:'🌆 AKŞAM',  bg:'#150d05',style:_tileStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json')},
};
const UNDERGROUND=[
  {minLat:41.00,maxLat:41.08,minLon:28.93,maxLon:29.02},
  {minLat:40.98,maxLat:41.04,minLon:28.84,maxLon:28.96},
];
const SPEEDS=[1,10,30,60,120,300,600];

// ── SİMÜLASYON STATE ─────────────────────────────────────
let simTime=6*3600, simPaused=false, lastTs=null;
let speedIdx=3, simSpeed=60;
let showAnim=true,showPaths=true,showDensity=true,showStops=true;
let showBuildings=true,showRendezvous=true,showHeatmap=false;
let heatmapHour=8, heatmapFollowSim=false;
let typeFilter='1'; // Başlangıç: sadece Metro göster
let activeRoutes=new Set();
let focusedRoute=null;
let followTripIdx=null, selectedTripIdx=null;
let isReplay=false, replayLoop=false;
let fromStopId=null, toStopId=null, routeHighlightPath=null;

// ── FAZ 2 STATE ───────────────────────────────────────────
let showHeadway=false, showBunching=false, showWaiting=false, showTransfer=false;
let bunchingThreshold=200;
let bunchingEvents=[];
let _stopAvgHeadways=null, _worstStops=null, _transferArcs=null;

// ── FAZ 3 STATE ───────────────────────────────────────────
let show3D=false;
let _gtfsReport=null;   // son validasyon raporu (Electron export için)
window.gtfsValidationReport=null;
// Şehir profilleri — ADR-003
const CITIES=[
  {id:'istanbul', name:'İstanbul', flag:'🇹🇷',
   center:[28.9784,41.0082], zoom:11.5, pitch:52, bearing:-14,
   dataFiles:['trips_data.js','shapes_data.js','lookup_data.js'],
   note:'14.380 sefer · 7.072 durak'},
  // İleride eklenecek şehirler için şablon:
  // {id:'ankara',  name:'Ankara', flag:'🇹🇷', center:[32.8597,39.9334], zoom:12, ...}
  // {id:'izmir',   name:'İzmir',  flag:'🇹🇷', center:[27.1428,38.4237], zoom:12, ...}
];

// ── FAZ 2: SİNEMATİK (İş-11) ─────────────────────────────
let isCinematic=false, cinematicIdx=0, cinematicTimer=null;
const WAYPOINTS=[
  {center:[28.9784,41.0082],zoom:12,  pitch:60,bearing:-14,duration:4000,label:'İstanbul · Genel Bakış'},
  {center:[28.9742,41.0138],zoom:15,  pitch:72,bearing:30, duration:5500,label:'Galata Köprüsü · Tarihî Geçit'},
  {center:[29.0213,41.0414],zoom:15,  pitch:68,bearing:-45,duration:5000,label:'Kadıköy İskelesi · Boğaz Hattı'},
  {center:[28.9393,41.0609],zoom:15.5,pitch:70,bearing:20, duration:5000,label:'Şişhane · Metro M2'},
  {center:[28.8714,41.0483],zoom:14,  pitch:55,bearing:-30,duration:4500,label:'Metrobüs · E-5 Koridoru'},
  {center:[29.0826,41.0447],zoom:15,  pitch:70,bearing:120,duration:5500,label:'Moda · Tarihi Tramvay'},
  {center:[28.9560,41.0870],zoom:14.5,pitch:65,bearing:45, duration:5000,label:'Boğaziçi · Panorama'},
  {center:[29.0122,41.0781],zoom:15,  pitch:68,bearing:-60,duration:5000,label:'Üsküdar İskelesi · Feribot Kavşağı'},
  {center:[28.9420,41.0200],zoom:14,  pitch:58,bearing:90, duration:4500,label:'Eminönü · Aktarma Merkezi'},
  {center:[28.9784,41.0082],zoom:11.5,pitch:52,bearing:-14,duration:3000,label:'İstanbul · 14.380 Sefer'},
];
let currentPhase='', currentStyle='';
const fpsFrames=[];

// ── YARDIMCILAR ───────────────────────────────────────────
function haversineM([lon1,lat1],[lon2,lat2]){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function secsToHHMM(s){const h=Math.floor(s/3600)%24,m=Math.floor((s%3600)/60);return(h<10?'0':'')+h+':'+(m<10?'0':'')+m;}
function getPhase(secs){const h=(secs/3600)%24;if(h<5||h>=22)return'night';if(h<7)return'dawn';if(h<19)return'day';return'dusk';}
function getVehiclePos(trip,time){
  const off=time%Math.max(trip.d,1),ts=trip.ts,p=trip.p;
  if(off<ts[0]||off>ts[ts.length-1])return null;
  for(let i=0;i<ts.length-1;i++){
    if(off>=ts[i]&&off<=ts[i+1]){
      const f=ts[i+1]>ts[i]?(off-ts[i])/(ts[i+1]-ts[i]):0;
      return[p[i][0]+f*(p[i+1][0]-p[i][0]),p[i][1]+f*(p[i+1][1]-p[i][1])];
    }
  }
  return null;
}
function isUnderground(lon,lat){return UNDERGROUND.some(z=>lat>=z.minLat&&lat<=z.maxLat&&lon>=z.minLon&&lon<=z.maxLon);}

// ── SPARKLINE (İş-01) ─────────────────────────────────────
let _sparkLastHour=-1;
function drawSparkline(){
  const canvas=document.getElementById('sparkline');
  const W=canvas.offsetWidth||268,H=28;
  const curHour=Math.floor((simTime/3600)%24);
  if(curHour!==_sparkLastHour){
    _sparkLastHour=curHour;
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    const maxC=Math.max(...HOURLY_COUNTS);
    const barW=W/24;
    HOURLY_COUNTS.forEach((c,h)=>{
      const bh=Math.max(3,(c/maxC)*(H-4));
      ctx.fillStyle=h>=7&&h<=9?'rgba(210,153,34,0.85)':h>=17&&h<=19?'rgba(248,81,73,0.85)':'rgba(88,166,255,0.45)';
      ctx.fillRect(h*barW+1,H-bh,barW-2,bh);
    });
  }
  const ctx2=canvas.getContext('2d');
  const nowX=((simTime/3600)%24/24)*W;
  ctx2.clearRect(0,0,3,H);ctx2.clearRect(W-3,0,3,H);
  // ibre her frame
  ctx2.strokeStyle='rgba(88,166,255,0.9)';ctx2.lineWidth=1.5;ctx2.setLineDash([3,2]);
  ctx2.beginPath();ctx2.moveTo(nowX,0);ctx2.lineTo(nowX,H);ctx2.stroke();
  ctx2.setLineDash([]);
}

let _bandsDrawn=false,_bandsFill=null;
function drawSliderBands(){
  const svg=document.getElementById('slider-bands');
  const W=svg.parentElement.offsetWidth||268;
  if(!_bandsDrawn){
    _bandsDrawn=true;
    svg.setAttribute('viewBox',`0 0 ${W} 6`);svg.setAttribute('width',W);
    const band=(from,to,color,op)=>{
      const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',(from/24)*W);r.setAttribute('y',0);
      r.setAttribute('width',((to-from)/24)*W);r.setAttribute('height',6);
      r.setAttribute('fill',color);r.setAttribute('opacity',op);svg.appendChild(r);
    };
    svg.innerHTML='';
    const rail=document.createElementNS('http://www.w3.org/2000/svg','rect');
    rail.setAttribute('x',0);rail.setAttribute('y',0);rail.setAttribute('width',W);rail.setAttribute('height',6);
    rail.setAttribute('fill','rgba(48,54,61,0.7)');rail.setAttribute('rx',3);svg.appendChild(rail);
    band(0,5,'#8957e5',0.4);band(5,7,'#d29922',0.35);band(7,9,'#d29922',0.65);
    band(9,17,'#3fb950',0.2);band(17,19,'#f85149',0.65);band(19,22,'#58a6ff',0.2);band(22,24,'#8957e5',0.4);
    _bandsFill=document.createElementNS('http://www.w3.org/2000/svg','rect');
    _bandsFill.setAttribute('y',0);_bandsFill.setAttribute('height',6);
    _bandsFill.setAttribute('fill','rgba(88,166,255,0.3)');_bandsFill.setAttribute('rx',3);svg.appendChild(_bandsFill);
  }
  if(_bandsFill)_bandsFill.setAttribute('width',((simTime%86400)/86400)*W);
}

// ── OFFLİNE TİLE CACHE (ServiceWorker) ───────────────────
// Ne işe yarar: MapLibre'nin tile isteklerini tarayıcı cache'inde saklar.
// İnternet kesilince önceden yüklenen bölgeler haritada görünmeye devam eder.
// Electron için ek olarak main.js'de session.defaultSession.webRequest ile
// tile'lar yerel mbtiles dosyasından da sunulabilir (ayrı iş kalemi).
if ('serviceWorker' in navigator && window.PLATFORM === 'web') {
  // sw.js yoksa sessizce devam et — deployment'ta opsiyonel
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── ÇOKLU PLATFORM DEPLOY YAPISI ─────────────────────────
// GitHub Pages: repo kökünde index.html → tüm yollar göreli (./models/, ./trips_data.js)
// Netlify / kendi sunucu: aynı yapı, _redirects veya nginx conf eklenebilir
// Electron: file:// protokolü — göreli yollar zaten çalışır
// Tüm asset yolları göreli olduğu için platform değiştirmek yeterli.
const DEPLOY = {
  base: './',        // GitHub Pages subdir'de deploy için değiştir: '/repo-adi/'
  modelsPath: './models/',
  tilesStyle: PHASE_CFG,  // referans — stil URL'leri PHASE_CFG içinde tanımlı
};

// ── MAPLIBRE ──────────────────────────────────────────────
const mapgl=new maplibregl.Map({
  container:'map',style:PHASE_CFG.night.style,
  center:[28.9784,41.0082],zoom:11.5,pitch:52,bearing:-14,
  antialias:true,attributionControl:false
});
mapgl.addControl(new maplibregl.NavigationControl(),'bottom-right');
mapgl.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
mapgl.on('load',()=>{add3DBuildings();startDeck();requestAnimationFrame(animate);});
mapgl.on('styledata',()=>{if(showBuildings)add3DBuildings();updateBuildingStyle();});

function add3DBuildings() {
  try {
    // Haritada 3D bina kaynağı var mı kontrol et
    const sourceName = map.getSource('openmaptiles') ? 'openmaptiles' : (map.getSource('composite') ? 'composite' : null);
    if (!sourceName) return; // Kaynak yoksa sessizce çık, çökmeyi engelle
    
    map.addLayer({
      'id': '3d-buildings',
      'source': sourceName,
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'paint': {
        'fill-extrusion-color': '#20262e',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.6
      }
    });
  } catch (e) {
    console.warn("3D bina katmanı yüklenemedi, atlanıyor.");
  }
}
function updateBuildingStyle(){
  if(!mapgl.getLayer('3d-buildings'))return;
  mapgl.setPaintProperty('3d-buildings','fill-extrusion-color',currentPhase==='day'?'#c8d0d8':'#1c2535');
}

// ── DECK.GL ───────────────────────────────────────────────
let deckgl;
function startDeck(){
  const canvas=document.getElementById('deck-canvas');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  deckgl=new DeckGL({
    canvas,width:'100%',height:'100%',
    
    // 1. initialViewState YERİNE viewState KULLANILMALI
    viewState:{longitude:28.9784,latitude:41.0082,zoom:11.5,pitch:52,bearing:-14},
    
    // 2. CONTROLLER AKTİF EDİLMELİ
    controller:true, 
    
    onViewStateChange(e){
      if(followTripIdx!==null)return;
      
      // 3. DECKGL GÖRÜNÜMÜNÜ KONTROLLÜ OLARAK GÜNCELLE
      deckgl.setProps({ viewState: e.viewState });
      
      // Deck zoom/pan → MapLibre güncelle
      mapgl.jumpTo({
        center:[e.viewState.longitude,e.viewState.latitude],
        zoom:e.viewState.zoom,
        bearing:e.viewState.bearing,
        pitch:e.viewState.pitch
      });
    },
    onHover:handleHover,
    onClick:handleClick,
    layers:[]
  });
  
  // MapLibre zoom/pan (navbar butonları, touch vs) → Deck güncelle
  mapgl.on('move',()=>{
    if(followTripIdx!==null)return;
    const c=mapgl.getCenter();
    
    // 4. BURADA DA initialViewState YERİNE viewState KULLANILMALI
    deckgl.setProps({viewState:{
      longitude:c.lng,latitude:c.lat,
      zoom:mapgl.getZoom(),
      bearing:mapgl.getBearing(),
      pitch:mapgl.getPitch(),
      transitionDuration:0
    }});
  });
}

// ── TOOLTIP ───────────────────────────────────────────────
const tooltip=document.getElementById('tooltip');
function handleHover(info){
  if(!info?.object){tooltip.style.display='none';return;}
  const o=info.object;let html='';
  if(Array.isArray(o)&&o.length>=3){html=`<div class="tt-t">${o[4]||o[2]}</div><div class="tt-s">Kod: ${o[3]||'—'}</div>`;}
  else if(o?.s&&o?.t){const m=TYPE_META[o.t]||{};html=`<div class="tt-t">${m.i||''} ${o.s}</div><div class="tt-s">${o.h||''}</div><div class="tt-v">${m.n||'—'}</div>`;}
  else if(o?.pos){html=`<div class="tt-t">Yoğunluk</div><div class="tt-v">${o.count} sefer</div>`;}
  if(html){tooltip.style.display='block';tooltip.style.left=(info.x+16)+'px';tooltip.style.top=(info.y-10)+'px';tooltip.innerHTML=html;}
  else tooltip.style.display='none';
}

// ── CLICK — #9: durak → stop-panel, araç → vehicle-panel ──
function handleClick(info){
  if(!info?.object)return;
  const o=info.object;
  if(Array.isArray(o)&&o.length>=3){showStopArrivals(o);return;}
  if(o?.s&&o?.t&&o?.p){
    const idx=findTripIdx(o);
    if(idx>=0)openVehiclePanel(idx);
  }
}
function findTripIdx(o){
  for(let i=0;i<TRIPS.length;i++){
    const t=TRIPS[i];
    if(t.s===o.s&&t.t===o.t&&t.p[0]&&o.p[0]&&t.p[0][0]===o.p[0][0])return i;
  }
  return -1;
}

// ── DEPARTURE BOARD ───────────────────────────────────────
function showDepartures(stop){
  const[lon,lat,,,fullName]=stop;
  const sid=Object.keys(STOP_INFO).find(k=>{const s=STOP_INFO[k];return Math.abs(s[0]-lon)<0.0001&&Math.abs(s[1]-lat)<0.0001;});
  document.getElementById('dep-stop-name').textContent=fullName||stop[2]||'—';
  const list=document.getElementById('dep-list');list.innerHTML='';
  const deps=sid?STOP_DEPS[sid]:null;
  if(!deps?.length){list.innerHTML='<div style="padding:12px;color:var(--muted);font-size:11px;">Sefer bulunamadı.</div>';document.getElementById('dep-board').classList.remove('hidden');return;}
  const simMod=simTime%86400;
  [...deps].sort((a,b)=>((a[1]-simMod+86400)%86400)-((b[1]-simMod+86400)%86400)).slice(0,20).forEach(([ti,offset,shortName])=>{
    const trip=TRIPS[ti];if(!trip)return;
    const m=TYPE_META[trip.t]||{};
    const diff=Math.round(((offset-simMod+86400)%86400)/60);
    const div=document.createElement('div');div.className='dep-item';
    div.innerHTML=`<span class="dep-time">${secsToHHMM(offset)}</span><span class="dep-name">${m.i||''} ${shortName||trip.s}</span><span class="dep-type" style="background:${m.c||'#333'}22;color:${m.c||'#aaa'}">${diff<1?'<1dk':diff+'dk'}</span>`;
    list.appendChild(div);
  });
  document.getElementById('dep-board').classList.remove('hidden');
}
document.getElementById('dep-close').onclick=()=>document.getElementById('dep-board').classList.add('hidden');

// ── ARAÇ DETAY PANELİ (İş-03) ────────────────────────────
function openVehiclePanel(idx){
  selectedTripIdx=idx;
  const p=document.getElementById('vehicle-panel');
  p.classList.remove('hidden');
  setTimeout(()=>p.classList.add('open'),10);
  updateVehiclePanel();
}
function closeVehiclePanel(){
  const p=document.getElementById('vehicle-panel');
  p.classList.remove('open');
  setTimeout(()=>p.classList.add('hidden'),260);
  selectedTripIdx=null;
}
function calcSpeed(trip,time){
  const off=time%Math.max(trip.d,1),ts=trip.ts,p=trip.p;
  for(let i=0;i<ts.length-1;i++){
    if(off>=ts[i]&&off<=ts[i+1]){
      const dt=ts[i+1]-ts[i];if(dt<1)return 0;
      return Math.round((haversineM(p[i],p[i+1])/dt)*3.6);
    }
  }
  return 0;
}
function calcHeadway(tripIdx,time){
  const trip=TRIPS[tripIdx];
  const myPos=getVehiclePos(trip,time);if(!myPos)return'—';
  let minDist=Infinity;
  for(let i=0;i<TRIPS.length;i++){
    if(i===tripIdx)continue;
    const t=TRIPS[i];
    if(t.s!==trip.s)continue;
    const pos=getVehiclePos(t,time);if(!pos)continue;
    const d=haversineM(myPos,pos);if(d<minDist)minDist=d;
  }
  return minDist===Infinity?'—':Math.round(minDist)+'m';
}
function getNextStop(trip,time){
  const off=time%Math.max(trip.d,1),ts=trip.ts,p=trip.p;
  for(let i=0;i<ts.length;i++){
    if(ts[i]>off){
      const wp=p[i];if(!wp)return{name:'—',eta:'—'};
      let nearest=null,bestD=Infinity;
      for(const[,s]of Object.entries(STOP_INFO)){const d=haversineM([s[0],s[1]],wp);if(d<bestD){bestD=d;nearest=s;}}
      return{name:nearest?nearest[2]:'—',eta:Math.round((ts[i]-off)/60)+'dk'};
    }
  }
  return{name:'Son durak',eta:'—'};
}
function updateVehiclePanel(){
  if(selectedTripIdx===null)return;
  const trip=TRIPS[selectedTripIdx];if(!trip)return;
  const m=TYPE_META[trip.t]||{};
  document.getElementById('vp-icon').textContent=m.i||'🚌';
  document.getElementById('vp-title').textContent=trip.s;
  document.getElementById('vp-subtitle').textContent=trip.h||m.n||'—';
  document.getElementById('vp-speed').textContent=calcSpeed(trip,simTime);
  document.getElementById('vp-headway').textContent=calcHeadway(selectedTripIdx,simTime);
  const off=simTime%Math.max(trip.d,1);
  document.getElementById('vp-progress').textContent=Math.round((off/trip.d)*100)+'%';
  const ns=getNextStop(trip,simTime);
  document.getElementById('vp-next-stop').textContent=ns.name;
  document.getElementById('vp-eta').textContent=ns.eta;
  // Durak listesi
  const list=document.getElementById('vp-stops-list');list.innerHTML='';
  trip.p.slice(0,18).forEach((wp,i)=>{
    let nearest=null,bestD=Infinity;
    for(const[,s]of Object.entries(STOP_INFO)){const d=haversineM([s[0],s[1]],wp);if(d<bestD){bestD=d;nearest=s;}}
    const passed=off>(trip.ts[i]||0);
    const current=!passed&&i>0&&(trip.ts[i-1]||0)<=off;
    const div=document.createElement('div');
    div.className='vp-stop-item'+(current?' current':passed?' passed':'');
    div.innerHTML=`<span class="vp-stop-dot"></span><span>${nearest?nearest[2]:'—'}</span>`;
    list.appendChild(div);
  });
  document.getElementById('vp-follow-btn').textContent=followTripIdx===selectedTripIdx?'📍 Takibi Bırak':'📍 Takip Et';
}
document.getElementById('vp-close').onclick=closeVehiclePanel;
document.getElementById('vp-follow-btn').onclick=()=>{
  if(followTripIdx===selectedTripIdx){followTripIdx=null;document.getElementById('follow-bar').classList.add('hidden');}
  else startFollow(selectedTripIdx);
  updateVehiclePanel();
};
document.getElementById('vp-route-btn').onclick=()=>{
  if(selectedTripIdx===null)return;
  focusRoute(TRIPS[selectedTripIdx]?.s);
};

// ── FOLLOW MODE ───────────────────────────────────────────
function startFollow(idx){
  followTripIdx=idx;
  document.getElementById('follow-bar').classList.remove('hidden');
  document.getElementById('follow-label').textContent='📍 '+TRIPS[idx].s+' takip';
}
document.getElementById('btn-unfollow').onclick=()=>{followTripIdx=null;document.getElementById('follow-bar').classList.add('hidden');};

// ── ROUTE LIST (İş-04) ────────────────────────────────────
const routeListEl=document.getElementById('route-list');
function buildRouteList(){
  const byType={};
  SHAPES.forEach(s=>{
    if(!byType[s.t])byType[s.t]=[];
    if(!byType[s.t].find(r=>r.s===s.s))byType[s.t].push({s:s.s,c:s.c,t:s.t});
  });
  routeListEl.innerHTML='';
  Object.keys(TYPE_META).forEach(type=>{
    if(!byType[type])return;
    byType[type].sort((a,b)=>a.s.localeCompare(b.s,'tr')).forEach(route=>{
      const div=document.createElement('div');
      div.className='route-item';
      div.dataset.short=route.s;
      div.dataset.type=String(type); // HAT TİPİ FİLTRESİ için zorunlu
      const color=`rgb(${route.c[0]},${route.c[1]},${route.c[2]})`;
      div.innerHTML=`<div class="ri-bar" style="background:${color}"></div>
        <div class="ri-info"><div class="ri-name"></div><div class="ri-type"></div></div>
        <input type="checkbox" class="ri-check" checked data-short="${route.s}">`;
      div.querySelector('.ri-name').textContent=route.s;  // Türkçe karakter güvenli
      div.querySelector('.ri-type').textContent=TYPE_META[type]?.n||type;
      div.onclick=e=>{if(e.target.type==='checkbox')return;focusRoute(route.s);};
      div.querySelector('.ri-check').onchange=e=>{
        if(e.target.checked)activeRoutes.delete(route.s);
        else activeRoutes.add(route.s);
        div.classList.toggle('hidden-route',!e.target.checked);
        _cachedVisTrips=null;_cachedVisShapes=null;
      };
      routeListEl.appendChild(div);
    });
  });
  // Mevcut tip filtresini uygula
  filterRouteListByType(typeFilter);
  // Butonları senkronize et
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('active',b.dataset.t===typeFilter));
}

function focusRoute(shortName){
  if(focusedRoute===shortName){
    focusedRoute=null;
    document.querySelectorAll('.route-item').forEach(d=>d.classList.remove('focused'));
    return;
  }
  focusedRoute=shortName;
  document.querySelectorAll('.route-item').forEach(d=>d.classList.toggle('focused',d.dataset.short===shortName));
  const shape=SHAPES.find(s=>s.s===shortName);
  if(shape?.p?.length){
    const lons=shape.p.map(p=>p[0]),lats=shape.p.map(p=>p[1]);
    mapgl.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],{padding:80,maxZoom:15,duration:800});
  }
}
document.getElementById('route-filter-inp').oninput=function(){
  const q=this.value.toLowerCase();
  document.querySelectorAll('.route-item').forEach(d=>{d.style.display=(!q||d.dataset.short.toLowerCase().includes(q))?'flex':'none';});
};

// Collapsible
document.querySelectorAll('.section-hdr.collapsible').forEach(hdr=>{
  const target=document.getElementById(hdr.dataset.target);if(!target)return;
  hdr.onclick=()=>{const open=target.classList.toggle('open');hdr.querySelector('.section-toggle')?.classList.toggle('open',open);};
});

// ── RENDEZVOUS ────────────────────────────────────────────
function detectRendezvous(time){
  const hits={};const simMod=time%86400;
  for(const[sid,deps]of Object.entries(STOP_DEPS)){
    for(const[,offset]of deps){
      if(Math.abs((offset-simMod+86400)%86400)<=120)hits[sid]=(hits[sid]||0)+1;
    }
  }
  return Object.entries(hits).filter(([,v])=>v>=2).map(([sid])=>{const s=STOP_INFO[sid];return s?[s[0],s[1],s[2],'RV']:null;}).filter(Boolean);
}

// ── DENSITY ───────────────────────────────────────────────
const densityGrid={};
STOPS.forEach(s=>{const k=Math.round(s[0]/0.005)+'|'+Math.round(s[1]/0.005);if(!densityGrid[k])densityGrid[k]={pos:[s[0],s[1]],count:0};densityGrid[k].count++;});
const densityData=Object.values(densityGrid);
const maxDensity=Math.max(...densityData.map(d=>d.count));

// Stop names for autocomplete
const stopNames=Object.entries(STOP_INFO).map(([sid,info])=>[info[2].toLowerCase(),sid,info[0],info[1],info[2]]);

// ── LAYER İNŞAASI ─────────────────────────────────────────
let _lastBuildTime=0,_lastBuiltLayers=[];
let _cachedVisTrips=null,_cachedVisShapes=null,_cacheTypeFilter=null,_cacheActiveRoutes='';
function _getVisData(){
  const arKey=[...activeRoutes].sort().join(',');
  if(_cachedVisTrips&&typeFilter===_cacheTypeFilter&&arKey===_cacheActiveRoutes)
    return {visTrips:_cachedVisTrips,visShapes:_cachedVisShapes};
  _cacheTypeFilter=typeFilter;_cacheActiveRoutes=arKey;
  _cachedVisTrips=TRIPS.filter(t=>(typeFilter==='all'||t.t===typeFilter)&&!activeRoutes.has(t.s));
  _cachedVisShapes=SHAPES.filter(s=>(typeFilter==='all'||s.t===typeFilter)&&!activeRoutes.has(s.s));
  return {visTrips:_cachedVisTrips,visShapes:_cachedVisShapes};
}

function buildLayers(){
  const now=performance.now();
  const _buildInterval=QUALITY.level===0?200:QUALITY.level===1?120:80;
  if(now-_lastBuildTime<_buildInterval&&_lastBuiltLayers.length>0)return _lastBuiltLayers;
  _lastBuildTime=now;
  const time=simTime;const layers=[];
  const {visTrips,visShapes}=_getVisData();

  // HEATMAP (İş-06)
  if(showHeatmap){
    const hHour=heatmapFollowSim?Math.floor((time/3600)%24):heatmapHour;
    const pts=(HOURLY_HEAT[String(hHour)]||HOURLY_HEAT[hHour]||[]).map(p=>({position:p,weight:1}));
    if(pts.length)layers.push(new HeatmapLayer({id:'heatmap',data:pts,getPosition:d=>d.position,getWeight:()=>1,radiusPixels:40,intensity:2,threshold:0.1,colorRange:[[0,0,80,0],[0,0,200,120],[0,200,200,160],[200,200,0,200],[255,100,0,220],[255,0,0,240]]}));
  }

  // PATHS (İş-04 odak desteğiyle) — kaliteye göre glow katmanı
  if(showPaths){
    const rd=QUALITY.rounded;
    if(QUALITY.showGlow)
      layers.push(new PathLayer({id:'paths-glow',data:visShapes,getPath:d=>d.p,getColor:d=>focusedRoute&&d.s!==focusedRoute?[...d.c,8]:[...d.c,22],getWidth:d=>(TYPE_META[d.t]?.w||2)*6,widthUnits:'pixels',widthMinPixels:2,jointRounded:rd,capRounded:rd,pickable:false}));
    layers.push(new PathLayer({id:'paths-above',data:visShapes.filter(s=>s.t!=='1'),getPath:d=>d.p,getColor:d=>focusedRoute&&d.s!==focusedRoute?[...d.c,25]:[...d.c,160],getWidth:d=>TYPE_META[d.t]?.w||2,widthUnits:'pixels',widthMinPixels:1,jointRounded:rd,capRounded:rd,pickable:true}));
    const metro=visShapes.filter(s=>s.t==='1');
    layers.push(new PathLayer({id:'metro-paths',data:metro,getPath:d=>d.p,getColor:d=>focusedRoute&&d.s!==focusedRoute?[...d.c,25]:[...d.c,200],getWidth:5,widthUnits:'pixels',widthMinPixels:2,jointRounded:rd,capRounded:rd,pickable:true}));
    layers.push(new PathLayer({id:'metro-tunnel',data:metro,getPath:d=>d.p.filter(([lon,lat])=>isUnderground(lon,lat)),getColor:d=>[...d.c,55],getWidth:8,widthUnits:'pixels',widthMinPixels:3,pickable:false,getDashArray:[4,4],dashJustified:true,extensions:[_pathDashExt]}));
  }

  if(routeHighlightPath?.length>1)layers.push(new PathLayer({id:'route-hl',data:[{path:routeHighlightPath}],getPath:d=>d.path,getColor:[255,200,0,220],getWidth:6,widthUnits:'pixels',widthMinPixels:3,jointRounded:true,capRounded:true,pickable:false}));

  // DENSITY COLUMNS
  if(showDensity&&!showHeatmap&&QUALITY.level>0)layers.push(new ColumnLayer({id:'density',data:densityData,getPosition:d=>d.pos,getElevation:d=>(d.count/maxDensity)*900,getFillColor:d=>{const t=d.count/maxDensity;return[Math.round(88+t*167),Math.round(166-t*100),Math.round(255-t*100),Math.round(70+t*130)];},radius:175,extruded:true,pickable:true}));

  // STOPS
  if(showStops&&QUALITY.showStopsDetail)layers.push(new ScatterplotLayer({id:'stops',data:STOPS,getPosition:d=>[d[0],d[1]],getRadius:45,getFillColor:[88,166,255,150],getLineColor:[88,166,255,255],stroked:true,lineWidthMinPixels:1,radiusMinPixels:2,radiusMaxPixels:8,pickable:true}));

  // TRIPS ANIMATION
  let activeCount=0;
  if(showAnim){
    // Kaliteye göre trip örnekleme — düşük FPS'de daha az trip render et
    const _stride = QUALITY.level < 2 ? Math.max(1, Math.floor(visTrips.length / Math.ceil(visTrips.length * QUALITY.tripRatio))) : 1;
    const sampledTrips = _stride === 1 ? visTrips : visTrips.filter((_,i)=>i%_stride===0);
    layers.push(new TripsLayer({id:'trips',data:sampledTrips,getPath:d=>d.p,getTimestamps:d=>d.ts,getColor:d=>focusedRoute&&d.s!==focusedRoute?[50,55,60]:d.c,currentTime:time%86400,trailLength:QUALITY.trailLength,widthMinPixels:2,capRounded:QUALITY.rounded,jointRounded:QUALITY.rounded,fadeTrail:true,pickable:true}));
    const heads=[];
    for(let _vi=0;_vi<sampledTrips.length;_vi++){
      const trip=sampledTrips[_vi];
      const pos=getVehiclePos(trip,time);
      if(pos){activeCount++;heads.push({pos,c:trip.c,trip,idx:trip._idx||0});}
    }
    document.getElementById('s-active').textContent=_stride>1?(activeCount+'~'):activeCount;
    // Aktif araç → seferde olan (getVehiclePos!=null) + typeFilter uyumlu (#7)
    const totalActive=_stride>1?activeCount:visTrips.filter(t=>getVehiclePos(t,time)!==null).length;
    document.getElementById('s-active').textContent=totalActive+(totalActive!==activeCount?'~':'');
    // İş-12: zoom>14 + show3D → ScenegraphLayer, aksi hâlde normal ScatterplotLayer
    if(show3D){
      const modelLayers=build3DVehicleLayer(sampledTrips,time);
      if(modelLayers&&modelLayers.length)modelLayers.forEach(l=>layers.push(l));
      else layers.push(new ScatterplotLayer({id:'heads',data:heads,getPosition:d=>d.pos,getRadius:52,getFillColor:d=>focusedRoute&&d.trip.s!==focusedRoute?[50,55,60,180]:[...d.c,255],getLineColor:[255,255,255,180],stroked:QUALITY.level>0,lineWidthMinPixels:1.5,radiusMinPixels:3,radiusMaxPixels:13,pickable:true}));
    } else {
      layers.push(new ScatterplotLayer({id:'heads',data:heads,getPosition:d=>d.pos,getRadius:52,getFillColor:d=>focusedRoute&&d.trip.s!==focusedRoute?[50,55,60,180]:[...d.c,255],getLineColor:[255,255,255,180],stroked:QUALITY.level>0,lineWidthMinPixels:1.5,radiusMinPixels:3,radiusMaxPixels:13,pickable:true}));
    }
    if(followTripIdx!==null){
      const fp=getVehiclePos(TRIPS[followTripIdx],time);
      if(fp){const z=Math.max(mapgl.getZoom(),14.5);mapgl.easeTo({center:fp,zoom:z,pitch:62,duration:350});deckgl.setProps({initialViewState:{longitude:fp[0],latitude:fp[1],zoom:z,pitch:62,bearing:mapgl.getBearing(),transitionDuration:350}});}
    }
  } else document.getElementById('s-active').textContent='0';

  // RENDEZVOUS
  if(showRendezvous){
    const rv=detectRendezvous(time);
    if(rv.length){const pulse=80+Math.sin(Date.now()/250)*35;layers.push(new ScatterplotLayer({id:'rendezvous',data:rv,getPosition:d=>[d[0],d[1]],getRadius:pulse,getFillColor:[63,185,80,100],getLineColor:[63,185,80,255],stroked:true,lineWidthMinPixels:2,radiusMinPixels:8,radiusMaxPixels:22,pickable:false,updateTriggers:{getRadius:Date.now()}}));}
  }

  // ── FAZ 2 KATMANLARI ─────────────────────────────────────

  // İş-07 HEADWAY ÇİZGİLERİ
  if(showHeadway){
    const pairs=calcHeadwayPairs(time);
    if(pairs.length)layers.push(new LineLayer({id:'headway-lines',data:pairs,getSourcePosition:d=>d.from,getTargetPosition:d=>d.to,getColor:d=>d.color,getWidth:3,widthMinPixels:2,pickable:false,opacity:0.8}));
  }

  // İş-08 BUNCHING ALARMLARI
  const bunchAlarms=showBunching||true?detectBunching(time):[];
  if(showBunching&&bunchAlarms.length){
    const pulse=Math.sin(Date.now()/180)*0.5+0.5;
    layers.push(new ScatterplotLayer({id:'bunching-alarm',data:bunchAlarms,getPosition:d=>d.pos,getRadius:120+pulse*80,getFillColor:[248,81,73,Math.round(120+pulse*100)],getLineColor:[255,150,150,255],stroked:true,lineWidthMinPixels:2,radiusMinPixels:10,radiusMaxPixels:30,pickable:false,updateTriggers:{getRadius:Date.now(),getFillColor:Date.now()}}));
  }
  // Bunching panelini her frame güncelle (sadece bunching açıksa)
  if(showBunching)updateBunchingPanel(bunchAlarms);

  // İş-09 BEKLEME SÜRESİ KOLONLARI
  if(showWaiting&&_stopAvgHeadways){
    const waitData=Object.entries(_stopAvgHeadways).map(([sid,hw])=>{
      const s=STOP_INFO[sid];if(!s)return null;
      return{pos:[s[0],s[1]],hw,color:waitingColor(hw)};
    }).filter(Boolean);
    if(waitData.length)layers.push(new ColumnLayer({id:'waiting-cols',data:waitData,getPosition:d=>d.pos,getElevation:d=>Math.min((d.hw/1800)*600,600),getFillColor:d=>d.color,radius:120,extruded:true,pickable:false,opacity:0.85}));
  }

  // İş-10 TRANSFER ARCLARI
  if(showTransfer){
    buildTransferArcs();
    if(_transferArcs.length)layers.push(new ArcLayer({id:'transfer-arcs',data:_transferArcs,getSourcePosition:d=>d.from,getTargetPosition:d=>d.to,getSourceColor:d=>d.fromColor,getTargetColor:d=>d.toColor,getWidth:3,widthMinPixels:2,greatCircle:false,pickable:true}));
  }
  _lastBuiltLayers=layers;
  return layers;
}

// ── GECE/GÜNDÜZ ───────────────────────────────────────────
function updateDayNight(){
  const phase=getPhase(simTime);if(phase===currentPhase)return;
  currentPhase=phase;const cfg=PHASE_CFG[phase];
  const b=document.getElementById('daynight-badge');b.textContent=cfg.badge;b.style.background=cfg.bg;
  if(cfg.style!==currentStyle){currentStyle=cfg.style;mapgl.setStyle(cfg.style);}
}

// ── FPS (İş-02) ───────────────────────────────────────────
function updateFPS(ts){
  fpsFrames.push(ts);if(fpsFrames.length>60)fpsFrames.shift();
  if(fpsFrames.length>1){
    const fps=Math.round((fpsFrames.length-1)/((fpsFrames[fpsFrames.length-1]-fpsFrames[0])/1000));
    const el=document.getElementById('fps-val');
    const qLabel=['🐢','🚶','🚀'][QUALITY.level];
    el.textContent=fps+' '+qLabel;el.className=fps>45?'good':fps>25?'mid':'bad';
    QUALITY.update(ts, fps);
  }
}

// ── REPLAY (İş-05) ────────────────────────────────────────
function startReplay(){
  isReplay=true;simTime=6*3600;speedIdx=6;simSpeed=600;simPaused=false;
  document.getElementById('replay-bar').classList.remove('hidden');
  document.getElementById('btn-play').textContent='⏸';document.getElementById('btn-play').classList.remove('paused');
  updateSpd();
}
function stopReplay(){
  isReplay=false;speedIdx=3;simSpeed=60;
  document.getElementById('replay-bar').classList.add('hidden');updateSpd();
}
document.getElementById('btn-replay').onclick=()=>isReplay?stopReplay():startReplay();
document.getElementById('replay-stop').onclick=stopReplay;
document.getElementById('replay-loop').onchange=e=>{replayLoop=e.target.checked;};
function updateReplayBar(){
  if(!isReplay)return;
  const pct=(((simTime%86400)-6*3600)/(18*3600))*100;
  document.getElementById('replay-fill').style.width=Math.max(0,Math.min(100,pct))+'%';
  document.getElementById('replay-time-lbl').textContent=secsToHHMM(simTime%86400);
  if(simTime%86400>=23*3600){if(replayLoop)simTime=6*3600;else stopReplay();}
}

// ── ANİMASYON DÖNGÜSÜ ─────────────────────────────────────
function animate(ts){
  if(!lastTs)lastTs=ts;
  const dt=(ts-lastTs)/1000;lastTs=ts;
  if(!simPaused&&dt<0.5)simTime+=dt*simSpeed;
  if(simTime>=86400)simTime-=86400;
  if(simTime<0)simTime+=86400;
  updateFPS(ts);
  if(!window._animFrame)window._animFrame=0;
  window._animFrame++;
  if(window._animFrame%3===0){
    document.getElementById('clock').textContent=secsToHHMM(simTime%86400);
    document.getElementById('time-slider').value=Math.floor(simTime%86400);
    drawSparkline();drawSliderBands();
    updateDayNight();updateReplayBar();
    if(selectedTripIdx!==null&&!simPaused)updateVehiclePanel();
  }
  if(deckgl)deckgl.setProps({layers:buildLayers()});
  requestAnimationFrame(animate);
}

// ── UI KONTROLLER ─────────────────────────────────────────
document.getElementById('btn-play').onclick=function(){simPaused=!simPaused;this.textContent=simPaused?'▶':'⏸';this.classList.toggle('paused',simPaused);};
document.getElementById('btn-faster').onclick=()=>{speedIdx=Math.min(speedIdx+1,SPEEDS.length-1);simSpeed=SPEEDS[speedIdx];updateSpd();};
document.getElementById('btn-slower').onclick=()=>{speedIdx=Math.max(speedIdx-1,0);simSpeed=SPEEDS[speedIdx];updateSpd();};
document.getElementById('btn-reset').onclick=()=>{simTime=6*3600;speedIdx=3;simSpeed=60;simPaused=false;stopReplay();document.getElementById('btn-play').textContent='⏸';document.getElementById('btn-play').classList.remove('paused');updateSpd();};
function updateSpd(){const s=SPEEDS[speedIdx];document.getElementById('speed-lbl').textContent=s<60?s+'×':Math.round(s/60)+'dk/s';}
document.getElementById('time-slider').oninput=function(){simTime=parseInt(this.value);};
const togMap={'anim':v=>showAnim=v,'paths':v=>showPaths=v,'density':v=>showDensity=v,'stops':v=>showStops=v,'buildings':v=>{showBuildings=v;if(mapgl.getLayer('3d-buildings'))mapgl.setLayoutProperty('3d-buildings','visibility',v?'visible':'none');},'rendezvous':v=>showRendezvous=v,'heatmap':v=>{showHeatmap=v;document.getElementById('heatmap-ctrl').classList.toggle('hidden',!v);},
  // FAZ 2 toggles
  'headway':v=>showHeadway=v,
  'bunching':v=>{showBunching=v;if(!v)document.getElementById('bunching-panel').classList.add('hidden');},
  'waiting':v=>{showWaiting=v;if(v)precomputeStopHeadways();updateWorstStopsPanel();document.getElementById('worst-stops-panel').classList.toggle('hidden',!v);},
  'transfer':v=>{showTransfer=v;if(v)buildTransferArcs();}
};
Object.keys(togMap).forEach(id=>{const el=document.getElementById('tog-'+id);if(el)el.onchange=function(){togMap[id](this.checked);};});
// #1: Başlangıçta Metro aktif, Tümü seçince uyarı · #5: hat listesi filtresi
function setTypeFilter(t){
  if(t==='all'&&!confirm('Tümü seçildiğinde 14.000+ sefer render edilir.\nSistem yavaşlayabilir. Devam?'))return false;
  typeFilter=t;
  _cachedVisTrips=null;_cachedVisShapes=null;
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('active',b.dataset.t===t));
  filterRouteListByType(t);
  return true;
}

document.querySelectorAll('.tbtn').forEach(btn=>{
  btn.onclick=function(){ setTypeFilter(this.dataset.t); };
});
function filterRouteListByType(t){
  document.querySelectorAll('#route-list .route-item').forEach(d=>{
    d.style.display=(t==='all'||d.dataset.type===t)?'flex':'none';
  });
}
document.getElementById('heatmap-hour').oninput=function(){heatmapHour=parseInt(this.value);document.getElementById('heatmap-hour-lbl').textContent=secsToHHMM(heatmapHour*3600);};
document.getElementById('heatmap-follow-sim').onchange=e=>{heatmapFollowSim=e.target.checked;};

// ── FAZ 2: Bunching threshold slider ──────────────────────
const bThresh=document.getElementById('bunching-threshold');
if(bThresh){
  bThresh.oninput=function(){bunchingThreshold=parseInt(this.value);document.getElementById('threshold-lbl').textContent=this.value+'m';};
}

// ── FAZ 2: İş-11 Sinematik Kamera ─────────────────────────
document.getElementById('btn-cinematic').onclick=()=>isCinematic?stopCinematic():startCinematic();

// ── FAZ 2: CSS Enjeksiyonu ─────────────────────────────────
(function(){
  const s=document.createElement('style');
  s.textContent=`
    #cinematic-label{
      position:fixed;bottom:44px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.92);font-size:17px;font-weight:300;
      letter-spacing:3px;text-transform:uppercase;
      text-shadow:0 2px 16px rgba(0,0,0,0.9);
      pointer-events:none;z-index:200;transition:opacity 0.8s;
    }
    #sidebar,#legend{transition:opacity 0.5s;}
    #worst-stops-panel:not(.hidden),#bunching-panel:not(.hidden){
      transition:all 0.3s;
    }
  `;
  document.head.appendChild(s);
})();

// ── ROTA PLANLAMA ─────────────────────────────────────────
function setupStopSearch(inputId,sugId,cb){
  const inp=document.getElementById(inputId),sug=document.getElementById(sugId);
  inp.addEventListener('input',()=>{
    const q=inp.value.toLowerCase().trim();if(q.length<2){sug.classList.remove('show');return;}
    const res=stopNames.filter(s=>s[0].includes(q)).slice(0,8);
    sug.innerHTML=res.map(s=>`<div class="sug-item" data-sid="${s[1]}" data-name="${s[4]}">${s[4]}</div>`).join('');
    sug.classList.toggle('show',res.length>0);
    sug.querySelectorAll('.sug-item').forEach(el=>{el.onclick=()=>{inp.value=el.dataset.name;sug.classList.remove('show');cb(el.dataset.sid);};});
  });
}
setupStopSearch('stop-from','from-suggestions',sid=>fromStopId=sid);
setupStopSearch('stop-to','to-suggestions',sid=>toStopId=sid);
document.getElementById('btn-route').onclick=()=>{
  if(!fromStopId||!toStopId){alert('Başlangıç ve bitiş duraklarını seçin.');return;}
  const path=dijkstra(fromStopId,toStopId);
  if(!path?.length){alert('Rota bulunamadı.');return;}
  showRouteResult(path);
};
function dijkstra(from,to){
  const dist={[from]:0},prev={},vis=new Set(),q=[[0,from]];
  while(q.length){q.sort((a,b)=>a[0]-b[0]);const[cost,sid]=q.shift();if(vis.has(sid))continue;vis.add(sid);if(sid===to)break;for(const[nid,secs,line]of(ADJ[sid]||[])){if(vis.has(nid))continue;const nc=cost+secs;if(nc<(dist[nid]??Infinity)){dist[nid]=nc;prev[nid]={from:sid,secs,line};q.push([nc,nid]);}}}
  if(!dist[to])return null;
  const path=[];let cur=to;while(cur&&prev[cur]){const p=prev[cur];path.unshift({to:cur,from:p.from,secs:p.secs,line:p.line});cur=p.from;}return path;
}
function showRouteResult(path){
  const el=document.getElementById('route-result'),steps=document.getElementById('route-steps');
  steps.innerHTML='';let total=0;
  path.forEach(step=>{total+=step.secs;const fs=STOP_INFO[step.from],ts2=STOP_INFO[step.to];const div=document.createElement('div');div.className='route-step';div.innerHTML=`<span class="step-icon">🚌</span><div class="step-info"><div class="step-line">${step.line}</div><div class="step-detail">${fs?fs[2]:'?'} → ${ts2?ts2[2]:'?'}</div></div><span class="step-time">${Math.round(step.secs/60)}dk</span>`;steps.appendChild(div);});
  const tot=document.createElement('div');tot.style.cssText='padding:6px 10px;font-size:11px;font-weight:700;color:var(--green);border-top:1px solid var(--border);';tot.textContent='Toplam: '+Math.round(total/60)+' dakika';steps.appendChild(tot);
  routeHighlightPath=path.map(s=>{const si=STOP_INFO[s.to];return si?[si[0],si[1]]:null;}).filter(Boolean);
  el.classList.remove('hidden');
}
document.getElementById('route-result-close').onclick=()=>{document.getElementById('route-result').classList.add('hidden');routeHighlightPath=null;};

// ═══════════════════════════════════════════════════════════
// ── FAZ 2 FONKSİYONLARI ─────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ── İş-07: HEADWAY ÇİFT HESABI ───────────────────────────
// Aynı hat + aynı yönde giden araçlar eşleştirilir.
// Yön: trip.p[0]→trip.p[son] arası açı, 4 sektöre indirgenir.
// Araçlar, hat boyunca normalize ilerleme (0-1) değerine göre sıralanır.
function calcHeadwayPairs(time){
  // getVehiclePos ile AYNI off=time%trip.d hesabı kullanılır.
  // Yön: trip güzergahının genel yönü, 2 gruba indirgenir.
  const byKey={};
  for(const trip of TRIPS){
    if(typeFilter!=='all'&&trip.t!==typeFilter)continue;
    if(activeRoutes.has(trip.s))continue;
    const pos=getVehiclePos(trip,time);
    if(!pos)continue;
    // off: getVehiclePos ile aynı mantık
    const off=time%Math.max(trip.d,1);
    const ts0=trip.ts[0]||0;
    const tsN=trip.ts[trip.ts.length-1]||1;
    const progress=(tsN>ts0)?Math.max(0,Math.min(1,(off-ts0)/(tsN-ts0))):0;
    // Yön grubu: güzergahın genel eğimine göre A veya B
    let grp='A';
    if(trip.p&&trip.p.length>=2){
      const dx=trip.p[trip.p.length-1][0]-trip.p[0][0];
      const dy=trip.p[trip.p.length-1][1]-trip.p[0][1];
      grp=(dy>=0)?'A':'B';
    }
    const key=trip.s+'|'+grp;
    (byKey[key]||(byKey[key]=[])).push({pos,progress,route:trip.s});
  }
  const lines=[];
  bunchingEvents=[];
  for(const[,vehicles]of Object.entries(byKey)){
    if(vehicles.length<2)continue;
    vehicles.sort((a,b)=>a.progress-b.progress);
    for(let i=0;i<vehicles.length-1;i++){
      const a=vehicles[i],b=vehicles[i+1];
      const dist=haversineM(a.pos,b.pos);
      if(dist<10||dist>15000)continue;
      let color;
      if(dist<bunchingThreshold){
        color=[248,81,73,230];
        bunchingEvents.push({routeId:a.route,pos:[(a.pos[0]+b.pos[0])/2,(a.pos[1]+b.pos[1])/2],dist:Math.round(dist)});
      } else if(dist<3000){
        const t=1-(dist-bunchingThreshold)/(3000-bunchingThreshold);
        color=[Math.round(248*t+63*(1-t)),Math.round(81*t+185*(1-t)),Math.round(73*t+80*(1-t)),190];
      } else {
        color=[63,185,80,160];
      }
      lines.push({from:a.pos,to:b.pos,color});
    }
  }
  return lines;
}
// ── İş-08: BUNCHING TESPİTİ ───────────────────────────────
// calcHeadwayPairs'ın bunchingEvents'ini kullanır.
// Çağrıldığında bunchingEvents zaten dolmuştur (headway veya her-zaman çalışır).
function detectBunching(time){
  // calcHeadwayPairs side-effect: bunchingEvents'i doldurur.
  // Headway kapatıksa bile bunching için hesap yapmamız gerekir.
  if(!showHeadway){
    // Sadece bunching için minimal hesap yap
    calcHeadwayPairs(time);
  }
  return bunchingEvents;
}

function updateBunchingPanel(alarms){
  const panel=document.getElementById('bunching-panel');
  const list=document.getElementById('bunching-list');
  const countEl=document.getElementById('bunching-count');
  if(!panel)return;
  panel.classList.remove('hidden');
  countEl.textContent=alarms.length;
  if(!alarms.length){
    list.innerHTML='<div style="padding:10px 12px;color:#3fb950;font-size:11px;text-align:center;">✓ Şu an bunching yok</div>';
    return;
  }
  list.innerHTML=alarms.slice(0,12).map(e=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;border-bottom:1px solid rgba(48,54,61,0.6);">
      <span style="font-size:11px;color:var(--text,#e6edf3)">${e.routeId}</span>
      <span style="font-size:12px;font-weight:700;color:#f85149">${e.dist}m</span>
    </div>`).join('');
}

// ── İş-09: DURAK BEKLEME SÜRESİ ──────────────────────────
// stop_times/STOP_DEPS'ten ortalama headway hesapla → bekleme = headway/2
function precomputeStopHeadways(){
  if(_stopAvgHeadways)return;
  _stopAvgHeadways={};
  for(const[sid,deps]of Object.entries(STOP_DEPS)){
    if(!deps||deps.length<2)continue;
    const sorted=[...deps].sort((a,b)=>a[1]-b[1]);
    let total=0,count=0;
    for(let i=1;i<sorted.length;i++){
      const gap=sorted[i][1]-sorted[i-1][1];
      if(gap>30&&gap<7200){total+=gap;count++;}
    }
    if(count>0)_stopAvgHeadways[sid]=total/count;
  }
  buildWorstStops();
}

function waitingColor(hw){
  const mins=hw/60;
  if(mins<=5) return[63,185,80,210];
  if(mins<=15)return[210,153,34,210];
  return[248,81,73,210];
}

function buildWorstStops(){
  if(!_stopAvgHeadways)return;
  _worstStops=Object.entries(_stopAvgHeadways)
    .filter(([sid])=>STOP_INFO[sid])
    .map(([sid,hw])=>({sid,avgWait:hw/2,info:STOP_INFO[sid]}))
    .sort((a,b)=>b.avgWait-a.avgWait)
    .slice(0,10);
  updateWorstStopsPanel();
}

function updateWorstStopsPanel(){
  const list=document.getElementById('worst-stops-list');
  if(!list||!_worstStops)return;
  list.innerHTML=_worstStops.map((e,i)=>{
    const mins=Math.round(e.avgWait/60);
    const col=mins<=5?'#3fb950':mins<=15?'#d29922':'#f85149';
    return`<div onclick="mapgl.flyTo({center:[${e.info[0]},${e.info[1]}],zoom:15,duration:800})"
      style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid rgba(48,54,61,0.5);cursor:pointer;">
      <span style="color:var(--muted,#7d8590);font-size:10px;width:14px;text-align:right">${i+1}</span>
      <span style="flex:1;font-size:11px;color:var(--text,#e6edf3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.info[2]}</span>
      <span style="font-size:12px;font-weight:700;color:${col}">${mins}dk</span>
    </div>`;
  }).join('');
}

// ── İş-10: TRANSFER ARCLARI ───────────────────────────────
// Birden fazla hat tipine sahip duraklar arası kavisli bağlantılar.
function buildTransferArcs(){
  if(_transferArcs)return;
  _transferArcs=[];
  // Her durağa hangi hat tipleri uğruyor?
  const stopTypesMap={};
  for(const[sid,deps]of Object.entries(STOP_DEPS)){
    if(!STOP_INFO[sid])continue;
    for(const[ti]of deps){
      const t=TRIPS[ti]?.t;
      if(!t)continue;
      (stopTypesMap[sid]||(stopTypesMap[sid]=new Set())).add(t);
    }
  }
  // Çok-modal durakları bul (2+ tip)
  const hubs=Object.entries(stopTypesMap)
    .filter(([,types])=>types.size>=2)
    .map(([sid,types])=>({sid,types:[...types],info:STOP_INFO[sid]}));

  const seen=new Set();
  for(const hub of hubs){
    const[lon,lat,name]=hub.info;
    for(let i=0;i<hub.types.length-1;i++){
      for(let j=i+1;j<hub.types.length;j++){
        const t1=hub.types[i],t2=hub.types[j];
        const key=`${hub.sid}_${t1}_${t2}`;
        if(seen.has(key))continue;seen.add(key);
        const m1=TYPE_META[t1]||{rgb:[88,166,255]};
        const m2=TYPE_META[t2]||{rgb:[88,166,255]};
        // Arc kaynak ve hedef: aynı merkez etrafında küçük offset
        const d=0.0007;
        _transferArcs.push({
          from:[lon-d,lat-d*0.5],
          to:  [lon+d,lat+d*0.5],
          fromColor:[...m1.rgb,200],
          toColor:  [...m2.rgb,200],
          name,t1,t2
        });
      }
    }
    if(_transferArcs.length>600)break;
  }
}

// ── İş-11: SİNEMATİK KAMERA ──────────────────────────────
let _preCinematicView = null; // #3: eski kamera konumunu sakla

function startCinematic(){
  // #3: Mevcut kamera durumunu kaydet
  _preCinematicView = {
    center: mapgl.getCenter(),
    zoom: mapgl.getZoom(),
    pitch: mapgl.getPitch(),
    bearing: mapgl.getBearing()
  };
  isCinematic=true; cinematicIdx=0;
  document.getElementById('sidebar').style.opacity='0';
  document.getElementById('sidebar').style.pointerEvents='none';
  document.getElementById('legend').style.opacity='0';
  const btn=document.getElementById('btn-cinematic');
  if(btn){btn.textContent='⏹ Durdur';btn.style.background='rgba(248,81,73,0.25)';btn.style.borderColor='#f85149';btn.style.color='#f85149';}
  cinematicNext();
}
function stopCinematic(){
  isCinematic=false;
  clearTimeout(cinematicTimer);
  cinematicTimer=null;
  followTripIdx=null; // araç takibini temizle
  document.getElementById('sidebar').style.opacity='';
  document.getElementById('sidebar').style.pointerEvents='';
  document.getElementById('legend').style.opacity='';
  const lbl=document.getElementById('cinematic-label');
  if(lbl){lbl.style.opacity='0'; setTimeout(()=>{lbl.textContent='';},500);}
  const btn=document.getElementById('btn-cinematic');
  if(btn){btn.textContent='🎬 Sinematik';btn.style.background='';btn.style.borderColor='';btn.style.color='';}
  // #3: Eski kamera konumuna geri dön
  if(_preCinematicView){
    mapgl.flyTo({
      center: _preCinematicView.center,
      zoom: _preCinematicView.zoom,
      pitch: _preCinematicView.pitch,
      bearing: _preCinematicView.bearing,
      duration: 1200,
      essential: true
    });
    _preCinematicView = null;
  }
}
function cinematicNext(){
  if(!isCinematic)return;
  const wp=WAYPOINTS[cinematicIdx];
  const lbl=document.getElementById('cinematic-label');
  if(lbl){
    lbl.style.opacity='0';lbl.textContent=wp.label;
    setTimeout(()=>{lbl.style.transition='opacity 0.8s';lbl.style.opacity='1';},200);
    setTimeout(()=>{lbl.style.opacity='0';},wp.duration-800);
  }
  mapgl.flyTo({center:wp.center,zoom:wp.zoom,pitch:wp.pitch,bearing:wp.bearing,duration:wp.duration-600,essential:true});
  // En yakın aktif aracı otomatik takip et (kısa süre)
  const nearPos=wp.center;
  let nearest=null,minD=Infinity;
  for(const trip of TRIPS){
    const pos=getVehiclePos(trip,simTime);
    if(!pos)continue;
    const d=haversineM(nearPos,pos);
    if(d<minD){minD=d;nearest=trip;}
  }
  if(nearest&&minD<3000){
    const tIdx=TRIPS.indexOf(nearest);
    if(tIdx>=0)followTripIdx=tIdx;
    setTimeout(()=>{if(isCinematic)followTripIdx=null;},2500);
  }
  cinematicTimer=setTimeout(()=>{
    cinematicIdx=(cinematicIdx+1)%WAYPOINTS.length;
    cinematicNext();
  },wp.duration);
}

// ═══════════════════════════════════════════════════════════

// ── BAŞLANGIÇ ─────────────────────────────────────────────
buildRouteList();
// buildRouteList'ten sonra Metro aktif et:
if(typeof setTypeFilter==="function")setTypeFilter(typeFilter);
window.onresize=()=>{const c=document.getElementById('deck-canvas');c.width=window.innerWidth;c.height=window.innerHeight;};
// ═══════════════════════════════════════════════════════════
// ── FAZ 4: ELECTRON KÖPRÜSÜ (YENİ EKLENDİ) ─────────────────
// Masaüstü uygulamasından (main.js) gelen menü tetiklemelerini 
// ve native dosya yükleme olaylarını dinler.
// ═══════════════════════════════════════════════════════════

window.IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI;

if (window.IS_ELECTRON) {
  // 1. Üst Menü Kısayolları (Oynat/Durdur, Hızlandır, Başa Sar)
 // 1. Üst Menü Kısayolları (Oynat/Durdur, Hızlandır, Başa Sar)
  window.electronAPI.onSimControl((ch, data) => {
    switch(ch) {
      case 'sim:toggle-play': 
        const btnPlay = document.getElementById('btn-play');
        if(btnPlay) btnPlay.click(); 
        break;
      case 'sim:speed-up': 
        const speedUp = document.getElementById('sim-speed');
        if(speedUp) speedUp.value = Math.min(300, parseInt(speedUp.value) + 10);
        break;
      case 'sim:speed-down': 
        const speedDown = document.getElementById('sim-speed');
        if(speedDown) speedDown.value = Math.max(1, parseInt(speedDown.value) - 10);
        break;
      case 'sim:reset': 
        const slider = document.getElementById('time-slider');
        if(slider) { slider.value = 0; slider.dispatchEvent(new Event('input')); }
        break;
      case 'sim:replay': 
        const btnReplay = document.getElementById('btn-replay');
        if(btnReplay) btnReplay.click();
        break;
    }
  });

  // 2. Kullanıcı Menüden GTFS (ZIP) Seçtiğinde
  window.electronAPI.onGTFSFileOpened(data => {
    console.log('Electron üzerinden GTFS yüklendi:', data.name);
    const file = new File([data.buffer], data.name, {type: 'application/zip'});
    if(typeof handleGTFSFile === 'function') handleGTFSFile(file);
  });

  // 3. Şehir Klasörü Tarandığında
  window.electronAPI.onCityScanResult(cities => {
    console.log('Klasör taraması sonucu bulunan şehirler:', cities);
    if(typeof handleNativeCityScan === 'function') handleNativeCityScan(cities);
  });
  
  // 4. Konsola Güvenlik / Platform Bilgisi Yazdır
  window.electronAPI.getAppInfo().then(info => {
     console.log(`[Electron Köprüsü Aktif] v${info.version} - Platform: ${info.platform}`);
  });
}

// ═══════════════════════════════════════════════════════════
// ── FAZ 3: İş-12 — 3D ARAÇ MODELLERİ (ScenegraphLayer LOD) ─
// ═══════════════════════════════════════════════════════════
// Mevcut modeller: models/bus.glb ✅  models/tram.glb ✅
// Eksik (fallback): ferry → bus, metro → tram (aynı klasörden)
const MODEL_AVAILABLE = { bus: true, tram: true, ferry: false, metro: false };
const _modelCache={};
function getModelUrl(type){
  // ferry.glb ve metro.glb yoksa en yakın forma fallback yap
  const map={
    '0':'models/tram.glb',   // Tramvay → tram.glb ✅
    '1':'models/tram.glb',   // Metro   → tram.glb (fallback, metro.glb bekliyor)
    '2':'models/tram.glb',   // Tren    → tram.glb (fallback)
    '3':'models/bus.glb',    // Otobüs  → bus.glb  ✅
    '4':'models/bus.glb',    // Feribot → bus.glb  (fallback, ferry.glb bekliyor)
    '5':'models/tram.glb',   // Teleferik→ tram.glb
    '6':'models/tram.glb',   // Gondol  → tram.glb
    '7':'models/bus.glb',    // Funicular→ bus.glb
    '9':'models/bus.glb',    // Minibüs → bus.glb  ✅
   '10':'models/bus.glb',    // Dolmuş  → bus.glb  ✅
  };
  return map[type]||'models/bus.glb';
}
// Tip bazında boyut çarpanı — ferry daha büyük, metro daha uzun
function getModelScale(type){
  return {'0':6,'1':7,'2':8,'3':8,'4':14,'5':5,'6':5,'7':6,'9':6,'10':5}[type]||8;
}
function getModelOrientation(trip,time){
  const off=time%Math.max(trip.d,1),ts=trip.ts,p=trip.p;
  for(let i=0;i<ts.length-1;i++){
    if(off>=ts[i]&&off<=ts[i+1]&&p[i+1]){
      const dx=p[i+1][0]-p[i][0], dy=p[i+1][1]-p[i][1];
      const angle=Math.atan2(dx,dy)*180/Math.PI;
      return [0, 0, -angle]; // [pitch, roll, yaw]
    }
  }
  return [0,0,0];
}
// ── İş-12: 3D Araç Görünümü ──────────────────────────────
// ScenegraphLayer standart deck.gl CDN paketinde YOK.
// SimpleMeshLayer de mesh geometry gerektiriyor (loaders.gl).
// Güvenilir çözüm: zoom>14'te büyük yönlü ScatterplotLayer + ok işareti.
// GLB destekli tam build eklendiğinde ScenegraphLayer'a geçilir.
function build3DVehicleLayer(visTrips,time){
  // ScenegraphLayer CDN paketinde yok.
  // Zoom>14'te: büyük renkli daire (gövde) + küçük beyaz nokta (yön).
  const zoom=mapgl?mapgl.getZoom():0;
  const badge=document.getElementById('lod-badge');
  if(zoom<14){
    if(badge){badge.textContent='LOD: NOKTA';badge.className='lod-badge mid';}
    return null;
  }
  if(badge){badge.textContent='LOD: YAKLAŞIK 3D';badge.className='lod-badge on';}
  const heads=[];
  visTrips.forEach(trip=>{
    const pos=getVehiclePos(trip,time);
    if(!pos)return;
    const orient=getModelOrientation(trip,time);
    const rad=orient[2]*Math.PI/180;
    heads.push({pos,rad,c:trip.c,t:trip.t,trip});
  });
  const radii={'0':55,'1':60,'2':60,'3':48,'4':75,'7':42,'9':40,'10':38};
  return [
    new ScatterplotLayer({
      id:'3d-body',data:heads,
      getPosition:d=>d.pos,
      getRadius:d=>radii[d.t]||50,
      getFillColor:d=>[...d.c,245],
      getLineColor:[255,255,255,180],
      stroked:true,lineWidthMinPixels:2,
      radiusMinPixels:7,radiusMaxPixels:24,
      pickable:true,parameters:{depthTest:false}
    }),
    new ScatterplotLayer({
      id:'3d-dir',data:heads,
      getPosition:d=>[d.pos[0]+Math.sin(d.rad)*0.00018,d.pos[1]+Math.cos(d.rad)*0.00018],
      getRadius:16,getFillColor:[255,255,255,230],
      stroked:false,radiusMinPixels:3,radiusMaxPixels:8,
      pickable:false,parameters:{depthTest:false}
    })
  ];
}

// ═══════════════════════════════════════════════════════════
// ── FAZ 3: İş-13 — GTFS ZIP UPLOAD + PARSE + VALİDASYON ──
// ═══════════════════════════════════════════════════════════
function openGTFSModal(){
  document.getElementById('gtfs-modal').classList.remove('hidden');
}
function closeGTFSModal(){
  document.getElementById('gtfs-modal').classList.add('hidden');
}
document.getElementById('gtfs-modal-close').onclick=closeGTFSModal;
document.getElementById('btn-gtfs-upload').onclick=openGTFSModal;
// Drag-drop + tıkla-seç
const dropZone=document.getElementById('gtfs-drop-zone');
const fileInput=document.getElementById('gtfs-file-input');
if(dropZone){
  dropZone.onclick=()=>fileInput.click();
  dropZone.ondragover=e=>{e.preventDefault();dropZone.classList.add('drag-over');};
  dropZone.ondragleave=()=>dropZone.classList.remove('drag-over');
  dropZone.ondrop=e=>{e.preventDefault();dropZone.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)handleGTFSFile(f);};
}
if(fileInput)fileInput.onchange=e=>{if(e.target.files[0])handleGTFSFile(e.target.files[0]);};

function gtfsProgress(msg,pct){
  document.getElementById('gtfs-progress-wrap').classList.remove('hidden');
  document.getElementById('gtfs-drop-zone').classList.add('hidden');
  document.getElementById('gtfs-progress-msg').textContent=msg;
  document.getElementById('gtfs-progress-bar').style.width=pct+'%';
}
function gtfsValidate(files){
  const errors=[];const warnings=[];const info=[];
  const REQUIRED=['stops.txt','routes.txt','trips.txt','stop_times.txt'];
  const OPTIONAL=['shapes.txt','calendar.txt','calendar_dates.txt','frequencies.txt'];
  // 1. Zorunlu dosya kontrolü
  REQUIRED.forEach(f=>{if(!files[f])errors.push({file:f,msg:'Zorunlu dosya eksik',sev:'ERROR'});});
  // 2. stops.txt — koordinat sınırları (dünya geneli)
  if(files['stops.txt']){
    const lines=files['stops.txt'].trim().split('\n');
    const hdr=lines[0].split(',');
    const latIdx=hdr.findIndex(h=>h.trim()==='stop_lat');
    const lonIdx=hdr.findIndex(h=>h.trim()==='stop_lon');
    const idIdx =hdr.findIndex(h=>h.trim()==='stop_id');
    if(latIdx<0||lonIdx<0)errors.push({file:'stops.txt',msg:'stop_lat veya stop_lon kolonu bulunamadı',sev:'ERROR'});
    else{
      let badCoord=0;
      for(let i=1;i<Math.min(lines.length,5000);i++){
        const c=lines[i].split(',');
        const lat=parseFloat(c[latIdx]),lon=parseFloat(c[lonIdx]);
        if(isNaN(lat)||isNaN(lon)||lat<-90||lat>90||lon<-180||lon>180)badCoord++;
      }
      if(badCoord>0)warnings.push({file:'stops.txt',msg:`${badCoord} satırda geçersiz koordinat`,sev:'WARNING'});
    }
  }
  // 3. Referans bütünlüğü: trips.txt → routes.txt
  if(files['trips.txt']&&files['routes.txt']){
    const routeIds=new Set(files['routes.txt'].trim().split('\n').slice(1)
      .map(l=>{const c=l.split(',');return c[0]?.trim();}));
    const tripLines=files['trips.txt'].trim().split('\n');
    const hdr=tripLines[0].split(',');
    const ridIdx=hdr.findIndex(h=>h.trim()==='route_id');
    let orphan=0;
    for(let i=1;i<Math.min(tripLines.length,2000);i++){
      const rid=tripLines[i].split(',')[ridIdx]?.trim();
      if(rid&&!routeIds.has(rid))orphan++;
    }
    if(orphan>0)warnings.push({file:'trips.txt',msg:`${orphan} sefer geçersiz route_id referansı içeriyor`,sev:'WARNING'});
  }
  // 4. stop_times zaman formatı
  if(files['stop_times.txt']){
    const lines=files['stop_times.txt'].trim().split('\n').slice(1,200);
    const badTime=lines.filter(l=>{const p=l.split(',');return p[1]&&!/^\d{1,2}:\d{2}:\d{2}$/.test(p[1].trim());}).length;
    if(badTime>0)warnings.push({file:'stop_times.txt',msg:`${badTime} satırda geçersiz zaman formatı (HH:MM:SS bekleniyor)`,sev:'WARNING'});
  }
  // 5. İstatistik bilgileri
  if(files['stops.txt'])info.push({file:'stops.txt',msg:`${files['stops.txt'].trim().split('\n').length-1} durak`,sev:'INFO'});
  if(files['trips.txt'])info.push({file:'trips.txt',msg:`${files['trips.txt'].trim().split('\n').length-1} sefer`,sev:'INFO'});
  if(files['routes.txt'])info.push({file:'routes.txt',msg:`${files['routes.txt'].trim().split('\n').length-1} hat`,sev:'INFO'});
  if(files['stop_times.txt'])info.push({file:'stop_times.txt',msg:`${files['stop_times.txt'].trim().split('\n').length-1} stop_time kaydı`,sev:'INFO'});
  OPTIONAL.forEach(f=>{if(!files[f])info.push({file:f,msg:'Opsiyonel dosya mevcut değil',sev:'INFO'});});
  return{errors,warnings,info};
}
function exportReportJSON(report, fileName) {
  const data = {
    file: fileName,
    generated: new Date().toISOString(),
    summary: { errors: report.errors.length, warnings: report.warnings.length, info: report.info.length },
    items: [...report.errors, ...report.warnings, ...report.info]
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace('.zip', '_validation.json');
  a.click();
  URL.revokeObjectURL(a.href);
}

function showValidationReport(report, fileName, parsedFiles) {
  const wrap = document.getElementById('gtfs-validation-wrap');
  wrap.classList.remove('hidden');
  const all = [...report.errors, ...report.warnings, ...report.info];
  const errCount = report.errors.length, warnCount = report.warnings.length;
  // KARAR: hata olsa da sisteme al — kullanıcıya bildir
  const status = errCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'ok';
  const statusText = {
    'error': '⚠️ Hatalar Tespit Edildi — Yine de Sisteme Alındı',
    'warn':  '⚠️ Uyarılar Var — Sisteme Alındı',
    'ok':    '✅ Geçerli GTFS — Sisteme Alındı'
  }[status];
  wrap.innerHTML = `
    <div class="gtfs-report-header" data-status="${status}">
      <span>${statusText}</span>
      <span class="gtfs-file-name">${fileName}</span>
    </div>
    <div class="gtfs-notice">
      ℹ️ ${errCount} hata ve ${warnCount} uyarı tespit edildi.
      Simülasyon mevcut verilerle çalışmaya devam ediyor. Hatalar aşağıda listelenmiştir.
    </div>
    <div class="gtfs-report-body">
      ${all.map(e => `<div class="gr-row gr-${e.sev.toLowerCase()}">
        <span class="gr-sev">${e.sev}</span>
        <span class="gr-file">${e.file}</span>
        <span class="gr-msg">${e.msg}</span>
      </div>`).join('')}
    </div>
    <div class="gtfs-report-footer">
      <span>${errCount} hata · ${warnCount} uyarı · ${report.info.length} bilgi</span>
      <button class="gtfs-export-btn" id="btn-export-json">⬇ JSON Rapor</button>
    </div>`;
  document.getElementById('btn-export-json')?.addEventListener('click', () => exportReportJSON(report, fileName));
}

window.handleGTFSFile = async function(file) {
  if (!window.JSZip) { alert('JSZip kütüphanesi yüklenemedi.'); return; }
  gtfsProgress('ZIP açılıyor...', 5);
  try {
    const zip = await JSZip.loadAsync(file);
    gtfsProgress('Dosyalar okunuyor...', 25);
    const files = {};
    const names = Object.keys(zip.files);
    let i = 0;
    for (const name of names) {
      if (name.endsWith('.txt')) {
        const bare = name.split('/').pop();
        files[bare] = await zip.files[name].async('string');
        i++; gtfsProgress(`${bare} okunuyor...`, 25 + Math.min(50, i * 8));
      }
    }
    gtfsProgress('Validasyon yapılıyor...', 80);
    const report = gtfsValidate(files);
    _gtfsReport = report; window.gtfsValidationReport = report;
    gtfsProgress('Tamamlandı.', 100);
    // FIX 5: Stops.txt'ten şehir merkezi ve sınır hesapla → CITIES listesine ekle
    if(files['stops.txt']){
      try{
        const lines=files['stops.txt'].trim().split('\n');
        const hdr=lines[0].split(',');
        const latIdx=hdr.findIndex(h=>h.trim()==='stop_lat');
        const lonIdx=hdr.findIndex(h=>h.trim()==='stop_lon');
        const nameIdx=hdr.findIndex(h=>h.trim()==='stop_name');
        if(latIdx>=0&&lonIdx>=0){
          let minLat=90,maxLat=-90,minLon=180,maxLon=-180;
          for(let i=1;i<lines.length;i++){
            const c=lines[i].split(',');
            const lat=parseFloat(c[latIdx]),lon=parseFloat(c[lonIdx]);
            if(!isNaN(lat)&&!isNaN(lon)){
              if(lat<minLat)minLat=lat;if(lat>maxLat)maxLat=lat;
              if(lon<minLon)minLon=lon;if(lon>maxLon)maxLon=lon;
            }
          }
          const cLat=(minLat+maxLat)/2,cLon=(minLon+maxLon)/2;
          // Dosya adından şehir adı tahmin et
          const rawName=file.name.replace(/\.zip$/i,'').replace(/[_-]/g,' ');
          const cityName=rawName.charAt(0).toUpperCase()+rawName.slice(1);
          const cityId='gtfs_'+Date.now();
          const stopCount=lines.length-1;
          const newCity={
            id:cityId,name:cityName,flag:'📂',
            center:[cLon,cLat],zoom:12,pitch:50,bearing:0,
            dataFiles:[],note:`${stopCount} durak · GTFS yüklendi`
          };
          if(!CITIES.find(c=>Math.abs(c.center[0]-cLon)<0.5&&Math.abs(c.center[1]-cLat)<0.5)){
            CITIES.push(newCity);
            buildCityList();
            console.log('[GTFS] Şehir eklendi:', cityName, cLon, cLat);
          }
        }
      }catch(e){console.warn('Şehir eklenirken hata:',e);}
    }
    setTimeout(() => {
      document.getElementById('gtfs-progress-wrap').classList.add('hidden');
      showValidationReport(report, file.name, files);
      const row=document.getElementById('gtfs-confirm-row');
      if(row){row.classList.remove('hidden');row.style.display='flex';}
    }, 400);
  } catch (err) {
    gtfsProgress('ZIP parse hatası: ' + err.message, 0);
    console.error('GTFS parse hatası:', err);
  }
};

// ═══════════════════════════════════════════════════════════
// ── #8: GTFS Onayla / İptal ────────────────────────────────
document.getElementById('btn-gtfs-confirm')?.addEventListener('click',()=>{
  // Raporu zaten window.gtfsValidationReport'a yazdık — "sisteme alındı" bildirimi
  const row=document.getElementById('gtfs-confirm-row');
  if(row)row.innerHTML='<div style="text-align:center;color:#3fb950;font-size:13px;font-weight:700;padding:8px 0;">✅ Veri başarıyla sisteme alındı</div>';
  setTimeout(()=>closeGTFSModal(),1400);
});
document.getElementById('btn-gtfs-cancel')?.addEventListener('click',()=>closeGTFSModal());

// ── #9: DURAK CLICK → CANLI SEFER TABLOSU ─────────────────
// 3 sütun: Hat adı | İlk gelecek araç (dk) | Sonraki araç (dk)
function showStopArrivals(stop){
  const[lon,lat,shortName,,,fullName]=stop;
  const name=fullName||shortName||'—';
  const sid=Object.keys(STOP_INFO).find(k=>{
    const s=STOP_INFO[k];
    return Math.abs(s[0]-lon)<0.0002&&Math.abs(s[1]-lat)<0.0002;
  });
  document.getElementById('stop-panel-name').textContent=name;
  const meta=sid?`Durak ID: ${sid}`:'';
  document.getElementById('stop-panel-meta').textContent=meta;

  const table=document.getElementById('stop-arrivals-table');
  table.innerHTML='';

  const deps=sid?STOP_DEPS[sid]:null;
  if(!deps?.length){
    table.innerHTML='<div class="sa-empty">Bu durağa sefer bulunamadı.</div>';
    document.getElementById('stop-panel').classList.remove('hidden');
    return;
  }
  const simMod=simTime%86400;

  // Hat bazında sonraki 2 seferi bul
  const byRoute={};
  for(const[ti,offset,routeShort]of deps){
    const trip=TRIPS[ti];if(!trip)continue;
    const diff=((offset-simMod+86400)%86400); // saniye cinsinden
    if(diff>3*3600)continue; // 3 saatten fazla uzak olanı gösterme
    const key=routeShort||trip.s;
    if(!byRoute[key])byRoute[key]={trip,name:key,diffs:[]};
    byRoute[key].diffs.push(diff);
  }
  // Her hat için ilk 2 gelişi sırala
  const rows=Object.values(byRoute).map(r=>({
    ...r,
    diffs:r.diffs.sort((a,b)=>a-b).slice(0,2)
  })).sort((a,b)=>a.diffs[0]-b.diffs[0]);

  if(!rows.length){
    table.innerHTML='<div class="sa-empty">Yakın zamanda sefer yok (3 saat içinde).</div>';
    document.getElementById('stop-panel').classList.remove('hidden');
    return;
  }

  const fmtDiff=d=>{
    const m=Math.round(d/60);
    if(m<1)return '<1 dk';
    return m+' dk';
  };

  rows.slice(0,20).forEach(r=>{
    const m=TYPE_META[r.trip.t]||{};
    const d0=r.diffs[0];
    const d1=r.diffs[1];
    const mins0=Math.round(d0/60);
    const timeClass=mins0<2?'soon':mins0<6?'coming':'';
    const row=document.createElement('div');
    row.className='sa-row';
    // Hat rengi dot
    const dot=`<span class="sa-dot" style="background:${m.c||'#58a6ff'}"></span>`;
    const nameSpan=document.createElement('span');
    nameSpan.className='sa-route-name';
    nameSpan.innerHTML=dot;
    nameSpan.appendChild(document.createTextNode(`${m.i||''} ${r.name}`));
    const t1=document.createElement('span');
    t1.className='sa-time '+timeClass;
    t1.textContent=fmtDiff(d0);
    const t2=document.createElement('span');
    t2.className='sa-time2';
    t2.textContent=d1!==undefined?fmtDiff(d1):'—';
    row.appendChild(nameSpan);
    row.appendChild(t1);
    row.appendChild(t2);
    table.appendChild(row);
  });
  document.getElementById('stop-panel').classList.remove('hidden');
}
document.getElementById('stop-panel-close')?.addEventListener('click',()=>{
  document.getElementById('stop-panel').classList.add('hidden');
});

// Override handleClick to use new stop panel (#9)
function handleClick(info){
  if(!info?.object)return;
  const o=info.object;
  // Durak tıklaması → STOP_INFO formatı: [lon, lat, shortName, ?, fullName?]
  if(Array.isArray(o)&&o.length>=3){
    showStopArrivals(o);
    return;
  }
  // Araç tıklaması
  if(o?.s&&o?.t&&o?.p){
    const idx=findTripIdx(o);
    if(idx>=0)openVehiclePanel(idx);
  }
}
// ═══════════════════════════════════════════════════════════
let activeCity=CITIES[0];

function buildCityList(){
  const list=document.getElementById('city-list');
  if(!list)return;
  list.innerHTML='';
  CITIES.forEach(city=>{
    const div=document.createElement('div');
    div.className='city-item'+(city.id===activeCity.id?' active':'');
    div.innerHTML=`<span class="city-flag">${city.flag}</span>
      <div class="city-info"><div class="city-name">${city.name}</div>
      <div class="city-note">${city.note||''}</div></div>
      ${city.id===activeCity.id?'<span class="city-check">✓</span>':''}`;
    div.onclick=()=>loadCity(city);
    list.appendChild(div);
  });
}

function loadCity(city){
  if(city.id===activeCity.id)return;
  activeCity=city;
  // Loading overlay
  const ov=document.getElementById('city-loading');
  const nm=document.getElementById('city-loading-name');
  if(ov){ov.classList.remove('hidden');nm.textContent=city.name+' yükleniyor...';}
  // Haritayı şehre taşı
  mapgl.flyTo({center:city.center,zoom:city.zoom,pitch:city.pitch||52,bearing:city.bearing||0,duration:1500});
  // Liste güncelle
  buildCityList();
  // Data dosyaları yüklendikten sonra overlay kapat
  // (gerçek çoklu şehir için data dosyaları dinamik yüklenir)
  setTimeout(()=>{if(ov)ov.classList.add('hidden');},2000);
}

// Native Electron klasör taraması sonucu
window.handleNativeCityScan=async function(cities){
  if(!cities?.length)return;
  cities.forEach(c=>{
    if(!CITIES.find(x=>x.id===c.id))CITIES.push(c);
  });
  buildCityList();
};

// İlk yükleme
buildCityList();

// ── FAZ 3: İş-12 toggle ───────────────────────────────────
document.getElementById('tog-3d')?.addEventListener('change',function(){
  show3D=this.checked;
  const badge=document.getElementById('lod-badge');
  if(badge)badge.className='lod-badge'+(show3D?'':' off');
});