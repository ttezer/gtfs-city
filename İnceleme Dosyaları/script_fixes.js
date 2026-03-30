/* ═══════════════════════════════════════════════════════════
   SCRIPT.JS KRİTİK DÜZELTMELER
   Bu fonksiyonlar script.js'in başına (SABITLER bloğundan önce) eklenmelidir.
   ═══════════════════════════════════════════════════════════ */

// ── FIX-1: captureRuntimeDataSnapshot ────────────────────
// Mevcut global veri durumunun anlık görüntüsünü alır.
// baseRuntimeData ve şehir geçişlerinde kullanılır.
function captureRuntimeDataSnapshot(existing) {
  if (existing) return existing;
  return {
    nTRIPS:         window.TRIPS         || [],
    nSHAPES:        window.SHAPES        || [],
    nSTOPS:         window.STOPS         || [],
    nSTOP_INFO:     window.STOP_INFO     || {},
    nSTOP_DEPS:     window.STOP_DEPS     || {},
    nHOURLY_COUNTS: window.HOURLY_COUNTS || new Array(24).fill(0),
    nHOURLY_HEAT:   window.HOURLY_HEAT   || {},
  };
}

// ── FIX-2: getBuiltinGtfsPayload ─────────────────────────
// Electron ortamında yerel Data/ klasöründen, web ortamında
// fetch ile builtin GTFS zip dosyasını getirir.
async function getBuiltinGtfsPayload(city) {
  if (!city || !city.gtfsZip) return null;

  // Electron: native fs üzerinden oku
  if (window.IS_ELECTRON && window.electronAPI?.readGtfsZip) {
    try {
      const buffer = await window.electronAPI.readGtfsZip(city.gtfsZip);
      if (buffer) {
        const zip = await JSZip.loadAsync(buffer);
        const files = {};
        for (const [name, entry] of Object.entries(zip.files)) {
          if (name.endsWith('.txt')) {
            files[name.split('/').pop()] = await entry.async('string');
          }
        }
        return { files, fileName: city.gtfsZip.split('/').pop() };
      }
    } catch (err) {
      console.warn('[getBuiltinGtfsPayload] Electron okuma hatası:', err);
    }
  }

  // Web: fetch ile getir
  try {
    const res = await fetch(city.gtfsZip);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const files = {};
    for (const [name, entry] of Object.entries(zip.files)) {
      if (name.endsWith('.txt')) {
        files[name.split('/').pop()] = await entry.async('string');
      }
    }
    return { files, fileName: city.gtfsZip.split('/').pop() };
  } catch (err) {
    console.warn('[getBuiltinGtfsPayload] Fetch hatası:', city.gtfsZip, err);
    return null;
  }
}

// ── FIX-3: buildAdjacencyList ────────────────────────────
// Dijkstra rota planlaması için STOP_DEPS + TRIPS'ten
// komşuluk listesi (ADJ) oluşturur.
// applyGtfsRuntimeData() sonunda çağrılmalıdır.
let ADJ = {};

function buildAdjacencyList() {
  ADJ = {};
  const tripStopSequences = {};

  // Her trip için duraklarını ve zamanlarını topla
  for (const [sid, deps] of Object.entries(STOP_DEPS)) {
    for (const [tripIdx, offsetSec, routeShort] of deps) {
      const trip = TRIPS[tripIdx];
      if (!trip) continue;
      const key = tripIdx;
      if (!tripStopSequences[key]) tripStopSequences[key] = [];
      tripStopSequences[key].push({ sid, offsetSec, routeShort: routeShort || trip.s });
    }
  }

  // Her trip'in durak sırasını zamana göre sırala ve bağlantılar oluştur
  for (const [, stops] of Object.entries(tripStopSequences)) {
    stops.sort((a, b) => a.offsetSec - b.offsetSec);
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i].sid;
      const to   = stops[i + 1].sid;
      const secs = Math.max(stops[i + 1].offsetSec - stops[i].offsetSec, 30);
      const line = stops[i].routeShort;
      if (!from || !to) continue;
      if (!ADJ[from]) ADJ[from] = [];
      // Aynı bağlantıyı daha hızlısıyla güncelle
      const existing = ADJ[from].find(e => e[0] === to && e[2] === line);
      if (existing) {
        if (secs < existing[1]) existing[1] = secs;
      } else {
        ADJ[from].push([to, secs, line]);
      }
    }
  }
  console.log(`[ADJ] ${Object.keys(ADJ).length} durak bağlantısı oluşturuldu.`);
}

