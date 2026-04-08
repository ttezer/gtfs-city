window.RuntimeMetroMapControls = (function () {
  const VIEWBOX_WIDTH = 1400;
  const VIEWBOX_HEIGHT = 960;
  const PADDING = 88;
  const GRID_SIZE = 26;
  const NODE_SEPARATION = 18;
  const LABEL_LIMIT = 18;

  let hooks = {
    getTrips: () => [],
    getStopInfo: () => ({}),
    getRouteMeta: (routeShort, routeType, fallbackColor, longName) => ({
      short: String(routeShort || ''),
      longName: String(longName || ''),
      color: fallbackColor || [88, 166, 255],
      type: String(routeType || '3'),
    }),
    colorToCss: (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
    displayText: (value) => String(value ?? '').trim(),
    showToast: () => {},
  };

  let cachedRouteOptions = [];
  let currentSvgMarkup = '';
  let currentFileName = 'gtfs-city-metro-diyagrami';

  function configureRuntimeMetroMap(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function getRepresentativeTrip(routeShort) {
    const trips = hooks.getTrips()
      .filter((trip) => trip?.s === routeShort && Array.isArray(trip.st) && trip.st.length >= 2);
    if (!trips.length) return null;
    return trips.reduce((best, trip) => {
      const bestLength = Array.isArray(best?.st) ? best.st.length : 0;
      if (trip.st.length !== bestLength) return trip.st.length > bestLength ? trip : best;
      const bestDuration = Number.isFinite(best?.d) ? best.d : -1;
      const tripDuration = Number.isFinite(trip?.d) ? trip.d : -1;
      return tripDuration > bestDuration ? trip : best;
    }, trips[0]);
  }

  function buildRouteOptions() {
    const trips = hooks.getTrips();
    const seen = new Set();
    cachedRouteOptions = trips
      .filter((trip) => trip?.s && !seen.has(trip.s) && seen.add(trip.s))
      .map((trip) => {
        const meta = hooks.getRouteMeta(trip.s, trip.t, trip.c, trip.ln || trip.h || '');
        return {
          short: trip.s,
          longName: hooks.displayText(meta.longName || trip.ln || trip.h || ''),
          type: trip.t,
          colorCss: hooks.colorToCss(meta.color || [88, 166, 255]),
        };
      })
      .sort((left, right) => String(left.short || '').localeCompare(String(right.short || ''), 'tr'));
    return cachedRouteOptions;
  }

  function syncRouteChecklist(filterValue = '') {
    const list = document.getElementById('metro-map-route-list');
    if (!list) return;
    const filter = String(filterValue || '').trim().toLowerCase();
    const routes = cachedRouteOptions.length ? cachedRouteOptions : buildRouteOptions();
    list.innerHTML = routes
      .filter((route) => {
        const haystack = `${route.short} ${route.longName}`.toLowerCase();
        return !filter || haystack.includes(filter);
      })
      .map((route) => `
        <label class="metro-route-option">
          <input type="checkbox" value="${route.short}">
          <span class="metro-route-chip" style="background:${route.colorCss}"></span>
          <span class="metro-route-copy">
            <strong>${route.short}</strong>
            <small>${route.longName || 'Uzun ad yok'}</small>
          </span>
        </label>
      `)
      .join('');
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const countEl = document.getElementById('metro-map-selection-count');
    if (!countEl) return;
    const count = getSelectedRoutes().length;
    countEl.textContent = count > 0 ? `${count} hat seçildi` : 'Hat seçilmedi';
  }

  function getSelectedRoutes() {
    return [...document.querySelectorAll('#metro-map-route-list input[type="checkbox"]:checked')]
      .map((input) => String(input.value || ''))
      .filter(Boolean);
  }

  function openMetroMapModal() {
    buildRouteOptions();
    syncRouteChecklist(document.getElementById('metro-map-route-filter')?.value || '');
    document.getElementById('metro-map-modal')?.classList.remove('hidden');
    document.body.classList.add('metro-map-open');
  }

  function closeMetroMapModal() {
    document.getElementById('metro-map-modal')?.classList.add('hidden');
    document.body.classList.remove('metro-map-open');
  }

  function openMetroMapOutput(svgMarkup, selectedRoutes) {
    currentSvgMarkup = svgMarkup;
    currentFileName = `gtfs-city-metro-${selectedRoutes.join('-').slice(0, 72) || 'secim'}`;
    const modal = document.getElementById('metro-map-output-modal');
    const content = document.getElementById('metro-map-output-content');
    if (!modal || !content) return;
    content.innerHTML = svgMarkup;
    modal.classList.remove('hidden');
    document.body.classList.add('metro-map-output-open');
  }

  function closeMetroMapOutput() {
    document.getElementById('metro-map-output-modal')?.classList.add('hidden');
    document.body.classList.remove('metro-map-output-open');
  }

  function getStopCoord(stopId, stopInfo) {
    const info = stopInfo[stopId];
    if (!Array.isArray(info) || !Number.isFinite(info[0]) || !Number.isFinite(info[1])) return null;
    return {
      id: stopId,
      lon: Number(info[0]),
      lat: Number(info[1]),
      name: hooks.displayText(info[2] || stopId),
    };
  }

  function buildMetroData(selectedRoutes) {
    const stopInfo = hooks.getStopInfo() || {};
    const routeData = [];
    const nodeMap = new Map();
    const edgeMap = new Map();

    selectedRoutes.forEach((routeShort) => {
      const trip = getRepresentativeTrip(routeShort);
      if (!trip) return;
      const meta = hooks.getRouteMeta(routeShort, trip.t, trip.c, trip.ln || trip.h || '');
      const rawStops = trip.st
        .map((entry) => getStopCoord(entry?.sid, stopInfo))
        .filter(Boolean)
        .filter((stop, index, list) => index === 0 || stop.id !== list[index - 1].id);
      if (rawStops.length < 2) return;

      rawStops.forEach((stop, index) => {
        let node = nodeMap.get(stop.id);
        if (!node) {
          node = {
            id: stop.id,
            lon: stop.lon,
            lat: stop.lat,
            name: stop.name,
            routes: new Set(),
            isTerminus: false,
            degree: 0,
          };
          nodeMap.set(stop.id, node);
        }
        node.routes.add(routeShort);
        if (index === 0 || index === rawStops.length - 1) node.isTerminus = true;
      });

      for (let index = 0; index < rawStops.length - 1; index++) {
        const from = rawStops[index];
        const to = rawStops[index + 1];
        const edgeKey = [from.id, to.id].sort().join('|');
        let edge = edgeMap.get(edgeKey);
        if (!edge) {
          edge = { a: from.id, b: to.id, routes: [] };
          edgeMap.set(edgeKey, edge);
          nodeMap.get(from.id).degree += 1;
          nodeMap.get(to.id).degree += 1;
        }
        if (!edge.routes.includes(routeShort)) edge.routes.push(routeShort);
      }

      routeData.push({
        short: routeShort,
        longName: hooks.displayText(meta.longName || trip.ln || trip.h || ''),
        type: String(meta.type || trip.t || '3'),
        colorCss: hooks.colorToCss(meta.color || [88, 166, 255]),
        stops: rawStops.map((stop) => stop.id),
      });
    });

    if (!routeData.length) return null;
    return { routes: routeData, nodes: [...nodeMap.values()], edgeMap };
  }

  function snapToGrid(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  function projectNodes(nodes) {
    const lons = nodes.map((node) => node.lon);
    const lats = nodes.map((node) => node.lat);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const midLat = ((minLat + maxLat) / 2) * Math.PI / 180;
    const lonScale = Math.max(Math.cos(midLat), 0.25);
    const width = Math.max((maxLon - minLon) * lonScale, 1e-6);
    const height = Math.max(maxLat - minLat, 1e-6);
    const scale = Math.min((VIEWBOX_WIDTH - PADDING * 2) / width, (VIEWBOX_HEIGHT - PADDING * 2) / height);

    return new Map(nodes.map((node) => {
      const x = PADDING + ((node.lon - minLon) * lonScale) * scale;
      const y = VIEWBOX_HEIGHT - PADDING - (node.lat - minLat) * scale;
      return [node.id, { x: snapToGrid(x), y: snapToGrid(y), baseX: x, baseY: y }];
    }));
  }

  function relaxLayout(nodes, positions) {
    for (let pass = 0; pass < 18; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const left = positions.get(nodes[i].id);
          const right = positions.get(nodes[j].id);
          const dx = right.x - left.x;
          const dy = right.y - left.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance >= NODE_SEPARATION) continue;
          const push = (NODE_SEPARATION - distance) / 2;
          const ux = dx / distance;
          const uy = dy / distance;
          left.x -= ux * push;
          left.y -= uy * push;
          right.x += ux * push;
          right.y += uy * push;
        }
      }
      nodes.forEach((node) => {
        const pos = positions.get(node.id);
        pos.x = snapToGrid((pos.x * 0.7) + (pos.baseX * 0.3));
        pos.y = snapToGrid((pos.y * 0.7) + (pos.baseY * 0.3));
      });
    }
  }

  function getNodeLabel(node) {
    const isTransfer = node.routes.size > 1 || node.degree > 2;
    if (node.isTerminus || isTransfer) return node.name;
    return '';
  }

  function getNodeRadius(node) {
    if (node.routes.size > 1 || node.degree > 2) return 8.5;
    if (node.isTerminus) return 6.5;
    return 4.2;
  }

  function buildPolylinePoints(route, positions) {
    return route.stops
      .map((stopId) => positions.get(stopId))
      .filter(Boolean)
      .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
      .join(' ');
  }

  function buildMetroSvg(selectedRoutes) {
    const metroData = buildMetroData(selectedRoutes);
    if (!metroData) throw new Error('Seçilen hatlar için durak dizisi bulunamadı.');
    const positions = projectNodes(metroData.nodes);
    relaxLayout(metroData.nodes, positions);

    const labels = metroData.nodes
      .map((node) => ({ node, label: getNodeLabel(node), pos: positions.get(node.id) }))
      .filter((entry) => entry.label)
      .sort((left, right) => (right.node.routes.size - left.node.routes.size) || left.label.localeCompare(right.label, 'tr'))
      .slice(0, LABEL_LIMIT);

    const legendX = VIEWBOX_WIDTH - 170;
    const legendY = VIEWBOX_HEIGHT - PADDING - (metroData.routes.length * 28);
    const titleX = VIEWBOX_WIDTH - PADDING;
    const titleY = Math.max(56, legendY - 32);
    const routeLegend = metroData.routes.map((route, index) => `
      <g transform="translate(${legendX}, ${legendY + index * 28})">
        <line x1="0" y1="0" x2="28" y2="0" stroke="${route.colorCss}" stroke-width="10" stroke-linecap="round"></line>
        <text x="40" y="5" fill="#f7fafc" font-size="16" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${route.short}</text>
      </g>
    `).join('');

    const routePaths = metroData.routes.map((route) => {
      const points = buildPolylinePoints(route, positions);
      return `
        <polyline points="${points}" fill="none" stroke="rgba(6,10,16,0.7)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"></polyline>
        <polyline points="${points}" fill="none" stroke="${route.colorCss}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></polyline>
      `;
    }).join('');

    const nodeDots = metroData.nodes.map((node) => {
      const pos = positions.get(node.id);
      const radius = getNodeRadius(node);
      const fill = node.routes.size > 1 || node.degree > 2 ? '#f7fafc' : '#0b1220';
      const stroke = node.routes.size > 1 || node.degree > 2 ? '#0b1220' : '#f7fafc';
      return `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="3"></circle>`;
    }).join('');

    const labelMarkup = labels.map(({ label, pos }, index) => {
      const above = index % 2 === 0;
      const x = Math.round(pos.x + 12);
      const y = Math.round(pos.y + (above ? -12 : 24));
      return `
        <text x="${x}" y="${y}" fill="#f7fafc" font-size="14" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${label}</text>
      `;
    }).join('');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" role="img" aria-label="Metro diyagramı">
        <rect width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" fill="#07111c"></rect>
        <rect x="24" y="24" width="${VIEWBOX_WIDTH - 48}" height="${VIEWBOX_HEIGHT - 48}" rx="28" fill="url(#bg)"></rect>
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d1b2a"></stop>
            <stop offset="100%" stop-color="#101b2f"></stop>
          </linearGradient>
        </defs>
        <text x="${titleX}" y="${titleY}" text-anchor="end" fill="#f7fafc" font-size="30" font-family="Segoe UI, Arial, sans-serif" font-weight="800">Hat Diyagram Haritası</text>
        ${routeLegend}
        <g>
          ${routePaths}
          ${nodeDots}
          ${labelMarkup}
        </g>
      </svg>
    `;
  }

  async function saveMetroMapPng() {
    if (!currentSvgMarkup) {
      hooks.showToast('Önce diyagram oluştur.', 'warn');
      return;
    }
    try {
      const blob = new Blob([currentSvgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = VIEWBOX_WIDTH * 2;
      canvas.height = VIEWBOX_HEIGHT * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#07111c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      URL.revokeObjectURL(url);
      if (!pngBlob) throw new Error('PNG üretilemedi.');
      const objectUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${currentFileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      hooks.showToast('Metro diyagramı indirildi.', 'ok');
    } catch (error) {
      hooks.showToast(error?.message || 'Metro diyagramı kaydedilemedi.', 'err');
    }
  }

  function generateMetroMapPreview() {
    const selectedRoutes = getSelectedRoutes();
    if (selectedRoutes.length < 2) {
      hooks.showToast('En az iki hat seç.', 'warn');
      return;
    }
    const svgMarkup = buildMetroSvg(selectedRoutes);
    closeMetroMapModal();
    openMetroMapOutput(svgMarkup, selectedRoutes);
  }

  function bindMetroMapControls() {
    document.getElementById('metro-map-toggle-btn')?.classList.remove('hidden');
    document.getElementById('metro-map-toggle-btn')?.addEventListener('click', openMetroMapModal);
    document.getElementById('metro-map-close')?.addEventListener('click', closeMetroMapModal);
    document.getElementById('metro-map-cancel')?.addEventListener('click', closeMetroMapModal);
    document.getElementById('metro-map-generate')?.addEventListener('click', generateMetroMapPreview);
    document.getElementById('metro-map-route-filter')?.addEventListener('input', (event) => {
      syncRouteChecklist(event.target.value || '');
    });
    document.getElementById('metro-map-select-all')?.addEventListener('click', () => {
      document.querySelectorAll('#metro-map-route-list input[type="checkbox"]').forEach((input) => { input.checked = true; });
      updateSelectedCount();
    });
    document.getElementById('metro-map-clear')?.addEventListener('click', () => {
      document.querySelectorAll('#metro-map-route-list input[type="checkbox"]').forEach((input) => { input.checked = false; });
      updateSelectedCount();
    });
    document.getElementById('metro-map-route-list')?.addEventListener('change', updateSelectedCount);
    document.getElementById('metro-map-output-close')?.addEventListener('click', closeMetroMapOutput);
    document.getElementById('metro-map-download')?.addEventListener('click', saveMetroMapPng);
    document.getElementById('metro-map-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'metro-map-modal') closeMetroMapModal();
    });
    document.getElementById('metro-map-output-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'metro-map-output-modal') closeMetroMapOutput();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!document.getElementById('metro-map-output-modal')?.classList.contains('hidden')) closeMetroMapOutput();
      else if (!document.getElementById('metro-map-modal')?.classList.contains('hidden')) closeMetroMapModal();
    });
  }

  return {
    configureRuntimeMetroMap,
    bindMetroMapControls,
  };
})();
