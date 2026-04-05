(function attachGtfsValidator(globalScope) {
  /**
   * Performs deep validation on GTFS files.
   * @param {Object} files Map of filename -> content string
   * @returns {Object} Validation report { ok: boolean, errors: Array, warnings: Array, stats: Object }
   *
   * SPRINT 2 DEĞİŞİKLİKLERİ:
   * - hhmmToSec: artık globalScope.GtfsUtils.hhmmToSec kullanıyor.
   *   Validator bağımsız yüklenirse (test/node ortamı) kendi fallback'i devreye girer.
   * - parse(): artık globalScope.GtfsUtils.parseCsvRows kullanıyor.
   *   Fallback: orijinal basit inline parser korundu (headers'ta quoting yok).
   *   Not: GtfsUtils.parseCsvRows quoted-comma destekler, bu fallback desteklemez.
   *   Production'da GtfsUtils her zaman önce yükleneceğinden fallback nadiren çalışır.
   */

  // Zaman dönüştürücü — GtfsUtils mevcutsa onu kullan, yoksa kendi implementasyonu
  function _hhmmToSec(t) {
    if (globalScope && globalScope.GtfsUtils && globalScope.GtfsUtils.hhmmToSec) {
      return globalScope.GtfsUtils.hhmmToSec(t);
    }
    // Fallback (bağımsız ortam / test için)
    if (!t) return null;
    const p = String(t).trim().split(':');
    if (p.length < 2) return null;
    const h = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const s = parseInt(p[2] || '0', 10);
    if ([h, m, s].some(v => Number.isNaN(v))) return null;
    return h * 3600 + m * 60 + s;
  }

  // CSV satır ayrıştırıcı — GtfsUtils mevcutsa onu kullan (quoted-comma desteği var)
  function _parseCsv(csv) {
    if (!csv) return [];
    // Uint8Array ise parse etme — streaming parser ayrıca kullanılıyor
    if (typeof csv !== 'string') return [];
    if (globalScope && globalScope.GtfsUtils && globalScope.GtfsUtils.parseCsvRows) {
      return globalScope.GtfsUtils.parseCsvRows(csv);
    }
    // Fallback: basit implementasyon (quoted-comma desteklemez)
    const lines = csv.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = parts[i]; });
      return obj;
    });
  }

  function validateGtfs(files) {
    const report = {
      ok: true,
      errors: [],
      warnings: [],
      stats: {
        routes: 0,
        trips: 0,
        stops: 0,
        stopTimes: 0,
      }
    };

    const logError = (code, message, details = '') => {
      report.errors.push({ code, message, details });
      report.ok = false;
    };

    const logWarning = (code, message, details = '') => {
      report.warnings.push({ code, message, details });
    };

    // 1. Zorunlu dosya kontrolü
    const required = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
    for (const f of required) {
      if (!files[f]) {
        logError('MISSING_FILE', `Zorunlu dosya eksik: ${f}`);
        return report;
      }
    }

    const routes   = _parseCsv(files['routes.txt']);
    const trips    = _parseCsv(files['trips.txt']);
    const stops    = _parseCsv(files['stops.txt']);
    // stop_times Uint8Array ise validasyon atlanır, streaming parser ile işleniyor
    const stopTimes = _parseCsv(files['stop_times.txt']);

    report.stats.routes    = routes.length;
    report.stats.trips     = trips.length;
    report.stats.stops     = stops.length;
    report.stats.stopTimes = stopTimes.length || (files['stop_times.txt'] instanceof Uint8Array ? -1 : 0);

    // 2. Durak doğrulama
    const stopIds = new Set();
    stops.forEach((s, idx) => {
      if (!s.stop_id) {
        logError('INVALID_STOP', `Durak ID eksik (Satır ${idx + 2})`);
      } else {
        stopIds.add(s.stop_id);
      }

      const lat = parseFloat(s.stop_lat);
      const lon = parseFloat(s.stop_lon);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        logError('INVALID_COORD', `Geçersiz enlem: ${s.stop_lat} (Stop: ${s.stop_id})`);
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        logError('INVALID_COORD', `Geçersiz boylam: ${s.stop_lon} (Stop: ${s.stop_id})`);
      }
    });

    // 3. Sefer ve hat doğrulama
    const routeIds = new Set(routes.map(r => r.route_id));
    const tripIds  = new Set();
    trips.forEach(t => {
      if (!routeIds.has(t.route_id)) {
        logError('ORPHAN_TRIP', `Geçersiz route_id: ${t.route_id} (Trip: ${t.trip_id})`);
      }
      tripIds.add(t.trip_id);
    });

    // 4. Durak zamanları — kronoloji doğrulama
    const tripSequences = {};
    stopTimes.forEach(st => {
      if (!tripIds.has(st.trip_id)) return;
      if (!stopIds.has(st.stop_id)) {
        logError('INVALID_STOP_REF', `Tanımsız durak referansı: ${st.stop_id} (Trip: ${st.trip_id})`);
      }

      if (!tripSequences[st.trip_id]) tripSequences[st.trip_id] = [];
      const arr = _hhmmToSec(st.arrival_time);
      const dep = _hhmmToSec(st.departure_time);
      const seq = parseInt(st.stop_sequence, 10);
      tripSequences[st.trip_id].push({ seq, arr, dep });
    });

    Object.entries(tripSequences).forEach(([tid, sequences]) => {
      sequences.sort((a, b) => a.seq - b.seq);
      for (let i = 0; i < sequences.length - 1; i++) {
        const cur  = sequences[i];
        const next = sequences[i + 1];
        if (cur.dep !== null && next.arr !== null && next.arr < cur.dep) {
          logError('TIME_REVERSAL', `Zaman kayması: Varış kalkıştan önce! (Trip: ${tid}, Seq: ${next.seq})`);
        }
        if (cur.arr !== null && cur.dep !== null && cur.dep < cur.arr) {
          logWarning('NEGATIVE_DWELL', `Durakta bekleme negatif: ${tid}, Seq: ${cur.seq}`);
        }
      }
    });

    return report;
  }

  const api = { validateGtfs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.GtfsValidator = api;
})(typeof window !== 'undefined' ? window : globalThis);
