/**
 * 3D GTFS Web Worker
 *
 * SPRINT 5: havMeters ve simplifyPathPoints duplikasyonu giderildi.
 * Bu fonksiyonlar artık gtfs-math-utils.js'den importScripts ile yükleniyor.
 *
 * Önceki durum: fonksiyonlar burada kopyalanmıştı (gtfs-utils.js ile birebir aynı).
 * Şimdi: tek kaynak → gtfs-math-utils.js, iki tüketici → gtfs-utils.js + gtfs-worker.js
 */

// Worker ortamında ES module import() desteklenmediğinden importScripts kullanılıyor.
// gtfs-math-utils.js yüklendikten sonra self.GtfsMathUtils üzerinden erişilir.
if (!self.GtfsMathUtils) {
  try {
importScripts('src/utils/gtfs-math-utils.js');
  } catch (e) {
    // importScripts başarısız olursa (farklı origin, path sorunu vb.) inline fallback
    console.warn('[GTFS Worker] gtfs-math-utils.js yüklenemedi, inline fallback kullanılıyor:', e);
    self.GtfsMathUtils = {
      havMeters(a, b) {
        const R = 6371000, toR = Math.PI / 180;
        const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(x));
      },
      simplifyPathPoints(pts, max) {
        if (pts.length <= max) return pts;
        const step = pts.length / max;
        return Array.from({ length: max }, (_, i) => pts[Math.min(Math.floor(i * step), pts.length - 1)]);
      }
    };
  }
}

const { havMeters, simplifyPathPoints } = self.GtfsMathUtils;

function normalizeRuntimeBuildOptions(options, total) {
  const routeIds = Array.isArray(options?.routeIds)
    ? [...new Set(options.routeIds.map((value) => String(value || '').trim()).filter(Boolean))]
    : [];
  const effectiveTotal = Number.isFinite(total) ? total : 0;
  const defaultTripCap = effectiveTotal <= 10000 ? Infinity : effectiveTotal <= 30000 ? 12000 : 15000;
  return {
    routeIds,
    tripCap: Number.isFinite(options?.tripCap) ? Math.max(1, options.tripCap) : defaultTripCap,
    includeStops: typeof options?.includeStops === 'boolean' ? options.includeStops : effectiveTotal <= 10000,
    includeHourlyStats: typeof options?.includeHourlyStats === 'boolean' ? options.includeHourlyStats : true,
    maxDepsPerStop: Number.isFinite(options?.maxDepsPerStop) ? Math.max(1, options.maxDepsPerStop) : (effectiveTotal <= 10000 ? 120 : effectiveTotal <= 30000 ? 20 : 12),
    pathPts: Number.isFinite(options?.pathPts) ? Math.max(2, options.pathPts) : (effectiveTotal <= 10000 ? 500 : effectiveTotal <= 30000 ? 180 : 120),
    shapePts: Number.isFinite(options?.shapePts) ? Math.max(2, options.shapePts) : (effectiveTotal <= 10000 ? 350 : effectiveTotal <= 30000 ? 120 : 80),
    maxStops: Number.isFinite(options?.maxStops) ? Math.max(1, options.maxStops) : (effectiveTotal <= 10000 ? Infinity : effectiveTotal <= 30000 ? 20000 : 12000),
  };
}

function buildRuntimeEntries(tripMeta, tripStops, routeIds) {
  const routeIdSet = Array.isArray(routeIds) && routeIds.length ? new Set(routeIds) : null;
  return Object.entries(tripStops).filter(([tripId]) => {
    if (!routeIdSet) return true;
    const routeId = String(tripMeta?.[tripId]?.route_id || '').trim();
    return routeIdSet.has(routeId);
  });
}

