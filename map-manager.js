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

  const deck = window.deck || window.Deck;
  const {
    TripsLayer,
    PathLayer,
    ScatterplotLayer,
    ColumnLayer,
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
    if (direction === 0) return toneColor(baseColor, 24);
    if (direction === 1) return toneColor(baseColor, -28);
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

  function getVehicleLabel(entry) {
    const trip = entry?.trip || entry;
    const routeCode = String(trip?.s || '').trim();
    if (!routeCode) return '';
    if (trip?.dir === 0) return `${routeCode} ↑`;
    if (trip?.dir === 1) return `${routeCode} ↓`;
    return routeCode;
  }

  function shouldShowVehicleLabels(ctx) {
    if (!ctx.focusedRoute || !ctx.showAnim) return false;
    const mapgl = getMapgl();
    if (!mapgl?.getZoom) return false;
    return mapgl.getZoom() >= 14.2;
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
      ctx.QUALITY.level,
      ctx.showPaths ? 1 : 0,
      ctx.showStops ? 1 : 0,
      ctx.showStopCoverage ? 1 : 0,
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
    ) {
      return { visTrips: cachedVisTrips, visShapes: cachedVisShapes };
    }

    cacheTypeFilter = ctx.typeFilter;
    cacheActiveRoutes = activeRoutesKey;
    cacheFocusedRoute = ctx.focusedRoute || null;
    cachedVisTrips = ctx.TRIPS.filter((trip) => (
      (ctx.typeFilter === 'all' || normalizeRouteType(trip.t) === normalizeRouteType(ctx.typeFilter))
      && !ctx.activeRoutes.has(trip.s)
      && (!ctx.focusedRoute || trip.s === ctx.focusedRoute)
    ));
    cachedVisShapes = ctx.SHAPES.filter((shape) => (
      (ctx.typeFilter === 'all' || normalizeRouteType(shape.t) === normalizeRouteType(ctx.typeFilter))
      && !ctx.activeRoutes.has(shape.s)
      && (!ctx.focusedRoute || shape.s === ctx.focusedRoute)
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

    if (ctx.showStopCoverage && !ctx.showIsochron && stopData.length) {
      layers.push(new ScatterplotLayer({
        id: 'stop-coverage',
        data: stopData,
        getPosition: (d) => Array.isArray(d) ? [d[0], d[1]] : d.pos,
        getRadius: 300,
        radiusUnits: 'meters',
        radiusMinPixels: 8,
        getFillColor: ctx.focusedRoute ? [...focusedRouteColor, 46] : [88, 166, 255, 34],
        stroked: false,
        pickable: false,
      }));
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
      getSize: 13,
      getColor: (d) => getVehicleDisplayColor(ctx, d),
      getBackgroundColor: [12, 16, 24, 196],
      background: true,
      getBorderColor: [220, 230, 255, 42],
      borderWidth: 1,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -18],
      fontFamily: 'JetBrains Mono, monospace',
      sizeUnits: 'pixels',
      sizeMinPixels: 11,
      sizeMaxPixels: 18,
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
