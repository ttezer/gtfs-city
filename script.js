/* ═══════════════════════════════════════════════════════════
   İstanbul Transit 3D  —  FAZ 1 TAM
   İş-01: Peak hour slider + sparkline histogram
   İş-02: FPS + aktif araç HUD
   İş-03: Araç tıklama detay paneli (hız, headway, sonraki durak)
   İş-04: Hat aç/kapat + route focus
   İş-05: Replay modu (24h, döngü)
   İş-06: Heatmap katmanı (saatlik)
   ═══════════════════════════════════════════════════════════ */

const { DeckGL, TripsLayer, PathLayer, ScatterplotLayer, ColumnLayer, HeatmapLayer } = deck;

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
const PHASE_CFG = {
  night:{badge:'🌙 GECE',   bg:'#0d1520',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'},
  dawn: {badge:'🌅 ŞAFAK',  bg:'#1a0e05',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'},
  day:  {badge:'☀️ GÜNDÜZ', bg:'#0d2233',style:'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'},
  dusk: {badge:'🌆 AKŞAM',  bg:'#150d05',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'},
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
let typeFilter='all';
let activeRoutes=new Set();
let focusedRoute=null;
let followTripIdx=null, selectedTripIdx=null;
let isReplay=false, replayLoop=false;
let fromStopId=null, toStopId=null, routeHighlightPath=null;
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

function add3DBuildings(){
  if(mapgl.getLayer('3d-buildings'))return;
  const firstLabel=mapgl.getStyle()?.layers?.find(l=>l.type==='symbol')?.id;
  try{mapgl.addLayer({
    id:'3d-buildings',source:'openmaptiles','source-layer':'building',
    type:'fill-extrusion',minzoom:13,
    paint:{
      'fill-extrusion-color':currentPhase==='day'?'#c8d0d8':'#1c2535',
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,15,['get','render_height']],
      'fill-extrusion-base':['get','render_min_height'],
      'fill-extrusion-opacity':0.72
    }
  },firstLabel);}catch(e){}
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
    initialViewState:{longitude:28.9784,latitude:41.0082,zoom:11.5,pitch:52,bearing:-14},
    controller:true,
    onViewStateChange(e){
      if(followTripIdx!==null)return;
      mapgl.jumpTo({center:[e.viewState.longitude,e.viewState.latitude],zoom:e.viewState.zoom,bearing:e.viewState.bearing,pitch:e.viewState.pitch});
    },
    onHover:handleHover,onClick:handleClick,layers:[]
  });
  mapgl.on('move',()=>{
    if(followTripIdx!==null)return;
    const c=mapgl.getCenter();
    deckgl.setProps({initialViewState:{longitude:c.lng,latitude:c.lat,zoom:mapgl.getZoom(),bearing:mapgl.getBearing(),pitch:mapgl.getPitch(),transitionDuration:0}});
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

// ── CLICK ─────────────────────────────────────────────────
function handleClick(info){
  if(!info?.object)return;
  const o=info.object;
  if(Array.isArray(o)&&o.length>=3){showDepartures(o);return;}
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
  SHAPES.forEach(s=>{if(!byType[s.t])byType[s.t]=[];if(!byType[s.t].find(r=>r.s===s.s))byType[s.t].push({s:s.s,c:s.c,t:s.t});});
  routeListEl.innerHTML='';
  Object.keys(TYPE_META).forEach(type=>{
    if(!byType[type])return;
    byType[type].sort((a,b)=>a.s.localeCompare(b.s)).forEach(route=>{
      const div=document.createElement('div');div.className='route-item';div.dataset.short=route.s;
      const color=`rgb(${route.c[0]},${route.c[1]},${route.c[2]})`;
      div.innerHTML=`<div class="ri-bar" style="background:${color}"></div>
        <div class="ri-info"><div class="ri-name">${route.s}</div><div class="ri-type">${TYPE_META[type].n}</div></div>
        <input type="checkbox" class="ri-check" checked data-short="${route.s}">`;
      div.onclick=e=>{if(e.target.type==='checkbox')return;focusRoute(route.s,div);};
      div.querySelector('.ri-check').onchange=e=>{
        if(e.target.checked)activeRoutes.delete(route.s);else activeRoutes.add(route.s);
        div.classList.toggle('hidden-route',!e.target.checked);
      };
      routeListEl.appendChild(div);
    });
  });
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
    layers.push(new ScatterplotLayer({id:'heads',data:heads,getPosition:d=>d.pos,getRadius:52,getFillColor:d=>focusedRoute&&d.trip.s!==focusedRoute?[50,55,60,180]:[...d.c,255],getLineColor:[255,255,255,180],stroked:QUALITY.level>0,lineWidthMinPixels:1.5,radiusMinPixels:3,radiusMaxPixels:13,pickable:true}));
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
const togMap={'anim':v=>showAnim=v,'paths':v=>showPaths=v,'density':v=>showDensity=v,'stops':v=>showStops=v,'buildings':v=>{showBuildings=v;if(mapgl.getLayer('3d-buildings'))mapgl.setLayoutProperty('3d-buildings','visibility',v?'visible':'none');},'rendezvous':v=>showRendezvous=v,'heatmap':v=>{showHeatmap=v;document.getElementById('heatmap-ctrl').classList.toggle('hidden',!v);}};
Object.keys(togMap).forEach(id=>{const el=document.getElementById('tog-'+id);if(el)el.onchange=function(){togMap[id](this.checked);};});
document.querySelectorAll('.tbtn').forEach(btn=>{btn.onclick=function(){document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('active'));this.classList.add('active');typeFilter=this.dataset.t;};});
document.getElementById('heatmap-hour').oninput=function(){heatmapHour=parseInt(this.value);document.getElementById('heatmap-hour-lbl').textContent=secsToHHMM(heatmapHour*3600);};
document.getElementById('heatmap-follow-sim').onchange=e=>{heatmapFollowSim=e.target.checked;};

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

// ── BAŞLANGIÇ ─────────────────────────────────────────────
buildRouteList();
window.onresize=()=>{const c=document.getElementById('deck-canvas');c.width=window.innerWidth;c.height=window.innerHeight;};
