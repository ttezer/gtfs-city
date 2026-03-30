window.CityManager = (function () {
  let initialized = false;

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
    if (visible && name) name.textContent = `${cityName} y?kleniyor...`;
  }

  function slugifyCityId(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9??????]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildScannedCity(city) {
    const name = city?.name || city?.id || 'Yeni ?ehir';
    return {
      id: slugifyCityId(city?.id || name),
      name,
      flag: '???',
      center: city?.center || null,
      zoom: city?.zoom || 11.5,
      pitch: city?.pitch || 52,
      bearing: city?.bearing || 0,
      dataFiles: [],
      gtfsZip: city?.gtfsZip || null,
      note: city?.zipSize ? `${Math.round(city.zipSize / (1024 * 1024))} MB haz?r GTFS` : 'Haz?r GTFS',
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

  function isCityVisible(city) {
    const ctx = getCtx();
    return ctx ? !ctx.hiddenCities.has(city.id) : true;
  }

  function getFirstVisibleCity() {
    const ctx = getCtx();
    return ctx ? ctx.CITIES.find(isCityVisible) || null : null;
  }

  function buildCityList() {
    const ctx = getCtx();
    const list = document.getElementById('city-list');
    if (!ctx || !list) return;

    list.parentElement?.classList.toggle('hidden', ctx.CITIES.length === 0);
    list.innerHTML = '';
    ctx.CITIES.forEach((city) => {
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
      div.innerHTML = `${activeIndicator}${deleteBtn}<span class="city-flag">${city.flag}</span><div class="city-info"><div class="city-name">${cityName}</div><div class="city-note">${cityNote}</div></div><label class="city-visibility-toggle" title="Şehri göster / gizle"><input type="checkbox" id="${toggleId}" data-city-visible="${city.id}" ${visible ? 'checked' : ''}><span>Görünür</span></label>`;
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
      const payload = ctx.uploadedGtfsCities.get(city.id);
      if (payload) loadSuccess = await ctx.loadGtfsIntoSim(payload.files, payload.fileName);
      else clearServiceSelectionUi();
    } else if (city.source === 'builtin') {
      let loaded = false;
      try {
        const payload = await ctx.getBuiltinGtfsPayload(city);
        if (payload) loaded = await ctx.loadGtfsIntoSim(payload.files, payload.fileName);
      } catch (error) {
        console.warn('[Builtin GTFS] y?klenemedi:', error);
      }
      if (!loaded && ctx.AppState.baseRuntimeData?._cityId === city.id) {
        clearServiceSelectionUi();
        ctx.applyGtfsRuntimeData(ctx.captureRuntimeDataSnapshot(ctx.AppState.baseRuntimeData));
      }
      loadSuccess = loaded;
    } else {
      ctx.setActiveServiceOptions(ctx.buildServiceOptions(ctx.AppState.calendarRows, ctx.AppState.calendarDateRows));
      let ids = new Set();
      if (ctx.AppState.calendarRows.length || ctx.AppState.calendarDateRows.length) {
        const autoResult = ctx.autoSelectAndAdaptService(ctx.AppState.calendarRows, ctx.AppState.calendarDateRows);
        ctx.setActiveServiceId(autoResult.serviceId);
        ids = autoResult.serviceIds || new Set([ctx.getActiveServiceId()]);
      } else {
        ctx.setActiveServiceId('all');
      }
      ctx.renderServiceDatePicker(ctx.AppState.calendarRows, ctx.AppState.calendarDateRows, ids);
      if (city.center) {
        ctx.mapgl.flyTo({ center: city.center, zoom: city.zoom, pitch: city.pitch || 52, bearing: city.bearing || 0, duration: 1500 });
      }
      loadSuccess = true;
    }

    if (loadSuccess && !city.center && ctx.AppState.stops?.length) {
      const lons = ctx.AppState.stops.map((stop) => stop[0]).filter(Number.isFinite);
      const lats = ctx.AppState.stops.map((stop) => stop[1]).filter(Number.isFinite);
      if (lons.length && lats.length) {
        city.center = [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
        ctx.mapgl.flyTo({ center: city.center, zoom: city.zoom || 11.5, pitch: city.pitch || 52, bearing: city.bearing || 0, duration: 1500 });
      }
    }

    buildCityList();
    setCityLoading(false);
    if (loadSuccess) ctx.toggleUI(true);
  }

  function toggleCityVisibility(cityId, visible) {
    const ctx = getCtx();
    if (!ctx) return;
    const city = ctx.CITIES.find((entry) => entry.id === cityId);
    if (!city) return;

    if (visible) ctx.hiddenCities.delete(cityId);
    else ctx.hiddenCities.add(cityId);

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
    const idx = ctx.CITIES.findIndex((entry) => entry.id === cityId);
    if (idx < 0) return;

    ctx.uploadedGtfsCities.delete(cityId);
    ctx.hiddenCities.delete(cityId);
    ctx.CITIES.splice(idx, 1);
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

    if (ctx.AppState.trips.length > 0) {
      console.log('[Init] Preloaded:', ctx.AppState.trips.length, 'sefer');
      ctx.applyGtfsRuntimeData({
        _cityId: city.id,
        nTRIPS: ctx.AppState.trips,
        nSHAPES: ctx.AppState.shapes,
        nSTOPS: ctx.AppState.stops,
        nSTOP_INFO: ctx.AppState.stopInfo,
        nSTOP_DEPS: ctx.AppState.stopDeps,
        nHOURLY_COUNTS: ctx.AppState.hourlyCounts,
        nHOURLY_HEAT: ctx.AppState.hourlyHeat,
      });
      if (ctx.AppState.calendarRows.length > 0) {
        ctx.setCalendarCache({ rows: ctx.AppState.calendarRows, dateRows: ctx.AppState.calendarDateRows });
        const autoResult = ctx.autoSelectAndAdaptService(ctx.AppState.calendarRows, ctx.AppState.calendarDateRows);
        ctx.setActiveServiceId(autoResult.serviceId);
        ctx.setActiveServiceIds(autoResult.serviceIds || new Set([autoResult.serviceId]));
        ctx.renderServiceDatePicker(ctx.AppState.calendarRows, ctx.AppState.calendarDateRows, ctx.getActiveServiceIds());
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
      console.warn('[Builtin GTFS] ba?lang?? y?klemesi ba?ar?s?z:', error);
    }

    if (ctx.AppState.baseRuntimeData?._cityId === city.id) {
      clearServiceSelectionUi();
      ctx.applyGtfsRuntimeData(ctx.captureRuntimeDataSnapshot(ctx.AppState.baseRuntimeData));
      buildCityList();
    }
  }

  async function init(initialCity) {
    if (initialized) return;
    initialized = true;
    buildCityList();
    if (initialCity) await initializeBuiltinCity(initialCity);
  }

  function handleNativeCityScan(cities) {
    const ctx = getCtx();
    if (!ctx || !cities?.length) return;
    cities.forEach((city) => {
      const normalized = buildScannedCity(city);
      if (!ctx.CITIES.find((entry) => entry.id === normalized.id || entry.gtfsZip === normalized.gtfsZip)) {
        ctx.CITIES.push(normalized);
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
