(function attachGtfsUtils(globalScope) {

  // SPRINT 2: parseCsvRows buraya taşındı.
  // Önce: script.js'de tanımlı, parseGtfsTables'a parametre olarak geçiriliyordu.
  // Sonra: GtfsUtils.parseCsvRows olarak export ediliyor.
  //        parseGtfsTables artık dışarıdan parser almak zorunda değil (geriye dönük uyumlu).
  //        gtfs-validator.js de artık bu implementasyonu kullanıyor (quoted-comma desteği var).
  function parseCsvRows(txt) {
    const lines = txt.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (!lines.length) return [];
    const hdr = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
    return lines.slice(1).map(l => {
      const vals = [];
      let cur = '', inQ = false;
      for (const ch of l) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      vals.push(cur.trim());
      const obj = {};
      hdr.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"/, '').replace(/"$/, ''); });
      return obj;
    });
  }

  // SPRINT 2: parseCsvRows parametresi opsiyonel hale getirildi.
  // Eski çağrı: parseGtfsTables(files, parseCsvRows)  → hâlâ çalışır
  // Yeni çağrı: parseGtfsTables(files)                → kendi parseCsvRows'unu kullanır
  function parseGtfsTables(files, externalParseCsvRows) {
    const parse = externalParseCsvRows || parseCsvRows;
    // stop_times.txt Uint8Array ise string parse atlanır — buildTripStopsMapFromUint8 kullanılacak
    const stData = files['stop_times.txt'];
    const stRows = stData && !(stData instanceof Uint8Array) ? parse(stData) : [];
    return {
      agencyRows:       files['agency.txt']          ? parse(files['agency.txt'])          : [],
      routeRows:        files['routes.txt']         ? parse(files['routes.txt'])         : [],
      tripRows:         files['trips.txt']           ? parse(files['trips.txt'])           : [],
      stRows,
      stopRows:         files['stops.txt']           ? parse(files['stops.txt'])           : [],
      shapeRows:        files['shapes.txt']          ? parse(files['shapes.txt'])          : [],
      calendarRows:     files['calendar.txt']        ? parse(files['calendar.txt'])        : [],
      calendarDateRows: files['calendar_dates.txt']  ? parse(files['calendar_dates.txt'])  : [],
    };
  }

  function hhmmToSec(t) {
    if (!t) return null;
    const p = String(t).trim().split(':');
    if (p.length !== 3) return null;
    const h = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const s = parseInt(p[2], 10);
    if ([h, m, s].some((v) => Number.isNaN(v))) return null;
    return h * 3600 + m * 60 + s;
  }

  // SPRINT 5: havMeters ve simplifyPathPoints gtfs-math-utils.js'e taşındı.
  // Ana thread'de window.GtfsMathUtils üzerinden, Worker'da importScripts ile yükleniyor.
  // Fallback: GtfsMathUtils yoksa (test/node ortamı) kendi implementasyonu devreye girer.
  function havMeters(a, b) {
    if (globalScope && globalScope.GtfsMathUtils) return globalScope.GtfsMathUtils.havMeters(a, b);
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(x));
  }

  function simplifyPathPoints(pts, max) {
    if (globalScope && globalScope.GtfsMathUtils) return globalScope.GtfsMathUtils.simplifyPathPoints(pts, max);
    if (pts.length <= max) return pts;
    const step = pts.length / max;
    return Array.from({ length: max }, (_, i) => pts[Math.min(Math.floor(i * step), pts.length - 1)]);
  }

  function normalizeGtfsRouteType(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return '3';
    if (parsed >= 0 && parsed <= 7) return String(parsed);
    if (parsed === 11 || parsed === 12) return '3';
    if (parsed >= 100 && parsed < 200) return '2';
    if (parsed >= 200 && parsed < 300) return '3';
    if (parsed >= 400 && parsed < 500) return '1';
    if (parsed >= 700 && parsed < 900) return '3';
    if (parsed >= 900 && parsed < 1000) return '0';
    if (parsed >= 1000 && parsed < 1200) return '4';
    if (parsed >= 1300 && parsed < 1400) return '5';
    if (parsed >= 1400 && parsed < 1500) return '7';
    if (parsed >= 1500 && parsed < 1600) return '10';
    return '3';
  }

  function buildRouteMap(routeRows, getRouteColorRgb, typeMeta) {
    const fallback = [88, 166, 255];
    const routeMap = {};
    routeRows.forEach((r) => {
      const rid = (r.route_id || '').trim();
      if (!rid) return;
      const type = normalizeGtfsRouteType(r.route_type);
      const short = (r.route_short_name || r.route_long_name || rid).trim();
      const longName = (r.route_long_name || '').trim();
      routeMap[rid] = {
        routeId: rid,
        agencyId: (r.agency_id || '').trim(),
        short,
        type,
        color: getRouteColorRgb(short, type, typeMeta[type]?.rgb || fallback),
        longName,
      };
    });
    return routeMap;
  }

  function buildShapePoints(shapeRows) {
    const shapePts = {};
    shapeRows.forEach((s) => {
      const sid = (s.shape_id || '').trim();
      const lat = parseFloat(s.shape_pt_lat);
      const lon = parseFloat(s.shape_pt_lon);
      const seq = parseInt(s.shape_pt_sequence, 10) || 0;
      if (!sid || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (!shapePts[sid]) shapePts[sid] = [];
      shapePts[sid].push([lon, lat, seq]);
    });
    Object.keys(shapePts).forEach((sid) => {
      shapePts[sid].sort((a, b) => a[2] - b[2]);
      shapePts[sid] = shapePts[sid].map((p) => [p[0], p[1]]);
    });
    return shapePts;
  }

  function buildStopsMap(stopRows) {
    const stopsMap = {};
    stopRows.forEach((s) => {
      const sid = (s.stop_id || '').trim();
      const name = (s.stop_name || s.stop_desc || sid).trim();
      const code = (s.stop_code || sid).trim();
      const lat = parseFloat(s.stop_lat);
      const lon = parseFloat(s.stop_lon);
      if (sid && Number.isFinite(lat) && Number.isFinite(lon)) stopsMap[sid] = [lon, lat, name, code];
    });
    return stopsMap;
  }

  function buildTripMetaMap(tripRows) {
    const tripMeta = {};
    tripRows.forEach((t) => {
      const tid = (t.trip_id || '').trim();
      if (!tid) return;
      const parsedDirection = parseInt(t.direction_id, 10);
      tripMeta[tid] = {
        route_id:   (t.route_id   || '').trim(),
        shape_id:   (t.shape_id   || '').trim(),
        head:       (t.trip_headsign || '').trim(),
        service_id: (t.service_id || '').trim(),
        direction_id: Number.isFinite(parsedDirection) ? parsedDirection : null,
      };
    });
    return tripMeta;
  }

  function buildTripStopsMap(stRows) {
    const tripStops = {};
    stRows.forEach((st) => {
      const tid = (st.trip_id || '').trim();
      const dep = hhmmToSec(st.departure_time || st.arrival_time);
      const sid = (st.stop_id || '').trim();
      const seq = parseInt(st.stop_sequence, 10) || 0;
      if (!tid || dep === null || !sid) return;
      if (!tripStops[tid]) tripStops[tid] = [];
      tripStops[tid].push([seq, dep, sid]);
    });
    Object.keys(tripStops).forEach((tid) => tripStops[tid].sort((a, b) => a[0] - b[0]));
    return tripStops;
  }

  // Büyük stop_times.txt için streaming parser — string'e hiç çevirmeden Uint8Array üzerinden çalışır
  function buildTripStopsMapFromUint8(uint8) {
    const tripStops = {};
    const decoder = new TextDecoder('utf-8');
    const CHUNK = 2 * 1024 * 1024; // 2MB
    let remainder = '';
    let headers = null;
    let tripIdx = -1, depIdx = -1, arrIdx = -1, stopIdx = -1, seqIdx = -1;

    for (let offset = 0; offset <= uint8.length; offset += CHUNK) {
      const isLast = offset + CHUNK >= uint8.length;
      const chunk = offset < uint8.length
        ? decoder.decode(uint8.slice(offset, Math.min(offset + CHUNK, uint8.length)), { stream: !isLast })
        : '';
      const text = remainder + chunk;
      const lines = text.split('\n');
      remainder = isLast ? '' : lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Header satırı
        if (!headers) {
          headers = trimmed.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          tripIdx = headers.indexOf('trip_id');
          depIdx  = headers.indexOf('departure_time');
          arrIdx  = headers.indexOf('arrival_time');
          stopIdx = headers.indexOf('stop_id');
          seqIdx  = headers.indexOf('stop_sequence');
          continue;
        }
        // Basit split (quoted comma nadirdir stop_times'ta)
        const vals = trimmed.split(',');
        const tid = (vals[tripIdx] || '').trim().replace(/^"|"$/g, '');
        const depStr = (vals[depIdx] || vals[arrIdx] || '').trim().replace(/^"|"$/g, '');
        const sid = (vals[stopIdx] || '').trim().replace(/^"|"$/g, '');
        const seq = parseInt((vals[seqIdx] || '0'), 10) || 0;
        const dep = hhmmToSec(depStr);
        if (!tid || dep === null || !sid) continue;
        if (!tripStops[tid]) tripStops[tid] = [];
        tripStops[tid].push([seq, dep, sid]);
      }
    }
    Object.keys(tripStops).forEach((tid) => tripStops[tid].sort((a, b) => a[0] - b[0]));
    return tripStops;
  }

  function buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops, onProgress) {
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

    const TRIP_CAP = total <= 10000 ? Infinity : total <= 30000 ? 12000 : 15000;
    const includeStops = total <= 10000;
    const MAX_DEPS_PER_STOP = total <= 10000 ? 120 : total <= 30000 ? 20 : 12;
    const PATH_PTS = total <= 10000 ? 500 : total <= 30000 ? 180 : 120;
    const SHAPE_PTS = total <= 10000 ? 350 : total <= 30000 ? 120 : 80;
    const MAX_STOPS = total <= 10000 ? Infinity : total <= 30000 ? 20000 : 12000;
    let tripCount = 0;

    for (const [tid, stops] of entries) {
      if (tripCount >= TRIP_CAP) break;
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
      const ts = cumD.map((d) => Math.round(startSec + (d / totalD) * duration));

      const tripObj = {
        s:  route.short,
        t:  route.type,
        rid: meta.route_id,
        aid: route.agencyId || '',
        p:  path,
        ts,
        d:  duration,
        c:  route.color,
        h:  meta.head || '',
        ln: route.longName || '',
        dir: meta.direction_id,
        st: includeStops ? stops.map(st => ({ sid: st[2], off: st[1] })) : []
      };
      nTRIPS.push(tripObj);
      tripCount++;

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
      if (nHOURLY_HEAT[String(hour)].length < 500) nHOURLY_HEAT[String(hour)].push(path[0]);

      const shapeKey = `${route.short}::${meta.shape_id || tid}::${meta.direction_id ?? 'x'}`;
      if (!seenShapes.has(shapeKey)) {
        seenShapes.add(shapeKey);
        nSHAPES.push({
          s:  route.short,
          t:  route.type,
          rid: meta.route_id,
          aid: route.agencyId || '',
          c:  route.color,
          p:  simplifyPathPoints(path, SHAPE_PTS),
          ln: route.longName || '',
          dir: meta.direction_id,
          h: meta.head || ''
        });
      }

      processed++;
      if (onProgress && total) onProgress(Math.floor((processed / total) * 100));
    }

    const allStops = [];
    Object.entries(nSTOP_INFO).forEach(([sid, [lon, lat, name]]) => {
      const src = stopsMap[sid];
      allStops.push([lon, lat, src ? src[3] : sid, sid, name]);
    });
    const cappedStops = isFinite(MAX_STOPS) ? allStops.slice(0, MAX_STOPS) : allStops;
    cappedStops.forEach(s => nSTOPS.push(s));

    return { nTRIPS, nSHAPES, nSTOPS, nSTOP_INFO, nSTOP_DEPS, nHOURLY_COUNTS, nHOURLY_HEAT };
  }

  async function buildGtfsRuntimeDataAsync(routeMap, shapePts, stopsMap, tripMeta, tripStops, onProgress) {
    function toWindowsFilePath(urlLike) {
      try {
        return decodeURIComponent(String(urlLike || ''))
          .replace(/^file:\/\/\//i, '')
          .replace(/^\/([A-Za-z]:)/, '$1')
          .replace(/\//g, '\\');
      } catch (_) {
        return '';
      }
    }

    async function createGtfsWorker() {
      if (typeof Worker === 'undefined') return null;
if (location.protocol !== 'file:') return new Worker('src/runtime/gtfs-worker.js');
      if (window.electronAPI?.readGTFSFile) {
        try {
          const basePath = toWindowsFilePath(window.location.href || window.location.pathname || '');
          const baseDir = basePath.replace(/\\index\.html?$/i, '');
          const [mathResult, workerResult] = await Promise.all([
      window.electronAPI.readGTFSFile(`${baseDir}\\src\\utils\\gtfs-math-utils.js`),
      window.electronAPI.readGTFSFile(`${baseDir}\\src\\runtime\\gtfs-worker.js`),
          ]);
          if (mathResult?.success && workerResult?.success) {
            const decoder = new TextDecoder('utf-8');
            const mathSource = decoder.decode(new Uint8Array(mathResult.buffer));
            const workerSource = decoder.decode(new Uint8Array(workerResult.buffer));
            const blob = new Blob(
              [
                `${mathSource}\n`,
                `self.GtfsMathUtils = self.GtfsMathUtils || globalThis.GtfsMathUtils;\n`,
                `${workerSource}`,
              ],
              { type: 'application/javascript' },
            );
            return new Worker(URL.createObjectURL(blob));
          }
        } catch (error) {
          console.warn('[GTFS] Electron worker kaynağı okunamadı, fallback moduna geçiliyor:', error);
        }
        return null;
      }
      return null;
    }

    async function createBlobWorkerFromFetch() {
      try {
        const [mathSource, workerSource] = await Promise.all([
      fetch('src/utils/gtfs-math-utils.js').then((res) => res.text()),
      fetch('src/runtime/gtfs-worker.js').then((res) => res.text()),
        ]);
        const blob = new Blob(
          [
            `${mathSource}\n`,
            `self.GtfsMathUtils = self.GtfsMathUtils || globalThis.GtfsMathUtils;\n`,
            `${workerSource}`,
          ],
          { type: 'application/javascript' },
        );
        return new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('[GTFS] Blob worker oluşturulamadı, fallback moduna geçiliyor:', error);
        return null;
      }
    }

    // ── WEB WORKER DESTEĞİ ─────────────────────────────────────
    let worker = await createGtfsWorker();
    if (!worker && location.protocol !== 'file:') {
      worker = await createBlobWorkerFromFetch();
    }
    if (worker) {
      try {
        return new Promise((resolve, reject) => {
          // Chunk birleştirici
          let accumulated = null;

          worker.onmessage = (e) => {
            const msg = e.data;

            if (msg.type === 'progress') {
              if (onProgress) onProgress(msg.percent);

            } else if (msg.type === 'chunk_meta') {
              // Meta veriyi al, trips için boş array hazırla
              accumulated = {
                nTRIPS: [],
                nSHAPES: msg.nSHAPES,
                nSTOPS: msg.nSTOPS,
                nSTOP_INFO: msg.nSTOP_INFO,
                nSTOP_DEPS: msg.nSTOP_DEPS,
                nHOURLY_COUNTS: msg.nHOURLY_COUNTS,
                nHOURLY_HEAT: msg.nHOURLY_HEAT,
                capped: msg.capped,
                tripCap: msg.tripCap,
                totalTrips: msg.totalTrips,
                totalChunks: msg.totalChunks,
              };

            } else if (msg.type === 'chunk_trips') {
              if (accumulated) {
                accumulated.nTRIPS.push(...msg.trips);
                // Progress güncelle
                const pct = 95 + Math.round((msg.chunkIdx + 1) / msg.totalChunks * 5);
                if (onProgress) onProgress(pct);
              }

            } else if (msg.type === 'result_done') {
              worker.terminate();
              resolve(accumulated);

            } else if (msg.type === 'result') {
              // Eski format geriye dönük uyumluluk
              worker.terminate();
              resolve(msg.data);

            } else if (msg.type === 'error') {
              worker.terminate();
              console.error('[GTFS Worker] Hata:', msg.error);
              reject(new Error(msg.error));
            }
          };

          worker.onerror = (err) => {
            worker.terminate();
            reject(err);
          };
          worker.postMessage({ routeMap, shapePts, stopsMap, tripMeta, tripStops });
        });
      } catch (e) {
        console.warn('[GTFS] Worker başlatılamadı, fallback moduna geçiliyor:', e);
      }
    }

    // ── FALLBACK (MAIN THREAD) ────────────────────────────────
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
    const BATCH_SIZE = 200;

    // Fallback cap — Worker çalışmadığında main thread'i OOM'dan koru
    const TRIP_CAP = total <= 10000 ? Infinity : total <= 30000 ? 12000 : 15000;
    const includeStops = total <= 10000;
    const MAX_DEPS_PER_STOP = total <= 10000 ? 120 : total <= 30000 ? 20 : 12;
    const PATH_PTS = total <= 10000 ? 500 : total <= 30000 ? 180 : 120;
    const SHAPE_PTS = total <= 10000 ? 350 : total <= 30000 ? 120 : 80;
    const MAX_STOPS = total <= 10000 ? Infinity : total <= 30000 ? 20000 : 12000;
    let tripCount = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (tripCount >= TRIP_CAP) break;
      const chunk = entries.slice(i, i + BATCH_SIZE);
      for (const [tid, stops] of chunk) {
        if (tripCount >= TRIP_CAP) break;
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
          rid: meta.route_id,
          aid: route.agencyId || '',
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
        tripCount++;

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
        if (nHOURLY_HEAT[String(hour)].length < 500) nHOURLY_HEAT[String(hour)].push(path[0]);

        const shapeKey = `${route.short}::${meta.shape_id || tid}::${meta.direction_id ?? 'x'}`;
        if (!seenShapes.has(shapeKey)) {
          seenShapes.add(shapeKey);
          nSHAPES.push({
            s:  route.short,
            t:  route.type,
            rid: meta.route_id,
            aid: route.agencyId || '',
            c:  route.color,
            p:  simplifyPathPoints(path, SHAPE_PTS),
            ln: route.longName || '',
            dir: meta.direction_id,
            h: meta.head || ''
          });
        }
      }

      processed += chunk.length;
      if (onProgress) onProgress(Math.floor((processed / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const allStops = [];
    Object.entries(nSTOP_INFO).forEach(([sid, [lon, lat, name]]) => {
      const src = stopsMap[sid];
      allStops.push([lon, lat, src ? src[3] : sid, sid, name]);
    });
    const cappedStops = isFinite(MAX_STOPS) ? allStops.slice(0, MAX_STOPS) : allStops;
    cappedStops.forEach(s => nSTOPS.push(s));

    return { nTRIPS, nSHAPES, nSTOPS, nSTOP_INFO, nSTOP_DEPS, nHOURLY_COUNTS, nHOURLY_HEAT };
  }

  const api = {
    parseCsvRows,
    parseGtfsTables,
    hhmmToSec,
    havMeters,
    simplifyPathPoints,
    normalizeGtfsRouteType,
    buildRouteMap,
    buildShapePoints,
    buildStopsMap,
    buildTripMetaMap,
    buildTripStopsMap,
    buildTripStopsMapFromUint8,
    buildGtfsRuntimeData,
    buildGtfsRuntimeDataAsync,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.GtfsUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
