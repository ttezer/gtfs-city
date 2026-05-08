window.AppManager = (function () {
  let sampleManifest = [];
  const WEBGL_RECOVERY_MAP_FLAG = 'gtfs-city-webgl-recover-map';

  function getCtx() {
    return window.LegacyAppBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function getTrips(ctx) {
    if (!ctx) return [];
    return Array.isArray(ctx.getTrips?.()) ? ctx.getTrips() : [];
  }

  function getStops(ctx) {
    if (!ctx) return [];
    return Array.isArray(ctx.getStops?.()) ? ctx.getStops() : [];
  }

  function toggleHidden(element, hidden) {
    if (!element) return;
    element.classList.toggle('hidden', hidden);
  }

  function triggerResize(delay = 100) {
    setTimeout(() => window.dispatchEvent(new Event('resize')), delay);
  }

  function focusStopOnMap(stopId) {
    const ctx = getCtx();
    if (!ctx || !stopId) return false;
    const stopInfo = ctx?.getStopInfo?.() || {};
    const stop = stopInfo[stopId];
    if (!Array.isArray(stop)) return false;
    window.UIManager?.showStopArrivals?.([stop[0], stop[1], stop[2], stopId, stop[2]]);
    return true;
  }

  function openEntityOnMap(entity) {
    const ctx = getCtx();
    if (!ctx || !entity?.type) return false;
    ctx?.setSelectedEntity?.(entity);
    setWorkspace('harita', { skipResize: true });
    if (entity.type === 'route') {
      const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
      const route = routeCatalog.find((entry) => entry?.rid === entity.routeId)
        || routeCatalog.find((entry) => String(entry?.s || '').trim() === String(entity.routeShort || '').trim());
      // Always reset focused state so focusRoute focuses rather than toggles
      ctx?.setFocusedRoute?.(null);
      window.UIManager?.focusRoute?.(route || entity.routeShort || entity.routeId || '');
      return true;
    }
    if (entity.type === 'stop') {
      return focusStopOnMap(entity.sid || '');
    }
    if (entity.type === 'vehicle') {
      const tripIdx = Number.isInteger(entity.tripIdx) ? entity.tripIdx : null;
      if (!Number.isInteger(tripIdx)) return false;
      window.UIManager?.openVehiclePanel?.(tripIdx);
      return true;
    }
    return false;
  }

  function setLandingMode(enabled) {
    document.body?.classList.toggle('landing-mode', !!enabled);
  }

  function normalizeWorkspace(value) {
    const workspace = String(value || '').trim().toLowerCase();
    if (workspace === 'bilgi' || workspace === 'analiz' || workspace === 'ayarlar') return workspace;
    return 'harita';
  }

  function applyWorkspaceState(workspace) {
    const normalized = normalizeWorkspace(workspace);
    if (document.body) document.body.dataset.workspace = normalized;
    toggleHidden(getElement('info-workspace-shell'), normalized !== 'bilgi');
    toggleHidden(getElement('analiz-workspace-shell'), normalized !== 'analiz');
    document.querySelectorAll('[data-workspace]').forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.classList.toggle('active', button.dataset.workspace === normalized);
    });
    if (normalized === 'analiz') renderInfoCalendar();
    return normalized;
  }

  function updateActiveServiceDateBadge() {
    const badge = getElement('active-service-date-badge');
    if (!badge) return;
    const ctx = getCtx();
    const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
    badge.textContent = `Çalışma günü: ${activeServiceDate || '—'}`;
  }

  function closeMapOnlyUi() {
    window.PlannerManager?.reset?.();
    window.UIManager?.closeRoutePanel?.();
    window.UIManager?.closeStopPanel?.();
    window.UIManager?.closeVehiclePanel?.();
    getElement('route-planner-panel')?.classList.add('hidden');
    getElement('route-result')?.classList.add('hidden');
    getElement('follow-bar')?.classList.add('hidden');
    getElement('replay-bar')?.classList.add('hidden');
    getElement('gtfs-warning-dash')?.classList.add('hidden');
    const isochronPanel = getElement('isochron-panel');
    if (isochronPanel) isochronPanel.style.display = 'none';
  }

  const ROUTE_TYPE_LABELS_TR = { '0': 'Tramvay', '1': 'Metro', '2': 'Tren', '3': 'Otobüs', '4': 'Feribot', '5': 'Füniküler', '6': 'Teleferik', '7': 'Füniküler', '11': 'Troleybüs', '12': 'Tek rel' };
  const ROUTE_TYPE_I18N_KEYS = { '0': 'routeTypeTram', '1': 'routeTypeMetro', '2': 'routeTypeTrain', '3': 'routeTypeBus', '4': 'routeTypeFerry', '5': 'routeTypeFunicular', '6': 'routeTypeCableCar', '7': 'routeTypeFunicular', '9': 'routeTypeMinibus', '10': 'routeTypeSharedTaxi', '11': 'routeTypeTram', '12': 'routeTypeTrain' };
  function localizedRouteTypeLabel(typeKey) {
    const key = ROUTE_TYPE_I18N_KEYS[String(typeKey ?? '')];
    const fallback = ROUTE_TYPE_LABELS_TR[String(typeKey ?? '')] || `Tip ${typeKey}`;
    return key ? (window.I18n?.t?.(key, fallback) || fallback) : fallback;
  }

  function buildInspectorMeta(badges) {
    if (!badges || !badges.length) return '';
    return badges.map(({ text, cls }) => `<span class="info-inspector-badge ${escapeHtml(cls)}">${escapeHtml(text)}</span>`).join('');
  }

  function setInspectorMeta(shell, badges) {
    const metaEl = shell?.querySelector('.info-inspector-meta');
    if (!metaEl) return;
    metaEl.innerHTML = buildInspectorMeta(badges);
  }

  function renderInfoInspector() {
    const shell = getElement('info-workspace-shell');
    if (!shell) return;
    const titleEl = shell.querySelector('.info-inspector-title');
    const subtitleEl = shell.querySelector('.info-inspector-subtitle');
    const bodyEl = shell.querySelector('.info-inspector-empty');
    if (!titleEl || !subtitleEl || !bodyEl) return;
    const ctx = getCtx();
    const selectedEntity = ctx?.getSelectedEntity?.() || null;
    const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    const tariffIndex = ctx?.getTariffIndex?.() || {};
    const stopInfo = ctx?.getStopInfo?.() || {};
    const stopTariffIndex = ctx?.getStopTariffIndex?.() || {};
    const trips = getTrips(ctx);

    if (!selectedEntity?.type) {
      titleEl.textContent = 'Inspector';
      subtitleEl.textContent = 'Seçim bekleniyor';
      setInspectorMeta(shell, []);
      bodyEl.textContent = 'Harita veya bu sayfadaki listeler üzerinden bir seçim yapıldığında ayrıntılar burada görünecek.';
      return;
    }

    if (selectedEntity.type === 'route') {
      const routeMatches = routeCatalog.filter((entry) => String(entry?.s || '').trim() === String(selectedEntity.routeShort || '').trim());
      const isFamilySelection = !!selectedEntity.routeFamily || (!selectedEntity.routeId && routeMatches.length > 1);
      const route = routeCatalog.find((entry) => entry?.rid === selectedEntity.routeId)
        || routeMatches[0]
        || routeCatalog.find((entry) => String(entry?.s || '').trim() === String(selectedEntity.routeShort || '').trim());
      const familyRoutes = isFamilySelection ? routeMatches : (route ? [route] : routeMatches);
      const familyRouteIds = new Set(familyRoutes.map((entry) => String(entry?.rid || '').trim()).filter(Boolean));
      const allRouteTariffs = Object.entries(tariffIndex).filter(([, entry]) => {
        if (!entry || typeof entry !== 'object') return false;
        if (familyRouteIds.size) return familyRouteIds.has(String(entry.rid || '').trim());
        if (route?.rid && entry.rid === route.rid) return true;
        return !route?.rid && String(entry.s || '').trim() === String(selectedEntity.routeShort || '').trim();
      });

      // Temporal filter
      const calendarRows = ctx?.getCalendarRows?.() || [];
      const calendarDateRows = ctx?.getCalendarDateRows?.() || [];
      const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
      let activeServiceIds = null;
      if (activeServiceDate) {
        activeServiceIds = getServiceIdsLocal(activeServiceDate, calendarRows, calendarDateRows);
      }
      const routeTariffEntries = activeServiceIds
        ? allRouteTariffs.filter(([, e]) => activeServiceIds.has(e.sid))
        : allRouteTariffs;
      const routeTariffs = routeTariffEntries.map(([, e]) => e);

      const firstDep = (entries) => entries.reduce((min, entry) => {
        const t = Array.isArray(entry.ts) ? entry.ts.find((s) => Number.isFinite(s)) : null;
        return Number.isFinite(t) ? Math.min(min, t) : min;
      }, Number.POSITIVE_INFINITY);
      const lastDep = (entries) => entries.reduce((max, entry) => {
        const t = Array.isArray(entry.ts) ? entry.ts.find((s) => Number.isFinite(s)) : null;
        return Number.isFinite(t) ? Math.max(max, t) : max;
      }, Number.NEGATIVE_INFINITY);

      const runtimeTripsForRoute = trips.filter((trip) => {
        if (familyRouteIds.size) return familyRouteIds.has(String(trip?.rid || '').trim());
        if (route?.rid && trip?.rid === route.rid) return true;
        return !route?.rid && String(trip?.s || '').trim() === String(selectedEntity.routeShort || '').trim();
      }).length;
      const familyTariffCounts = new Map();
      routeTariffs.forEach((entry) => {
        const rid = String(entry?.rid || '').trim();
        if (!rid) return;
        familyTariffCounts.set(rid, (familyTariffCounts.get(rid) || 0) + 1);
      });
      const familyRuntimeCounts = new Map();
      trips.forEach((trip) => {
        const rid = String(trip?.rid || '').trim();
        if (!rid || !familyRouteIds.has(rid)) return;
        familyRuntimeCounts.set(rid, (familyRuntimeCounts.get(rid) || 0) + 1);
      });

      // Focus state
      const focusedRouteId = ctx?.getFocusedRouteId?.() || null;
      const focusedRoute = ctx?.getFocusedRoute?.() || null;
      const isFocused = route?.rid ? focusedRouteId === route.rid : (focusedRoute === route?.s && !focusedRouteId);

      titleEl.textContent = route?.s || selectedEntity.routeShort || 'Route';
      subtitleEl.textContent = isFamilySelection
        ? `${familyRoutes.length.toLocaleString(getLocale())} kayıt`
        : (route?.rid || selectedEntity.routeId || 'Route seçimi');
      const routeTypeBadges = [];
      if (isFamilySelection) {
        routeTypeBadges.push({ text: 'Hat ailesi', cls: 'type' });
        routeTypeBadges.push({ text: `${familyRoutes.length} kayıt`, cls: 'agency' });
      } else {
        if (route?.t != null) routeTypeBadges.push({ text: localizedRouteTypeLabel(route.t), cls: 'type' });
        if (route?.an) routeTypeBadges.push({ text: route.an, cls: 'agency' });
      }
      if (isFocused) routeTypeBadges.push({ text: 'Odakta', cls: 'focus' });
      setInspectorMeta(shell, routeTypeBadges);

      // Pattern summary
      const patterns = buildPatternGroups(routeTariffEntries);

      // Stops tray (representative trip: selected pattern trip, or first in filtered set)
      let stopsTrayHtml = '';
      if (inspectorState.stopsTrayOpen) {
        const firstTripId = inspectorState.selectedPatternTripId || routeTariffEntries[0]?.[0] || null;
        const trayStops = firstTripId ? buildTripStops(firstTripId, stopTariffIndex, stopInfo) : [];
        stopsTrayHtml = buildStopsTrayHtml(trayStops);
      }

      const routeDisplayName = isFamilySelection
        ? (familyRoutes.find((entry) => entry?.ln)?.ln || patterns[0]?.h || '—')
        : (route?.ln || patterns[0]?.h || '—');
      const routeServiceIds = new Set(allRouteTariffs.map(([, e]) => String(e.sid || '')).filter(Boolean));
      const routeServiceDates = getActiveDatesForRoute(routeServiceIds, calendarRows, calendarDateRows);
      bodyEl.innerHTML = [
        buildTemporalControlHtml(activeServiceDate, routeServiceDates),
        buildInspectorBlock('Hat', escapeHtml(routeDisplayName)),
        buildInspectorStats([
          { value: routeTariffs.length.toLocaleString(getLocale()), label: activeServiceDate ? 'Seçili gün seferi' : 'Tarife seferi' },
          { value: runtimeTripsForRoute.toLocaleString(getLocale()), label: 'Yüklü sefer' },
          { value: patterns.length.toLocaleString(getLocale()), label: 'Varyant' },
        ]),
        routeTariffs.length > 0 && runtimeTripsForRoute === 0 && route?.rid
          ? `<div class="insp-load-route-wrap"><button type="button" class="insp-load-route-btn" data-info-action="load-route" data-rid="${escapeHtml(route.rid)}">Animasyonu Yükle</button></div>`
          : '',
        buildInspectorBlock('Servis aralığı', `${formatSecsToHHMM(firstDep(routeTariffs))} / ${formatSecsToHHMM(lastDep(routeTariffs))}`),
        isFamilySelection ? buildRouteIdentitySummaryHtml(familyRoutes, familyTariffCounts, familyRuntimeCounts) : '',
        buildPatternSummaryHtml(patterns, ctx?.getSelectedPatternKey?.() ?? null, inspectorState.dirFilter ?? null),
        stopsTrayHtml,
        buildInspectorActions({ showFocus: true, isFocused }),
        !inspectorState.stopsTrayOpen ? `<div class="insp-stops-toggle-wrap"><button type="button" class="insp-stops-toggle" data-info-action="open-stops">Durak listesi göster</button></div>` : '',
      ].join('');

      // Bind inspector events
      bodyEl.querySelectorAll('.insp-dir-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-dir-filter');
          inspectorState.dirFilter = val === '' ? null : Number(val);
          renderInfoInspector();
        });
      });
      bodyEl.querySelector('#insp-date-input')?.addEventListener('change', async (e) => {
        const nextDate = e.target.value || '';
        if (!nextDate) return;
        await window.ServiceManager?.handleDateChange?.(nextDate);
      });
      bodyEl.querySelector('[data-info-action="open-stops"]')?.addEventListener('click', () => {
        inspectorState.stopsTrayOpen = true;
        renderInfoInspector();
      });
      bodyEl.querySelector('[data-info-action="close-stops"]')?.addEventListener('click', () => {
        inspectorState.stopsTrayOpen = false;
        renderInfoInspector();
      });
      bodyEl.querySelector('[data-info-action="toggle-focus"]')?.addEventListener('click', () => {
        window.UIManager?.focusRoute(route || selectedEntity.routeShort);
        renderInfoInspector();
      });
      const loadRouteBtn = bodyEl.querySelector('[data-info-action="load-route"]');
      if (loadRouteBtn) {
        loadRouteBtn.addEventListener('click', async () => {
          const rid = loadRouteBtn.getAttribute('data-rid') || '';
          if (!rid) return;
          loadRouteBtn.disabled = true;
          loadRouteBtn.textContent = 'Yükleniyor...';
          const ok = await ctx?.loadRouteRuntimeSubset?.(rid);
          if (ok) { renderInfoInspector(); } else { loadRouteBtn.textContent = 'Yükleme başarısız'; }
        });
      }
      bodyEl.querySelector('[data-info-action="show-service-dates"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const popup = bodyEl.querySelector('#insp-service-dates-popup');
        if (!popup) return;
        popup.classList.toggle('hidden');
        if (!popup.classList.contains('hidden') && !popup.dataset.built) {
          const dates = [...routeServiceDates].sort();
          const byMonth = {};
          dates.forEach((d) => {
            const key = d.slice(0, 7);
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(d);
          });
          const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
          popup.innerHTML = Object.entries(byMonth).map(([ym, ds]) => {
            const [y, m] = ym.split('-');
            const label = `${TR_MONTHS[+m - 1]} ${y}`;
            const dayBtns = ds.map((d) => `<button class="insp-svc-day${d === activeServiceDate ? ' active' : ''}" data-svc-date="${d}">${+d.slice(8)}</button>`).join('');
            return `<div class="insp-svc-month-label">${label}</div><div class="insp-svc-days">${dayBtns}</div>`;
          }).join('') || '<div class="insp-svc-empty">Sefer tarihi bulunamadı</div>';
          popup.dataset.built = '1';
          popup.querySelectorAll('[data-svc-date]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const date = btn.getAttribute('data-svc-date');
              popup.classList.add('hidden');
              await window.ServiceManager?.handleDateChange?.(date);
            });
          });
        }
      });
      document.addEventListener('click', function closeSvcPopup(e) {
        const popup = bodyEl.querySelector('#insp-service-dates-popup');
        if (popup && !popup.classList.contains('hidden') && !popup.contains(e.target) && !e.target.closest('[data-info-action="show-service-dates"]')) {
          popup.classList.add('hidden');
          document.removeEventListener('click', closeSvcPopup);
        }
      });
      bodyEl.querySelectorAll('[data-route-member-id]').forEach((row) => {
        row.addEventListener('click', () => {
          const routeId = row.getAttribute('data-route-member-id') || '';
          const routeMember = familyRoutes.find((entry) => String(entry?.rid || '').trim() === routeId) || null;
          if (!routeMember) return;
          ctx?.setSelectedEntity?.({ type: 'route', routeId, routeShort: routeMember.s || selectedEntity.routeShort || '' });
          renderInfoInspector();
        });
      });
      bodyEl.querySelectorAll('[data-pattern-dir]').forEach((row) => {
        row.addEventListener('click', () => {
          const dirRaw = row.getAttribute('data-pattern-dir');
          const headsign = row.getAttribute('data-pattern-head') || '';
          const tripId = row.getAttribute('data-pattern-tripid') || null;
          const dir = dirRaw === '' || dirRaw == null ? null : Number.parseInt(dirRaw, 10);
          const current = ctx?.getSelectedPatternKey?.();
          const isSame = current && current.dir === dir && current.h === headsign;
          ctx?.setSelectedPatternKey?.(isSame ? null : { dir: Number.isInteger(dir) ? dir : null, h: headsign });
          ctx?.setFocusedStopIdsCache?.(null);
          ctx?.invalidateMapCaches?.();
          ctx?.refreshLayersNow?.();
          inspectorState.stopsTrayOpen = true;
          inspectorState.selectedPatternTripId = tripId;
          renderInfoInspector();
        });
      });
      return;
    }

    if (selectedEntity.type === 'stop') {
      const stop = stopInfo[selectedEntity.sid];
      const stopDepartures = Array.isArray(stopTariffIndex[selectedEntity.sid]) ? stopTariffIndex[selectedEntity.sid] : [];
      const firstDeparture = stopDepartures.reduce((min, entry) => {
        const value = Number.isFinite(entry?.dep) ? entry.dep : null;
        return Number.isFinite(value) ? Math.min(min, value) : min;
      }, Number.POSITIVE_INFINITY);
      const lastDeparture = stopDepartures.reduce((max, entry) => {
        const value = Number.isFinite(entry?.dep) ? entry.dep : null;
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, Number.NEGATIVE_INFINITY);
      const servingRouteIds = [...new Set(stopDepartures.map((d) => d?.rid).filter(Boolean))];
      const servingRoutes = servingRouteIds
        .map((rid) => routeCatalog.find((r) => r?.rid === rid))
        .filter(Boolean)
        .sort((a, b) => String(a.s || a.rid).localeCompare(String(b.s || b.rid), getLocale()));
      const servingRoutesHtml = servingRoutes.length
        ? `<div class="info-inspector-chips">${servingRoutes.map((r) => `<span class="info-route-badge small">${escapeHtml(r.s || r.rid || '—')}</span>`).join('')}</div>`
        : '<span class="info-inspector-empty-note">—</span>';
      titleEl.textContent = stop?.[2] || selectedEntity.sid || 'Stop';
      subtitleEl.textContent = selectedEntity.sid || 'Durak seçimi';
      setInspectorMeta(shell, [{ text: 'Durak', cls: 'type' }]);
      bodyEl.innerHTML = [
        buildInspectorStats([
          { value: stopDepartures.length.toLocaleString(getLocale()), label: 'Sefer' },
          { value: servingRoutes.length.toLocaleString(getLocale()), label: 'Hat' },
        ]),
        buildInspectorBlock('Servis aralığı', `${formatSecsToHHMM(firstDeparture)} / ${formatSecsToHHMM(lastDeparture)}`),
        buildInspectorBlock('Geçen hatlar', servingRoutesHtml),
        buildInspectorActions(),
      ].join('');
      return;
    }

    if (selectedEntity.type === 'vehicle') {
      const trip = Number.isInteger(selectedEntity.tripIdx) ? trips[selectedEntity.tripIdx] : null;
      if (!trip) {
        titleEl.textContent = 'Araç';
        subtitleEl.textContent = 'Araç seçimi';
        setInspectorMeta(shell, []);
        bodyEl.textContent = 'Araç verisi mevcut değil. Harita workspace\'inde araç seçimini yenileyin.';
        return;
      }
      titleEl.textContent = trip.s || 'Araç';
      subtitleEl.textContent = trip.rid || 'Araç seçimi';
      const vehicleBadges = [];
      if (trip.t != null) vehicleBadges.push({ text: localizedRouteTypeLabel(trip.t), cls: 'type' });
      if (trip.h) vehicleBadges.push({ text: trip.h, cls: 'dir' });
      setInspectorMeta(shell, vehicleBadges);
      bodyEl.innerHTML = [
        buildInspectorStats([
          { value: Number.isFinite(trip.ts?.[0]) ? formatSecsToHHMMText(trip.ts[0]) : '—', label: 'İlk zaman' },
          { value: Number.isFinite(trip.d) ? `${Math.round(trip.d / 60)} dk` : '—', label: 'Süre' },
        ]),
        buildInspectorActions(),
      ].join('');
      return;
    }

    titleEl.textContent = 'Inspector';
    subtitleEl.textContent = selectedEntity.type;
    setInspectorMeta(shell, []);
    bodyEl.textContent = 'Bu seçim tipi için ayrıntılı sunum sonraki fazda eklenecek.';
  }

  // ── INSPECTOR STATE ──────────────────────────────────────

  const inspectorState = { stopsTrayOpen: false, selectedPatternTripId: null, dirFilter: null };

  // ── TAKVİM MODÜLÜ ────────────────────────────────────────

  const calendarState = { mode: 'year', year: null, month: null, day: null, selectedDate: null, daySearch: '' };
  const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const TR_DAYS_SHORT = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];

  function gtfsDateToYmd(yyyymmdd) {
    const s = String(yyyymmdd || '');
    if (s.length !== 8) return null;
    return { y: parseInt(s.slice(0,4),10), m: parseInt(s.slice(4,6),10), d: parseInt(s.slice(6,8),10) };
  }

  function ymdToDateStr(y, m, d) {
    return `${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}`;
  }

  function isoFromYmd(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function normalizeCalendarDateKey(value) {
    const raw = String(value || '').trim();
    if (/^\d{8}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.replace(/-/g, '');
    return '';
  }

  function calendarKeyToIso(value) {
    const key = normalizeCalendarDateKey(value);
    if (!key) return '';
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
  }

  function getServiceIdsLocal(dateStr, calendarRows, calendarDateRows) {
    const dateNum = parseInt(dateStr.replace(/-/g,''), 10);
    const date = new Date(`${dateStr.length===8 ? isoFromYmd(dateStr.slice(0,4), dateStr.slice(4,6), dateStr.slice(6,8)) : dateStr}T00:00:00`);
    const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
    const added = new Set();
    const removed = new Set();
    for (const row of (calendarDateRows || [])) {
      if (parseInt(row.date,10) !== dateNum) continue;
      if (row.exception_type === '1') added.add(row.service_id);
      else if (row.exception_type === '2') removed.add(row.service_id);
    }
    const ids = new Set(added);
    for (const row of (calendarRows || [])) {
      if (removed.has(row.service_id) || ids.has(row.service_id)) continue;
      if (row[dayKey] !== '1') continue;
      const s = parseInt(row.start_date, 10);
      const e = parseInt(row.end_date, 10);
      if (dateNum >= s && dateNum <= e) ids.add(row.service_id);
    }
    return ids;
  }

  function getCalendarBoundsLocal(calendarRows, calendarDateRows) {
    let minDate = '';
    let maxDate = '';
    for (const row of (calendarRows || [])) {
      const s = String(row.start_date || '');
      const e = String(row.end_date || '');
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    }
    for (const row of (calendarDateRows || [])) {
      const d = String(row.date || '');
      if (d.length !== 8) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
    return { minDate, maxDate };
  }

  function buildDensityMap(calendarRows, calendarDateRows, tripCountBySid) {
    let minDate = '', maxDate = '';
    for (const row of (calendarRows || [])) {
      const s = String(row.start_date || '');
      const e = String(row.end_date || '');
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    }
    for (const row of (calendarDateRows || [])) {
      const d = String(row.date || '');
      if (d.length === 8) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }
    if (!minDate || !maxDate) return new Map();
    // tripCountBySid: { service_id → trip sayısı } — tüm seferler, filtre yok
    const tripsBySid = new Map(Object.entries(tripCountBySid || {}));
    const density = new Map();
    const start = new Date(`${minDate.slice(0,4)}-${minDate.slice(4,6)}-${minDate.slice(6,8)}T00:00:00`);
    const end   = new Date(`${maxDate.slice(0,4)}-${maxDate.slice(4,6)}-${maxDate.slice(6,8)}T00:00:00`);
    const cur = new Date(start);
    let guard = 0;
    while (cur <= end && guard++ < 1500) {
      const key = ymdToDateStr(cur.getFullYear(), cur.getMonth()+1, cur.getDate());
      const ids = getServiceIdsLocal(key, calendarRows, calendarDateRows);
      let count = 0;
      for (const sid of ids) count += tripsBySid.get(sid) || 0;
      density.set(key, count);
      cur.setDate(cur.getDate() + 1);
    }
    return density;
  }

  function densityClass(count, maxCount) {
    if (!count) return 'cal-d0';
    const pct = count / Math.max(maxCount, 1);
    if (pct < 0.25) return 'cal-d1';
    if (pct < 0.5)  return 'cal-d2';
    if (pct < 0.75) return 'cal-d3';
    return 'cal-d4';
  }

  function renderCalendarYear(density, minDate, maxDate) {
    const minY = gtfsDateToYmd(minDate)?.y;
    if (!minY) return '<div class="cal-empty-msg">Takvim aralığı bulunamadı.</div>';
    const maxCount = Math.max(...density.values(), 1);
    const year = calendarState.year || minY;

    // Izgara başlangıcı: yılın Ocak 1'inden önceki veya ona denk ilk Pazartesi
    const jan1 = new Date(`${year}-01-01T00:00:00`);
    const dec31 = new Date(`${year}-12-31T00:00:00`);
    const startDow = (jan1.getDay() + 6) % 7;
    const gridStart = new Date(jan1);
    gridStart.setDate(jan1.getDate() - startDow);
    const endDow = (dec31.getDay() + 6) % 7;
    const gridEnd = new Date(dec31);
    gridEnd.setDate(dec31.getDate() + (6 - endDow));

    const weeks = [];
    const monthFirstWeek = {};
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = ymdToDateStr(cur.getFullYear(), cur.getMonth()+1, cur.getDate());
        const inYear = cur.getFullYear() === year;
        const inFeed = key >= minDate && key <= maxDate;
        const count = density.get(key) ?? (inYear ? 0 : -2);
        if (d === 0 && inYear && !(cur.getMonth() in monthFirstWeek)) {
          monthFirstWeek[cur.getMonth()] = weeks.length;
        }
        week.push({ key, count, inYear, inFeed });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }

    const nWeeks = weeks.length;
    const sel = calendarState.selectedDate;

    const monthLabels = Object.entries(monthFirstWeek).map(([mIdx, wIdx]) =>
      `<div class="cgrid-mlabel" style="grid-column:${parseInt(wIdx)+2}">${TR_MONTHS[parseInt(mIdx)].slice(0,3)}</div>`
    ).join('');

    const dayLabels = TR_DAYS_SHORT.map((label, i) =>
      `<div class="cgrid-dlabel" style="grid-row:${i+2}">${i % 2 === 0 ? label : ''}</div>`
    ).join('');

    const todayKey = ymdToDateStr(...new Date().toISOString().slice(0,10).split('-').map(Number));
    const cellsHtml = weeks.map((week, wIdx) =>
      week.map((day, dIdx) => {
        const col = wIdx + 2;
        const row = dIdx + 2;
        let cls = 'cgrid-cell';
        if (!day.inYear) {
          cls += ' cgrid-out';
        } else if (!day.inFeed) {
          cls += ' cgrid-nofeed';
        } else {
          cls += ' cgrid-active ' + (day.count > 0 ? densityClass(day.count, maxCount) : 'cal-d0');
        }
        if (day.key === sel) cls += ' cgrid-selected';
        if (day.key === todayKey) cls += ' cgrid-today';
        const tip = day.inFeed
          ? `${day.key}: ${day.count > 0 ? day.count.toLocaleString() + ' sefer' : 'Sefer yok'}`
          : day.key;
        return `<div class="${cls}" data-date="${day.key}" style="grid-row:${row};grid-column:${col}" title="${tip}"></div>`;
      }).join('')
    ).join('');

    const containerW = getElement('info-calendar-body')?.clientWidth || 700;
    const cellSize = Math.max(11, Math.floor((containerW - 22 - nWeeks * 2) / nWeeks));
    const labelH = Math.max(14, cellSize);
    return `
      <div class="cgrid-scroll">
        <div class="cgrid" style="grid-template-columns:22px repeat(${nWeeks},${cellSize}px);grid-template-rows:${labelH}px repeat(7,${cellSize}px);">
          ${monthLabels}${dayLabels}${cellsHtml}
        </div>
      </div>`;
  }

  function renderCalendarMonth(density, year, month, maxCount) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = (new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00`).getDay() + 6) % 7;
    const sel = calendarState.selectedDate;
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayKey = `${todayIso.slice(0,4)}${todayIso.slice(5,7)}${todayIso.slice(8,10)}`;
    let html = '<div class="cal-month-grid">';
    html += TR_DAYS_SHORT.map((d) => `<div class="cal-month-dow">${d}</div>`).join('');
    for (let k = 0; k < firstDow; k++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const key = ymdToDateStr(year, month, d);
      const count = density.get(key) ?? -1;
      const cls = count < 0 ? 'cal-cell-outside' : densityClass(count, maxCount);
      const isSelected = key === sel ? ' cal-cell-selected' : '';
      const isToday = key === todayKey ? ' cal-cell-today' : '';
      const tip = count < 0 ? 'kapsam dışı' : count.toLocaleString() + ' sefer';
      html += `<div class="cal-cell cal-cell-lg ${cls}${isSelected}${isToday}" data-cal-day="${d}" data-date="${key}" title="${tip}">${d}</div>`;
    }
    html += '</div>';
    return html;
  }

  function renderCalendarMonthSet(density, centerYear, centerMonth, maxCount) {
    const months = [-1, 0, 1].map((offset) => {
      let m = centerMonth + offset;
      let y = centerYear;
      if (m < 1) { m += 12; y--; }
      if (m > 12) { m -= 12; y++; }
      return { y, m };
    });
    return `<div class="cal-three-month">
      ${months.map(({ y, m }) => `
        <div class="cal-month-card">
          <div class="cal-month-card-title">${TR_MONTHS[m - 1]} ${y}</div>
          ${renderCalendarMonth(density, y, m, maxCount)}
        </div>`).join('')}
    </div>`;
  }

  function renderCalendarDayDetail(dateStr, calendarRows, calendarDateRows, tariffIndex, routeCatalog, searchFilter) {
    const ids = getServiceIdsLocal(dateStr, calendarRows, calendarDateRows);
    const ymd = gtfsDateToYmd(dateStr);
    const dateLabel = ymd ? `${ymd.d} ${TR_MONTHS[ymd.m-1]} ${ymd.y}` : dateStr;
    if (!ids.size) return `
      <div class="cal-day-shell">
        <div class="cal-day-header"><span class="cal-day-title">${dateLabel}</span></div>
        <div class="cal-empty-msg">Bu gün için aktif servis yok.</div>
      </div>`;
    const byFamily = new Map();
    for (const [, entry] of Object.entries(tariffIndex)) {
      if (!ids.has(entry.sid)) continue;
      const short = entry.s || entry.rid || '';
      if (!byFamily.has(short)) {
        const displayRoute = routeCatalog.find((rc) => rc?.s === short || rc?.rid === entry.rid);
        byFamily.set(short, { short, ln: displayRoute?.ln || '', t: entry.t||'', count:0, first:Infinity, last:-Infinity, heads: new Set() });
      }
      const bucket = byFamily.get(short);
      bucket.count++;
      if (entry.h) bucket.heads.add(entry.h);
      const firstStop = Array.isArray(entry.ts) ? entry.ts.find((v) => Number.isFinite(v)) : null;
      if (Number.isFinite(firstStop)) { bucket.first = Math.min(bucket.first, firstStop); bucket.last = Math.max(bucket.last, firstStop); }
    }
    const filter = String(searchFilter || '').trim().toLowerCase();
    const allRows = Array.from(byFamily.values()).sort((a,b) => b.count - a.count);
    const rows = filter ? allRows.filter((r) => `${r.short} ${r.ln}`.toLowerCase().includes(filter)) : allRows;
    return `
      <div class="cal-day-shell">
        <div class="cal-day-header">
          <span class="cal-day-title">${dateLabel}</span>
          <span class="cal-day-meta">${ids.size} servis · ${allRows.length} hat</span>
          <button class="cal-load-service-btn" data-date="${dateStr}">Takvimi Yükle</button>
          <button class="cal-goto-map-btn" data-date="${dateStr}">Haritaya Geç →</button>
        </div>
        <input class="cal-day-search" placeholder="Hat ara…" value="${escapeHtml(filter)}">
        <div class="cal-day-rows">
          ${rows.length ? rows.map((r) => `
            <div class="cal-day-row" data-route-short="${escapeHtml(r.short)}">
              <span class="info-route-badge">${escapeHtml(r.short || '—')}</span>
              <span class="cal-day-row-name">${escapeHtml(r.ln || [...r.heads].slice(0, 2).join(' / ') || '—')}</span>
              <span class="cal-day-row-count">${r.count} sefer</span>
              <span class="cal-day-row-time">${Number.isFinite(r.first) ? formatSecsToHHMM(r.first) : '—'} / ${Number.isFinite(r.last) ? formatSecsToHHMM(r.last) : '—'}</span>
            </div>`).join('') : `<div class="cal-empty-msg">Sonuç bulunamadı.</div>`}
        </div>
      </div>`;
  }

  function renderInfoCalendar() {
    const bodyEl = getElement('info-calendar-body');
    if (!bodyEl) return;
    const ctx = getCtx();
    const calendarCache = ctx?.getCalendarCache?.() || { rows: [], dateRows: [] };
    const calendarRows = calendarCache.rows || [];
    const calendarDateRows = calendarCache.dateRows || [];
    const tariffIndex = ctx?.getTariffIndex?.() || {};
    const tripCountBySid = ctx?.getTripCountBySid?.() || {};
    const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    if (!calendarRows.length && !Object.keys(tripCountBySid).length && !Object.keys(tariffIndex).length) {
      bodyEl.textContent = 'Henüz takvim verisi yok.';
      return;
    }
    const activeServiceDate = normalizeCalendarDateKey(ctx?.getActiveServiceDate?.() || '');
    if (activeServiceDate && calendarState.selectedDate !== activeServiceDate) {
      calendarState.selectedDate = activeServiceDate;
      const ymd = gtfsDateToYmd(activeServiceDate);
      if (ymd) {
        calendarState.year = ymd.y;
        calendarState.month = ymd.m;
        calendarState.day = ymd.d;
      }
    }
    let minDate = '', maxDate = '';
    for (const row of calendarRows) {
      const s = String(row.start_date || '');
      const e = String(row.end_date || '');
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    }
    for (const row of calendarDateRows) {
      const d = String(row.date || '');
      if (d.length === 8) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }
    const density = buildDensityMap(calendarRows, calendarDateRows, tripCountBySid);
    const maxCount = Math.max(...density.values(), 1);
    const minY = gtfsDateToYmd(minDate)?.y || new Date().getFullYear();
    const maxY = gtfsDateToYmd(maxDate)?.y || minY;
    if (!calendarState.year) {
      const cy = new Date().getFullYear();
      calendarState.year = (cy >= minY && cy <= maxY) ? cy : minY;
    }

    const titleEl = getElement('info-calendar-title');
    if (titleEl) titleEl.textContent = 'Çalışma Takvimi';

    // Navigasyon: tab grubu + bağlama duyarlı oklar
    const navEl = getElement('info-cal-nav');
    if (navEl) {
      const { mode, year, month, selectedDate } = calendarState;
      const hasMonth = month != null;
      const hasDay = !!selectedDate;
      let stepNavHtml;
      if (mode === 'month' && hasMonth) {
        const m = month;
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? year - 1 : year;
        const nextM = m === 12 ? 1 : m + 1;
        const nextY = m === 12 ? year + 1 : year;
        const minM = gtfsDateToYmd(minDate)?.m || 1;
        const maxM = gtfsDateToYmd(maxDate)?.m || 12;
        const canPrev = prevY > minY || (prevY === minY && prevM >= minM);
        const canNext = nextY < maxY || (nextY === maxY && nextM <= maxM);
        stepNavHtml = `
          <div class="cal-year-nav">
            ${canPrev ? `<button class="cal-nav-btn" data-cal-month="${prevM}" data-cal-month-year="${prevY}">◀</button>` : '<span class="cal-nav-spacer"></span>'}
            <span class="cal-nav-label">${TR_MONTHS[m-1]} ${year}</span>
            ${canNext ? `<button class="cal-nav-btn" data-cal-month="${nextM}" data-cal-month-year="${nextY}">▶</button>` : '<span class="cal-nav-spacer"></span>'}
          </div>`;
      } else {
        stepNavHtml = `
          <div class="cal-year-nav">
            ${year > minY ? `<button class="cal-nav-btn" data-cal-year="${year-1}">◀</button>` : '<span class="cal-nav-spacer"></span>'}
            <span class="cal-nav-label">${year}</span>
            ${year < maxY ? `<button class="cal-nav-btn" data-cal-year="${year+1}">▶</button>` : '<span class="cal-nav-spacer"></span>'}
          </div>`;
      }
      navEl.innerHTML = `
        <div class="cal-tabs">
          <button class="cal-tab${mode==='year'?' cal-tab-active':''}" data-cal-tab="year">Yıl</button>
          <button class="cal-tab${mode==='month'?' cal-tab-active':''}${!hasMonth?' cal-tab-off':''}" data-cal-tab="month" ${!hasMonth?'disabled':''}>Ay</button>
          <button class="cal-tab${mode==='day'?' cal-tab-active':''}${!hasDay?' cal-tab-off':''}" data-cal-tab="day" ${!hasDay?'disabled':''}>Gün</button>
        </div>
        ${stepNavHtml}`;
      navEl.querySelectorAll('.cal-tab:not([disabled])').forEach((btn) => {
        btn.addEventListener('click', () => {
          calendarState.mode = btn.dataset.calTab;
          renderInfoCalendar();
        });
      });
      navEl.querySelectorAll('.cal-nav-btn[data-cal-year]').forEach((btn) => {
        btn.addEventListener('click', () => {
          calendarState.year = parseInt(btn.dataset.calYear, 10);
          renderInfoCalendar();
        });
      });
      navEl.querySelectorAll('.cal-nav-btn[data-cal-month]').forEach((btn) => {
        btn.addEventListener('click', () => {
          calendarState.month = parseInt(btn.dataset.calMonth, 10);
          calendarState.year = parseInt(btn.dataset.calMonthYear, 10);
          calendarState.day = null;
          renderInfoCalendar();
        });
      });
    }

    const { mode } = calendarState;

    if (mode === 'year') {
      bodyEl.innerHTML = renderCalendarYear(density, minDate, maxDate);
      bodyEl.querySelectorAll('.cgrid-cell.cgrid-active').forEach((cell) => {
        cell.addEventListener('click', () => {
          const ymd = gtfsDateToYmd(cell.dataset.date);
          if (!ymd) return;
          calendarState.year = ymd.y;
          calendarState.month = ymd.m;
          calendarState.day = ymd.d;
          calendarState.selectedDate = cell.dataset.date;
          calendarState.mode = 'day';
          calendarState.daySearch = '';
          renderInfoCalendar();
        });
      });


    } else if (mode === 'month') {
      const m = calendarState.month || 1;
      const y = calendarState.year || minY;
      bodyEl.innerHTML = renderCalendarMonthSet(density, y, m, maxCount);
      bodyEl.querySelectorAll('.cal-cell-lg[data-date]').forEach((cell) => {
        if (cell.classList.contains('cal-cell-outside')) return;
        cell.addEventListener('click', () => {
          const ymd = gtfsDateToYmd(cell.dataset.date);
          if (!ymd) return;
          calendarState.year = ymd.y;
          calendarState.month = ymd.m;
          calendarState.day = ymd.d;
          calendarState.selectedDate = cell.dataset.date;
          calendarState.mode = 'day';
          calendarState.daySearch = '';
          renderInfoCalendar();
        });
      });
      bindCalDayRowClicks(bodyEl, ctx);

    } else if (mode === 'day') {
      if (!calendarState.selectedDate) { calendarState.mode = 'year'; renderInfoCalendar(); return; }
      if (!calendarState.daySearch) calendarState.daySearch = '';
      bodyEl.innerHTML = renderCalendarDayDetail(calendarState.selectedDate, calendarRows, calendarDateRows, tariffIndex, routeCatalog, calendarState.daySearch);
      bindCalDayRowClicks(bodyEl, ctx);
      bodyEl.querySelector('.cal-day-search')?.addEventListener('input', (e) => {
        calendarState.daySearch = e.target.value || '';
        const rows = bodyEl.querySelector('.cal-day-rows');
        const filter = calendarState.daySearch.trim().toLowerCase();
        bodyEl.querySelectorAll('.cal-day-row').forEach((row) => {
          const text = `${row.dataset.routeShort || ''} ${row.querySelector('.cal-day-row-name')?.textContent || ''}`.toLowerCase();
          row.style.display = filter && !text.includes(filter) ? 'none' : '';
        });
      });
      bodyEl.querySelector('.cal-load-service-btn')?.addEventListener('click', async (event) => {
        const dateStr = event.currentTarget?.dataset?.date || calendarState.selectedDate || '';
        const isoDate = calendarKeyToIso(dateStr);
        if (isoDate) await window.ServiceManager?.handleDateChange?.(isoDate);
      });
      bodyEl.querySelector('.cal-goto-map-btn')?.addEventListener('click', async (event) => {
        const dateStr = event.currentTarget?.dataset?.date || calendarState.selectedDate || '';
        const isoDate = calendarKeyToIso(dateStr);
        if (isoDate) await window.ServiceManager?.handleDateChange?.(isoDate);
        ctx?.setActiveWorkspace?.('harita');
      });
    }
  }

  function bindCalDayRowClicks(bodyEl, ctx) {
    bodyEl.querySelectorAll('.cal-day-row').forEach((row) => {
      row.addEventListener('click', () => {
        const routeShort = row.dataset.routeShort || '';
        ctx?.setSelectedEntity?.({ type: 'route', routeId: null, routeShort, routeFamily: true });
        setWorkspace('bilgi');
      });
    });
  }

  // ── TAKVİM MODÜLÜ SONU ───────────────────────────────────

  function renderInfoWorkspaceStaticText() {
    const shell = getElement('info-workspace-shell');
    if (!shell) return;
    const titleEl = getElement('info-workspace-title');
    const badgeEl = shell.querySelector('.info-workspace-badge');
    if (titleEl) titleEl.textContent = 'GTFS Bilgi Yüzeyi';
    if (badgeEl) badgeEl.textContent = 'Seçili gün';
    const cards = shell.querySelectorAll('.info-workspace-card h3');
    if (cards[0]) cards[0].textContent = 'Veri Özeti';
    if (cards[1]) cards[1].textContent = 'Seçili Gün Özeti';
    if (cards[2]) cards[2].textContent = 'Hatlar';
    if (cards[3]) cards[3].textContent = 'Duraklar';
  }

  function renderInfoWorkspaceOverview() {
    const summaryEl = getElement('info-workspace-summary');
    if (!summaryEl) return;
    const ctx = getCtx();
    const trips = getTrips(ctx);
    const stops = getStops(ctx);
    const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    const tariffIndex = ctx?.getTariffIndex?.() || {};
    const calendarRows = ctx?.getCalendarRows?.() || [];
    const calendarDateRows = ctx?.getCalendarDateRows?.() || [];
    const { minDate, maxDate } = getCalendarBoundsLocal(calendarRows, calendarDateRows);
    if (!routeCatalog.length && !trips.length && !stops.length) {
      summaryEl.textContent = 'Henüz veri yüklenmedi.';
      return;
    }
    const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
    const activeIds = activeServiceDate ? getServiceIdsLocal(activeServiceDate, calendarRows, calendarDateRows) : null;
    const routeCount = routeCatalog.length || new Set(trips.map((trip) => trip?.rid || trip?.s).filter(Boolean)).size;
    const tariffTrips = Object.keys(tariffIndex).length;
    const allTariffEntries = Object.values(tariffIndex).filter((entry) => entry && typeof entry === 'object');
    const tariffEntries = activeIds ? allTariffEntries.filter((e) => activeIds.has(e.sid)) : allTariffEntries;
    const activeTariffRoutes = new Set(tariffEntries.map((entry) => entry.rid || entry.s).filter(Boolean)).size;
    const firstDeparture = tariffEntries.reduce((min, entry) => {
      const firstStop = Array.isArray(entry.ts) ? entry.ts.find((sec) => Number.isFinite(sec)) : null;
      return Number.isFinite(firstStop) ? Math.min(min, firstStop) : min;
    }, Number.POSITIVE_INFINITY);
    const lastDeparture = tariffEntries.reduce((max, entry) => {
      const firstStop = Array.isArray(entry.ts) ? entry.ts.find((sec) => Number.isFinite(sec)) : null;
      return Number.isFinite(firstStop) ? Math.max(max, firstStop) : max;
    }, Number.NEGATIVE_INFINITY);
    summaryEl.innerHTML = `
      <div class="info-summary-grid">
        <div class="info-summary-stat">
          <span class="info-summary-value">${routeCount.toLocaleString(getLocale())}</span>
          <span class="info-summary-label">Hat</span>
        </div>
        <div class="info-summary-stat">
          <span class="info-summary-value">${tariffTrips.toLocaleString(getLocale())}</span>
          <span class="info-summary-label">Tarife seferi</span>
        </div>
        <div class="info-summary-stat">
          <span class="info-summary-value">${trips.length.toLocaleString(getLocale())}</span>
          <span class="info-summary-label">Yüklü sefer</span>
        </div>
        <div class="info-summary-stat">
          <span class="info-summary-value">${stops.length.toLocaleString(getLocale())}</span>
          <span class="info-summary-label">Durak</span>
        </div>
      </div>
      <div class="info-summary-strip">
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Çalışma günü</span>
          <span class="info-summary-strip-value">${escapeHtml(ctx?.getActiveServiceDate?.() || '—')}</span>
        </div>
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Veri aralığı</span>
          <span class="info-summary-strip-value">${escapeHtml(calendarKeyToIso(minDate) || '—')} / ${escapeHtml(calendarKeyToIso(maxDate) || '—')}</span>
        </div>
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Günlük hat</span>
          <span class="info-summary-strip-value">${activeTariffRoutes.toLocaleString(getLocale())}</span>
        </div>
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Servis aralığı</span>
          <span class="info-summary-strip-value">${formatSecsToHHMM(firstDeparture)} / ${formatSecsToHHMM(lastDeparture)}</span>
        </div>
      </div>
    `;
  }

  function renderInfoServiceSummary() {
    const summaryEl = getElement('info-service-summary');
    if (!summaryEl) return;
    const ctx = getCtx();
    const tariffIndex = ctx?.getTariffIndex?.() || {};
    const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
    const calendarRows = ctx?.getCalendarRows?.() || [];
    const calendarDateRows = ctx?.getCalendarDateRows?.() || [];
    const activeIds = activeServiceDate ? getServiceIdsLocal(activeServiceDate, calendarRows, calendarDateRows) : null;
    const entries = Object.values(tariffIndex).filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      return !activeIds || activeIds.has(entry.sid);
    });
    if (!entries.length) {
      summaryEl.textContent = 'Henüz servis özeti yok.';
      return;
    }

    const byRoute = new Map();
    entries.forEach((entry) => {
      const key = String(entry.rid || entry.s || '').trim();
      if (!key) return;
      const bucket = byRoute.get(key) || {
        rid: entry.rid || '',
        short: entry.s || '',
        count: 0,
        first: Number.POSITIVE_INFINITY,
        last: Number.NEGATIVE_INFINITY,
      };
      bucket.count += 1;
      const firstStop = Array.isArray(entry.ts) ? entry.ts.find((sec) => Number.isFinite(sec)) : null;
      if (Number.isFinite(firstStop)) {
        bucket.first = Math.min(bucket.first, firstStop);
        bucket.last = Math.max(bucket.last, firstStop);
      }
      byRoute.set(key, bucket);
    });

    const topRoutes = Array.from(byRoute.values())
      .sort((a, b) => (b.count - a.count) || String(a.short || a.rid).localeCompare(String(b.short || b.rid), getLocale()))
      .slice(0, 5);

    summaryEl.innerHTML = `
      <div class="info-summary-strip">
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Çalışma günü</span>
          <span class="info-summary-strip-value">${activeServiceDate ? escapeHtml(activeServiceDate) : 'Tüm servisler'}</span>
        </div>
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Tarife kayıtları</span>
          <span class="info-summary-strip-value">${entries.length.toLocaleString(getLocale())}</span>
        </div>
        <div class="info-summary-strip-item">
          <span class="info-summary-strip-label">Kapsanan hat</span>
          <span class="info-summary-strip-value">${topRoutes.length.toLocaleString(getLocale())}</span>
        </div>
      </div>
      <div class="info-service-top">
        ${topRoutes.map((item) => {
          const route = routeCatalog.find((entry) => entry?.rid === item.rid) || null;
          return `
            <div class="info-service-row">
              <div class="info-service-code">${escapeHtml(item.short || item.rid || '—')}</div>
              <div class="info-service-count">${item.count.toLocaleString(getLocale())} sefer</div>
              <div class="info-service-meta">${escapeHtml(route?.ln || route?.an || item.rid || '—')} · ${formatSecsToHHMM(item.first)} / ${formatSecsToHHMM(item.last)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const tableSort = {
    route: { col: 'runtime', dir: 'desc' },
    stop:  { col: 'deps',    dir: 'desc' },
  };

  function thSort(table, col, label) {
    const s = tableSort[table];
    const active = s.col === col;
    const arrow = active ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="tbl-th${active ? ' tbl-th-active' : ''}" data-tbl="${escapeHtml(table)}" data-col="${escapeHtml(col)}">${escapeHtml(label)}${arrow}</th>`;
  }

  function renderInfoRouteList(filterText = '') {
    const listEl = getElement('info-route-list');
    if (!listEl) return;
    const ctx = getCtx();
    const routeCatalog = Array.isArray(ctx?.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    const trips = getTrips(ctx);
    const tariffIndex = ctx?.getTariffIndex?.() || {};
    const routeNameFallbacks = buildRouteNameFallbackMap(tariffIndex);
    const selectedEntity = ctx?.getSelectedEntity?.() || null;
    if (!routeCatalog.length) {
      listEl.innerHTML = '<div class="info-tbl-empty">Henüz veri yok.</div>';
      return;
    }

    const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
    const calendarRows = ctx?.getCalendarRows?.() || [];
    const calendarDateRows = ctx?.getCalendarDateRows?.() || [];
    const activeIds = activeServiceDate ? getServiceIdsLocal(activeServiceDate, calendarRows, calendarDateRows) : null;

    const runtimeCounts = new Map();
    trips.forEach((trip) => {
      const key = String(trip?.rid || '').trim();
      if (key) runtimeCounts.set(key, (runtimeCounts.get(key) || 0) + 1);
    });

    const tariffCounts = new Map();
    const dirSets = new Map();
    Object.values(tariffIndex).forEach((entry) => {
      if (!entry?.rid) return;
      if (activeIds && !activeIds.has(entry.sid)) return;
      const rid = String(entry.rid);
      tariffCounts.set(rid, (tariffCounts.get(rid) || 0) + 1);
      if (!dirSets.has(rid)) dirSets.set(rid, new Set());
      if (entry.dir != null) dirSets.get(rid).add(entry.dir);
    });

    const filter = String(filterText || '').trim().toLowerCase();
    const { col, dir } = tableSort.route;
    const routeFamilies = buildRouteFamilies(routeCatalog, runtimeCounts, tariffCounts, dirSets, routeNameFallbacks);
    const filteredRoutes = routeFamilies
      .filter((r) => {
        if (!filter) return true;
        return `${r?.short || ''} ${r?.displayName || ''}`.toLowerCase().includes(filter);
      })
      .sort((a, b) => {
        let v = 0;
        if (col === 'code')    v = String(a?.short || '').localeCompare(String(b?.short || ''), getLocale());
        else if (col === 'name')    v = String(a?.displayName || a?.short || '').localeCompare(String(b?.displayName || b?.short || ''), getLocale());
        else if (col === 'type')    v = String(a?.typeLabel || '').localeCompare(String(b?.typeLabel || ''), getLocale());
        else if (col === 'dirs')    v = (b?.dirs || 0) - (a?.dirs || 0);
        else if (col === 'tariff')  v = (b?.tariff || 0) - (a?.tariff || 0);
        else v = (b?.runtime || 0) - (a?.runtime || 0);
        return dir === 'asc' ? -v : v;
      });

    const total = filteredRoutes.length;
    const rows = filteredRoutes.slice(0, 200);
    const capNote = total > rows.length
      ? `<tr><td colspan="6" class="info-list-cap-note">${rows.length.toLocaleString(getLocale())} / ${total.toLocaleString(getLocale())} hat gösteriliyor</td></tr>`
      : '';

    listEl.innerHTML = `
      <table class="info-tbl">
        <thead><tr>
          ${thSort('route', 'code', 'Kod')}
          ${thSort('route', 'name', 'Ad')}
          ${thSort('route', 'type', 'Tip')}
          ${thSort('route', 'dirs', 'Yön')}
          ${thSort('route', 'tariff', 'Tarife')}
          ${thSort('route', 'runtime', 'Yüklü')}
          <th class="tbl-th tbl-th-action"></th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => {
            const active = selectedEntity?.type === 'route'
              && ((selectedEntity?.routeFamily && selectedEntity?.routeShort === r.short) || selectedEntity?.routeShort === r.short);
            const displayName = r.displayName || '—';
            const inactiveToday = activeIds && (r.tariff || 0) === 0;
            return `<tr class="info-tbl-row${active ? ' active' : ''}${inactiveToday ? ' tbl-row-inactive' : ''}" data-route-short="${escapeHtml(r.short || '')}">
              <td><span class="info-route-badge">${escapeHtml(r.short || '—')}</span></td>
              <td class="tbl-td-name">${escapeHtml(displayName)}</td>
              <td class="tbl-td-muted">${escapeHtml(r.typeLabel || '—')}</td>
              <td class="tbl-td-num">${r.dirs || '—'}</td>
              <td class="tbl-td-num">${activeIds && (r.tariff || 0) === 0 ? '<span class="tbl-inactive-marker">—</span>' : (r.tariff || 0).toLocaleString(getLocale())}</td>
              <td class="tbl-td-num">${(r.runtime || 0).toLocaleString(getLocale())}</td>
              <td><button class="tbl-map-btn" data-map-route-short="${escapeHtml(r.short || '')}" title="Ayrıntıyı aç">↗</button></td>
            </tr>`;
          }).join('')}
          ${capNote}
        </tbody>
      </table>`;

    listEl.querySelectorAll('.info-tbl-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target instanceof HTMLElement && e.target.closest('.tbl-map-btn')) return;
        ctx?.setSelectedEntity?.({ type: 'route', routeId: null, routeShort: row.dataset.routeShort || '', routeFamily: true });
        renderInfoRouteList(getElement('info-route-filter')?.value || '');
      });
    });
    listEl.querySelectorAll('.tbl-map-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx?.setSelectedEntity?.({ type: 'route', routeId: null, routeShort: btn.dataset.mapRouteShort || '', routeFamily: true });
        renderInfoInspector();
      });
    });
    listEl.querySelectorAll('.tbl-th[data-col]').forEach((th) => {
      th.addEventListener('click', () => {
        const tbl = th.dataset.tbl;
        const c = th.dataset.col;
        if (!tbl || !c) return;
        if (tableSort[tbl].col === c) tableSort[tbl].dir = tableSort[tbl].dir === 'asc' ? 'desc' : 'asc';
        else { tableSort[tbl].col = c; tableSort[tbl].dir = 'desc'; }
        renderInfoRouteList(getElement('info-route-filter')?.value || '');
      });
    });
  }

  function renderInfoStopList(filterText = '') {
    const listEl = getElement('info-stop-list');
    if (!listEl) return;
    const ctx = getCtx();
    const stopInfo = ctx?.getStopInfo?.() || {};
    const stopTariffIndex = ctx?.getStopTariffIndex?.() || {};
    const selectedEntity = ctx?.getSelectedEntity?.() || null;
    const activeServiceDate = ctx?.getActiveServiceDate?.() || '';
    const calendarRows = ctx?.getCalendarRows?.() || [];
    const calendarDateRows = ctx?.getCalendarDateRows?.() || [];
    const activeIds = activeServiceDate ? getServiceIdsLocal(activeServiceDate, calendarRows, calendarDateRows) : null;
    const filter = String(filterText || '').trim().toLowerCase();

    const { col, dir } = tableSort.stop;
    const filteredStops = Object.entries(stopInfo)
      .map(([sid, stop]) => {
        const allEntries = Array.isArray(stopTariffIndex[sid]) ? stopTariffIndex[sid] : [];
        const entries = activeIds ? allEntries.filter((d) => activeIds.has(d?.sid)) : allEntries;
        const routeCount = new Set(entries.map((d) => d?.rid).filter(Boolean)).size;
        return { sid, name: stop?.[2] || sid, code: stop?.[3] || sid, lon: stop?.[0], lat: stop?.[1], deps: entries.length, routes: routeCount };
      })
      .filter((s) => {
        if (!filter) return true;
        return `${s.name} ${s.code} ${s.sid}`.toLowerCase().includes(filter);
      })
      .sort((a, b) => {
        let v = 0;
        if (col === 'name')   v = String(a.name).localeCompare(String(b.name), getLocale());
        else if (col === 'routes') v = b.routes - a.routes;
        else v = b.deps - a.deps;
        return dir === 'asc' ? -v : v;
      });

    const total = filteredStops.length;
    const rows = filteredStops.slice(0, 200);

    if (!rows.length) {
      listEl.innerHTML = '<div class="info-tbl-empty">Henüz durak verisi yok.</div>';
      return;
    }

    const capNote = rows.length < total
      ? `<tr><td colspan="4" class="info-list-cap-note">${rows.length.toLocaleString(getLocale())} / ${total.toLocaleString(getLocale())} durak gösteriliyor</td></tr>`
      : '';

    listEl.innerHTML = `
      <table class="info-tbl">
        <thead><tr>
          ${thSort('stop', 'name', 'Ad')}
          ${thSort('stop', 'routes', 'Hat')}
          ${thSort('stop', 'deps', 'Sefer')}
          <th class="tbl-th tbl-th-action"></th>
        </tr></thead>
        <tbody>
          ${rows.map((s) => {
            const active = selectedEntity?.type === 'stop' && selectedEntity?.sid === s.sid;
            return `<tr class="info-tbl-row${active ? ' active' : ''}" data-stop-id="${escapeHtml(s.sid)}">
              <td class="tbl-td-name">${escapeHtml(s.name)}</td>
              <td class="tbl-td-num">${s.routes}</td>
              <td class="tbl-td-num">${s.deps.toLocaleString(getLocale())}</td>
              <td><button class="tbl-map-btn" data-map-stop-id="${escapeHtml(s.sid)}" title="Haritada göster">↗</button></td>
            </tr>`;
          }).join('')}
          ${capNote}
        </tbody>
      </table>`;

    listEl.querySelectorAll('.info-tbl-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target instanceof HTMLElement && e.target.closest('.tbl-map-btn')) return;
        ctx?.setSelectedEntity?.({ type: 'stop', sid: row.dataset.stopId || '' });
        renderInfoStopList(getElement('info-stop-filter')?.value || '');
      });
    });
    listEl.querySelectorAll('.tbl-map-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntityOnMap({ type: 'stop', sid: btn.dataset.mapStopId || '' });
      });
    });
    listEl.querySelectorAll('.tbl-th[data-col]').forEach((th) => {
      th.addEventListener('click', () => {
        const tbl = th.dataset.tbl;
        const c = th.dataset.col;
        if (!tbl || !c) return;
        if (tableSort[tbl].col === c) tableSort[tbl].dir = tableSort[tbl].dir === 'asc' ? 'desc' : 'asc';
        else { tableSort[tbl].col = c; tableSort[tbl].dir = 'desc'; }
        renderInfoStopList(getElement('info-stop-filter')?.value || '');
      });
    });
  }

  function bindInfoWorkspaceControls() {
    const infoShell = getElement('info-workspace-shell');
    if (infoShell && infoShell.dataset.actionsBound !== '1') {
      infoShell.dataset.actionsBound = '1';
      infoShell.addEventListener('click', (event) => {
        const button = event.target instanceof HTMLElement ? event.target.closest('[data-info-action]') : null;
        if (!button) return;
        const action = button.getAttribute('data-info-action') || '';
        const ctx = getCtx();
        if (action === 'open-map') {
          const selectedEntity = ctx?.getSelectedEntity?.() || null;
          if (selectedEntity) openEntityOnMap(selectedEntity);
          return;
        }
        if (action === 'clear-selection') {
          ctx?.setSelectedEntity?.(null);
        }
      });
    }
    const routeFilter = getElement('info-route-filter');
    if (!routeFilter || routeFilter.dataset.bound === '1') return;
    routeFilter.dataset.bound = '1';
    routeFilter.addEventListener('input', () => {
      renderInfoRouteList(routeFilter.value || '');
    });
    const routeSort = getElement('info-route-sort');
    if (routeSort && routeSort.dataset.bound !== '1') {
      routeSort.dataset.bound = '1';
      routeSort.addEventListener('change', () => {
        renderInfoRouteList(routeFilter.value || '');
      });
    }
    const stopFilter = getElement('info-stop-filter');
    if (stopFilter && stopFilter.dataset.bound !== '1') {
      stopFilter.dataset.bound = '1';
      stopFilter.addEventListener('input', () => {
        renderInfoStopList(stopFilter.value || '');
      });
    }
    const stopSort = getElement('info-stop-sort');
    if (stopSort && stopSort.dataset.bound !== '1') {
      stopSort.dataset.bound = '1';
      stopSort.addEventListener('change', () => {
        renderInfoStopList(stopFilter?.value || '');
      });
    }
  }

  function getLandingElements() {
    return {
      route: getElement('lp-count-routes'),
      trip: getElement('lp-count-trips'),
      stop: getElement('lp-count-stops'),
      upload: getElement('lp-btn-upload'),
      start: getElement('lp-btn-start'),
      openMap: getElement('lp-btn-open-map'),
      openMapWrap: getElement('lp-map-open-wrap'),
      openMapNote: getElement('lp-map-open-note'),
    };
  }

  function getLocale() {
    return window.I18n?.getLanguage?.() === 'en' ? 'en-US' : 'tr-TR';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatSecsToHHMM(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return '—';
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const dayOffset = Math.floor(seconds / 86400);
    const hh = Math.floor((seconds % 86400) / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const base = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return dayOffset > 0 ? `${base} <small class="time-day-offset">+${dayOffset}</small>` : base;
  }

  function formatSecsToHHMMText(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return '—';
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const dayOffset = Math.floor(seconds / 86400);
    const hh = Math.floor((seconds % 86400) / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const base = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return dayOffset > 0 ? `${base} +${dayOffset}` : base;
  }

  function buildInspectorStats(items) {
    return `
      <div class="info-inspector-stats">
        ${items.map((item) => `
          <div class="info-inspector-stat">
            <span class="info-inspector-stat-value">${escapeHtml(item.value ?? '—')}</span>
            <span class="info-inspector-stat-label">${escapeHtml(item.label || '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function buildInspectorBlock(title, content) {
    return `
      <div class="info-inspector-block">
        <div class="info-inspector-block-title">${escapeHtml(title)}</div>
        <div class="info-inspector-block-body">${content}</div>
      </div>
    `;
  }

  function buildInspectorActions({ showFocus = false, isFocused = false } = {}) {
    const focusBtn = showFocus
      ? `<button type="button" class="info-inspector-action${isFocused ? ' focused' : ''}" data-info-action="toggle-focus">${isFocused ? 'Odak Çık' : 'Odaklan'}</button>`
      : '';
    return `
      <div class="info-inspector-actions">
        <button type="button" class="info-inspector-action primary" data-info-action="open-map">Haritada Aç</button>
        ${focusBtn}
        <button type="button" class="info-inspector-action" data-info-action="clear-selection">Seçimi Temizle</button>
      </div>
    `;
  }

  function buildPatternGroups(routeTariffEntries) {
    const groups = new Map();
    for (const [tripId, entry] of routeTariffEntries) {
      const key = `${entry.dir ?? '?'}|${entry.h || ''}`;
      if (!groups.has(key)) groups.set(key, { dir: entry.dir, h: entry.h || '', count: 0, tripId: tripId || '', sid: entry.sid || '' });
      groups.get(key).count++;
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }

  function buildRouteNameFallbackMap(tariffIndex) {
    const byRoute = new Map();
    for (const entry of Object.values(tariffIndex || {})) {
      const rid = String(entry?.rid || '').trim();
      const headsign = String(entry?.h || '').trim();
      if (!rid || !headsign) continue;
      if (!byRoute.has(rid)) byRoute.set(rid, new Map());
      const bucket = byRoute.get(rid);
      bucket.set(headsign, (bucket.get(headsign) || 0) + 1);
    }
    const resolved = new Map();
    byRoute.forEach((bucket, rid) => {
      let bestName = '';
      let bestCount = -1;
      bucket.forEach((count, headsign) => {
        if (count > bestCount) {
          bestName = headsign;
          bestCount = count;
        }
      });
      if (bestName) resolved.set(rid, bestName);
    });
    return resolved;
  }

  function buildRouteFamilies(routeCatalog, runtimeCounts, tariffCounts, dirSets, routeNameFallbacks) {
    const families = new Map();
    for (const route of routeCatalog || []) {
      const short = String(route?.s || route?.rid || '').trim();
      if (!short) continue;
      if (!families.has(short)) {
        families.set(short, {
          short,
          members: [],
          memberIds: new Set(),
          names: new Set(),
          typeLabels: new Set(),
          dirs: new Set(),
          tariff: 0,
          runtime: 0,
        });
      }
      const family = families.get(short);
      family.members.push(route);
      if (route?.rid) family.memberIds.add(String(route.rid));
      const displayName = String(route?.ln || routeNameFallbacks.get(String(route?.rid || '').trim()) || '').trim();
      if (displayName) family.names.add(displayName);
      family.typeLabels.add(localizedRouteTypeLabel(route?.t) || String(route?.t ?? '—'));
      const routeDirs = dirSets.get(route?.rid);
      if (routeDirs) routeDirs.forEach((value) => family.dirs.add(value));
      family.tariff += tariffCounts.get(route?.rid) || 0;
      family.runtime += runtimeCounts.get(route?.rid) || 0;
    }
    return Array.from(families.values()).map((family) => {
      const typeArray = [...family.typeLabels].filter(Boolean);
      const nameArray = [...family.names];
      return {
        short: family.short,
        members: family.members,
        memberCount: family.members.length,
        displayName: nameArray.length === 1 ? nameArray[0] : (nameArray[0] || '—'),
        typeLabel: typeArray.length <= 2 ? typeArray.join(' · ') : `${typeArray.slice(0, 2).join(' · ')} +${typeArray.length - 2}`,
        dirs: family.dirs.size,
        tariff: family.tariff,
        runtime: family.runtime,
      };
    });
  }

  function buildTripStops(tripId, stopTariffIndex, stopInfo) {
    const ctx = getCtx();
    const rawTripStops = ctx?.getAppState?.()?.routeRuntimeSource?.tripStops?.[tripId];
    if (rawTripStops?.length > 0) {
      // Full stop list (including non-timepoints) from parsed stop_times
      return rawTripStops
        .map(([seq, dep, sid]) => ({
          sid,
          seq,
          dep: Number.isFinite(dep) ? dep : null,
          code: stopInfo[sid]?.[3] || sid,
          name: stopInfo[sid]?.[2] || '—',
        }))
        .sort((a, b) => a.seq - b.seq);
    }
    // Fallback: only timepoint stops from stopTariffIndex
    const stops = [];
    for (const [sid, entries] of Object.entries(stopTariffIndex)) {
      for (const e of entries) {
        if (e.trip_id === tripId) { stops.push({ sid, seq: e.seq, dep: e.dep }); break; }
      }
    }
    stops.sort((a, b) => a.seq - b.seq);
    return stops.map((s) => ({
      ...s,
      code: stopInfo[s.sid]?.[3] || s.sid,
      name: stopInfo[s.sid]?.[2] || '—',
    }));
  }

  function buildPatternSummaryHtml(groups, selectedPatternKey, dirFilter) {
    if (!groups.length) return '';
    const isEn = window.I18n?.getLanguage?.() === 'en';
    const dirLabel = (d) => d === 0 ? (isEn ? 'I' : 'G') : d === 1 ? (isEn ? 'O' : 'D') : '?';
    const dirArrow = (d) => d === 0 ? ' →' : d === 1 ? ' ←' : '';
    const hasDir0 = groups.some((g) => g.dir === 0);
    const hasDir1 = groups.some((g) => g.dir === 1);
    const filtered = dirFilter === null ? groups : groups.filter((g) => g.dir === dirFilter);
    const rows = filtered.map((g) => {
      const isSelected = selectedPatternKey && selectedPatternKey.dir === g.dir && selectedPatternKey.h === g.h;
      const head = escapeHtml(g.h || '');
      const label = head ? `${dirLabel(g.dir)}${dirArrow(g.dir)} ${head}` : `${dirLabel(g.dir)}${dirArrow(g.dir)}`;
      return `
      <div class="insp-pattern-row${isSelected ? ' insp-pattern-row--selected' : ''}" data-pattern-dir="${g.dir ?? ''}" data-pattern-head="${escapeHtml(g.h || '')}" data-pattern-tripid="${escapeHtml(g.tripId || '')}" title="${isSelected ? 'Seçimi kaldır' : 'Bu varyanta odaklan'}">
        <span class="insp-pattern-label">${label}</span>
        <span class="insp-pattern-count">${g.count.toLocaleString(getLocale())} sefer</span>
      </div>`;
    }).join('');
    const allLabel = isEn ? 'All' : 'Tüm';
    const d0Label = isEn ? 'I →' : 'G →';
    const d1Label = isEn ? '← O' : '← D';
    const pills = `<div class="insp-dir-pills">
      <button class="insp-dir-pill${dirFilter === null ? ' active' : ''}" data-dir-filter="">
        ${allLabel}
      </button>
      ${hasDir0 ? `<button class="insp-dir-pill${dirFilter === 0 ? ' active' : ''}" data-dir-filter="0">${d0Label}</button>` : ''}
      ${hasDir1 ? `<button class="insp-dir-pill${dirFilter === 1 ? ' active' : ''}" data-dir-filter="1">${d1Label}</button>` : ''}
    </div>`;
    return `<div class="info-inspector-block">
      <div class="info-inspector-block-title">Varyantlar</div>
      ${pills}
      <div class="insp-pattern-list">${rows}</div>
    </div>`;
  }

  function buildRouteIdentitySummaryHtml(routes, tariffCounts, runtimeCounts) {
    if (!Array.isArray(routes) || !routes.length) return '';
    const rows = routes.map((route) => {
      const rid = String(route?.rid || '').trim();
      const typeLabel = localizedRouteTypeLabel(route?.t) || String(route?.t ?? '—');
      const displayName = route?.ln || route?.an || rid || '—';
      const tariffCount = tariffCounts.get(rid) || 0;
      const runtimeCount = runtimeCounts.get(rid) || 0;
      return `
        <div class="insp-pattern-row" data-route-member-id="${escapeHtml(rid)}" title="Bu kaydı aç">
          <span class="route-code-badge">${escapeHtml(route?.s || rid || '—')}</span>
          <span class="insp-pattern-head">${escapeHtml(displayName)}</span>
          <span class="insp-pattern-count">${escapeHtml(typeLabel)} · ${tariffCount.toLocaleString(getLocale())}/${runtimeCount.toLocaleString(getLocale())}</span>
        </div>`;
    }).join('');
    return `<div class="info-inspector-block">
      <div class="info-inspector-block-title">Alt kayıtlar</div>
      <div class="insp-pattern-list">${rows}</div>
    </div>`;
  }

  function buildStopsTrayHtml(stops) {
    if (!stops.length) return '';
    const rows = stops.map((s, i) => `
      <div class="insp-stop-row">
        <span class="insp-stop-seq">${i + 1}</span>
        <span class="insp-stop-name">${escapeHtml(s.name)}</span>
        <span class="insp-stop-dep">${Number.isFinite(s.dep) ? formatSecsToHHMM(s.dep) : '—'}</span>
      </div>`).join('');
    return `<div class="info-inspector-block insp-stops-tray">
      <div class="info-inspector-block-title">Duraklar <span class="insp-stops-count">(${stops.length})</span>
        <button type="button" class="insp-stops-close" data-info-action="close-stops">✕</button>
      </div>
      <div class="insp-stop-rows">${rows}</div>
    </div>`;
  }

  function buildTemporalControlHtml(dateValue, servicesDates) {
    const calBtn = servicesDates?.size
      ? `<button type="button" class="insp-svc-cal-btn" data-info-action="show-service-dates" title="Sefer olan günleri göster">📅</button>
         <div class="insp-service-dates-popup hidden" id="insp-service-dates-popup"></div>`
      : '';
    return `<div class="insp-temporal-ctrl">
      <label class="insp-temporal-label">Çalışma günü</label>
      <div class="insp-date-wrap">
        <input type="date" class="insp-date-input" id="insp-date-input" value="${escapeHtml(dateValue || '')}">
        ${calBtn}
      </div>
    </div>`;
  }

  function getActiveDatesForRoute(serviceIds, calendarRows, calendarDateRows) {
    const dates = new Set();
    const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const row of (calendarRows || [])) {
      if (!serviceIds.has(String(row.service_id || ''))) continue;
      const s = String(row.start_date || ''), e = String(row.end_date || '');
      if (s.length !== 8 || e.length !== 8) continue;
      const startMs = Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
      const endMs = Date.UTC(+e.slice(0, 4), +e.slice(4, 6) - 1, +e.slice(6, 8));
      for (let ms = startMs; ms <= endMs; ms += 86400000) {
        const dt = new Date(ms);
        if (String(row[DOW[dt.getUTCDay()]]) !== '1') continue;
        const y = dt.getUTCFullYear(), mo = String(dt.getUTCMonth() + 1).padStart(2, '0'), d = String(dt.getUTCDate()).padStart(2, '0');
        dates.add(`${y}-${mo}-${d}`);
      }
    }
    for (const row of (calendarDateRows || [])) {
      if (!serviceIds.has(String(row.service_id || ''))) continue;
      const s = String(row.date || '');
      if (s.length !== 8) continue;
      const fmt = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      if (String(row.exception_type) === '1') dates.add(fmt);
      else if (String(row.exception_type) === '2') dates.delete(fmt);
    }
    return dates;
  }

  function getRuntimeMode() {
    if (window.IS_ELECTRON) return 'desktop';
    const pathname = String(window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    if (
      pathname.includes('/docs/app/')
      || pathname.endsWith('/app')
      || pathname.endsWith('/app/')
      || pathname.endsWith('/app/index.html')
    ) {
      return 'web-demo';
    }
    return 'root';
  }

  function getSampleManifestUrl() {
    const relativePath = getRuntimeMode() === 'web-demo'
      ? '../data/samples.json'
      : './docs/data/samples.json';
    return new URL(relativePath, window.location.href).toString();
  }

  function resolveFlagPath(countryCode) {
    return `./assets/flags/${String(countryCode || '').toLowerCase() || 'tr'}.svg`;
  }

  function clearLegacySampleCards() {
    const grid = getElement('lp-examples-grid');
    if (!grid) return;
    grid.innerHTML = '';
  }

  function getSampleLoadConfig(sample) {
    if (!sample) return null;
    const runtimeMode = getRuntimeMode();
    if (sample.loadStrategy === 'bundled') {
      if (!sample.localPath) return null;
      if (runtimeMode === 'desktop') {
        return {
          kind: 'local',
          path: new URL(`./${sample.localPath}`, window.location.href).toString(),
          fileName: sample.fileName || `${sample.city || 'sample'}.zip`,
        };
      }
      if (runtimeMode === 'web-demo') {
        return {
          kind: 'remote',
          url: new URL(`../${sample.localPath.replace(/^docs\//, '')}`, window.location.href).toString(),
          fileName: sample.fileName || `${sample.city || 'sample'}.zip`,
        };
      }
      return null;
    }
    if (sample.loadStrategy === 'remote' && runtimeMode === 'desktop' && sample.remoteUrl) {
      return {
        kind: 'remote',
        url: sample.remoteUrl,
        fileName: sample.fileName || `${sample.city || 'sample'}.zip`,
      };
    }
    return null;
  }

  function getSampleNote(sample) {
    const config = getSampleLoadConfig(sample);
    if (config) {
      return sample.note || translate(
        'sampleNoteBundled',
        getRuntimeMode() === 'web-demo'
          ? 'Bundled sample package for the web demo.'
          : 'Bundled sample package for the app.'
      );
    }
    if (sample.loadStrategy === 'remote') {
      return translate(
        window.IS_ELECTRON ? 'sampleNoteExternalElectron' : 'sampleNoteExternalWeb',
        window.IS_ELECTRON
          ? 'This card loads from an external source.'
          : 'This card is reference-only in the web demo; automatic loading is disabled.'
      );
    }
    return sample.note || '';
  }

  function renderSampleCards() {
    const grid = getElement('lp-examples-grid');
    if (!grid) return;
    grid.innerHTML = sampleManifest.map((sample) => {
      const config = getSampleLoadConfig(sample);
      const buttonLabel = config
        ? translate('landingExampleLoad', 'Load Sample')
        : translate('landingExampleExternal', 'External Source');
      const badgeLabel = sample.loadStrategy === 'bundled'
        ? translate('sampleBadgeBundled', 'Bundled Demo')
        : translate('sampleBadgeExternal', 'External');
      return `
        <article class="lp-example-card">
          <div class="lp-example-top">
            <div class="lp-example-place">
              <img class="lp-example-flag" src="${escapeHtml(resolveFlagPath(sample.countryCode))}" alt="${escapeHtml(`${sample.countryCode || ''} flag`)}">
              <span class="lp-example-city">${escapeHtml(sample.city)}</span>
            </div>
            <span class="lp-example-badge">${escapeHtml(badgeLabel)}</span>
          </div>
          <div class="lp-example-org">${escapeHtml(sample.agency)}</div>
          <div class="lp-example-note">${escapeHtml(getSampleNote(sample))}</div>
          <div class="lp-example-actions">
            <button class="lp-btn outline lp-example-load" ${config ? `data-kind="${escapeHtml(config.kind || '')}" ${config.url ? `data-url="${escapeHtml(config.url)}"` : ''} ${config.path ? `data-path="${escapeHtml(config.path)}"` : ''} data-name="${escapeHtml(config.fileName)}"` : 'disabled'}>${escapeHtml(buttonLabel)}</button>
            <a class="lp-example-source" href="${escapeHtml(sample.sourcePage || '#')}" target="_blank" rel="noreferrer">${escapeHtml(translate('landingExampleSource', 'Open Source'))}</a>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.lp-example-load').forEach((button) => {
      if (button.disabled) return;
      button.addEventListener('click', () => {
        const kind = button.dataset.kind || 'remote';
        const url = button.dataset.url || '';
        const path = button.dataset.path || '';
        const fileName = button.dataset.name || '';
        if (kind === 'local') {
          window.DataManager?.handleGTFSLocalPath?.(path, { fileName });
          return;
        }
        window.DataManager?.handleGTFSUrl?.(url, { fileName });
      });
    });
  }

  async function loadSampleManifest() {
    try {
      let manifest;
      // Electron'da fetch + file:// + cache option güvenilmez; IPC yolunu tercih et
      if (window.electronAPI?.readGTFSFile) {
        const href = window.location.href;
        const base = href.substring(0, href.lastIndexOf('/') + 1);
        const fullPath = decodeURIComponent(
          new URL('docs/data/samples.json', base).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\//g, '\\')
        );
        const result = await window.electronAPI.readGTFSFile(fullPath);
        if (!result?.success) throw new Error('IPC read failed');
        manifest = JSON.parse(new TextDecoder().decode(result.buffer));
      } else {
        const response = await fetch(getSampleManifestUrl());
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
        manifest = await response.json();
      }
      sampleManifest = Array.isArray(manifest?.samples) ? manifest.samples : [];
      renderSampleCards();
    } catch (error) {
      console.error('[samples] manifest could not be loaded:', error);
      const grid = getElement('lp-examples-grid');
      if (grid && !grid.innerHTML) {
        grid.innerHTML = '<div style="color:var(--text-muted,#8b949e);font-size:12px;padding:8px 0">Örnekler yüklenemedi.</div>';
      }
    }
  }

  function updateStartButtonState() {
    const ctx = getCtx();
    const { upload, start, openMap, openMapWrap, openMapNote } = getLandingElements();
    if (!ctx || !upload || !start) return;
    const hasTrips = getTrips(ctx).length > 0;
    start.disabled = !hasTrips;
    start.classList.toggle('hidden', !hasTrips);
    start.textContent = translate('landingStartButton', 'Open Calendar');
    if (openMap) {
      openMap.disabled = !hasTrips;
      openMap.textContent = `🗺️ ${translate('openMap', 'Open Map')}`;
    }
    if (openMapWrap) openMapWrap.classList.toggle('hidden', !hasTrips);
    if (openMapNote) {
      const activeServiceDate = ctx?.getActiveServiceDate?.() || '—';
      openMapNote.textContent = `Çalışma günü: ${activeServiceDate}`;
    }
    upload.textContent = hasTrips
      ? translate('uploadAnother', 'Upload Another GTFS ZIP')
      : translate('landingUploadButton', 'Upload GTFS ZIP');
    upload.disabled = false;
    upload.style.removeProperty('--load-pct');
    upload.classList.remove('is-loading');
  }

  function setLandingUploadState({ loading = false, pct = 0, label = '', routeCount = null, tripCount = null, stopCount = null } = {}) {
    const elements = getLandingElements();
    if (loading) {
      if (elements.upload) {
        const boundedPct = Math.max(0, Math.min(100, Math.round(pct)));
        elements.upload.disabled = true;
        elements.upload.classList.add('is-loading');
        elements.upload.style.setProperty('--load-pct', `${boundedPct}%`);
        elements.upload.textContent = `${label || translate('loading', 'Loading...')} %${boundedPct}`;
      }
      if (elements.start) {
        elements.start.disabled = true;
        elements.start.classList.add('hidden');
      }
      if (elements.openMap) {
        elements.openMap.disabled = true;
      }
      if (elements.openMapWrap) {
        elements.openMapWrap.classList.add('hidden');
      }
      if (routeCount !== null) setText(elements.route, Number(routeCount).toLocaleString(getLocale()));
      if (tripCount !== null) setText(elements.trip, Number(tripCount).toLocaleString(getLocale()));
      if (stopCount !== null) setText(elements.stop, Number(stopCount).toLocaleString(getLocale()));
      return;
    }
    updateStartButtonState();
  }

  function gtfsDateToDisplay(yyyymmdd) {
    const s = String(yyyymmdd || '');
    if (s.length !== 8) return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  function computeFeedCoverage(calendarRows) {
    let minDate = '';
    let maxDate = '';
    for (const row of (calendarRows || [])) {
      const s = String(row.start_date || '');
      const e = String(row.end_date || '');
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    }
    return { minDate, maxDate };
  }

  function renderLandingImportSummary(ctx) {
    const summaryEl = getElement('lp-import-summary');
    if (!summaryEl) return;
    const capped = ctx.getCapped?.() || false;
    const totalTrips = ctx.getTotalTrips?.() || 0;
    const tripCap = ctx.getTripCap?.();
    const missingShapes = ctx.getMissingShapeRouteCount?.() || 0;
    const calendarRows = ctx.getCalendarRows?.() || [];
    const { minDate, maxDate } = computeFeedCoverage(calendarRows);
    const lines = [];
    if (minDate && maxDate) {
      lines.push(`<span class="lp-summary-item">📅 ${gtfsDateToDisplay(minDate)} — ${gtfsDateToDisplay(maxDate)}</span>`);
    }
    if (capped && Number.isFinite(tripCap)) {
      lines.push(`<span class="lp-summary-item lp-summary-warn">⚠️ ${totalTrips.toLocaleString(getLocale())} seferden ${tripCap.toLocaleString(getLocale())} tanesi yüklendi</span>`);
    }
    if (missingShapes > 0) {
      lines.push(`<span class="lp-summary-item lp-summary-muted">〰️ ${missingShapes.toLocaleString(getLocale())} hat şekilsiz (durak bazlı)</span>`);
    }
    summaryEl.innerHTML = lines.join('');
    toggleHidden(summaryEl, lines.length === 0);
  }

  function updateLandingPageReports() {
    const ctx = getCtx();
    if (!ctx) return;
    const trips = getTrips(ctx);
    const stops = getStops(ctx);
    const elements = getLandingElements();
    if (!trips || !trips.length) {
      setText(elements.route, '--');
      setText(elements.trip, '--');
      setText(elements.stop, '--');
      updateStartButtonState();
      return;
    }
    const routeSet = new Set();
    for (let index = 0; index < trips.length; index++) routeSet.add(trips[index].s);
    setText(elements.route, routeSet.size.toLocaleString(getLocale()));
    setText(elements.trip, trips.length.toLocaleString(getLocale()));
    setText(elements.stop, (stops ? stops.length : 0).toLocaleString(getLocale()));
    renderLandingImportSummary(ctx);
    updateStartButtonState();
    try {
      if (sessionStorage.getItem(WEBGL_RECOVERY_MAP_FLAG) === '1') {
        sessionStorage.removeItem(WEBGL_RECOVERY_MAP_FLAG);
        ctx?.setActiveWorkspace?.('analiz');
        toggleUI(true);
      }
    } catch (_) {}
  }

  function toggleUI(showMap) {
    const lp = getElement('landing-page');
    const sidebar = getElement('sidebar');
    const homeBtn = getElement('home-toggle-btn');
    const overlay = getElement('loading-overlay');
    const ctx = getCtx();
    if (showMap) {
      setLandingMode(false);
      enableWorkspaceButtons();
      applyWorkspaceState(ctx?.getActiveWorkspace?.() || 'harita');
      toggleHidden(lp, true);
      toggleHidden(sidebar, false);
      toggleHidden(homeBtn, false);
      toggleHidden(overlay, true);
      triggerResize();
      setTimeout(() => {
        try {
          ctx?.mapgl?.resize?.();
          ctx?.refreshLayersNow?.();
        } catch (_) {}
      }, 0);
      setTimeout(() => {
        try {
          ctx?.mapgl?.resize?.();
          ctx?.refreshLayersNow?.();
        } catch (_) {}
      }, 150);
      return true;
    }

    closeMapOnlyUi();
    setLandingMode(true);
    toggleHidden(lp, false);
    toggleHidden(sidebar, true);
    toggleHidden(homeBtn, true);
    updateLandingPageReports();
    return true;
  }

  function setWorkspace(workspace, options = {}) {
    const ctx = getCtx();
    const prevWorkspace = ctx?.getActiveWorkspace?.() || 'harita';
    const normalized = applyWorkspaceState(workspace);
    if (prevWorkspace === 'harita' && normalized !== 'harita') closeMapOnlyUi();
    ctx?.setActiveWorkspace?.(normalized);
    updateActiveServiceDateBadge();
    renderInfoWorkspaceOverview();
    renderInfoServiceSummary();
    renderInfoRouteList(getElement('info-route-filter')?.value || '');
    renderInfoStopList(getElement('info-stop-filter')?.value || '');
    if (!options.skipResize && !document.body?.classList.contains('landing-mode')) {
      triggerResize();
    }
    return normalized;
  }

  function bindLandingControls() {
    getElement('lp-btn-upload')?.addEventListener('click', () => {
      const tmp = document.createElement('input');
      tmp.type = 'file';
      tmp.accept = '.zip';
      tmp.style.display = 'none';
      document.body.appendChild(tmp);
      tmp.addEventListener('change', (ev) => {
        const file = ev.target?.files?.[0];
        if (file) window.DataManager?.handleGTFSFile?.(file);
        document.body.removeChild(tmp);
      });
      tmp.click();
    });
    getElement('lp-btn-url')?.addEventListener('click', () => {
      window.DataManager?.handleGTFSUrl?.();
    });
    getElement('lp-gtfs-url')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        window.DataManager?.handleGTFSUrl?.();
      }
    });
    getElement('lp-btn-start')?.addEventListener('click', () => {
      const ctx = getCtx();
      if (!getTrips(ctx).length) return;
      ctx?.setActiveWorkspace?.('analiz');
      toggleUI(true);
    });
    getElement('lp-btn-open-map')?.addEventListener('click', () => {
      const ctx = getCtx();
      if (!getTrips(ctx).length) return;
      ctx?.setActiveWorkspace?.('harita');
      toggleUI(true);
    });
    getElement('home-toggle-btn')?.addEventListener('click', () => toggleUI(false));
  }

  function bindWorkspaceControls() {
    document.querySelectorAll('[data-workspace]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        setWorkspace(button.dataset.workspace || 'harita');
      });
    });
  }

  function enableWorkspaceButtons() {
    ['workspace-analysis-btn'].forEach((id) => {
      const btn = getElement(id);
      if (btn) btn.removeAttribute('disabled');
    });
  }

  const SETTINGS_KEY = 'gtfs-city-settings';

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (_) { return {}; }
  }

  function saveSettings(patch) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...patch })); } catch (_) {}
  }

  function applyMapTheme(theme) {
    const ctx = getCtx();
    if (!ctx) return;
    const THEMES = {
      dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_key',
    };
    const url = THEMES[theme] || THEMES.dark;
    try { ctx.mapgl?.setStyle?.(url); } catch (_) {}
  }

  function bindSettingsControls() {
    const settings = loadSettings();

    const themeSelect = getElement('settings-map-theme');
    if (themeSelect) {
      themeSelect.value = settings.mapTheme || 'dark';
      themeSelect.addEventListener('change', () => {
        saveSettings({ mapTheme: themeSelect.value });
        applyMapTheme(themeSelect.value);
      });
    }

    const timeFormatSelect = getElement('settings-time-format');
    if (timeFormatSelect) {
      timeFormatSelect.value = settings.timeFormat || '24';
      timeFormatSelect.addEventListener('change', () => {
        saveSettings({ timeFormat: timeFormatSelect.value });
      });
    }

    const weekStartSelect = getElement('settings-week-start');
    if (weekStartSelect) {
      weekStartSelect.value = settings.weekStart != null ? String(settings.weekStart) : '1';
      weekStartSelect.addEventListener('change', () => {
        saveSettings({ weekStart: Number(weekStartSelect.value) });
      });
    }

    const langSelect = getElement('settings-language');
    if (langSelect) {
      langSelect.value = window.I18n?.getLanguage?.() || settings.language || 'tr';
      langSelect.addEventListener('change', () => {
        saveSettings({ language: langSelect.value });
        window.I18n?.setLanguage?.(langSelect.value);
        window.dispatchEvent(new CustomEvent('app-language-change'));
      });
    }
  }

  function syncLandingSourceControls() {
    const isElectron = !!window.IS_ELECTRON;
    const linkNote = getElement('lp-link-note');
    toggleHidden(getElement('lp-link-row'), false);
    toggleHidden(linkNote, false);
    if (linkNote) {
      linkNote.textContent = translate(
        isElectron ? 'linkNote' : 'linkNoteWeb',
        isElectron
          ? 'Only HTTPS GTFS ZIP links are accepted. External link safety is the user responsibility.'
          : 'External links may be blocked by CORS in the web demo. Use the built-in sample data cards.'
      );
    }
    renderSampleCards();
  }

  function initPlatformBadge() {
    const badge = getElement('platform-badge');
    if (!badge) return;
    if (window.IS_ELECTRON) {
      window.electronAPI?.getAppInfo?.().then((info) => {
        badge.textContent = `${translate('platformElectron', 'ELECTRON')} / ${(info?.platform || '').toUpperCase()}`;
        badge.className = 'platform-badge electron';
      }).catch(() => {
        badge.textContent = translate('platformElectron', 'ELECTRON');
        badge.className = 'platform-badge electron';
      });
    } else {
      badge.textContent = translate('platformWeb', 'WEB BROWSER');
      badge.className = 'platform-badge web';
    }
  }

  function bindStyleControls() {
    getElement('tog-trail')?.addEventListener('change', (event) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.setShowTrail(event.target.checked);
      ctx.refreshLayersNow();
    });

    document.querySelectorAll('.sstyle').forEach((button) => {
      button.addEventListener('click', () => {
        const ctx = getCtx();
        if (!ctx) return;
        document.querySelectorAll('.sstyle').forEach((entry) => entry.classList.remove('active'));
        button.classList.add('active');
        ctx.setCurrentMapStyle(button.dataset.s);
        ctx.updateDayNight();
      });
    });

    const sidebar = getElement('sidebar');
    const sidebarToggle = getElement('sidebar-toggle');
    if (sidebar && sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        sidebarToggle.textContent = collapsed ? '>' : '<';
        triggerResize(305);
      });
    }
  }

  function init() {
    setLandingMode(!getElement('landing-page')?.classList.contains('hidden'));
    applyWorkspaceState(getCtx()?.getActiveWorkspace?.() || 'harita');
    clearLegacySampleCards();
    renderInfoWorkspaceStaticText();
    bindLandingControls();
    bindWorkspaceControls();
    bindInfoWorkspaceControls();
    bindStyleControls();
    bindSettingsControls();
    initPlatformBadge();
    syncLandingSourceControls();
    loadSampleManifest();
    updateStartButtonState();
    window.addEventListener('app-language-change', () => {
      updateStartButtonState();
      updateLandingPageReports();
      syncLandingSourceControls();
      updateActiveServiceDateBadge();
      renderSampleCards();
      renderInfoWorkspaceOverview();
      renderInfoServiceSummary();
      renderInfoInspector();
      renderInfoRouteList(getElement('info-route-filter')?.value || '');
      renderInfoStopList(getElement('info-stop-filter')?.value || '');
    });
    window.addEventListener('app-runtime-data-change', renderInfoWorkspaceOverview);
    window.addEventListener('app-runtime-data-change', renderInfoServiceSummary);
    window.addEventListener('app-runtime-data-change', () => { calendarState.year = null; calendarState.mode = 'year'; calendarState.day = null; renderInfoCalendar(); });
    window.addEventListener('app-service-date-change', (ev) => {
      updateActiveServiceDateBadge();
      const newDate = ev?.detail?.activeServiceDate || getCtx()?.getActiveServiceDate?.() || '';
      if (newDate) {
        const ymd = newDate.length === 10
          ? { y: parseInt(newDate.slice(0,4)), m: parseInt(newDate.slice(5,7)), d: parseInt(newDate.slice(8,10)) }
          : gtfsDateToYmd(newDate);
        const dateKey = ymd ? ymdToDateStr(ymd.y, ymd.m, ymd.d) : '';
        if (dateKey && dateKey !== calendarState.selectedDate) {
          calendarState.selectedDate = dateKey;
          if (ymd) {
            calendarState.year = ymd.y;
            calendarState.month = ymd.m;
            calendarState.day = ymd.d;
          }
        }
      }
      renderInfoCalendar();
      renderInfoServiceSummary();
      renderInfoWorkspaceOverview();
      renderInfoInspector();
    });
    window.addEventListener('app-runtime-data-change', renderInfoInspector);
    window.addEventListener('app-runtime-data-change', () => renderInfoRouteList(getElement('info-route-filter')?.value || ''));
    window.addEventListener('app-runtime-data-change', () => renderInfoStopList(getElement('info-stop-filter')?.value || ''));
    window.addEventListener('app-selection-change', () => {
      inspectorState.stopsTrayOpen = false;
      inspectorState.selectedPatternTripId = null;
      inspectorState.dirFilter = null;
      renderInfoInspector();
      renderInfoRouteList(getElement('info-route-filter')?.value || '');
      renderInfoStopList(getElement('info-stop-filter')?.value || '');
    });
    window.addEventListener('app-workspace-change', renderInfoInspector);
    renderInfoWorkspaceOverview();
    renderInfoServiceSummary();
    renderInfoInspector();
    renderInfoRouteList(getElement('info-route-filter')?.value || '');
    renderInfoStopList(getElement('info-stop-filter')?.value || '');
    updateActiveServiceDateBadge();
    setTimeout(updateLandingPageReports, 1500);
  }

  return {
    updateLandingPageReports,
    setLandingUploadState,
    setWorkspace,
    toggleUI,
    bindLandingControls,
    bindStyleControls,
    initPlatformBadge,
    init,
  };
})();
