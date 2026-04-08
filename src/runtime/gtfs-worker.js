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

// ── ANA İŞLEM FONKSİYONU ─────────────────────────────────
async function buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops) {
  const nTRIPS         = [];
  const nSHAPES        = [];
  const nSTOPS         = [];
  const nSTOP_INFO     = {};
  const nSTOP_DEPS     = {};
  const nHOURLY_COUNTS = new Array(24).fill(0);
  const nHOURLY_HEAT   = {};
  const seenShapes     = new Set();

  const entries  = Object.entries(tripStops);
  const total    = entries.length;
  let processed  = 0;

  // Daha agresif cap — transfer boyutunu kontrol altında tut
  // ≤30K: sınırsız | 30K-100K: 25K | 100K+: 30K
  const TRIP_CAP = total <= 30000 ? Infinity : total <= 100000 ? 25000 : 30000;
  const capped = TRIP_CAP < total;
  // Büyük veri setlerinde st (durak listesi) dahil edilmez
  const includeStops = total <= 30000;
  // nSTOP_DEPS per durak limiti
  const MAX_DEPS_PER_STOP = total <= 30000 ? 200 : 30;
  // Path nokta sayısı — yüksek değerler = detaylı çizgi, çok yüksek = WebGL crash
  const PATH_PTS = total <= 30000 ? 800 : total <= 100000 ? 400 : 200;
  const SHAPE_PTS = total <= 30000 ? 600 : total <= 100000 ? 300 : 150;
  // nSTOPS cap — Berlin'de 670K durak var, hepsini transfer etme
  const MAX_STOPS = total <= 30000 ? Infinity : 40000;

  for (const [tid, stops] of entries) {
    if (nTRIPS.length >= TRIP_CAP) break; // cap'e ulaşıldı
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
    const startSec = stops[0][1];
    const endSec   = stops[stops.length - 1][1];
    const duration = Math.max(endSec - startSec, 60);

    const cumD = [0];
    for (let j = 1; j < path.length; j++) {
      cumD.push(cumD[j - 1] + havMeters(path[j - 1], path[j]));
    }
    const totalD = cumD[cumD.length - 1] || 1;
    const ts = cumD.map((d) => Math.round((startSec + (d / totalD) * duration) % 86400));

    const tripObj = {
      s:  route.short,
      t:  route.type,
      p:  path,
      ts,
      d:  duration,
      c:  route.color,
      h:  meta.head || '',
      ln: route.longName || '',
      dir: meta.direction_id,
      st: includeStops ? stops.map(st => ({ sid: st[2], off: st[1] % 86400 })) : []
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

    const hour = Math.floor(startSec / 3600) % 24;
    nHOURLY_COUNTS[hour]++;
    if (!nHOURLY_HEAT[String(hour)]) nHOURLY_HEAT[String(hour)] = [];
    if (nHOURLY_HEAT[String(hour)].length < 500) {
      nHOURLY_HEAT[String(hour)].push(path[0]);
    }

    const shapeKey = `${route.short}::${meta.shape_id || tid}::${meta.direction_id ?? 'x'}`;
    if (!seenShapes.has(shapeKey)) {
      seenShapes.add(shapeKey);
      nSHAPES.push({
        s:  route.short,
        t:  route.type,
        c:  route.color,
        p:  simplifyPathPoints(path, SHAPE_PTS),
        ln: route.longName || '',
        dir: meta.direction_id,
        h: meta.head || ''
      });
    }

    processed++;
    if (processed % 500 === 0) {
      self.postMessage({ type: 'progress', percent: Math.floor((processed / total) * 100) });
    }
  }

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
  const { routeMap, shapePts, stopsMap, tripMeta, tripStops } = e.data;
  try {
    const result = await buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops);

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
