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
  stopNames: [],
  gtfsValidationReport: null,
  baseRuntimeData: null,
  stopConnectivityScores: null,
};

var HOURLY_COUNTS = AppState.hourlyCounts;
var HOURLY_HEAT = AppState.hourlyHeat;

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
function getViewportPriorityStopIds() {
  if (!mapgl || typeof mapgl.getBounds !== 'function') return [];
  const bounds = mapgl.getBounds();
  const west = typeof bounds?.getWest === 'function' ? bounds.getWest() : bounds?._sw?.lng;
  const south = typeof bounds?.getSouth === 'function' ? bounds.getSouth() : bounds?._sw?.lat;
  const east = typeof bounds?.getEast === 'function' ? bounds.getEast() : bounds?._ne?.lng;
  const north = typeof bounds?.getNorth === 'function' ? bounds.getNorth() : bounds?._ne?.lat;
  if (![west, south, east, north].every(Number.isFinite)) return [];
  return Object.entries(AppState.stopInfo || {})
    .filter(([, stop]) => Array.isArray(stop) && stop[0] >= west && stop[0] <= east && stop[1] >= south && stop[1] <= north)
    .map(([stopId]) => stopId);
}

function getConnectivityViewportStopIds(limit = CONNECTIVITY_VIEWPORT_STOP_LIMIT) {
  const filteredStopIds = getFilteredStopIdSet();
  const result = [];
  for (const stopId of getViewportPriorityStopIds()) {
    if (filteredStopIds?.size && !filteredStopIds.has(stopId)) continue;
    if (!(AppState.stopDeps?.[stopId] || []).length) continue;
    result.push(stopId);
    if (result.length >= limit) break;
  }
  return result;
}

function updateConnectivityViewportStatus() {
  if (!showConnectivityGrid) return;
  if (AppState.stopConnectivityScores?.meta?.validation_summary) {
    updateConnectivityGridToggleLabel(null);
    updateConnectivityLegend(null);
    return;
  }
  const stopIds = getConnectivityViewportStopIds();
  const total = stopIds.length;
  if (!total) {
    updateConnectivityGridToggleLabel(null);
    updateConnectivityLegend(null);
    return;
  }
  const ready = stopIds.reduce((count, stopId) => count + (AppState.stopConnectivityScores?.stops?.[stopId] ? 1 : 0), 0);
  const progress = Math.round((ready / total) * 100);
  updateConnectivityGridToggleLabel(progress >= 100 ? null : progress);
  updateConnectivityLegend(progress >= 100 ? null : progress);
}

function ensureConnectivityViewportScores() {
  if (!showConnectivityGrid) return;
  if (AppState.stopConnectivityScores?.meta?.validation_summary) {
    updateConnectivityViewportStatus();
    return;
  }
  const stopIds = getConnectivityViewportStopIds();
  if (!stopIds.length) {
    updateConnectivityViewportStatus();
    return;
  }
  const ctx = {
    AppState,
    activeCityId: activeCity?.id || null,
    getTrips: () => AppState.trips,
    getStopInfo: () => AppState.stopInfo,
    getStopDeps: () => AppState.stopDeps,
    getStopConnectivityScores: getStopConnectivityScoresState,
    setStopConnectivityScores: setStopConnectivityScoresState,
  };
  stopIds.forEach((stopId) => {
    window.StopConnectivityUtils?.ensureStopConnectivityRecord?.(stopId, ctx);
  });
  updateConnectivityViewportStatus();
}

async function tryLoadStopConnectivityCache() {
  if (!window.IS_ELECTRON || typeof window.electronAPI?.readConnectivityCache !== 'function') return false;
  if (!window.StopConnectivityUtils?.buildSnapshotFileName) return false;
  try {
    const fileName = window.StopConnectivityUtils.buildSnapshotFileName({
      AppState,
      activeCityId: activeCity?.id || null,
      getTrips: () => AppState.trips,
      getStopInfo: () => AppState.stopInfo,
      getStopDeps: () => AppState.stopDeps,
    });
    const result = await window.electronAPI.readConnectivityCache(fileName);
    if (!result?.success || !result.text) return false;
    const parsed = JSON.parse(result.text);
    if (!parsed?.meta?.validation_summary || !parsed?.stops) return false;
    AppState.stopConnectivityScores = parsed;
    console.log('[ConnectivityCache] loaded', { fileName, stopCount: parsed.meta.validation_summary?.scored_stop_count || 0 });
    return true;
  } catch (err) {
    console.warn('[ConnectivityCache] load failed', err);
    return false;
  }
}

async function persistStopConnectivityCache(snapshot) {
  if (!window.IS_ELECTRON || typeof window.electronAPI?.writeConnectivityCache !== 'function') return false;
  if (!window.StopConnectivityUtils?.buildSnapshotFileName || !snapshot?.meta?.validation_summary) return false;
  try {
    const fileName = window.StopConnectivityUtils.buildSnapshotFileName({
      AppState,
      activeCityId: activeCity?.id || null,
      getTrips: () => AppState.trips,
      getStopInfo: () => AppState.stopInfo,
      getStopDeps: () => AppState.stopDeps,
    });
    const result = await window.electronAPI.writeConnectivityCache(fileName, snapshot);
    if (result?.success) {
      console.log('[ConnectivityCache] saved', { fileName, stopCount: snapshot.meta.validation_summary?.scored_stop_count || 0 });
      return true;
    }
  } catch (err) {
    console.warn('[ConnectivityCache] save failed', err);
  }
  return false;
}

async function scheduleStopConnectivityWarmup() {
  if (AppState.stopConnectivityScores?.meta?.validation_summary) return;
  const loaded = await tryLoadStopConnectivityCache();
  if (loaded) refreshLayersNow();
}

