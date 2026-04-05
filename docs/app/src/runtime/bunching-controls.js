window.RuntimeBunchingControls = (function () {
  let hooks = {
    getState: () => ({
      showBunching: false,
      bunchingThreshold: 200,
    }),
    setState: () => {},
    refreshLayersNow: () => {},
  };

  function configureRuntimeBunching(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updateBunchingThresholdLabel() {
    const label = document.getElementById('threshold-lbl');
    if (!label) return;
    label.textContent = `${hooks.getState().bunchingThreshold}m`;
  }

  function updateBunchingControlsVisibility() {
    const panel = document.getElementById('bunching-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !hooks.getState().showBunching);
  }

  function bindBunchingControls() {
    const threshold = document.getElementById('bunching-threshold');
    if (!threshold) return;

    const state = hooks.getState();
    threshold.value = String(state.bunchingThreshold);
    updateBunchingThresholdLabel();
    updateBunchingControlsVisibility();

    if (threshold.dataset.boundBunching === '1') return;
    threshold.dataset.boundBunching = '1';

    threshold.oninput = function () {
      hooks.setState({ bunchingThreshold: parseInt(this.value, 10) || 0 });
      updateBunchingThresholdLabel();
      hooks.refreshLayersNow();
    };
  }

  function setBunchingEnabled(enabled) {
    hooks.setState({ showBunching: !!enabled });
    updateBunchingControlsVisibility();
    hooks.refreshLayersNow();
  }

  return {
    configureRuntimeBunching,
    bindBunchingControls,
    setBunchingEnabled,
    updateBunchingControlsVisibility,
    updateBunchingThresholdLabel,
  };
})();
