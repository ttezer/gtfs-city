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
    nameEl.textContent = `${icon} ${routeMeta.short}${routeMeta.longName ? ` · ${ctx.displayText(routeMeta.longName)}` : ''}`.trim();
    metaEl.textContent = `${typeName} · ${ctx.displayText(stats.directionLabel)}`;
    detailsEl.innerHTML = `
      <div class="route-panel-stack">
        <div class="route-panel-box">
          <div class="route-panel-box-title">${translate('routePanelSummary', 'Operations Summary')}</div>
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
    ctx.setSelectedEntity({ type: 'route', routeShort: routeMeta.short });
    showElement(panel);
    setTimeout(() => panel.classList.add('open'), 10);
  }

  function closeRoutePanel() {
    const ctx = getCtx();
    const panel = getElement('route-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => hideElement(panel), 260);
    }
    if (ctx?.selectedEntity?.type === 'route') ctx.setSelectedEntity(null);
  }

  function clearFocusedRouteSelection(refresh = false) {
    const ctx = getCtx();
    if (!ctx) return;
    if (!ctx.focusedRoute) {
      ctx.setRouteHighlightPath(null);
      closeRoutePanel();
      return;
    }
    ctx.setFocusedRoute(null);
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
      const si = ctx.STOP_INFO[obj.sid];
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
      focusRoute(obj.s);
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
    const panel = document.getElementById('vehicle-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => panel.classList.add('hidden'), 260);
    }
    ctx?.setSelectedTripIdx(null);
    if (ctx?.selectedEntity?.type === 'vehicle') ctx.setSelectedEntity(null);
    ctx?.releaseSelectionPause('vehicle-panel');
  }

  function updateVehiclePanel() {
    const ctx = getCtx();
    if (!ctx || ctx.selectedTripIdx === null) return;
    const trip = ctx.TRIPS[ctx.selectedTripIdx];
    if (!trip) return;
    const panelState = ctx.buildVehiclePanelState(trip, ctx.selectedTripIdx, ctx.simTime);
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
    const deps = stopMeta.sid ? ctx.STOP_DEPS[stopMeta.sid] : null;
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
      : (Number.isFinite(ctx.stopAvgHeadways?.[stopMeta.sid])
        ? ctx.stopAvgHeadways[stopMeta.sid]
        : ctx.computeAverageHeadwaySeconds(deps));
    const routeCount = new Set(deps.map((dep) => dep[2] || ctx.TRIPS[dep[0]]?.s).filter(Boolean)).size;
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
    const waitingColorFn = typeof ctx.waitingColor === 'function'
      ? ctx.waitingColor
      : window.AnalyticsUtils?.waitingColor;
    const waitingColor = Number.isFinite(stopHeadway) && typeof waitingColorFn === 'function'
      ? waitingColorFn(stopHeadway)
      : null;
    const waitingLevel = waitingColor
      ? (waitingColor[0] === 63 ? 'Yeşil' : waitingColor[0] === 210 ? 'Sarı' : 'Kırmızı')
      : '—';

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
      </div>
      <div class="stop-insight-card">
        <span class="stop-insight-k">${translate('stopPanelWaiting3d', 'Waiting 3D')}</span>
        <span class="stop-insight-v">${waitingLevel}</span>
        <span class="stop-insight-s">${ctx.showWaiting ? translate('stopPanelLayerOpen', 'Layer enabled') : translate('stopPanelLayerClosed', 'Layer disabled')}</span>
      </div>`;
    document.getElementById('stop-spark-wrap')?.remove();
  }


  function closeStopPanel() {
    const ctx = getCtx();
    const panel = document.getElementById('stop-panel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.classList.add('hidden'), 400);
    ctx?.setActiveStopData(null);
    if (ctx?.selectedEntity?.type === 'stop') ctx.setSelectedEntity(null);
  }

  function buildRouteList() {
    const ctx = getCtx();
    if (!ctx) return;
    const routeListEl = document.getElementById('route-list');
    if (!routeListEl) return;
    const byType = {};
    ctx.SHAPES.forEach((shape) => {
      const type = normalizeRouteType(shape.t);
      if (!byType[type]) byType[type] = [];
      if (!byType[type].find((route) => route.s === shape.s)) byType[type].push({ s: shape.s, c: shape.c, t: type, ln: shape.ln || '' });
    });
    routeListEl.innerHTML = '';
    Object.keys(ctx.TYPE_META).forEach((type) => {
      if (!byType[type]) return;
      byType[type].sort((a, b) => a.s.localeCompare(b.s, 'tr')).forEach((route) => {
        const routeMeta = ctx.getRouteMeta(route.s, type, route.c, route.ln);
        const div = document.createElement('div');
        div.className = 'route-item';
        div.dataset.short = route.s;
        div.dataset.type = normalizeRouteType(type);
        div.innerHTML = `<div class="ri-bar" style="background:${ctx.colorToCss(routeMeta.color)}"></div>
          <div class="ri-info"><div class="ri-name"></div><div class="ri-type"></div><div class="ri-long"></div></div>
          <input type="checkbox" class="ri-check" ${ctx.activeRoutes.has(route.s) ? '' : 'checked'} data-short="${route.s}">`;
        div.querySelector('.ri-name').textContent = routeMeta.short;
        div.querySelector('.ri-type').textContent = ctx.getLocalizedRouteTypeName
          ? ctx.getLocalizedRouteTypeName(type, ctx.TYPE_META[type]?.n || type)
          : (ctx.TYPE_META[type]?.n || type);
        div.querySelector('.ri-long').textContent = routeMeta.longName || '';
        div.classList.toggle('hidden-route', ctx.activeRoutes.has(route.s));
        div.onclick = (e) => {
          if (e.target.type === 'checkbox') return;
          focusRoute(route.s);
        };
        div.querySelector('.ri-check').onchange = (e) => {
          if (e.target.checked) ctx.activeRoutes.delete(route.s);
          else {
            ctx.activeRoutes.add(route.s);
            ctx.setRouteHighlightPath(null);
            if (ctx.focusedRoute === route.s) {
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
    filterRouteListByType(ctx.typeFilter || 'all');
  }

  function buildStopList(filter = '') {
    const ctx = getCtx();
    if (!ctx) return;
    const stopListEl = document.getElementById('stop-list');
    if (!stopListEl) return;
    const q = filter.trim().toLowerCase();
    const stopSource = ctx.getFilteredStopsData
      ? ctx.getFilteredStopsData()
      : (ctx.focusedRoute
        ? (ctx.getFocusedStopsData()?.map((entry) => [entry.pos[0], entry.pos[1], entry.name || entry.sid, entry.sid, entry.name || entry.sid]) || [])
        : ctx.STOPS);
    stopListEl.innerHTML = '';
    const limitedStops = ctx.focusedRoute ? stopSource : stopSource.slice(0, 300);
    limitedStops
      .filter((stop) => {
        const stopMeta = ctx.getStopMetaByArray(stop);
        return !q || stopMeta.name.toLowerCase().includes(q) || stopMeta.code.toLowerCase().includes(q);
      })
      .forEach((stop) => {
        const stopMeta = ctx.getStopMetaByArray(stop);
        const item = document.createElement('div');
        item.className = 'stop-item';
        item.innerHTML = `<span class="stop-dot"></span><div class="stop-info"><div class="stop-name"></div><div class="stop-meta"></div></div>`;
        item.querySelector('.stop-name').textContent = stopMeta.name;
        item.querySelector('.stop-meta').textContent = `${translate('stopPanelCode', 'Code')}: ${stopMeta.code}`;
        item.onclick = () => {
          ctx.mapgl.flyTo({ center: [stop[0], stop[1]], zoom: 15, duration: 800 });
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

  function focusRoute(shortName) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.focusedRoute === shortName) {
      clearFocusedRouteSelection(true);
      return;
    }
    ctx.setFocusedRoute(shortName);
    ctx.setFocusedStopIdsCache(null);
    document.querySelectorAll('.route-item').forEach((el) => el.classList.toggle('focused', el.dataset.short === shortName));
    const shape = ctx.SHAPES.find((s) => s.s === shortName);
    if (shape?.p?.length) {
      const lons = shape.p.map((p) => p[0]);
      const lats = shape.p.map((p) => p[1]);
      ctx.mapgl.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 800 });
    }
    const trip = ctx.TRIPS.find((t) => t.s === shortName);
    if (trip) {
      const routeMeta = ctx.getRouteMeta(shortName, trip.t, trip.c, trip.ln || trip.h || '');
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
      const res = ctx.stopNames.filter((s) => s[0].includes(q)).slice(0, 8);
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
      const fromInfo = ctx.STOP_INFO[step.from];
      const toInfo = ctx.STOP_INFO[step.to];
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
      const si = ctx.STOP_INFO[s.to];
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

  function updateWorstStopsPanel() {
    const ctx = getCtx();
    const list = getElement('worst-stops-list');
    const header = document.querySelector('#worst-header > span');
    const sub = document.querySelector('#worst-header .worst-sub');
    const worstStops = ctx?.getWorstStops?.();
    if (!ctx || !list || !worstStops) return;
    const makeRow = (entry, index, labelColor) => {
      const mins = Math.round(entry.avgWait / 60);
      const valueColor = mins <= 5 ? '#3fb950' : mins <= 15 ? '#d29922' : '#f85149';
      return `<div onclick="mapgl.flyTo({center:[${entry.info[0]},${entry.info[1]}],zoom:15,duration:800})"
        style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid rgba(48,54,61,0.5);cursor:pointer;">
        <span style="color:${labelColor};font-size:10px;width:18px;text-align:right;font-weight:700">${index + 1}</span>
        <span style="flex:1;font-size:11px;color:var(--text,#e6edf3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ctx.displayText(entry.info[2])}</span>
        <span style="font-size:12px;font-weight:700;color:${valueColor}">${mins}dk</span>
      </div>`;
    };
    if (header) header.textContent = 'Bekleme Süresi 3D';
    if (sub) sub.textContent = `${ctx.secsToHHMM(ctx.waitingComputedForSec || 0)} · En kötü 5 + En iyi 5`;
    list.innerHTML = `
      <div style="padding:7px 12px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f85149;border-bottom:1px solid rgba(48,54,61,0.55);">En Kötü 5</div>
      ${worstStops.worst.map((entry, index) => makeRow(entry, index, '#f85149')).join('')}
      <div style="padding:7px 12px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3fb950;border-bottom:1px solid rgba(48,54,61,0.55);">En İyi 5</div>
      ${worstStops.best.map((entry, index) => makeRow(entry, index, '#3fb950')).join('')}
    `;
  }

  function buildWorstStops() {
    const ctx = getCtx();
    if (!ctx?.stopAvgHeadways) return;
    const ranked = Object.entries(ctx.stopAvgHeadways)
      .filter(([stopId]) => ctx.STOP_INFO[stopId])
      .map(([stopId, headway]) => ({ sid: stopId, avgWait: headway / 2, info: ctx.STOP_INFO[stopId] }))
      .sort((a, b) => b.avgWait - a.avgWait);
    ctx.setWorstStops({
      worst: ranked.slice(0, 5),
      best: [...ranked].reverse().slice(0, 5),
      computedAt: ctx.waitingComputedForSec,
    });
    updateWorstStopsPanel();
  }

  function startCinematic() {
    const ctx = getCtx();
    if (!ctx) return;
    preCinematicView = {
      center: ctx.mapgl.getCenter(),
      zoom: ctx.mapgl.getZoom(),
      pitch: ctx.mapgl.getPitch(),
      bearing: ctx.mapgl.getBearing(),
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
    ctx.setCinematic(false);
    clearTimeout(ctx.cinematicTimer);
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
      ctx.mapgl.flyTo({
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
    if (!ctx || !ctx.isCinematic) return;
    const waypoints = ctx.getCinematicWaypoints?.() || [];
    if (!waypoints.length) {
      stopCinematic();
      return;
    }
    const wp = waypoints[ctx.cinematicIdx % waypoints.length];
    const lbl = document.getElementById('cinematic-label');
    if (lbl) {
      lbl.style.opacity = '0';
      lbl.textContent = wp.label;
      setTimeout(() => { lbl.style.transition = 'opacity 0.8s'; lbl.style.opacity = '1'; }, 200);
      setTimeout(() => { lbl.style.opacity = '0'; }, wp.duration - 800);
    }
    ctx.mapgl.flyTo({ center: wp.center, zoom: wp.zoom, pitch: wp.pitch, bearing: wp.bearing, duration: wp.duration - 600, essential: true });
    let nearest = null;
    let minD = Infinity;
    for (const trip of ctx.TRIPS) {
      const pos = ctx.getVehiclePos(trip, ctx.simTime);
      if (!pos) continue;
      const d = ctx.haversineM(wp.center, pos);
      if (d < minD) {
        minD = d;
        nearest = trip;
      }
    }
    if (nearest && minD < 3000) {
      const tIdx = ctx.TRIPS.indexOf(nearest);
      if (tIdx >= 0) ctx.setFollowTripIdx(tIdx);
      setTimeout(() => {
        if (ctx.isCinematic) ctx.setFollowTripIdx(null);
      }, 2500);
    }
    ctx.setCinematicTimer(setTimeout(() => {
      ctx.setCinematicIdx((ctx.cinematicIdx + 1) % waypoints.length);
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
    updateWorstStopsPanel,
    buildWorstStops,
    startCinematic,
    stopCinematic,
    cinematicNext,
  };
})();
