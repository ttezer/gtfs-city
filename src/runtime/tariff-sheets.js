/* tariff-sheets.js — Tarife ve sefer saatleri çıktısı (Hat / Durak)
 * Bu dosya global scope'ta çalışır; module export kullanmaz.
 * Yükleme sırası: bootstrap-manager.js → … → tariff-sheets.js → script.js
 */

// ---------------------------------------------------------------------------
// Yardımcı: dil seçimine göre Türkçe / İngilizce metin döndür
// ---------------------------------------------------------------------------
function tariffText(tr, en) {
  return (window.I18n?.getLanguage?.() === 'en') ? en : tr;
}

// ---------------------------------------------------------------------------
// Takvim tarih sınırlarını hesapla
// ---------------------------------------------------------------------------
function getCalendarDateBounds() {
  const cache = _calendarCache || { rows: [], dateRows: [] };
  const latest = window.ServiceManager?.getLatestDateInCalendar?.(cache.rows || []) || new Date().toISOString().slice(0, 10);
  let minDate = '';
  for (const row of (cache.rows || [])) {
    const candidate = window.ServiceManager?.parseGtfsDateToIso?.(row.start_date);
    if (candidate && (!minDate || candidate < minDate)) minDate = candidate;
  }
  return { minDate, maxDate: latest };
}

// ---------------------------------------------------------------------------
// Tarife tarih giriş alanlarını senkronize et
// ---------------------------------------------------------------------------
function syncTariffDateInputs() {
  const { minDate, maxDate } = getCalendarDateBounds();
  const currentPickerValue = document.getElementById('service-date-picker')?.value || maxDate || new Date().toISOString().slice(0, 10);
  ['route-tariff-date', 'stop-tariff-date'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.min = minDate || '';
    input.max = maxDate || '';
    if (!input.value) input.value = currentPickerValue;
  });
}

// ---------------------------------------------------------------------------
// Autocomplete seçenek listelerini oluştur
// ---------------------------------------------------------------------------
function buildRouteTariffOptions() {
  const list = document.getElementById('route-tariff-list');
  if (!list) return;
  const routes = [...(AppState.routeCatalog || [])]
    .sort((left, right) => String(left.s || '').localeCompare(String(right.s || ''), 'tr'));
  list.innerHTML = routes.map((route) => {
    const meta = getRouteMeta(route.s, route.t, route.c, route.ln || route.an || '');
    const subtitle = displayText(route.an || meta.longName || '');
    const label = `${meta.short} | ${subtitle}${route.rid ? ` | ${route.rid}` : ''}`;
    return `<option value="${label}" data-route="${route.s}"></option>`;
  }).join('');
}

function buildStopTariffOptions() {
  const list = document.getElementById('stop-tariff-list');
  if (!list) return;
  const stops = Object.entries(AppState.stopInfo || {})
    .map(([sid, info]) => ({ sid, name: displayText(info?.[2] || sid), code: displayText(info?.[3] || sid) }))
    .sort((left, right) => left.name.localeCompare(right.name, 'tr'));
  list.innerHTML = stops.map((stop) => `<option value="${stop.name} | ${stop.code}" data-stop="${stop.sid}"></option>`).join('');
}

// ---------------------------------------------------------------------------
// Girdi çözümleme
// ---------------------------------------------------------------------------
function resolveRouteInputSelection() {
  const input = document.getElementById('route-tariff-input');
  const value = input?.value?.trim() || '';
  if (!value) return null;
  const parts = value.split('|').map((part) => part.trim()).filter(Boolean);
  const routeIdToken = parts.length >= 3 ? parts[parts.length - 1] : '';
  const catalog = AppState.routeCatalog || [];
  if (routeIdToken) {
    const byId = catalog.find((r) => String(r.rid || '').trim() === routeIdToken);
    if (byId) return { rid: byId.rid || null, short: byId.s };
  }
  const direct = catalog.find((r) => r.s === value);
  if (direct) return { rid: direct.rid || null, short: direct.s };
  const token = parts[0] || '';
  const match = catalog.find((r) => r.s === token);
  return match ? { rid: match.rid || null, short: match.s } : null;
}

function resolveRouteInputValue() {
  return resolveRouteInputSelection()?.short || '';
}

