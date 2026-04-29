window.UIManager = (function () {
  let initialized = false;
  let pinnedTooltipHtml = '';
  let preCinematicView = null;

  function getCtx() {
    return window.LegacyUIBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function normalizeRouteType(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(parsed) ? String(parsed) : String(value ?? '');
  }

  function getTrips(ctx) {
    return ctx?.getTrips ? ctx.getTrips() : (ctx?.TRIPS || []);
  }

  function getShapes(ctx) {
    return ctx?.getShapes ? ctx.getShapes() : (ctx?.SHAPES || []);
  }

  function getStops(ctx) {
    return ctx?.getStops ? ctx.getStops() : (ctx?.STOPS || []);
  }

  function getStopInfo(ctx) {
    return ctx?.getStopInfo ? ctx.getStopInfo() : (ctx?.STOP_INFO || {});
  }

  function getStopDeps(ctx) {
    return ctx?.getStopDeps ? ctx.getStopDeps() : (ctx?.STOP_DEPS || {});
  }

  function getStopNames(ctx) {
    return ctx?.getStopNames ? ctx.getStopNames() : (ctx?.stopNames || []);
  }

  function buildRouteCatalogKey(routeLike) {
    if (!routeLike || typeof routeLike !== 'object') return String(routeLike || '');
    return String(
      routeLike.k
      || routeLike.rid
      || `${routeLike.aid || 'na'}::${normalizeRouteType(routeLike.t)}::${routeLike.s || ''}`
    );
  }

  function buildRouteListSubtitle(route, routeMeta, duplicateShorts) {
    const hasDuplicateShort = (duplicateShorts.get(route.s) || 0) > 1;
    if (hasDuplicateShort) {
      const parts = [route.an, route.rid].filter(Boolean);
      return parts.join(' · ');
    }
    return routeMeta.longName || route.an || route.rid || '';
  }

  function showElement(element) {
    element?.classList.remove('hidden');
  }

  function hideElement(element) {
    element?.classList.add('hidden');
  }

  function showTooltipAt(x, y, html, pinned = false) {
    const tooltip = getElement('tooltip');
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.style.left = `${x + 16}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.innerHTML = html;
    pinnedTooltipHtml = pinned ? html : '';
  }

  function hideTooltip(force = false) {
    const tooltip = getElement('tooltip');
    if (!tooltip) return;
    if (!force && pinnedTooltipHtml) return;
    tooltip.style.display = 'none';
    if (force) pinnedTooltipHtml = '';
  }

  function openRoutePanel(routeMeta, typeMetaEntry) {
    const ctx = getCtx();
    if (!ctx) return;
    closeVehiclePanel();
    closeStopPanel();
    const panel = getElement('route-panel');
    const nameEl = getElement('route-panel-name');
    const metaEl = getElement('route-panel-meta');
    const detailsEl = getElement('route-panel-details');
    if (!panel || !nameEl || !metaEl || !detailsEl) return;
    const icon = ctx.displayText(typeMetaEntry?.i || '');
    const typeName = ctx.getLocalizedRouteTypeName
      ? ctx.getLocalizedRouteTypeName(routeMeta.type, typeMetaEntry?.n || '-')
      : ctx.displayText(typeMetaEntry?.n || '-');
    const stats = ctx.buildRoutePanelStats(routeMeta.short);
    const directionOptions = Array.isArray(stats.directionOptions) ? stats.directionOptions : [];
    const directionFilterHtml = directionOptions.length
      ? `
          <div class="rp-row">
            <span class="rp-label">${translate('routePanelDirectionFilter', 'Route Direction')}</span>
            <select id="route-direction-select" class="vp-btn" style="min-width:150px;padding:6px 10px;">
              <option value="">${translate('routePanelDirectionAll', 'All Directions')}</option>
              ${directionOptions.map((option) => `<option value="${option.value}" ${stats.selectedDirection === option.value ? 'selected' : ''}>${ctx.displayText(option.label)} (${option.count})</option>`).join('')}
            </select>
          </div>`
      : '';
    nameEl.textContent = `${icon} ${routeMeta.short}${routeMeta.longName ? ` · ${ctx.displayText(routeMeta.longName)}` : ''}`.trim();
    metaEl.textContent = `${typeName} · ${ctx.displayText(stats.directionLabel)}`;
    detailsEl.innerHTML = `
      <div class="route-panel-stack">
        <div class="route-panel-box">
          <div class="route-panel-box-title">${translate('routePanelSummary', 'Operations Summary')}</div>
          ${directionFilterHtml}
          <div class="rp-row"><span class="rp-label">${translate('routePanelServiceCalendar', 'Service Calendar')}</span><span class="rp-value">${ctx.getActiveServiceLabel()}</span></div>
          <div class="rp-row"><span class="rp-label">${translate('routePanelTripCount', 'Trip Count')}</span><span class="rp-value">${translate('routePanelTripsToday', '{count} trips today').replace('{count}', String(stats.totalTrips))}</span></div>
          <div class="rp-row"><span class="rp-label">${translate('routePanelServiceHours', 'Service Hours')}</span><span class="rp-value">${stats.firstTime} - ${stats.lastTime}</span></div>
          <div class="rp-row"><span class="rp-label">${translate('routePanelRouteLength', 'Route Length')}</span><span class="rp-value">${stats.routeLengthKm} km</span></div>
          <div class="rp-row"><span class="rp-label">${translate('routePanelAverageHeadway', 'Avg Headway')}</span><span class="rp-value">${ctx.formatHeadwayLabel(stats.averageHeadway)}</span></div>
        </div>
        <div class="route-panel-box">
          <div class="route-panel-box-title">${translate('routePanelDirectionDistribution', 'Direction Distribution')}</div>
          <div class="rp-text">${(stats.directionEntries || []).length
            ? stats.directionEntries.map(([label, count]) => `<div>${ctx.displayText(label)}: ${count}</div>`).join('')
            : translate('routePanelNoTripInfo', 'No trip information')}</div>
        </div>
      </div>`;
    const directionSelect = detailsEl.querySelector('#route-direction-select');
    if (directionSelect) {
      directionSelect.addEventListener('change', () => {
        const nextValue = directionSelect.value === '' ? null : Number.parseInt(directionSelect.value, 10);
        ctx.setSelectedRouteDirection(Number.isInteger(nextValue) ? nextValue : null);
        ctx.setFocusedStopIdsCache(null);
        ctx.invalidateMapCaches();
        buildStopList(document.getElementById('stop-list-filter')?.value || '');
        openRoutePanel(routeMeta, typeMetaEntry);
        ctx.refreshLayersNow();
      });
    }
    ctx.setSelectedEntity({ type: 'route', routeShort: routeMeta.short, routeId: routeMeta.rid || null });
    showElement(panel);
    setTimeout(() => panel.classList.add('open'), 10);
  }

  function closeRoutePanel() {
    const ctx = getCtx();
    const selectedEntity = ctx?.getSelectedEntity ? ctx.getSelectedEntity() : ctx?.selectedEntity;
    const panel = getElement('route-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => hideElement(panel), 260);
    }
    if (selectedEntity?.type === 'route') ctx.setSelectedEntity(null);
  }

  function clearFocusedRouteSelection(refresh = false) {
    const ctx = getCtx();
    if (!ctx) return;
    const focusedRoute = ctx.getFocusedRoute ? ctx.getFocusedRoute() : ctx.focusedRoute;
    if (!focusedRoute) {
      ctx.setRouteHighlightPath(null);
      closeRoutePanel();
      return;
    }
    ctx.setFocusedRoute(null);
    ctx.setFocusedRouteId?.(null);
    ctx.setSelectedRouteDirection(null);
    ctx.setFocusedStopIdsCache(null);
    ctx.setRouteHighlightPath(null);
    document.querySelectorAll('.route-item').forEach((el) => el.classList.remove('focused'));
    buildStopList(document.getElementById('stop-list-filter')?.value || '');
    closeRoutePanel();
    if (refresh) ctx.refreshLayersNow();
  }

  function handleHover(info) {
    const ctx = getCtx();
    if (!ctx) return;
    const canvas = ctx.getDeckCanvas();
    if (canvas) canvas.style.cursor = info?.object ? 'pointer' : 'default';

    if (!info?.object) {
      hideTooltip();
      return;
    }

    const obj = info.object;
    let html = '';
    if (Array.isArray(obj) && obj.length >= 3) {
      html = ctx.buildStopTooltipHtml(ctx.getStopMetaByArray(obj));
    } else if (obj?.s && obj?.t) {
      const routeMeta = ctx.getRouteMeta(obj.s, obj.t, obj.c, obj.ln || obj.h || '');
      html = ctx.buildRouteTooltipHtml(routeMeta, ctx.TYPE_META[routeMeta.type] || {});
    } else if (obj?.pos) {
      html = `<div class="tt-t">Yoğunluk</div><div class="tt-v">${obj.count} sefer</div>`;
    }

    if (html) showTooltipAt(info.x, info.y, html, false);
    else hideTooltip();
  }

  function handleClick(info) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.showIsochron) {
      const coord = info?.coordinate || (info?.lngLat && [info.lngLat.lng, info.lngLat.lat]);
      if (coord) {
        ctx.triggerIsochron(coord[0], coord[1]);
        return;
      }
    }
    if (!info?.object) {
      hideTooltip(true);
      clearFocusedRouteSelection(true);
      closeStopPanel();
      closeVehiclePanel();
      return;
    }

    const obj = info.object;
    if (Array.isArray(obj) && obj.length >= 3) {
      hideTooltip(true);
      closeRoutePanel();
      showStopArrivals(obj);
      return;
    }
    if (obj?.sid && obj?.pos) {
      hideTooltip(true);
    const si = getStopInfo(ctx)[obj.sid];
      if (si) showStopArrivals([si[0], si[1], si[2], obj.sid, si[2]]);
      return;
    }
    const tripObj = obj?.trip || obj;
    if (tripObj?.ts && tripObj?.d && tripObj?.s && tripObj?.t !== undefined) {
      hideTooltip(true);
      closeRoutePanel();
      const idx = ctx.findTripIdx(obj);
      if (idx >= 0) openVehiclePanel(idx);
      return;
    }
    if (obj?.s && obj?.t) {
      hideTooltip(true);
      focusRoute(obj);
    }
  }

  function openVehiclePanel(idx) {
    const ctx = getCtx();
    if (!ctx) return;
    closeStopPanel();
    clearFocusedRouteSelection();
    ctx.setSelectedTripIdx(idx);
    ctx.setSelectedEntity({ type: 'vehicle', tripIdx: idx });
    ctx.pauseSimulationForSelection('vehicle-panel');
    const panel = document.getElementById('vehicle-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('open'), 10);
    updateVehiclePanel();
    ctx.refreshLayersNow();
  }

  function closeVehiclePanel() {
    const ctx = getCtx();
    const selectedEntity = ctx?.getSelectedEntity ? ctx.getSelectedEntity() : ctx?.selectedEntity;
    const panel = document.getElementById('vehicle-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => panel.classList.add('hidden'), 260);
    }
    ctx?.setSelectedTripIdx(null);
    if (selectedEntity?.type === 'vehicle') ctx.setSelectedEntity(null);
    ctx?.releaseSelectionPause('vehicle-panel');
  }

  function updateVehiclePanel() {
    const ctx = getCtx();
    const selectedTripIdx = ctx?.getSelectedTripIdx ? ctx.getSelectedTripIdx() : ctx?.selectedTripIdx;
    if (!ctx || selectedTripIdx === null) return;
    const trip = getTrips(ctx)[selectedTripIdx];
    if (!trip) return;
    const panelState = ctx.buildVehiclePanelState(trip, selectedTripIdx, ctx.simTime);
    if (!panelState) return;
    const ids = ['vp-icon', 'vp-title', 'vp-subtitle', 'vp-speed', 'vp-headway', 'vp-progress', 'vp-next-stop', 'vp-eta', 'vp-trip-details', 'vp-stops-list', 'vp-follow-btn'];
    const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    if (Object.values(els).some((el) => !el)) return;
    els['vp-icon'].textContent = panelState.icon;
    els['vp-title'].textContent = panelState.title;
    els['vp-subtitle'].textContent = panelState.subtitle;
    els['vp-speed'].textContent = panelState.speed;
    els['vp-headway'].textContent = panelState.headway;
    els['vp-progress'].textContent = panelState.progress;
    els['vp-next-stop'].textContent = panelState.nextStopName;
    els['vp-eta'].textContent = panelState.eta;
    els['vp-trip-details'].innerHTML = (panelState.details || []).map((detail) => `
      <div class="drawer-row">
        <span class="drawer-label">${detail.label}</span>
        <span class="drawer-value">${detail.value}</span>
      </div>`).join('');
    els['vp-stops-list'].innerHTML = '';
    panelState.stops.forEach(({ name, time, current, passed }) => {
      const div = document.createElement('div');
      div.className = `vp-stop-item${current ? ' current' : passed ? ' passed' : ''}`;
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '8px';
      div.innerHTML = `<span class="vp-stop-dot"></span><span style="flex:1">${name}</span><span style="font-family:var(--font-mono); font-size:10px; opacity:0.7;">${time}</span>`;
      els['vp-stops-list'].appendChild(div);
    });
    els['vp-follow-btn'].textContent = panelState.followLabel;
  }

  function showStopArrivals(stop) {
    const ctx = getCtx();
    if (!ctx) return;
    closeVehiclePanel();
    clearFocusedRouteSelection();
    ctx.setActiveStopData(stop);
    const stopMeta = ctx.getStopMetaByArray(stop);
    ctx.setSelectedEntity(stopMeta?.sid ? { type: 'stop', sid: stopMeta.sid } : { type: 'stop' });
    renderStopPanel(stop);
    makeDraggable(document.getElementById('stop-panel'));
    ctx.refreshLayersNow();
  }

  function makeDraggable(el) {
    if (!el || el._draggable) return;
    el._draggable = true;
    let startX;
    let startY;
    let startLeft;
    let startTop;
    let dragging = false;
    const header = el.querySelector('#stop-panel-name') || el;
    header.style.cursor = 'grab';
    header.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      el.style.position = 'fixed';
      el.style.left = `${startLeft}px`;
      el.style.top = `${startTop}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, startLeft + dx))}px`;
      el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, startTop + dy))}px`;
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      header.style.cursor = 'grab';
    });
  }

  function renderStopPanel(stop) {
    const ctx = getCtx();
    if (!ctx) return;
    const stopMeta = ctx.getStopMetaByArray(stop);
    const panelName = document.getElementById('stop-panel-name');
    const table = document.getElementById('stop-arrivals-table');
    const panelMeta = document.getElementById('stop-panel-meta');
    const panel = document.getElementById('stop-panel');
    if (!panelName || !table || !panelMeta || !panel) return;
    document.getElementById('stop-panel-insights')?.remove();
    document.getElementById('stop-spark-wrap')?.remove();
    panelName.textContent = `${stopMeta.code} · ${stopMeta.name}`;

    let timeEl = document.getElementById('stop-panel-time');
    if (!timeEl) {
      timeEl = document.createElement('div');
      timeEl.id = 'stop-panel-time';
      timeEl.style.cssText = 'font-size:10px;color:var(--text-muted,#7d8590);margin-top:2px;';
      panelName.parentNode.insertBefore(timeEl, panelName.nextSibling);
    }
    timeEl.textContent = `${translate('stopPanelSimulationTime', 'Simulation time')}: ${ctx.secsToHHMM(ctx.simTime % 86400)}`;

    table.innerHTML = `<div class="sa-head"><span>${translate('stopPanelHeaderLine', 'Line')}</span><span>${translate('stopPanelHeaderDirection', 'Direction')}</span><span>${translate('stopPanelHeaderFirstVehicle', 'First Vehicle')}</span><span>${translate('stopPanelHeaderNextVehicle', 'Next Vehicle')}</span></div>`;
    const deps = stopMeta.sid ? getStopDeps(ctx)[stopMeta.sid] : null;
    if (!deps?.length) {
      panelMeta.textContent = translate('stopPanelNoServiceData', 'No trip data for this stop');
      table.innerHTML += `<div class="sa-empty">${translate('stopPanelNoServiceFound', 'No trips found for this stop.')}</div>`;
      panel.classList.remove('hidden');
      return;
    }
    const simMod = ctx.simTime % 86400;
    const rows = ctx.getStopRouteSummaries(stopMeta.sid, simMod);
    const dynamicHeadway = window.SimUtils?.computeDynamicHeadwaySeconds
      ? window.SimUtils.computeDynamicHeadwaySeconds(deps, simMod, ctx.HEADWAY_CFG, ctx.WAITING_CFG)
      : null;
    const stopHeadway = Number.isFinite(dynamicHeadway)
      ? dynamicHeadway
      : ctx.computeAverageHeadwaySeconds(deps);
    const routeCount = new Set(deps.map((dep) => dep[2] || getTrips(ctx)[dep[0]]?.s).filter(Boolean)).size;
    panelMeta.textContent = translate('stopPanelSummary', '{count} routes · Average headway {headway}')
      .replace('{count}', String(routeCount))
      .replace('{headway}', ctx.formatHeadwayLabel(stopHeadway));
    if (!rows.length) {
      table.innerHTML += `<div class="sa-empty">${translate('stopPanelNoDisplayRoutes', 'No routes available to display for this stop.')}</div>`;
      panel.classList.remove('hidden');
      return;
    }
    rows.slice(0, 20).forEach((route) => {
      const routeMeta = ctx.getRouteMeta(route.short, route.trip.t, route.trip.c, route.longName);
      const arrivalLabels = [0, 1].map((index) => {
        const arr = route.arrivals[index];
        if (!arr || !Number.isFinite(arr.diff)) return '<span class="sa-eta">-</span>';
        const mins = Math.round((arr.diff || 0) / 60);
        const cls = mins < 2 ? 'soon' : mins < 6 ? 'coming' : '';
        return `<span class="sa-eta ${cls}">${ctx.formatHeadwayLabel(arr.diff)}</span>`;
      });
      const directionLabel = ctx.displayText(route.longName || route.trip.h || '—');
      const row = document.createElement('div');
      row.className = 'sa-row';
      row.innerHTML = `
        <span class="sa-route" style="color:${ctx.colorToCss(routeMeta.color)}">${routeMeta.short}</span>
        <span class="sa-dest">${directionLabel}</span>
        ${arrivalLabels[0]}
        ${arrivalLabels[1]}
      `;
      table.appendChild(row);
    });
    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('open'), 10);

    const waitMinutes = stopHeadway && Number.isFinite(stopHeadway) ? Math.round(stopHeadway / 120) : null;
    let insightWrap = document.getElementById('stop-panel-insights');
    if (!insightWrap) {
      insightWrap = document.createElement('div');
      insightWrap.id = 'stop-panel-insights';
      panel.querySelector('.stop-panel-inner').insertBefore(insightWrap, table);
    }
    insightWrap.className = 'stop-insight-grid';
    insightWrap.innerHTML = `
      <div class="stop-insight-card">
        <span class="stop-insight-k">${translate('stopPanelAverageWait', 'Avg Wait')}</span>
        <span class="stop-insight-v">${waitMinutes != null ? `${waitMinutes} dk` : '—'}</span>
        <span class="stop-insight-s">${ctx.formatHeadwayLabel(stopHeadway)} headway</span>
      </div>`;
    document.getElementById('stop-spark-wrap')?.remove();
  }


  function closeStopPanel() {
    const ctx = getCtx();
    const selectedEntity = ctx?.getSelectedEntity ? ctx.getSelectedEntity() : ctx?.selectedEntity;
    const panel = document.getElementById('stop-panel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.classList.add('hidden'), 400);
    ctx?.setActiveStopData(null);
    if (selectedEntity?.type === 'stop') ctx.setSelectedEntity(null);
  }

  function buildRouteList() {
    const ctx = getCtx();
    if (!ctx) return;
    const routeListEl = document.getElementById('route-list');
    if (!routeListEl) return;
    const byType = {};
    const routeCatalog = Array.isArray(ctx.getRouteCatalog?.()) ? ctx.getRouteCatalog() : [];
    const routeSourceMap = new Map();
    const upsertRouteLike = (routeLike) => {
      if (!routeLike) return;
      const shortName = String(routeLike.s || '').trim();
      if (!shortName) return;
      const key = buildRouteCatalogKey(routeLike);
      const current = routeSourceMap.get(key) || {};
      routeSourceMap.set(key, {
        ...current,
        ...routeLike,
        k: current.k || routeLike.k || routeLike.rid || key,
        rid: current.rid || routeLike.rid || routeLike.k || '',
        aid: current.aid || routeLike.aid || '',
        an: current.an || routeLike.an || '',
        s: shortName,
        c: routeLike.c ?? current.c,
        t: routeLike.t ?? current.t,
        ln: current.ln || routeLike.ln || routeLike.h || '',
      });
    };

    routeCatalog.forEach(upsertRouteLike);
    getShapes(ctx).forEach(upsertRouteLike);
    const seenTripRouteKeys = new Set();
    getTrips(ctx).forEach((trip) => {
      const routeLike = {
        k: trip.rid || `${trip.aid || 'na'}::${normalizeRouteType(trip.t)}::${trip.s || ''}`,
        rid: trip.rid || '',
        aid: trip.aid || '',
        an: '',
        s: trip.s || '',
        c: trip.c,
        t: trip.t,
        ln: trip.ln || trip.h || '',
      };
      const routeKey = buildRouteCatalogKey(routeLike);
      if (seenTripRouteKeys.has(routeKey)) return;
      seenTripRouteKeys.add(routeKey);
      upsertRouteLike(routeLike);
    });

    const routeSource = [...routeSourceMap.values()];
    const seenRoutes = new Set();
    const duplicateShorts = new Map();
    routeSource.forEach((routeLike) => {
      const shortName = (routeLike.s || '').trim();
      if (!shortName) return;
      duplicateShorts.set(shortName, (duplicateShorts.get(shortName) || 0) + 1);
    });
    routeSource.forEach((routeLike) => {
      const type = normalizeRouteType(routeLike.t);
      const shortName = (routeLike.s || '').trim();
      if (!shortName) return;
      const dedupeKey = buildRouteCatalogKey(routeLike);
      if (seenRoutes.has(dedupeKey)) return;
      seenRoutes.add(dedupeKey);
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        k: dedupeKey,
        rid: routeLike.rid || routeLike.k || '',
        aid: routeLike.aid || '',
        an: routeLike.an || '',
        s: shortName,
        c: routeLike.c,
        t: type,
        ln: routeLike.ln || '',
      });
    });
    routeListEl.innerHTML = '';
    const presentTypes = Object.keys(byType);
    const orderedTypes = [
      ...Object.keys(ctx.TYPE_META).filter((type) => presentTypes.includes(type)),
      ...presentTypes.filter((type) => !Object.prototype.hasOwnProperty.call(ctx.TYPE_META, type)).sort(),
    ];
    orderedTypes.forEach((type) => {
      if (!byType[type]) return;
      byType[type].sort((a, b) => a.s.localeCompare(b.s, 'tr')).forEach((route) => {
        const routeMeta = ctx.getRouteMeta(route.s, type, route.c, route.ln);
        const div = document.createElement('div');
        div.className = 'route-item';
        div.dataset.routeKey = route.k || route.s;
        div.dataset.short = route.s;
        div.dataset.type = normalizeRouteType(type);
        div.innerHTML = `<div class="ri-bar" style="background:${ctx.colorToCss(routeMeta.color)}"></div>
          <div class="ri-info"><div class="ri-name"></div><div class="ri-type"></div><div class="ri-long"></div></div>
          <input type="checkbox" class="ri-check" ${ctx.isRouteHidden?.(route) ? '' : 'checked'} data-short="${route.s}">`;
        div.querySelector('.ri-name').textContent = routeMeta.short;
        div.querySelector('.ri-type').textContent = ctx.getLocalizedRouteTypeName
          ? ctx.getLocalizedRouteTypeName(type, ctx.TYPE_META[type]?.n || translate('routeTypeUnknown', 'Hat'))
          : (ctx.TYPE_META[type]?.n || translate('routeTypeUnknown', 'Hat'));
        div.querySelector('.ri-long').textContent = buildRouteListSubtitle(route, routeMeta, duplicateShorts);
        div.classList.toggle('hidden-route', ctx.isRouteHidden?.(route));
        div.onclick = (e) => {
          if (e.target.type === 'checkbox') return;
          focusRoute(route);
        };
        div.querySelector('.ri-check').onchange = (e) => {
          if (e.target.checked) ctx.showRoute?.(route);
          else {
            ctx.hideRoute?.(route);
            ctx.setRouteHighlightPath(null);
            const focusedRoute = ctx.getFocusedRoute ? ctx.getFocusedRoute() : ctx.focusedRoute;
            const focusedRouteId = ctx.getFocusedRouteId ? ctx.getFocusedRouteId() : null;
            if ((route.rid && focusedRouteId && focusedRouteId === route.rid) || (!route.rid && focusedRoute === route.s)) {
              clearFocusedRouteSelection();
            }
          }
          div.classList.toggle('hidden-route', !e.target.checked);
          ctx.invalidateMapCaches();
          buildStopList(document.getElementById('stop-list-filter')?.value || '');
          ctx.refreshLayersNow();
        };
        routeListEl.appendChild(div);
      });
    });
    const typeFilter = ctx.getTypeFilter ? ctx.getTypeFilter() : ctx.typeFilter;
    filterRouteListByType(typeFilter || 'all');
    if (ctx.AppState?.capped) {
      const note = document.createElement('div');
      note.className = 'route-list-cap-note';
      const loaded = (ctx.AppState.tripCap === Infinity ? ctx.AppState.trips.length : ctx.AppState.tripCap).toLocaleString('tr');
      const total = ctx.AppState.totalTrips.toLocaleString('tr');
      note.textContent = translate('routeListCapNote', `Hat listesi tam · sefer animasyonu ${loaded}/${total} (temsili alt küme)`);
      routeListEl.appendChild(note);
    }
  }

  function buildStopList(filter = '') {
    const ctx = getCtx();
    if (!ctx) return;
    const stopListEl = document.getElementById('stop-list');
    if (!stopListEl) return;
    const q = filter.trim().toLowerCase();
    const focusedRoute = ctx.getFocusedRoute ? ctx.getFocusedRoute() : ctx.focusedRoute;
    const stopSource = ctx.getFilteredStopsData
      ? ctx.getFilteredStopsData()
      : (focusedRoute
        ? (ctx.getFocusedStopsData()?.map((entry) => [entry.pos[0], entry.pos[1], entry.name || entry.sid, entry.sid, entry.name || entry.sid]) || [])
      : getStops(ctx));
    stopListEl.innerHTML = '';
    const stopsToFilter = focusedRoute ? stopSource : (q ? stopSource : stopSource.slice(0, 300));
    const matchedStops = stopsToFilter.filter((stop) => {
      const stopMeta = ctx.getStopMetaByArray(stop);
      return !q || stopMeta.name.toLowerCase().includes(q) || stopMeta.code.toLowerCase().includes(q);
    });
    (focusedRoute ? matchedStops : matchedStops.slice(0, 300))
      .forEach((stop) => {
        const stopMeta = ctx.getStopMetaByArray(stop);
        const item = document.createElement('div');
        item.className = 'stop-item';
        item.innerHTML = `<span class="stop-dot"></span><div class="stop-info"><div class="stop-name"></div><div class="stop-meta"></div></div>`;
        item.querySelector('.stop-name').textContent = stopMeta.name;
        item.querySelector('.stop-meta').textContent = `${translate('stopPanelCode', 'Code')}: ${stopMeta.code}`;
        item.onclick = () => {
          const map = ctx.getMap ? ctx.getMap() : ctx.mapgl;
          map?.flyTo({ center: [stop[0], stop[1]], zoom: 15, duration: 800 });
          showStopArrivals(stop);
        };
        stopListEl.appendChild(item);
      });
  }

  function filterRouteListByType(t) {
    document.querySelectorAll('#route-list .route-item').forEach((el) => {
      el.style.display = (t === 'all' || normalizeRouteType(el.dataset.type) === normalizeRouteType(t)) ? 'flex' : 'none';
    });
  }

  function focusRoute(routeRef) {
    const ctx = getCtx();
    if (!ctx) return;
    const shortName = typeof routeRef === 'object' ? String(routeRef.s || '').trim() : String(routeRef || '').trim();
    const routeKey = typeof routeRef === 'object' ? buildRouteCatalogKey(routeRef) : shortName;
    const focusedRoute = ctx.getFocusedRoute ? ctx.getFocusedRoute() : ctx.focusedRoute;
    const focusedRouteId = ctx.getFocusedRouteId ? ctx.getFocusedRouteId() : null;
    if ((typeof routeRef === 'object' && routeRef.rid && focusedRouteId === routeRef.rid)
      || (typeof routeRef !== 'object' && focusedRoute === shortName && !focusedRouteId)) {
      clearFocusedRouteSelection(true);
      return;
    }
    ctx.setFocusedRoute(shortName);
    ctx.setFocusedRouteId?.(typeof routeRef === 'object' ? (routeRef.rid || null) : null);
    ctx.setSelectedRouteDirection(null);
    ctx.setFocusedStopIdsCache(null);
    document.querySelectorAll('.route-item').forEach((el) => el.classList.toggle('focused', el.dataset.routeKey === routeKey));
    const shape = getShapes(ctx).find((s) => {
      if (typeof routeRef !== 'object') return s.s === shortName;
      if (routeRef.rid && s.rid && s.rid === routeRef.rid) return true;
      if (routeRef.aid && s.aid && String(s.aid) !== String(routeRef.aid)) return false;
      return s.s === shortName && normalizeRouteType(s.t) === normalizeRouteType(routeRef.t);
    }) || getShapes(ctx).find((s) => s.s === shortName);
    if (shape?.p?.length) {
      const lons = shape.p.map((p) => p[0]);
      const lats = shape.p.map((p) => p[1]);
      const map = ctx.getMap ? ctx.getMap() : ctx.mapgl;
      map?.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 800 });
    }
    const trip = getTrips(ctx).find((t) => {
      if (typeof routeRef !== 'object') return t.s === shortName;
      if (routeRef.rid && t.rid && t.rid === routeRef.rid) return true;
      if (routeRef.aid && t.aid && String(t.aid) !== String(routeRef.aid)) return false;
      return t.s === shortName && normalizeRouteType(t.t) === normalizeRouteType(routeRef.t);
    }) || getTrips(ctx).find((t) => t.s === shortName);
    if (!trip && !shape) {
      if (ctx.AppState?.capped) {
        ctx.showToast?.(
          translate(
            'routeNotLoadedDueToCap',
            'Bu hat katalogda var ancak performans cap nedeniyle runtime verisi yüklenmedi. Harita ve panel için daha küçük veri kümesi veya isteğe bağlı yükleme gerekiyor.'
          ),
          'info',
          6000,
        );
      }
      clearFocusedRouteSelection(true);
      return;
    }
    if (trip) {
      const routeMeta = {
        ...ctx.getRouteMeta(
          shortName,
          trip.t,
          trip.c,
          routeRef?.ln || trip.ln || trip.h || routeRef?.an || trip.an || ''
        ),
        rid: typeof routeRef === 'object' ? (routeRef.rid || null) : null
      };
      openRoutePanel(routeMeta, ctx.TYPE_META[trip.t] || {});
    }
    buildStopList(document.getElementById('stop-list-filter')?.value || '');
    ctx.refreshLayersNow();
  }

  function setupStopSearch(inputId, suggestionId, cb) {
    const inp = document.getElementById(inputId);
    const sug = document.getElementById(suggestionId);
    if (!inp || !sug) return;
    if (inp.dataset.stopSearchBound === '1') return;
    inp.dataset.stopSearchBound = '1';
    inp.addEventListener('input', () => {
      const ctx = getCtx();
      if (!ctx) return;
      const q = inp.value.toLowerCase().trim();
      if (q.length < 2) {
        sug.classList.remove('show');
        return;
      }
    const res = getStopNames(ctx).filter((s) => s[0].includes(q)).slice(0, 8);
      sug.innerHTML = res.map((s) => `<div class="sug-item" data-sid="${s[1]}" data-name="${ctx.displayText(s[4])}">${ctx.displayText(s[4])}</div>`).join('');
      sug.classList.toggle('show', res.length > 0);
      sug.querySelectorAll('.sug-item').forEach((el) => {
        el.onclick = () => {
          const clickCtx = getCtx();
          inp.value = el.dataset.name;
          sug.classList.remove('show');
          cb(el.dataset.sid);
          clickCtx?.setRouteHighlightPath?.(null);
        };
      });
    });
  }

  function aggregateRouteLegs(path, ctx) {
    const legs = [];
    path.forEach((step) => {
      const line = step.line || '??';
    const fromInfo = getStopInfo(ctx)[step.from];
    const toInfo = getStopInfo(ctx)[step.to];
      const fromName = ctx.displayText(fromInfo?.[2] || step.from || '—');
      const toName = ctx.displayText(toInfo?.[2] || step.to || '—');
      const isWalk = line === '??' || line === 'Yürü' || line === 'WALK';
      const current = legs[legs.length - 1];
      if (current && current.line === line && current.mode === (isWalk ? 'walk' : 'ride')) {
        current.to = step.to;
        current.toName = toName;
        current.secs += step.secs;
        current.stepCount += 1;
        return;
      }
      legs.push({
        mode: isWalk ? 'walk' : 'ride',
        line,
        from: step.from,
        to: step.to,
        fromName,
        toName,
        secs: step.secs,
        stepCount: 1,
      });
    });
    return legs;
  }

  function showRouteResult(path) {
    const ctx = getCtx();
    if (!ctx) return;
    const el = document.getElementById('route-result');
    const steps = document.getElementById('route-steps');
    if (!el || !steps) return;
    steps.innerHTML = '';
    const legs = aggregateRouteLegs(path, ctx);
    const total = legs.reduce((sum, leg) => sum + leg.secs, 0);
    const lines = new Set(legs.filter((leg) => leg.mode === 'ride').map((leg) => leg.line));
    legs.forEach((leg, index) => {
      const div = document.createElement('div');
      div.className = 'route-step';
      const lineLabel = leg.mode === 'walk'
        ? translate('routeWalk', 'Yürü')
        : translate('routeBoardLine', '{line} hattına bin').replace('{line}', leg.line);
      const detail = leg.mode === 'walk'
        ? translate('routeWalkDetail', '{from} → {to}')
            .replace('{from}', leg.fromName)
            .replace('{to}', leg.toName)
        : translate('routeRideDetail', '{from} durağından bin · {to} durağında in')
            .replace('{from}', leg.fromName)
            .replace('{to}', leg.toName);
      const meta = leg.mode === 'walk'
        ? translate('routeConnectionCount', '{count} bağlantı').replace('{count}', String(leg.stepCount))
        : translate('routeStopCount', '{count} durak').replace('{count}', String(Math.max(leg.stepCount, 1)));
      div.innerHTML = `<span class="step-icon">${leg.mode === 'walk' ? '🚶' : '🚌'}</span><div class="step-info"><div class="step-line">${lineLabel}</div><div class="step-detail">${detail}</div><div class="step-detail">${meta}</div></div><span class="step-time">${Math.max(1, Math.round(leg.secs / 60))}dk</span>`;
      steps.appendChild(div);
      if (leg.mode === 'ride' && index < legs.length - 1) {
        const transfer = document.createElement('div');
        transfer.className = 'route-step';
        transfer.innerHTML = `<span class="step-icon">↺</span><div class="step-info"><div class="step-line">${translate('routeTransfer', 'Aktarma')}</div><div class="step-detail">${translate('routeTransferDetail', '{stop} durağında inip sonraki hatta geç').replace('{stop}', leg.toName)}</div></div><span class="step-time"></span>`;
        steps.appendChild(transfer);
      }
    });
    const summary = document.createElement('div');
    summary.className = 'route-step';
    summary.style.borderBottom = '1px solid rgba(48,54,61,0.45)';
    summary.innerHTML = `<span class="step-icon">🧭</span><div class="step-info"><div class="step-line">${translate('routeSuggestedJourney', 'Önerilen yolculuk')}</div><div class="step-detail">${translate('routeSummaryDetail', '{legs} etap · {lines} hat').replace('{legs}', String(legs.length)).replace('{lines}', String(lines.size))}</div></div><span class="step-time">${Math.max(1, Math.round(total / 60))}dk</span>`;
    steps.prepend(summary);
    const tot = document.createElement('div');
    tot.style.cssText = 'padding:6px 10px;font-size:11px;font-weight:700;color:var(--green);border-top:1px solid var(--border);';
    tot.textContent = translate('routeTotal', 'Toplam: {minutes} dakika').replace('{minutes}', String(Math.round(total / 60)));
    steps.appendChild(tot);
    ctx.setRouteHighlightPath(path.map((s) => {
    const si = getStopInfo(ctx)[s.to];
      return si ? [si[0], si[1]] : null;
    }).filter(Boolean));
    el.classList.remove('hidden');
  }

  function updateBunchingPanel(alarms) {
    const ctx = getCtx();
    const panel = getElement('bunching-panel');
    const list = getElement('bunching-list');
    const count = getElement('bunching-count');
    if (!ctx || !panel || !list || !count) return;
    panel.classList.remove('hidden');
    count.textContent = alarms.length;
    if (!alarms.length) {
      list.innerHTML = '<div style="padding:10px 12px;color:#3fb950;font-size:11px;text-align:center;">✓ Şu an bunching yok</div>';
      return;
    }
    list.innerHTML = alarms.slice(0, 12).map((entry) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;border-bottom:1px solid rgba(48,54,61,0.6);">
        <span style="font-size:11px;color:var(--text,#e6edf3)">${entry.routeId}${entry.direction ? ` · ${ctx.displayText(entry.direction)}` : ''}</span>
        <span style="font-size:12px;font-weight:700;color:#f85149">${ctx.formatHeadwayLabel(entry.headwaySeconds)}</span>
      </div>`).join('');
  }

  function startCinematic() {
    const ctx = getCtx();
    if (!ctx) return;
    const map = ctx.getMap ? ctx.getMap() : ctx.mapgl;
    preCinematicView = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    };
    ctx.setCinematic(true);
    ctx.setCinematicIdx(0);
    document.getElementById('sidebar').style.opacity = '0';
    document.getElementById('sidebar').style.pointerEvents = 'none';
    const legend = document.getElementById('legend');
    if (legend) legend.style.opacity = '0';
    const btn = document.getElementById('btn-cinematic');
    if (btn) {
      btn.textContent = translate('cinematicStop', '⏹ Durdur');
      btn.style.background = 'rgba(248,81,73,0.25)';
      btn.style.borderColor = '#f85149';
      btn.style.color = '#f85149';
    }
    cinematicNext();
  }

  function stopCinematic() {
    const ctx = getCtx();
    if (!ctx) return;
    const map = ctx.getMap ? ctx.getMap() : ctx.mapgl;
    ctx.setCinematic(false);
    clearTimeout(ctx.getCinematicTimer ? ctx.getCinematicTimer() : ctx.cinematicTimer);
    ctx.setCinematicTimer(null);
    ctx.setFollowTripIdx(null);
    document.getElementById('sidebar').style.opacity = '';
    document.getElementById('sidebar').style.pointerEvents = '';
    const legend = document.getElementById('legend');
    if (legend) legend.style.opacity = '';
    const lbl = document.getElementById('cinematic-label');
    if (lbl) {
      lbl.style.opacity = '0';
      setTimeout(() => { lbl.textContent = ''; }, 500);
    }
    const btn = document.getElementById('btn-cinematic');
    if (btn) {
      btn.textContent = translate('cinematicStart', '🎬 Sinematik');
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
    if (preCinematicView) {
      map?.flyTo({
        center: preCinematicView.center,
        zoom: preCinematicView.zoom,
        pitch: preCinematicView.pitch,
        bearing: preCinematicView.bearing,
        duration: 1200,
        essential: true,
      });
      preCinematicView = null;
    }
  }

  function cinematicNext() {
    const ctx = getCtx();
    const isCinematic = ctx?.getIsCinematic ? ctx.getIsCinematic() : ctx?.isCinematic;
    if (!ctx || !isCinematic) return;
    const map = ctx.getMap ? ctx.getMap() : ctx.mapgl;
    const waypoints = ctx.getCinematicWaypoints?.() || [];
    if (!waypoints.length) {
      stopCinematic();
      return;
    }
    const cinematicIdx = ctx.getCinematicIdx ? ctx.getCinematicIdx() : ctx.cinematicIdx;
    const wp = waypoints[cinematicIdx % waypoints.length];
    const lbl = document.getElementById('cinematic-label');
    if (lbl) {
      lbl.style.opacity = '0';
      lbl.textContent = wp.label;
      setTimeout(() => { lbl.style.transition = 'opacity 0.8s'; lbl.style.opacity = '1'; }, 200);
      setTimeout(() => { lbl.style.opacity = '0'; }, wp.duration - 800);
    }
    map?.flyTo({ center: wp.center, zoom: wp.zoom, pitch: wp.pitch, bearing: wp.bearing, duration: wp.duration - 600, essential: true });
    let nearest = null;
    let minD = Infinity;
    for (const trip of getTrips(ctx)) {
      const pos = ctx.getVehiclePos(trip, ctx.simTime);
      if (!pos) continue;
      const d = ctx.haversineM(wp.center, pos);
      if (d < minD) {
        minD = d;
        nearest = trip;
      }
    }
    if (nearest && minD < 3000) {
    const tIdx = getTrips(ctx).indexOf(nearest);
      if (tIdx >= 0) ctx.setFollowTripIdx(tIdx);
      setTimeout(() => {
        const nextIsCinematic = ctx.getIsCinematic ? ctx.getIsCinematic() : ctx.isCinematic;
        if (nextIsCinematic) ctx.setFollowTripIdx(null);
      }, 2500);
    }
    ctx.setCinematicTimer(setTimeout(() => {
      const nextIdx = ctx.getCinematicIdx ? ctx.getCinematicIdx() : ctx.cinematicIdx;
      ctx.setCinematicIdx((nextIdx + 1) % waypoints.length);
      cinematicNext();
    }, wp.duration));
  }


  function init() {
    if (initialized) return;
    initialized = true;
    buildRouteList();
    buildStopList();
  }

  return {
    showTooltipAt,
    hideTooltip,
    handleHover,
    handleClick,
    openVehiclePanel,
    closeVehiclePanel,
    updateVehiclePanel,
    showStopArrivals,
    makeDraggable,
    renderStopPanel,
    closeStopPanel,
    openRoutePanel,
    closeRoutePanel,
    clearFocusedRouteSelection,
    focusRoute,
    buildRouteList,
    buildStopList,
    filterRouteListByType,
    setupStopSearch,
    init,
    showRouteResult,
    updateBunchingPanel,
    startCinematic,
    stopCinematic,
    cinematicNext,
  };
})();