async function createConnectivityWorkerInstance() {
  if (typeof Worker === 'undefined') return null;
  if (location.protocol !== 'file:') {
    try { return new Worker('src/runtime/connectivity-worker.js'); } catch (_) {}
  }
  try {
    const sources = await Promise.all([
      fetch('src/utils/stop-connectivity-utils.js').then((r) => r.text()),
      fetch('src/runtime/connectivity-worker.js').then((r) => r.text()),
    ]);
    const blob = new Blob(sources, { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  } catch (err) {
    console.warn('[ConnectivityWorker] oluşturulamadı, fallback moduna geçiliyor:', err);
    return null;
  }
}

async function startConnectivityWorker() {
  if (AppState.stopConnectivityScores?.meta?.validation_summary) return;
  if (!Object.keys(AppState.stopInfo || {}).length || !Object.keys(AppState.stopDeps || {}).length) return;

  if (connectivityWorker) {
    connectivityWorker.terminate();
    connectivityWorker = null;
  }

  const worker = await createConnectivityWorkerInstance();
  if (!worker) {
    ensureConnectivityViewportScores();
    return;
  }

  connectivityWorker = worker;

  worker.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === 'PROGRESS') {
      window.dispatchEvent(new CustomEvent('stop-connectivity-progress', { detail: msg.detail }));
      return;
    }
    if (msg.type === 'DONE') {
      AppState.stopConnectivityScores = msg.snapshot || AppState.stopConnectivityScores;
      window.dispatchEvent(new CustomEvent('stop-connectivity-progress', {
        detail: { index: 1, total: 1, done: true },
      }));
      refreshLayersNow();
      persistStopConnectivityCache(msg.snapshot);
      connectivityWorker = null;
      worker.terminate();
      return;
    }
    if (msg.type === 'ERROR') {
      console.warn('[ConnectivityWorker]', msg.error);
      connectivityWorker = null;
      worker.terminate();
      ensureConnectivityViewportScores();
    }
  };

  worker.onerror = (err) => {
    console.warn('[ConnectivityWorker] hata:', err);
    connectivityWorker = null;
    ensureConnectivityViewportScores();
  };

  worker.postMessage({
    type: 'START',
    trips: AppState.trips,
    stopInfo: AppState.stopInfo,
    stopDeps: AppState.stopDeps,
    adj: AppState.adj,
    feed_id: activeCity?.id || null,
    options: {},
  });
}
function buildAdjacencyList() {
  AppState.adj = window.AdjacencyBuilder.build(AppState.trips, AppState.stopDeps, AppState.stopInfo);
  scheduleStopConnectivityWarmup();
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
const ROUTE_TYPE_TRANSLATION_KEYS = {
  '0': 'routeTypeTram',
  '1': 'routeTypeMetro',
  '2': 'routeTypeTrain',
  '3': 'routeTypeBus',
  '4': 'routeTypeFerry',
  '5': 'routeTypeCableCar',
  '6': 'routeTypeGondola',
  '7': 'routeTypeFunicular',
  '9': 'routeTypeMinibus',
  '10': 'routeTypeSharedTaxi',
};
const SPEEDS = [1, 10, 30, 60, 120, 300, 600];

// ── SİMÜLASYON STATE ─────────────────────────────────────
let simTime = 6 * 3600, simPaused = false, lastTs = null;
let speedIdx = 3, simSpeed = 60;
let showAnim = true, showPaths = true, showStops = true, showStopCoverage = false;
let showConnectivityGrid = false;
let stopCoverageRadiusM = 300;
let stopCoverageFillColorHex = '#58a6ff';
let stopCoverageFillOpacityPct = 14;
let stopCoverageStrokeColorHex = '#58a6ff';
let stopCoverageStrokeWidthPx = 2;
let stopCoverageMode = 'fill-stroke';
let showHeatmap = false, heatmapHour = 8, heatmapFollowSim = false;
let showTrail = false;
let currentMapStyle = 'auto'; // 'auto', 'satellite', 'dark', 'light'
let typeFilter = 'all';
let connectivityGridPerfOpenAt = 0;
let connectivityGridSelectedCell = null;
const CONNECTIVITY_VIEWPORT_STOP_LIMIT = 250;
let connectivityWorker = null;
let activeRoutes = new Set();
let focusedRoute = null;
let selectedRouteDirection = null;
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
let showHeadway = false, showBunching = false;
let showIsochron = false;
let _isochronData = null, _isochronOriginSid = null;
let bunchingThreshold = 200;
let bunchingEvents = [];
let _focusedStopIdsCache = null, _filteredStopsCache = null, _filteredStopIdSetCache = null;

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
const {
  configureRuntimeCinematic,
  getCinematicWaypoints,
} = window.RuntimeCinematicControls;
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
    .map(stop => stop?.sid && AppState.stopInfo?.[stop.sid] ? [AppState.stopInfo[stop.sid][0], AppState.stopInfo[stop.sid][1]] : null)
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
    candidates = AppState.shapes
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
function buildVehicleHeadsLayer(heads) {
  return window.MapManager?.buildVehicleHeadsLayer?.(heads) || null;
}
function buildVehicleIconLayer(heads) {
  return window.MapManager?.buildVehicleIconLayer?.(heads) || null;
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
    ? window.RenderUtils.getRouteMeta(routeShort, routeType, fallbackColor, longName, AppState.shapes, AppState.trips)
    : { short: displayText(routeShort || 'Hat'), longName: displayText(longName || ''), type: String(routeType || '3'), color: [127, 140, 141] };
}
function getStopMetaByArray(stop) {
  return window.RenderUtils
    ? window.RenderUtils.getStopMetaByArray(stop, AppState.stopInfo)
    : { sid: null, name: 'Durak', code: '-', lon: stop?.[0], lat: stop?.[1] };
}
function computeAverageHeadwaySeconds(deps) {
  if (!deps || deps.length === 0) return null;
  const normalizedDeps = deps
    .map(([tripIdx, offset, routeShort]) => [tripIdx, getAbsoluteDepartureSec(AppState.trips[tripIdx], offset), routeShort])
    .filter((dep) => Number.isFinite(dep[1]));
  if (!normalizedDeps.length) return null;
  return window.SimUtils
    ? window.SimUtils.computeAverageHeadwaySeconds(normalizedDeps, HEADWAY_CFG)
    : null;
}
function findNearestStopName(pathPoint) {
  return window.UiUtils
    ? window.UiUtils.findNearestStopName(pathPoint, AppState.stopInfo, haversineM, displayText)
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
function hexToRgb(hex, fallback = [88, 166, 255]) {
  const normalized = String(hex || '').trim();
  const match = normalized.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return fallback;
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}
function updateStopScoreControlsVisibility() {}
function getStopCoverageState() {
  return {
    showStopCoverage,
    stopCoverageRadiusM,
    stopCoverageFillColorHex,
    stopCoverageFillOpacityPct,
    stopCoverageStrokeColorHex,
    stopCoverageStrokeWidthPx,
    stopCoverageMode,
  };
}

function setStopCoverageState(patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'showStopCoverage')) showStopCoverage = !!patch.showStopCoverage;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageRadiusM')) stopCoverageRadiusM = patch.stopCoverageRadiusM;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageFillColorHex')) stopCoverageFillColorHex = patch.stopCoverageFillColorHex;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageFillOpacityPct')) stopCoverageFillOpacityPct = patch.stopCoverageFillOpacityPct;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageStrokeColorHex')) stopCoverageStrokeColorHex = patch.stopCoverageStrokeColorHex;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageStrokeWidthPx')) stopCoverageStrokeWidthPx = patch.stopCoverageStrokeWidthPx;
  if (Object.prototype.hasOwnProperty.call(patch, 'stopCoverageMode')) stopCoverageMode = patch.stopCoverageMode;
}

function getHeatmapState() {
  return {
    showHeatmap,
    heatmapHour,
    heatmapFollowSim,
  };
}

function setHeatmapState(patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'showHeatmap')) showHeatmap = !!patch.showHeatmap;
  if (Object.prototype.hasOwnProperty.call(patch, 'heatmapHour')) heatmapHour = patch.heatmapHour;
  if (Object.prototype.hasOwnProperty.call(patch, 'heatmapFollowSim')) heatmapFollowSim = !!patch.heatmapFollowSim;
}

function getBunchingState() {
  return {
    showBunching,
    bunchingThreshold,
  };
}

function setBunchingState(patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'showBunching')) showBunching = !!patch.showBunching;
  if (Object.prototype.hasOwnProperty.call(patch, 'bunchingThreshold')) bunchingThreshold = patch.bunchingThreshold;
}
function getIsochronState() {
  return {
    showIsochron,
  };
}

function setIsochronState(patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'showIsochron')) showIsochron = !!patch.showIsochron;
}
function getPlaybackState() {
  return {
    simTime,
    speedIdx,
    simSpeed,
    replayLoop,
  };
}