// ── ANA İŞLEM FONKSİYONU ─────────────────────────────────
async function buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops, options = {}) {
  const nTRIPS         = [];
  const nSHAPES        = [];
  const nSTOPS         = [];
  const nSTOP_INFO     = {};
  const nSTOP_DEPS     = {};
  const nHOURLY_COUNTS = new Array(24).fill(0);
  const nHOURLY_HEAT   = {};
  const seenShapes     = new Set();

  const entries  = buildRuntimeEntries(tripMeta, tripStops, options?.routeIds);
  const total    = entries.length;
  let processed  = 0;

  const runtimeOpts = normalizeRuntimeBuildOptions(options, total);
  const TRIP_CAP = runtimeOpts.tripCap;
  const capped = TRIP_CAP < total;
  const includeStops = runtimeOpts.includeStops;
  const includeHourlyStats = runtimeOpts.includeHourlyStats;
  const MAX_DEPS_PER_STOP = runtimeOpts.maxDepsPerStop;
  const PATH_PTS = runtimeOpts.pathPts;
  const SHAPE_PTS = runtimeOpts.shapePts;
  const MAX_STOPS = runtimeOpts.maxStops;

  // Geçiş 1: tüm entry'leri tara, cap'ten bağımsız nSHAPES doldur
  for (const [tid, stops] of entries) {
    if (!stops.length) continue;
    const meta  = tripMeta[tid];
    const route = meta && routeMap[meta.route_id];
    if (!meta || !route) continue;

    const shapeKey = `${route.short}::${meta.shape_id || tid}::${meta.direction_id ?? 'x'}`;
    if (seenShapes.has(shapeKey)) continue;

    let rawPath = [];
    if (meta.shape_id && shapePts[meta.shape_id]?.length >= 2) {
      rawPath = shapePts[meta.shape_id];
    } else {
      stops.forEach(([, , sid]) => {
        const s = stopsMap[sid];
        if (s) rawPath.push([s[0], s[1]]);
      });
    }
    if (rawPath.length < 2) continue;

    seenShapes.add(shapeKey);
    nSHAPES.push({
      s:  route.short,
      t:  route.type,
      rid: meta.route_id,
      aid: route.agencyId || '',
      c:  route.color,
      p:  simplifyPathPoints(rawPath, SHAPE_PTS),
      ln: route.longName || '',
      dir: meta.direction_id,
      h:  meta.head || ''
    });
  }

  // Geçiş 2: trip cap'li animasyon verisi
  for (const [tid, stops] of entries) {
    if (nTRIPS.length >= TRIP_CAP) break;
    if (!stops.length) continue;
    const meta  = tripMeta[tid];
    const route = meta && routeMap[meta.route_id];
    if (!meta || !route) continue;

    let rawPath = [];
    if (meta.shape_id && shapePts[meta.shape_id]?.length >= 2) {
      rawPath = shapePts[meta.shape_id];
    } else {
      stops.forEach(([, , sid]) => {
        const s = stopsMap[sid];
        if (s) rawPath.push([s[0], s[1]]);
      });
    }
    if (rawPath.length < 2) continue;

    const path     = simplifyPathPoints(rawPath, PATH_PTS);
    const validDeps = stops.map(([, d]) => d).filter((d) => Number.isFinite(d));
    if (!validDeps.length) continue;
    const startSec  = validDeps[0];
    const endSec    = validDeps[validDeps.length - 1];
    const duration  = Math.max(endSec - startSec, 60);

    const cumD = [0];
    for (let j = 1; j < path.length; j++) {
      cumD.push(cumD[j - 1] + havMeters(path[j - 1], path[j]));
    }
    const totalD = cumD[cumD.length - 1] || 1;
    const ts = cumD.map((d) => Math.round(startSec + (d / totalD) * duration));

    const tripObj = {
      s:  route.short,
      t:  route.type,
      rid: meta.route_id,
      aid: route.agencyId || '',
      p:  path,
      ts,
      _tsPatched: true,
      d:  duration,
      c:  route.color,
      h:  meta.head || '',
      ln: route.longName || '',
      dir: meta.direction_id,
      st: includeStops ? stops.map(st => ({ sid: st[2], off: Number.isFinite(st[1]) ? st[1] - startSec : 0 })) : []
    };
    nTRIPS.push(tripObj);

    const actualTripIdx = nTRIPS.length - 1;
    stops.forEach(([, absSec, sid]) => {
      const s = stopsMap[sid];
      if (!s) return;
      if (!nSTOP_DEPS[sid]) nSTOP_DEPS[sid] = [];
      if (nSTOP_DEPS[sid].length < MAX_DEPS_PER_STOP) {
        nSTOP_DEPS[sid].push([actualTripIdx, absSec % 86400, route.short]);
      }
      nSTOP_INFO[sid] = nSTOP_INFO[sid] || [s[0], s[1], s[2]];
    });

    if (includeHourlyStats) {
      const hour = Math.floor(startSec / 3600) % 24;
      nHOURLY_COUNTS[hour]++;
      if (!nHOURLY_HEAT[String(hour)]) nHOURLY_HEAT[String(hour)] = [];
      if (nHOURLY_HEAT[String(hour)].length < 500) {
        nHOURLY_HEAT[String(hour)].push(path[0]);
      }
    }

    processed++;
    if (processed % 500 === 0) {
      self.postMessage({ type: 'progress', percent: Math.floor((processed / total) * 100) });
    }
  }

  // Populate nSTOP_INFO from full stopsMap so stops on capped-out trips are still visible
  Object.entries(stopsMap).forEach(([sid, s]) => {
    if (!nSTOP_INFO[sid]) nSTOP_INFO[sid] = [s[0], s[1], s[2]];
  });

  const allStops = [];
  Object.entries(nSTOP_INFO).forEach(([sid, [lon, lat, name]]) => {
    const src = stopsMap[sid];
    allStops.push([lon, lat, src ? (src[3] || sid) : sid, sid, name]);
  });
  // nSTOPS cap — dev şehirlerde transfer boyutunu sınırla
  const cappedStops = isFinite(MAX_STOPS) ? allStops.slice(0, MAX_STOPS) : allStops;
  cappedStops.forEach(s => nSTOPS.push(s));

  return { nTRIPS, nSHAPES, nSTOPS, nSTOP_INFO, nSTOP_DEPS, nHOURLY_COUNTS, nHOURLY_HEAT, capped, tripCap: TRIP_CAP, totalTrips: total };
}

