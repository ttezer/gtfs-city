/* ═══════════════════════════════════════════════════════════
   Transit 3D — Ana Uygulama Orkestrasyonu
   ═══════════════════════════════════════════════════════════ */

// ── DECK FIX (KRİTİK) ─────────────────────────────────────
// CDN’den gelen deck.gl → window.deck olur. Eskiden "deck is not defined" hatası veriyordu.
// Bu satırı ekledim, gerisini olduğu gibi bıraktım.
const deck = window.deck || window.Deck;
const {
  MapboxOverlay, TripsLayer, ScatterplotLayer,
  ColumnLayer, HeatmapLayer, LineLayer,
  IconLayer
} = deck;

// ── BAŞLANGIÇ DURUMU ─────────────────────────────────────
// Uygulama varsayılan olarak preload dosyalarına bağlı başlamaz.
// Eğer legacy bundle'lar elle yüklenmişse yine okunabilir; aksi halde
// başlangıç boş state ile açılır ve varsayılan şehir ZIP'i yüklenir.

const AppState = {
  trips: typeof TRIPS !== 'undefined' ? TRIPS : [],
  shapes: typeof SHAPES !== 'undefined' ? SHAPES : [],
  stops: typeof STOPS !== 'undefined' ? STOPS : [],
  stopInfo: typeof STOP_INFO !== 'undefined' ? STOP_INFO : {},
  stopDeps: typeof STOP_DEPS !== 'undefined' ? STOP_DEPS : {},
  hourlyCounts: typeof HOURLY_COUNTS !== 'undefined' ? HOURLY_COUNTS : new Array(24).fill(0),
  hourlyHeat: typeof HOURLY_HEAT !== 'undefined' ? HOURLY_HEAT : {},
  adj: typeof ADJ !== 'undefined' ? ADJ : {},
  calendarRows: typeof CALENDAR !== 'undefined' ? CALENDAR : [],
  calendarDateRows: typeof CALENDAR_DATES !== 'undefined' ? CALENDAR_DATES : [],
  densityData: [],
  maxDensity: 1,
  stopNames: [],
  gtfsValidationReport: null,
  baseRuntimeData: null,
};

var TRIPS = AppState.trips;
var SHAPES = AppState.shapes;
var STOPS = AppState.stops;
var STOP_INFO = AppState.stopInfo;
var STOP_DEPS = AppState.stopDeps;
var HOURLY_COUNTS = AppState.hourlyCounts;
var HOURLY_HEAT = AppState.hourlyHeat;
var ADJ = AppState.adj;

// ── ADAPTİF KALİTE SİSTEMİ ──────────────────────────────
const QUALITY = {
  level: 2,
  fps: 60,
  fpsHistory: [],
  lastCheck: 0,
  update(ts, fps) {
    this.fps = fps;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    if (ts - this.lastCheck < 3000) return;
    this.lastCheck = ts;
    const avg = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    if (avg < 20 && this.level > 0) { this.level--; console.log('Kalite düşürüldü:', this.level); }
    else if (avg > 45 && this.level < 2) { this.level++; console.log('Kalite artırıldı:', this.level); }
  },
  get showGlow() { return this.level >= 2; },
  get showStopsDetail() { return this.level >= 1; },
  get trailLength() { return [80, 140, 200][this.level]; },
  get rounded() { return this.level >= 1; },
};

// ── EKSİK FONKSİYONLAR ─────────────────────────────────────
let build3DVehicleLayer, updateVehiclePanel, showStopArrivals;
let _activeStopData = null; // Açık durak paneli için

function captureRuntimeDataSnapshot(existing) {
  if (existing) return existing;
  return {
    _cityId: activeCity?.id || null,
    nTRIPS: AppState.trips,
    nSHAPES: AppState.shapes,
    nSTOPS: AppState.stops,
    nSTOP_INFO: AppState.stopInfo,
    nSTOP_DEPS: AppState.stopDeps,
    nHOURLY_COUNTS: AppState.hourlyCounts,
    nHOURLY_HEAT: AppState.hourlyHeat
  };
}

async function getBuiltinGtfsPayload(city) {
  if (!city || !city.gtfsZip) return null;
  try {
    if (window.IS_ELECTRON && window.electronAPI?.readDataFile) {
      const result = await window.electronAPI.readDataFile(city.gtfsZip);
      if (result?.success && result.buffer) {
        return { files: await parseZipBuffer(result.buffer), fileName: city.gtfsZip };
      }
    }
    const response = await fetch(city.gtfsZip);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return { files: await parseZipBuffer(buffer), fileName: city.gtfsZip };
  } catch (err) {
    console.warn('[getBuiltinGtfsPayload] yüklenemedi:', err);
    return null;
  }
}

async function parseZipBuffer(buffer) {
  if (!window.JSZip) throw new Error('JSZip yüklü değil');
  const zip = await JSZip.loadAsync(buffer);
  const files = {};
  const decodeGtfsText = (uint8) => {
    if (!(uint8 instanceof Uint8Array)) return '';
    const tryDecode = (label) => {
      try {
        return new TextDecoder(label).decode(uint8);
      } catch (_) {
        return '';
      }
    };
    const utf8 = tryDecode('utf-8');
    if (utf8 && !utf8.includes('\uFFFD')) return utf8;
    const cp1254 = tryDecode('windows-1254');
    if (cp1254) return cp1254;
    return utf8 || '';
  };

  for (const name of Object.keys(zip.files)) {
    const zipEntry = zip.files[name];
    if (zipEntry.dir) continue;
    const bare = name.split('/').pop();
    if (!bare) continue;
    const normalized = bare.replace(/\.csv$/i, '.txt');
    if (!normalized.endsWith('.txt')) continue;
    const raw = await zipEntry.async('uint8array');
    if (normalized === 'stop_times.txt') {
      files[normalized] = raw;
    } else {
      files[normalized] = decodeGtfsText(raw);
    }
  }
  return files;
}

AppState.adj = {};
function buildAdjacencyList() {
  AppState.adj = {};
  // ADJ ataması fonksiyon sonunda yapılır (tüm bağlantılar eklendikten sonra)
  const tripStops = {};

  for (const [sid, deps] of Object.entries(AppState.stopDeps || {})) {
    for (const [tripIdx, offsetSec, routeShort] of deps) {
      if (!AppState.trips[tripIdx]) continue;
      if (!tripStops[tripIdx]) tripStops[tripIdx] = [];
      tripStops[tripIdx].push({ sid, offsetSec, routeShort: routeShort || AppState.trips[tripIdx].s });
    }
  }

  const adjMap = {};
  for (const [, stops] of Object.entries(tripStops)) {
    stops.sort((a, b) => a.offsetSec - b.offsetSec);
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i].sid;
      const to = stops[i + 1].sid;
      const secs = Math.max(stops[i + 1].offsetSec - stops[i].offsetSec, 30);
      const line = stops[i].routeShort;

      if (!from || !to || from === to) continue;
      if (!adjMap[from]) adjMap[from] = new Map();
      const key = to + '|' + line;
      const ex = adjMap[from].get(key);
      if (ex) {
        if (secs < ex[1]) ex[1] = secs;
      } else {
        adjMap[from].set(key, [to, secs, line]);
      }
    }
  }
  for (const k in adjMap) {
    AppState.adj[k] = [...adjMap[k].values()];
  }

  // ── YÜRÜME BAĞLANTILARI ──────────────────────────────
  // 400m içindeki farklı duraklar arası yürüme bağlantısı ekle
  // 400m ≈ 5 dakika yürüme ≈ ~308 saniye (1.3 m/s)
  const WALK_MAX_M = 400;
  const WALK_SPEED = 1.3;
  const GRID_SIZE = 0.004;
  const stopEntries = Object.entries(AppState.stopInfo || {});
  const grid = {};
  for (const [sid, info] of stopEntries) {
    const key = Math.floor(info[0] / GRID_SIZE) + ',' + Math.floor(info[1] / GRID_SIZE);
    if (!grid[key]) grid[key] = [];
    grid[key].push([sid, info]);
  }
  let walkCount = 0;
  for (const [sidA, infoA] of stopEntries) {
    const gx = Math.floor(infoA[0] / GRID_SIZE);
    const gy = Math.floor(infoA[1] / GRID_SIZE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbors = grid[(gx + dx) + ',' + (gy + dy)] || [];
        for (const [sidB, infoB] of neighbors) {
          if (sidA === sidB) continue;
          const distM = haversineM([infoA[0], infoA[1]], [infoB[0], infoB[1]]);
          if (distM > WALK_MAX_M) continue;
          const walkSecs = Math.round(distM / WALK_SPEED);
          if (!AppState.adj[sidA]) AppState.adj[sidA] = [];
          if (!AppState.adj[sidA].some(e => e[0] === sidB && e[2] === '🚶')) {
            AppState.adj[sidA].push([sidB, walkSecs, '🚶']);
            walkCount++;
          }
        }
      }
    }
  }
  console.log('[ADJ] Yürüme bağlantısı eklendi:', walkCount);
  ADJ = AppState.adj;
}

// ── SABITLER ─────────────────────────────────────────────
// SPRINT 5: TYPE_META fallback güvenliği.
// Önce: yalnızca '3' (otobüs) tipi vardı → diğer tipler undefined dönüyordu.
// Şimdi: config.js'deki TYPE_META ile tam senkronize. config.js yüklenmezse
// tüm tipler için çalışan eksiksiz bir fallback devreye girer.
const TYPE_META = (window.CONFIG && window.CONFIG.TYPE_META) || {
  '0': { n: 'Tramvay', c: '#E74C3C', rgb: [231, 76, 60], i: '🚋', w: 4 },
  '1': { n: 'Metro', c: '#8E44AD', rgb: [142, 68, 173], i: '🚇', w: 5 },
  '2': { n: 'Tren', c: '#2980B9', rgb: [41, 128, 185], i: '🚆', w: 5 },
  '3': { n: 'Otobüs', c: '#27AE60', rgb: [39, 174, 96], i: '🚌', w: 3 },
  '4': { n: 'Feribot', c: '#1ABC9C', rgb: [26, 188, 156], i: '⛴️', w: 3 },
  '5': { n: 'Teleferik', c: '#F39C12', rgb: [243, 156, 18], i: '🚡', w: 3 },
  '6': { n: 'Gondol', c: '#E67E22', rgb: [230, 126, 34], i: '🚡', w: 3 },
  '7': { n: 'Funicular', c: '#D35400', rgb: [211, 84, 0], i: '🚠', w: 3 },
  '9': { n: 'Minibüs', c: '#7F8C8D', rgb: [127, 140, 141], i: '🚐', w: 2 },
  '10': { n: 'Dolmuş', c: '#95A5A6', rgb: [149, 165, 166], i: '🚖', w: 2 },
};