function setPlaybackState(patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'simTime')) simTime = patch.simTime;
  if (Object.prototype.hasOwnProperty.call(patch, 'speedIdx')) speedIdx = patch.speedIdx;
  if (Object.prototype.hasOwnProperty.call(patch, 'simSpeed')) simSpeed = patch.simSpeed;
  if (Object.prototype.hasOwnProperty.call(patch, 'replayLoop')) replayLoop = !!patch.replayLoop;
}
function getFocusedStopsData() {
  if (!focusedRoute) return null;
  if (_focusedStopIdsCache?.route === focusedRoute && _focusedStopIdsCache?.direction === selectedRouteDirection) return _focusedStopIdsCache.data;
  const data = [];
  for (const [sid, deps] of Object.entries(AppState.stopDeps)) {
    if (deps?.some(dep => {
      const trip = AppState.trips[dep[0]];
      return trip?.s === focusedRoute
        && (selectedRouteDirection === null || trip?.dir === selectedRouteDirection);
    })) {
      const info = AppState.stopInfo[sid];
      if (info) data.push({ sid, pos: [info[0], info[1]], name: displayText(info[2]), code: displayText(info[3] || sid) });
    }
  }
  _focusedStopIdsCache = { route: focusedRoute, direction: selectedRouteDirection, data };
  return data;
}
function getFilteredStopsData() {
  if (focusedRoute) {
    return getFocusedStopsData()?.map((entry) => [entry.pos[0], entry.pos[1], entry.name || entry.sid, entry.sid, entry.name || entry.sid]) || [];
  }
  if (typeFilter === 'all' && activeRoutes.size === 0) return AppState.stops;
  const activeRoutesKey = activeRoutes.size ? [...activeRoutes].sort().join('|') : '';
  const cacheKey = `${typeFilter}|${activeRoutesKey}|${AppState.trips.length}|${Object.keys(AppState.stopDeps || {}).length}`;
  if (_filteredStopsCache?.key === cacheKey) return _filteredStopsCache.data;
  const data = [];
  for (const [sid, deps] of Object.entries(AppState.stopDeps || {})) {
    const hasVisibleTrip = (deps || []).some((dep) => {
      const trip = AppState.trips[dep[0]];
      if (!trip || activeRoutes.has(trip.s)) return false;
      if (typeFilter !== 'all' && String(Number.parseInt(String(trip.t ?? '').trim(), 10)) !== typeFilter) return false;
      return true;
    });
    if (!hasVisibleTrip) continue;
    const info = AppState.stopInfo[sid];
    if (info) data.push([info[0], info[1], displayText(info[2] || sid), sid, displayText(info[2] || sid)]);
  }
  _filteredStopsCache = { key: cacheKey, data };
  return data;
}
function getFilteredStopIdSet() {
  const stopData = getFilteredStopsData();
  const cacheKey = `${typeFilter}|${focusedRoute || ''}|${selectedRouteDirection ?? 'all'}|${activeRoutes.size}|${stopData.length}`;
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
    : `<div class="tt-t">${displayText(typeMetaEntry?.i || '')} ${routeMeta.short}</div><div class="tt-s">${routeMeta.longName || t('routeLongNameMissing', 'Uzun ad yok')}</div><div class="tt-v">${getLocalizedRouteTypeName(routeMeta.type, typeMetaEntry?.n || '-')}</div>`;
}
function getLocalizedRouteTypeName(routeType, fallbackName = '') {
  const normalized = String(routeType ?? '').trim();
  const key = ROUTE_TYPE_TRANSLATION_KEYS[normalized];
  if (!key) return displayText(fallbackName || normalized || '-');
  return t(key, fallbackName || TYPE_META[normalized]?.n || normalized);
}
function buildVehiclePanelState(trip, selectedIdx, time) {
  return window.UiUtils
    ? window.UiUtils.buildVehiclePanelState({
      trip,
      selectedTripIdx: selectedIdx,
      simTime: time,
      stopInfo: AppState.stopInfo,
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
      trips: AppState.trips,
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
  wrap.innerHTML = t('activeBadge', '{active} aktif araç - {routes} hat - {trips} sefer')
    .replace('{active}', `<span id="s-active">${activeCount}</span>`)
    .replace('{routes}', String(routeCount))
    .replace('{trips}', String(tripCount));
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

const {
  createLegacyBridge,
  normalizeArray,
  normalizeSet,
  resetCalendarCache,
} = window.RuntimeBridgeUtils;

function getHiddenRoutes() {
  return new Set(activeRoutes);
}

function isRouteHidden(routeShort) {
  return activeRoutes.has(routeShort);
}

function hideRoute(routeShort) {
  activeRoutes.add(routeShort);
}

function showRoute(routeShort) {
  activeRoutes.delete(routeShort);
}

function clearHiddenRoutes() {
  activeRoutes.clear();
}

function getFocusedRoute() {
  return focusedRoute;
}

function setFocusedRouteState(value) {
  focusedRoute = value || null;
}

function getSelectedRouteDirectionState() {
  return Number.isInteger(selectedRouteDirection) ? selectedRouteDirection : null;
}

function setSelectedRouteDirectionState(value) {
  selectedRouteDirection = Number.isInteger(value) ? value : null;
}

function getSelectedTripIdx() {
  return selectedTripIdx;
}

function setSelectedTripIdxState(value) {
  selectedTripIdx = Number.isInteger(value) ? value : null;
}

function getSelectedEntity() {
  return selectedEntity ? { ...selectedEntity } : null;
}

function setSelectedEntityState(entity) {
  selectedEntity = entity ? { ...entity } : null;
}

function getFollowTripIdxState() {
  return Number.isInteger(followTripIdx) ? followTripIdx : null;
}

function setFollowTripIdxState(value) {
  followTripIdx = Number.isInteger(value) ? value : null;
}

function getActiveStopDataState() {
  return Array.isArray(_activeStopData) ? [..._activeStopData] : (_activeStopData ? { ..._activeStopData } : null);
}

function setActiveStopDataState(value) {
  _activeStopData = Array.isArray(value) ? [...value] : (value ? { ...value } : null);
}

function getActiveCityState() {
  return activeCity ? { ...activeCity } : null;
}

function setActiveCityState(value) {
  activeCity = value ? { ...value } : null;
}

function getActiveServiceIdState() {
  return activeServiceId || 'all';
}

function setActiveServiceIdState(value) {
  activeServiceId = value || 'all';
}

function getActiveServiceIdsState() {
  return new Set(activeServiceIds);
}

function setActiveServiceIdsState(value) {
  activeServiceIds = normalizeSet(value);
}

function getActiveServiceOptionsState() {
  return normalizeArray(activeServiceOptions).map((option) => ({ ...option }));
}

function setActiveServiceOptionsState(value) {
  activeServiceOptions = normalizeArray(value).map((option) => ({ ...option }));
}

function getMapState() {
  return mapgl;
}

function getCitiesState() {
  return CITIES.slice();
}

function findCityState(cityId) {
  return CITIES.find((city) => city?.id === cityId) || null;
}

function replaceCitiesState(value) {
  const nextCities = Array.isArray(value) ? value : [];
  CITIES.splice(0, CITIES.length, ...nextCities);
}

function addCityState(city) {
  if (city) CITIES.push(city);
}

function removeCityStateById(cityId) {
  const idx = CITIES.findIndex((city) => city?.id === cityId);
  if (idx >= 0) CITIES.splice(idx, 1);
}

function getUploadedCityPayloadState(cityId) {
  return uploadedGtfsCities.get(cityId);
}

function setUploadedCityPayloadState(cityId, payload) {
  if (!cityId) return;
  uploadedGtfsCities.set(cityId, payload);
}

function deleteUploadedCityPayloadState(cityId) {
  if (!cityId) return;
  uploadedGtfsCities.delete(cityId);
}

function clearUploadedCityPayloadsState() {
  uploadedGtfsCities.clear();
}

function isHiddenCityState(cityId) {
  return hiddenCities.has(cityId);
}

function hideCityState(cityId) {
  if (cityId) hiddenCities.add(cityId);
}

function showCityState(cityId) {
  if (cityId) hiddenCities.delete(cityId);
}

function clearHiddenCitiesState() {
  hiddenCities.clear();
}

function setRuntimeCollectionsState(runtimeData) {
  AppState.trips = runtimeData?.nTRIPS || [];
  AppState.shapes = runtimeData?.nSHAPES || [];
  AppState.stops = runtimeData?.nSTOPS || [];
  AppState.stopInfo = runtimeData?.nSTOP_INFO || {};
  AppState.stopDeps = runtimeData?.nSTOP_DEPS || {};
  AppState.hourlyCounts = runtimeData?.nHOURLY_COUNTS || {};
  AppState.hourlyHeat = runtimeData?.nHOURLY_HEAT || {};
}

function setStopNamesState(value) {
  AppState.stopNames = Array.isArray(value) ? value : [];
}

function getBaseRuntimeDataState() {
  return AppState.baseRuntimeData || null;
}

function setBaseRuntimeDataState(value) {
  AppState.baseRuntimeData = value || null;
}

function getStopConnectivityScoresState() {
  return AppState.stopConnectivityScores || null;
}

function setStopConnectivityScoresState(value) {
  AppState.stopConnectivityScores = value || null;
}

function getTypeFilterState() {
  return typeFilter;
}

function isCinematicState() {
  return !!isCinematic;
}

function getCinematicIdxState() {
  return cinematicIdx;
}

function getCinematicTimerState() {
  return cinematicTimer;
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
  AppState.trips.forEach((trip, idx) => {
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

const {
  configureRuntimeI18n,
  getLanguage,
  t,
  ensureLanguageSwitcher,
  applyStaticTranslations,
  setLanguage,
} = window.RuntimeI18n;
const {
  configureRuntimeStopCoverage,
  bindStopCoverageControls,
  setStopCoverageEnabled,
  updateStopCoverageControlsVisibility,
} = window.RuntimeStopCoverageControls;
const {
  configureRuntimeHeatmap,
  bindHeatmapControls,
  setHeatmapEnabled,
} = window.RuntimeHeatmapControls;
const {
  configureRuntimeBunching,
  bindBunchingControls,
  setBunchingEnabled,
} = window.RuntimeBunchingControls;
const {
  configureRuntimeIsochron,
  bindIsochronControls,
  setIsochronEnabled,
} = window.RuntimeIsochronControls;
const {
  configureRuntimePlayback,
  bindPlaybackControls,
  updatePlaybackSpeedLabel,
} = window.RuntimePlaybackControls;
const {
  configureRuntimeTypeFilter,
  bindTypeFilterControls,
  updateTypeFilterButtons,
} = window.RuntimeTypeFilterControls;
const {
  bindSectionCollapseControls,
} = window.RuntimeSectionCollapseControls;

configureRuntimeI18n({
  getFollowTripIdx: getFollowTripIdxState,
});

configureRuntimeStopCoverage({
  getState: getStopCoverageState,
  setState: setStopCoverageState,
  refreshLayersNow,
});

configureRuntimeHeatmap({
  getState: getHeatmapState,
  setState: setHeatmapState,
  refreshLayersNow,
});

configureRuntimeBunching({
  getState: getBunchingState,
  setState: setBunchingState,
  refreshLayersNow,
});

configureRuntimeIsochron({
  getState: getIsochronState,
  setState: setIsochronState,
  clearIsochron,
  refreshLayersNow,
});

configureRuntimePlayback({
  getState: getPlaybackState,
  setState: setPlaybackState,
  speeds: SPEEDS,
  toggleSimulationPaused,
  resetSimulationPlayback,
  syncPanelsForCurrentSimTime,
  updateDayNight,
  refreshLayersNow,
  startCinematic,
  stopCinematic,
  isCinematic: () => isCinematic,
});

configureRuntimeTypeFilter({
  getState: () => ({ typeFilter }),
  applyTypeFilter: setTypeFilter,
});

window.addEventListener('app-language-change', () => {
  updateConnectivityGridToggleLabel();
  updateConnectivityLegend();
  updateLandingPageReports();
});

ensureLanguageSwitcher();
applyStaticTranslations();

const {
  configureRuntimeConnectivityGrid,
  updateConnectivityGridToggleLabel,
  updateConnectivityLegend,
  setConnectivityGridCamera,
  setConnectivityGridMapStyle,
} = window.RuntimeConnectivityGridControls;

updateConnectivityGridToggleLabel();

configureRuntimeConnectivityGrid({
  getMap: () => mapgl,
  getShowConnectivityGrid: () => !!showConnectivityGrid,
  getSelectedCell: () => connectivityGridSelectedCell,
  getConnectivityScores: getStopConnectivityScoresState,
  getCurrentMapStyle: () => currentMapStyle,
  setCurrentMapStyle: (v) => { currentMapStyle = v; },
  updateDayNight,
  t,
});

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
  antialias: true, attributionControl: false, canvasContextAttributes: { preserveDrawingBuffer: true }
});
mapgl.addControl(new maplibregl.NavigationControl(), 'bottom-right');
mapgl.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
mapgl.on('load', () => {
  bindMapRecoveryHandlers();
  startDeck();
  if (window.SimulationEngine?.start) window.SimulationEngine.start();
  else requestAnimationFrame(animate);
  mapgl.on('click', e => {
    if (showIsochron) { triggerIsochron(e.lngLat.lng, e.lngLat.lat); }
  });
  mapgl.on('moveend', () => {
    if (showConnectivityGrid) {
      if (!connectivityWorker) ensureConnectivityViewportScores();
      refreshLayersNow();
    }
  });
  mapgl.on('zoomend', () => {
    if (showConnectivityGrid) {
      if (!connectivityWorker) ensureConnectivityViewportScores();
      refreshLayersNow();
    }
  });
});

// ── DECK.GL ───────────────────────────────────────────────
let deckgl;
let deckRecoveryBound = false;
let mapRecoveryBound = false;
let deckRecoveryTimer = null;
let mapRecoveryTimer = null;
let deckContextRecovering = false;
let mapContextRecovering = false;

window.LegacyMapBridge = createLegacyBridge(() => ({
  TRIPS: AppState.trips,
  SHAPES: AppState.shapes,
  STOPS: AppState.stops,
  STOP_INFO: AppState.stopInfo,
  STOP_DEPS: AppState.stopDeps,
  AppState,
  QUALITY,
  TYPE_META,
  simTime,
  typeFilter,
  activeRoutes: getHiddenRoutes(),
  focusedRoute: getFocusedRoute(),
  selectedRouteDirection: getSelectedRouteDirectionState(),
  stopCoverageRadiusM,
  stopCoverageFillColor: hexToRgb(stopCoverageFillColorHex),
  stopCoverageFillOpacityPct,
  stopCoverageStrokeColor: hexToRgb(stopCoverageStrokeColorHex),
  stopCoverageStrokeWidthPx,
  stopCoverageMode,
  connectivityGridSelectedCell,
  followTripIdx: getFollowTripIdxState(),
  activeServiceId: getActiveServiceIdState(),
  getVehiclePos,
  getRouteColorRgb,
  getRouteMeta,
  getFocusedStopsData,
  getFilteredStopsData,
  getFilteredStopIdSet,
  displayText,
  HEADWAY_CFG,
  WAITING_CFG,
  computeAverageHeadwaySeconds,
  getActiveServiceLabel,
  getModelOrientation,
  updateActiveBadge,
  calcHeadwayPairs,
  detectBunching,
  updateBunchingPanel,
  haversineM,
  getShowAnim: () => !!showAnim,
  getShowPaths: () => !!showPaths,
  getShowStops: () => !!showStops,
  getShowStopCoverage: () => !!showStopCoverage,
  getShowConnectivityGrid: () => !!showConnectivityGrid,
  getShowHeatmap: () => !!showHeatmap,
  getShowTrail: () => !!showTrail,
  getShow3D: () => !!show3D,
  getShowHeadway: () => !!showHeadway,
  getShowBunching: () => !!showBunching,
  getShowIsochron: () => !!showIsochron,
  getHeatmapHour: () => heatmapHour,
  getHeatmapFollowSim: () => !!heatmapFollowSim,
  getRouteHighlightPath: () => Array.isArray(routeHighlightPath) ? routeHighlightPath.slice() : routeHighlightPath,
  getIsochronData: () => _isochronData,
  getIsochronOriginSid: () => _isochronOriginSid,
  getStopConnectivityScores: getStopConnectivityScoresState,
}), {
  getMapgl: () => mapgl,
  getDeckgl: () => deckgl,
  getTrips: () => AppState.trips,
  getShapes: () => AppState.shapes,
  getStops: () => AppState.stops,
  getStopInfo: () => AppState.stopInfo,
  getStopDeps: () => AppState.stopDeps,
  getAppState: () => AppState,
  getSimTime: () => simTime,
  getTypeFilter: getTypeFilterState,
  getActiveRoutes: getHiddenRoutes,
  getFocusedRoute,
  getSelectedRouteDirection: getSelectedRouteDirectionState,
  getFollowTripIdx: getFollowTripIdxState,
  getShowAnim: () => !!showAnim,
  getShowPaths: () => !!showPaths,
  getShowStops: () => !!showStops,
  getShowStopCoverage: () => !!showStopCoverage,
  getShowConnectivityGrid: () => !!showConnectivityGrid,
  getShowHeatmap: () => !!showHeatmap,
  getShowTrail: () => !!showTrail,
  getShow3D: () => !!show3D,
  getShowHeadway: () => !!showHeadway,
  getShowBunching: () => !!showBunching,
  getShowIsochron: () => !!showIsochron,
  getHeatmapHour: () => heatmapHour,
  getHeatmapFollowSim: () => !!heatmapFollowSim,
  getRouteHighlightPath: () => Array.isArray(routeHighlightPath) ? routeHighlightPath.slice() : routeHighlightPath,
  getIsochronData: () => _isochronData,
  getIsochronOriginSid: () => _isochronOriginSid,
  getActiveServiceId: getActiveServiceIdState,
  getStopConnectivityScores: getStopConnectivityScoresState,
  getLastFollowPos: () => window._lastFollowPos,
  setLastFollowPos: (pos) => { window._lastFollowPos = pos; },
});

window.LegacyUIBridge = createLegacyBridge(() => ({
    TRIPS: AppState.trips,
    SHAPES: AppState.shapes,
    STOPS: AppState.stops,
    STOP_INFO: AppState.stopInfo,
    STOP_DEPS: AppState.stopDeps,
    TYPE_META,
    AppState,
    simTime,
    focusedRoute: getFocusedRoute(),
    selectedRouteDirection: getSelectedRouteDirectionState(),
    selectedTripIdx: getSelectedTripIdx(),
    selectedEntity: getSelectedEntity(),
    showIsochron,
    followTripIdx: getFollowTripIdxState(),
    isCinematic: isCinematicState(),
    cinematicIdx: getCinematicIdxState(),
    cinematicTimer: getCinematicTimerState(),
    activeRoutes: getHiddenRoutes(),
    stopNames: AppState.stopNames,
    mapgl: getMapState(),
    getCinematicWaypoints,
    HEADWAY_CFG,
    WAITING_CFG,
    activeServiceOptions: getActiveServiceOptionsState(),
    activeServiceId: getActiveServiceIdState(),
    getDeckCanvas: () => deckgl?.getCanvas?.(),
    getStopMetaByArray,
    buildStopTooltipHtml,
    getRouteMeta,
    buildRouteTooltipHtml,
    getLocalizedRouteTypeName,
    getFilteredStopsData,
    getFilteredStopIdSet,
    displayText,
    buildRoutePanelStats,
    getActiveServiceLabel,
    currentLanguage: getLanguage(),
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
    setActiveStopData: (stop) => { setActiveStopDataState(stop); },
    setSelectedTripIdx: (idx) => { setSelectedTripIdxState(idx); },
    getSelectedTripIdx,
    getSelectedEntity,
    getTrips: () => AppState.trips,
    getShapes: () => AppState.shapes,
    getStops: () => AppState.stops,
    getStopInfo: () => AppState.stopInfo,
    getStopDeps: () => AppState.stopDeps,
    getStopNames: () => AppState.stopNames,
    getAppState: () => AppState,
    getActiveStopData: getActiveStopDataState,
    getFollowTripIdx: getFollowTripIdxState,
    getMap: getMapState,
    getTypeFilter: getTypeFilterState,
    setFocusedRoute: (value) => { setFocusedRouteState(value); },
    getFocusedRoute,
    getSelectedRouteDirection: getSelectedRouteDirectionState,
    setSelectedRouteDirection: (value) => { setSelectedRouteDirectionState(value); },
    setFocusedStopIdsCache: (value) => { _focusedStopIdsCache = value; },
    setRouteHighlightPath: (value) => { routeHighlightPath = value; },
    invalidateMapCaches: () => { _cachedVisTrips = null; _cachedVisShapes = null; _filteredStopsCache = null; _filteredStopIdSetCache = null; },
    isRouteHidden,
    hideRoute,
    showRoute,
    clearHiddenRoutes,
    getVehiclePos,
    haversineM,
    setFollowTripIdx: (idx) => { setFollowTripIdxState(idx); },
    getModelOrientation,
    updateLandingPageReports,
    triggerIsochron,
    setCinematic: (value) => { isCinematic = value; },
    getIsCinematic: isCinematicState,
    setCinematicIdx: (value) => { cinematicIdx = value; },
    getCinematicIdx: getCinematicIdxState,
    setCinematicTimer: (value) => { cinematicTimer = value; },
    getCinematicTimer: getCinematicTimerState,
  }));

window.addEventListener('stop-connectivity-progress', (event) => {
  if (event?.detail?.stopId) {
    updateConnectivityViewportStatus();
    if (showConnectivityGrid) refreshLayersNow();
    const activeStopData = getActiveStopDataState();
    if (activeStopData) _renderStopPanel(activeStopData);
    return;
  }
  const index = Number(event?.detail?.index || 0);
  const total = Number(event?.detail?.total || 0);
  const progress = total > 0 ? (index / total) * 100 : (event?.detail?.done ? 100 : 0);
  updateConnectivityGridToggleLabel(progress >= 100 ? null : progress);
  updateConnectivityLegend(progress >= 100 ? null : progress);
  if (showConnectivityGrid) refreshLayersNow();
  const perf = event?.detail?.perf;
  if (perf && event?.detail?.done) {
    const openMs = connectivityGridPerfOpenAt > 0 ? Math.round(performance.now() - connectivityGridPerfOpenAt) : null;
    console.log('[ConnectivityPerf]', {
      phase: 'done',
      openMs,
      processed: perf.processed,
      total: perf.total,
      elapsedMs: perf.elapsedMs,
      avgStopMs: perf.avgStopMs,
      maxStopMs: perf.maxStopMs,
      maxStopId: perf.maxStopId,
    });
  }
  if (!event?.detail?.done) return;
  updateConnectivityGridToggleLabel(null);
  updateConnectivityLegend(null);
  const activeStopData = getActiveStopDataState();
  if (activeStopData) _renderStopPanel(activeStopData);
});

window.addEventListener('connectivity-grid-select', (event) => {
  connectivityGridSelectedCell = event?.detail || null;
  updateConnectivityLegend();
});

window.LegacyPlannerBridge = createLegacyBridge(() => ({
    ADJ: AppState.adj,
    STOP_INFO: AppState.stopInfo,
    displayText,
    getActiveCity: getActiveCityState,
    getAdj: () => AppState.adj,
    getStopInfo: () => AppState.stopInfo,
    getStopConnectivityScores: getStopConnectivityScoresState,
    refreshLayersNow,
    setIsochronData: (value) => { _isochronData = value; },
    setIsochronOriginSid: (value) => { _isochronOriginSid = value; },
    clearStaticLayerKey: () => { _staticLayerKey = ''; },
    setRouteHighlightPath: (value) => { routeHighlightPath = value; },
  }));

window.LegacyServiceBridge = createLegacyBridge(() => ({
    displayText,
    currentLanguage: getLanguage(),
    t,
    showToast,
    getBuiltinGtfsPayload,
    loadGtfsIntoSim,
    getActiveCity: getActiveCityState,
    getUploadedCityPayload: getUploadedCityPayloadState,
    getCalendarCache: () => _calendarCache,
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    getActiveServiceOptions: getActiveServiceOptionsState,
    getActiveServiceId: getActiveServiceIdState,
    setActiveServiceOptions: (value) => { setActiveServiceOptionsState(value); },
    setActiveServiceId: (value) => { setActiveServiceIdState(value); },
    setActiveServiceIds: (value) => { setActiveServiceIdsState(value); },
  }));

window.LegacyCityBridge = createLegacyBridge(() => ({
    AppState,
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
    getActiveCity: getActiveCityState,
    getActiveServiceId: getActiveServiceIdState,
    getActiveServiceIds: getActiveServiceIdsState,
    getMap: getMapState,
    getTrips: () => AppState.trips,
    getShapes: () => AppState.shapes,
    getStops: () => AppState.stops,
    getStopInfo: () => AppState.stopInfo,
    getStopDeps: () => AppState.stopDeps,
    getHourlyCounts: () => AppState.hourlyCounts,
    getHourlyHeat: () => AppState.hourlyHeat,
    getBaseRuntimeData: getBaseRuntimeDataState,
    getCalendarRows: () => AppState.calendarRows || [],
    getCalendarDateRows: () => AppState.calendarDateRows || [],
    getCities: getCitiesState,
    findCityById: findCityState,
    getUploadedCityPayload: getUploadedCityPayloadState,
    isHiddenCity: isHiddenCityState,
    addCity: addCityState,
    removeCityById: removeCityStateById,
    hideCity: hideCityState,
    showCity: showCityState,
    deleteUploadedCityPayload: deleteUploadedCityPayloadState,
    setActiveCity: (value) => { setActiveCityState(value); },
    setActiveServiceId: (value) => { setActiveServiceIdState(value); },
    setActiveServiceIds: (value) => { setActiveServiceIdsState(value); },
    setActiveServiceOptions: (value) => { setActiveServiceOptionsState(value); },
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    clearRuntimeData: () => {
      if (connectivityWorker) {
        connectivityWorker.terminate();
        connectivityWorker = null;
      }
      AppState.trips = [];
      AppState.shapes = [];
      AppState.stops = [];
      AppState.stopInfo = {};
      AppState.stopDeps = {};
      AppState.stopConnectivityScores = null;
      _cachedVisTrips = null;
      _cachedVisShapes = null;
      clearTripLookupCache();
      clearStopRouteSummariesCache();
      window.StopConnectivityUtils?.reset?.();
      if (deckgl) deckgl.setProps({ layers: buildLayers() });
      buildRouteList();
      buildStopList();
    },
  }));

window.LegacyDataBridge = createLegacyBridge(() => ({
    AppState,
    deckgl,
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
    updateWarningDashboard,
    updateLandingPageReports,
    buildCityList,
    toggleUI,
    pushGtfsError,
    resetGtfsErrors,
    getActiveCity: getActiveCityState,
    getActiveServiceIds: getActiveServiceIdsState,
    getMap: getMapState,
    getCities: getCitiesState,
    findCityById: findCityState,
    getUploadedCityPayload: getUploadedCityPayloadState,
    isHiddenCity: isHiddenCityState,
    getLastGtfsLoadError: () => lastGtfsLoadError,
    getLastGtfsFiles: () => window._lastGtfsFiles,
    getLastGtfsFileName: () => window._lastGtfsFileName,
    replaceCities: replaceCitiesState,
    addCity: addCityState,
    removeCityById: removeCityStateById,
    clearUploadedCityPayloads: clearUploadedCityPayloadsState,
    setUploadedCityPayload: setUploadedCityPayloadState,
    deleteUploadedCityPayload: deleteUploadedCityPayloadState,
    clearHiddenCities: clearHiddenCitiesState,
    setRuntimeCollections: setRuntimeCollectionsState,
    setStopNames: setStopNamesState,
    getBaseRuntimeData: getBaseRuntimeDataState,
    setBaseRuntimeData: setBaseRuntimeDataState,
    setActiveServiceId: (value) => { setActiveServiceIdState(value); },
    setActiveServiceIds: (value) => { setActiveServiceIdsState(value); },
    setActiveServiceOptions: (value) => { setActiveServiceOptionsState(value); },
    setActiveCity: (value) => { setActiveCityState(value); },
    setCalendarCache: (value) => { _calendarCache = resetCalendarCache(value); },
    setLastGtfsFiles: (value) => { window._lastGtfsFiles = value; },
    setLastGtfsFileName: (value) => { window._lastGtfsFileName = value; },
    setGtfsReport: (value) => { _gtfsReport = value; AppState.gtfsValidationReport = value; },
    setStaticLayerKey: (value) => { _staticLayerKey = value || ''; },
    clearIconCaches: () => {
      Object.keys(VEHICLE_ICON_CACHE).forEach((key) => delete VEHICLE_ICON_CACHE[key]);
      Object.keys(STOP_ICON_CACHE).forEach((key) => delete STOP_ICON_CACHE[key]);
    },
    getTrips: () => AppState.trips,
    getStopDeps: () => AppState.stopDeps,
    resetRuntimeCaches: () => {
      _cachedVisTrips = null;
      _cachedVisShapes = null;
      _focusedStopIdsCache = null;
      _filteredStopsCache = null;
      _filteredStopIdSetCache = null;
      _routeShapeSnapCache = new Map();
      clearTripLookupCache();
      clearStopRouteSummariesCache();
      setSelectedTripIdxState(null);
      setFollowTripIdxState(null);
      setFocusedRouteState(null);
      setSelectedRouteDirectionState(null);
      clearHiddenRoutes();
      setSelectedEntityState(null);
      panelPauseOwner = null;
      _lastBuildTime = 0;
      _lastBuiltLayers = [];
      _staticLayerKey = '';
      typeFilter = 'all';
    },
    resetViewToggles: () => {
      showAnim = true;
      showStops = false;
      setConnectivityGridCamera(false);
      setConnectivityGridMapStyle(false);
      connectivityGridSelectedCell = null;
      showConnectivityGrid = false;
      updateConnectivityGridToggleLabel(null);
      updateConnectivityLegend(null);
      setStopCoverageState({ showStopCoverage: false });
      updateStopCoverageControlsVisibility();
      showPaths = true;
      const toggles = {
        'tog-stops': false,
        'tog-connectivity-grid': false,
        'tog-stop-coverage': false,
        'tog-anim': true,
        'tog-paths': true,
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
    getTrips: () => AppState.trips,
    getStops: () => AppState.stops,
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
  activeRoutes: getHiddenRoutes(),
  getPhase,
  secsToHHMM,
  getVehiclePos,
  getTripProgressAtTime,
  getTripRuntimeOffset,
  inferTripDirectionLabel,
  haversineM,
  computeAverageHeadwaySeconds,
  refreshLayersNow,
  updateVehiclePanel,
  renderStopPanel: _renderStopPanel,
  buildLayers,
  setSimTime: (value) => { simTime = value; },
  setSimPaused: (value) => { simPaused = !!value; },
  setLastTs: (value) => { lastTs = value; },
  setSpeedIdx: (value) => { speedIdx = value; },
  setSimSpeed: (value) => { simSpeed = value; },
  setIsReplay: (value) => { isReplay = !!value; },
  setReplayLoop: (value) => { replayLoop = !!value; },
  setBunchingEvents: (value) => { bunchingEvents = value; },
  syncPlayButton,
  setSimulationPaused,
  isContextReady: () => !!mapgl,
};
window.LegacySimulationBridge = {
  getContext() {
    legacySimulationContext.TRIPS = AppState.trips;
    legacySimulationContext.simTime = simTime;
    legacySimulationContext.simPaused = simPaused;
    legacySimulationContext.lastTs = lastTs;
    legacySimulationContext.speedIdx = speedIdx;
    legacySimulationContext.simSpeed = simSpeed;
    legacySimulationContext.currentMapStyle = currentMapStyle;
    legacySimulationContext.isReplay = isReplay;
    legacySimulationContext.replayLoop = replayLoop;
    legacySimulationContext.showHeadway = showHeadway;
    legacySimulationContext.typeFilter = typeFilter;
    legacySimulationContext.focusedRoute = getFocusedRoute();
    legacySimulationContext.bunchingThreshold = bunchingThreshold;
    legacySimulationContext.bunchingEvents = bunchingEvents;
    legacySimulationContext.selectedTripIdx = getSelectedTripIdx();
    legacySimulationContext.activeStopData = getActiveStopDataState();
    legacySimulationContext.hourlyCounts = AppState.hourlyCounts;
    legacySimulationContext.mapgl = mapgl;
    legacySimulationContext.deckgl = deckgl;
    legacySimulationContext.updateVehiclePanel = updateVehiclePanel || (() => {});
    legacySimulationContext.renderStopPanel = _renderStopPanel || (() => {});
    return legacySimulationContext;
  },
};

function detachDeckOverlay() {
  if (!deckgl) return;
  try {
    mapgl.removeControl(deckgl);
  } catch (_) {}
  try {
    deckgl.finalize?.();
  } catch (_) {}
  deckgl = null;
}

function clearDeckRecoveryTimer() {
  if (deckRecoveryTimer) {
    clearTimeout(deckRecoveryTimer);
    deckRecoveryTimer = null;
  }
}

function clearMapRecoveryTimer() {
  if (mapRecoveryTimer) {
    clearTimeout(mapRecoveryTimer);
    mapRecoveryTimer = null;
  }
}

function recoverDeckContext(reason = 'restore') {
  clearDeckRecoveryTimer();
  if (reason === 'restore') deckContextRecovering = false;
  setTimeout(() => {
    try {
      startDeck(true);
      refreshLayersNow();
      mapgl.resize();
      mapgl.triggerRepaint?.();
    } catch (err) {
      console.warn('[WebGLRecovery] deck recovery failed', reason, err);
    }
  }, reason === 'restore' ? 120 : 260);
}

function recoverMapContext(reason = 'restore') {
  clearMapRecoveryTimer();
  if (reason === 'restore') mapContextRecovering = false;
  setTimeout(() => {
    try {
      mapgl.resize();
      mapgl.triggerRepaint?.();
    } catch (_) {}
    try {
      startDeck(true);
      refreshLayersNow();
    } catch (err) {
      console.warn('[WebGLRecovery] map recovery failed', reason, err);
    }
  }, reason === 'restore' ? 180 : 320);
}

function scheduleDeckRecoveryFallback() {
  clearDeckRecoveryTimer();
  deckRecoveryTimer = setTimeout(() => {
    if (!deckContextRecovering) return;
    console.warn('[WebGLRecovery] deck restore event gelmedi, fallback recovery deneniyor');
    recoverDeckContext('fallback');
  }, 1800);
}

function scheduleMapRecoveryFallback() {
  clearMapRecoveryTimer();
  mapRecoveryTimer = setTimeout(() => {
    if (!mapContextRecovering) return;
    console.warn('[WebGLRecovery] map restore event gelmedi, fallback recovery deneniyor');
    recoverMapContext('fallback');
    setTimeout(() => {
      if (!mapContextRecovering) return;
      console.warn('[WebGLRecovery] map hala toparlanmadi, sayfa yeniden yukleniyor');
      try {
        sessionStorage.setItem('gtfs-city-webgl-recover-map', '1');
      } catch (_) {}
      window.location.reload();
    }, 1400);
  }, 2200);
}

function bindDeckRecoveryHandlers() {
  if (!deckgl || deckRecoveryBound) return;
  const canvas = deckgl.getCanvas?.();
  if (!canvas) return;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    deckContextRecovering = true;
    scheduleDeckRecoveryFallback();
    showToast('WebGL bağlamı kayboldu. Katmanlar yeniden hazırlanıyor...', 'warn');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    recoverDeckContext('restore');
  });
  deckRecoveryBound = true;
}

function bindMapRecoveryHandlers() {
  if (mapRecoveryBound) return;
  const canvas = mapgl.getCanvas?.();
  if (!canvas) return;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    mapContextRecovering = true;
    scheduleMapRecoveryFallback();
    showToast('Harita WebGL bağlamı kayboldu. Geri yükleniyor...', 'warn');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    recoverMapContext('restore');
  });
  mapRecoveryBound = true;
}

function startDeck(forceRecreate = false) {
  const canvas = document.getElementById('deck-canvas');
  if (canvas) canvas.style.display = 'none';
  if (forceRecreate) {
    deckRecoveryBound = false;
    detachDeckOverlay();
  } else if (deckgl) {
    return deckgl;
  }

  deckgl = new MapboxOverlay({
    getCursor: ({ isHovering }) => isHovering ? 'pointer' : 'default',
    interleaved: true,
    onHover: handleHover,
    onClick: handleClick,
    layers: []
  });

  mapgl.addControl(deckgl);
  bindDeckRecoveryHandlers();
  return deckgl;
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
  const routeTrips = AppState.trips.filter((trip) => trip.s === routeShort);
  const filteredTrips = selectedRouteDirection === null
    ? routeTrips
    : routeTrips.filter((trip) => trip?.dir === selectedRouteDirection);
  const departures = filteredTrips
    .map((trip, idx) => [trip._idx ?? idx, trip.ts?.[0] ?? null, routeShort, trip])
    .filter(([, offset]) => Number.isFinite(offset));

  let firstSec = Infinity, lastSec = -Infinity;
  filteredTrips.forEach((trip) => {
    if (trip.ts && trip.ts.length > 0) {
      if (trip.ts[0] < firstSec) firstSec = trip.ts[0];
      if (trip.ts[trip.ts.length - 1] > lastSec) lastSec = trip.ts[trip.ts.length - 1];
    }
  });

  const directionMap = new Map();
  routeTrips.forEach(trip => {
    const label = inferTripDirectionLabel(trip);
    directionMap.set(label, (directionMap.get(label) || 0) + 1);
  });
  const directionEntries = [...directionMap.entries()].sort((a, b) => b[1] - a[1]);
  const directionOptionMap = new Map();
  routeTrips.forEach((trip) => {
    if (!Number.isInteger(trip?.dir)) return;
    if (!directionOptionMap.has(trip.dir)) {
      directionOptionMap.set(trip.dir, { value: trip.dir, label: inferTripDirectionLabel(trip), count: 0 });
    }
    directionOptionMap.get(trip.dir).count += 1;
  });
  const directionOptions = [...directionOptionMap.values()].sort((a, b) => a.value - b.value);

  // Hat uzunluğu hesaplama: en uzun güzergahı (shape) bul
  let maxM = 0;
  const routeShapes = AppState.shapes.filter((shape) => shape.s === routeShort && (selectedRouteDirection === null || shape.dir === selectedRouteDirection));
  routeShapes.forEach(rs => {
    if (rs.p && rs.p.length >= 2) {
      const len = window.GtfsMathUtils ? window.GtfsMathUtils.pathLengthM(rs.p) : 0;
      if (len > maxM) maxM = len;
    }
  });

  return {
    directionLabel: filteredTrips.length
      ? [...new Set(filteredTrips.map((trip) => inferTripDirectionLabel(trip)))].slice(0, 2).join(' / ')
      : directionEntries.map(([label]) => label).slice(0, 2).join(' / ') || 'Yön bilgisi yok',
    directionEntries,
    directionOptions,
    selectedDirection: selectedRouteDirection,
    tripCountByDirection: directionEntries.length
      ? directionEntries.map(([label, count]) => `${label}: ${count}`).join(' · ')
      : 'Sefer bilgisi yok',
    totalTrips: filteredTrips.length,
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
  if (Number.isInteger(idx) && idx >= 0 && idx < AppState.trips.length) {
    return idx;
  }
  const directRefIdx = AppState.trips.indexOf(trip);
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
    : AppState.trips.map((_, index) => index);
  let bestIdx = -1, bestScore = Infinity;
  for (const i of searchIndexes) {
    const t = AppState.trips[i];
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
  AppState.trips.forEach((trip, index) => {
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
  if (arguments.length === 2) { time = tripIdx; tripIdx = tripsParam; tripsParam = AppState.trips; }
  return window.AnalyticsUtils.calcHeadway(tripsParam || AppState.trips, tripIdx, time, getVehPos || getVehiclePos, haversM || haversineM, getTripProgressAtTime);
}
function getNextStop(trip, time, stopInf, getVehPos, haversM) {
  return window.AnalyticsUtils.getNextStop(trip, time, stopInf || AppState.stopInfo, getVehPos || getVehiclePos, haversM || haversineM);
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
  stopReplay();
  updateSpd();
}
function syncPanelsForCurrentSimTime() {
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = secsToHHMM(simTime % 86400);
  if (selectedTripIdx !== null) updateVehiclePanel();
  const activeStopData = getActiveStopDataState();
  if (activeStopData) _renderStopPanel(activeStopData);
}
function setSelectedEntity(entity) {
  setSelectedEntityState(entity);
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
  if (getFollowTripIdxState() === selectedTripIdx) { setFollowTripIdxState(null); document.getElementById('follow-bar').classList.add('hidden'); }
  else startFollow(selectedTripIdx);
  updateVehiclePanel();
};
document.getElementById('vp-route-btn').onclick = () => {
  if (selectedTripIdx === null) return;
  focusRoute(AppState.trips[selectedTripIdx]?.s);
};

// ── FOLLOW MODE ───────────────────────────────────────────
function startFollow(idx) {
  setFollowTripIdxState(idx);
  document.getElementById('follow-bar').classList.remove('hidden');
  document.getElementById('follow-label').textContent = `📍 ${AppState.trips[idx].s} ${t('followingRoute')}`;
}
document.getElementById('btn-unfollow').onclick = () => { setFollowTripIdxState(null); document.getElementById('follow-bar').classList.add('hidden'); };

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

bindSectionCollapseControls();

// ── RENDEZVOUS ────────────────────────────────────────────
let _rendezvousCache = null;
let _rendezvousCacheTime = -1;

// ── DENSITY ───────────────────────────────────────────────

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
//   - showPaths/showStops/showHeatmap toggle'ı değişince


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
  return { visTrips: AppState.trips, visShapes: AppState.shapes };
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
function updateReplayBar() {
  return window.SimulationEngine?.updateReplayBar?.();
}

// ── ANİMASYON DÖNGÜSÜ ─────────────────────────────────────
function animate(ts) {
  return window.SimulationEngine?.animate?.(ts);
}

// ── UI KONTROLLER ─────────────────────────────────────────
function updateSpd() { updatePlaybackSpeedLabel(); }
const togMap = {
  'anim': v => showAnim = v,
  'paths': v => showPaths = v,
  'stops': v => {
    showStops = v;
    refreshLayersNow();
  },
  'connectivity-grid': v => {
    showConnectivityGrid = v;
    connectivityGridPerfOpenAt = v ? performance.now() : 0;
    if (!v) {
      connectivityGridSelectedCell = null;
      updateConnectivityGridToggleLabel(null);
      updateConnectivityLegend(null);
    }
    if (v) {
      console.log('[ConnectivityPerf]', { phase: 'start' });
      if (AppState.stopConnectivityScores?.meta?.validation_summary) {
        console.log('[ConnectivityPerf]', {
          phase: 'cached',
          stopCount: AppState.stopConnectivityScores.meta.validation_summary.scored_stop_count || 0,
        });
      }
    }
    setConnectivityGridCamera(v);
    setConnectivityGridMapStyle(v);
    if (v) startConnectivityWorker();
    else {
      if (connectivityWorker) {
        connectivityWorker.terminate();
        connectivityWorker = null;
      }
      updateConnectivityViewportStatus();
    }
    refreshLayersNow();
  },
  'stop-coverage': v => {
    setStopCoverageEnabled(v);
  },
  'heatmap': v => {
    setHeatmapEnabled(v);
  },
  'headway': v => showHeadway = v,
  'bunching': v => {
    setBunchingEnabled(v);
  },
  'isochron': v => {
    setIsochronEnabled(v);
  }
};
Object.keys(togMap).forEach(id => { const el = document.getElementById('tog-' + id); if (el) el.onchange = function () { togMap[id](this.checked); }; });
bindStopCoverageControls();
bindHeatmapControls();
bindBunchingControls();
bindIsochronControls();
bindPlaybackControls();

function setTypeFilter(t) {
  const parsedType = Number.parseInt(String(t ?? '').trim(), 10);
  typeFilter = t === 'all' || !Number.isFinite(parsedType) ? 'all' : String(parsedType);
  _cachedVisTrips = null; _cachedVisShapes = null;
  _filteredStopsCache = null;
  _filteredStopIdSetCache = null;
  routeHighlightPath = null;
  if (focusedRoute) {
    const focusTrip = AppState.trips.find((trip) => trip?.s === focusedRoute);
    if (focusTrip && String(Number.parseInt(String(focusTrip.t ?? '').trim(), 10)) !== typeFilter && typeFilter !== 'all') {
      clearFocusedRouteSelection(false);
    }
  }
  updateTypeFilterButtons();
  filterRouteListByType(typeFilter);
  buildStopList(document.getElementById('stop-list-filter')?.value || '');
  refreshLayersNow();
  return true;
}

bindTypeFilterControls();
function filterRouteListByType(t) {
  return window.UIManager?.filterRouteListByType?.(t);
}

(function () {
  const s = document.createElement('style');
  s.textContent = `
    #cinematic-label{position:fixed;bottom:44px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.92);font-size:17px;font-weight:300;letter-spacing:3px;text-transform:uppercase;text-shadow:0 2px 16px rgba(0,0,0,0.9);pointer-events:none;z-index:200;transition:opacity 0.8s;}
    #sidebar{transition:opacity 0.5s;}
    #bunching-panel:not(.hidden){transition:all 0.3s;}
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


function startCinematic() {
  return window.UIManager?.startCinematic?.();
}
function stopCinematic() {
  return window.UIManager?.stopCinematic?.();
}
function cinematicNext() {
  return window.UIManager?.cinematicNext?.();
}

configureRuntimeCinematic({
  getFilteredStopsData,
  getMap: () => mapgl,
  t,
  startCinematic,
  stopCinematic,
  cinematicNext,
});

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
  const result = callManager('DataManager', 'applyGtfsRuntimeData', [runtimeData]);
  resetTariffUiState();
  return result;
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

function getStopRouteSummaries(sid, simMod) {
  const deps = sid ? AppState.stopDeps[sid] : null;
  if (!deps?.length) return [];
  const bucketSize = 30;
  const timeBucket = Math.floor((((simMod % 86400) + 86400) % 86400) / bucketSize);
  const cacheKey = `${sid}|${timeBucket}|${deps.length}`;
  const cached = _stopRouteSummariesCache.get(cacheKey);
  if (cached) return cached;
  const byRoute = {};
  for (const [ti, offset, routeShort] of deps) {
    const trip = AppState.trips[ti]; if (!trip) continue;
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

const GTFS_CITY_CREDIT = '© GTFS City tarafından üretilmiştir • https://ttezer.github.io/gtfs-city/app/';
const {
  configureRuntimeCapture,
  bindCaptureControls,
  openCaptureModal,
  closeCaptureModal,
  getCaptureDefaultFileName,
} = window.RuntimeCaptureControls;

function updateLandingPageReports() {
  return callManager('AppManager', 'updateLandingPageReports');
}

function toggleUI(showMap) {
  return callManager('AppManager', 'toggleUI', [showMap]);
}

window.getModelPath = getModelPath;

// VERİ YÖNETİM PANELİ — Faz D'de erişimden kaldırıldı, Faz E teknik borç turu kapsamında silindi.

window.UIManager?.init?.();
window.ServiceManager?.init?.();
window.PlannerManager?.init?.();
window.DataManager?.init?.();
window.AppManager?.init?.();
configureRuntimeCapture({ getTypeFilter: getTypeFilterState, showToast });
bindCaptureControls();
initializeTariffUi();
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
