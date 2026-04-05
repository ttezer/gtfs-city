window.RuntimeStopCoverageControls = (function () {
  let hooks = {
    getState: () => ({
      showStopCoverage: false,
      stopCoverageRadiusM: 300,
      stopCoverageFillColorHex: '#58a6ff',
      stopCoverageFillOpacityPct: 14,
      stopCoverageStrokeColorHex: '#58a6ff',
      stopCoverageStrokeWidthPx: 2,
      stopCoverageMode: 'fill-stroke',
    }),
    setState: () => {},
    refreshLayersNow: () => {},
  };

  function configureRuntimeStopCoverage(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function clampStopCoverageValue(value, min, max, fallback) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function updateStopCoverageControlValues() {
    const state = hooks.getState();
    const radiusValue = document.getElementById('stop-coverage-radius-value');
    const fillOpacityValue = document.getElementById('stop-coverage-fill-opacity-value');
    const strokeWidthValue = document.getElementById('stop-coverage-stroke-width-value');
    if (radiusValue) radiusValue.textContent = `${state.stopCoverageRadiusM} m`;
    if (fillOpacityValue) fillOpacityValue.textContent = `%${state.stopCoverageFillOpacityPct}`;
    if (strokeWidthValue) strokeWidthValue.textContent = `${state.stopCoverageStrokeWidthPx} px`;
  }

  function updateStopCoverageControlsVisibility() {
    const panel = document.getElementById('stop-coverage-controls');
    if (!panel) return;
    panel.classList.toggle('hidden', !hooks.getState().showStopCoverage);
  }

  function bindStopCoverageControls() {
    const radius = document.getElementById('stop-coverage-radius');
    const mode = document.getElementById('stop-coverage-mode');
    const fillColor = document.getElementById('stop-coverage-fill-color');
    const fillOpacity = document.getElementById('stop-coverage-fill-opacity');
    const strokeColor = document.getElementById('stop-coverage-stroke-color');
    const strokeWidth = document.getElementById('stop-coverage-stroke-width');
    if (!radius || !mode || !fillColor || !fillOpacity || !strokeColor || !strokeWidth) return;

    const syncInputs = () => {
      const state = hooks.getState();
      radius.value = String(state.stopCoverageRadiusM);
      mode.value = state.stopCoverageMode;
      fillColor.value = state.stopCoverageFillColorHex;
      fillOpacity.value = String(state.stopCoverageFillOpacityPct);
      strokeColor.value = state.stopCoverageStrokeColorHex;
      strokeWidth.value = String(state.stopCoverageStrokeWidthPx);
      updateStopCoverageControlValues();
      updateStopCoverageControlsVisibility();
    };

    syncInputs();

    if (radius.dataset.boundStopCoverage === '1') return;
    radius.dataset.boundStopCoverage = '1';
    mode.dataset.boundStopCoverage = '1';
    fillColor.dataset.boundStopCoverage = '1';
    fillOpacity.dataset.boundStopCoverage = '1';
    strokeColor.dataset.boundStopCoverage = '1';
    strokeWidth.dataset.boundStopCoverage = '1';

    radius.addEventListener('input', () => {
      hooks.setState({
        stopCoverageRadiusM: clampStopCoverageValue(radius.value, 100, 1000, 300),
      });
      updateStopCoverageControlValues();
      hooks.refreshLayersNow();
    });

    mode.addEventListener('change', () => {
      hooks.setState({
        stopCoverageMode: mode.value || 'fill-stroke',
      });
      hooks.refreshLayersNow();
    });

    fillColor.addEventListener('input', () => {
      hooks.setState({
        stopCoverageFillColorHex: fillColor.value || '#58a6ff',
      });
      hooks.refreshLayersNow();
    });

    fillOpacity.addEventListener('input', () => {
      hooks.setState({
        stopCoverageFillOpacityPct: clampStopCoverageValue(fillOpacity.value, 0, 100, 14),
      });
      updateStopCoverageControlValues();
      hooks.refreshLayersNow();
    });

    strokeColor.addEventListener('input', () => {
      hooks.setState({
        stopCoverageStrokeColorHex: strokeColor.value || '#58a6ff',
      });
      hooks.refreshLayersNow();
    });

    strokeWidth.addEventListener('input', () => {
      hooks.setState({
        stopCoverageStrokeWidthPx: clampStopCoverageValue(strokeWidth.value, 1, 8, 2),
      });
      updateStopCoverageControlValues();
      hooks.refreshLayersNow();
    });
  }

  function setStopCoverageEnabled(enabled) {
    hooks.setState({ showStopCoverage: !!enabled });
    updateStopCoverageControlsVisibility();
    hooks.refreshLayersNow();
  }

  return {
    configureRuntimeStopCoverage,
    bindStopCoverageControls,
    setStopCoverageEnabled,
    updateStopCoverageControlsVisibility,
  };
})();
