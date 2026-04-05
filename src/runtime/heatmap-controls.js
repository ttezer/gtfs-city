window.RuntimeHeatmapControls = (function () {
  let hooks = {
    getState: () => ({
      showHeatmap: false,
      heatmapHour: 8,
      heatmapFollowSim: false,
    }),
    setState: () => {},
    refreshLayersNow: () => {},
  };

  function configureRuntimeHeatmap(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updateHeatmapControlsVisibility() {
    const panel = document.getElementById('heatmap-ctrl');
    if (!panel) return;
    panel.classList.toggle('hidden', !hooks.getState().showHeatmap);
  }

  function updateHeatmapHourLabel() {
    const label = document.getElementById('heatmap-hour-lbl');
    if (!label) return;
    const hour = hooks.getState().heatmapHour;
    const secsToHHMM = window.secsToHHMM || ((seconds) => String(seconds));
    label.textContent = secsToHHMM(hour * 3600);
  }

  function bindHeatmapControls() {
    const hour = document.getElementById('heatmap-hour');
    const follow = document.getElementById('heatmap-follow-sim');
    if (!hour || !follow) return;

    const state = hooks.getState();
    hour.value = String(state.heatmapHour);
    follow.checked = !!state.heatmapFollowSim;
    updateHeatmapControlsVisibility();
    updateHeatmapHourLabel();

    if (hour.dataset.boundHeatmap === '1') return;
    hour.dataset.boundHeatmap = '1';
    follow.dataset.boundHeatmap = '1';

    hour.oninput = function () {
      hooks.setState({ heatmapHour: parseInt(this.value, 10) || 0 });
      updateHeatmapHourLabel();
      hooks.refreshLayersNow();
    };

    follow.onchange = (event) => {
      hooks.setState({ heatmapFollowSim: !!event.target.checked });
      hooks.refreshLayersNow();
    };
  }

  function setHeatmapEnabled(enabled) {
    hooks.setState({ showHeatmap: !!enabled });
    updateHeatmapControlsVisibility();
    hooks.refreshLayersNow();
  }

  return {
    configureRuntimeHeatmap,
    bindHeatmapControls,
    setHeatmapEnabled,
    updateHeatmapControlsVisibility,
    updateHeatmapHourLabel,
  };
})();
