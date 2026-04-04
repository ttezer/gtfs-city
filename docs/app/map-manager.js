/**
 * map-manager.js — Deck.gl katman üretimi ve cache yönetimi
 */

window.MapManager = (function () {
  let lastBuildTime = 0;
  let lastBuiltLayers = [];
  let staticLayers = [];
  let staticLayerKey = '';
  let cachedVisTrips = null;
  let cachedVisShapes = null;
  let cacheTypeFilter = null;
  let cacheActiveRoutes = '';
  let cacheFocusedRoute = null;
  let cacheSelectedRouteDirection = null;
  let connectivityGridCache = null;
  let connectivityGridCacheKey = '';

  const deck = window.deck || window.Deck;
  const {
    TripsLayer,
    PathLayer,
    ScatterplotLayer,
    ColumnLayer,
    PolygonLayer,
    HeatmapLayer,
    LineLayer,
    IconLayer,
    TextLayer,
  } = deck;

  function getBridge() {
    return window.LegacyMapBridge || null;
  }

  function getCtx() {
    const bridge = getBridge();
    return bridge ? bridge.getContext() : null;
  }

  function getDeckgl() {
    return getBridge()?.getDeckgl?.() || null;
  }

  function getMapgl() {
    return getBridge()?.getMapgl?.() || null;
  }

  function normalizeRouteType(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(parsed) ? String(parsed) : String(value ?? '');
  }

  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function toneColor(color, amount) {
    return [
      clampChannel(color[0] + amount),
      clampChannel(color[1] + amount),
      clampChannel(color[2] + amount),
    ];
  }

  function getDirectionColor(baseColor, direction) {
    if (direction === 0) return toneColor(baseColor, 58);
    if (direction === 1) return toneColor(baseColor, -72);
    return baseColor;
  }

  function getShapeColor(ctx, shape) {
    const baseColor = ctx.getRouteColorRgb(shape.s, shape.t, shape.c);
    if (!ctx.focusedRoute || shape.s !== ctx.focusedRoute) return baseColor;
    return getDirectionColor(baseColor, shape.dir);
  }

  function getVehicleDisplayColor(ctx, entry) {
    const trip = entry?.trip || entry;
    const baseColor = ctx.getRouteColorRgb(trip.s, trip.t, trip.c);
    if (ctx.focusedRoute && trip.s !== ctx.focusedRoute) return [120, 125, 130];
    if (ctx.focusedRoute && trip.s === ctx.focusedRoute) return getDirectionColor(baseColor, trip.dir);
    return baseColor;
  }

  function interpolateColorStops(stops, value) {
    if (!Array.isArray(stops) || !stops.length) return [139, 148, 158];
    if (!Number.isFinite(value)) return stops[0].color.slice();
    if (value <= stops[0].at) return stops[0].color.slice();
    for (let index = 1; index < stops.length; index++) {
      const left = stops[index - 1];
      const right = stops[index];
      if (value > right.at) continue;
      const span = Math.max(1, right.at - left.at);
      const t = Math.max(0, Math.min(1, (value - left.at) / span));
      return [
        clampChannel(left.color[0] + ((right.color[0] - left.color[0]) * t)),
        clampChannel(left.color[1] + ((right.color[1] - left.color[1]) * t)),
        clampChannel(left.color[2] + ((right.color[2] - left.color[2]) * t)),
      ];
    }
    return stops[stops.length - 1].color.slice();
  }

  function getStopScoreColor(score) {
    if (!Number.isFinite(score)) return [139, 148, 158, 180];
    const rgb = interpolateColorStops([
      { at: 0, color: [239, 68, 68] },
      { at: 25, color: [249, 115, 22] },
      { at: 50, color: [234, 179, 8] },
      { at: 75, color: [132, 204, 22] },
      { at: 100, color: [34, 197, 94] },
    ], Math.max(0, Math.min(100, score)));
    return [...rgb, 220];
  }

  function getSortedNumericValues(values) {
    return values
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
  }

  function getPercentile(sortedValues, ratio) {
    if (!Array.isArray(sortedValues) || !sortedValues.length) return null;
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * safeRatio)));
    return sortedValues[index];
  }

  function getConnectivityGridScoreStats(values) {
    const sortedValues = getSortedNumericValues(values);
    if (!sortedValues.length) {
      return { floor: 0, ceiling: 100 };
    }
    const p10 = getPercentile(sortedValues, 0.10);
    const p50 = getPercentile(sortedValues, 0.50);
    const p90 = getPercentile(sortedValues, 0.90);
    let floor = Number.isFinite(p10) ? p10 : sortedValues[0];
    let ceiling = Number.isFinite(p90) ? p90 : sortedValues[sortedValues.length - 1];
    if (!Number.isFinite(floor) || !Number.isFinite(ceiling) || ceiling <= floor) {
      floor = Math.max(0, (Number.isFinite(p50) ? p50 : 50) - 20);
      ceiling = Math.min(100, floor + 40);
    }
    if ((ceiling - floor) < 18) {
      const center = Number.isFinite(p50) ? p50 : ((floor + ceiling) / 2);
      floor = Math.max(0, center - 18);
      ceiling = Math.min(100, center + 18);
    }
    if (ceiling <= floor) {
      floor = 0;
      ceiling = 100;
    }
    return { floor, ceiling };
  }

  function getConnectivityGridColor(cell) {
    if (!cell || cell.empty) {
      return cell?.pending
        ? [116, 124, 138, 92]
        : [90, 97, 109, 110];
    }
    const normalizedScore = Math.max(0, Math.min(100, Number(cell.normalizedScore) || 0));
    const rgb = interpolateColorStops([
      { at: 0, color: [239, 68, 68] },
      { at: 35, color: [249, 115, 22] },
      { at: 65, color: [234, 179, 8] },
      { at: 100, color: [34, 197, 94] },
    ], normalizedScore);
    return [rgb[0], rgb[1], rgb[2], 126];
  }

  function metersToLatDegrees(meters) {
    return meters / 111320;
  }

  function metersToLngDegrees(meters, latitude) {
    const cosLat = Math.cos((latitude * Math.PI) / 180);
    const safeCos = Math.max(0.1, Math.abs(cosLat));
    return meters / (111320 * safeCos);
  }

  function lngToMercatorMeters(lng) {
    return (lng * 20037508.34) / 180;
  }

  function latToMercatorMeters(lat) {
    const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
    const radians = (clamped * Math.PI) / 180;
    return (Math.log(Math.tan((Math.PI / 4) + (radians / 2))) * 6378137);
  }

  function mercatorMetersToLng(x) {
    return (x / 20037508.34) * 180;
  }

  function mercatorMetersToLat(y) {
    return (180 / Math.PI) * (2 * Math.atan(Math.exp(y / 6378137)) - (Math.PI / 2));
  }

  function buildConnectivityGridCacheKey(ctx, bounds, zoom, snapshot, filteredStopIds) {
    const snapshotStopCount = Object.keys(snapshot?.stops || {}).length;
    return [
      `z:${zoom.toFixed(2)}`,
      `w:${bounds.west.toFixed(3)}`,
      `s:${bounds.south.toFixed(3)}`,
      `e:${bounds.east.toFixed(3)}`,
      `n:${bounds.north.toFixed(3)}`,
      `stops:${snapshotStopCount}`,
      `complete:${snapshot?.meta?.validation_summary ? 1 : 0}`,
      `type:${ctx.typeFilter || 'all'}`,
      `focus:${ctx.focusedRoute || 'all'}`,
      `dir:${ctx.selectedRouteDirection ?? 'all'}`,
      `hidden:${ctx.activeRoutes ? [...ctx.activeRoutes].sort().join(',') : ''}`,
      `filter:${filteredStopIds?.size || 0}`,
    ].join('|');
  }

  function getConnectivityGridCells(ctx) {
    const snapshot = ctx.AppState?.stopConnectivityScores;
    if (!snapshot?.stops) return [];
    const filteredStopIds = ctx.getFilteredStopIdSet ? ctx.getFilteredStopIdSet() : null;
    const mapgl = getMapgl();
    const zoom = typeof mapgl?.getZoom === 'function' ? mapgl.getZoom() : 0;
    if (zoom < 7.5) return [];

    const bounds = typeof mapgl?.getBounds === 'function' ? mapgl.getBounds() : null;
    const west = typeof bounds?.getWest === 'function' ? bounds.getWest() : bounds?._sw?.lng;
    const south = typeof bounds?.getSouth === 'function' ? bounds.getSouth() : bounds?._sw?.lat;
    const east = typeof bounds?.getEast === 'function' ? bounds.getEast() : bounds?._ne?.lng;
    const north = typeof bounds?.getNorth === 'function' ? bounds.getNorth() : bounds?._ne?.lat;
    if (![west, south, east, north].every(Number.isFinite)) return [];
    const boundsBox = { west, south, east, north };
    const cacheKey = buildConnectivityGridCacheKey(ctx, boundsBox, zoom, snapshot, filteredStopIds);
    if (connectivityGridCacheKey === cacheKey && Array.isArray(connectivityGridCache)) {
      return connectivityGridCache;
    }

    const cellSizeMeters = 400;
    const boundaryRadiusMeters = 900;
    const complete = !!snapshot?.meta?.validation_summary;
    const cells = new Map();
    const boundaryCells = new Map();
    const minX = lngToMercatorMeters(west);
    const minY = latToMercatorMeters(south);
    const maxX = lngToMercatorMeters(east);
    const maxY = latToMercatorMeters(north);
    const pad = boundaryRadiusMeters;

    Object.entries(ctx.STOP_INFO || {}).forEach(([stopId, stop]) => {
      if (!Array.isArray(stop)) return;
      if (filteredStopIds && filteredStopIds.size && !filteredStopIds.has(stopId)) return;
      const [lng, lat] = stop;
      const x = lngToMercatorMeters(lng);
      const y = latToMercatorMeters(lat);
      if (x < minX - pad || x > maxX + pad || y < minY - pad || y > maxY + pad) return;
      const baseCol = Math.floor(x / cellSizeMeters);
      const baseRow = Math.floor(y / cellSizeMeters);
      const radiusCells = Math.ceil(boundaryRadiusMeters / cellSizeMeters);
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        for (let dy = -radiusCells; dy <= radiusCells; dy++) {
          const col = baseCol + dx;
          const row = baseRow + dy;
          const centerX = ((col + 0.5) * cellSizeMeters);
          const centerY = ((row + 0.5) * cellSizeMeters);
          const dist = Math.hypot(centerX - x, centerY - y);
          if (dist > boundaryRadiusMeters) continue;
          const key = `${col}:${row}`;
          if (!boundaryCells.has(key)) boundaryCells.set(key, { col, row });
        }
      }
    });

    Object.entries(snapshot.stops).forEach(([stopId, record]) => {
      const stop = ctx.STOP_INFO?.[stopId];
      const score = record?.final_score;
      if (!stop || !Number.isFinite(score)) return;
      if (filteredStopIds && filteredStopIds.size && !filteredStopIds.has(stopId)) return;
      const [lng, lat] = stop;
      const x = lngToMercatorMeters(lng);
      const y = latToMercatorMeters(lat);
      if (x < minX || x > maxX || y < minY || y > maxY) return;
      const col = Math.floor(x / cellSizeMeters);
      const row = Math.floor(y / cellSizeMeters);
      const key = `${col}:${row}`;
      if (!cells.has(key)) {
        cells.set(key, { col, row, sum: 0, count: 0 });
      }
      const cell = cells.get(key);
      cell.sum += score;
      cell.count += 1;
    });

    const result = Array.from(boundaryCells.values()).map((cell) => {
      const minX = cell.col * cellSizeMeters;
      const minY = cell.row * cellSizeMeters;
      const maxX = minX + cellSizeMeters;
      const maxY = minY + cellSizeMeters;
      const minLng = mercatorMetersToLng(minX);
      const minLat = mercatorMetersToLat(minY);
      const maxLng = mercatorMetersToLng(maxX);
      const maxLat = mercatorMetersToLat(maxY);
      if (maxLng < west || minLng > east || maxLat < south || minLat > north) return null;
      const scoredCell = cells.get(`${cell.col}:${cell.row}`);
      const score = scoredCell?.count > 0 ? Math.round(scoredCell.sum / scoredCell.count) : null;
      return {
        key: `${cell.col}:${cell.row}`,
        polygon: [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
        ],
        score,
        count: scoredCell?.count || 0,
        empty: !Number.isFinite(score),
        pending: !Number.isFinite(score) && !complete,
      };
    }).filter(Boolean);
    const scoreStats = getConnectivityGridScoreStats(result.map((cell) => cell.score));
    result.forEach((cell) => {
      if (!Number.isFinite(cell.score)) {
        cell.normalizedScore = null;
        return;
      }
      const span = Math.max(1, scoreStats.ceiling - scoreStats.floor);
      cell.normalizedScore = Math.max(0, Math.min(100, ((cell.score - scoreStats.floor) / span) * 100));
    });
    connectivityGridCacheKey = cacheKey;
    connectivityGridCache = result;
    return result;
  }

  function getConnectivityViewportKey() {
    const mapgl = getMapgl();
    if (!mapgl) return 'nogridviewport';
    const zoom = typeof mapgl.getZoom === 'function' ? mapgl.getZoom() : 0;
    const bounds = typeof mapgl.getBounds === 'function' ? mapgl.getBounds() : null;
    const west = typeof bounds?.getWest === 'function' ? bounds.getWest() : bounds?._sw?.lng;
    const south = typeof bounds?.getSouth === 'function' ? bounds.getSouth() : bounds?._sw?.lat;
    const east = typeof bounds?.getEast === 'function' ? bounds.getEast() : bounds?._ne?.lng;
    const north = typeof bounds?.getNorth === 'function' ? bounds.getNorth() : bounds?._ne?.lat;
    if (![west, south, east, north].every(Number.isFinite)) return `z:${zoom.toFixed(2)}`;
    return [
      `z:${zoom.toFixed(2)}`,
      `w:${west.toFixed(3)}`,
      `s:${south.toFixed(3)}`,
      `e:${east.toFixed(3)}`,
      `n:${north.toFixed(3)}`,
    ].join('|');
  }

  function getScoreLayerViewportFilter(ctx, scoreType) {
    const mapgl = getMapgl();
    if (!mapgl?.getZoom) return null;
    const zoom = mapgl.getZoom();
    const minZoom = scoreType === 'base' ? 14.2 : 13.2;
    if (zoom < minZoom) {
      return { allowed: false, reason: 'zoom', zoom, minZoom };
    }
    const bounds = typeof mapgl.getBounds === 'function' ? mapgl.getBounds() : null;
    if (!bounds) return { allowed: true, zoom, bounds: null };
    const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds._sw?.lng;
    const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds._sw?.lat;
    const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds._ne?.lng;
    const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds._ne?.lat;
    if (![west, south, east, north].every(Number.isFinite)) {
      return { allowed: true, zoom, bounds: null };
    }
    return { allowed: true, zoom, bounds: { west, south, east, north } };
  }

  function getStopScoreColumns(ctx, scoreType) {
    const startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
    const viewportFilter = getScoreLayerViewportFilter(ctx, scoreType);
    if (viewportFilter && viewportFilter.allowed === false) return [];
    const filteredStopIds = ctx.getFilteredStopIdSet ? ctx.getFilteredStopIdSet() : null;
    const bounds = viewportFilter?.bounds || null;
    const result = Object.entries(ctx.STOP_INFO || {}).map(([sid, stop]) => {
      if (filteredStopIds && filteredStopIds.size && !filteredStopIds.has(sid)) return null;
      if (bounds) {
        const [lng, lat] = stop;
        if (lng < bounds.west || lng > bounds.east || lat < bounds.south || lat > bounds.north) return null;
      }
      let score = null;
      if (scoreType === 'live') {
        const liveState = window.StopScoreUtils?.getLiveScore?.(sid, ctx.simTime, ctx);
        score = liveState?.score;
      } else {
        const baseState = window.StopScoreUtils?.getCachedBaseScore?.(sid, ctx);
        score = baseState?.baseScore;
      }
      if (!Number.isFinite(score)) return null;
      return {
        pos: [stop[0], stop[1]],
        score,
        color: getStopScoreColor(score),
      };
    }).filter(Boolean);
    return result;
  }

  function getVehicleLabel(entry) {
    const trip = entry?.trip || entry;
    const routeCode = String(trip?.s || '').trim();
    if (!routeCode) return '';
    if (trip?.dir === 0) return `${routeCode} D0`;
    if (trip?.dir === 1) return `${routeCode} D1`;
    return routeCode;
  }

  function shouldShowVehicleLabels(ctx) {
    if (!ctx.focusedRoute || !ctx.showAnim) return false;
    const mapgl = getMapgl();
    if (!mapgl?.getZoom) return false;
    return mapgl.getZoom() >= 12.8;
  }

  function invalidateCaches() {
    lastBuildTime = 0;
    lastBuiltLayers = [];
    staticLayers = [];
    staticLayerKey = '';
    cachedVisTrips = null;
    cachedVisShapes = null;
    cacheTypeFilter = null;
    cacheActiveRoutes = '';
    cacheFocusedRoute = null;
    cacheSelectedRouteDirection = null;
    connectivityGridCache = null;
    connectivityGridCacheKey = '';
  }

  function refreshLayersNow() {
    invalidateCaches();
    const deckgl = getDeckgl();
    if (deckgl) deckgl.setProps({ layers: buildLayers() });
  }

  function getStaticLayerKey(ctx, time) {
    return [
      cacheTypeFilter,
      cacheActiveRoutes,
      ctx.focusedRoute || '',
      ctx.selectedRouteDirection ?? 'all',
      ctx.QUALITY.level,
      ctx.showPaths ? 1 : 0,
      ctx.showStops ? 1 : 0,
      ctx.showStopCoverage ? 1 : 0,
      ctx.showConnectivityGrid ? 1 : 0,
      ctx.showConnectivityGrid ? getConnectivityViewportKey() : 'nogrid',
      ctx.stopCoverageRadiusM || 300,
      (ctx.stopCoverageFillColor || []).join(','),
      ctx.stopCoverageFillOpacityPct || 0,
      (ctx.stopCoverageStrokeColor || []).join(','),
      ctx.stopCoverageStrokeWidthPx || 0,
      ctx.stopCoverageMode || 'fill-stroke',
      ctx.showDensity ? 1 : 0,
      ctx.showHeatmap ? 1 : 0,
      ctx.heatmapHour,
      ctx.heatmapFollowSim ? 1 : 0,
      ctx.heatmapFollowSim && ctx.showHeatmap ? Math.floor((time || 0) / 10) : 0,
      ctx.routeHighlightPath ? ctx.routeHighlightPath.length : 0,
    ].join(':');
  }

  function getVisData(ctx) {
    const activeRoutesKey = [...ctx.activeRoutes].sort().join(',');
    if (
      cachedVisTrips
      && ctx.typeFilter === cacheTypeFilter
      && activeRoutesKey === cacheActiveRoutes
      && (ctx.focusedRoute || null) === cacheFocusedRoute
      && (ctx.selectedRouteDirection ?? null) === cacheSelectedRouteDirection
    ) {
      return { visTrips: cachedVisTrips, visShapes: cachedVisShapes };
    }

    cacheTypeFilter = ctx.typeFilter;
    cacheActiveRoutes = activeRoutesKey;
    cacheFocusedRoute = ctx.focusedRoute || null;
    cacheSelectedRouteDirection = ctx.selectedRouteDirection ?? null;
    cachedVisTrips = ctx.TRIPS.filter((trip) => (
      (ctx.typeFilter === 'all' || normalizeRouteType(trip.t) === normalizeRouteType(ctx.typeFilter))
      && !ctx.activeRoutes.has(trip.s)
      && (!ctx.focusedRoute || trip.s === ctx.focusedRoute)
      && (ctx.selectedRouteDirection === null || ctx.selectedRouteDirection === undefined || trip.dir === ctx.selectedRouteDirection)
    ));
    cachedVisShapes = ctx.SHAPES.filter((shape) => (
      (ctx.typeFilter === 'all' || normalizeRouteType(shape.t) === normalizeRouteType(ctx.typeFilter))
      && !ctx.activeRoutes.has(shape.s)
      && (!ctx.focusedRoute || shape.s === ctx.focusedRoute)
      && (ctx.selectedRouteDirection === null || ctx.selectedRouteDirection === undefined || shape.dir === ctx.selectedRouteDirection)
    ));
    return { visTrips: cachedVisTrips, visShapes: cachedVisShapes };
  }

  function buildPathLayers(ctx, visShapes) {
    const layers = [];
    const sanitizePath = (path) => (path || []).filter((pt) =>
      Array.isArray(pt)
      && pt.length >= 2
      && Number.isFinite(pt[0])
      && Number.isFinite(pt[1])
    );
    const buildRenderableShape = (shape) => {
      const path = sanitizePath(shape.p);
      if (path.length < 2) return null;
      const uniq = new Set(path.map((pt) => `${pt[0]},${pt[1]}`));
      if (uniq.size < 2) return null;
      return { ...shape, path };
    };
    const validShapes = visShapes.map(buildRenderableShape).filter(Boolean);
    const nonMetro = validShapes.filter((shape) => shape.t !== '1');
    const metro = validShapes.filter((shape) => shape.t === '1');
    const toSegments = (shapes) => {
      const segments = [];
      for (const shape of shapes) {
        for (let idx = 0; idx < shape.path.length - 1; idx++) {
          const from = shape.path[idx];
          const to = shape.path[idx + 1];
          if (!from || !to) continue;
          if (from[0] === to[0] && from[1] === to[1]) continue;
          segments.push({ s: shape.s, t: shape.t, c: shape.c, from, to });
        }
      }
      return segments;
    };

    const nonMetroSegments = toSegments(nonMetro);
    const metroSegments = toSegments(metro);

    if (nonMetroSegments.length) {
      layers.push(new LineLayer({
        id: 'paths-above',
        data: nonMetroSegments,
        getSourcePosition: (d) => d.from,
        getTargetPosition: (d) => d.to,
        getColor: (d) => {
          const color = getShapeColor(ctx, d);
          return ctx.focusedRoute && d.s !== ctx.focusedRoute ? [...color, 18] : [...color, 138];
        },
        getWidth: (d) => ctx.TYPE_META[d.t]?.w || 2,
        widthUnits: 'pixels',
        widthMinPixels: 1,
        pickable: true,
      }));
    }

    if (metroSegments.length) {
      layers.push(new LineLayer({
        id: 'metro-paths',
        data: metroSegments,
        getSourcePosition: (d) => d.from,
        getTargetPosition: (d) => d.to,
        getColor: (d) => {
          const color = getShapeColor(ctx, d);
          return ctx.focusedRoute && d.s !== ctx.focusedRoute ? [...color, 18] : [...color, 165];
        },
        getWidth: 5,
        widthUnits: 'pixels',
        widthMinPixels: 2,
        pickable: true,
      }));
    }

    return layers;
  }

  function buildStaticLayers(ctx, visShapes, time) {
    const layers = [];

    if (ctx.showHeatmap) {
      const heatTime = ctx.heatmapFollowSim ? time : ctx.heatmapHour * 3600;
      const pts = [];
      const { visTrips } = getVisData(ctx);
      for (const trip of visTrips) {
        const pos = ctx.getVehiclePos(trip, heatTime);
        if (pos) pts.push({ position: pos, weight: 1 });
      }
      if (pts.length) {
        layers.push(new HeatmapLayer({
          id: 'heatmap',
          data: pts,
          getPosition: (d) => d.position,
          getWeight: () => 1,
          radiusPixels: 50,
          intensity: 2.5,
          threshold: 0.05,
          colorRange: [
            [0, 0, 80, 0],
            [0, 0, 200, 120],
            [0, 200, 200, 160],
            [200, 200, 0, 200],
            [255, 100, 0, 220],
            [255, 0, 0, 240],
          ],
        }));
      }
    }

    if (ctx.showPaths) {
      buildPathLayers(ctx, visShapes).forEach((layer) => layers.push(layer));
    }

    if (ctx.routeHighlightPath?.length > 1) {
      layers.push(new PathLayer({
        id: 'route-hl',
        data: [{ path: ctx.routeHighlightPath }],
        getPath: (d) => d.path,
        getColor: [255, 200, 0, 220],
        getWidth: 6,
        widthUnits: 'pixels',
        widthMinPixels: 3,
        jointRounded: true,
        capRounded: true,
        pickable: false,
      }));
    }

    const focusedStopsData = ctx.getFocusedStopsData();
    const focusedRouteColor = ctx.focusedRoute ? ctx.getRouteMeta(ctx.focusedRoute).color : [88, 166, 255];
    const stopData = ctx.getFilteredStopsData
      ? ctx.getFilteredStopsData()
      : (ctx.focusedRoute
        ? focusedStopsData.map((entry) => [entry.pos[0], entry.pos[1], entry.name || entry.sid, entry.sid, entry.name || entry.sid])
        : ctx.STOPS);
    const filteredStopIds = ctx.getFilteredStopIdSet ? ctx.getFilteredStopIdSet() : null;
    const densityData = ctx.focusedRoute || ctx.typeFilter !== 'all' || ctx.activeRoutes?.size
      ? stopData.reduce((acc, stop) => {
        const key = `${Math.round(stop[0] / 0.005)}|${Math.round(stop[1] / 0.005)}`;
        if (!acc[key]) acc[key] = { pos: [stop[0], stop[1]], count: 0 };
        acc[key].count++;
        return acc;
      }, {})
      : null;
    const densityRows = densityData ? Object.values(densityData) : (ctx.AppState.densityData || []);
    if (ctx.showDensity && !ctx.showHeatmap && ctx.QUALITY.level > 0 && densityRows.length > 0) {
      const maxDensity = densityRows.reduce((max, entry) => Math.max(max, entry.count || 0), 1);
      layers.push(new ColumnLayer({
        id: 'density',
        data: densityRows,
        getPosition: (d) => d.pos,
        getElevation: (d) => Math.max(80, (d.count / maxDensity) * 1100),
        getFillColor: (d) => {
          const t = d.count / maxDensity;
          return [
            Math.round(40 + t * 215),
            Math.round(210 - t * 170),
            Math.round(255 - t * 210),
            Math.round(90 + t * 150),
          ];
        },
        radius: 175,
        extruded: true,
        pickable: true,
      }));
    }

    if (ctx.showStopCoverage && stopData.length) {
      const fillAlpha = Math.round(Math.min(100, Math.max(0, ctx.stopCoverageFillOpacityPct ?? 14)) * 255 / 100);
      const fillColor = [...(ctx.stopCoverageFillColor || [88, 166, 255]), fillAlpha];
      const strokeColor = [...(ctx.stopCoverageStrokeColor || [88, 166, 255]), 255];
      const mode = ctx.stopCoverageMode || 'fill-stroke';
      layers.push(new ScatterplotLayer({
        id: 'stop-coverage',
        data: stopData,
        getPosition: (d) => Array.isArray(d) ? [d[0], d[1]] : d.pos,
        getRadius: ctx.stopCoverageRadiusM || 300,
        radiusUnits: 'meters',
        radiusMinPixels: 1,
        getFillColor: fillColor,
        getLineColor: strokeColor,
        filled: mode !== 'stroke',
        stroked: mode !== 'fill',
        lineWidthMinPixels: ctx.stopCoverageStrokeWidthPx || 2,
        pickable: false,
      }));
    }

    if (ctx.showConnectivityGrid) {
      const gridCells = getConnectivityGridCells(ctx);
      if (gridCells.length) {
        layers.push(new PolygonLayer({
          id: 'connectivity-grid',
          data: gridCells,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => getConnectivityGridColor(d),
          filled: true,
          stroked: false,
          pickable: true,
        }));
        const selectedKey = ctx.connectivityGridSelectedCell?.key;
        const selectedCell = selectedKey ? gridCells.find((cell) => cell.key === selectedKey) : null;
        if (selectedCell) {
          layers.push(new PolygonLayer({
            id: 'connectivity-grid-selected',
            data: [selectedCell],
            getPolygon: (d) => d.polygon,
            getFillColor: [255, 255, 255, 18],
            getLineColor: [255, 255, 255, 230],
            filled: true,
            stroked: true,
            lineWidthMinPixels: 3,
            pickable: false,
          }));
        }
      }
    }

    if (ctx.showStops && !ctx.showIsochron) {
      layers.push(new ScatterplotLayer({
        id: 'stops-base',
        data: stopData,
        getPosition: (d) => [d[0], d[1]],
        getRadius: 52,
        getFillColor: [88, 166, 255, 190],
        getLineColor: ctx.focusedRoute ? [120, 128, 138, 185] : [220, 240, 255, 255],
        stroked: true,
        lineWidthMinPixels: 1.2,
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        pickable: true,
      }));
      if (focusedStopsData?.length) {
        layers.push(new ScatterplotLayer({
          id: 'focused-stops-fill',
          data: focusedStopsData,
          getPosition: (d) => d.pos,
          getRadius: 74,
          getFillColor: [...focusedRouteColor, 110],
          stroked: false,
          radiusMinPixels: 6,
          radiusMaxPixels: 16,
          pickable: false,
        }));
        layers.push(new ScatterplotLayer({
          id: 'focused-stops-glow',
          data: focusedStopsData,
          getPosition: (d) => d.pos,
          getRadius: 86,
          getFillColor: [...focusedRouteColor, 70],
          radiusMinPixels: 6,
          radiusMaxPixels: 16,
          stroked: false,
          pickable: false,
        }));
        layers.push(new IconLayer({
          id: 'focused-stop-icons',
          data: focusedStopsData,
          getPosition: (d) => d.pos,
          getIcon: () => ctx.getStopIconDefinition(focusedRouteColor),
          getSize: 28,
          sizeUnits: 'pixels',
          sizeMinPixels: 18,
          sizeMaxPixels: 34,
          billboard: true,
          alphaCutoff: 0.05,
          pickable: true,
        }));
      }
    }

    return layers;
  }

  function buildVehicleHeadsLayer(ctx, heads) {
    return new ScatterplotLayer({
      id: 'heads',
      data: heads,
      getPosition: (d) => d.pos,
      getRadius: 52,
      getFillColor: (d) => {
        if (ctx.focusedRoute && d.trip.s !== ctx.focusedRoute) return [50, 55, 60, 180];
        if (ctx.focusedRoute && d.trip.s === ctx.focusedRoute) return [...getVehicleDisplayColor(ctx, d), 220];
        return ctx.getVehicleMarkerColor(d);
      },
      getLineColor: [24, 28, 36, 220],
      stroked: ctx.QUALITY.level > 0,
      lineWidthMinPixels: 1.5,
      radiusMinPixels: 3,
      radiusMaxPixels: 13,
      pickable: true,
    });
  }

  function buildVehicleIconLayer(ctx, heads) {
    return new IconLayer({
      id: 'vehicle-icons',
      data: heads,
      getPosition: (d) => d.pos,
      getIcon: (d) => ctx.getVehicleIconDefinition(d.trip.t, getVehicleDisplayColor(ctx, d)),
      getSize: 28,
      sizeUnits: 'pixels',
      sizeMinPixels: 16,
      sizeMaxPixels: 34,
      billboard: true,
      alphaCutoff: 0.05,
      pickable: false,
    });
  }

  function buildVehicleLabelLayer(ctx, heads) {
    if (!shouldShowVehicleLabels(ctx)) return null;
    const labelData = heads.filter((entry) => entry.trip?.s === ctx.focusedRoute);
    if (!labelData.length) return null;
    return new TextLayer({
      id: 'vehicle-labels',
      data: labelData,
      getPosition: (d) => d.pos,
      getText: (d) => getVehicleLabel(d),
      getSize: 15,
      getColor: () => [244, 247, 252, 255],
      getBackgroundColor: (d) => [...getVehicleDisplayColor(ctx, d), 220],
      background: true,
      getBorderColor: [14, 18, 24, 180],
      borderWidth: 1,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -20],
      fontFamily: 'JetBrains Mono, monospace',
      sizeUnits: 'pixels',
      sizeMinPixels: 13,
      sizeMaxPixels: 22,
      characterSet: 'auto',
      billboard: true,
      pickable: false,
    });
  }

  function build3DVehicleLayer() {
    return null;
  }

  function buildLayers() {
    const ctx = getCtx();
    if (!ctx) return [];

    const now = performance.now();
    const buildInterval = ctx.QUALITY.level === 0 ? 200 : ctx.QUALITY.level === 1 ? 120 : 80;
    if (now - lastBuildTime < buildInterval && lastBuiltLayers.length > 0) return lastBuiltLayers;
    lastBuildTime = now;

    const time = ctx.simTime;
    const { visTrips, visShapes } = getVisData(ctx);

    const nextStaticKey = getStaticLayerKey(ctx, time);
    if (nextStaticKey !== staticLayerKey) {
      staticLayers = buildStaticLayers(ctx, visShapes, time);
      staticLayerKey = nextStaticKey;
    }

    const dynamicLayers = [];

    if (ctx.showAnim) {
      const sampledTrips = ctx.focusedRoute ? visTrips.filter((trip) => trip.s === ctx.focusedRoute) : visTrips;
      const activeTrips = sampledTrips.filter((trip) => ctx.getVehiclePos(trip, time) !== null);
      const patchedTrips = activeTrips.filter((trip) => trip._tsPatched);

      if (patchedTrips.length) {
        const tripsCurrentTime = patchedTrips.some((trip) => Array.isArray(trip.ts) && trip.ts.length && trip.ts[trip.ts.length - 1] >= 86400)
          ? time
          : (time % 86400);
        dynamicLayers.push(new TripsLayer({
          id: 'trips-patched',
          data: patchedTrips.map((trip, index) => ({ trip, idx: trip._idx ?? trip.id ?? index })),
          getPath: (d) => d.trip.p,
          getTimestamps: (d) => d.trip.ts,
          getColor: (d) => {
            const trip = d.trip;
            const base = ctx.focusedRoute && trip.s === ctx.focusedRoute
              ? getDirectionColor(ctx.getRouteColorRgb(trip.s, trip.t, trip.c), trip.dir)
              : ctx.getRouteColorRgb(trip.s, trip.t, trip.c);
            return window.RenderUtils ? window.RenderUtils.getVehicleColorRgb(base, trip._delay || 0) : base;
          },
          currentTime: tripsCurrentTime,
          trailLength: ctx.showTrail ? ctx.QUALITY.trailLength : 0.01,
          widthMinPixels: 2,
          capRounded: ctx.QUALITY.rounded,
          jointRounded: ctx.QUALITY.rounded,
          fadeTrail: true,
          pickable: true,
          updateTriggers: { getColor: [ctx.focusedRoute] },
        }));
      }

      const heads = [];
      activeTrips.forEach((trip, index) => {
        const pos = ctx.getVehiclePos(trip, time);
        if (!pos) return;
        const color = getVehicleDisplayColor(ctx, trip);
        heads.push({ pos, color, c: color, trip, idx: trip._idx ?? index });
      });

      const totalActive = activeTrips.length;
      ctx.updateActiveBadge(totalActive, visTrips, visShapes);
      dynamicLayers.push(buildVehicleHeadsLayer(ctx, heads));
      dynamicLayers.push(buildVehicleIconLayer(ctx, heads));
      const vehicleLabelLayer = buildVehicleLabelLayer(ctx, heads);
      if (vehicleLabelLayer) dynamicLayers.push(vehicleLabelLayer);

      if (ctx.show3D) {
        const modelLayers = build3DVehicleLayer(ctx, activeTrips, time);
        if (modelLayers?.length) modelLayers.forEach((layer) => dynamicLayers.push(layer));
      }

      if (ctx.followTripIdx !== null) {
        const trip = ctx.TRIPS[ctx.followTripIdx];
        const pos = ctx.getVehiclePos(trip, time);
        const mapgl = getMapgl();
        if (mapgl && pos) {
          const zoom = Math.max(mapgl.getZoom(), 15.5);
          const [, , tripBearing] = ctx.getModelOrientation(trip, time);
          const bridge = getBridge();
          const lastFollowPos = bridge?.getLastFollowPos?.();
          if (!lastFollowPos || ctx.haversineM(lastFollowPos, pos) > 1) {
            bridge?.setLastFollowPos?.(pos);
            mapgl.easeTo({ center: pos, zoom, bearing: -tripBearing, pitch: 62, duration: 240, easing: (t) => t * (2 - t) });
          }
        }
      }
    } else {
      ctx.updateActiveBadge(0, visTrips, visShapes);
    }

    if (ctx.showHeadway) {
      const pairs = ctx.calcHeadwayPairs(time);
      if (pairs.length) {
        dynamicLayers.push(new LineLayer({
          id: 'headway-lines',
          data: pairs,
          getSourcePosition: (d) => d.from,
          getTargetPosition: (d) => d.to,
          getColor: (d) => d.color,
          getWidth: 3,
          widthMinPixels: 2,
          pickable: false,
          opacity: 0.8,
        }));
      }
    }

    const bunchAlarms = (ctx.showBunching || ctx.showHeadway) ? ctx.detectBunching(time) : [];
    if (ctx.showBunching && bunchAlarms.length) {
      const pulse = Math.sin(Date.now() / 180) * 0.5 + 0.5;
      dynamicLayers.push(new ScatterplotLayer({
        id: 'bunching-alarm',
        data: bunchAlarms,
        getPosition: (d) => d.pos,
        getRadius: 120 + pulse * 80,
        getFillColor: [248, 81, 73, Math.round(120 + pulse * 100)],
        getLineColor: [255, 150, 150, 255],
        stroked: true,
        lineWidthMinPixels: 2,
        radiusMinPixels: 10,
        radiusMaxPixels: 30,
        pickable: false,
        updateTriggers: { getRadius: Date.now(), getFillColor: Date.now() },
      }));
    }
    if (ctx.showBunching) ctx.updateBunchingPanel(bunchAlarms);

    if (ctx.showWaiting && ctx.stopAvgHeadways) {
      const filteredStopIds = ctx.getFilteredStopIdSet ? ctx.getFilteredStopIdSet() : null;
      const waitData = Object.entries(ctx.STOP_INFO || {}).map(([sid, stop]) => {
        if (filteredStopIds && filteredStopIds.size && !filteredStopIds.has(sid)) return null;
        if (!stop) return null;
        const deps = (ctx.STOP_DEPS?.[sid] || []).filter(([tripIdx]) => {
          const trip = ctx.TRIPS?.[tripIdx];
          if (!trip) return false;
          if (ctx.typeFilter !== 'all' && normalizeRouteType(trip.t) !== normalizeRouteType(ctx.typeFilter)) return false;
          if (ctx.activeRoutes?.has(trip.s)) return false;
          if (ctx.focusedRoute && trip.s !== ctx.focusedRoute) return false;
          return true;
        });
        if (!deps.length) return null;
        const hw = window.SimUtils?.computeDynamicHeadwaySeconds
          ? window.SimUtils.computeDynamicHeadwaySeconds(deps, ctx.simTime, ctx.HEADWAY_CFG, ctx.WAITING_CFG)
          : ctx.computeAverageHeadwaySeconds(deps);
        if (!Number.isFinite(hw)) return null;
        return { pos: [stop[0], stop[1]], hw, color: ctx.waitingColor(hw) };
      }).filter(Boolean);
      if (waitData.length) {
        dynamicLayers.push(new ColumnLayer({
          id: 'waiting-cols',
          data: waitData,
          getPosition: (d) => d.pos,
          getElevation: (d) => Math.min(120 + (d.hw / 2400) * 900, 900),
          getFillColor: (d) => d.color,
          radius: 140,
          extruded: true,
          pickable: false,
          opacity: 0.85,
        }));
      }
    }

    if (ctx.showIsochron && ctx.isochronData?.length) {
      dynamicLayers.push(new ScatterplotLayer({
        id: 'isochron-layer',
        data: ctx.isochronData,
        getPosition: (d) => d.pos,
        getRadius: 80,
        getFillColor: (d) => d.color,
        radiusMinPixels: 4,
        radiusMaxPixels: 14,
        stroked: false,
        pickable: false,
        opacity: 0.85,
      }));
      if (ctx.isochronOriginSid && ctx.STOP_INFO[ctx.isochronOriginSid]) {
        const origin = ctx.STOP_INFO[ctx.isochronOriginSid];
        dynamicLayers.push(new ScatterplotLayer({
          id: 'isochron-origin',
          data: [{ pos: [origin[0], origin[1]] }],
          getPosition: (d) => d.pos,
          getRadius: 120,
          getFillColor: [255, 255, 255, 240],
          getLineColor: [88, 166, 255, 255],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 8,
          radiusMaxPixels: 18,
          pickable: false,
        }));
      }
    }

    lastBuiltLayers = [...staticLayers, ...dynamicLayers];
    return lastBuiltLayers;
  }

  return {
    buildLayers,
    buildPathLayers: () => {
      const ctx = getCtx();
      if (!ctx) return [];
      return buildPathLayers(ctx, getVisData(ctx).visShapes);
    },
    getVisData: () => {
      const ctx = getCtx();
      if (!ctx) return { visTrips: [], visShapes: [] };
      return getVisData(ctx);
    },
    getStaticLayerKey: () => {
      const ctx = getCtx();
      if (!ctx) return '';
      return getStaticLayerKey(ctx, ctx.simTime);
    },
    buildStaticLayers: () => {
      const ctx = getCtx();
      if (!ctx) return [];
      return buildStaticLayers(ctx, getVisData(ctx).visShapes, ctx.simTime);
    },
    buildVehicleHeadsLayer: (heads) => {
      const ctx = getCtx();
      return ctx ? buildVehicleHeadsLayer(ctx, heads) : null;
    },
    buildVehicleIconLayer: (heads) => {
      const ctx = getCtx();
      return ctx ? buildVehicleIconLayer(ctx, heads) : null;
    },
    build3DVehicleLayer: (visTrips, time) => {
      const ctx = getCtx();
      return ctx ? build3DVehicleLayer(ctx, visTrips, time) : null;
    },
    refreshLayersNow,
    invalidateCaches,
  };
})();
