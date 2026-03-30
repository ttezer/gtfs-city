(function attachRenderUtils(globalScope) {
  function repairMojibake(text) {
    if (text === null || text === undefined) return '';
    let out = String(text);
    const fixes = [
      ['Ã¼', 'ü'], ['Ãœ', 'Ü'], ['Ã¶', 'ö'], ['Ã–', 'Ö'], ['Ã§', 'ç'], ['Ã‡', 'Ç'],
      ['ÅŸ', 'ş'], ['Å', 'Ş'], ['ÄŸ', 'ğ'], ['Ä', 'Ğ'], ['Ä±', 'ı'], ['Ä°', 'İ'],
      ['Ã„Â°', 'İ'], ['Ã„Â±', 'ı'], ['ÃƒÂ¼', 'ü'], ['ÃƒÅ“', 'Ü'], ['ÃƒÂ¶', 'ö'], ['Ãƒâ€“', 'Ö'],
      ['ÃƒÂ§', 'ç'], ['Ãƒâ€¡', 'Ç'], ['Ã…Å¸', 'ş'], ['Ã…Â', 'Ş'], ['Ã„Å¸', 'ğ'], ['Ã„Å¾', 'Ğ'],
      ['Ã¢â‚¬â€', '-'], ['Ã¢â‚¬â€œ', '-'], ['Ã¢â€ â€™', '→'], ['Ã¢Å“â€¢', '✕'], ['Ã¢Å“â€œ', '✓'],
      ['ÄŸÅ¸Å¡Å’', '🚌'], ['ÄŸÅ¸Å¡â€¡', '🚇'], ['ÄŸÅ¸Å¡â€ ', '🚆'], ['ÄŸÅ¸Å¡â€¹', '🚋'],
      ['Ã¢â€ºÂ´Ã¯Â¸Â', '⛴️'], ['ÄŸÅ¸Å¡Â¡', '🚡'], ['ÄŸÅ¸Å¡Â ', '🚠'], ['ÄŸÅ¸Å¡Â', '🚐'],
      ['ÄŸÅ¸Å¡â€“', '🚖'], ['ÄŸÅ¸â€œâ€š', '📂'], ['ÄŸÅ¸â€œÂ', '📍'], ['ÄŸÅ¸â€”Âº', '🗺'],
      ['ÄŸÅ¸ÂÂ¬', '🎬'], ['ÄŸÅ¸Å’â„¢', '🌙'], ['ÄŸÅ¸Å’â€¦', '🌅'], ['ÄŸÅ¸Å’â€ ', '🌆'],
      ['Ã¢Ëœâ‚¬Ã¯Â¸Â', '☀️'], ['Ãƒâ€”', '×'], ['Ã‚Â·', '·'],
    ];
    fixes.forEach(([bad, good]) => { out = out.split(bad).join(good); });
    const mojibakePattern = /[ÃÄÅÐÞ]/;
    const decodeLatin1AsUtf8 = (value) => {
      try {
        const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff));
        return new TextDecoder('utf-8').decode(bytes);
      } catch (_) {
        return value;
      }
    };
    let guard = 0;
    while (mojibakePattern.test(out) && guard < 2) {
      const decoded = decodeLatin1AsUtf8(out);
      if (!decoded || decoded === out) break;
      const oldHits = (out.match(mojibakePattern) || []).length;
      const newHits = (decoded.match(mojibakePattern) || []).length;
      if (newHits > oldHits) break;
      out = decoded;
      guard++;
    }
    return out;
  }

  function displayText(text) {
    return repairMojibake(text).trim();
  }

  function hashString(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function getRouteColorRgb(routeShort, routeType) {
    const palette = [
      [231, 76, 60], [52, 152, 219], [155, 89, 182], [46, 204, 113], [241, 196, 15],
      [230, 126, 34], [26, 188, 156], [211, 84, 0], [52, 73, 94], [192, 57, 43],
      [41, 128, 185], [142, 68, 173], [39, 174, 96], [243, 156, 18], [127, 140, 141],
    ];
    const key = `${routeType || ''}:${routeShort || ''}`;
    return palette[hashString(key) % palette.length];
  }

  /**
   * Dinamik Araç Renklendirmesi (Faz 5 / İleri UI)
   * @param {Array} routeColor - Rotanın orijinal rengi [r,g,b]
   * @param {number} delaySec - Gecikme saniye cinsinden
   * @returns {Array} [r,g,b]
   */
  function getVehicleColorRgb(routeColor, delaySec) {
    if (!delaySec || delaySec < 120) return routeColor; // 2dk altı normal
    if (delaySec < 300) return [210, 153, 34]; // 2-5dk arası sarı (Yellow)
    return [248, 81, 73]; // 5dk+ kırmızı (Red)
  }

  function colorToCss(rgb) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  function getRouteMeta(routeShort, routeType, fallbackColor, longName, shapes, trips) {
    const short = displayText(routeShort || 'Hat');
    const shapeMeta = (shapes || []).find((shape) => shape.s === routeShort)
      || (trips || []).find((trip) => trip.s === routeShort)
      || null;
    const type = String(routeType || shapeMeta?.t || '3');
    const longDisplay = displayText(longName || shapeMeta?.ln || shapeMeta?.h || '');
    const color = getRouteColorRgb(short, type, fallbackColor || shapeMeta?.c);
    return { short, longName: longDisplay, type, color };
  }

  function getStopMetaByArray(stop, stopInfo) {
    const [lon, lat, shortName, stopCode, fullName] = stop;
    const sid = Object.keys(stopInfo || {}).find((key) => {
      const current = stopInfo[key];
      return Math.abs(current[0] - lon) < 0.0002 && Math.abs(current[1] - lat) < 0.0002;
    });
    const name = displayText(fullName || shortName || sid || 'Durak');
    const code = displayText(stopCode || sid || shortName || '-');
    return { sid, name, code, lon, lat };
  }

  function getModelUrl(type) {
    const map = {
      '0': 'models/tram.glb',
      '1': 'models/subway.glb',
      '2': 'models/train.glb',
      '3': 'models/bus.glb',
      '4': 'models/bus.glb',
      '5': 'models/tram.glb',
      '6': 'models/tram.glb',
      '7': 'models/bus.glb',
      '9': 'models/bus.glb',
      '10': 'models/bus.glb',
    };
    return map[type] || 'models/bus.glb';
  }

  function getModelPath(type) {
    return getModelUrl(type);
  }

  function getModelNotice(type) {
    const modelPath = getModelUrl(type);
    // models/ içinde sadece bus.glb ve tram.glb mevcut.
    // Subway ve Train modelleri henüz eklenmediği için fallback dönmeliyiz.
    if (modelPath.endsWith('bus.glb') && type !== '3' && type !== '7' && type !== '9' && type !== '10' && type !== '4') {
      return 'fallback';
    }
    if (modelPath.endsWith('tram.glb') && type !== '0' && type !== '5' && type !== '6') {
      return 'fallback';
    }
    if (modelPath.endsWith('subway.glb') || modelPath.endsWith('train.glb')) {
      return 'fallback'; // Dosya eksik olduğu için fallback
    }
    return 'native';
  }

  function getModelScale(type) {
    return { '0': 6, '1': 7, '2': 8, '3': 8, '4': 14, '5': 5, '6': 5, '7': 6, '9': 6, '10': 5 }[type] || 8;
  }

  function getModelOrientation(trip, time) {
    const modDay = (sec) => ((sec % 86400) + 86400) % 86400;
    const dayTime = modDay(time);

    // ts MUTLAK format uyumu (ADR-011):
    // - _tsPatched veya ts[0] > 0 → mutlak → dayTime (gün saniyesi)
    // - aksi halde → rölatif → time % trip.d (fallback)
    let off;
    if (!(trip && (trip._tsPatched || (trip.ts && trip.ts[0] > 0)))) {
      off = time % Math.max(trip?.d || 1, 1);
    } else if (trip.ts && trip.ts.length && trip.ts[trip.ts.length - 1] >= 86400 && dayTime < trip.ts[0]) {
      off = dayTime + 86400;
    } else {
      off = dayTime;
    }

    const ts = trip.ts;
    const points = trip.p;
    for (let i = 0; i < ts.length - 1; i++) {
      if (off >= ts[i] && off <= ts[i + 1] && points[i + 1]) {
        const dx = points[i + 1][0] - points[i][0];
        const dy = points[i + 1][1] - points[i][1];
        const angle = Math.atan2(dx, dy) * 180 / Math.PI;
        return [0, 0, -angle];
      }
    }
    return [0, 0, 0];
  }

  const api = {
    repairMojibake,
    displayText,
    hashString,
    getRouteColorRgb,
    colorToCss,
    getRouteMeta,
    getStopMetaByArray,
    getModelUrl,
    getModelPath,
    getModelNotice,
    getModelScale,
    getModelOrientation,
    getVehicleColorRgb,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.RenderUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