// ── MESAJ DİNLEYİCİ ──────────────────────────────────────
self.onmessage = async (e) => {
  const { routeMap, shapePts, stopsMap, tripMeta, tripStops, options } = e.data;
  try {
    const result = await buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops, options);

    // Sonucu parçalar halinde gönder — tek büyük postMessage donmaya yol açıyor
    const CHUNK = 5000;
    const totalChunks = Math.ceil(result.nTRIPS.length / CHUNK);

    // Meta verileri önce gönder
    self.postMessage({ type: 'chunk_meta', totalChunks,
      nSHAPES: result.nSHAPES,
      nSTOPS: result.nSTOPS,
      nSTOP_INFO: result.nSTOP_INFO,
      nSTOP_DEPS: result.nSTOP_DEPS,
      nHOURLY_COUNTS: result.nHOURLY_COUNTS,
      nHOURLY_HEAT: result.nHOURLY_HEAT,
      capped: result.capped,
      tripCap: result.tripCap,
      totalTrips: result.totalTrips,
    });

    // Trips'i 5K'lık parçalar halinde gönder
    for (let i = 0; i < result.nTRIPS.length; i += CHUNK) {
      self.postMessage({ type: 'chunk_trips',
        trips: result.nTRIPS.slice(i, i + CHUNK),
        chunkIdx: Math.floor(i / CHUNK),
        totalChunks,
      });
      // Her chunk arasında kısa bekleme — UI thread'i nefes alsın
      await new Promise(r => setTimeout(r, 10));
    }

    self.postMessage({ type: 'result_done' });

  } catch (err) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
