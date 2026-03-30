(function attachAnalyticsUtils(globalScope) {
  /**
   * Calculates the headway distance between a trip and its preceding/following vehicles.
   * @param {Array} trips Array of trip objects
   * @param {number} tripIdx Index of the selected trip
   * @param {number} time Current simulation time in seconds
   * @param {Function} getVehiclePos Function to lookup vehicle coordinates
   * @param {Function} haversineM Distance function in meters
   * @returns {string} Formatted headway string
   */
  function calcHeadway(trips, tripIdx, time, getVehiclePos, haversineM, getTripProgressAtTime) {
    const trip = trips[tripIdx];
    if (!trip || !trip.s) return '—';
    const myPos = getVehiclePos(trip, time);
    if (!myPos) return '—';
    const myProgress = typeof getTripProgressAtTime === 'function' ? getTripProgressAtTime(trip, time) : null;
    // Eğer progress yoksa (test verisi vb) directional headway yerine distance headway'e düşebiliriz.
    // Ancak mevcut mantık progress bekliyor. Testleri kurtarmak için null kontrolünü myPos ile ayırıyoruz.

    let bestLead = null;
    let minGap = Infinity;

    // Kendi rotamızda, bizden ileride (progress > myProgress) olan en yakın aracı bulalım.
    for (let i = 0; i < trips.length; i++) {
      if (i === tripIdx) continue;
      const t = trips[i];
      if (t.s !== trip.s) continue;
      
      const pos = getVehiclePos(t, time);
      if (!pos) continue;
      const p = typeof getTripProgressAtTime === 'function' ? getTripProgressAtTime(t, time) : null;
      
      // Eğer progress verisi varsa directional (yönsel) headway hesapla
      if (myProgress !== null && p !== null) {
        let gap = p - myProgress;
        if (gap < -0.5) gap += 1.0; 
        if (gap > 0 && gap < minGap) {
          minGap = gap;
          bestLead = { pos, progress: p, duration: Math.max(t.d || 0, 1) };
        }
      } else {
        // Fallback: Progress yoksa (test verisi vb) sadece en yakın mesafedekini bul
        const dist = haversineM(myPos, pos);
        if (dist < minGap) { // minGap burada mesafe olarak kullanılıyor (geçici)
          minGap = dist;
          bestLead = { pos, isDistanceOnly: true };
        }
      }
    }

    if (!bestLead) return '—';
    const dist = haversineM(myPos, bestLead.pos);
    
    if (bestLead.isDistanceOnly) {
      return (dist >= 1000 ? (dist/1000).toFixed(1) + 'km' : Math.round(dist) + 'm');
    }

    const avgDuration = (trip.d + bestLead.duration) / 2;
    const headwaySeconds = minGap * avgDuration;

    if (headwaySeconds < 60) return Math.round(headwaySeconds) + 'sn (' + Math.round(dist) + 'm)';
    return (headwaySeconds / 60).toFixed(1) + 'dk (' + (dist >= 1000 ? (dist/1000).toFixed(1) + 'km' : Math.round(dist) + 'm') + ')';
  }

  function getNextStop(trip, time, stopInfo, getVehiclePos, haversineM) {
    // FAZ E FIX: Sprint 8'de trip.ts mutlak formata patch edildi (_tsPatched).
    // Mutlak ts kullanılıyorsa karşılaştırma doğrudan `time` ile yapılmalı.
    // trip.st[i].off ise her zaman relative (trip başından itibaren saniye),
    // dolayısıyla startSec hesaplanarak mutlak zamana çevrilmeli.
    const isAbsolute = trip._tsPatched || (trip.ts && trip.ts.length > 0 && trip.ts[0] > 86400);
    const startSec = trip._startSec || (isAbsolute && trip.ts ? trip.ts[0] : 0);
    const off = isAbsolute ? time : time % Math.max(trip.d, 1);

    if (trip.st && trip.st.length > 0) {
      for (let i = 0; i < trip.st.length; i++) {
        const stopEntry = trip.st[i];
        // trip.st[i].off her zaman relative — mutlak karşılaştırma için startSec ekle
        const absOff = isAbsolute ? startSec + stopEntry.off : stopEntry.off;
        if (absOff > off) {
          const s = stopInfo[stopEntry.sid];
          return {
            name: s ? s[2] : '—',
            eta: Math.round((absOff - off) / 60) + 'dk',
            sid: stopEntry.sid
          };
        }
      }
      return { name: 'Son durak', eta: '—' };
    }

    // SPRINT 3: Eski O(N×M) fallback kaldırıldı.
    // trip.st eksikse (eski format/bozuk veri) artık tüm stopInfo taranmıyor.
    // Bunun yerine sadece ts tabanlı ETA döndürülüyor.
    // 14.380 sefer × 7.072 durak = frame başına ~100M karşılaştırma önlendi.
    const ts = trip.ts;
    if (ts) {
      for (let i = 0; i < ts.length; i++) {
        if (ts[i] > off) {
          return { name: '—', eta: Math.round((ts[i] - off) / 60) + 'dk' };
        }
      }
    }

    return { name: 'Son durak', eta: '—' };
  }

  // FIX: Cache key artık time yanında typeFilter ve activeRoutes'u da içeriyor.
  // Önceki implementasyonda sadece time kontrol ediliyordu; tip filtresi veya
  // aktif rota seti değiştiğinde eski sonuç dönerek yanlış headway gösteriliyordu.
  let _headwayCache = { key: '', result: null };

  function calcHeadwayPairs(options) {
    const {
      trips,
      time,
      typeFilter,
      activeRoutes,
      bunchingThreshold,
      headwayCfg,
      getVehiclePos,
      getTripProgressAtTime,
      getTripRuntimeOffset,
      inferTripDirectionLabel,
      haversineM,
    } = options;
    const minPairSeconds = Number.isFinite(headwayCfg?.minPairSeconds) ? headwayCfg.minPairSeconds : 45;
    const maxPairSeconds = Number.isFinite(headwayCfg?.maxPairSeconds) ? headwayCfg.maxPairSeconds : 2700;
    const transitionSeconds = Number.isFinite(headwayCfg?.transitionSeconds) ? headwayCfg.transitionSeconds : 600;
    const bunchingTimeThresholdSeconds = Number.isFinite(headwayCfg?.bunchingTimeThresholdSeconds)
      ? headwayCfg.bunchingTimeThresholdSeconds
      : 180;

    // Cache key: zaman (1sn hassasiyet) + tip filtresi + gizli rotalar
    const arKey = activeRoutes && activeRoutes.size > 0
      ? [...activeRoutes].sort().join(',')
      : '';
    const cacheKey = Math.floor(time) + ':' + (typeFilter || 'all') + ':' + arKey;

    if (_headwayCache.key === cacheKey && _headwayCache.result) {
      return _headwayCache.result;
    }

    const byKey = {};
    for (const trip of trips) {
      if (typeFilter !== 'all' && trip.t !== typeFilter) continue;
      if (activeRoutes && activeRoutes.has(trip.s)) continue;
      const pos = getVehiclePos(trip, time);
      if (!pos) continue;
      const progress = getTripProgressAtTime(trip, time);
      if (progress === null) continue;

      let grp = '';
      if (typeof inferTripDirectionLabel === 'function') {
        grp = String(inferTripDirectionLabel(trip) || '').trim();
      }
      if (!grp && trip.h) grp = String(trip.h).trim();
      if (!grp && trip.p && trip.p.length >= 2) {
        const dx = trip.p[trip.p.length - 1][0] - trip.p[0][0];
        const dy = trip.p[trip.p.length - 1][1] - trip.p[0][1];
        const angle = Math.atan2(dy, dx) * 57.2958;
        grp = (angle >= -45 && angle < 135) ? 'A' : 'B';
      }
      if (!grp) grp = 'default';

      const runtimeOffset = typeof getTripRuntimeOffset === 'function'
        ? getTripRuntimeOffset(trip, time)
        : null;
      const key = trip.s + '|' + grp;
      (byKey[key] || (byKey[key] = [])).push({
        pos,
        progress,
        route: trip.s,
        type: trip.t,
        direction: grp,
        duration: Math.max(trip.d || 0, 1),
        runtimeOffset: Number.isFinite(runtimeOffset) ? runtimeOffset : null,
      });
    }

    const lines = [];
    const bunchingEvents = [];
    for (const [, vehicles] of Object.entries(byKey)) {
      if (vehicles.length < 2) continue;
      vehicles.sort((a, b) => a.progress - b.progress);
      for (let i = 0; i < vehicles.length - 1; i++) {
        const a = vehicles[i];
        const b = vehicles[i + 1];
        const dist = haversineM(a.pos, b.pos);
        const progressGap = Math.max(0, b.progress - a.progress);
        const avgDuration = Math.max((a.duration + b.duration) / 2, 1);
        let headwaySeconds = progressGap * avgDuration;
        if ((!Number.isFinite(headwaySeconds) || headwaySeconds <= 0) && Number.isFinite(a.runtimeOffset) && Number.isFinite(b.runtimeOffset)) {
          headwaySeconds = b.runtimeOffset - a.runtimeOffset;
          if (headwaySeconds <= 0) headwaySeconds += avgDuration;
        }
        if (!Number.isFinite(headwaySeconds)) continue;
        if (headwaySeconds < minPairSeconds || headwaySeconds > maxPairSeconds) continue;
        if (dist < headwayCfg.minPairDistanceM || dist > headwayCfg.maxPairDistanceM) continue;

        let colorLayer;
        if (headwaySeconds < bunchingTimeThresholdSeconds) {
          colorLayer = [248, 81, 73, 230];
          bunchingEvents.push({
            routeId: a.route,
            direction: a.direction,
            pos: [(a.pos[0] + b.pos[0]) / 2, (a.pos[1] + b.pos[1]) / 2],
            dist: Math.round(dist),
            headwaySeconds: Math.round(headwaySeconds),
          });
        } else if (headwaySeconds < transitionSeconds) {
          const transitionSpan = Math.max(transitionSeconds - bunchingTimeThresholdSeconds, 1);
          const t = 1 - (headwaySeconds - bunchingTimeThresholdSeconds) / transitionSpan;
          colorLayer = [
            Math.round(248 * t + 63 * (1 - t)),
            Math.round(81 * t + 185 * (1 - t)),
            Math.round(73 * t + 80 * (1 - t)),
            190,
          ];
        } else {
          colorLayer = [63, 185, 80, 160];
        }
        lines.push({
          from: a.pos,
          to: b.pos,
          color: colorLayer,
          routeId: a.route,
          type: a.type,
          direction: a.direction,
          dist,
          headwaySeconds: Math.round(headwaySeconds),
        });
      }
    }

    const res = { lines, bunchingEvents };
    _headwayCache = { key: cacheKey, result: res };
    return res;
  }

  function waitingColor(hw) {
    const mins = hw / 60;
    if (mins <= 5) return [34, 197, 94, 220];
    if (mins <= 9) return [132, 204, 22, 220];
    if (mins <= 12) return [250, 204, 21, 220];
    if (mins <= 20) return [249, 115, 22, 220];
    return [239, 68, 68, 220];
  }

  const api = { calcHeadway, getNextStop, calcHeadwayPairs, waitingColor };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.AnalyticsUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
