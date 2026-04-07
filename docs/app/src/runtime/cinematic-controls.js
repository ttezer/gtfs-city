window.RuntimeCinematicControls = (function () {
  let hooks = {
    getFilteredStopsData: () => [],
    getMap: () => null,
    t: (key, fallback) => fallback || key,
    startCinematic: () => {},
    stopCinematic: () => {},
    cinematicNext: () => {},
  };

  function configureRuntimeCinematic(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function getCinematicWaypoints() {
    const mapgl = hooks.getMap();
    const stopData = hooks.getFilteredStopsData?.() || [];
    const t = hooks.t;

    if (!Array.isArray(stopData) || stopData.length === 0) {
      const center = mapgl ? [mapgl.getCenter().lng, mapgl.getCenter().lat] : [28.9784, 41.0082];
      return [{
        center,
        zoom: mapgl?.getZoom?.() || 11.5,
        pitch: 52,
        bearing: 0,
        duration: 3800,
        label: t('cinematicOverview', 'Genel Bakış'),
      }];
    }

    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const stop of stopData) {
      const lon = Number(stop?.[0]);
      const lat = Number(stop?.[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      const center = mapgl ? [mapgl.getCenter().lng, mapgl.getCenter().lat] : [28.9784, 41.0082];
      return [{
        center,
        zoom: mapgl?.getZoom?.() || 11.5,
        pitch: 52,
        bearing: 0,
        duration: 3800,
        label: t('cinematicOverview', 'Genel Bakış'),
      }];
    }

    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const spanLon = Math.max(0.003, maxLon - minLon);
    const spanLat = Math.max(0.003, maxLat - minLat);
    const span = Math.max(spanLon, spanLat);
    let overviewZoom = 11.8;
    if (span > 1.2) overviewZoom = 8.7;
    else if (span > 0.8) overviewZoom = 9.5;
    else if (span > 0.45) overviewZoom = 10.3;
    else if (span > 0.2) overviewZoom = 11.1;
    else if (span > 0.1) overviewZoom = 12.1;
    else if (span < 0.04) overviewZoom = 13.2;

    const points = [
      { center: [centerLon, centerLat], zoom: overviewZoom, pitch: 52, bearing: -12, duration: 3800, label: t('cinematicOverview', 'Genel Bakış') },
      { center: [minLon + spanLon * 0.2, centerLat], zoom: Math.min(overviewZoom + 1.2, 14.4), pitch: 60, bearing: 24, duration: 4000, label: t('cinematicWestCorridor', 'Batı Koridoru') },
      { center: [maxLon - spanLon * 0.2, centerLat], zoom: Math.min(overviewZoom + 1.2, 14.4), pitch: 60, bearing: -28, duration: 4000, label: t('cinematicEastCorridor', 'Doğu Koridoru') },
      { center: [centerLon, maxLat - spanLat * 0.2], zoom: Math.min(overviewZoom + 0.8, 14.2), pitch: 58, bearing: 36, duration: 4000, label: t('cinematicNorthLine', 'Kuzey Hattı') },
      { center: [centerLon, minLat + spanLat * 0.2], zoom: Math.min(overviewZoom + 0.8, 14.2), pitch: 58, bearing: -36, duration: 3600, label: t('cinematicNetworkSummary', 'Ağ Özeti') },
    ];

    return points.filter((point, index, array) => {
      const firstIdx = array.findIndex((candidate) =>
        Math.abs(candidate.center[0] - point.center[0]) < 0.0001 &&
        Math.abs(candidate.center[1] - point.center[1]) < 0.0001
      );
      return firstIdx === index;
    });
  }

  function startCinematic() {
    return hooks.startCinematic();
  }

  function stopCinematic() {
    return hooks.stopCinematic();
  }

  function cinematicNext() {
    return hooks.cinematicNext();
  }

  return {
    configureRuntimeCinematic,
    getCinematicWaypoints,
    startCinematic,
    stopCinematic,
    cinematicNext,
  };
})();
