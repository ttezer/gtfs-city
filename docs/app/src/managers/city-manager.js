window.CityManager = (function () {
  let initialized = false;

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function getCtx() {
    return window.LegacyCityBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setCityLoading(visible, cityName = '') {
    const overlay = getElement('city-loading');
    const name = getElement('city-loading-name');
    overlay?.classList.toggle('hidden', !visible);
    if (!name) return;
    name.dataset.city = visible && cityName ? cityName : '';
    name.textContent = visible
      ? translate('cityLoading', '{city} yükleniyor...').replace('{city}', cityName || translate('cityLoadingGeneric', 'Yükleniyor...'))
      : translate('cityLoadingGeneric', 'Yükleniyor...');
  }

  function slugifyCityId(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9ığüşöç]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildScannedCity(city) {
    const name = city?.name || city?.id || 'Yeni Şehir';
    return {
      id: slugifyCityId(city?.id || name),
      name,
      flag: '📍',
      center: city?.center || null,
      zoom: city?.zoom || 11.5,
      pitch: city?.pitch || 52,
      bearing: city?.bearing || 0,
      dataFiles: [],
      gtfsZip: city?.gtfsZip || null,
      note: city?.zipSize ? `${Math.round(city.zipSize / (1024 * 1024))} MB hazır GTFS` : 'Hazır GTFS',
      source: 'builtin',
    };
  }

  async function activateFallbackCity(ctx) {
    const fallbackCity = getFirstVisibleCity();
    ctx.setActiveCity(null);
    if (fallbackCity) {
      await loadCity(fallbackCity);
      return;
    }
    ctx.clearRuntimeData();
    clearServiceSelectionUi();
    window.AppManager?.toggleUI?.(false);
    window.AppManager?.updateLandingPageReports?.();
    buildCityList();
  }

  function clearServiceSelectionUi() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.setActiveServiceOptions([]);
    ctx.setActiveServiceId('all');
    ctx.setActiveServiceIds(new Set());
    ctx.renderServiceDatePicker([], [], new Set());
  }

  function getTrips(ctx) {
    return ctx?.getTrips ? ctx.getTrips() : (ctx?.AppState?.trips || []);
  }

  function getStops(ctx) {
    return ctx?.getStops ? ctx.getStops() : (ctx?.AppState?.stops || []);
  }

  function getBaseRuntimeData(ctx) {
    return ctx?.getBaseRuntimeData ? ctx.getBaseRuntimeData() : ctx?.AppState?.baseRuntimeData;
  }

  function getCalendarRows(ctx) {
    return ctx?.getCalendarRows ? ctx.getCalendarRows() : (ctx?.AppState?.calendarRows || []);
  }

  function getCalendarDateRows(ctx) {
    return ctx?.getCalendarDateRows ? ctx.getCalendarDateRows() : (ctx?.AppState?.calendarDateRows || []);
  }

  function getShapes(ctx) {
    return ctx?.getShapes ? ctx.getShapes() : [];
  }

  function getStopInfo(ctx) {
    return ctx?.getStopInfo ? ctx.getStopInfo() : {};
  }

  function getStopDeps(ctx) {
    return ctx?.getStopDeps ? ctx.getStopDeps() : {};
  }

  function getHourlyCounts(ctx) {
    return ctx?.getHourlyCounts ? ctx.getHourlyCounts() : {};
  }

  function getHourlyHeat(ctx) {
    return ctx?.getHourlyHeat ? ctx.getHourlyHeat() : {};
  }

  function isCityVisible(city) {
    const ctx = getCtx();
    return ctx ? !ctx.isHiddenCity?.(city.id) : true;
  }

  function getFirstVisibleCity() {
    const ctx = getCtx();
    return ctx ? ctx.getCities?.().find(isCityVisible) || null : null;
  }

  function buildCityList() {
    const ctx = getCtx();
    const list = document.getElementById('city-list');
    if (!ctx || !list) return;
    const cities = ctx.getCities?.() || [];

    list.parentElement?.classList.toggle('hidden', cities.length === 0);
    list.innerHTML = '';
    cities.forEach((city) => {
      const div = document.createElement('div');
      const visible = isCityVisible(city);
      div.className = 'city-item'
        + (city.id === ctx.getActiveCity()?.id && visible ? ' active' : '')
        + (!visible ? ' is-hidden' : '');
      const deleteBtn = city.source === 'upload'
        ? `<button class="city-delete-btn" data-city-delete="${city.id}" title="Şehri sil">×</button>`
        : '';
      const activeIndicator = (city.id === ctx.getActiveCity()?.id && visible)
        ? '<div class="city-active-indicator"></div>'
        : '';
      const toggleId = `city-toggle-${city.id}`;
      const cityName = ctx.displayText ? ctx.displayText(city.name) : city.name;
      const cityNote = ctx.displayText ? ctx.displayText(city.note || '') : (city.note || '');
      div.innerHTML = `${activeIndicator}${deleteBtn}<span class="city-flag">${city.flag}</span><div class="city-info"><div class="city-name">${cityName}</div><div class="city-note">${cityNote}</div></div><label class="city-visibility-toggle" title="Şehri göster / gizle"><input type="checkbox" id="${toggleId}" data-city-visible="${city.id}" ${visible ? 'checked' : ''}><span>${translate('cityVisible', 'Görünür')}</span></label>`;
      div.onclick = (event) => {
        if (event.target.closest('[data-city-delete]') || event.target.closest('[data-city-visible]')) return;
        if (!isCityVisible(city)) return;
        loadCity(city);
      };
      list.appendChild(div);
    });

    list.querySelectorAll('[data-city-visible]').forEach((input) => {
      input.addEventListener('change', (event) => {
        event.stopPropagation();
        toggleCityVisibility(input.getAttribute('data-city-visible'), input.checked);
      });
    });
    list.querySelectorAll('[data-city-delete]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteUploadedCity(button.getAttribute('data-city-delete'));
      });
    });
  }

  async function loadCity(city) {
    const ctx = getCtx();
    if (!ctx || !isCityVisible(city)) return;
    if (city.id === ctx.getActiveCity()?.id) return;

    ctx.setActiveCity(city);
    setCityLoading(true, ctx.displayText ? ctx.displayText(city.name) : city.name);

    let loadSuccess = false;
    if (city.source === 'upload') {
      const payload = ctx.getUploadedCityPayload?.(city.id);
      if (payload) loadSuccess = await ctx.loadGtfsIntoSim(payload.files, payload.fileName);
      else clearServiceSelectionUi();
    } else if (city.source === 'builtin') {
      let loaded = false;
      try {
        const payload = await ctx.getBuiltinGtfsPayload(city);
        if (payload) loaded = await ctx.loadGtfsIntoSim(payload.files, payload.fileName);
      } catch (error) {
        console.warn('[Builtin GTFS] yüklenemedi:', error);
      }
      const baseRuntimeData = getBaseRuntimeData(ctx);
      if (!loaded && baseRuntimeData?._cityId === city.id) {
        clearServiceSelectionUi();
        ctx.applyGtfsRuntimeData(ctx.captureRuntimeDataSnapshot(baseRuntimeData));
      }
      loadSuccess = loaded;
    } else {
      const calendarRows = getCalendarRows(ctx);
      const calendarDateRows = getCalendarDateRows(ctx);
      ctx.setActiveServiceOptions(ctx.buildServiceOptions(calendarRows, calendarDateRows));
      let ids = new Set();
      if (calendarRows.length || calendarDateRows.length) {
        const autoResult = ctx.autoSelectAndAdaptService(calendarRows, calendarDateRows);
        ctx.setActiveServiceId(autoResult.serviceId);
        ids = autoResult.serviceIds || new Set([ctx.getActiveServiceId()]);
      } else {
        ctx.setActiveServiceId('all');
      }
      ctx.renderServiceDatePicker(calendarRows, calendarDateRows, ids);
      if (city.center) {
        ctx.getMap?.()?.flyTo?.({ center: city.center, zoom: city.zoom, pitch: city.pitch || 52, bearing: city.bearing || 0, duration: 1500 });
      }
      loadSuccess = true;
    }

    const stops = getStops(ctx);
    if (loadSuccess && !city.center && stops?.length) {
      const lons = stops.map((stop) => stop[0]).filter(Number.isFinite);
      const lats = stops.map((stop) => stop[1]).filter(Number.isFinite);
      if (lons.length && lats.length) {
        city.center = [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
        ctx.getMap?.()?.flyTo?.({ center: city.center, zoom: city.zoom || 11.5, pitch: city.pitch || 52, bearing: city.bearing || 0, duration: 1500 });
      }
    }

    buildCityList();
    setCityLoading(false);
    if (loadSuccess) ctx.toggleUI(true);
  }

  function toggleCityVisibility(cityId, visible) {
    const ctx = getCtx();
    if (!ctx) return;
    const city = ctx.findCityById?.(cityId);
    if (!city) return;

    if (visible) ctx.showCity?.(cityId);
    else ctx.hideCity?.(cityId);

    if (!visible) {
      if (ctx.getActiveCity()?.id === cityId) {
        activateFallbackCity(ctx);
      }
    } else if (!ctx.getActiveCity()) {
      loadCity(city);
    }

    buildCityList();
  }

  async function deleteUploadedCity(cityId) {
    const ctx = getCtx();
    if (!ctx) return;
    const city = ctx.findCityById?.(cityId);
    if (!city) return;

    ctx.deleteUploadedCityPayload?.(cityId);
    ctx.showCity?.(cityId);
    ctx.removeCityById?.(cityId);
    if (ctx.getActiveCity()?.id === cityId) {
      await activateFallbackCity(ctx);
      return;
    }
    buildCityList();
    window.AppManager?.updateLandingPageReports?.();
  }

  async function initializeBuiltinCity(city) {
    const ctx = getCtx();
    if (!ctx || !city || city.source !== 'builtin') return;

    const trips = getTrips(ctx);
    const calendarRows = getCalendarRows(ctx);
    const calendarDateRows = getCalendarDateRows(ctx);
    const baseRuntimeData = getBaseRuntimeData(ctx);
    if (trips.length > 0) {
      console.log('[Init] Preloaded:', trips.length, 'sefer');
      ctx.applyGtfsRuntimeData({
        _cityId: city.id,
        nTRIPS: trips,
        nSHAPES: getShapes(ctx),
        nSTOPS: getStops(ctx),
        nSTOP_INFO: getStopInfo(ctx),
        nSTOP_DEPS: getStopDeps(ctx),
        nHOURLY_COUNTS: getHourlyCounts(ctx),
        nHOURLY_HEAT: getHourlyHeat(ctx),
      });
      if (calendarRows.length > 0) {
        ctx.setCalendarCache({ rows: calendarRows, dateRows: calendarDateRows });
        const autoResult = ctx.autoSelectAndAdaptService(calendarRows, calendarDateRows);
        ctx.setActiveServiceId(autoResult.serviceId);
        ctx.setActiveServiceIds(autoResult.serviceIds || new Set([autoResult.serviceId]));
        ctx.renderServiceDatePicker(calendarRows, calendarDateRows, ctx.getActiveServiceIds());
        if (autoResult.adapted) ctx.showToast(autoResult.reason || 'Takvim uyarlandı.', 'warning');
      }
      buildCityList();
      return;
    }

    try {
      const payload = await ctx.getBuiltinGtfsPayload(city);
      if (payload) {
        const loaded = await ctx.loadGtfsIntoSim(payload.files, payload.fileName);
        if (loaded) {
          buildCityList();
          return;
        }
      }
    } catch (error) {
      console.warn('[Builtin GTFS] başlangıç yüklemesi başarısız:', error);
    }

    if (baseRuntimeData?._cityId === city.id) {
      clearServiceSelectionUi();
      ctx.applyGtfsRuntimeData(ctx.captureRuntimeDataSnapshot(baseRuntimeData));
      buildCityList();
    }
  }

  async function init(initialCity) {
    if (initialized) return;
    initialized = true;
    buildCityList();
    window.addEventListener('app-language-change', () => {
      const name = getElement('city-loading-name');
      if (name?.dataset.city) setCityLoading(true, name.dataset.city);
      else setCityLoading(false);
      buildCityList();
    });
    if (initialCity) await initializeBuiltinCity(initialCity);
  }

  function handleNativeCityScan(cities) {
    const ctx = getCtx();
    if (!ctx || !cities?.length) return;
    cities.forEach((city) => {
      const normalized = buildScannedCity(city);
      const exists = (ctx.getCities?.() || []).some((entry) => entry.id === normalized.id || entry.gtfsZip === normalized.gtfsZip);
      if (!exists) {
        ctx.addCity?.(normalized);
      }
    });
    buildCityList();
  }

  return {
    isCityVisible,
    getFirstVisibleCity,
    buildCityList,
    loadCity,
    toggleCityVisibility,
    deleteUploadedCity,
    initializeBuiltinCity,
    handleNativeCityScan,
    init,
  };
})();
