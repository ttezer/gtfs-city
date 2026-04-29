window.DataManager = (function () {
  let gtfsLoadingLock = false;
  let initialized = false;

  function getCtx() {
    return window.LegacyDataBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setHidden(id, hidden) {
    getElement(id)?.classList.toggle('hidden', hidden);
  }

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function getLoaderElements() {
    return {
      overlay: getElement('loading-overlay'),
      progressBar: getElement('loader-progress-bar'),
      percentText: getElement('loader-percent'),
      fileList: getElement('loader-file-list'),
      loaderText: document.querySelector('.loader-text'),
    };
  }

  function isLandingVisible() {
    return !getElement('landing-page')?.classList.contains('hidden');
  }

  function updateLandingLoadingState(pct, label, counts = {}) {
    window.AppManager?.setLandingUploadState?.({
      loading: true,
      pct,
      label,
      routeCount: counts.routeCount,
      tripCount: counts.tripCount,
      stopCount: counts.stopCount,
    });
  }

  function localizedUploadLabel(key, fallback, uppercase = false) {
    const text = translate(key, fallback);
    return uppercase ? text.toLocaleUpperCase(window.I18n?.getLanguage?.() === 'en' ? 'en-US' : 'tr-TR') : text;
  }

  function normalizeCityKey(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9ığüşöç]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getGtfsConfirmRow() {
    return getElement('gtfs-confirm-row');
  }

  function renderGtfsConfirmRow(messageHtml = '', visible = false) {
    const row = getGtfsConfirmRow();
    if (!row) return;
    row.innerHTML = messageHtml || `
      <button id="btn-gtfs-confirm" style="flex:1;background:rgba(63,185,80,0.15);color:#3fb950;border:1px solid rgba(63,185,80,0.4);border-radius:6px;padding:8px 0;font-size:13px;font-weight:700;cursor:pointer;">✓ ${translate('gtfsConfirmImport', 'Sisteme Al')}</button>
      <button id="btn-gtfs-cancel" style="flex:1;background:rgba(248,81,73,0.1);color:#f85149;border:1px solid rgba(248,81,73,0.3);border-radius:6px;padding:8px 0;font-size:13px;cursor:pointer;">✕ ${translate('cancel', 'İptal')}</button>
    `;
    row.classList.toggle('hidden', !visible);
    row.style.display = visible ? 'flex' : 'none';
  }

  function resetGTFSModalState() {
    getElement('gtfs-drop-zone')?.classList.remove('hidden');
    setHidden('gtfs-progress-wrap', true);
    const progressBar = getElement('gtfs-progress-bar');
    if (progressBar) progressBar.style.width = '0%';
    const validationWrap = getElement('gtfs-validation-wrap');
    if (validationWrap) {
      validationWrap.classList.add('hidden');
      validationWrap.innerHTML = '';
    }
    renderGtfsConfirmRow();
    const ctx = getCtx();
    ctx?.setLastGtfsFiles(null);
    ctx?.setLastGtfsFileName('');
    const fileInput = getElement('gtfs-file-input');
    if (fileInput) fileInput.value = '';
  }

  function openGTFSModal() {
    resetGTFSModalState();
    getElement('gtfs-modal')?.classList.remove('hidden');
  }

  function closeGTFSModal() {
    resetGTFSModalState();
    getElement('gtfs-modal')?.classList.add('hidden');
  }

  function showToast(msg, type = 'info') {
    const normalizedType = type === 'warning' ? 'warn' : type;
    let container = getElement('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${normalizedType}`;
    const icon = normalizedType === 'warn'
      ? '⚠️'
      : normalizedType === 'error'
        ? '❌'
        : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 6500);
  }

  function gtfsProgress(msg, pct) {
    const wrap = getElement('gtfs-progress-wrap');
    const zone = getElement('gtfs-drop-zone');
    const message = getElement('gtfs-progress-msg');
    const bar = getElement('gtfs-progress-bar');
    if (wrap) wrap.classList.remove('hidden');
    if (zone) zone.classList.add('hidden');
    if (message) message.textContent = msg;
    if (bar) bar.style.width = `${pct}%`;
  }

  function gtfsValidate(files) {
    if (!window.GtfsValidator) return { errors: [], warnings: [], info: [] };
    const report = window.GtfsValidator.validateGtfs(files);
    const errors = (report.errors || []).map((entry) => ({
      file: entry.code,
      msg: entry.message + (entry.details ? ` (${entry.details})` : ''),
      sev: 'ERROR',
    }));
    const warnings = (report.warnings || []).map((entry) => ({
      file: entry.code,
      msg: entry.message + (entry.details ? ` (${entry.details})` : ''),
      sev: 'WARNING',
    }));
    const info = [{
      file: 'STATS',
      msg: `${report.stats.routes} hat, ${report.stats.trips} sefer, ${report.stats.stops} durak bulundu.`,
      sev: 'INFO',
    }];
    return { errors, warnings, info };
  }

  function exportReportJSON(report, fileName) {
    const ctx = getCtx();
    const data = {
      file: fileName,
      generated: new Date().toISOString(),
      summary: {
        errors: report.errors.length,
        warnings: report.warnings.length,
        info: report.info.length,
      },
      items: [...report.errors, ...report.warnings, ...report.info],
      runtimeErrors: ctx?.gtfsErrorLog || [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = fileName.replace('.zip', '_validation.json');
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function showValidationReport(report, fileName) {
    const wrap = getElement('gtfs-validation-wrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    const all = [...report.errors, ...report.warnings, ...report.info];
    const errCount = report.errors.length;
    const warnCount = report.warnings.length;
    const status = errCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'ok';
    const statusText = {
      error: translate('gtfsReportStatusError', '⚠️ Hatalar Tespit Edildi - Yine de Sisteme Alındı'),
      warn: translate('gtfsReportStatusWarn', '⚠️ Uyarılar Var - Sisteme Alındı'),
      ok: translate('gtfsReportStatusOk', '✅ Geçerli GTFS - Sisteme Alındı'),
    }[status];
    wrap.innerHTML = `
      <div class="gtfs-report-header" data-status="${status}"><span>${statusText}</span><span class="gtfs-file-name">${fileName}</span></div>
      <div class="gtfs-notice">${translate('gtfsReportNotice', 'ℹ {errors} hata ve {warnings} uyarı tespit edildi. Simülasyon mevcut verilerle çalışmaya devam ediyor.').replace('{errors}', String(errCount)).replace('{warnings}', String(warnCount))}</div>
      <div class="gtfs-report-body">${all.map((entry) => `<div class="gr-row gr-${entry.sev.toLowerCase()}"><span class="gr-sev">${entry.sev}</span><span class="gr-file">${entry.file}</span><span class="gr-msg">${entry.msg}</span></div>`).join('')}</div>
      <div class="gtfs-report-footer"><span>${translate('gtfsReportFooter', '{errors} hata - {warnings} uyarı - {info} bilgi').replace('{errors}', String(errCount)).replace('{warnings}', String(warnCount)).replace('{info}', String(report.info.length))}</span><button class="gtfs-export-btn" id="btn-export-json">${translate('gtfsExportJson', '⬇ JSON Rapor')}</button></div>`;
    getElement('btn-export-json')?.addEventListener('click', () => exportReportJSON(report, fileName));
  }

  function decodeZipText(uint8) {
    if (!(uint8 instanceof Uint8Array)) return '';
    const tryDecode = (label) => {
      try {
        return new TextDecoder(label).decode(uint8);
      } catch (_) {
        return '';
      }
    };
    const utf8 = tryDecode('utf-8');
    if (utf8 && !utf8.includes('�')) return utf8;
    return tryDecode('windows-1254') || utf8 || '';
  }

  function normalizeIncomingZip(source) {
    if (!source) return null;
    if (source instanceof File) {
      return { name: source.name, payload: source };
    }
    if (source.buffer) {
      return { name: source.name || 'download.zip', payload: new Uint8Array(source.buffer) };
    }
    return null;
  }

  function deriveZipNameFromUrl(url, fallback = 'download.zip') {
    try {
      const pathname = new URL(url).pathname || '';
      const rawName = pathname.split('/').pop() || fallback;
      return /\.zip$/i.test(rawName) ? rawName : `${rawName || 'download'}.zip`;
    } catch (_) {
      return fallback;
    }
  }

  function resolveFilePathFromUrl(input) {
    try {
      const parsed = new URL(String(input || ''), window.location.href);
      if (parsed.protocol !== 'file:') return '';
      let pathname = decodeURIComponent(parsed.pathname || '');
      if (/^\/[A-Za-z]:\//.test(pathname)) pathname = pathname.slice(1);
      return pathname.replace(/\//g, '\\');
    } catch (_) {
      return '';
    }
  }

  async function handleGTFSFile(file) {
    const ctx = getCtx();
    const landingUpload = isLandingVisible();
    const normalized = normalizeIncomingZip(file);
    if (!normalized) {
      showToast(translate('gtfsSourceUnreadable', 'GTFS ZIP kaynağı okunamadı.'), 'error');
      return;
    }
    if (!window.JSZip) {
      alert(translate('gtfsJsZipMissing', 'JSZip kütüphanesi yüklenemedi.'));
      return;
    }
    const LARGE_FILE_BYTES = 150 * 1024 * 1024;
    const fileBytes = normalized.payload instanceof File ? normalized.payload.size : (normalized.payload?.byteLength || 0);
    if (fileBytes >= LARGE_FILE_BYTES) {
      const mb = Math.round(fileBytes / 1024 / 1024);
      const ok = window.confirm(
        `⚠️ Büyük GTFS dosyası: ${mb} MB\n\nBu boyuttaki beslemeler yüksek bellek ve GPU kullanımı gerektirir; uygulama yanıt vermeyebilir veya çökebilir.\n\nDevam etmek istiyor musun?`
      );
      if (!ok) {
        window.AppManager?.setLandingUploadState?.({ loading: false });
        return;
      }
    }
    if (!landingUpload) gtfsProgress(translate('loadingZipOpening', 'ZIP açılıyor...'), 5);
    if (landingUpload) updateLandingLoadingState(5, localizedUploadLabel('loadingZipOpeningShort', 'ZIP AÇILIYOR'));
    try {
      const zip = await JSZip.loadAsync(normalized.payload);
      if (!landingUpload) gtfsProgress(translate('loadingFilesReading', 'Dosyalar okunuyor...'), 25);
      if (landingUpload) updateLandingLoadingState(25, localizedUploadLabel('loadingFilesReadingShort', 'DOSYALAR OKUNUYOR'));
      const files = {};
      const names = Object.keys(zip.files);
      let index = 0;
      for (const name of names) {
        const entry = zip.files[name];
        if (entry.dir) continue;
        const bare = name.split('/').pop();
        if (!bare) continue;
        const normalized = bare.replace(/\.csv$/i, '.txt');
        if (!normalized.endsWith('.txt')) continue;
        const raw = await entry.async('uint8array');
        files[normalized] = normalized === 'stop_times.txt'
          ? raw
          : decodeZipText(raw);
        index++;
        if (!landingUpload) gtfsProgress(translate('loadingFileReading', '{file} okunuyor...').replace('{file}', normalized), 25 + Math.min(50, index * 8));
        if (landingUpload) updateLandingLoadingState(25 + Math.min(50, index * 8), `${normalized.toUpperCase()} ${localizedUploadLabel('loadingFilesReadingShort', 'OKUNUYOR', true)}`);
      }
      if (!landingUpload) gtfsProgress(translate('loadingValidation', 'Validasyon yapılıyor...'), 80);
      if (landingUpload) updateLandingLoadingState(80, localizedUploadLabel('loadingValidationShort', 'VALIDASYON YAPILIYOR'));
      const report = gtfsValidate(files);
      ctx?.setLastGtfsFiles(files);
      ctx?.setLastGtfsFileName(normalized.name);
      ctx?.setGtfsReport(report);
      const stopRows = files['stops.txt'] ? ctx.parseCsvRows(files['stops.txt']) : [];
      const routeRows = files['routes.txt'] ? ctx.parseCsvRows(files['routes.txt']) : [];
      const tripRows = files['trips.txt'] ? ctx.parseCsvRows(files['trips.txt']) : [];
      if (!landingUpload) gtfsProgress(localizedUploadLabel('loadingReadyShort', 'Tamamlandı.'), 100);
      if (landingUpload) {
        updateLandingLoadingState(100, localizedUploadLabel('loadingDataImportingShort', 'VERİ YÜKLENİYOR'), {
          routeCount: routeRows.length,
          tripCount: tripRows.length,
          stopCount: stopRows.length,
        });
        await confirmGtfsImport({ openMap: false, closeModal: false, showValidation: false });
      } else {
        setTimeout(() => {
          setHidden('gtfs-progress-wrap', true);
          showValidationReport(report, normalized.name);
          renderGtfsConfirmRow('', true);
        }, 400);
      }
    } catch (error) {
      if (!landingUpload) gtfsProgress(translate('gtfsZipParseError', 'ZIP parse hatası: {message}').replace('{message}', error.message), 0);
      window.AppManager?.setLandingUploadState?.({ loading: false });
      console.error('GTFS parse hatası:', error);
    }
  }

  async function handleGTFSLocalPath(pathValue, options = {}) {
    const rawPath = String(pathValue || '').trim();
    if (!rawPath) {
      showToast(translate('gtfsSourceUnreadable', 'GTFS ZIP kaynağı okunamadı.'), 'error');
      return;
    }
    let filePath = rawPath;
    if (/^file:/i.test(rawPath)) {
      filePath = resolveFilePathFromUrl(rawPath);
    }
    try {
      const result = await window.electronAPI?.readGTFSFile?.(filePath);
      if (!result?.success) {
        window.AppManager?.setLandingUploadState?.({ loading: false });
        showToast(result?.error || translate('gtfsSourceUnreadable', 'GTFS ZIP kaynağı okunamadı.'), 'error');
        return;
      }
      if (!result.name) result.name = options?.fileName || filePath.split(/[\\/]/).pop() || 'dataset.zip';
      updateLandingLoadingState(20, localizedUploadLabel('loadingZipDownloadedShort', 'ZIP İNDİRİLDİ'));
      await handleGTFSFile(result);
    } catch (error) {
      window.AppManager?.setLandingUploadState?.({ loading: false });
      showToast(error?.message || translate('gtfsSourceUnreadable', 'GTFS ZIP kaynağı okunamadı.'), 'error');
    }
  }

  async function handleGTFSUrl(urlValue, options = {}) {
    const rawUrl = typeof urlValue === 'string' ? urlValue : (getElement('lp-gtfs-url')?.value || '');
    const inputUrl = String(rawUrl || '').trim();
    if (!inputUrl) {
      showToast(translate('gtfsEnterHttpsUrl', 'Önce HTTPS GTFS ZIP linki gir.'), 'warn');
      return;
    }
    let url = inputUrl;
    if (window.IS_ELECTRON) {
      if (!/^https:\/\//i.test(url)) {
        showToast(translate('gtfsOnlyHttpsAllowed', 'Yalnızca HTTPS GTFS ZIP linklerine izin verilir.'), 'error');
        return;
      }
    } else {
      try {
        url = new URL(inputUrl, window.location.href).toString();
      } catch (_) {
        showToast(translate('gtfsOnlyHttpsAllowed', 'Yalnızca HTTPS GTFS ZIP linklerine izin verilir.'), 'error');
        return;
      }
      if (!/^https:\/\//i.test(url)) {
        showToast(translate('gtfsOnlyHttpsAllowed', 'Yalnızca HTTPS GTFS ZIP linklerine izin verilir.'), 'error');
        return;
      }
    }
    const fileName = options?.fileName || deriveZipNameFromUrl(url);
    if (window.electronAPI?.downloadGTFSFromUrl) {
      updateLandingLoadingState(5, localizedUploadLabel('loadingLinkCheckingShort', 'LİNK DOĞRULANIYOR'));
      const result = await window.electronAPI.downloadGTFSFromUrl(url);
      if (!result?.success) {
        window.AppManager?.setLandingUploadState?.({ loading: false });
        showToast(result?.error || translate('gtfsUrlDownloadFailed', 'GTFS ZIP linki indirilemedi.'), 'error');
        return;
      }
      if (!result.name) result.name = fileName;
      updateLandingLoadingState(20, localizedUploadLabel('loadingZipDownloadedShort', 'ZIP İNDİRİLDİ'));
      await handleGTFSFile(result);
      return;
    }
    updateLandingLoadingState(5, localizedUploadLabel('loadingLinkCheckingShort', 'LİNK DOĞRULANIYOR'));
    try {
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
      const buffer = await response.arrayBuffer();
      updateLandingLoadingState(20, localizedUploadLabel('loadingZipDownloadedShort', 'ZIP İNDİRİLDİ'));
      await handleGTFSFile({ name: fileName, buffer });
    } catch (error) {
      window.AppManager?.setLandingUploadState?.({ loading: false });
      showToast(error?.message || translate('gtfsUrlDownloadFailed', 'GTFS ZIP linki indirilemedi.'), 'error');
    }
  }

  function buildUploadedCityMeta(files, zipFileName) {
    const ctx = getCtx();
    const stopRows = files['stops.txt'] ? ctx.parseCsvRows(files['stops.txt']) : [];
    if (!stopRows.length) return null;
    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;
    let stopCount = 0;
    stopRows.forEach((stop) => {
      const lat = parseFloat(stop.stop_lat);
      const lon = parseFloat(stop.stop_lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        stopCount++;
      }
    });
    if (!stopCount) return null;
    const tripCount = Math.max(0, ((files['trips.txt']?.trim().split('\n').length) || 1) - 1);
    const center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
    const rawName = (zipFileName || 'gtfs').replace(/\.zip$/i, '').replace(/[_-]/g, ' ');
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      id: `gtfs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      flag: '📂',
      center,
      zoom: 12,
      pitch: 50,
      bearing: 0,
      dataFiles: [],
      note: `${tripCount.toLocaleString('tr-TR')} sefer · ${stopCount.toLocaleString('tr-TR')} durak`,
      source: 'upload',
    };
  }

  function patchTripsAbsoluteTime(trips, stopDeps) {
    if (!trips) return;
    const tripStart = new Float64Array(trips.length).fill(Infinity);
    if (stopDeps) {
      for (const deps of Object.values(stopDeps)) {
        for (const [tripIdx, offsetSec] of deps) {
          if (tripIdx < trips.length && offsetSec < tripStart[tripIdx]) tripStart[tripIdx] = offsetSec;
        }
      }
    }

    let patched = 0;
    let skipped = 0;
    for (let index = 0; index < trips.length; index++) {
      const trip = trips[index];
      if (trip._tsPatched || !trip.ts || trip.ts[0] !== 0) continue;

      let startSec = Infinity;
      if (Number.isFinite(tripStart[index]) && tripStart[index] >= 0) {
        startSec = tripStart[index];
      }
      if (!Number.isFinite(startSec) && typeof trip.bs === 'number' && trip.bs >= 0) startSec = trip.bs;
      if (!Number.isFinite(startSec) && Array.isArray(trip.st) && trip.st.length > 0 && typeof trip.st[0]?.off === 'number' && trip.st[0].off >= 0) {
        startSec = trip.st[0].off;
      }
      if (!Number.isFinite(startSec)) {
        skipped++;
        continue;
      }

      for (let offset = 0; offset < trip.ts.length; offset++) {
        trip.ts[offset] += startSec;
      }
      trip.d = Math.max(trip.ts[trip.ts.length - 1] - trip.ts[0], 60);
      trip._startSec = startSec;
      trip._tsPatched = true;
      patched++;
    }
    console.log(`[patchTrips] ${patched} patch edildi, ${skipped} atlandı (start_time yok)`);
  }

  function attachStopSequencesFromDeps(trips, stopDeps) {
    if (!Array.isArray(trips) || !stopDeps) return;
    const byTrip = new Map();
    for (const [sid, deps] of Object.entries(stopDeps)) {
      for (const [tripIdx, offsetSec] of deps || []) {
        if (!Number.isInteger(tripIdx) || !Number.isFinite(offsetSec) || !trips[tripIdx]) continue;
        let tripStops = byTrip.get(tripIdx);
        if (!tripStops) {
          tripStops = [];
          byTrip.set(tripIdx, tripStops);
        }
        tripStops.push({ sid, off: offsetSec });
      }
    }

    byTrip.forEach((tripStops, tripIdx) => {
      const trip = trips[tripIdx];
      if (!trip || (Array.isArray(trip.st) && trip.st.length)) return;
      const startSec = Number.isFinite(trip._startSec)
        ? trip._startSec
        : (Array.isArray(trip.ts) && trip.ts.length ? trip.ts[0] : 0);
      const normalized = tripStops
        .sort((left, right) => left.off - right.off)
        .map((entry, index) => ({
          sid: entry.sid,
          off: Math.max(0, index === 0 ? 0 : entry.off - startSec),
        }))
        .filter((entry, index, list) => index === 0 || entry.sid !== list[index - 1].sid || entry.off !== list[index - 1].off);
      if (normalized.length) trip.st = normalized;
    });
  }

  function normalizeTripStopOffsets(trips) {
    if (!Array.isArray(trips)) return;
    trips.forEach((trip) => {
      if (!trip || !Array.isArray(trip.st) || !trip.st.length) return;
      const startSec = Number.isFinite(trip._startSec)
        ? trip._startSec
        : (Array.isArray(trip.ts) && trip.ts.length ? trip.ts[0] : 0);
      const looksAbsolute = trip.st.some((entry) => Number.isFinite(entry?.off) && entry.off > Math.max(trip.d || 0, 0) + 120);
      if (!looksAbsolute) return;
      trip.st = trip.st.map((entry) => ({
        sid: entry.sid,
        off: Math.max(0, (entry.off || 0) - startSec),
      }));
    });
  }

  function normalizeRuntimeTextData(runtimeData, displayText) {
    if (!runtimeData || typeof displayText !== 'function') return;
    const normalize = (value) => displayText(value || '');
    (runtimeData.nTRIPS || []).forEach((trip) => {
      if (!trip) return;
      trip.s = normalize(trip.s);
      trip.h = normalize(trip.h);
      trip.ln = normalize(trip.ln);
    });
    (runtimeData.nSHAPES || []).forEach((shape) => {
      if (!shape) return;
      shape.s = normalize(shape.s);
      shape.ln = normalize(shape.ln);
    });
    Object.entries(runtimeData.nSTOP_INFO || {}).forEach(([sid, info]) => {
      if (!Array.isArray(info)) return;
      if (typeof info[2] === 'string') info[2] = normalize(info[2]);
      if (typeof info[3] === 'string') info[3] = normalize(info[3]);
    });
    (runtimeData.nSTOPS || []).forEach((stop) => {
      if (!Array.isArray(stop)) return;
      if (typeof stop[2] === 'string') stop[2] = normalize(stop[2]);
      if (typeof stop[3] === 'string') stop[3] = normalize(stop[3]);
      if (typeof stop[4] === 'string') stop[4] = normalize(stop[4]);
    });
  }

  function applyGtfsRuntimeData(runtimeData) {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.setStaticLayerKey('');
    ctx.clearIconCaches();
    window.PlannerManager?.reset?.();
    normalizeRuntimeTextData(runtimeData, ctx.displayText);

    ctx.setRuntimeCollections?.(runtimeData);

    patchTripsAbsoluteTime(ctx.getTrips(), ctx.getStopDeps());
    normalizeTripStopOffsets(ctx.getTrips());
    attachStopSequencesFromDeps(ctx.getTrips(), ctx.getStopDeps());

    ctx.getTrips().forEach((trip) => { trip._delay = Math.random() > 0.8 ? Math.floor(Math.random() * 600) : 0; });
    ctx.getTrips().forEach((trip, index) => {
      trip._idx = index;
      trip.id = index;
    });
    ctx.setStopNames?.(Object.entries(ctx.AppState.stopInfo).map(([sid, info]) => [
      ctx.displayText(info[2] || '').toLowerCase(),
      sid,
      info[0],
      info[1],
      ctx.displayText(info[2] || ''),
    ]));
    ctx.resetRuntimeCaches();

    document.querySelectorAll('.tbtn').forEach((button) => button.classList.toggle('active', button.dataset.t === 'all'));
    ctx.buildRouteList();
    ctx.buildStopList();
    ctx.drawSparkline();
    ctx.drawSliderBands();
    ctx.refreshLayersNow();
    if (runtimeData.nSTOPS.length) {
      const lons = runtimeData.nSTOPS.map((stop) => stop[0]);
      const lats = runtimeData.nSTOPS.map((stop) => stop[1]);
      ctx.getMap?.()?.flyTo?.({
        center: [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
        zoom: 12,
        pitch: 50,
        duration: 1200,
      });
    }
    if (runtimeData.nSTOP_DEPS && Object.keys(runtimeData.nSTOP_DEPS).length > 0) {
      setTimeout(ctx.buildAdjacencyList, 200);
    }
    if (!ctx.getBaseRuntimeData?.() && runtimeData.nTRIPS.length > 0) {
      ctx.setBaseRuntimeData?.(ctx.captureRuntimeDataSnapshot());
    }
    ctx.updateWarningDashboard();
    ctx.updateLandingPageReports();
  }

  async function loadGtfsIntoSim(files, zipFileName, forceServiceId, forceServiceIds) {
    const ctx = getCtx();
    if (!ctx) return false;
    const landingUpload = isLandingVisible();
    if (gtfsLoadingLock) {
      console.warn('[GTFS] Önceki yükleme devam ediyor, iptal edildi.');
      return false;
    }
    gtfsLoadingLock = true;

    const {
      overlay,
      progressBar,
      percentText,
      fileList,
      loaderText,
    } = getLoaderElements();

    try {
      if (overlay && !landingUpload) {
        overlay.classList.remove('hidden');
        if (fileList) fileList.innerHTML = `<div class="file-item">📦 ${zipFileName} açılıyor...</div>`;
      if (loaderText) loaderText.textContent = translate('loadingFilesReading', 'GTFS verileri okunuyor...');
      }

      const setProgress = (pct) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (percentText) percentText.textContent = `${pct}%`;
        if (isLandingVisible()) {
      updateLandingLoadingState(pct, localizedUploadLabel('loadingDataImportingShort', 'VERİ YÜKLENİYOR'));
        }
      };
      setProgress(5);

      ctx.resetGtfsErrors();
      const tables = ctx.parseGtfsTables(files);
      setProgress(10);
      if (isLandingVisible()) {
    updateLandingLoadingState(10, localizedUploadLabel('loadingTablesParsingShort', 'TABLOLAR AYRILIYOR'), {
          routeCount: tables.routeRows.length,
          tripCount: tables.tripRows.length,
          stopCount: tables.stopRows.length,
        });
      }

      if (fileList && !landingUpload) {
        ['routes.txt', 'trips.txt', 'stop_times.txt', 'stops.txt'].forEach((fileName) => {
          const exists = !!files[fileName];
          fileList.innerHTML += `<div class="file-item ${exists ? 'done' : ''}"><span>${fileName}</span><span>${exists ? '✅' : '❌'}</span></div>`;
        });
      }

      const hasStopTimes = tables.stRows.length > 0 || files['stop_times.txt'] instanceof Uint8Array;
      if (!tables.routeRows.length || !tables.tripRows.length || !hasStopTimes || !tables.stopRows.length) {
        ctx.pushGtfsError('GTFS_MISSING_ROWS', 'Zorunlu GTFS tablolarından en az biri boş veya okunamadı', zipFileName);
        if (overlay && !landingUpload) overlay.classList.add('hidden');
        return false;
      }

      if (loaderText && !landingUpload) loaderText.textContent = 'Veri Haritası Oluşturuluyor...';
      await new Promise((resolve) => setTimeout(resolve, 50));
      const routeMap = ctx.buildRouteMap(tables.routeRows);
      const agencyById = Object.fromEntries(
        (tables.agencyRows || []).map((row) => [
          String(row.agency_id || '').trim(),
          String(row.agency_name || '').trim(),
        ])
      );
      const allRouteCatalog = tables.routeRows.map((row) => {
        const routeId = String(row.route_id || '').trim();
        const route = routeMap[routeId];
        if (!route) return null;
        const agencyId = String(row.agency_id || '').trim();
        return {
          k: routeId,
          rid: routeId,
          aid: agencyId,
          an: agencyById[agencyId] || '',
          s: route.short,
          c: route.color,
          t: route.type,
          ln: route.longName || '',
        };
      }).filter(Boolean);
      setProgress(14);
      const shapePts = ctx.buildShapePoints(tables.shapeRows);
      setProgress(18);
      const stopsMap = ctx.buildStopsMap(tables.stopRows);
      setProgress(21);
      const tripMeta = ctx.buildTripMetaMap(tables.tripRows);
      setProgress(24);
      const tripStops = files['stop_times.txt'] instanceof Uint8Array
        ? window.GtfsUtils.buildTripStopsMapFromUint8(files['stop_times.txt'])
        : ctx.buildTripStopsMap(tables.stRows);
      setProgress(29);

      ctx.setActiveServiceOptions(ctx.buildServiceOptions(tables.calendarRows, tables.calendarDateRows));
      let selectedServiceId;
      if (forceServiceId !== undefined) {
        selectedServiceId = forceServiceId;
        ctx.setActiveServiceId(forceServiceId);
        ctx.setActiveServiceIds(forceServiceIds || new Set([forceServiceId]));
      } else {
        const autoResult = ctx.autoSelectAndAdaptService(tables.calendarRows, tables.calendarDateRows);
        if (autoResult.adapted) {
          const message = autoResult.reason || 'GTFS takvimi otomatik uyarlandı.';
          ctx.showToast(message, 'warning');
          const badge = document.getElementById('calendar-adapted-badge');
          if (badge) {
            badge.classList.remove('hidden');
            badge.title = message;
          }
        } else {
          const badge = document.getElementById('calendar-adapted-badge');
          if (badge) badge.classList.add('hidden');
      if (autoResult.serviceId !== 'all') ctx.showToast(translate('gtfsCalendarAutoSelected', 'GTFS takvimi bugüne uygun olarak otomatik seçildi.'), 'info');
        }
        selectedServiceId = autoResult.serviceId;
        ctx.setActiveServiceId(autoResult.serviceId);
        ctx.setActiveServiceIds(autoResult.serviceIds || new Set([autoResult.serviceId]));
      }

      ctx.renderServiceDatePicker(tables.calendarRows, tables.calendarDateRows, ctx.getActiveServiceIds());
      ctx.setCalendarCache({ rows: tables.calendarRows, dateRows: tables.calendarDateRows });
      if (!ctx.getActiveServiceIds() || ctx.getActiveServiceIds().size === 0) {
        ctx.setActiveServiceIds(new Set([selectedServiceId || 'all']));
      }

      const activeServiceIds = ctx.getActiveServiceIds();
      const filteredTripMeta = activeServiceIds.size > 0 && !(activeServiceIds.size === 1 && [...activeServiceIds][0] === 'all')
        ? Object.fromEntries(Object.entries(tripMeta).filter(([, meta]) => activeServiceIds.has(meta.service_id)))
        : tripMeta;

      const totalTripCount = Object.keys(filteredTripMeta).length;
      if (isLandingVisible()) {
    updateLandingLoadingState(29, localizedUploadLabel('loadingTripsPreparingShort', 'SEFERLER HAZIRLANIYOR'), {
          routeCount: tables.routeRows.length,
          tripCount: totalTripCount,
          stopCount: tables.stopRows.length,
        });
      }
      const tripCap = totalTripCount <= 10000 ? Infinity : totalTripCount <= 30000 ? 12000 : 15000;
      let cappedTripMeta = filteredTripMeta;
      let cappedTripStops = tripStops;
      if (tripCap < totalTripCount) {
        const selectedKeys = [];
        const selectedSet = new Set();
        const representativeByRoute = new Set();
        for (const [key, meta] of Object.entries(filteredTripMeta)) {
          const routeId = String(meta?.route_id || '').trim();
          if (!routeId || representativeByRoute.has(routeId)) continue;
          representativeByRoute.add(routeId);
          selectedSet.add(key);
          selectedKeys.push(key);
          if (selectedKeys.length >= tripCap) break;
        }
        if (selectedKeys.length < tripCap) {
          for (const key of Object.keys(filteredTripMeta)) {
            if (selectedSet.has(key)) continue;
            selectedSet.add(key);
            selectedKeys.push(key);
            if (selectedKeys.length >= tripCap) break;
          }
        }
        const keys = selectedKeys;
        const keySet = new Set(keys);
        cappedTripMeta = Object.fromEntries(keys.map((key) => [key, filteredTripMeta[key]]));
        cappedTripStops = Object.fromEntries(Object.entries(tripStops).filter(([key]) => keySet.has(key)));
        const locale = window.I18n?.getLanguage?.() === 'en' ? 'en-US' : 'tr-TR';
        console.warn(
          `[GTFS] Büyük besleme: ${totalTripCount.toLocaleString(locale)} sefer bulundu, ${tripCap.toLocaleString(locale)} tanesi yüklendi (cap).`
        );
        ctx.showToast(
          `⚠️ ${totalTripCount.toLocaleString()} sefer var — yalnızca ilk ${tripCap.toLocaleString()} tanesi yüklendi. Performans sınırlı olabilir.`,
          'warning',
          8000
        );
      }
      const candidateRouteIds = new Set(
        Object.values(cappedTripMeta)
          .map((meta) => String(meta?.route_id || '').trim())
          .filter(Boolean)
      );
      ctx.setRouteCatalog?.(allRouteCatalog.filter((route) => candidateRouteIds.has(route.rid)));

      if (loaderText && !landingUpload) loaderText.textContent = '3D Rotalar ve Seferler İşleniyor...';
      const runtimeData = await window.GtfsUtils.buildGtfsRuntimeDataAsync(
        routeMap,
        shapePts,
        stopsMap,
        cappedTripMeta,
        cappedTripStops,
        (pct) => setProgress(30 + Math.round(pct * 0.7)),
      );
      if (!runtimeData.nTRIPS.length) {
        ctx.pushGtfsError('GTFS_NO_TRIPS', 'Yüklenebilir sefer bulunamadı', zipFileName);
        if (overlay && !landingUpload) overlay.classList.add('hidden');
        return false;
      }
      runtimeData.capped = tripCap < totalTripCount;
      runtimeData.totalTrips = totalTripCount;
      runtimeData.tripCap = tripCap;

      const runtimeRouteIds = new Set((runtimeData.nTRIPS || []).map((trip) => String(trip?.rid || '').trim()).filter(Boolean));
      if (runtimeRouteIds.size) ctx.setRouteCatalog?.(allRouteCatalog.filter((route) => runtimeRouteIds.has(route.rid)));
      ctx.resetViewToggles();
      applyGtfsRuntimeData(runtimeData);
      if (isLandingVisible()) {
    updateLandingLoadingState(100, localizedUploadLabel('loadingReadyShort', 'VERİ HAZIR'), {
          routeCount: new Set(runtimeData.nTRIPS.map((trip) => trip.s)).size,
          tripCount: runtimeData.nTRIPS.length,
          stopCount: runtimeData.nSTOPS.length,
        });
      }
      if (overlay && !landingUpload) {
        if (loaderText) loaderText.textContent = 'Tamamlandı!';
        setTimeout(() => overlay.classList.add('hidden'), 500);
      }
      return true;
    } catch (error) {
      ctx.pushGtfsError('GTFS_RUNTIME_ERROR', error?.message || String(error), zipFileName);
      console.error('[GTFS Loader] hata:', error, zipFileName);
      if (overlay && !landingUpload) overlay.classList.add('hidden');
      return false;
    } finally {
      gtfsLoadingLock = false;
    }
  }

  async function confirmGtfsImport(options = {}) {
    const ctx = getCtx();
    const { openMap = true, closeModal: shouldCloseModal = true, showValidation = true } = options;
    const row = getGtfsConfirmRow();
    const silentImport = !showValidation && !shouldCloseModal;
    const files = ctx?.getLastGtfsFiles?.();
    const fileName = ctx?.getLastGtfsFileName?.();
    if (!files || !fileName) {
      if (!silentImport) renderGtfsConfirmRow('<div style="color:#f85149;padding:8px;font-size:12px;">Önce bir GTFS dosyası seç.</div>', true);
      return;
    }
    if (!silentImport) renderGtfsConfirmRow(`<div style="text-align:center;color:#58a6ff;font-size:12px;padding:8px 0;">${translate('loading', 'Yükleniyor...')}</div>`, true);
    let meta = buildUploadedCityMeta(files, fileName);
    if (!meta) {
      if (!silentImport) renderGtfsConfirmRow('<div style="color:#f85149;padding:8px;font-size:12px;">Şehir bilgisi çıkarılamadı.</div>', true);
      return;
    }
    const previousActiveUploadId = ctx.getActiveCity?.()?.source === 'upload' ? ctx.getActiveCity().id : null;
    ctx.clearUploadedCityPayloads?.();
    ctx.clearHiddenCities?.();
    ctx.replaceCities?.([]);
    ctx.setActiveCity(null);
    if (previousActiveUploadId) {
    ctx.showToast(translate('gtfsReplacingPrevious', 'Önceki yüklenen veri kaldırıldı. Yeni GTFS etkinleştiriliyor.'), 'info');
    }
    ctx.addCity?.(meta);
    ctx.setUploadedCityPayload?.(meta.id, { files, fileName });
    ctx.buildCityList();
    const ok = await loadGtfsIntoSim(files, fileName);
    if (!ok) {
      window.AppManager?.setLandingUploadState?.({ loading: false });
      ctx.deleteUploadedCityPayload?.(meta.id);
      ctx.removeCityById?.(meta.id);
      ctx.buildCityList();
      const detail = ctx.getLastGtfsLoadError?.() ? `<br>${ctx.getLastGtfsLoadError()}` : '';
      if (!silentImport && row) row.innerHTML = `<div style="color:#f85149;padding:8px;font-size:12px;">GTFS simülasyona yüklenemedi.${detail}</div>`;
      return;
    }
    ctx.setActiveCity(meta);
    ctx.buildCityList();
    if (showValidation && row) row.innerHTML = '<div style="text-align:center;color:#3fb950;font-size:13px;font-weight:700;padding:8px 0;">✅ Şehir eklendi ve yüklendi</div>';
    window.AppManager?.setLandingUploadState?.({ loading: false });
    window.AppManager?.updateLandingPageReports?.();
    const landingStartBtn = document.getElementById('lp-btn-start');
    const landingUploadBtn = document.getElementById('lp-btn-upload');
    if (ctx.AppState.trips?.length) {
      landingStartBtn?.classList.remove('hidden');
      if (landingStartBtn) landingStartBtn.disabled = false;
      if (landingStartBtn) landingStartBtn.textContent = translate('landingStartButton', '🗺️ Open Map');
      if (landingUploadBtn) {
        landingUploadBtn.disabled = false;
        landingUploadBtn.classList.remove('is-loading');
        landingUploadBtn.style.removeProperty('--load-pct');
    landingUploadBtn.textContent = `📂 ${translate('uploadAnother', 'Başka GTFS ZIP Yükle').toLocaleUpperCase(window.I18n?.getLanguage?.() === 'en' ? 'en-US' : 'tr-TR')}`;
      }
    }
    setTimeout(() => {
      if (!silentImport) renderGtfsConfirmRow();
      if (shouldCloseModal) closeGTFSModal();
      if (openMap) ctx.toggleUI(true);
    }, 900);
  }

  function cancelGtfsImport() {
    const ctx = getCtx();
    ctx?.setLastGtfsFiles(null);
    ctx?.setLastGtfsFileName('');
    renderGtfsConfirmRow();
    closeGTFSModal();
  }

  function bindUploadControls() {
    getElement('gtfs-modal-close')?.addEventListener('click', closeGTFSModal);
    getElement('btn-gtfs-upload')?.addEventListener('click', openGTFSModal);

    const dropZone = getElement('gtfs-drop-zone');
    const fileInput = getElement('gtfs-file-input');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = event.dataTransfer?.files?.[0];
        if (file) handleGTFSFile(file);
      });
      fileInput.addEventListener('change', (event) => {
        const file = event.target?.files?.[0];
        if (file) handleGTFSFile(file);
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target?.id === 'btn-gtfs-confirm') {
    confirmGtfsImport().catch((error) => showToast(error?.message || translate('gtfsImportError', 'GTFS import hatası oluştu'), 'error'));
      }
      if (event.target?.id === 'btn-gtfs-cancel') cancelGtfsImport();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    bindUploadControls();
  }

  return {
    gtfsProgress,
    gtfsValidate,
    exportReportJSON,
    showValidationReport,
    handleGTFSFile,
    handleGTFSLocalPath,
    handleGTFSUrl,
    buildUploadedCityMeta,
    patchTripsAbsoluteTime,
    applyGtfsRuntimeData,
    loadGtfsIntoSim,
    openGTFSModal,
    closeGTFSModal,
    showToast,
    confirmGtfsImport,
    cancelGtfsImport,
    resetGTFSModalState,
    init,
  };
})();
