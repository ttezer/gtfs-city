(function attachSimUtils(globalScope) {
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

  function getVehiclePos(trip, time) {
    const off = time % Math.max(trip.d, 1);
    const ts = trip.ts;
    const p = trip.p;

    if (off < ts[0] || off > ts[ts.length - 1]) return null;

    for (let i = 0; i < ts.length - 1; i++) {
      if (off >= ts[i] && off <= ts[i + 1]) {
        const f = ts[i + 1] > ts[i] ? (off - ts[i]) / (ts[i + 1] - ts[i]) : 0;
        return [
          p[i][0] + f * (p[i + 1][0] - p[i][0]),
          p[i][1] + f * (p[i + 1][1] - p[i][1]),
        ];
      }
    }

    return null;
  }

  const api = { secsToHHMM, getPhase, getVehiclePos };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.SimUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
