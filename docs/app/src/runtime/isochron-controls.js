window.RuntimeIsochronControls = (function () {
  let hooks = {
    getState: () => ({
      showIsochron: false,
    }),
    setState: () => {},
    clearIsochron: () => {},
    refreshLayersNow: () => {},
  };

  function configureRuntimeIsochron(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updateIsochronControlsVisibility() {
    const panel = document.getElementById('isochron-panel');
    if (!panel) return;
    panel.style.display = hooks.getState().showIsochron ? 'block' : 'none';
  }

  function setIsochronEnabled(enabled) {
    hooks.setState({ showIsochron: !!enabled });
    updateIsochronControlsVisibility();
    if (!enabled) hooks.clearIsochron();
    hooks.refreshLayersNow();
  }

  function bindIsochronControls() {
    updateIsochronControlsVisibility();

    const closeButton = document.getElementById('isochron-close');
    if (!closeButton || closeButton.dataset.boundIsochron === '1') return;
    closeButton.dataset.boundIsochron = '1';

    closeButton.addEventListener('click', () => {
      const toggle = document.getElementById('tog-isochron');
      if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
      }
    });
  }

  return {
    configureRuntimeIsochron,
    bindIsochronControls,
    setIsochronEnabled,
    updateIsochronControlsVisibility,
  };
})();
