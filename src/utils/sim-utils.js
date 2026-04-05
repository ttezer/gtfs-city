(function attachSimUtils(globalScope) {
  const HEADWAY_LIMITS = (globalScope.CONFIG && globalScope.CONFIG.HEADWAY) || {
    minPairDistanceM: 10,
    maxPairDistanceM: 15000,
    transitionDistanceM: 3000,
    minGapSeconds: 60,
    maxGapSeconds: 7200,
  };

  function secsToHHMM(s) {
    const h = Math.floor(s / 3600) % 24;
    const m = Math.floor((s % 3600) / 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function getPhase(secs) {
    const h = (secs / 3600) % 24;
    if (h < 5 || h >= 22) return 'night';
    if (h < 7) return 'dawn';
    if (h < 19) return 'day';
    return 'dusk';
  }

  function modDay(sec) {
    return ((sec % 86400) + 86400) % 86400;
  }

  function getTripRuntimeOffset(trip, time) {
    const dayTime = modDay(time);
    if (!(trip._tsPatched || (trip.ts && trip.ts[0] > 0))) {
      return time % Math.max(trip.d, 1);
    }
    if (trip.ts && trip.ts.length && trip.ts[trip.ts.length - 1] >= 86400 && dayTime < trip.ts[0]) {
      return dayTime + 86400;
    }
    return dayTime;
  }

  function getVehiclePos(trip, time) {
    // ts MUTLAK format (gün saniyesi, 0-86400 arası)
    // _tsPatched veya ts[0]>0 → mutlak → time % 86400
    // ts[0]===0 ve _tsPatched=false → rölatif → time % trip.d (fallback)
    const off = getTripRuntimeOffset(trip, time);
    const ts = trip.ts;
    const p = trip.p;

    if (off < ts[0] || off > ts[ts.length - 1]) return null;

    for (let i = 0; i < ts.length - 1; i++) {
      if (off >= ts[i] && off <= ts[i + 1]) {
        let f = 0;
        if (ts[i + 1] > ts[i]) {
          f = (off - ts[i]) / (ts[i + 1] - ts[i]);
        } else if (off >= ts[i + 1]) {
          f = 1;
        }
        return [
          p[i][0] + f * (p[i + 1][0] - p[i][0]),
          p[i][1] + f * (p[i + 1][1] - p[i][1]),
        ];
      }
    }

    return null;
  }

  function haversineM([lon1, lat1], [lon2, lat2]) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getTripProgressAtTime(trip, time) {
    const off = getTripRuntimeOffset(trip, time);
    const ts = trip.ts;
    const p = trip.p;

    if (!ts?.length || !p?.length) return null;
    if (off < ts[0] || off > ts[ts.length - 1]) return null;

    const total = Math.max(ts[ts.length - 1] - ts[0], 1);
    for (let i = 0; i < ts.length - 1; i++) {
      if (off >= ts[i] && off <= ts[i + 1]) {
        const seg = ts[i + 1] - ts[i];
        const f = seg > 0 ? (off - ts[i]) / seg : 0;
        return Math.max(0, Math.min(1, (ts[i] - ts[0] + f * seg) / total));
      }
    }

    return null;
  }

  function computeAverageHeadwaySeconds(deps, limits) {
    const cfg = limits || HEADWAY_LIMITS;
    if (!deps?.length) return null;

    const offsets = [...new Set(
      deps
        .map((dep) => Math.round(dep[1]))
        .filter(Number.isFinite)
    )].sort((a, b) => a - b);

    if (offsets.length < 2) return null;

    const gaps = [];
    for (let i = 1; i < offsets.length; i++) {
      const gap = offsets[i] - offsets[i - 1];
      if (gap >= cfg.minGapSeconds && gap <= cfg.maxGapSeconds) gaps.push(gap);
    }

    const wrapGap = offsets[0] + 86400 - offsets[offsets.length - 1];
    if (wrapGap >= cfg.minGapSeconds && wrapGap <= cfg.maxGapSeconds) gaps.push(wrapGap);

    if (!gaps.length) return null;
    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  function computeDynamicHeadwaySeconds(deps, currentSec, limits, options) {
    const cfg = limits || HEADWAY_LIMITS;
    const opts = options || {};
    if (!deps?.length || !Number.isFinite(currentSec)) return null;

    const offsets = [...new Set(
      deps
        .map((dep) => Math.round(dep[1]))
        .filter(Number.isFinite)
    )].sort((a, b) => a - b);

    if (offsets.length < 2) return null;

    const daySec = modDay(currentSec);
    const windowSeconds = Math.max(opts.windowSeconds || 10800, cfg.minGapSeconds * 2);
    const nearbyGapLimit = Math.max(1, opts.maxNearbyGaps || 6);
    const rangeStart = daySec - windowSeconds / 2;
    const rangeEnd = daySec + windowSeconds / 2;
    const expanded = offsets.map((v) => v - 86400).concat(offsets, offsets.map((v) => v + 86400));

    const localGaps = [];
    const nearbyGaps = [];

    for (let i = 1; i < expanded.length; i++) {
      const prev = expanded[i - 1];
      const next = expanded[i];
      const gap = next - prev;
      if (gap < cfg.minGapSeconds || gap > cfg.maxGapSeconds) continue;

      const intersectsWindow = next >= rangeStart && prev <= rangeEnd;
      const distToWindow = prev > rangeEnd
        ? prev - rangeEnd
        : next < rangeStart
          ? rangeStart - next
          : 0;

      if (intersectsWindow) localGaps.push(gap);
      nearbyGaps.push({ gap, distToWindow });
    }

    if (localGaps.length) {
      return localGaps.reduce((sum, gap) => sum + gap, 0) / localGaps.length;
    }

    nearbyGaps.sort((a, b) => a.distToWindow - b.distToWindow);
    const fallback = nearbyGaps.slice(0, nearbyGapLimit).map((entry) => entry.gap);
    if (!fallback.length) return null;
    return fallback.reduce((sum, gap) => sum + gap, 0) / fallback.length;
  }

  const api = {
    HEADWAY_LIMITS,
    haversineM,
    modDay,
    secsToHHMM,
    getPhase,
    getTripRuntimeOffset,
    getVehiclePos,
    getTripProgressAtTime,
    computeAverageHeadwaySeconds,
    computeDynamicHeadwaySeconds,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.SimUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
