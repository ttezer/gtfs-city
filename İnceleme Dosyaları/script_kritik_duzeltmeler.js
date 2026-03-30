// ═══════════════════════════════════════════════════════════
// KRİTİK DÜZELTİMLER — script.js başına (ilk fonksiyonlardan önce) ekle
// Claude Kod İnceleme Raporu — Mart 2026
// ═══════════════════════════════════════════════════════════

// ── KH-001: captureRuntimeDataSnapshot ───────────────────
// Daha önce tanımsızdı → uygulama açılışta çöküyordu
function captureRuntimeDataSnapshot(existing) {
  return existing || {
    nTRIPS:         window.TRIPS         || [],
    nSHAPES:        window.SHAPES        || [],
    nSTOPS:         window.STOPS         || [],
    nSTOP_INFO:     window.STOP_INFO     || {},
    nSTOP_DEPS:     window.STOP_DEPS     || {},
    nHOURLY_COUNTS: window.HOURLY_COUNTS || new Array(24).fill(0),
    nHOURLY_HEAT:   window.HOURLY_HEAT   || {}
  };
}

// ── KH-002: getBuiltinGtfsPayload ────────────────────────
// Daha önce tanımsızdı → builtin şehirler (İstanbul) yüklenemiyordu
async function getBuiltinGtfsPayload(city) {
  if (!city || !city.gtfsZip) return null;
  try {
    // Electron: native fs
    if (window.IS_ELECTRON && window.electronAPI?.readDataFile) {
      const buffer = await window.electronAPI.readDataFile(city.gtfsZip);
      if (buffer) return { files: await parseZipBuffer(buffer), fileName: city.gtfsZip };
    }
    // Web: fetch
    const response = await fetch(city.gtfsZip);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return { files: await parseZipBuffer(buffer), fileName: city.gtfsZip };
  } catch (err) {
    console.warn('[getBuiltinGtfsPayload] yüklenemedi:', city.gtfsZip, err);
    return null;
  }
}

async function parseZipBuffer(buffer) {
  if (!window.JSZip) throw new Error('JSZip yüklü değil');
  const zip = await JSZip.loadAsync(buffer);
  const files = {};
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith('.txt')) {
      files[name.split('/').pop()] = await zip.files[name].async('string');
    }
  }
  return files;
}

// ── KH-003: ADJ komşuluk listesi + rota planlama ────────
// ADJ hiç doldurulmuyordu → Dijkstra her zaman "Rota bulunamadı" diyordu
window.ADJ = {};

function buildAdjacencyList() {
  window.ADJ = {};
  let edgeCount = 0;
  for (const [, deps] of Object.entries(window.STOP_DEPS || {})) {
    for (const [tripIdx, , routeShort] of deps) {
      const trip = (window.TRIPS || [])[tripIdx];
      if (!trip || !trip.p || !trip.ts) continue;
      for (let i = 0; i < trip.ts.length - 1; i++) {
        const fromSid = findStopIdByPos(trip.p[i]);
        const toSid   = findStopIdByPos(trip.p[i + 1]);
        if (!fromSid || !toSid || fromSid === toSid) continue;
        const travelSecs = Math.max(trip.ts[i + 1] - trip.ts[i], 60);
        if (!window.ADJ[fromSid]) window.ADJ[fromSid] = [];
        // Aynı kenar zaten varsa ekleme (de-dup)
        const exists = window.ADJ[fromSid].some(e => e[0] === toSid && e[2] === (routeShort || trip.s));
        if (!exists) {
          window.ADJ[fromSid].push([toSid, travelSecs, routeShort || trip.s]);
          edgeCount++;
        }
      }
    }
  }
  console.log(`[ADJ] ${Object.keys(window.ADJ).length} düğüm, ${edgeCount} kenar oluşturuldu`);
}