// ── FIX-4: applyGtfsRuntimeData içine ADJ çağrısı ────────
// Mevcut applyGtfsRuntimeData fonksiyonuna şunu ekle:
//
//   buildAdjacencyList(); // ← stopNames atamalarından sonra
//
// Satır konumu: window.stopNames = stopNames; satırından hemen sonra.

// ── FIX-5: updateDensityGrid'i frame döngüsünden çıkar ───
// animate() içindeki şu satırı kaldır:
//   if(window._animFrame%3===0){ ... updateDensityGrid(); ... }
//
// Ve applyGtfsRuntimeData() sonuna ekle:
//   updateDensityGrid();
//
// Böylece sadece yeni veri yüklendiğinde hesaplanır.

// ── FIX-6: confirmGtfsImport → async düzeltmesi ──────────
// Mevcut confirmGtfsImport fonksiyonunu şununla değiştir:
async function confirmGtfsImport() {
  const row = document.getElementById('gtfs-confirm-row');
  if (!window._lastGtfsFiles || !window._lastGtfsFileName) {
    if (row) row.innerHTML = '<div style="color:#f85149;padding:8px;font-size:12px;">Önce bir GTFS dosyası seç.</div>';
    return;
  }
  if (row) row.innerHTML = '<div style="text-align:center;color:#58a6ff;font-size:12px;padding:8px 0;">Yükleniyor...</div>';

  const meta = buildUploadedCityMeta(window._lastGtfsFiles, window._lastGtfsFileName);
  if (!meta) {
    if (row) row.innerHTML = '<div style="color:#f85149;padding:8px;font-size:12px;">Şehir bilgisi çıkarılamadı.</div>';
    return;
  }

  uploadedGtfsCities.set(meta.id, { files: window._lastGtfsFiles, fileName: window._lastGtfsFileName });
  CITIES.push(meta);
  buildCityList();

  // ← DÜZELTME: await ile async sonucu bekle
  const ok = await loadGtfsIntoSim(window._lastGtfsFiles, window._lastGtfsFileName);

  if (!ok) {
    uploadedGtfsCities.delete(meta.id);
    const idx = CITIES.findIndex(c => c.id === meta.id);
    if (idx >= 0) CITIES.splice(idx, 1);
    buildCityList();
    const detail = lastGtfsLoadError ? `<br>${lastGtfsLoadError}` : '';
    if (row) row.innerHTML = `<div style="color:#f85149;padding:8px;font-size:12px;">GTFS simülasyona yüklenemedi.${detail}</div>`;
    return;
  }

  activeCity = meta;
  buildCityList();
  if (row) row.innerHTML = '<div style="text-align:center;color:#3fb950;font-size:13px;font-weight:700;padding:8px 0;">✅ Şehir eklendi ve yüklendi</div>';
  setTimeout(() => closeGTFSModal(), 900);
}

// ── FIX-7: window.showTrips yanlış değişken adı ──────────
// loadGtfsIntoSim() içindeki şu satırları değiştir:
//
//   YANLIŞ:  window.showTrips = true;
//   DOĞRU:   showAnim = true;
//
//   YANLIŞ:  window.showShapes = true;
//   DOĞRU:   showPaths = true;          (bu değişken zaten var)
//
//   YANLIŞ:  window.showDensity = false;
//   DOĞRU:   showDensity = false;       (global ref yeterli)

// ── FIX-8: VEHICLE_ICON_CACHE temizleme ──────────────────
// applyGtfsRuntimeData() başına ekle:
//
//   Object.keys(VEHICLE_ICON_CACHE).forEach(k => delete VEHICLE_ICON_CACHE[k]);
//   Object.keys(STOP_ICON_CACHE).forEach(k => delete STOP_ICON_CACHE[k]);
