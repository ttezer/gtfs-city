window.PlannerManager = (function () {
  let fromStopId = null;
  let toStopId = null;
  let initialized = false;

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function getCtx() {
    return window.LegacyPlannerBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  class MinHeap {
    constructor() {
      this.items = [];
    }

    push(cost, id) {
      this.items.push([cost, id]);
      let index = this.items.length - 1;
      while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        if (this.items[parentIndex][0] <= this.items[index][0]) break;
        [this.items[parentIndex], this.items[index]] = [this.items[index], this.items[parentIndex]];
        index = parentIndex;
      }
    }

    pop() {
      const top = this.items[0];
      const last = this.items.pop();
      if (this.items.length) {
        this.items[0] = last;
        let index = 0;
        while (true) {
          const left = 2 * index + 1;
          const right = 2 * index + 2;
          let smallest = index;
          if (left < this.items.length && this.items[left][0] < this.items[smallest][0]) smallest = left;
          if (right < this.items.length && this.items[right][0] < this.items[smallest][0]) smallest = right;
          if (smallest === index) break;
          [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
          index = smallest;
        }
      }
      return top;
    }

    get size() {
      return this.items.length;
    }
  }

  function dijkstra(from, to) {
    const ctx = getCtx();
    if (!ctx?.ADJ?.[from] && from !== to) return null;
    const dist = { [from]: 0 };
    const prev = {};
    const visited = new Set();
    const heap = new MinHeap();
    heap.push(0, from);
    while (heap.size) {
      const [cost, stopId] = heap.pop();
      if (visited.has(stopId)) continue;
      visited.add(stopId);
      if (stopId === to) break;
      for (const [nextId, seconds, line] of (ctx.ADJ[stopId] || [])) {
        if (visited.has(nextId)) continue;
        const nextCost = cost + seconds;
        if (nextCost < (dist[nextId] ?? Infinity)) {
          dist[nextId] = nextCost;
          prev[nextId] = { from: stopId, secs: seconds, line };
          heap.push(nextCost, nextId);
        }
      }
    }
    if (!Object.prototype.hasOwnProperty.call(dist, to)) return null;
    const path = [];
    let current = to;
    while (current && prev[current]) {
      const step = prev[current];
      path.unshift({ to: current, from: step.from, secs: step.secs, line: step.line });
      current = step.from;
    }
    return path;
  }

  function calcIsochronFromStop(startSid, maxSecs = 3600) {
    const ctx = getCtx();
    if (!ctx?.ADJ || !ctx.STOP_INFO) return [];
    const boardPenalty = 600;
    const dist = { [startSid]: 0 };
    const lastLine = { [startSid]: null };
    const visited = new Set();
    const heap = new MinHeap();
    heap.push(0, startSid);
    while (heap.size) {
      const [cost, stopId] = heap.pop();
      if (visited.has(stopId)) continue;
      visited.add(stopId);
      if (cost > maxSecs) continue;
      for (const [nextId, seconds, line] of (ctx.ADJ[stopId] || [])) {
        if (visited.has(nextId)) continue;
        const penalty = line !== '??' && lastLine[stopId] !== null && lastLine[stopId] !== line
          ? boardPenalty
          : 0;
        const nextCost = cost + seconds + penalty;
        if (nextCost <= maxSecs && nextCost < (dist[nextId] ?? Infinity)) {
          dist[nextId] = nextCost;
          lastLine[nextId] = line;
          heap.push(nextCost, nextId);
        }
      }
    }
    return Object.entries(dist).map(([stopId, seconds]) => {
      const info = ctx.STOP_INFO[stopId];
      if (!info) return null;
      const mins = seconds / 60;
      const color = mins <= 15
        ? [63, 185, 80, 200]
        : mins <= 30
          ? [210, 153, 34, 200]
          : mins <= 45
            ? [224, 123, 57, 200]
            : [248, 81, 73, 200];
      return { pos: [info[0], info[1]], secs: seconds, color, name: window.RenderUtils?.displayText?.(info[2] || stopId) || info[2] || stopId };
    }).filter(Boolean);
  }

  function findNearestStopToCoord(lon, lat) {
    const ctx = getCtx();
    if (!ctx?.STOP_INFO) return null;
    let bestStopId = null;
    let bestDistance = Infinity;
    for (const [stopId, info] of Object.entries(ctx.STOP_INFO)) {
      const dx = info[0] - lon;
      const dy = info[1] - lat;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStopId = stopId;
      }
    }
    return bestStopId;
  }

  function updateIsochronPanel(stopId, data) {
    const ctx = getCtx();
    const info = ctx?.STOP_INFO?.[stopId];
    const label = getElement('isochron-origin-label');
    const hint = getElement('isochron-hint');
    const stats = getElement('isochron-stats');
    if (label) {
      label.textContent = translate('plannerIsochronOrigin', '📍 {name}')
        .replace('{name}', window.RenderUtils?.displayText?.(info ? info[2] : stopId) || (info ? info[2] : stopId));
      label.style.display = 'block';
    }
    if (hint) hint.style.display = 'none';
    if (stats) {
      const cnt15 = data.filter((entry) => entry.secs <= 900).length;
      const cnt30 = data.filter((entry) => entry.secs <= 1800).length;
      const cnt60 = data.length;
      stats.innerHTML = `15dk: <b style="color:#3fb950">${cnt15} durak</b> &nbsp; 30dk: <b style="color:#d29922">${cnt30} durak</b> &nbsp; 60dk: <b style="color:#f85149">${cnt60} durak</b>`;
      stats.style.display = 'block';
    }
  }

  function triggerIsochron(lon, lat) {
    const ctx = getCtx();
    const stopId = findNearestStopToCoord(lon, lat);
    if (!ctx || !stopId) return;
    const data = calcIsochronFromStop(stopId, 3600);
    ctx.setIsochronOriginSid(stopId);
    ctx.setIsochronData(data);
    ctx.clearStaticLayerKey();
    ctx.refreshLayersNow();
    updateIsochronPanel(stopId, data);
  }

  function clearIsochron() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.setIsochronData(null);
    ctx.setIsochronOriginSid(null);
    ctx.clearStaticLayerKey();
    ctx.refreshLayersNow();
    const label = getElement('isochron-origin-label');
    const hint = getElement('isochron-hint');
    const stats = getElement('isochron-stats');
    if (label) {
      label.textContent = '';
      label.style.display = 'none';
    }
    if (hint) hint.style.display = 'block';
    if (stats) stats.style.display = 'none';
  }

  function updatePlannerContext() {
    const ctx = getCtx();
    const label = getElement('route-planner-context');
    if (!label) return;
    const cityName = ctx?.displayText?.(ctx.getActiveCity?.()?.name || '') || '';
    label.textContent = cityName
      ? translate('plannerDatasetActive', '{city} · aktif veri seti').replace('{city}', cityName)
      : translate('plannerDatasetDefault', 'Aktif veri seti');
  }

  function showPlannerMessage(title, message, type = 'info') {
    const result = getElement('route-result');
    const steps = getElement('route-steps');
    if (!result || !steps) return;
    result.classList.remove('hidden');
    steps.innerHTML = `
      <div class="route-step">
        <span class="step-icon">${type === 'error' ? translate('plannerMessageErrorIcon', '⚠') : translate('plannerMessageInfoIcon', 'ℹ')}</span>
        <div class="step-info">
          <div class="step-line">${title}</div>
          <div class="step-detail">${message}</div>
        </div>
      </div>`;
  }

  function showSelectedRoute() {
    const ctx = getCtx();
    if (!ctx?.STOP_INFO?.[fromStopId] || !ctx?.STOP_INFO?.[toStopId]) {
      showPlannerMessage(
        translate('plannerStopValidationTitle', 'Durak doğrulanamadı'),
        translate('plannerStopValidationMessage', 'Lütfen aktif şehir verisinden başlangıç ve varış durağını yeniden seçin.'),
        'error'
      );
      return;
    }
    const path = dijkstra(fromStopId, toStopId);
    if (!path?.length) {
      showPlannerMessage(
        translate('plannerNoRouteTitle', 'Rota bulunamadı'),
        translate('plannerNoRouteMessage', 'Seçilen duraklar arasında uygun bir toplu taşıma bağlantısı hesaplanamadı.'),
        'error'
      );
      return;
    }
    window.UIManager?.showRouteResult?.(path);
  }

  function reset() {
    fromStopId = null;
    toStopId = null;
    const ids = ['stop-from', 'stop-to'];
    ids.forEach((id) => {
      const input = getElement(id);
      if (input) input.value = '';
    });
    getElement('from-suggestions')?.classList.remove('show');
    getElement('to-suggestions')?.classList.remove('show');
    getElement('route-result')?.classList.add('hidden');
    updatePlannerContext();
    const ctx = getCtx();
    ctx?.setRouteHighlightPath(null);
  }

  function bindRoutePlannerControls() {
    const panel = getElement('route-planner-panel');
    const toggle = getElement('route-planner-toggle');
    const closeButton = getElement('route-planner-close');
    const routeButton = getElement('btn-route');
    const routeResultClose = getElement('route-result-close');
    if (toggle && panel) {
      toggle.onclick = () => {
        panel.classList.toggle('hidden');
        updatePlannerContext();
      };
    }
    if (closeButton && panel) {
      closeButton.onclick = () => panel.classList.add('hidden');
    }
    window.UIManager?.setupStopSearch?.('stop-from', 'from-suggestions', (stopId) => { fromStopId = stopId; });
    window.UIManager?.setupStopSearch?.('stop-to', 'to-suggestions', (stopId) => { toStopId = stopId; });
    if (routeButton) {
      routeButton.onclick = () => {
        if (!fromStopId || !toStopId) {
          showPlannerMessage(
            translate('plannerMissingSelectionTitle', 'Durak seçimi eksik'),
            translate('plannerMissingSelectionMessage', 'Lütfen aktif şehirden başlangıç ve varış duraklarını seçin.'),
            'error'
          );
          return;
        }
        showSelectedRoute();
      };
    }
    if (routeResultClose) {
      routeResultClose.onclick = () => {
        getElement('route-result')?.classList.add('hidden');
        getCtx()?.setRouteHighlightPath(null);
      };
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    bindRoutePlannerControls();
    updatePlannerContext();
    window.addEventListener('app-language-change', updatePlannerContext);
  }

  return {
    init,
    reset,
    dijkstra,
    calcIsochronFromStop,
    triggerIsochron,
    clearIsochron,
  };
})();
