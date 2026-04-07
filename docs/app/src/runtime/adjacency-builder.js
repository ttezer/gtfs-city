window.AdjacencyBuilder = (function () {
  const WALK_MAX_M = 400;
  const WALK_SPEED = 1.3;
  const GRID_SIZE = 0.004;

  function haversineM(a, b) {
    return window.SimUtils ? window.SimUtils.haversineM(a, b) : _haversineM(a, b);
  }

  function _haversineM([lon1, lat1], [lon2, lat2]) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function build(trips, stopDeps, stopInfo) {
    const adj = {};
    const tripStops = {};

    for (const [sid, deps] of Object.entries(stopDeps || {})) {
      for (const [tripIdx, offsetSec, routeShort] of deps) {
        if (!trips[tripIdx]) continue;
        if (!tripStops[tripIdx]) tripStops[tripIdx] = [];
        tripStops[tripIdx].push({ sid, offsetSec, routeShort: routeShort || trips[tripIdx].s });
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
        if (ex) { if (secs < ex[1]) ex[1] = secs; }
        else adjMap[from].set(key, [to, secs, line]);
      }
    }
    for (const k in adjMap) {
      adj[k] = [...adjMap[k].values()];
    }

    // Yürüme bağlantıları — 400m içindeki duraklar arası (~5 dk, 1.3 m/s)
    const stopEntries = Object.entries(stopInfo || {});
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
            if (!adj[sidA]) adj[sidA] = [];
            if (!adj[sidA].some(e => e[0] === sidB && e[2] === '🚶')) {
              adj[sidA].push([sidB, walkSecs, '🚶']);
              walkCount++;
            }
          }
        }
      }
    }
    console.log('[ADJ] Yürüme bağlantısı eklendi:', walkCount);
    return adj;
  }

  return { build };
})();
