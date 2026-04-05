/* ═══════════════════════════════════════════════════════════
   gtfs-math-utils.js  —  Geometri ve Yol Yardımcıları
   ═══════════════════════════════════════════════════════════
   Tek kaynak ilkesi (ADR-004):
   - Ana thread:  window.GtfsMathUtils
   - Web Worker:  importScripts('gtfs-math-utils.js') → globalThis.GtfsMathUtils
   - Node/test:   module.exports (fallback)

   Dışa açılan fonksiyonlar:
     havMeters(a, b)                → iki [lon,lat] arası metre
     simplifyPathPoints(pts, max)   → Douglas-Peucker ile path sadeleştirme
     interpolatePoint(a, b, t)      → iki nokta arası t∈[0,1] interpolasyon
     pathLengthM(pts)               → path toplam uzunluğu (metre)
     snapToPath(point, pts)         → en yakın path segmentine snap
   ═══════════════════════════════════════════════════════════ */

(function attachGtfsMathUtils(globalScope) {

  // ── HAVERSINE MESAFESİ ────────────────────────────────────
  function havMeters([lon1, lat1], [lon2, lat2]) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const a = sinDLat * sinDLat +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      sinDLon * sinDLon;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── İKİ NOKTA ARASI İNTERPOLASYON ───────────────────────
  function interpolatePoint([lon1, lat1], [lon2, lat2], t) {
    return [
      lon1 + (lon2 - lon1) * t,
      lat1 + (lat2 - lat1) * t,
    ];
  }

  // ── PATH TOPLAM UZUNLUĞU ─────────────────────────────────
  function pathLengthM(pts) {
    if (!pts || pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += havMeters(pts[i], pts[i + 1]);
    }
    return total;
  }

  // ── DOUGLAS-PEUCKER PATH SADELEŞTİRME ───────────────────
  function simplifyPathPoints(pts, max) {
    if (!pts || pts.length <= 2) return pts || [];
    max = max || 200;
    if (pts.length <= max) return pts;
    const ratio = pts.length / max;
    const epsilonM = Math.min(5 + ratio * 10, 80);
    const result = _douglasPeucker(pts, epsilonM);
    if (result.length > max) return _douglasPeuckerFixed(pts, max);
    return result;
  }

  function _pointToSegmentDistM(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return havMeters(p, a);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
    const proj = [a[0] + t * dx, a[1] + t * dy];
    return havMeters(p, proj);
  }

  function _douglasPeucker(pts, epsilonM) {
    if (pts.length <= 2) return pts.slice();
    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = _pointToSegmentDistM(pts[i], pts[0], pts[pts.length - 1]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilonM) {
      const left  = _douglasPeucker(pts.slice(0, maxIdx + 1), epsilonM);
      const right = _douglasPeucker(pts.slice(maxIdx), epsilonM);
      return left.slice(0, -1).concat(right);
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function _douglasPeuckerFixed(pts, targetCount) {
    let lo = 0, hi = 100000;
    let best = pts.slice();
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      const simplified = _douglasPeucker(pts, mid);
      if (simplified.length >= targetCount) { best = simplified; lo = mid; }
      else { hi = mid; }
      if (Math.abs(simplified.length - targetCount) <= 2) break;
    }
    return best;
  }

  // ── EN YAKIN PATH SEGMENT'İNE SNAP ──────────────────────
  function snapToPath(point, pts) {
    if (!pts || pts.length < 2) return { point, segmentIdx: 0, t: 0, distM: 0 };
    let bestDist = Infinity, bestIdx = 0, bestT = 0, bestPt = pts[0];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const lenSq = dx * dx + dy * dy;
      let t = 0;
      if (lenSq > 0) {
        t = Math.max(0, Math.min(1,
          ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq
        ));
      }
      const proj = [a[0] + t * dx, a[1] + t * dy];
      const d = havMeters(point, proj);
      if (d < bestDist) { bestDist = d; bestIdx = i; bestT = t; bestPt = proj; }
    }
    return { point: bestPt, segmentIdx: bestIdx, t: bestT, distM: bestDist };
  }

  // ── API ───────────────────────────────────────────────────
  const api = { havMeters, simplifyPathPoints, interpolatePoint, pathLengthM, snapToPath };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.GtfsMathUtils = api;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
