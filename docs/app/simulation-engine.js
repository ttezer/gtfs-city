window.SimulationEngine = (function () {
  const SATELLITE_STYLE = {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Esri World Imagery',
      },
    },
    layers: [{ id: 'esri-world-imagery', type: 'raster', source: 'esri' }],
  };
  const fpsFrames = [];
  let sparkLastHour = -1;
  let lastNeedleX = -1;
  let bandsDrawn = false;
  let bandsFill = null;
  let currentPhase = '';
  let currentStyle = '';
  let lastAppliedStyleName = 'auto';
  let headwayGen = 0;
  let animFrame = 0;
  let started = false;

  function getContext() {
    return window.LegacySimulationBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function drawSparkline() {
    const ctx = getContext();
    if (!ctx) return;

    const canvas = getElement('sparkline');
    const needleCanvas = getElement('sparkline-needle');
    if (!canvas || !needleCanvas) return;

    const width = canvas.offsetWidth || 268;
    const height = 28;
    const curHour = Math.floor((ctx.simTime / 3600) % 24);
    const hourlyCounts = ctx.hourlyCounts || [];
    const hourChanged = curHour !== sparkLastHour || canvas.width !== width;

    if (hourChanged) {
      sparkLastHour = curHour;
      canvas.width = width;
      canvas.height = height;
      needleCanvas.width = width;
      needleCanvas.height = height;

      const context2d = canvas.getContext('2d');
      context2d.clearRect(0, 0, width, height);
      const maxCount = Math.max(...hourlyCounts, 1);
      const barWidth = width / 24;

      hourlyCounts.forEach((count, hour) => {
        const barHeight = Math.max(3, (count / maxCount) * (height - 4));
        context2d.fillStyle = hour >= 7 && hour <= 9
          ? 'rgba(210,153,34,0.85)'
          : hour >= 17 && hour <= 19
            ? 'rgba(248,81,73,0.85)'
            : 'rgba(88,166,255,0.45)';
        context2d.fillRect(hour * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      });
    }

    const nowX = (((ctx.simTime / 3600) % 24) / 24) * width;
    if (Math.abs(nowX - lastNeedleX) < 0.5 && !hourChanged) return;
    lastNeedleX = nowX;

    const needle2d = needleCanvas.getContext('2d');
    needle2d.clearRect(0, 0, width, height);
    needle2d.strokeStyle = '#fff';
    needle2d.lineWidth = 2;
    needle2d.beginPath();
    needle2d.moveTo(nowX, 0);
    needle2d.lineTo(nowX, height);
    needle2d.stroke();
    needle2d.fillStyle = '#fff';
    needle2d.beginPath();
    needle2d.arc(nowX, height - 2, 3, 0, Math.PI * 2);
    needle2d.fill();
  }

  function drawSliderBands() {
    const ctx = getContext();
    if (!ctx) return;

    const svg = getElement('slider-bands');
    if (!svg?.parentElement) return;

    const width = svg.parentElement.offsetWidth || 268;
    if (!bandsDrawn) {
      bandsDrawn = true;
      svg.setAttribute('viewBox', `0 0 ${width} 6`);
      svg.setAttribute('width', width);

      const band = (from, to, color, opacity) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', (from / 24) * width);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', ((to - from) / 24) * width);
        rect.setAttribute('height', 6);
        rect.setAttribute('fill', color);
        rect.setAttribute('opacity', opacity);
        svg.appendChild(rect);
      };

      svg.innerHTML = '';
      const rail = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rail.setAttribute('x', 0);
      rail.setAttribute('y', 0);
      rail.setAttribute('width', width);
      rail.setAttribute('height', 6);
      rail.setAttribute('fill', 'rgba(48,54,61,0.7)');
      rail.setAttribute('rx', 3);
      svg.appendChild(rail);

      band(0, 5, '#8957e5', 0.4);
      band(5, 7, '#d29922', 0.35);
      band(7, 9, '#d29922', 0.65);
      band(9, 17, '#3fb950', 0.2);
      band(17, 19, '#f85149', 0.65);
      band(19, 22, '#58a6ff', 0.2);
      band(22, 24, '#8957e5', 0.4);

      bandsFill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bandsFill.setAttribute('y', 0);
      bandsFill.setAttribute('height', 6);
      bandsFill.setAttribute('fill', 'rgba(88,166,255,0.3)');
      bandsFill.setAttribute('rx', 3);
      svg.appendChild(bandsFill);
    }

    if (bandsFill) {
      bandsFill.setAttribute('width', ((ctx.simTime % 86400) / 86400) * width);
    }
  }

  function updateDayNight() {
    const ctx = getContext();
    if (!ctx?.mapgl) return;

    const phase = ctx.getPhase(ctx.simTime);
    const badge = getElement('daynight-badge');
    let targetStyle;

    if (ctx.currentMapStyle === 'satellite') {
      targetStyle = SATELLITE_STYLE;
      if (badge) {
        badge.textContent = '🛰️ UYDU';
        badge.style.background = '#1a2332';
      }
    } else if (ctx.currentMapStyle === 'dark') {
      targetStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
      if (badge) {
        badge.textContent = '🌙 KOYU';
        badge.style.background = '#0d1520';
      }
    } else if (ctx.currentMapStyle === 'light') {
      targetStyle = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
      if (badge) {
        badge.textContent = '☀️ AÇIK';
        badge.style.background = '#f0f2f5';
      }
    } else {
      const phaseCfg = ctx.PHASE_CFG[phase];
      if (badge) {
        badge.textContent = phaseCfg.badge;
        badge.style.background = phaseCfg.bg;
      }
      targetStyle = phaseCfg.style;
    }

    if (phase !== currentPhase || ctx.currentMapStyle !== lastAppliedStyleName || targetStyle !== currentStyle) {
      currentPhase = phase;
      lastAppliedStyleName = ctx.currentMapStyle;
      currentStyle = targetStyle;
      document.body.style.backgroundColor = ctx.currentMapStyle === 'auto'
        ? ctx.PHASE_CFG[phase].bg
        : (ctx.currentMapStyle === 'light' ? '#f0f2f5' : '#080c12');
      ctx.mapgl.setStyle(targetStyle);
    }
  }

  function updateFPS(ts) {
    const ctx = getContext();
    if (!ctx?.QUALITY) return;

    fpsFrames.push(ts);
    if (fpsFrames.length > 60) fpsFrames.shift();
    if (fpsFrames.length <= 1) return;

    const fps = Math.round((fpsFrames.length - 1) / ((fpsFrames[fpsFrames.length - 1] - fpsFrames[0]) / 1000));
    const element = getElement('fps-val');
    if (element) {
      const qualityLabel = ['🐢', '🚶', '🚀'][ctx.QUALITY.level];
      element.textContent = `${fps} ${qualityLabel}`;
      element.className = fps > 45 ? 'good' : fps > 25 ? 'mid' : 'bad';
    }
    ctx.QUALITY.update(ts, fps);
  }

  function updateSpeedLabel() {
    const ctx = getContext();
    if (!ctx) return;

    const speed = ctx.SPEEDS[ctx.speedIdx];
    const element = getElement('speed-lbl');
    if (element) {
      element.textContent = speed < 60 ? `${speed}×` : `${Math.round(speed / 60)}dk/s`;
    }
  }

  function startReplay() {
    const ctx = getContext();
    if (!ctx) return;

    ctx.setIsReplay(true);
    ctx.setSimTime(6 * 3600);
    ctx.setSpeedIdx(6);
    ctx.setSimSpeed(600);
    ctx.setSimPaused(false);
    ctx.syncPlayButton?.();
    getElement('replay-bar')?.classList.remove('hidden');
    updateSpeedLabel();
  }

  function stopReplay() {
    const ctx = getContext();
    if (!ctx) return;

    ctx.setIsReplay(false);
    ctx.setSpeedIdx(3);
    ctx.setSimSpeed(60);
    ctx.syncPlayButton?.();
    getElement('replay-bar')?.classList.add('hidden');
    updateSpeedLabel();
  }

  function updateReplayBar() {
    const ctx = getContext();
    if (!ctx?.isReplay) return;

    const pct = (((ctx.simTime % 86400) - 6 * 3600) / (18 * 3600)) * 100;
    const fill = getElement('replay-fill');
    const label = getElement('replay-time-lbl');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (label) label.textContent = ctx.secsToHHMM(ctx.simTime % 86400);
    if (ctx.simTime % 86400 >= 23 * 3600) {
      if (ctx.replayLoop) ctx.setSimTime(6 * 3600);
      else stopReplay();
    }
  }

  function calcHeadwayPairs(time) {
    const ctx = getContext();
    if (!ctx) return [];

    const result = window.AnalyticsUtils.calcHeadwayPairs({
      trips: ctx.focusedRoute ? ctx.TRIPS.filter((trip) => trip?.s === ctx.focusedRoute) : ctx.TRIPS,
      time,
      typeFilter: ctx.typeFilter,
      activeRoutes: ctx.activeRoutes,
      bunchingThreshold: ctx.bunchingThreshold,
      headwayCfg: ctx.HEADWAY_CFG,
      getVehiclePos: ctx.getVehiclePos,
      getTripProgressAtTime: ctx.getTripProgressAtTime,
      getTripRuntimeOffset: ctx.getTripRuntimeOffset,
      inferTripDirectionLabel: ctx.inferTripDirectionLabel,
      haversineM: ctx.haversineM,
    });
    ctx.setBunchingEvents(result.bunchingEvents);
    return result.lines;
  }

  function detectBunching(time) {
    const ctx = getContext();
    if (!ctx) return [];

    if (!ctx.showHeadway) calcHeadwayPairs(time);
    return ctx.bunchingEvents;
  }

  function precomputeStopHeadways() {
    const ctx = getContext();
    if (!ctx) return;

    const currentSec = ((ctx.simTime % 86400) + 86400) % 86400;
    ctx.setWaitingComputedForSec(currentSec);
    ctx.setStopAvgHeadways({});
    const generation = ++headwayGen;
    const stopIds = Object.keys(ctx.AppState.stopDeps || {});
    let index = 0;

    function doWork(deadline) {
      if (headwayGen !== generation) return;

      const stopAvgHeadways = ctx.getStopAvgHeadways();
      while (index < stopIds.length && (deadline ? deadline.timeRemaining() > 1 : true)) {
        const stopId = stopIds[index++];
        const avgHeadway = window.SimUtils?.computeDynamicHeadwaySeconds
          ? window.SimUtils.computeDynamicHeadwaySeconds(ctx.AppState.stopDeps[stopId], currentSec, ctx.HEADWAY_CFG, ctx.WAITING_CFG)
          : ctx.computeAverageHeadwaySeconds(ctx.AppState.stopDeps[stopId]);
        if (avgHeadway) stopAvgHeadways[stopId] = avgHeadway;
      }

      if (index < stopIds.length) {
        if (window.requestIdleCallback) window.requestIdleCallback(doWork);
        else setTimeout(doWork, 0);
      } else {
        ctx.buildWorstStops();
        if (ctx.showWaiting) ctx.refreshLayersNow();
      }
    }

    if (window.requestIdleCallback) window.requestIdleCallback(doWork);
    else setTimeout(doWork, 0);
  }

  function ensureDynamicStopHeadways(force = false) {
    const ctx = getContext();
    if (!ctx?.showWaiting) return;

    const currentSec = ((ctx.simTime % 86400) + 86400) % 86400;
    const bucket = Math.floor(currentSec / ctx.WAITING_CFG.bucketSeconds);
    if (!force && ctx.waitingTimeBucket === bucket) return;
    ctx.setWaitingTimeBucket(bucket);
    precomputeStopHeadways();
  }

  function animate(ts) {
    const ctx = getContext();
    if (!ctx?.isContextReady?.()) {
      started = false;
      setTimeout(() => start(), 250);
      return;
    }

    if (!ctx.lastTs) ctx.setLastTs(ts);
    const dt = (ts - ctx.lastTs) / 1000;
    ctx.setLastTs(ts);

    if (!ctx.simPaused && dt < 0.5) {
      let nextTime = ctx.simTime + dt * ctx.simSpeed;
      if (nextTime >= 86400) nextTime -= 86400;
      if (nextTime < 0) nextTime += 86400;
      ctx.setSimTime(nextTime);
    }

    updateFPS(ts);
    animFrame++;

    if (animFrame % 3 === 0) {
      const clock = document.getElementById('clock');
      const slider = document.getElementById('time-slider');
      if (clock) clock.textContent = ctx.secsToHHMM(ctx.simTime % 86400);
      if (slider) slider.value = Math.floor(ctx.simTime % 86400);

      drawSparkline();
      drawSliderBands();
      updateDayNight();
      updateReplayBar();

      if (ctx.showWaiting) ensureDynamicStopHeadways();
      if (ctx.selectedTripIdx !== null) ctx.updateVehiclePanel();
      if (ctx.activeStopData) ctx.renderStopPanel(ctx.activeStopData);
    }

    if (ctx.deckgl) ctx.deckgl.setProps({ layers: ctx.buildLayers() });
    requestAnimationFrame(animate);
  }

  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(animate);
  }

  return {
    start,
    animate,
    drawSparkline,
    drawSliderBands,
    updateDayNight,
    updateFPS,
    startReplay,
    stopReplay,
    updateReplayBar,
    calcHeadwayPairs,
    detectBunching,
    precomputeStopHeadways,
    ensureDynamicStopHeadways,
    updateSpeedLabel,
  };
})();
