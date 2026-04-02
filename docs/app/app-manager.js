window.AppManager = (function () {
  let sampleManifest = [];

  function getCtx() {
    return window.LegacyAppBridge?.getContext?.() || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function toggleHidden(element, hidden) {
    if (!element) return;
    element.classList.toggle('hidden', hidden);
  }

  function triggerResize(delay = 100) {
    setTimeout(() => window.dispatchEvent(new Event('resize')), delay);
  }

  function getLandingElements() {
    return {
      route: getElement('lp-count-routes'),
      trip: getElement('lp-count-trips'),
      stop: getElement('lp-count-stops'),
      upload: getElement('lp-btn-upload'),
      start: getElement('lp-btn-start'),
    };
  }

  function getLocale() {
    return window.I18n?.getLanguage?.() === 'en' ? 'en-US' : 'tr-TR';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSampleManifestUrl() {
    return new URL('../data/samples.json', window.location.href).toString();
  }

  function resolveFlagPath(countryCode) {
    return `./assets/flags/${String(countryCode || '').toLowerCase() || 'tr'}.svg`;
  }

  function clearLegacySampleCards() {
    const grid = getElement('lp-examples-grid');
    if (!grid) return;
    grid.innerHTML = '';
  }

  function getSampleLoadConfig(sample) {
    if (!sample) return null;
    const isElectron = !!window.IS_ELECTRON;
    if (sample.loadStrategy === 'bundled') {
      if (!sample.localPath) return null;
      return {
        url: new URL(`../${sample.localPath.replace(/^docs\//, '')}`, window.location.href).toString(),
        fileName: sample.fileName || `${sample.city || 'sample'}.zip`,
      };
    }
    if (sample.loadStrategy === 'remote' && isElectron && sample.remoteUrl) {
      return {
        url: sample.remoteUrl,
        fileName: sample.fileName || `${sample.city || 'sample'}.zip`,
      };
    }
    return null;
  }

  function getSampleNote(sample) {
    const config = getSampleLoadConfig(sample);
    if (config) {
      return sample.note || translate('sampleNoteBundled', 'Bundled sample package for the web demo.');
    }
    if (sample.loadStrategy === 'remote') {
      return translate(
        window.IS_ELECTRON ? 'sampleNoteExternalElectron' : 'sampleNoteExternalWeb',
        window.IS_ELECTRON
          ? 'This card loads from an external source.'
          : 'This card is reference-only in the web demo; automatic loading is disabled.'
      );
    }
    return sample.note || '';
  }

  function renderSampleCards() {
    const grid = getElement('lp-examples-grid');
    if (!grid) return;
    grid.innerHTML = sampleManifest.map((sample) => {
      const config = getSampleLoadConfig(sample);
      const buttonLabel = config
        ? translate('landingExampleLoad', 'Load Sample')
        : translate('landingExampleExternal', 'External Source');
      const badgeLabel = sample.loadStrategy === 'bundled'
        ? translate('sampleBadgeBundled', 'Bundled Demo')
        : translate('sampleBadgeExternal', 'External');
      const safeCity = escapeHtml(sample.city);
      const safeAgency = escapeHtml(sample.agency);
      const safeFileName = escapeHtml(sample.fileName || `${sample.city || 'sample'}.zip`);
      const safeSourcePage = escapeHtml(sample.sourcePage || '#');
      const safeUrl = escapeHtml(config?.url || '');
      const safeNote = escapeHtml(getSampleNote(sample));
      const safeFlag = escapeHtml(resolveFlagPath(sample.countryCode));
      const safeAlt = escapeHtml(`${sample.countryCode || ''} flag`);
      return `
        <article class="lp-example-card">
          <div class="lp-example-top">
            <div class="lp-example-place">
              <img class="lp-example-flag" src="${safeFlag}" alt="${safeAlt}">
              <span class="lp-example-city">${safeCity}</span>
            </div>
            <span class="lp-example-badge">${escapeHtml(badgeLabel)}</span>
          </div>
          <div class="lp-example-org">${safeAgency}</div>
          <div class="lp-example-note">${safeNote}</div>
          <div class="lp-example-actions">
            <button class="lp-btn outline lp-example-load" ${config ? `data-url="${safeUrl}" data-name="${safeFileName}"` : 'disabled'}>${escapeHtml(buttonLabel)}</button>
            <a class="lp-example-source" href="${safeSourcePage}" target="_blank" rel="noreferrer">${escapeHtml(translate('landingExampleSource', 'Open Source'))}</a>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.lp-example-load').forEach((button) => {
      if (button.disabled) return;
      button.addEventListener('click', () => {
        const url = button.dataset.url || '';
        const fileName = button.dataset.name || '';
        window.DataManager?.handleGTFSUrl?.(url, { fileName });
      });
    });
  }

  async function loadSampleManifest() {
    try {
      const response = await fetch(getSampleManifestUrl(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
      const manifest = await response.json();
      sampleManifest = Array.isArray(manifest?.samples) ? manifest.samples : [];
      renderSampleCards();
    } catch (error) {
      console.error('[samples] manifest could not be loaded:', error);
    }
  }

  function updateStartButtonState() {
    const ctx = getCtx();
    const { upload, start } = getLandingElements();
    if (!ctx || !upload || !start) return;
    const hasTrips = !!(ctx.AppState.trips && ctx.AppState.trips.length);
    start.disabled = !hasTrips;
    start.classList.toggle('hidden', !hasTrips);
    start.textContent = translate('landingStartButton', 'Open Map');
    upload.textContent = hasTrips
      ? translate('uploadAnother', 'Upload Another GTFS ZIP')
      : translate('landingUploadButton', 'Upload GTFS ZIP');
    upload.disabled = false;
    upload.style.removeProperty('--load-pct');
    upload.classList.remove('is-loading');
  }

  function setLandingUploadState({ loading = false, pct = 0, label = '', routeCount = null, tripCount = null, stopCount = null } = {}) {
    const elements = getLandingElements();
    if (loading) {
      if (elements.upload) {
        const boundedPct = Math.max(0, Math.min(100, Math.round(pct)));
        elements.upload.disabled = true;
        elements.upload.classList.add('is-loading');
        elements.upload.style.setProperty('--load-pct', `${boundedPct}%`);
        elements.upload.textContent = `${label || translate('loading', 'Loading...')} %${boundedPct}`;
      }
      if (elements.start) {
        elements.start.disabled = true;
        elements.start.classList.add('hidden');
      }
      if (routeCount !== null) setText(elements.route, Number(routeCount).toLocaleString(getLocale()));
      if (tripCount !== null) setText(elements.trip, Number(tripCount).toLocaleString(getLocale()));
      if (stopCount !== null) setText(elements.stop, Number(stopCount).toLocaleString(getLocale()));
      return;
    }
    updateStartButtonState();
  }

  function updateLandingPageReports() {
    const ctx = getCtx();
    if (!ctx) return;
    const trips = (ctx.AppState.trips && ctx.AppState.trips.length) ? ctx.AppState.trips : ctx.getTrips();
    const stops = (ctx.AppState.stops && ctx.AppState.stops.length) ? ctx.AppState.stops : ctx.getStops();
    const elements = getLandingElements();
    if (!trips || !trips.length) {
      setText(elements.route, '--');
      setText(elements.trip, '--');
      setText(elements.stop, '--');
      updateStartButtonState();
      return;
    }
    const routeSet = new Set();
    for (let index = 0; index < trips.length; index++) routeSet.add(trips[index].s);
    setText(elements.route, routeSet.size.toLocaleString(getLocale()));
    setText(elements.trip, trips.length.toLocaleString(getLocale()));
    setText(elements.stop, (stops ? stops.length : 0).toLocaleString(getLocale()));
    updateStartButtonState();
  }

  function toggleUI(showMap) {
    const lp = getElement('landing-page');
    const sidebar = getElement('sidebar');
    const homeBtn = getElement('home-toggle-btn');
    const overlay = getElement('loading-overlay');
    const ctx = getCtx();
    if (showMap) {
      toggleHidden(lp, true);
      toggleHidden(sidebar, false);
      toggleHidden(homeBtn, false);
      toggleHidden(overlay, true);
      triggerResize();
      setTimeout(() => {
        try {
          ctx?.mapgl?.resize?.();
          ctx?.refreshLayersNow?.();
        } catch (_) {}
      }, 0);
      setTimeout(() => {
        try {
          ctx?.mapgl?.resize?.();
          ctx?.refreshLayersNow?.();
        } catch (_) {}
      }, 150);
      return true;
    }

    toggleHidden(lp, false);
    toggleHidden(sidebar, true);
    toggleHidden(homeBtn, true);
    updateLandingPageReports();
    return true;
  }

  function updateDensityGrid() {
    const ctx = getCtx();
    if (!ctx) return;
    if (!ctx.AppState.stops.length || !ctx.AppState.stopInfo || !ctx.AppState.stopDeps) {
      ctx.AppState.densityData = [];
      ctx.AppState.maxDensity = 1;
      return;
    }
    const tempGrid = {};
    ctx.AppState.stops.forEach((stop) => {
      const key = `${Math.round(stop[0] / 0.005)}|${Math.round(stop[1] / 0.005)}`;
      if (!tempGrid[key]) tempGrid[key] = { pos: [stop[0], stop[1]], count: 0 };
      tempGrid[key].count++;
    });
    ctx.AppState.densityData = Object.values(tempGrid);
    ctx.AppState.maxDensity = Math.max(...ctx.AppState.densityData.map((entry) => entry.count)) || 1;
  }

  function bindLandingControls() {
    getElement('lp-btn-upload')?.addEventListener('click', () => {
      const fileInput = getElement('gtfs-file-input');
      if (fileInput) fileInput.click();
      else getCtx()?.openGTFSModal();
    });
    getElement('lp-btn-url')?.addEventListener('click', () => {
      window.DataManager?.handleGTFSUrl?.();
    });
    getElement('lp-gtfs-url')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        window.DataManager?.handleGTFSUrl?.();
      }
    });
    getElement('lp-btn-start')?.addEventListener('click', () => {
      const ctx = getCtx();
      if (!ctx?.AppState?.trips?.length) return;
      toggleUI(true);
    });
    getElement('home-toggle-btn')?.addEventListener('click', () => toggleUI(false));
  }

  function syncLandingSourceControls() {
    const isElectron = !!window.IS_ELECTRON;
    const linkNote = getElement('lp-link-note');
    toggleHidden(getElement('lp-link-row'), !isElectron);
    toggleHidden(linkNote, false);
    if (linkNote) {
      linkNote.textContent = translate(
        isElectron ? 'linkNote' : 'linkNoteWeb',
        isElectron
          ? 'Only HTTPS GTFS ZIP links are accepted. External link safety is the user responsibility.'
          : 'External links may be blocked by CORS in the web demo. Use the built-in sample data cards.'
      );
    }
    renderSampleCards();
  }

  function initPlatformBadge() {
    const badge = getElement('platform-badge');
    if (!badge) return;
    if (window.IS_ELECTRON) {
      window.electronAPI?.getAppInfo?.().then((info) => {
        badge.textContent = `${translate('platformElectron', 'ELECTRON')} / ${(info?.platform || '').toUpperCase()}`;
        badge.className = 'platform-badge electron';
      }).catch(() => {
        badge.textContent = translate('platformElectron', 'ELECTRON');
        badge.className = 'platform-badge electron';
      });
    } else {
      badge.textContent = translate('platformWeb', 'WEB BROWSER');
      badge.className = 'platform-badge web';
    }
  }

  function bindStyleControls() {
    getElement('tog-trail')?.addEventListener('change', (event) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.setShowTrail(event.target.checked);
      ctx.refreshLayersNow();
    });

    document.querySelectorAll('.sstyle').forEach((button) => {
      button.addEventListener('click', () => {
        const ctx = getCtx();
        if (!ctx) return;
        document.querySelectorAll('.sstyle').forEach((entry) => entry.classList.remove('active'));
        button.classList.add('active');
        ctx.setCurrentMapStyle(button.dataset.s);
        ctx.updateDayNight();
      });
    });

    const sidebar = getElement('sidebar');
    const sidebarToggle = getElement('sidebar-toggle');
    if (sidebar && sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        sidebarToggle.textContent = collapsed ? '>' : '<';
        triggerResize(305);
      });
    }
  }

  function init() {
    clearLegacySampleCards();
    bindLandingControls();
    bindStyleControls();
    initPlatformBadge();
    syncLandingSourceControls();
    loadSampleManifest();
    updateStartButtonState();
    window.addEventListener('app-language-change', () => {
      updateStartButtonState();
      updateLandingPageReports();
      syncLandingSourceControls();
      renderSampleCards();
    });
    setTimeout(updateLandingPageReports, 1500);
  }

  return {
    updateLandingPageReports,
    setLandingUploadState,
    toggleUI,
    updateDensityGrid,
    bindLandingControls,
    bindStyleControls,
    initPlatformBadge,
    init,
  };
})();
