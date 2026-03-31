(function attachUiUtils(globalScope) {
  function translate(key, fallback = '') {
    return globalScope?.I18n?.t?.(key, fallback) || fallback || key;
  }
  function formatGtfsClock(seconds, fallbackFormatter) {
    if (!Number.isFinite(seconds)) return '-';
    const totalSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours >= 24) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return typeof fallbackFormatter === 'function'
      ? fallbackFormatter(totalSeconds)
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  function buildStopTooltipHtml(stopMeta) {
    return `<div class="tt-t white-text">${stopMeta.name}</div><div class="tt-s muted-text">Kod: ${stopMeta.code}</div>`;
  }

  function buildRouteTooltipHtml(routeMeta, typeMetaEntry, displayText) {
    const icon = displayText(typeMetaEntry?.i || '');
    const typeName = typeMetaEntry?.n || '-';
    return `<div class="tt-t white-text">${icon} ${routeMeta.short}</div><div class="tt-s muted-text">${routeMeta.longName || translate('routeLongNameMissing', 'Uzun ad yok')}</div><div class="tt-v mute-text">${typeName}</div>`;
  }

  const _nearestStopCache = new Map();
  function findNearestStopName(pathPoint, stopInfo, haversineM, displayText) {
    if (!pathPoint) return '-';
    // Koordinatı biraz daha yuvarlayarak cache hit oranını artıralım (0.0001 ~11 metre)
    const key = Math.round(pathPoint[0] * 10000) + ',' + Math.round(pathPoint[1] * 10000);
    if (_nearestStopCache.has(key)) return _nearestStopCache.get(key);

    let nearest = null;
    let bestDistance = Infinity;
    const stopsArray = Object.values(stopInfo || {});
    // Eğer stopInfo çok büyükse (örn > 5000), her seferinde tam tarama yerine 
    // durak listesini en azından bir kez array'e çevirip kullanmak daha hızlı olabilir.
    for (let i = 0; i < stopsArray.length; i++) {
      const stop = stopsArray[i];
      const distance = haversineM([stop[0], stop[1]], pathPoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = stop;
        if (distance < 30) break; // 30 metreden yakınsa yeterince iyidir (early exit)
      }
    }
    const result = displayText(nearest ? nearest[2] : '-');
    if (_nearestStopCache.size > 1000) {
       // Cache dolduğunda rastgele %20'sini temizle (tam silmekten iyidir)
       let count = 0;
       for (const k of _nearestStopCache.keys()) {
         _nearestStopCache.delete(k);
         if (++count > 200) break;
       }
    }
    _nearestStopCache.set(key, result);
    return result;
  }

  /**
   * Helper payload builder for the vehicle info panel UI popup.
   * @param {Object} options
   * @param {Object} options.trip
   * @param {number} options.selectedTripIdx
   * @param {number} options.simTime
   * @param {Object} options.stopInfo
   * @param {Object} options.typeMeta
   * @param {number|null} options.followTripIdx
   * @param {Function} options.getRouteMeta
   * @param {Function} options.calcSpeed
   * @param {Function} options.calcHeadway
   * @param {Function} options.getNextStop
   * @param {Function} options.haversineM
   * @param {Function} options.displayText
   * @param {Array} [options.trips]
   * @param {Function} [options.getVehiclePos]
   * @returns {Object|null}
   */
  function buildVehiclePanelState(options) {
    const {
      trip,
      selectedTripIdx,
      simTime,
      stopInfo,
      typeMeta,
      followTripIdx,
      getRouteMeta,
      calcSpeed,
      calcHeadway,
      getNextStop,
      getTripRuntimeOffset,
      getActiveServiceLabel,
      inferTripDirectionLabel,
      secsToHHMM,
      haversineM,
      displayText,
      trips,
      getVehiclePos,
      getTripProgressAtTime,
    } = options;

    if (!trip || !Array.isArray(trip.p) || !Array.isArray(trip.ts) || !trip.p.length) return null;

    const routeMeta = getRouteMeta(trip.s, trip.t, trip.c, trip.ln || trip.h || '');
    const mode = typeMeta[routeMeta.type] || typeMeta[trip.t] || {};
    const duration = Math.max(trip.d || 0, 1);
    const runtimeOffsetAbs = typeof getTripRuntimeOffset === 'function'
      ? getTripRuntimeOffset(trip, simTime)
      : (simTime % duration);
    const tripStart = Array.isArray(trip.ts) && trip.ts.length ? trip.ts[0] : 0;
    const runtimeOffset = Number.isFinite(runtimeOffsetAbs) ? runtimeOffsetAbs : (simTime % duration);
    const offset = trip._tsPatched || tripStart > 0
      ? Math.max(0, runtimeOffset - tripStart)
      : runtimeOffset;
    const stopTimes = Array.isArray(trip.st) && trip.st.length ? trip.st : [];
    const firstStop = stopTimes[0] || null;
    const lastStop = stopTimes[stopTimes.length - 1] || null;
    const firstStopName = firstStop?.sid && stopInfo?.[firstStop.sid]
      ? displayText(stopInfo[firstStop.sid][2] || '-')
      : findNearestStopName(trip.p[0], stopInfo, haversineM, displayText);
    const lastStopName = lastStop?.sid && stopInfo?.[lastStop.sid]
      ? displayText(stopInfo[lastStop.sid][2] || '-')
      : findNearestStopName(trip.p[trip.p.length - 1], stopInfo, haversineM, displayText);
    const firstStopTime = formatGtfsClock((firstStop?.off ?? 0) + (trip._startSec || tripStart || 0), secsToHHMM);
    const lastStopTime = formatGtfsClock((lastStop?.off ?? duration) + (trip._startSec || tripStart || 0), secsToHHMM);
    const directionValue = typeof inferTripDirectionLabel === 'function'
      ? inferTripDirectionLabel(trip)
      : (trip.h || '');
    const directionLabel = displayText(directionValue || '-');
    const routeLongName = routeMeta.longName || displayText(trip.ln || '') || (firstStopName && lastStopName ? `${firstStopName} → ${lastStopName}` : '');
    const upcomingStops = stopTimes.filter((stopEntry) => typeof stopEntry?.off === 'number' && stopEntry.off > offset);
    const nextStopEntry = upcomingStops[0] || null;
    const nextStopMeta = nextStopEntry?.sid ? stopInfo?.[nextStopEntry.sid] : null;
    const nextStopFallback = getNextStop(trip, simTime, stopInfo, getVehiclePos, haversineM) || { name: '-', eta: '-' };
    const nextStopName = nextStopMeta
      ? displayText(nextStopMeta[2] || '-')
      : displayText(nextStopFallback.name || '-');
    const remainingStopCount = upcomingStops.length;
    const finalEta = remainingStopCount
      ? `${Math.max(0, Math.round(((upcomingStops[remainingStopCount - 1].off || offset) - offset) / 60))}dk`
      : '-';
    const nextStopLabel = remainingStopCount > 0
      ? `${nextStopName} · ${remainingStopCount} durak kaldı`
      : (nextStopName || '-');
    const sameDirectionTripCount = Array.isArray(trips)
      ? trips.filter(candidate => {
          if (!candidate || candidate.s !== trip.s) return false;
          const candidateDirection = typeof inferTripDirectionLabel === 'function'
            ? inferTripDirectionLabel(candidate)
            : (candidate.h || '');
          return candidateDirection === directionValue;
        }).length
      : 0;

    return {
      icon: displayText(mode.i || 'bus'),
      title: routeMeta.short,
      subtitle: routeLongName || displayText(mode.n || '-'),
      speed: calcSpeed(trip, simTime),
      headway: calcHeadway(trips || [], selectedTripIdx, simTime, getVehiclePos, haversineM, getTripProgressAtTime),
      progress: `${Math.max(0, Math.min(100, Math.round((offset / duration) * 100)))}%`,
      nextStopName: nextStopLabel,
      eta: finalEta,
      followLabel: followTripIdx === selectedTripIdx ? `📍 ${translate('vehicleFollowStop', 'Takibi Bırak')}` : `📍 ${translate('vehicleFollow', 'Takip Et')}`,
      details: [
        { label: translate('vehicleDetailLongName', 'Hat Uzun Adı'), value: routeLongName || '-' },
        { label: translate('vehicleDetailDirection', 'Yön'), value: directionLabel || '-' },
        { label: translate('vehicleDetailService', 'Çalışma Takvimi'), value: typeof getActiveServiceLabel === 'function' ? getActiveServiceLabel() : '-' },
        { label: translate('vehicleDetailDeparture', 'Kalkış'), value: `${firstStopName} · ${firstStopTime}` },
        { label: translate('vehicleDetailArrival', 'Varış'), value: `${lastStopName} · ${lastStopTime}` },
        { label: translate('vehicleDetailTripsSameDirection', 'Aynı Yönde Sefer'), value: `${sameDirectionTripCount || 0}` },
      ],
      stops: (Array.isArray(trip.st) ? trip.st : []).map((stEntry, index) => {
        const stopMeta = stopInfo?.[stEntry.sid];
        const stopName = stopMeta ? displayText(stopMeta[2]) : ('Durak #' + stEntry.sid);
        
        // stEntry.off relative (saniye). Mutlak zaman patçlendiyse o formata uyarla.
        const isAbsolute = trip._tsPatched || (trip.ts && trip.ts.length > 0 && trip.ts[0] > 86400);
        const startSec = trip._startSec || (isAbsolute && trip.ts ? trip.ts[0] : 0);
        const arrivalOffset = stEntry.off;
        const arrivalAbs = isAbsolute ? startSec + arrivalOffset : arrivalOffset;

        const passed = offset > arrivalOffset;
        // Eğer aracın progress'i bu durak ile bir sonraki arasındaysa 'current' sayılabilir
        const nextSt = trip.st[index + 1];
        const current = !passed && (!nextSt || offset < nextSt.off);

        return {
          name: stopName,
          time: formatGtfsClock(arrivalAbs, secsToHHMM),
          current,
          passed,
        };
      }),
    };
  }

  const api = {
    buildStopTooltipHtml,
    buildRouteTooltipHtml,
    findNearestStopName,
    buildVehiclePanelState,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.UiUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