const PHASE_CFG = {
  night: { badge: '🌙 GECE', bg: '#0d1520', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  dawn: { badge: '🌅 ŞAFAK', bg: '#1a0e05', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  day: { badge: '☀️ GÜNDÜZ', bg: '#0d2233', style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  dusk: { badge: '🌆 AKŞAM', bg: '#150d05', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
};
const SPEEDS = [1, 10, 30, 60, 120, 300, 600];

// ── SİMÜLASYON STATE ─────────────────────────────────────
let simTime = 6 * 3600, simPaused = false, lastTs = null;
let speedIdx = 3, simSpeed = 60;
let showAnim = true, showPaths = true, showDensity = true, showStops = true, showStopCoverage = false;
let showHeatmap = false, heatmapHour = 8, heatmapFollowSim = false;
let showTrail = false;
let currentMapStyle = 'auto'; // 'auto', 'satellite', 'dark', 'light'
let typeFilter = 'all';
let activeRoutes = new Set();
let focusedRoute = null;
let followTripIdx = null, selectedTripIdx = null;
let selectedEntity = null, panelPauseOwner = null;
let isReplay = false, replayLoop = false;
let routeHighlightPath = null;

// ── KATMAN CACHE STATE ────────────────────────────────────
let _lastBuildTime = 0;
let _lastBuiltLayers = [];
let _staticLayers = [];
let _staticLayerKey = '';
let _cachedVisTrips = null, _cachedVisShapes = null, _cacheTypeFilter = null, _cacheActiveRoutes = '';
let _routeShapeSnapCache = new Map();
let _tripLookupCache = null;
let _stopRouteSummariesCache = new Map();

// ── FAZ 2 STATE ───────────────────────────────────────────
let showHeadway = false, showBunching = false, showWaiting = false;
let showIsochron = false;
let _isochronData = null, _isochronOriginSid = null;
let bunchingThreshold = 200;
let bunchingEvents = [];
let _stopAvgHeadways = null, _worstStops = null, _focusedStopIdsCache = null, _filteredStopsCache = null, _filteredStopIdSetCache = null;
let _waitingTimeBucket = null, _waitingComputedForSec = null;

// ── FAZ 3 STATE ───────────────────────────────────────────
let show3D = false;
let _gtfsReport = null;
AppState.gtfsValidationReport = null;
let lastGtfsLoadError = '';
const CITIES = [];
const uploadedGtfsCities = new Map();
const hiddenCities = new Set();
const HEADWAY_CFG = (window.CONFIG && window.CONFIG.HEADWAY) || {
  minPairDistanceM: 10,
  maxPairDistanceM: 15000,
  transitionDistanceM: 3000,
  minGapSeconds: 60,
  maxGapSeconds: 7200,
  minPairSeconds: 45,
  maxPairSeconds: 2700,
  transitionSeconds: 600,
  bunchingTimeThresholdSeconds: 180,
  bunchingThreshold: 200,
};
const WAITING_CFG = {
  bucketSeconds: 600,
  windowSeconds: 10800,
  maxNearbyGaps: 6,
};
const STOP_PANEL_CFG = {
  maxArrivalWindowSeconds: 7200,
  uniqueArrivalThresholdSeconds: 45,
};
const GTFS_REQUIRED_FILES = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
let gtfsErrorLog = [];

// ── FAZ 2: SİNEMATİK ─────────────────────────────────────
let isCinematic = false, cinematicIdx = 0, cinematicTimer = null;
function getCinematicWaypoints() {
  const stopData = getFilteredStopsData?.() || STOPS || [];
  if (!Array.isArray(stopData) || stopData.length === 0) {
    const center = mapgl ? [mapgl.getCenter().lng, mapgl.getCenter().lat] : [28.9784, 41.0082];
    return [{
      center,
      zoom: mapgl?.getZoom?.() || 11.5,
      pitch: 52,
      bearing: 0,
      duration: 3800,
      label: 'Genel Bakış',
    }];
  }

  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const stop of stopData) {
    const lon = Number(stop?.[0]);
    const lat = Number(stop?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    const center = mapgl ? [mapgl.getCenter().lng, mapgl.getCenter().lat] : [28.9784, 41.0082];
    return [{
      center,
      zoom: mapgl?.getZoom?.() || 11.5,
      pitch: 52,
      bearing: 0,
      duration: 3800,
      label: 'Genel Bakış',
    }];
  }

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanLon = Math.max(0.003, maxLon - minLon);
  const spanLat = Math.max(0.003, maxLat - minLat);
  const span = Math.max(spanLon, spanLat);
  let overviewZoom = 11.8;
  if (span > 1.2) overviewZoom = 8.7;
  else if (span > 0.8) overviewZoom = 9.5;
  else if (span > 0.45) overviewZoom = 10.3;
  else if (span > 0.2) overviewZoom = 11.1;
  else if (span > 0.1) overviewZoom = 12.1;
  else if (span < 0.04) overviewZoom = 13.2;

  const points = [
    { center: [centerLon, centerLat], zoom: overviewZoom, pitch: 52, bearing: -12, duration: 3800, label: 'Genel Bakış' },
    { center: [minLon + spanLon * 0.2, centerLat], zoom: Math.min(overviewZoom + 1.2, 14.4), pitch: 60, bearing: 24, duration: 4000, label: 'Batı Koridoru' },
    { center: [maxLon - spanLon * 0.2, centerLat], zoom: Math.min(overviewZoom + 1.2, 14.4), pitch: 60, bearing: -28, duration: 4000, label: 'Doğu Koridoru' },
    { center: [centerLon, maxLat - spanLat * 0.2], zoom: Math.min(overviewZoom + 0.8, 14.2), pitch: 58, bearing: 36, duration: 4000, label: 'Kuzey Hattı' },
    { center: [centerLon, minLat + spanLat * 0.2], zoom: Math.min(overviewZoom + 0.8, 14.2), pitch: 58, bearing: -36, duration: 3600, label: 'Ağ Özeti' },
  ];

  return points.filter((point, index, array) => {
    const firstIdx = array.findIndex((candidate) =>
      Math.abs(candidate.center[0] - point.center[0]) < 0.0001 &&
      Math.abs(candidate.center[1] - point.center[1]) < 0.0001
    );
    return firstIdx === index;
  });
}
// ── YARDIMCILAR ───────────────────────────────────────────
function haversineM([lon1, lat1], [lon2, lat2]) {
  return window.SimUtils
    ? window.SimUtils.haversineM([lon1, lat1], [lon2, lat2])
    : (() => { const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); })();
}
function modDay(sec) { return ((sec % 86400) + 86400) % 86400; }
// ADR-004: getTripRuntimeOffset tek kaynak sim-utils.js — bu wrapper oraya delegate eder.
// SimUtils yüklenmeden önce çağrılma ihtimaline karşı lokal impl fallback olarak korunuyor.
function getTripRuntimeOffset(trip, time) {
  if (window.SimUtils?.getTripRuntimeOffset) return window.SimUtils.getTripRuntimeOffset(trip, time);
  if (!trip?.ts?.length) return null;
  const dayTime = modDay(time);
  if (!(trip._tsPatched || trip.ts[0] > 0)) return time % Math.max(trip.d, 1);
  if (trip.ts[trip.ts.length - 1] >= 86400 && dayTime < trip.ts[0]) return dayTime + 86400;
  return dayTime;
}
function isAbsoluteStopOffset(trip, offset) {
  if (!trip?.ts?.length || !Number.isFinite(offset)) return false;
  const dayOffset = modDay(offset);
  if (trip.ts[trip.ts.length - 1] >= 86400) {
    const altOffset = dayOffset + 86400;
    return altOffset >= trip.ts[0] - 60 && altOffset <= trip.ts[trip.ts.length - 1] + 60;
  }
  return dayOffset >= trip.ts[0] - 60 && dayOffset <= trip.ts[trip.ts.length - 1] + 60;
}
function getAbsoluteDepartureSec(trip, offset) {
  if (!Number.isFinite(offset)) return null;
  const dayOffset = modDay(offset);
  if (!trip) return dayOffset;
  if (trip._tsPatched) {
    if (isAbsoluteStopOffset(trip, dayOffset)) return dayOffset;
    if (typeof trip.bs === 'number' && trip.bs >= 0) return modDay(trip.bs + dayOffset);
    if (Number.isFinite(trip._startSec)) return modDay(trip._startSec + dayOffset);
  }
  return dayOffset;
}
function circularDiffSecs(a, b) {
  const diff = Math.abs(modDay(a) - modDay(b));
  return Math.min(diff, 86400 - diff);
}
function secsToHHMM(s) { return window.SimUtils ? window.SimUtils.secsToHHMM(s) : ((h, m) => (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m)(Math.floor(s / 3600) % 24, Math.floor((s % 3600) / 60)); }
function getPhase(secs) { return window.SimUtils ? window.SimUtils.getPhase(secs) : ((h) => (h < 5 || h >= 22) ? 'night' : h < 7 ? 'dawn' : h < 19 ? 'day' : 'dusk')((secs / 3600) % 24); }
function buildPathDistanceCache(path) {
  if (!Array.isArray(path) || path.length < 2) return null;
  const cum = [0];
  for (let i = 1; i < path.length; i++)cum.push(cum[i - 1] + haversineM(path[i - 1], path[i]));
  const total = cum[cum.length - 1] || 0;
  if (total <= 0) return null;
  return { path, cum, total };
}
function getTripStopCoords(trip) {
  if (!Array.isArray(trip?.st) || !trip.st.length) return [];
  return trip.st
    .map(stop => stop?.sid && STOP_INFO?.[stop.sid] ? [STOP_INFO[stop.sid][0], STOP_INFO[stop.sid][1]] : null)
    .filter(Boolean);
}
function sampleStopCoords(stopCoords) {
  if (stopCoords.length <= 4) return stopCoords;
  const mid = Math.floor(stopCoords.length / 2);
  return [stopCoords[0], stopCoords[mid], stopCoords[stopCoords.length - 1]];
}
function getShapeMatchScore(trip, candidatePath) {
  if (!Array.isArray(candidatePath) || candidatePath.length < 2) return Infinity;
  const tripStart = trip.p[0];
  const tripEnd = trip.p[trip.p.length - 1];
  const start = candidatePath[0];
  const end = candidatePath[candidatePath.length - 1];
  let score = haversineM(tripStart, start) + haversineM(tripEnd, end);
  const stopCoords = sampleStopCoords(getTripStopCoords(trip));
  const snapToPath = window.GtfsMathUtils?.snapToPath;
  if (stopCoords.length && typeof snapToPath === 'function') {
    for (const coord of stopCoords) {
      score += snapToPath(coord, candidatePath).distM * 0.75;
    }
  }
  return score;
}
function getRouteShapeSnapData(trip) {
  if (!trip?.s || !Array.isArray(trip.p) || trip.p.length < 2) return null;
  if (Object.prototype.hasOwnProperty.call(trip, '_snapShapeData')) return trip._snapShapeData;
  const key = `${trip.s}|${trip.t || ''}`;
  let candidates = _routeShapeSnapCache.get(key);
  if (!candidates) {
    candidates = SHAPES
      .filter(shape => shape?.s === trip.s && (!trip.t || shape.t === trip.t) && Array.isArray(shape.p) && shape.p.length >= 2)
      .map(shape => shape.p);
    _routeShapeSnapCache.set(key, candidates);
  }
  if (!candidates.length) { trip._snapShapeData = null; return null; }
  let bestPath = null, bestScore = Infinity;
  for (const candidate of candidates) {
    const direct = getShapeMatchScore(trip, candidate);
    if (direct < bestScore) { bestScore = direct; bestPath = candidate; }
    const reversed = [...candidate].reverse();
    const reverse = getShapeMatchScore(trip, reversed);
    if (reverse < bestScore) { bestScore = reverse; bestPath = [...candidate].reverse(); }
  }
  if (!bestPath || bestScore > 9000) { trip._snapShapeData = null; return null; }
  trip._snapShapeData = buildPathDistanceCache(bestPath);
  return trip._snapShapeData;
}
function interpolateOnCachedPath(cache, progress) {
  if (!cache || !Array.isArray(cache.path) || cache.path.length < 2) return null;
  const t = Math.max(0, Math.min(1, progress || 0));
  const target = t * cache.total;
  for (let i = 0; i < cache.cum.length - 1; i++) {
    const fromDist = cache.cum[i], toDist = cache.cum[i + 1];
    if (target <= toDist || i === cache.cum.length - 2) {
      const seg = Math.max(toDist - fromDist, 1e-9);
      const localT = Math.max(0, Math.min(1, (target - fromDist) / seg));
      return [
        cache.path[i][0] + (cache.path[i + 1][0] - cache.path[i][0]) * localT,
        cache.path[i][1] + (cache.path[i + 1][1] - cache.path[i][1]) * localT,
      ];
    }
  }
  return cache.path[cache.path.length - 1];
}
function getPathOrientationAtProgress(cache, progress) {
  if (!cache || !Array.isArray(cache.path) || cache.path.length < 2) return [0, 0, 0];
  const t = Math.max(0, Math.min(1, progress || 0));
  const target = t * cache.total;
  for (let i = 0; i < cache.cum.length - 1; i++) {
    const toDist = cache.cum[i + 1];
    if (target <= toDist || i === cache.cum.length - 2) {
      const from = cache.path[i], to = cache.path[i + 1];
      const dx = to[0] - from[0], dy = to[1] - from[1];
      const angle = Math.atan2(dx, dy) * 180 / Math.PI;
      return [0, 0, -angle];
    }
  }
  return [0, 0, 0];
}
function getVehiclePos(trip, time) {
  const rawPos = window.SimUtils ? window.SimUtils.getVehiclePos(trip, time) : null;
  if (!rawPos) return null;
  const progress = getTripProgressAtTime(trip, time);
  if (progress == null) return rawPos;
  const snapData = getRouteShapeSnapData(trip);
  return interpolateOnCachedPath(snapData, progress) || rawPos;
}
function getVehicleMarkerColor(d) {
  const base = getRouteColorRgb(d.trip.s, d.trip.t, d.trip.c);
  if (!window.RenderUtils) return base;
  const col = window.RenderUtils.getVehicleColorRgb(base, d.trip._delay || 0);
  return [...col, 235];
}
function buildVehicleHeadsLayer(heads) {
  return window.MapManager?.buildVehicleHeadsLayer?.(heads) || null;
}
window.VEHICLE_ICON_CACHE = {};
window.STOP_ICON_CACHE = {};
const VEHICLE_ICON_CACHE = window.VEHICLE_ICON_CACHE;
const STOP_ICON_CACHE = window.STOP_ICON_CACHE;

function buildVehicleIconSvg(type, color) {
  const fill = `rgb(${color[0]},${color[1]},${color[2]})`;
  const commonStart = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">';
  const commonEnd = '</svg>';
  if (type === '4') {
    return `${commonStart}<path d="M10 42h44l-6 10H16z" fill="${fill}"/><path d="M18 24h28l6 18H12z" fill="${fill}" opacity="0.85"/><rect x="24" y="16" width="16" height="8" rx="2" fill="#ffffff"/>${commonEnd}`;
  }
  if (type === '5' || type === '6') {
    return `${commonStart}<rect x="18" y="22" width="28" height="18" rx="5" fill="${fill}"/><rect x="8" y="16" width="48" height="3" rx="2" fill="#ffffff"/><line x1="22" y1="19" x2="22" y2="22" stroke="#ffffff" stroke-width="3"/><line x1="42" y1="19" x2="42" y2="22" stroke="#ffffff" stroke-width="3"/>${commonEnd}`;
  }
  if (type === '0' || type === '1' || type === '2') {
    return `${commonStart}<rect x="14" y="12" width="36" height="34" rx="10" fill="${fill}"/><rect x="20" y="18" width="10" height="8" rx="2" fill="#ffffff"/><rect x="34" y="18" width="10" height="8" rx="2" fill="#ffffff"/><rect x="24" y="30" width="16" height="7" rx="2" fill="#ffffff"/><circle cx="24" cy="50" r="4" fill="${fill}"/><circle cx="40" cy="50" r="4" fill="${fill}"/>${commonEnd}`;
  }
  return `${commonStart}<rect x="10" y="16" width="44" height="24" rx="6" fill="${fill}"/><rect x="16" y="20" width="12" height="8" rx="2" fill="#ffffff"/><rect x="32" y="20" width="12" height="8" rx="2" fill="#ffffff"/><rect x="14" y="30" width="36" height="6" rx="2" fill="#ffffff"/><circle cx="20" cy="44" r="5" fill="${fill}"/><circle cx="44" cy="44" r="5" fill="${fill}"/>${commonEnd}`;
}

// FIX 1: Icon cache dolunca tek yerine 50 eleman siliniyor.
// Önce: delete VEHICLE_ICON_CACHE[firstKey]  → cache hiç küçülmüyor, döngü oluşuyor
// Sonra: .slice(0, 50).forEach(k => delete ...)  → toplu temizlik, cache gerçekten küçülüyor
function getVehicleIconDefinition(type, color) {
  if (!Array.isArray(color) || !color.length) color = [88, 166, 255];
  const key = `${type}-${color.join('-')}`;
  if (!VEHICLE_ICON_CACHE[key]) {
    if (Object.keys(VEHICLE_ICON_CACHE).length > 200) {
      Object.keys(VEHICLE_ICON_CACHE).slice(0, 50).forEach(k => delete VEHICLE_ICON_CACHE[k]);
    }
    const svg = buildVehicleIconSvg(type, color);
    VEHICLE_ICON_CACHE[key] = {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      width: 64,
      height: 64,
      anchorY: 52
    };
  }
  return VEHICLE_ICON_CACHE[key];
}

function buildVehicleIconLayer(heads) {
  return window.MapManager?.buildVehicleIconLayer?.(heads) || null;
}

function buildStopIconSvg(color) {
  const fill = `rgb(${color[0]},${color[1]},${color[2]})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="${fill}" stroke="#f5fbff" stroke-width="6"/><circle cx="32" cy="32" r="6" fill="#f5fbff"/></svg>`;
}

// FIX 1 (devam): Stop icon cache için de aynı toplu silme uygulandı
function getStopIconDefinition(color) {
  const key = color.join('-');
  if (!STOP_ICON_CACHE[key]) {
    if (Object.keys(STOP_ICON_CACHE).length > 200) {
      Object.keys(STOP_ICON_CACHE).slice(0, 50).forEach(k => delete STOP_ICON_CACHE[k]);
    }
    STOP_ICON_CACHE[key] = {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildStopIconSvg(color))}`,
      width: 64,
      height: 64,
      anchorY: 32
    };
  }
  return STOP_ICON_CACHE[key];
}

function repairMojibake(text) {
  return window.RenderUtils ? window.RenderUtils.repairMojibake(text) : String(text ?? '');
}
function displayText(text) {
  return window.RenderUtils ? window.RenderUtils.displayText(text) : repairMojibake(text).trim();
}
function hashString(str) {
  return window.RenderUtils ? window.RenderUtils.hashString(str) : 0;
}
const _routeColorCache = {};
function getRouteColorRgb(routeShort, routeType, fallbackColor) {
  const key = `${routeType || ''}:${routeShort || ''}`;
  if (_routeColorCache[key]) return _routeColorCache[key];
  let result;
  if (window.RenderUtils) {
    result = window.RenderUtils.getRouteColorRgb(routeShort, routeType, fallbackColor);
  } else {
    result = [127, 140, 141];
  }
  _routeColorCache[key] = result;
  return result;
}
function colorToCss(rgb) {
  return window.RenderUtils ? window.RenderUtils.colorToCss(rgb) : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}
function getRouteMeta(routeShort, routeType, fallbackColor, longName = '') {
  return window.RenderUtils
    ? window.RenderUtils.getRouteMeta(routeShort, routeType, fallbackColor, longName, SHAPES, TRIPS)
    : { short: displayText(routeShort || 'Hat'), longName: displayText(longName || ''), type: String(routeType || '3'), color: [127, 140, 141] };
}
function getStopMetaByArray(stop) {
  return window.RenderUtils
    ? window.RenderUtils.getStopMetaByArray(stop, STOP_INFO)
    : { sid: null, name: 'Durak', code: '-', lon: stop?.[0], lat: stop?.[1] };
}
function computeAverageHeadwaySeconds(deps) {
  if (!deps || deps.length === 0) return null;
  const normalizedDeps = deps
    .map(([tripIdx, offset, routeShort]) => [tripIdx, getAbsoluteDepartureSec(TRIPS[tripIdx], offset), routeShort])
    .filter((dep) => Number.isFinite(dep[1]));
  if (!normalizedDeps.length) return null;
  return window.SimUtils
    ? window.SimUtils.computeAverageHeadwaySeconds(normalizedDeps, HEADWAY_CFG)
    : null;
}
function findNearestStopName(pathPoint) {
  return window.UiUtils
    ? window.UiUtils.findNearestStopName(pathPoint, STOP_INFO, haversineM, displayText)
    : '';
}
function refreshLayersNow() {
  if (window.MapManager?.refreshLayersNow) {
    window.MapManager.refreshLayersNow();
    return;
  }
  _lastBuildTime = 0;
  _lastBuiltLayers = [];
  _staticLayerKey = '';
  if (deckgl) deckgl.setProps({ layers: buildLayers() });
}
function getFocusedStopsData() {
  if (!focusedRoute) return null;
  if (_focusedStopIdsCache?.route === focusedRoute) return _focusedStopIdsCache.data;
  const data = [];
  for (const [sid, deps] of Object.entries(STOP_DEPS)) {
    if (deps?.some(dep => {
      const trip = TRIPS[dep[0]];
      return trip?.s === focusedRoute;
    })) {
      const info = STOP_INFO[sid];
      if (info) data.push({ sid, pos: [info[0], info[1]], name: displayText(info[2]), code: displayText(info[3] || sid) });
    }
  }
  _focusedStopIdsCache = { route: focusedRoute, data };
  return data;
}
function getFilteredStopsData() {
  if (focusedRoute) {
    return getFocusedStopsData()?.map((entry) => [entry.pos[0], entry.pos[1], entry.name || entry.sid, entry.sid, entry.name || entry.sid]) || [];
  }
  if (typeFilter === 'all' && activeRoutes.size === 0) return STOPS;
  const activeRoutesKey = activeRoutes.size ? [...activeRoutes].sort().join('|') : '';
  const cacheKey = `${typeFilter}|${activeRoutesKey}|${TRIPS.length}|${Object.keys(STOP_DEPS || {}).length}`;
  if (_filteredStopsCache?.key === cacheKey) return _filteredStopsCache.data;
  const data = [];
  for (const [sid, deps] of Object.entries(STOP_DEPS || {})) {
    const hasVisibleTrip = (deps || []).some((dep) => {
      const trip = TRIPS[dep[0]];
      if (!trip || activeRoutes.has(trip.s)) return false;
      if (typeFilter !== 'all' && String(Number.parseInt(String(trip.t ?? '').trim(), 10)) !== typeFilter) return false;
      return true;
    });
    if (!hasVisibleTrip) continue;
    const info = STOP_INFO[sid];
    if (info) data.push([info[0], info[1], displayText(info[2] || sid), sid, displayText(info[2] || sid)]);
  }
  _filteredStopsCache = { key: cacheKey, data };
  return data;
}
function getFilteredStopIdSet() {
  const stopData = getFilteredStopsData();
  const cacheKey = `${typeFilter}|${focusedRoute || ''}|${activeRoutes.size}|${stopData.length}`;
  if (_filteredStopIdSetCache?.key === cacheKey) return _filteredStopIdSetCache.data;
  const data = new Set(stopData.map((stop) => stop[3]));
  _filteredStopIdSetCache = { key: cacheKey, data };
  return data;
}
function buildStopTooltipHtml(stopMeta) {
  return window.UiUtils ? window.UiUtils.buildStopTooltipHtml(stopMeta) : `<div class="tt-t">${stopMeta.name}</div><div class="tt-s">Kod: ${stopMeta.code}</div>`;
}
function buildRouteTooltipHtml(routeMeta, typeMetaEntry) {
  return window.UiUtils
    ? window.UiUtils.buildRouteTooltipHtml(routeMeta, typeMetaEntry, displayText)
    : `<div class="tt-t">${displayText(typeMetaEntry?.i || '')} ${routeMeta.short}</div><div class="tt-s">${routeMeta.longName || t('routeLongNameMissing', 'Uzun ad yok')}</div><div class="tt-v">${typeMetaEntry?.n || '-'}</div>`;
}
function buildVehiclePanelState(trip, selectedIdx, time) {
  return window.UiUtils
    ? window.UiUtils.buildVehiclePanelState({
      trip,
      selectedTripIdx: selectedIdx,
      simTime: time,
      stopInfo: STOP_INFO,
      typeMeta: TYPE_META,
      followTripIdx,
      getRouteMeta,
      calcSpeed,
      calcHeadway,
      getTripProgressAtTime,
      getNextStop,
      getTripRuntimeOffset,
      getActiveServiceLabel,
      inferTripDirectionLabel,
      secsToHHMM,
      haversineM,
      displayText,
      trips: TRIPS,
      getVehiclePos
    })
    : null;
}
function normalizeTypeMeta() {
  Object.values(TYPE_META).forEach(meta => {
    meta.n = displayText(meta.n || '');
    meta.i = displayText(meta.i || '');
  });
}
normalizeTypeMeta();
function formatHeadwayLabel(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const mins = Math.round(seconds / 60);
  return mins < 1 ? '<1 dk' : `${mins} dk`;
}
function updateActiveBadge(activeCount, visTrips, visShapes) {
  const wrap = document.getElementById('active-badge');
  if (!wrap) return;
  const routeCount = new Set(visShapes.map(s => s.s)).size;
  const tripCount = visTrips.length;
  wrap.innerHTML = `<span id="s-active">${activeCount}</span> aktif araç · ${routeCount} hat · ${tripCount} sefer`;
}
function pushGtfsError(code, message, details = '') {
  const entry = { code, message, details, at: new Date().toISOString() };
  gtfsErrorLog.push(entry);
  lastGtfsLoadError = `${code}: ${message}${details ? ` (${details})` : ''}`;
  return entry;
}
function resetGtfsErrors() {
  gtfsErrorLog = [];
  lastGtfsLoadError = '';
}
function getTripProgressAtTime(trip, time) {
  return window.SimUtils ? window.SimUtils.getTripProgressAtTime(trip, time) : null;
}

// ── SPARKLINE ─────────────────────────────────────────────
function drawSparkline() {
  return window.SimulationEngine?.drawSparkline?.();
}

function drawSliderBands() {
  return window.SimulationEngine?.drawSliderBands?.();
}

function createLegacyBridge(contextFactory, extras = {}) {
  return { ...extras, getContext: contextFactory };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSet(value) {
  return value instanceof Set ? value : new Set(value || []);
}

function resetCalendarCache(value) {
  return value || { rows: [], dateRows: [] };
}

function clearTripLookupCache() {
  _tripLookupCache = null;
}

function clearStopRouteSummariesCache() {
  _stopRouteSummariesCache = new Map();
}

function appendTripLookup(map, key, idx) {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(idx);
  else map.set(key, [idx]);
}

function quantizeCoordPair(point) {
  if (!Array.isArray(point) || point.length < 2) return '';
  return `${Math.round(point[0] * 10000)}:${Math.round(point[1] * 10000)}`;
}

function getTripLookupSignatures(trip, explicitId) {
  if (!trip) return [];
  const route = String(trip.s || '');
  const type = String(trip.t ?? '');
  const head = String(trip.h || '');
  const tripId = explicitId ?? trip.id;
  const start = Number.isFinite(trip.ts?.[0]) ? Math.round(trip.ts[0]) : '';
  const end = Array.isArray(trip.ts) && trip.ts.length ? Math.round(trip.ts[trip.ts.length - 1]) : '';
  const startPoint = quantizeCoordPair(trip.p?.[0]);
  const endPoint = quantizeCoordPair(trip.p?.[trip.p?.length - 1]);
  return [
    tripId != null ? `id:${tripId}` : '',
    route ? `route:${route}` : '',
    route && type ? `routeType:${route}|${type}` : '',
    route && type && head ? `routeTypeHead:${route}|${type}|${head}` : '',
    route && type && start !== '' && end !== '' ? `window:${route}|${type}|${start}|${end}` : '',
    route && type && startPoint && endPoint ? `shape:${route}|${type}|${startPoint}|${endPoint}` : '',
  ].filter(Boolean);
}

function buildTripLookupCache() {
  if (_tripLookupCache) return _tripLookupCache;
  const cache = new Map();
  TRIPS.forEach((trip, idx) => {
    getTripLookupSignatures(trip).forEach((key) => appendTripLookup(cache, key, idx));
  });
  _tripLookupCache = cache;
  return cache;
}

function getManagerMethod(managerName, methodName) {
  return window[managerName]?.[methodName] || null;
}

function callManager(managerName, methodName, args = [], fallbackValue) {
  const method = getManagerMethod(managerName, methodName);
  if (method) return method(...args);
  return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
}

const I18N_MESSAGES = {
  tr: {
    languageLabel: 'Dil',
    landingSubtitle: 'Transit veri analiz ve görselleştirme paneli',
    landingRoutes: 'Toplam Hat',
    landingTrips: 'Bugünkü Seferler',
    landingStops: 'Aktif Duraklar',
    uploadGtfsZip: 'GTFS ZIP Yükle',
    uploadAnother: 'Başka GTFS ZIP Yükle',
    openMap: 'Haritayı Aç',
    loadFromLink: 'Linkten Yükle',
    linkNote: 'Yalnızca HTTPS GTFS ZIP linkleri kabul edilir. Dış bağlantının güvenliği kullanıcı sorumluluğundadır.',
    homeTitle: 'Giriş sayfasına dön',
    loading: 'Yükleniyor...',
    routePanelSummary: 'Operasyon Özeti',
    routePanelServiceCalendar: 'Çalışma Takvimi',
    routePanelTripCount: 'Sefer Sayısı',
    routePanelTripsToday: 'Bugün {count} sefer',
    routePanelServiceHours: 'Çalışma Saatleri',
    routePanelRouteLength: 'Güzergâh Uzunluğu',
    routePanelAverageHeadway: 'Ort. Sefer Sıklığı',
    routePanelDirectionDistribution: 'Yön Dağılımı',
    routePanelNoTripInfo: 'Sefer bilgisi yok',
    stopPanelSimulationTime: 'Simülasyon saati',
    stopPanelHeaderLine: 'Hat',
    stopPanelHeaderDirection: 'Varış Yönü',
    stopPanelHeaderFirstVehicle: 'İlk Araç',
    stopPanelHeaderNextVehicle: 'Sonraki Araç',
    stopPanelNoServiceData: 'Bu durak için sefer verisi yok',
    stopPanelNoServiceFound: 'Bu durağa sefer bulunamadı.',
    stopPanelSummary: '{count} hat - Ortalama headway {headway}',
    stopPanelNoDisplayRoutes: 'Bu durak için gösterilecek hat bulunamadı.',
    stopPanelAverageWait: 'Ort. Bekleme',
    stopPanelWaiting3d: 'Bekleme 3D',
    stopPanelLayerOpen: 'Katman açık',
    stopPanelLayerClosed: 'Katman kapalı',
    stopPanelCode: 'Kod',
    serviceNoCalendarData: 'Çalışma takvimi verisi yok - Tümü',
    serviceNoCalendarShort: 'Takvim verisi yok',
    serviceStatusSummary: '{date} - {active} aktif - {future} planlı - {expired} geçmiş',
    serviceAll: 'Tümü',
    serviceBadgeFuture: 'PLANLI',
    serviceBadgeExpired: 'GEÇMİŞ',
    serviceBadgeActive: 'AKTİF',
    serviceBadgePassive: 'PASİF',
    serviceMore: 'servis',
    warningCriticalErrors: 'Kritik Hatalar',
    warningDataWarnings: 'Veri Uyarıları',
    warningErrorsPresent: 'Bazı veriler eksik veya hatalı görünüyor.',
    warningInconsistencies: 'Veriler yüklendi ancak bazı tutarsızlıklar var.',
    vehicleHeadway: 'Headway',
    vehicleProgress: 'İlerleme',
    vehicleNextStop: 'Sonraki Durak',
    vehicleEta: 'Tahmini Varış',
    vehicleFollow: 'Takip Et',
    vehicleFocusRoute: 'Hattı Odakla',
    followMode: 'Takip Modu',
    followingRoute: 'takip',
    plannerToggle: 'Nasıl Giderim',
    plannerDatasetActive: '{city} · aktif veri seti',
    plannerDatasetDefault: 'Aktif veri seti',
    plannerFromPlaceholder: 'Nereden?',
    plannerToPlaceholder: 'Nereye?',
    plannerBuildRoute: 'Yol Tarifi Oluştur →',
    plannerResultTitle: 'Rota Sonucu',
    plannerIsochronOrigin: '📍 {name}',
    plannerMessageErrorIcon: '⚠',
    plannerMessageInfoIcon: 'ℹ',
    plannerStopValidationTitle: 'Durak doğrulanamadı',
    plannerStopValidationMessage: 'Lütfen aktif şehir verisinden başlangıç ve varış durağını yeniden seçin.',
    plannerNoRouteTitle: 'Rota bulunamadı',
    plannerNoRouteMessage: 'Seçilen duraklar arasında uygun bir toplu taşıma bağlantısı hesaplanamadı.',
    plannerMissingSelectionTitle: 'Durak seçimi eksik',
    plannerMissingSelectionMessage: 'Lütfen aktif şehirden başlangıç ve varış duraklarını seçin.',
    routeWalk: 'Yürü',
    routeBoardLine: '{line} hattına bin',
    routeRideDetail: '{from} durağından bin · {to} durağında in',
    routeWalkDetail: '{from} → {to}',
    routeConnectionCount: '{count} bağlantı',
    routeStopCount: '{count} durak',
    routeTransfer: 'Aktarma',
    routeTransferDetail: '{stop} durağında inip sonraki hatta geç',
    routeSuggestedJourney: 'Önerilen yolculuk',
    routeSummaryDetail: '{legs} etap · {lines} hat',
    routeTotal: 'Toplam: {minutes} dakika',
    plannerHeaderTitle: 'Nasıl Giderim',
    heatmapFollowSimulation: 'Sim ile takip et',
    bunchingAlertsTitle: 'Bunching Uyarıları',
    bunchingThreshold: 'Eşik:',
    worstWaitTitle: 'En Uzun Bekleme',
    worstWaitSubtitle: 'İlk 10 Durak',
    gtfsPreparing: 'Hazırlanıyor...',
    gtfsExpectedFiles: 'Beklenen GTFS Dosyaları',
    gtfsInfoNote: 'Simülasyon Python pipeline ile preprocess gerektirir. Bu araç validasyon + istatistik sağlar.',
    cityLoading: '{city} yükleniyor...',
    cityLoadingGeneric: 'Yükleniyor...',
    warningTitle: 'Veri Uyarıları',
    close: 'Kapat',
    loadingZipOpening: 'ZIP açılıyor...',
    loadingZipOpeningShort: 'ZIP AÇILIYOR',
    loadingFilesReading: 'Dosyalar okunuyor...',
    loadingFileReading: '{file} okunuyor...',
    loadingFilesReadingShort: 'DOSYALAR OKUNUYOR',
    loadingValidation: 'Validasyon yapılıyor...',
    loadingValidationShort: 'VALIDASYON YAPILIYOR',
    loadingDataImporting: 'Veri yükleniyor',
    loadingDataImportingShort: 'VERİ YÜKLENİYOR',
    loadingLinkCheckingShort: 'LİNK DOĞRULANIYOR',
    loadingZipDownloadedShort: 'ZIP İNDİRİLDİ',
    loadingTablesParsingShort: 'TABLOLAR AYRILIYOR',
    loadingTripsPreparingShort: 'SEFERLER HAZIRLANIYOR',
    loadingReadyShort: 'VERİ HAZIR',
    gtfsSourceUnreadable: 'GTFS ZIP kaynağı okunamadı.',
    gtfsJsZipMissing: 'JSZip kütüphanesi yüklenemedi.',
    gtfsZipParseError: 'ZIP parse hatası: {message}',
    gtfsEnterHttpsUrl: 'Önce HTTPS GTFS ZIP linki gir.',
    gtfsOnlyHttpsAllowed: 'Yalnızca HTTPS GTFS ZIP linklerine izin verilir.',
    gtfsElectronOnly: 'Linkten indirme yalnızca Electron sürümünde desteklenir.',
    gtfsUrlDownloadFailed: 'GTFS ZIP linki indirilemedi.',
    gtfsCalendarAutoSelected: 'GTFS takvimi bugüne uygun olarak otomatik seçildi.',
    gtfsLargeDataWarning: '⚠️ Büyük veri: {total} seferden {loaded} tanesi yüklendi',
    gtfsReplacingPrevious: 'Önceki yüklenen veri kaldırıldı. Yeni GTFS etkinleştiriliyor.',
    gtfsImportError: 'GTFS import hatası oluştu',
    gtfsConfirmImport: 'Sisteme Al',
    cancel: 'İptal',
    gtfsReportStatusError: '⚠️ Hatalar Tespit Edildi - Yine de Sisteme Alındı',
    gtfsReportStatusWarn: '⚠️ Uyarılar Var - Sisteme Alındı',
    gtfsReportStatusOk: '✅ Geçerli GTFS - Sisteme Alındı',
    gtfsReportNotice: 'ℹ {errors} hata ve {warnings} uyarı tespit edildi. Simülasyon mevcut verilerle çalışmaya devam ediyor.',
    gtfsReportFooter: '{errors} hata - {warnings} uyarı - {info} bilgi',
    gtfsExportJson: '⬇ JSON Rapor',
    loaderPreparingData: 'Veriler Hazırlanıyor...',
    platformElectron: 'ELECTRON',
    platformWeb: 'WEB TARAYICI',
    routeLongNameMissing: 'Uzun ad yok',
    landingUploadButton: '📂 GTFS ZIP Yükle',
    landingStartButton: '🗺️ Haritayı Aç',
    sidebarLayers: 'KATMANLAR',
    sidebarRoutes: 'HATLAR',
    sidebarStops: 'DURAKLAR',
    sidebarCities: 'ŞEHİR',
    sidebarRouteType: 'HAT TİPİ',
    sidebarMapStyle: 'HARİTA GÖRÜNÜMÜ',
    sidebarServiceCalendar: 'Çalışma Takvimi',
    sidebarRouteSearch: 'Hat ara...',
    sidebarStopSearch: 'Durak ara...',
    togglePaths: 'Güzergâh Hatları',
    toggleDensity: 'Durak Yoğunluğu 3D',
    toggleStops: 'Duraklar',
    toggleStopCoverage: 'Durak 300 m',
    toggleHeadway: 'Headway Çizgileri',
    toggleBunching: 'Bunching Alarmı',
    toggleWaiting: 'Bekleme Süresi 3D',
    toggleHeatmap: 'Yoğunluk Heatmap',
    toggleTrail: 'Araç İzleri (Fade)',
    toggleIsochron: 'İzokron Analiz 🗺️',
    vehicleDetailLongName: 'Hat Uzun Adı',
    vehicleDetailDirection: 'Yön',
    vehicleDetailService: 'Çalışma Takvimi',
    vehicleDetailDeparture: 'Kalkış',
    vehicleDetailArrival: 'Varış',
    vehicleDetailTripsSameDirection: 'Aynı Yönde Sefer',
    vehicleFollowStop: 'Takibi Bırak',
  },
  en: {
    languageLabel: 'Language',
    landingSubtitle: 'Transit data analysis and visualization panel',
    landingRoutes: 'Total Routes',
    landingTrips: "Today's Trips",
    landingStops: 'Active Stops',
    uploadGtfsZip: 'Upload GTFS ZIP',
    uploadAnother: 'Upload Another GTFS ZIP',
    openMap: 'Open Map',
    loadFromLink: 'Load From Link',
    linkNote: 'Only HTTPS GTFS ZIP links are accepted. External link safety is the user responsibility.',
    homeTitle: 'Return to landing page',
    loading: 'Loading...',
    routePanelSummary: 'Operations Summary',
    routePanelServiceCalendar: 'Service Calendar',
    routePanelTripCount: 'Trip Count',
    routePanelTripsToday: '{count} trips today',
    routePanelServiceHours: 'Service Hours',
    routePanelRouteLength: 'Route Length',
    routePanelAverageHeadway: 'Avg Headway',
    routePanelDirectionDistribution: 'Direction Distribution',
    routePanelNoTripInfo: 'No trip information',
    stopPanelSimulationTime: 'Simulation time',
    stopPanelHeaderLine: 'Line',
    stopPanelHeaderDirection: 'Direction',
    stopPanelHeaderFirstVehicle: 'First Vehicle',
    stopPanelHeaderNextVehicle: 'Next Vehicle',
    stopPanelNoServiceData: 'No trip data for this stop',
    stopPanelNoServiceFound: 'No trips found for this stop.',
    stopPanelSummary: '{count} routes - Average headway {headway}',
    stopPanelNoDisplayRoutes: 'No routes available to display for this stop.',
    stopPanelAverageWait: 'Avg Wait',
    stopPanelWaiting3d: 'Waiting 3D',
    stopPanelLayerOpen: 'Layer enabled',
    stopPanelLayerClosed: 'Layer disabled',
    stopPanelCode: 'Code',
    serviceNoCalendarData: 'No service calendar data - All',
    serviceNoCalendarShort: 'No calendar data',
    serviceStatusSummary: '{date} - {active} active - {future} scheduled - {expired} expired',
    serviceAll: 'All',
    serviceBadgeFuture: 'SCHEDULED',
    serviceBadgeExpired: 'EXPIRED',
    serviceBadgeActive: 'ACTIVE',
    serviceBadgePassive: 'PASSIVE',
    serviceMore: 'services',
    warningCriticalErrors: 'Critical Errors',
    warningDataWarnings: 'Data Warnings',
    warningErrorsPresent: 'Some data appears missing or invalid.',
    warningInconsistencies: 'Data loaded, but some inconsistencies remain.',
    vehicleHeadway: 'Headway',
    vehicleProgress: 'Progress',
    vehicleNextStop: 'Next Stop',
    vehicleEta: 'Estimated Arrival',
    vehicleFollow: 'Follow',
    vehicleFocusRoute: 'Focus Route',
    followMode: 'Follow Mode',
    followingRoute: 'follow',
    plannerToggle: 'How Do I Get There',
    plannerDatasetActive: '{city} · active dataset',
    plannerDatasetDefault: 'Active dataset',
    plannerFromPlaceholder: 'From?',
    plannerToPlaceholder: 'To?',
    plannerBuildRoute: 'Build Route →',
    plannerResultTitle: 'Route Result',
    plannerIsochronOrigin: '📍 {name}',
    plannerMessageErrorIcon: '⚠',
    plannerMessageInfoIcon: 'ℹ',
    plannerStopValidationTitle: 'Stop could not be validated',
    plannerStopValidationMessage: 'Please reselect the origin and destination stops from the active city data.',
    plannerNoRouteTitle: 'Route not found',
    plannerNoRouteMessage: 'No suitable public transit connection could be calculated between the selected stops.',
    plannerMissingSelectionTitle: 'Stop selection missing',
    plannerMissingSelectionMessage: 'Please select origin and destination stops from the active city.',
    routeWalk: 'Walk',
    routeBoardLine: 'Board line {line}',
    routeRideDetail: 'Board at {from} · Get off at {to}',
    routeWalkDetail: '{from} → {to}',
    routeConnectionCount: '{count} connections',
    routeStopCount: '{count} stops',
    routeTransfer: 'Transfer',
    routeTransferDetail: 'Get off at {stop} and transfer to the next line',
    routeSuggestedJourney: 'Suggested journey',
    routeSummaryDetail: '{legs} legs · {lines} lines',
    routeTotal: 'Total: {minutes} minutes',
    plannerHeaderTitle: 'How Do I Get There',
    heatmapFollowSimulation: 'Follow sim',
    bunchingAlertsTitle: 'Bunching Alerts',
    bunchingThreshold: 'Threshold:',
    worstWaitTitle: 'Longest Wait',
    worstWaitSubtitle: 'Top 10 Stops',
    gtfsPreparing: 'Preparing...',
    gtfsExpectedFiles: 'Expected GTFS Files',
    gtfsInfoNote: 'Simulation requires Python pipeline preprocessing. This tool provides validation and statistics.',
    cityLoading: 'Loading {city}...',
    cityLoadingGeneric: 'Loading...',
    warningTitle: 'Data Warnings',
    close: 'Close',
    loadingZipOpening: 'Opening ZIP...',
    loadingZipOpeningShort: 'OPENING ZIP',
    loadingFilesReading: 'Reading files...',
    loadingFileReading: 'Reading {file}...',
    loadingFilesReadingShort: 'READING FILES',
    loadingValidation: 'Running validation...',
    loadingValidationShort: 'RUNNING VALIDATION',
    loadingDataImporting: 'Importing data',
    loadingDataImportingShort: 'IMPORTING DATA',
    loadingLinkCheckingShort: 'CHECKING LINK',
    loadingZipDownloadedShort: 'ZIP DOWNLOADED',
    loadingTablesParsingShort: 'PARSING TABLES',
    loadingTripsPreparingShort: 'PREPARING TRIPS',
    loadingReadyShort: 'DATA READY',
    gtfsSourceUnreadable: 'GTFS ZIP source could not be read.',
    gtfsJsZipMissing: 'JSZip library could not be loaded.',
    gtfsZipParseError: 'ZIP parse error: {message}',
    gtfsEnterHttpsUrl: 'Enter an HTTPS GTFS ZIP link first.',
    gtfsOnlyHttpsAllowed: 'Only HTTPS GTFS ZIP links are allowed.',
    gtfsElectronOnly: 'Downloading from link is supported only in the Electron build.',
    gtfsUrlDownloadFailed: 'GTFS ZIP link could not be downloaded.',
    gtfsCalendarAutoSelected: 'GTFS calendar was automatically selected for today.',
    gtfsLargeDataWarning: '⚠️ Large dataset: {loaded} of {total} trips were loaded',
    gtfsReplacingPrevious: 'Previous data was removed. Activating new GTFS.',
    gtfsImportError: 'A GTFS import error occurred',
    gtfsConfirmImport: 'Import to System',
    cancel: 'Cancel',
    gtfsReportStatusError: '⚠️ Errors Detected - Imported Anyway',
    gtfsReportStatusWarn: '⚠️ Warnings Present - Imported',
    gtfsReportStatusOk: '✅ Valid GTFS - Imported',
    gtfsReportNotice: 'ℹ {errors} errors and {warnings} warnings were detected. Simulation continues with the available data.',
    gtfsReportFooter: '{errors} errors - {warnings} warnings - {info} info',
    gtfsExportJson: '⬇ JSON Report',
    loaderPreparingData: 'Preparing Data...',
    platformElectron: 'ELECTRON',
    platformWeb: 'WEB BROWSER',
    routeLongNameMissing: 'No long name',
    landingUploadButton: '📂 Upload GTFS ZIP',
    landingStartButton: '🗺️ Open Map',
    sidebarLayers: 'LAYERS',
    sidebarRoutes: 'ROUTES',
    sidebarStops: 'STOPS',
    sidebarCities: 'CITY',
    sidebarRouteType: 'ROUTE TYPE',
    sidebarMapStyle: 'MAP STYLE',
    sidebarServiceCalendar: 'Service Calendar',
    sidebarRouteSearch: 'Search route...',
    sidebarStopSearch: 'Search stop...',
    togglePaths: 'Route Lines',
    toggleDensity: 'Stop Density 3D',
    toggleStops: 'Stops',
    toggleStopCoverage: 'Stop 300 m',
    toggleHeadway: 'Headway Lines',
    toggleBunching: 'Bunching Alerts',
    toggleWaiting: 'Waiting Time 3D',
    toggleHeatmap: 'Density Heatmap',
    toggleTrail: 'Vehicle Trails (Fade)',
    toggleIsochron: 'Isochrone Analysis 🗺️',
    vehicleDetailLongName: 'Route Long Name',
    vehicleDetailDirection: 'Direction',
    vehicleDetailService: 'Service Calendar',
    vehicleDetailDeparture: 'Departure',
    vehicleDetailArrival: 'Arrival',
    vehicleDetailTripsSameDirection: 'Trips Same Direction',
    vehicleFollowStop: 'Stop Following',
  },
};

let currentLanguage = (() => {
  try {
    const saved = localStorage.getItem('gtfs-city-language');
    return saved === 'en' ? 'en' : 'tr';
  } catch (_) {
    return 'tr';
  }
})();

function t(key, fallback = '') {
  return I18N_MESSAGES[currentLanguage]?.[key] || I18N_MESSAGES.tr?.[key] || fallback || key;
}

function ensureLanguageSwitcher() {
  if (document.getElementById('language-switcher')) return;
  const wrap = document.createElement('div');
  wrap.id = 'language-switcher';
  wrap.innerHTML = `
    <label id="language-switcher-label" for="language-select">${t('languageLabel', 'Language')}</label>
    <select id="language-select" aria-label="Language">
      <option value="tr">Turkce</option>
      <option value="en">English</option>
    </select>
  `;
  document.body.appendChild(wrap);
  const select = document.getElementById('language-select');
  if (select) {
    select.value = currentLanguage;
    select.addEventListener('change', (event) => setLanguage(event.target.value));
  }
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  ensureLanguageSwitcher();
  const label = document.getElementById('language-switcher-label');
  const select = document.getElementById('language-select');
  if (label) label.textContent = t('languageLabel', 'Language');
  if (select) select.value = currentLanguage;
  const subtitle = document.querySelector('.lp-subtitle');
  if (subtitle) subtitle.textContent = t('landingSubtitle');
  const labels = document.querySelectorAll('.lp-card-lbl');
  if (labels[0]) labels[0].textContent = t('landingRoutes');
  if (labels[1]) labels[1].textContent = t('landingTrips');
  if (labels[2]) labels[2].textContent = t('landingStops');
  const uploadLink = document.getElementById('lp-btn-url');
  if (uploadLink) uploadLink.textContent = t('loadFromLink');
  const uploadBtn = document.getElementById('lp-btn-upload');
  if (uploadBtn && !uploadBtn.classList.contains('is-loading')) uploadBtn.textContent = t('landingUploadButton');
  const startBtn = document.getElementById('lp-btn-start');
  if (startBtn) startBtn.textContent = t('landingStartButton');
  const linkNote = document.getElementById('lp-link-note');
  if (linkNote) linkNote.textContent = t('linkNote');
  const homeBtn = document.getElementById('home-toggle-btn');
  if (homeBtn) homeBtn.title = t('homeTitle');
  const vehicleLabels = document.querySelectorAll('.vp-l');
  if (vehicleLabels[1]) vehicleLabels[1].textContent = t('vehicleHeadway');
  if (vehicleLabels[2]) vehicleLabels[2].textContent = t('vehicleProgress');
  const vehicleNextLabels = document.querySelectorAll('.vp-next-lbl');
  if (vehicleNextLabels[0]) vehicleNextLabels[0].textContent = t('vehicleNextStop');
  if (vehicleNextLabels[1]) vehicleNextLabels[1].textContent = `⏱ ${t('vehicleEta')}`;
  const followBtn = document.getElementById('vp-follow-btn');
  if (followBtn) followBtn.textContent = `📍 ${t('vehicleFollow')}`;
  const routeBtn = document.getElementById('vp-route-btn');
  if (routeBtn) routeBtn.textContent = `🗺 ${t('vehicleFocusRoute')}`;
  const followLabel = document.getElementById('follow-label');
  if (followLabel && followTripIdx === null) followLabel.textContent = `📍 ${t('followMode')}`;
  const plannerToggle = document.getElementById('route-planner-toggle');
  if (plannerToggle) {
    plannerToggle.title = t('plannerToggle');
    plannerToggle.textContent = `🧭 ${t('plannerToggle')}`;
  }
  const fromInput = document.getElementById('stop-from');
  if (fromInput) fromInput.placeholder = t('plannerFromPlaceholder');
  const toInput = document.getElementById('stop-to');
  if (toInput) toInput.placeholder = t('plannerToPlaceholder');
  const routeBuildBtn = document.getElementById('btn-route');
  if (routeBuildBtn) routeBuildBtn.textContent = t('plannerBuildRoute');
  const resultTitle = document.querySelector('#route-result-header > span');
  if (resultTitle) resultTitle.textContent = t('plannerResultTitle');
  const plannerHeaderTitle = document.querySelector('#route-planner-header > div > span');
  if (plannerHeaderTitle) plannerHeaderTitle.textContent = `🧭 ${t('plannerHeaderTitle')}`;
  const heatmapFollow = document.querySelector('label[for="heatmap-follow-sim"], #heatmap-ctrl .small-check');
  const heatmapCheckbox = document.getElementById('heatmap-follow-sim');
  if (heatmapFollow && heatmapCheckbox) heatmapFollow.lastChild.textContent = ` ${t('heatmapFollowSimulation')}`;
  const bunchingTitle = document.querySelector('#bunching-header > span');
  if (bunchingTitle) bunchingTitle.textContent = `⚠️ ${t('bunchingAlertsTitle')}`;
  const thresholdLabel = document.querySelector('#threshold-row > span');
  if (thresholdLabel) thresholdLabel.textContent = t('bunchingThreshold');
  const worstHeader = document.querySelector('#worst-header > span');
  if (worstHeader) worstHeader.textContent = `⏱ ${t('worstWaitTitle')}`;
  const worstSub = document.querySelector('#worst-header .worst-sub');
  if (worstSub) worstSub.textContent = t('worstWaitSubtitle');
  const gtfsProgressMsg = document.getElementById('gtfs-progress-msg');
  if (gtfsProgressMsg && !gtfsProgressMsg.dataset.dynamic) gtfsProgressMsg.textContent = t('gtfsPreparing');
  const gtfsInfoTitle = document.querySelector('.gtfs-info-title');
  if (gtfsInfoTitle) gtfsInfoTitle.textContent = t('gtfsExpectedFiles');
  const gtfsNote = document.querySelector('.gtfs-note');
  if (gtfsNote) gtfsNote.textContent = t('gtfsInfoNote');
  const cityLoadingName = document.getElementById('city-loading-name');
  if (cityLoadingName && !cityLoadingName.dataset.city) cityLoadingName.textContent = t('cityLoadingGeneric');
  const warningTitle = document.querySelector('.gwd-title');
  if (warningTitle) warningTitle.textContent = t('warningTitle');
  const warningClose = document.getElementById('gwd-close');
  if (warningClose) warningClose.title = t('close');
  const loaderText = document.querySelector('.loader-text');
  if (loaderText) loaderText.textContent = t('loaderPreparingData');
  const sidebarLabels = document.querySelectorAll('#section-layers .section-label, #section-routes .section-label, #section-stops-list .section-label, #section-cities .section-label');
  if (sidebarLabels[0]) sidebarLabels[0].textContent = t('sidebarLayers');
  if (sidebarLabels[1]) sidebarLabels[1].textContent = t('sidebarRoutes');
  if (sidebarLabels[2]) sidebarLabels[2].textContent = t('sidebarStops');
  if (sidebarLabels[3]) sidebarLabels[3].textContent = t('sidebarCities');
  const routeTypeLabel = document.querySelector('#type-btns')?.previousElementSibling;
  if (routeTypeLabel) routeTypeLabel.textContent = t('sidebarRouteType');
  const mapStyleLabel = document.querySelector('#map-style-btns')?.previousElementSibling;
  if (mapStyleLabel) mapStyleLabel.textContent = t('sidebarMapStyle');
  const serviceLabel = document.querySelector('.service-selector-label');
  if (serviceLabel) serviceLabel.textContent = t('sidebarServiceCalendar');
  const routeSearch = document.getElementById('route-filter-inp');
  if (routeSearch) routeSearch.placeholder = t('sidebarRouteSearch');
  const stopSearch = document.getElementById('stop-list-filter');
  if (stopSearch) stopSearch.placeholder = t('sidebarStopSearch');
  const toggles = document.querySelectorAll('#section-layers .tog-row');
  if (toggles[1]) toggles[1].lastChild.textContent = t('togglePaths');
  if (toggles[2]) toggles[2].lastChild.textContent = t('toggleDensity');
  if (toggles[3]) toggles[3].lastChild.textContent = t('toggleStops');
  if (toggles[4]) toggles[4].lastChild.textContent = t('toggleStopCoverage');
  if (toggles[5]) toggles[5].lastChild.textContent = t('toggleHeatmap');
  if (toggles[6]) toggles[6].lastChild.textContent = t('toggleTrail');
  if (toggles[7]) toggles[7].lastChild.textContent = t('toggleHeadway');
  if (toggles[8]) toggles[8].lastChild.textContent = t('toggleBunching');
  if (toggles[9]) toggles[9].lastChild.textContent = t('toggleWaiting');
  if (toggles[10]) toggles[10].lastChild.textContent = t('toggleIsochron');
}

function setLanguage(lang) {
  currentLanguage = lang === 'en' ? 'en' : 'tr';
  try {
    localStorage.setItem('gtfs-city-language', currentLanguage);
  } catch (_) {}
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent('app-language-change', { detail: { language: currentLanguage } }));
  updateLandingPageReports();
}

window.I18n = {
  getLanguage: () => currentLanguage,
  setLanguage,
  t,
};

ensureLanguageSwitcher();
applyStaticTranslations();

if ('serviceWorker' in navigator && window.PLATFORM === 'web') {
  navigator.serviceWorker.register('./sw.js').catch(() => { });
}

const DEPLOY = {
  base: './',
  tilesStyle: PHASE_CFG,
};

// ── MAPLIBRE ──────────────────────────────────────────────
const mapgl = new maplibregl.Map({
  container: 'map', style: PHASE_CFG.night.style,
  center: activeCity?.center || [-0.5792, 44.8378], zoom: activeCity?.zoom || 11.6, pitch: activeCity?.pitch || 52, bearing: activeCity?.bearing || -10,
  antialias: true, attributionControl: false
});
mapgl.addControl(new maplibregl.NavigationControl(), 'bottom-right');
mapgl.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
mapgl.on('load', () => {
  startDeck();
  if (window.SimulationEngine?.start) window.SimulationEngine.start();
  else requestAnimationFrame(animate);
  mapgl.on('click', e => {
    if (showIsochron) { triggerIsochron(e.lngLat.lng, e.lngLat.lat); }
  });
});

// ── DECK.GL ───────────────────────────────────────────────
let deckgl;

window.LegacyMapBridge = createLegacyBridge(() => ({
  TRIPS,
  SHAPES,
  STOPS,
  STOP_INFO,
  AppState,
  QUALITY,
  TYPE_META,
  simTime,
  typeFilter,
  activeRoutes,
  focusedRoute,
  showPaths,
  showStops,
  showStopCoverage,
  showDensity,
  showHeatmap,
  heatmapHour,
  heatmapFollowSim,
  routeHighlightPath,
  showAnim,
  showTrail,
  show3D,
  followTripIdx,
  showHeadway,
  showBunching,
  showWaiting,
  showIsochron,
  isochronData: _isochronData,
  isochronOriginSid: _isochronOriginSid,
  stopAvgHeadways: _stopAvgHeadways,
  getVehiclePos,
  getVehicleMarkerColor,
  getVehicleIconDefinition,
  getStopIconDefinition,
  getRouteColorRgb,
  getRouteMeta,
  getFocusedStopsData,
  getFilteredStopsData,
  getFilteredStopIdSet,
  getModelNotice,
  getModelPath,
  getModelOrientation,
  getModelScale,
  updateActiveBadge,
  calcHeadwayPairs,
  detectBunching,
  updateBunchingPanel,
  waitingColor,
  haversineM,
  setLodBadge,
}), {
  getMapgl: () => mapgl,
  getDeckgl: () => deckgl,
  getLastFollowPos: () => window._lastFollowPos,
  setLastFollowPos: (pos) => { window._lastFollowPos = pos; },
});

window.LegacyUIBridge = createLegacyBridge(() => ({
    TRIPS,
    SHAPES,
    STOPS,
    STOP_INFO,
    STOP_DEPS,
    TYPE_META,
    AppState,
    simTime,
    focusedRoute,
    selectedTripIdx,
    selectedEntity,
    showIsochron,
    showWaiting,
    followTripIdx,
    isCinematic,
    cinematicIdx,
    cinematicTimer,
    waitingComputedForSec: _waitingComputedForSec,
    stopAvgHeadways: _stopAvgHeadways,
    activeRoutes,
    stopNames,
    mapgl,
    getCinematicWaypoints,
    HEADWAY_CFG,
    WAITING_CFG,
    activeServiceOptions,
    activeServiceId,
    getDeckCanvas: () => deckgl?.getCanvas?.(),
    getStopMetaByArray,
    buildStopTooltipHtml,
    getRouteMeta,
    buildRouteTooltipHtml,
    getFilteredStopsData,
    getFilteredStopIdSet,
    displayText,
    buildRoutePanelStats,
    getActiveServiceLabel,
    currentLanguage,
    t,
    formatHeadwayLabel,
    colorToCss,
    computeAverageHeadwaySeconds,
    getStopRouteSummaries,
    findTripIdx,
    setSelectedEntity,
    pauseSimulationForSelection,
    releaseSelectionPause,
    buildVehiclePanelState,
    refreshLayersNow,
    secsToHHMM,
    setActiveStopData: (stop) => { _activeStopData = stop; },
    setSelectedTripIdx: (idx) => { selectedTripIdx = idx; },
    setFocusedRoute: (value) => { focusedRoute = value; },
    setFocusedStopIdsCache: (value) => { _focusedStopIdsCache = value; },
    setRouteHighlightPath: (value) => { routeHighlightPath = value; },
    invalidateMapCaches: () => { _cachedVisTrips = null; _cachedVisShapes = null; _filteredStopsCache = null; _filteredStopIdSetCache = null; },
    getVehiclePos,
    haversineM,
    setFollowTripIdx: (idx) => { followTripIdx = idx; },
    getModelOrientation,
    updateLandingPageReports,
    triggerIsochron,
    setCinematic: (value) => { isCinematic = value; },
    setCinematicIdx: (value) => { cinematicIdx = value; },
    setCinematicTimer: (value) => { cinematicTimer = value; },
    getWorstStops: () => _worstStops,
    setWorstStops: (value) => { _worstStops = value; },
  }));

window.LegacyPlannerBridge = createLegacyBridge(() => ({
    ADJ,
    STOP_INFO,
    displayText,
    getActiveCity: () => activeCity,
    refreshLayersNow,
    setIsochronData: (value) => { _isochronData = value; },
    setIsochronOriginSid: (value) => { _isochronOriginSid = value; },
    clearStaticLayerKey: () => { _staticLayerKey = ''; },
    setRouteHighlightPath: (value) => { routeHighlightPath = value; },
  }));

window.LegacyServiceBridge = createLegacyBridge(() => ({
    activeServiceOptions,
    activeServiceId,
    activeServiceIds,
    calendarCache: _calendarCache,
    displayText,
    currentLanguage,
    t,
    showToast,
    getBuiltinGtfsPayload,
    loadGtfsIntoSim,
    getActiveCity: () => activeCity,
    getUploadedCityPayload: (cityId) => uploadedGtfsCities.get(cityId),
    getCalendarCache: () => _calendarCache,
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    getActiveServiceOptions: () => activeServiceOptions,
    getActiveServiceId: () => activeServiceId,
    setActiveServiceOptions: (value) => { activeServiceOptions = normalizeArray(value); },
    setActiveServiceId: (value) => { activeServiceId = value || 'all'; },
    setActiveServiceIds: (value) => { activeServiceIds = normalizeSet(value); },
  }));

window.LegacyCityBridge = createLegacyBridge(() => ({
    CITIES,
    AppState,
    mapgl,
    hiddenCities,
    uploadedGtfsCities,
    displayText,
    getBuiltinGtfsPayload,
    loadGtfsIntoSim,
    applyGtfsRuntimeData,
    captureRuntimeDataSnapshot,
    buildServiceOptions,
    autoSelectAndAdaptService,
    renderServiceDatePicker,
    toggleUI,
    showToast,
    getActiveCity: () => activeCity,
    getActiveServiceId: () => activeServiceId,
    getActiveServiceIds: () => activeServiceIds,
    setActiveCity: (value) => { activeCity = value; },
    setActiveServiceId: (value) => { activeServiceId = value || 'all'; },
    setActiveServiceIds: (value) => { activeServiceIds = normalizeSet(value); },
    setActiveServiceOptions: (value) => { activeServiceOptions = normalizeArray(value); },
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    clearRuntimeData: () => {
      AppState.trips = [];
      AppState.shapes = [];
      AppState.stops = [];
      AppState.stopInfo = {};
      AppState.stopDeps = {};
      TRIPS = [];
      SHAPES = [];
      STOPS = [];
      STOP_INFO = {};
      STOP_DEPS = {};
      _cachedVisTrips = null;
      _cachedVisShapes = null;
      clearTripLookupCache();
      clearStopRouteSummariesCache();
      if (deckgl) deckgl.setProps({ layers: buildLayers() });
      buildRouteList();
      buildStopList();
    },
  }));

window.LegacyDataBridge = createLegacyBridge(() => ({
    AppState,
    deckgl,
    mapgl,
    gtfsErrorLog,
    parseCsvRows,
    parseGtfsTables,
    buildRouteMap,
    buildShapePoints,
    buildStopsMap,
    buildTripMetaMap,
    buildTripStopsMap,
    buildServiceOptions,
    autoSelectAndAdaptService,
    renderServiceDatePicker,
    showToast,
    displayText,
    buildAdjacencyList,
    buildRouteList,
    buildStopList,
    drawSparkline,
    drawSliderBands,
    refreshLayersNow,
    buildLayers,
    captureRuntimeDataSnapshot,
    updateDensityGrid,
    updateWarningDashboard,
    updateLandingPageReports,
    buildCityList,
    toggleUI,
    pushGtfsError,
    resetGtfsErrors,
    uploadedGtfsCities,
    hiddenCities,
    CITIES,
    getActiveCity: () => activeCity,
    getActiveServiceIds: () => activeServiceIds,
    getLastGtfsLoadError: () => lastGtfsLoadError,
    getLastGtfsFiles: () => window._lastGtfsFiles,
    getLastGtfsFileName: () => window._lastGtfsFileName,
    setActiveServiceId: (value) => { activeServiceId = value || 'all'; },
    setActiveServiceIds: (value) => { activeServiceIds = normalizeSet(value); },
    setActiveServiceOptions: (value) => { activeServiceOptions = normalizeArray(value); },
    setActiveCity: (value) => { activeCity = value; },
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    setLastGtfsFiles: (value) => { window._lastGtfsFiles = value; },
    setLastGtfsFileName: (value) => { window._lastGtfsFileName = value; },
    setGtfsReport: (value) => { _gtfsReport = value; AppState.gtfsValidationReport = value; },
    setStaticLayerKey: (value) => { _staticLayerKey = value || ''; },
    clearIconCaches: () => {
      Object.keys(VEHICLE_ICON_CACHE).forEach((key) => delete VEHICLE_ICON_CACHE[key]);
      Object.keys(STOP_ICON_CACHE).forEach((key) => delete STOP_ICON_CACHE[key]);
    },
    syncRuntimeAliases: () => {
      TRIPS = AppState.trips;
      SHAPES = AppState.shapes;
      STOPS = AppState.stops;
      STOP_INFO = AppState.stopInfo;
      STOP_DEPS = AppState.stopDeps;
      HOURLY_COUNTS = AppState.hourlyCounts;
      HOURLY_HEAT = AppState.hourlyHeat;
      ADJ = AppState.adj;
    },
    getTrips: () => TRIPS,
    getStopDeps: () => STOP_DEPS,
    setStopNames: (value) => { stopNames = value; },
    resetRuntimeCaches: () => {
      _cachedVisTrips = null;
      _cachedVisShapes = null;
      _stopAvgHeadways = null;
      _worstStops = null;
      _focusedStopIdsCache = null;
      _filteredStopsCache = null;
      _filteredStopIdSetCache = null;
      _waitingTimeBucket = null;
      _waitingComputedForSec = null;
      _routeShapeSnapCache = new Map();
      clearTripLookupCache();
      clearStopRouteSummariesCache();
      selectedTripIdx = null;
      followTripIdx = null;
      focusedRoute = null;
      activeRoutes.clear();
      selectedEntity = null;
      panelPauseOwner = null;
      _lastBuildTime = 0;
      _lastBuiltLayers = [];
      _staticLayerKey = '';
      typeFilter = 'all';
    },
    resetViewToggles: () => {
      showAnim = true;
      showStops = false;
      showStopCoverage = false;
      showDensity = false;
      showWaiting = false;
      showPaths = true;
      const toggles = {
        'tog-stops': false,
        'tog-stop-coverage': false,
        'tog-anim': true,
        'tog-paths': true,
        'tog-density': false,
      };
      Object.entries(toggles).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.checked = value;
      });
    },
  }));

window.LegacyAppBridge = createLegacyBridge(() => ({
    AppState,
    openGTFSModal,
    refreshLayersNow,
    updateDayNight,
    getTrips: () => TRIPS,
    getStops: () => STOPS,
    setShowTrail: (value) => { showTrail = value; },
    setCurrentMapStyle: (value) => { currentMapStyle = value || 'auto'; },
  }));

const legacySimulationContext = {
  AppState,
  PHASE_CFG,
  QUALITY,
  HEADWAY_CFG,
  WAITING_CFG,
  SPEEDS,
  activeRoutes,
  getPhase,
  secsToHHMM,
  getVehiclePos,
  getTripProgressAtTime,
  getTripRuntimeOffset,
  inferTripDirectionLabel,
  haversineM,
  computeAverageHeadwaySeconds,
  buildWorstStops,
  updateWorstStopsPanel,
  refreshLayersNow,
  updateVehiclePanel,
  renderStopPanel: _renderStopPanel,
  buildLayers,
  getStopAvgHeadways: () => _stopAvgHeadways,
  setSimTime: (value) => { simTime = value; },
  setSimPaused: (value) => { simPaused = !!value; },
  setLastTs: (value) => { lastTs = value; },
  setSpeedIdx: (value) => { speedIdx = value; },
  setSimSpeed: (value) => { simSpeed = value; },
  setIsReplay: (value) => { isReplay = !!value; },
  setReplayLoop: (value) => { replayLoop = !!value; },
  setBunchingEvents: (value) => { bunchingEvents = value; },
  setStopAvgHeadways: (value) => { _stopAvgHeadways = value; },
  setWaitingTimeBucket: (value) => { _waitingTimeBucket = value; },
  setWaitingComputedForSec: (value) => { _waitingComputedForSec = value; },
  syncPlayButton,
  setSimulationPaused,
  isContextReady: () => !!mapgl,
};
window.LegacySimulationBridge = {
  getContext() {
    legacySimulationContext.TRIPS = TRIPS;
    legacySimulationContext.simTime = simTime;
    legacySimulationContext.simPaused = simPaused;
    legacySimulationContext.lastTs = lastTs;
    legacySimulationContext.speedIdx = speedIdx;
    legacySimulationContext.simSpeed = simSpeed;
    legacySimulationContext.currentMapStyle = currentMapStyle;
    legacySimulationContext.isReplay = isReplay;
    legacySimulationContext.replayLoop = replayLoop;
    legacySimulationContext.showWaiting = showWaiting;
    legacySimulationContext.showHeadway = showHeadway;
    legacySimulationContext.typeFilter = typeFilter;
    legacySimulationContext.focusedRoute = focusedRoute;
    legacySimulationContext.bunchingThreshold = bunchingThreshold;
    legacySimulationContext.bunchingEvents = bunchingEvents;
    legacySimulationContext.waitingTimeBucket = _waitingTimeBucket;
    legacySimulationContext.waitingComputedForSec = _waitingComputedForSec;
    legacySimulationContext.selectedTripIdx = selectedTripIdx;
    legacySimulationContext.activeStopData = _activeStopData;
    legacySimulationContext.hourlyCounts = HOURLY_COUNTS;
    legacySimulationContext.mapgl = mapgl;
    legacySimulationContext.deckgl = deckgl;
    legacySimulationContext.updateVehiclePanel = updateVehiclePanel || (() => {});
    legacySimulationContext.renderStopPanel = _renderStopPanel || (() => {});
    return legacySimulationContext;
  },
};

function startDeck() {
  const canvas = document.getElementById('deck-canvas');
  if (canvas) canvas.style.display = 'none';

  deckgl = new MapboxOverlay({
    getCursor: ({ isHovering }) => isHovering ? 'pointer' : 'default',
    interleaved: true,
    onHover: handleHover,
    onClick: handleClick,
    layers: []
  });

  mapgl.addControl(deckgl);
}

// ── TOOLTIP ───────────────────────────────────────────────
function showTooltipAt(x, y, html, pinned = false) {
  return callManager('UIManager', 'showTooltipAt', [x, y, html, pinned]);
}

function hideTooltip(force = false) {
  return callManager('UIManager', 'hideTooltip', [force]);
}

function getActiveServiceLabel() {
  return callManager('ServiceManager', 'getActiveServiceLabel', [], 'Tümü');
}

function parseGtfsDateToIso(value) {
  return callManager('ServiceManager', 'parseGtfsDateToIso', [value], '');
}

function summarizeServiceStatuses(calendarRows, selectedDate, currentIds) {
  return callManager('ServiceManager', 'summarizeServiceStatuses', [calendarRows, selectedDate, currentIds], { entries: [], counts: { active: 0, future: 0, expired: 0 } });
}

function inferTripDirectionLabel(trip) {
  if (trip?.dir === 0) return 'Gidiş';
  if (trip?.dir === 1) return 'Dönüş';
  const head = displayText(trip?.h || '');
  if (head) return head;
  const firstPoint = trip?.p?.[0];
  const lastPoint = trip?.p?.[trip?.p?.length - 1];
  const from = findNearestStopName(firstPoint) || 'Başlangıç';
  const to = findNearestStopName(lastPoint) || 'Varış';
  return `${from} → ${to}`;
}

function buildRoutePanelStats(routeShort) {
  const routeTrips = TRIPS.filter(trip => trip.s === routeShort);
  const departures = routeTrips
    .map((trip, idx) => [trip._idx ?? idx, trip.ts?.[0] ?? null, routeShort, trip])
    .filter(([, offset]) => Number.isFinite(offset));

  let firstSec = Infinity, lastSec = -Infinity;
  routeTrips.forEach(t => {
    if (t.ts && t.ts.length > 0) {
      if (t.ts[0] < firstSec) firstSec = t.ts[0];
      if (t.ts[t.ts.length - 1] > lastSec) lastSec = t.ts[t.ts.length - 1];
    }
  });

  const directionMap = new Map();
  routeTrips.forEach(trip => {
    const label = inferTripDirectionLabel(trip);
    directionMap.set(label, (directionMap.get(label) || 0) + 1);
  });
  const directionEntries = [...directionMap.entries()].sort((a, b) => b[1] - a[1]);

  // Hat uzunluğu hesaplama: en uzun güzergahı (shape) bul
  let maxM = 0;
  const routeShapes = SHAPES.filter(s => s.s === routeShort);
  routeShapes.forEach(rs => {
    if (rs.p && rs.p.length >= 2) {
      const len = window.GtfsMathUtils ? window.GtfsMathUtils.pathLengthM(rs.p) : 0;
      if (len > maxM) maxM = len;
    }
  });

  return {
    directionLabel: directionEntries.map(([label]) => label).slice(0, 2).join(' / ') || 'Yön bilgisi yok',
    directionEntries,
    tripCountByDirection: directionEntries.length
      ? directionEntries.map(([label, count]) => `${label}: ${count}`).join(' · ')
      : 'Sefer bilgisi yok',
    totalTrips: routeTrips.length,
    firstTime: firstSec !== Infinity ? secsToHHMM(firstSec % 86400) : '—',
    lastTime: lastSec !== -Infinity ? secsToHHMM(lastSec % 86400) : '—',
    routeLengthKm: maxM > 0 ? (maxM / 1000).toFixed(2) : '—',
    averageHeadway: computeAverageHeadwaySeconds(departures),
  };
}

function openRoutePanel(routeMeta, typeMetaEntry) {
  return callManager('UIManager', 'openRoutePanel', [routeMeta, typeMetaEntry]);
}

function closeRoutePanel() {
  return callManager('UIManager', 'closeRoutePanel');
}
function clearFocusedRouteSelection(refresh = false) {
  return callManager('UIManager', 'clearFocusedRouteSelection', [refresh]);
}

function handleHover(info) {
  return callManager('UIManager', 'handleHover', [info]);
}

function handleClick(info) {
  return callManager('UIManager', 'handleClick', [info]);
}

function findTripIdx(o) {
  const trip = o?.trip || o;
  const idx = o?.idx ?? o?.id ?? trip?._idx;
  if (Number.isInteger(idx) && idx >= 0 && idx < TRIPS.length) {
    return idx;
  }
  const directRefIdx = TRIPS.indexOf(trip);
  if (directRefIdx >= 0) {
    return directRefIdx;
  }
  const lookup = buildTripLookupCache();
  const candidateIndexes = [];
  getTripLookupSignatures(trip, o?.id).forEach((key) => {
    const matches = lookup.get(key);
    if (matches?.length) candidateIndexes.push(...matches);
  });
  const searchIndexes = candidateIndexes.length
    ? [...new Set(candidateIndexes)]
    : TRIPS.map((_, index) => index);
  let bestIdx = -1, bestScore = Infinity;
  for (const i of searchIndexes) {
    const t = TRIPS[i];
    if (!t || t.s !== trip.s || t.t != trip.t) continue;
    let score = 0;
    if (trip.h && t.h === trip.h) score -= 200;
    if (Number.isFinite(trip.d) && Number.isFinite(t.d)) score += Math.abs(t.d - trip.d);
    if (t.p?.[0] && trip.p?.[0]) score += haversineM(t.p[0], trip.p[0]);
    if (t.p?.[t.p.length - 1] && trip.p?.[trip.p.length - 1]) score += haversineM(t.p[t.p.length - 1], trip.p[trip.p.length - 1]);
    if (Array.isArray(t.ts) && Array.isArray(trip.ts) && t.ts.length && trip.ts.length) {
      score += Math.abs((t.ts[0] || 0) - (trip.ts[0] || 0)) * 0.5;
      score += Math.abs((t.ts[t.ts.length - 1] || 0) - (trip.ts[trip.ts.length - 1] || 0)) * 0.25;
    }
    if (score < bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

function hydratePreloadTripState() {
  TRIPS.forEach((trip, index) => {
    trip._idx = index;
    trip.id = index;
    if (!Number.isFinite(trip._delay)) {
      trip._delay = Math.random() > 0.8 ? Math.floor(Math.random() * 600) : 0;
    }
  });
  clearTripLookupCache();
}

// FIX 2 (kısmi — dep-board tamamen kaldırıldı):
// showDepartures() fonksiyonu ve dep-close handler silindi.
// Bunların görevi zaten showStopArrivals() / stop-panel tarafından karşılanıyor.
// dep-board HTML elementi index.html'den de kaldırılması gerekiyor (ayrı sprint).

// ── ARAÇ DETAY PANELİ ────────────────────────────────────
function openVehiclePanel(idx) {
  return callManager('UIManager', 'openVehiclePanel', [idx]);
}
function closeVehiclePanel() {
  return callManager('UIManager', 'closeVehiclePanel');
}
function calcSpeed(trip, time) {
  const off = getTripRuntimeOffset(trip, time), ts = trip.ts, p = trip.p;
  if (off == null) return 0;
  for (let i = 0; i < ts.length - 1; i++) {
    if (off >= ts[i] && off <= ts[i + 1]) {
      const dt = ts[i + 1] - ts[i]; if (dt < 1) return 0;
      return Math.round((haversineM(p[i], p[i + 1]) / dt) * 3.6);
    }
  }
  return 0;
}
function calcHeadway(tripsParam, tripIdx, time, getVehPos, haversM) {
  if (arguments.length === 2) { time = tripIdx; tripIdx = tripsParam; tripsParam = TRIPS; }
  return window.AnalyticsUtils.calcHeadway(tripsParam || TRIPS, tripIdx, time, getVehPos || getVehiclePos, haversM || haversineM, getTripProgressAtTime);
}
function getNextStop(trip, time, stopInf, getVehPos, haversM) {
  return window.AnalyticsUtils.getNextStop(trip, time, stopInf || STOP_INFO, getVehPos || getVehiclePos, haversM || haversineM);
}
function syncPlayButton() {
  const btn = document.getElementById('btn-play');
  if (!btn) return;
  btn.textContent = simPaused ? '▶' : '⏸';
  btn.classList.toggle('paused', simPaused);
}
function setSimulationPaused(nextPaused, owner = null) {
  simPaused = !!nextPaused;
  panelPauseOwner = simPaused ? owner : null;
  syncPlayButton();
}
function toggleSimulationPaused() {
  setSimulationPaused(!simPaused, null);
}
function resetSimulationPlayback() {
  setSimulationPaused(false, null);
  simTime = 6 * 3600;
  speedIdx = 3;
  simSpeed = 60;
  _waitingTimeBucket = null;
  stopReplay();
  updateSpd();
  if (showWaiting) ensureDynamicStopHeadways(true);
}
function syncPanelsForCurrentSimTime() {
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = secsToHHMM(simTime % 86400);
  if (selectedTripIdx !== null) updateVehiclePanel();
  if (_activeStopData) _renderStopPanel(_activeStopData);
}
function setSelectedEntity(entity) {
  selectedEntity = entity || null;
}
function pauseSimulationForSelection(owner) {
  if (simPaused) return;
  setSimulationPaused(true, owner);
}
function releaseSelectionPause(owner) {
  if (panelPauseOwner !== owner) return;
  setSimulationPaused(false, null);
}
document.getElementById('vp-close').onclick = closeVehiclePanel;
document.getElementById('vp-follow-btn').onclick = () => {
  if (followTripIdx === selectedTripIdx) { followTripIdx = null; document.getElementById('follow-bar').classList.add('hidden'); }
  else startFollow(selectedTripIdx);
  updateVehiclePanel();
};
document.getElementById('vp-route-btn').onclick = () => {
  if (selectedTripIdx === null) return;
  focusRoute(TRIPS[selectedTripIdx]?.s);
};

// ── FOLLOW MODE ───────────────────────────────────────────
function startFollow(idx) {
  followTripIdx = idx;
  document.getElementById('follow-bar').classList.remove('hidden');
  document.getElementById('follow-label').textContent = `📍 ${TRIPS[idx].s} ${t('followingRoute')}`;
}
document.getElementById('btn-unfollow').onclick = () => { followTripIdx = null; document.getElementById('follow-bar').classList.add('hidden'); };

// ── ROUTE LIST ────────────────────────────────────────────
const routeListEl = document.getElementById('route-list');
function buildRouteList() {
  return window.UIManager?.buildRouteList?.();
}

const stopListEl = document.getElementById('stop-list');
function buildStopList(filter = '') {
  return window.UIManager?.buildStopList?.(filter);
}

function focusRoute(shortName) {
  return window.UIManager?.focusRoute?.(shortName);
}
document.getElementById('route-filter-inp').oninput = function () {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.route-item').forEach(d => {
    const longName = (d.querySelector('.ri-long')?.textContent || '').toLowerCase();
    d.style.display = (!q || d.dataset.short.toLowerCase().includes(q) || longName.includes(q)) ? 'flex' : 'none';
  });
};
document.getElementById('stop-list-filter')?.addEventListener('input', function () {
  buildStopList(this.value);
});

document.querySelectorAll('.section-hdr.collapsible').forEach(hdr => {
  const target = document.getElementById(hdr.dataset.target); if (!target) return;
  hdr.onclick = () => { const open = target.classList.toggle('open'); hdr.querySelector('.section-toggle')?.classList.toggle('open', open); };
});

// ── RENDEZVOUS ────────────────────────────────────────────
let _rendezvousCache = null;
let _rendezvousCacheTime = -1;

// ── DENSITY ───────────────────────────────────────────────
AppState.densityData = [];
AppState.maxDensity = 1;

let stopNames = Object.entries(STOP_INFO).map(([sid, info]) => [displayText(info[2]).toLowerCase(), sid, info[0], info[1], displayText(info[2])]);

// SPRINT 3 — buildLayers statik/dinamik ayırması
// Önce: tüm katmanlar (path, stops, trips, heads, rendezvous...) her 80ms'de yeniden oluşuyordu.
// Sonra:
//   _buildStaticLayers()  → path, density, stops, transfer arcs: filtre/zoom/veri değişince
//   buildLayers()         → statik katmanları cache'ten alır, sadece animasyonlu olanları yeniler
//
// Statik cache geçersiz kılma koşulları:
//   - visShapes/visTrips değişince (_cacheActiveRoutes veya _cacheTypeFilter değişince)
//   - focusedRoute değişince
//   - QUALITY.level değişince
//   - showPaths/showStops/showDensity/showHeatmap toggle'ı değişince


function _getStaticLayerKey(time) {
  if (window.MapManager?.getStaticLayerKey) {
    return window.MapManager.getStaticLayerKey(time);
  }
  return '';
}

function _buildStaticLayers(visShapes, time) {
  if (window.MapManager?.buildStaticLayers) {
    return window.MapManager.buildStaticLayers(visShapes, time);
  }
  return [];
}
function _getVisData() {
  if (window.MapManager?.getVisData) {
    return window.MapManager.getVisData();
  }
  return { visTrips: TRIPS, visShapes: SHAPES };
}

function buildPathLayers(visShapes) {
  if (window.MapManager?.buildPathLayers) {
    return window.MapManager.buildPathLayers(visShapes);
  }
  return [];
}

function buildLayers() {
  if (window.MapManager?.buildLayers) {
    return window.MapManager.buildLayers();
  }
  return [];
}

// ── GECE/GÜNDÜZ ───────────────────────────────────────────
function updateDayNight() {
  return window.SimulationEngine?.updateDayNight?.();
}

// ── FPS ───────────────────────────────────────────────────
function updateFPS(ts) {
  return window.SimulationEngine?.updateFPS?.(ts);
}

// ── REPLAY ────────────────────────────────────────────────
function startReplay() {
  return window.SimulationEngine?.startReplay?.();
}
function stopReplay() {
  return window.SimulationEngine?.stopReplay?.();
}
document.getElementById('btn-replay').onclick = () => isReplay ? stopReplay() : startReplay();
document.getElementById('replay-stop').onclick = stopReplay;
document.getElementById('replay-loop').onchange = e => { replayLoop = e.target.checked; };
function updateReplayBar() {
  return window.SimulationEngine?.updateReplayBar?.();
}

// ── ANİMASYON DÖNGÜSÜ ─────────────────────────────────────
function animate(ts) {
  return window.SimulationEngine?.animate?.(ts);
}

// ── UI KONTROLLER ─────────────────────────────────────────
document.getElementById('btn-play').onclick = function () { toggleSimulationPaused(); };
document.getElementById('btn-faster').onclick = () => { speedIdx = Math.min(speedIdx + 1, SPEEDS.length - 1); simSpeed = SPEEDS[speedIdx]; updateSpd(); };
document.getElementById('btn-slower').onclick = () => { speedIdx = Math.max(speedIdx - 1, 0); simSpeed = SPEEDS[speedIdx]; updateSpd(); };
document.getElementById('btn-reset').onclick = () => { resetSimulationPlayback(); };
function updateSpd() { const s = SPEEDS[speedIdx]; document.getElementById('speed-lbl').textContent = s < 60 ? s + '×' : Math.round(s / 60) + 'dk/s'; }
document.getElementById('time-slider').oninput = function () {
  simTime = parseInt(this.value);
  if (showWaiting) ensureDynamicStopHeadways(true);
  syncPanelsForCurrentSimTime();
  updateDayNight();
  refreshLayersNow();
};
const togMap = {
  'anim': v => showAnim = v,
  'paths': v => showPaths = v,
  'density': v => { showDensity = v; updateDensityGrid(); },
  'stops': v => showStops = v,
  'stop-coverage': v => showStopCoverage = v,
  'heatmap': v => { showHeatmap = v; document.getElementById('heatmap-ctrl').classList.toggle('hidden', !v); },
  'headway': v => showHeadway = v,
  'bunching': v => { showBunching = v; if (!v) document.getElementById('bunching-panel').classList.add('hidden'); },
  'waiting': v => { showWaiting = v; if (v) ensureDynamicStopHeadways(true); updateWorstStopsPanel(); document.getElementById('worst-stops-panel').classList.toggle('hidden', !v); },
  'isochron': v => {
    showIsochron = v;
    const panel = document.getElementById('isochron-panel');
    if (panel) panel.style.display = v ? 'block' : 'none';
    if (!v) clearIsochron();
    refreshLayersNow();
  }
};
Object.keys(togMap).forEach(id => { const el = document.getElementById('tog-' + id); if (el) el.onchange = function () { togMap[id](this.checked); }; });

function setTypeFilter(t) {
  const parsedType = Number.parseInt(String(t ?? '').trim(), 10);
  typeFilter = t === 'all' || !Number.isFinite(parsedType) ? 'all' : String(parsedType);
  _cachedVisTrips = null; _cachedVisShapes = null;
  _filteredStopsCache = null;
  _filteredStopIdSetCache = null;
  routeHighlightPath = null;
  if (focusedRoute) {
    const focusTrip = TRIPS.find((trip) => trip?.s === focusedRoute);
    if (focusTrip && String(Number.parseInt(String(focusTrip.t ?? '').trim(), 10)) !== typeFilter && typeFilter !== 'all') {
      clearFocusedRouteSelection(false);
    }
  }
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('active', b.dataset.t === typeFilter));
  filterRouteListByType(typeFilter);
  buildStopList(document.getElementById('stop-list-filter')?.value || '');
  refreshLayersNow();
  return true;
}

document.querySelectorAll('.tbtn').forEach(btn => {
  btn.onclick = function () { setTypeFilter(this.dataset.t); };
});
function filterRouteListByType(t) {
  return window.UIManager?.filterRouteListByType?.(t);
}
document.getElementById('heatmap-hour').oninput = function () { heatmapHour = parseInt(this.value); document.getElementById('heatmap-hour-lbl').textContent = secsToHHMM(heatmapHour * 3600); };
document.getElementById('heatmap-follow-sim').onchange = e => { heatmapFollowSim = e.target.checked; };

const bThresh = document.getElementById('bunching-threshold');
if (bThresh) {
  bThresh.oninput = function () { bunchingThreshold = parseInt(this.value); document.getElementById('threshold-lbl').textContent = this.value + 'm'; };
}

document.getElementById('btn-cinematic').onclick = () => isCinematic ? stopCinematic() : startCinematic();

(function () {
  const s = document.createElement('style');
  s.textContent = `
    #cinematic-label{position:fixed;bottom:44px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.92);font-size:17px;font-weight:300;letter-spacing:3px;text-transform:uppercase;text-shadow:0 2px 16px rgba(0,0,0,0.9);pointer-events:none;z-index:200;transition:opacity 0.8s;}
    #sidebar{transition:opacity 0.5s;}
    #worst-stops-panel:not(.hidden),#bunching-panel:not(.hidden){transition:all 0.3s;}
  `;
  document.head.appendChild(s);
})();

// ── ROTA PLANLAMA ─────────────────────────────────────────
function dijkstra(from, to) {
  return callManager('PlannerManager', 'dijkstra', [from, to], null);
}

function calcIsochronFromStop(startSid, maxSecs) {
  return callManager('PlannerManager', 'calcIsochronFromStop', [startSid, maxSecs], []);
}

function triggerIsochron(lon, lat) {
  return callManager('PlannerManager', 'triggerIsochron', [lon, lat]);
}

function clearIsochron() {
  return callManager('PlannerManager', 'clearIsochron');
}

function calcHeadwayPairs(time) {
  return window.SimulationEngine?.calcHeadwayPairs?.(time) || [];
}

function detectBunching(time) {
  return window.SimulationEngine?.detectBunching?.(time) || [];
}

function updateBunchingPanel(alarms) {
  return callManager('UIManager', 'updateBunchingPanel', [alarms]);
}

function precomputeStopHeadways() {
  return window.SimulationEngine?.precomputeStopHeadways?.();
}

function ensureDynamicStopHeadways(force = false) {
  return window.SimulationEngine?.ensureDynamicStopHeadways?.(force);
}

function waitingColor(hw) {
  return window.AnalyticsUtils.waitingColor(hw);
}

function buildWorstStops() {
  return callManager('UIManager', 'buildWorstStops');
}

function updateWorstStopsPanel() {
  return callManager('UIManager', 'updateWorstStopsPanel');
}

function startCinematic() {
  return window.UIManager?.startCinematic?.();
}
function stopCinematic() {
  return window.UIManager?.stopCinematic?.();
}
function cinematicNext() {
  return window.UIManager?.cinematicNext?.();
}

// ── BAŞLANGIÇ ─────────────────────────────────────────────
hydratePreloadTripState();
if (typeof setTypeFilter === "function") setTypeFilter(typeFilter);

// ── FAZ 3: GTFS MODAL ─────────────────────────────────────
function openGTFSModal() {
  return callManager('DataManager', 'openGTFSModal');
}
function closeGTFSModal() {
  return callManager('DataManager', 'closeGTFSModal');
}
function showToast(msg, type = 'info') {
  return callManager('DataManager', 'showToast', [msg, type]);
}

function getServiceIdsForDate(dateStr, calendarRows, calendarDateRows) {
  return callManager('ServiceManager', 'getServiceIdsForDate', [dateStr, calendarRows, calendarDateRows], () => new Set());
}

function autoSelectAndAdaptService(calendarRows, calendarDateRows) {
  return callManager('ServiceManager', 'autoSelectAndAdaptService', [calendarRows, calendarDateRows], () => ({ serviceId: 'all', adapted: false, serviceIds: new Set(['all']), reason: '' }));
}

async function handleGTFSFile(file) {
  return callManager('DataManager', 'handleGTFSFile', [file]);
}
window.handleGTFSFile = handleGTFSFile;

// SPRINT 2: parseCsvRows GtfsUtils'e taşındı — window.GtfsUtils.parseCsvRows kullanılıyor.
// Bu wrapper geriye dönük uyumluluk için korundu.
function parseCsvRows(txt) { return window.GtfsUtils.parseCsvRows(txt); }
// SPRINT 2: parseCsvRows artık GtfsUtils içinde tanımlı ve export ediliyor.
// parseGtfsTables parametresi opsiyonel yapıldı — geçirmemek yeterli.
function parseGtfsTables(files) { return window.GtfsUtils.parseGtfsTables(files); }
function buildRouteMap(routeRows) { return window.GtfsUtils.buildRouteMap(routeRows, getRouteColorRgb, TYPE_META); }
function buildShapePoints(shapeRows) { return window.GtfsUtils.buildShapePoints(shapeRows); }
function buildStopsMap(stopRows) { return window.GtfsUtils.buildStopsMap(stopRows); }
function buildTripMetaMap(tripRows) { return window.GtfsUtils.buildTripMetaMap(tripRows); }
function buildTripStopsMap(stRows) { return window.GtfsUtils.buildTripStopsMap(stRows); }

function buildServiceOptions(calendarRows, calendarDateRows) {
  return callManager('ServiceManager', 'buildServiceOptions', [calendarRows, calendarDateRows], []);
}

async function loadGtfsIntoSim(files, zipFileName, forceServiceId, forceServiceIds) {
  return callManager('DataManager', 'loadGtfsIntoSim', [files, zipFileName, forceServiceId, forceServiceIds], false);
}

function buildUploadedCityMeta(files, zipFileName) {
  return callManager('DataManager', 'buildUploadedCityMeta', [files, zipFileName], null);
}

// ── TS MUTLAK FORMAT DÖNÜŞÜMÜ ────────────────────────────
// trips_data.js'te trip.ts ROLATİF format: ts[0]=0, ts[last]=trip.d (sefer süresi)
// TripsLayer currentTime: simTime % 86400 (MUTLAK gün saniyesi) kullanıyor.
// Çözüm: her trip'in gün içi başlangıç saatini bulup ts[i] += startTime yapıyoruz.
//
// Başlangıç saati kaynak önceliği:
//   1. trip.st dizisi (gtfs_to_js.py → [{sid,off}] formatı) → off değerinin minimumu
//   2. trip.bs sayısal alan (başlangıç saniyesi olarak kaydedilmişse)
//   3. STOP_DEPS'teki en erken offset
//   4. Bulunamazsa → trip atlanır (ts dokunulmaz)
function patchTripsAbsoluteTime(trips, stopDeps) {
  return callManager('DataManager', 'patchTripsAbsoluteTime', [trips, stopDeps]);
}

function applyGtfsRuntimeData(runtimeData) {
  return callManager('DataManager', 'applyGtfsRuntimeData', [runtimeData]);
}

function updateWarningDashboard() {
  const dash = document.getElementById('gtfs-warning-dash');
  const content = document.getElementById('gwd-content');
  const report = AppState.gtfsValidationReport;
  if (!dash || !content || !report) return;
  const errCount = report.errors.length, warnCount = report.warnings.length;
  if (errCount === 0 && warnCount === 0) { dash.classList.add('hidden'); return; }
  dash.classList.remove('hidden');
  content.innerHTML = `<div class="gwd-stat"><span>${t('warningCriticalErrors')}</span><span class="gwd-stat-val" style="color:#f85149">${errCount}</span></div><div class="gwd-stat"><span>${t('warningDataWarnings')}</span><span class="gwd-stat-val" style="color:#d29922">${warnCount}</span></div><div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:6px;font-style:italic;opacity:0.8">${errCount > 0 ? t('warningErrorsPresent') : t('warningInconsistencies')}</div>`;
}

document.getElementById('gwd-close')?.addEventListener('click', () => {
  document.getElementById('gtfs-warning-dash')?.classList.add('hidden');
});

function setLodBadge(text, className, title = '') {
  const badge = document.getElementById('lod-badge');
  const note = document.getElementById('lod-note');
  if (!badge) return;
  badge.textContent = text; badge.className = `lod-badge ${className}`.trim(); badge.title = title;
  if (note) { note.textContent = title || '3D model durum bilgisi burada görünür.'; note.classList.toggle('hidden', !title); }
}

document.getElementById('stop-panel-close')?.addEventListener('click', closeStopPanel);
document.getElementById('route-panel-close')?.addEventListener('click', () => clearFocusedRouteSelection(true));
document.getElementById('isochron-close')?.addEventListener('click', () => {
  const tog = document.getElementById('tog-isochron');
  if (tog) { tog.checked = false; tog.dispatchEvent(new Event('change')); }
});

function getStopRouteSummaries(sid, simMod) {
  const deps = sid ? STOP_DEPS[sid] : null;
  if (!deps?.length) return [];
  const bucketSize = 30;
  const timeBucket = Math.floor((((simMod % 86400) + 86400) % 86400) / bucketSize);
  const cacheKey = `${sid}|${timeBucket}|${deps.length}`;
  const cached = _stopRouteSummariesCache.get(cacheKey);
  if (cached) return cached;
  const byRoute = {};
  for (const [ti, offset, routeShort] of deps) {
    const trip = TRIPS[ti]; if (!trip) continue;
    const absOffset = getAbsoluteDepartureSec(trip, offset);
    if (absOffset == null) continue;
    const diff = ((absOffset - simMod + 86400) % 86400);
    const key = routeShort || trip.s;
    if (!byRoute[key]) byRoute[key] = { trip, short: key, longName: displayText(trip.ln || trip.h || ''), arrivals: [], deps: [] };
    byRoute[key].arrivals.push({ diff, offset: absOffset });
    byRoute[key].deps.push([ti, absOffset, routeShort]);
  }
  const result = Object.values(byRoute).map(route => {
    route.arrivals.sort((a, b) => a.diff - b.diff);
    const uniqueArrivals = [];
    route.arrivals.forEach(arr => {
      if (!uniqueArrivals.length || Math.abs(arr.diff - uniqueArrivals[uniqueArrivals.length - 1].diff) > STOP_PANEL_CFG.uniqueArrivalThresholdSeconds) {
        uniqueArrivals.push({
          diff: arr.diff > STOP_PANEL_CFG.maxArrivalWindowSeconds ? null : arr.diff,
          offset: arr.offset,
        });
      }
    });
    route.arrivals = uniqueArrivals.slice(0, 2);
    route.headway = computeAverageHeadwaySeconds(route.deps);
    return route;
  }).filter(route => route.arrivals.length).sort((a, b) => {
    const aDiff = a.arrivals.find(arr => Number.isFinite(arr.diff))?.diff ?? Number.MAX_SAFE_INTEGER;
    const bDiff = b.arrivals.find(arr => Number.isFinite(arr.diff))?.diff ?? Number.MAX_SAFE_INTEGER;
    return aDiff - bDiff;
  });
  if (_stopRouteSummariesCache.size > 800) {
    clearStopRouteSummariesCache();
  }
  _stopRouteSummariesCache.set(cacheKey, result);
  return result;
}

showStopArrivals = function (stop) {
  return callManager('UIManager', 'showStopArrivals', [stop]);
};

function _makeDraggable(el) {
  return callManager('UIManager', 'makeDraggable', [el]);
}

function _renderStopPanel(stop) {
  return callManager('UIManager', 'renderStopPanel', [stop]);
}

function closeStopPanel() {
  return callManager('UIManager', 'closeStopPanel');
}

updateVehiclePanel = function () {
  return callManager('UIManager', 'updateVehiclePanel');
};

function getModelUrl(type) { return window.RenderUtils ? window.RenderUtils.getModelUrl(type) : ''; }
function getModelPath(type) { return window.RenderUtils ? window.RenderUtils.getModelPath(type) : getModelUrl(type); }
function getModelNotice(type) { return window.RenderUtils ? window.RenderUtils.getModelNotice(type) : 'native'; }
function getModelScale(type) { return window.RenderUtils ? window.RenderUtils.getModelScale(type) : 8; }
function getModelOrientation(trip, time) {
  const progress = getTripProgressAtTime(trip, time);
  if (progress != null) {
    const snapData = getRouteShapeSnapData(trip);
    const snapOrientation = getPathOrientationAtProgress(snapData, progress);
    if (snapData && snapOrientation) return snapOrientation;
  }
  return window.RenderUtils ? window.RenderUtils.getModelOrientation(trip, time) : [0, 0, 0];
}

build3DVehicleLayer = function (visTrips, time) {
  return window.MapManager?.build3DVehicleLayer?.(visTrips, time) || null;
};

var activeCity = CITIES[0];
var activeServiceId = 'all';
var activeServiceIds = new Set();
var _calendarCache = { rows: [], dateRows: [] };
var activeServiceOptions = [];
function isCityVisible(city) {
  return callManager('CityManager', 'isCityVisible', [city], () => !hiddenCities.has(city.id));
}
function getFirstVisibleCity() {
  return callManager('CityManager', 'getFirstVisibleCity', [], () => CITIES.find(isCityVisible) || null);
}


function renderServiceDatePicker(calendarRows, calendarDateRows, currentIds) {
  return callManager('ServiceManager', 'renderServiceDatePicker', [calendarRows, calendarDateRows, currentIds]);
}

function buildCityList() {
  return callManager('CityManager', 'buildCityList');
}

async function loadCity(city) {
  return callManager('CityManager', 'loadCity', [city]);
}

function toggleCityVisibility(cityId, visible) {
  return callManager('CityManager', 'toggleCityVisibility', [cityId, visible]);
}

function deleteUploadedCity(cityId) {
  return callManager('CityManager', 'deleteUploadedCity', [cityId]);
}

window.handleNativeCityScan = async function (cities) {
  return callManager('CityManager', 'handleNativeCityScan', [cities]);
};

async function initializeBuiltinCity(city) {
  return callManager('CityManager', 'initializeBuiltinCity', [city]);
}

show3D = false;

window.IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI;

function updateLandingPageReports() {
  return callManager('AppManager', 'updateLandingPageReports');
}

function toggleUI(showMap) {
  return callManager('AppManager', 'toggleUI', [showMap]);
}

function updateDensityGrid() {
  return callManager('AppManager', 'updateDensityGrid');
}

window.getModelPath = getModelPath;

// VERİ YÖNETİM PANELİ — Faz D'de erişimden kaldırıldı, Faz E teknik borç turu kapsamında silindi.

window.UIManager?.init?.();
window.ServiceManager?.init?.();
window.PlannerManager?.init?.();
window.DataManager?.init?.();
window.AppManager?.init?.();
window.CityManager?.init?.().catch((err) => {
  console.warn('[Init] Başlangıç yüklemesi başarısız:', err);
}).finally(() => {
  updateLandingPageReports();
  window.BootstrapManager?.onAppReady?.();
});

window.AppState = AppState;
window.QUALITY = QUALITY;
window.TYPE_META = TYPE_META;
window.PHASE_CFG = PHASE_CFG;
window.SPEEDS = SPEEDS;
window.CITIES = CITIES;