function resolveStopInputValue() {
  const input = document.getElementById('stop-tariff-input');
  const value = input?.value?.trim() || '';
  if (!value) return '';
  if (AppState.stopInfo[value]) return value;
  const token = value.split('|')[0]?.trim().toLowerCase();
  const match = Object.entries(AppState.stopInfo || {}).find(([, info]) => displayText(info?.[2] || '').toLowerCase() === token);
  return match?.[0] || '';
}

// ---------------------------------------------------------------------------
// Aktif tarife tarihini al
// ---------------------------------------------------------------------------
function getActiveTariffDate(type) {
  return document.getElementById(type === 'route' ? 'route-tariff-date' : 'stop-tariff-date')?.value
    || document.getElementById('service-date-picker')?.value
    || new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Veri oluşturucular
// ---------------------------------------------------------------------------
function buildRouteTariffData(routeSelection, directionValue) {
  const routeShort = routeSelection?.short || '';
  const routeId = routeSelection?.rid || null;
  const routeTrips = AppState.trips.filter((trip) =>
    (routeId ? trip.rid === routeId : trip.s === routeShort)
    && (directionValue === 'all' || String(trip.dir) === String(directionValue))
  );
  const directionGroups = new Map();
  routeTrips.forEach((trip) => {
    const label = inferTripDirectionLabel(trip);
    const startSec = trip.ts?.[0];
    if (!Number.isFinite(startSec)) return;
    if (!directionGroups.has(label)) directionGroups.set(label, []);
    directionGroups.get(label).push(secsToHHMM(startSec % 86400));
  });
  directionGroups.forEach((times, label) => {
    directionGroups.set(label, [...new Set(times)].sort());
  });
  return { routeTrips, directionGroups, capped: routeTrips.length === 0 && AppState.capped };
}

function buildStopTariffData(stopId) {
  const deps = AppState.stopDeps?.[stopId] || [];
  const grouped = new Map();
  const tripIds = new Set();
  deps.forEach(([tripIdx, offset, routeShort]) => {
    const trip = AppState.trips[tripIdx];
    if (!trip) return;
    const absSec = getAbsoluteDepartureSec(trip, offset);
    if (!Number.isFinite(absSec)) return;
    tripIds.add(`${tripIdx}|${absSec}`);
    const key = `${routeShort || trip.s}|${inferTripDirectionLabel(trip)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        routeShort: routeShort || trip.s,
        direction: inferTripDirectionLabel(trip),
        longName: displayText(trip.ln || trip.h || ''),
        times: [],
      });
    }
    grouped.get(key).times.push(secsToHHMM(absSec % 86400));
  });
  grouped.forEach((entry) => {
    entry.times = [...new Set(entry.times)].sort();
  });
  return {
    rows: [...grouped.values()].sort((left, right) => left.routeShort.localeCompare(right.routeShort, 'tr')),
    tripCount: tripIds.size,
  };
}

// ---------------------------------------------------------------------------
// Özet güncelleyiciler
// ---------------------------------------------------------------------------
function updateRouteTariffSummary() {
  const summary = document.getElementById('route-tariff-summary');
  if (!summary) return;
  const routeSelection = resolveRouteInputSelection();
  if (!routeSelection?.short) {
    summary.textContent = 'Bir hat seçildiğinde burada kısa özet görünecek.';
    return;
  }
  const { routeTrips, directionGroups, capped: isCapped } = buildRouteTariffData(routeSelection, document.getElementById('route-tariff-direction')?.value || 'all');
  const times = Array.from(directionGroups.values()).flat();
  const routeMeta = (AppState.routeCatalog || []).find((route) => route.rid === routeSelection.rid) || null;
  const capNote = isCapped ? '<br><em>⚠️ Bu hat sefer animasyonu kapsamı dışında kaldı; saatler eksik olabilir.</em>' : '';
  summary.innerHTML = `
    <strong>${routeSelection.short}</strong>${routeMeta?.an ? `<br>${displayText(routeMeta.an)}` : ''}<br>
    Toplam sefer: ${routeTrips.length}<br>
    Yön sayısı: ${directionGroups.size}<br>
    İlk saat: ${times[0] || '—'}<br>
    Son saat: ${times[times.length - 1] || '—'}${capNote}
  `;
}

function updateStopTariffSummary() {
  const summary = document.getElementById('stop-tariff-summary');
  if (!summary) return;
  const stopId = resolveStopInputValue();
  if (!stopId) {
    summary.textContent = 'Bir durak seçildiğinde burada kısa özet görünecek.';
    return;
  }
  const info = AppState.stopInfo?.[stopId];
  const { rows, tripCount } = buildStopTariffData(stopId);
  const allTimes = rows.flatMap((row) => row.times);
  summary.innerHTML = `
    <strong>${displayText(info?.[2] || stopId)}</strong><br>
    Geçen hat sayısı: ${new Set(rows.map((row) => row.routeShort)).size}<br>
    Toplam sefer: ${tripCount}<br>
    İlk saat: ${allTimes[0] || '—'}<br>
    Son saat: ${allTimes[allTimes.length - 1] || '—'}
  `;
}

// ---------------------------------------------------------------------------
// Modal aç / kapat
// ---------------------------------------------------------------------------
function openTariffModal(type) {
  closeTariffModal(type === 'route' ? 'stop' : 'route');
  closeTariffOutput();
  document.getElementById(type === 'route' ? 'route-tariff-modal' : 'stop-tariff-modal')?.classList.remove('hidden');
}

function closeTariffModal(type) {
  document.getElementById(type === 'route' ? 'route-tariff-modal' : 'stop-tariff-modal')?.classList.add('hidden');
}

function resetTariffUiState() {
  document.getElementById('route-tariff-input') && (document.getElementById('route-tariff-input').value = '');
  document.getElementById('stop-tariff-input') && (document.getElementById('stop-tariff-input').value = '');
  document.getElementById('route-tariff-summary') && (document.getElementById('route-tariff-summary').textContent = 'Bir hat seçildiğinde burada kısa özet görünecek.');
  document.getElementById('stop-tariff-summary') && (document.getElementById('stop-tariff-summary').textContent = 'Bir durak seçildiğinde burada kısa özet görünecek.');
  document.getElementById('route-tariff-list') && (document.getElementById('route-tariff-list').innerHTML = '');
  document.getElementById('stop-tariff-list') && (document.getElementById('stop-tariff-list').innerHTML = '');
  closeTariffOutput();
  closeTariffModal('route');
  closeTariffModal('stop');
}

// ---------------------------------------------------------------------------
// Çıktı penceresi — harita ile koordinasyon dahil
// ---------------------------------------------------------------------------
function suspendMapForTariffOutput() {
  document.body.classList.add('tariff-output-open');
}

function resumeMapAfterTariffOutput() {
  document.body.classList.remove('tariff-output-open');
  try {
    mapgl?.resize?.();
    refreshLayersNow?.();
  } catch (_) {}
  setTimeout(() => {
    try {
      mapgl?.resize?.();
      refreshLayersNow?.();
    } catch (_) {}
  }, 120);
}

function openTariffOutput(title, html) {
  const modal = document.getElementById('tariff-output-modal');
  const titleEl = document.getElementById('tariff-output-title');
  const contentEl = document.getElementById('tariff-output-content');
  if (!modal || !titleEl || !contentEl) return;
  titleEl.textContent = title;
  contentEl.innerHTML = html;
  suspendMapForTariffOutput();
  modal.classList.remove('hidden');
}

function closeTariffOutput() {
  document.getElementById('tariff-output-modal')?.classList.add('hidden');
  resumeMapAfterTariffOutput();
}

// ---------------------------------------------------------------------------
// Tarife çıktı alt bilgisi
// ---------------------------------------------------------------------------
function renderTariffFooter() {
  return `
    <div class="tariff-footer">
      <span>© GTFS City tarafından üretilmiştir</span>
      <span>https://ttezer.github.io/gtfs-city/app/</span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Hat tarife sayfası oluşturucu
// ---------------------------------------------------------------------------
function buildRouteTariffSheet() {
  const routeSelection = resolveRouteInputSelection();
  const routeShort = routeSelection?.short || '';
  if (!routeShort) throw new Error('Hat seçilmedi.');
  const style = document.getElementById('route-tariff-style')?.value || 'classic';
  const dateStr = getActiveTariffDate('route');
  const directionValue = document.getElementById('route-tariff-direction')?.value || 'all';
  const sampleTrip = AppState.trips.find((trip) => routeSelection?.rid ? trip.rid === routeSelection.rid : trip.s === routeShort);
  const routeCatalogEntry = (AppState.routeCatalog || []).find((route) => route.rid === routeSelection?.rid) || null;
  const routeMeta = getRouteMeta(routeShort, sampleTrip?.t, sampleTrip?.c, routeCatalogEntry?.ln || sampleTrip?.ln || sampleTrip?.h || routeCatalogEntry?.an || '');
  const { routeTrips, directionGroups } = buildRouteTariffData(routeSelection, directionValue);
  const directionOrder = { 'Gidiş': 0, Outbound: 0, 'Dönüş': 1, Inbound: 1 };
  const directionRows = [...directionGroups.entries()]
    .sort((left, right) => (directionOrder[left[0]] ?? 99) - (directionOrder[right[0]] ?? 99) || left[0].localeCompare(right[0], 'tr'))
    .map(([label, times]) => `
      <tr>
        <td>${label}</td>
        <td>${times.length}</td>
        <td><div class="tariff-times">${times.map((time) => `<span class="tariff-chip">${time}</span>`).join('')}</div></td>
      </tr>
    `).join('');
  return `
    <article class="tariff-sheet ${style}">
      <div class="tariff-brand">
        <div>
          <div class="tariff-code-badge"><span class="tariff-code-label">${tariffText('Hat Kodu', 'Route Code')}</span><span class="tariff-code-value">${routeMeta.short}</span></div>
          <h1 class="tariff-headline">${tariffText('Hat Sefer Saatleri', 'Route Trip Times')}</h1>
          <div class="tariff-subline">${displayText(routeCatalogEntry?.an || routeMeta.longName || sampleTrip?.h || tariffText('Planlı hat geçişleri', 'Planned route departures'))}</div>
        </div>
      </div>
      <div class="tariff-meta-grid">
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Tarih', 'Date')}</div><div class="tariff-meta-value">${dateStr}</div></div>
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Yön', 'Direction')}</div><div class="tariff-meta-value">${directionValue === 'all' ? tariffText('Tüm yönler', 'All directions') : directionValue === '0' ? tariffText('Gidiş', 'Outbound') : tariffText('Dönüş', 'Inbound')}</div></div>
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Sefer', 'Trips')}</div><div class="tariff-meta-value">${routeTrips.length}</div></div>
      </div>
      <table class="tariff-table">
        <thead><tr><th>${tariffText('Yön', 'Direction')}</th><th>${tariffText('Sefer', 'Trips')}</th><th>${tariffText('Saatler', 'Times')}</th></tr></thead>
        <tbody>${directionRows || `<tr><td colspan="3">${tariffText('Bu seçim için saat bulunamadı.', 'No times found for this selection.')}</td></tr>`}</tbody>
      </table>
      ${renderTariffFooter()}
    </article>
  `;
}

// ---------------------------------------------------------------------------
// Durak tarife sayfası oluşturucu
// ---------------------------------------------------------------------------
function buildStopTariffSheet() {
  const stopId = resolveStopInputValue();
  if (!stopId) throw new Error('Durak seçilmedi.');
  const style = document.getElementById('stop-tariff-style')?.value || 'classic';
  const dateStr = getActiveTariffDate('stop');
  const info = AppState.stopInfo?.[stopId];
  const { rows, tripCount } = buildStopTariffData(stopId);
  const tableRows = rows.map((row) => `
    <tr>
      <td>${row.routeShort}</td>
      <td>${row.direction}</td>
      <td>${displayText(row.longName || '—')}</td>
      <td><div class="tariff-times">${row.times.map((time) => `<span class="tariff-chip">${time}</span>`).join('')}</div></td>
    </tr>
  `).join('');
  return `
    <article class="tariff-sheet tariff-sheet-stop ${style}">
      <div class="tariff-brand">
        <div>
          <div class="stop-sign-board">
            <div class="stop-sign-row">
              <span class="stop-sign-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="img" focusable="false">
                  <rect x="2" y="2" width="60" height="60" rx="10" fill="#1d95cf"></rect>
                  <rect x="12" y="9" width="40" height="44" rx="7" fill="#ffffff"></rect>
                  <rect x="18" y="16" width="28" height="4" rx="1.5" fill="#1d95cf"></rect>
                  <rect x="15" y="24" width="34" height="16" rx="4" fill="#1d95cf"></rect>
                  <circle cx="22" cy="46" r="4" fill="#1d95cf"></circle>
                  <circle cx="42" cy="46" r="4" fill="#1d95cf"></circle>
                  <rect x="20" y="50" width="6" height="9" rx="3" fill="#ffffff"></rect>
                  <rect x="38" y="50" width="6" height="9" rx="3" fill="#ffffff"></rect>
                </svg>
              </span>
            </div>
            <h1 class="tariff-headline">${displayText(info?.[2] || stopId)}</h1>
            <div class="tariff-subline">${tariffText('Kod', 'Code')}: ${displayText(info?.[3] || stopId)}</div>
          </div>
        </div>
      </div>
      <div class="tariff-meta-grid">
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Tarih', 'Date')}</div><div class="tariff-meta-value">${dateStr}</div></div>
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Hat', 'Routes')}</div><div class="tariff-meta-value">${new Set(rows.map((row) => row.routeShort)).size}</div></div>
        <div class="tariff-meta-card"><div class="tariff-meta-label">${tariffText('Sefer', 'Trips')}</div><div class="tariff-meta-value">${tripCount}</div></div>
      </div>
      <div class="tariff-section-title">${tariffText('Hatların Duraktan Geçiş Saatleri', 'Route Passing Times at the Stop')}</div>
      <table class="tariff-table">
        <thead><tr><th>${tariffText('Hat', 'Route')}</th><th>${tariffText('Yön', 'Direction')}</th><th>${tariffText('Açıklama', 'Description')}</th><th>${tariffText('Saatler', 'Times')}</th></tr></thead>
        <tbody>${tableRows || `<tr><td colspan="4">${tariffText('Bu seçim için saat bulunamadı.', 'No times found for this selection.')}</td></tr>`}</tbody>
      </table>
      ${renderTariffFooter()}
    </article>
  `;
}

// ---------------------------------------------------------------------------
// Önizleme ve yazdırma
// ---------------------------------------------------------------------------
async function previewRouteTariff() {
  updateRouteTariffSummary();
  openTariffOutput(tariffText('Hat Önizleme', 'Route Preview'), buildRouteTariffSheet());
}

async function previewStopTariff() {
  updateStopTariffSummary();
  openTariffOutput(tariffText('Durak Önizleme', 'Stop Preview'), buildStopTariffSheet());
}

async function printRouteTariff() {
  await previewRouteTariff();
  window.print();
}

async function printStopTariff() {
  await previewStopTariff();
  window.print();
}

// ---------------------------------------------------------------------------
// UI başlatıcı
// ---------------------------------------------------------------------------
function initializeTariffUi() {
  document.getElementById('route-tariff-toggle-btn')?.classList.remove('hidden');
  document.getElementById('stop-tariff-toggle-btn')?.classList.remove('hidden');
  document.getElementById('route-tariff-toggle-btn')?.addEventListener('click', () => {
    syncTariffDateInputs();
    buildRouteTariffOptions();
    openTariffModal('route');
  });
  document.getElementById('stop-tariff-toggle-btn')?.addEventListener('click', () => {
    syncTariffDateInputs();
    buildStopTariffOptions();
    openTariffModal('stop');
  });
  document.getElementById('route-tariff-close')?.addEventListener('click', () => closeTariffModal('route'));
  document.getElementById('stop-tariff-close')?.addEventListener('click', () => closeTariffModal('stop'));
  document.getElementById('route-tariff-preview')?.addEventListener('click', previewRouteTariff);
  document.getElementById('stop-tariff-preview')?.addEventListener('click', previewStopTariff);
  document.getElementById('route-tariff-generate')?.addEventListener('click', printRouteTariff);
  document.getElementById('stop-tariff-generate')?.addEventListener('click', printStopTariff);
  document.getElementById('route-tariff-input')?.addEventListener('input', updateRouteTariffSummary);
  document.getElementById('route-tariff-direction')?.addEventListener('change', updateRouteTariffSummary);
  document.getElementById('stop-tariff-input')?.addEventListener('input', updateStopTariffSummary);
  document.getElementById('tariff-output-close')?.addEventListener('click', closeTariffOutput);
  document.getElementById('tariff-output-print')?.addEventListener('click', () => window.print());
  document.getElementById('route-tariff-modal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'route-tariff-modal') closeTariffModal('route');
  });
  document.getElementById('stop-tariff-modal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'stop-tariff-modal') closeTariffModal('stop');
  });
  document.getElementById('tariff-output-modal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'tariff-output-modal') closeTariffOutput();
  });
  window.addEventListener('afterprint', () => {
    closeTariffOutput();
  });
}