// Pozisyona göre en yakın stop ID'sini bul (ADJ inşası için)
function findStopIdByPos(pos) {
  if (!pos) return null;
  const stopInfo = window.STOP_INFO || {};
  for (const [sid, info] of Object.entries(stopInfo)) {
    if (Math.abs(info[0] - pos[0]) < 0.0003 && Math.abs(info[1] - pos[1]) < 0.0003) return sid;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// MEVCUT applyGtfsRuntimeData SONUNA EKLE:
// buildAdjacencyList() çağrısı
//
// Mevcut fonksiyonun sonuna şunu ekle:
//   if(runtimeData.nSTOP_DEPS && Object.keys(runtimeData.nSTOP_DEPS).length) {
//     setTimeout(buildAdjacencyList, 200); // veri atandıktan sonra async inşa et
//   }
// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// KH-004: confirmGtfsImport — async düzeltmesi
// Mevcut confirmGtfsImport fonksiyonunu aşağıdakiyle DEĞİŞTİR:
// ═══════════════════════════════════════════════════════════

async function confirmGtfsImport_FIXED() {
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

  // KH-004 düzeltmesi: await kullan
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

// Orijinal confirmGtfsImport fonksiyonunu bu ile değiştir
// ya da fonksiyon sonunda şunu yap:
// document.addEventListener('click', ev => {
//   if (ev.target?.id === 'btn-gtfs-confirm') confirmGtfsImport_FIXED();
//   ...
// });


// ═══════════════════════════════════════════════════════════
// KH-005: loadGtfsIntoSim içindeki yanlış değişken adları
// Aşağıdaki satırları bul ve düzelt:
//
// YANLIŞ:  window.showTrips = true;
// DOĞRU:   showAnim = true;
//
// YANLIŞ:  window.showStops = false;
// DOĞRU:   showStops = false;
//
// YANLIŞ:  window.showDensity = false;
// DOĞRU:   showDensity = false;
//
// YANLIŞ:  window.showWaiting = false;
// DOĞRU:   showWaiting = false;
//
// YANLIŞ:  window.showShapes = true;
// DOĞRU:   showPaths = true;
//
// Sil:     const togTrips = document.getElementById('tog-trips'); if(togTrips) togTrips.checked = true;
//          (tog-trips ID'li element HTML'de yok)
// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// PI-001: updateDensityGrid — frame döngüsünden çıkar
//
// animate() fonksiyonundan şu satırı SİL:
//   if(window._animFrame%3===0) { ... updateDensityGrid(); ... }
//
// applyGtfsRuntimeData() sonuna ekle:
//   updateDensityGrid();
// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// PI-002: detectRendezvous önbelleği
// Dosyanın başına (STATE bölümüne) ekle:
// ═══════════════════════════════════════════════════════════
let _rendezvousCache = null;
let _rendezvousCacheTime = -1;

function detectRendezvous_CACHED(time) {
  const roundedTime = Math.floor(time / 10) * 10; // 10sn hassasiyet
  if (_rendezvousCache && roundedTime === _rendezvousCacheTime) {
    return _rendezvousCache;
  }
  _rendezvousCacheTime = roundedTime;
  _rendezvousCache = detectRendezvousOriginal(time);
  return _rendezvousCache;
}
// buildLayers() içinde detectRendezvous(time) → detectRendezvous_CACHED(time) ile değiştir
// applyGtfsRuntimeData() içine şunu ekle: _rendezvousCache = null; _rendezvousCacheTime = -1;


// ═══════════════════════════════════════════════════════════
// PI-003: Icon cache sıfırlama
// applyGtfsRuntimeData() başına ekle:
// ═══════════════════════════════════════════════════════════
function clearIconCaches() {
  Object.keys(VEHICLE_ICON_CACHE).forEach(k => delete VEHICLE_ICON_CACHE[k]);
  Object.keys(STOP_ICON_CACHE).forEach(k => delete STOP_ICON_CACHE[k]);
}
// applyGtfsRuntimeData() ilk satırına: clearIconCaches();
