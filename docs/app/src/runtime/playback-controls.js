window.RuntimePlaybackControls = (function () {
  let hooks = {
    getState: () => ({
      simTime: 6 * 3600,
      speedIdx: 3,
      simSpeed: 60,
      replayLoop: false,
    }),
    setState: () => {},
    speeds: [1, 10, 30, 60, 120, 300, 600],
    toggleSimulationPaused: () => {},
    resetSimulationPlayback: () => {},
    syncPanelsForCurrentSimTime: () => {},
    updateDayNight: () => {},
    refreshLayersNow: () => {},
    startCinematic: () => {},
    stopCinematic: () => {},
    isCinematic: () => false,
  };

  function configureRuntimePlayback(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updatePlaybackSpeedLabel() {
    const label = document.getElementById('speed-lbl');
    if (!label) return;
    const state = hooks.getState();
    const speeds = hooks.speeds || [];
    const speed = speeds[state.speedIdx] ?? state.simSpeed ?? 60;
    label.textContent = speed < 60 ? `${speed}×` : `${Math.round(speed / 60)}dk/s`;
  }

  function bindPlaybackControls() {
    const play = document.getElementById('btn-play');
    const faster = document.getElementById('btn-faster');
    const slower = document.getElementById('btn-slower');
    const reset = document.getElementById('btn-reset');
    const slider = document.getElementById('time-slider');
    const replayLoop = document.getElementById('replay-loop');
    const cinematic = document.getElementById('btn-cinematic');

    updatePlaybackSpeedLabel();
    if (replayLoop) replayLoop.checked = !!hooks.getState().replayLoop;

    if (play && play.dataset.boundPlayback !== '1') {
      play.dataset.boundPlayback = '1';
      play.onclick = () => hooks.toggleSimulationPaused();
    }

    if (faster && faster.dataset.boundPlayback !== '1') {
      faster.dataset.boundPlayback = '1';
      faster.onclick = () => {
        const state = hooks.getState();
        const nextSpeedIdx = Math.min(state.speedIdx + 1, hooks.speeds.length - 1);
        hooks.setState({
          speedIdx: nextSpeedIdx,
          simSpeed: hooks.speeds[nextSpeedIdx],
        });
        updatePlaybackSpeedLabel();
      };
    }

    if (slower && slower.dataset.boundPlayback !== '1') {
      slower.dataset.boundPlayback = '1';
      slower.onclick = () => {
        const state = hooks.getState();
        const nextSpeedIdx = Math.max(state.speedIdx - 1, 0);
        hooks.setState({
          speedIdx: nextSpeedIdx,
          simSpeed: hooks.speeds[nextSpeedIdx],
        });
        updatePlaybackSpeedLabel();
      };
    }

    if (reset && reset.dataset.boundPlayback !== '1') {
      reset.dataset.boundPlayback = '1';
      reset.onclick = () => hooks.resetSimulationPlayback();
    }

    if (slider && slider.dataset.boundPlayback !== '1') {
      slider.dataset.boundPlayback = '1';
      slider.oninput = function () {
        hooks.setState({ simTime: parseInt(this.value, 10) || 0 });
        hooks.syncPanelsForCurrentSimTime();
        hooks.updateDayNight();
        hooks.refreshLayersNow();
      };
    }

    if (replayLoop && replayLoop.dataset.boundPlayback !== '1') {
      replayLoop.dataset.boundPlayback = '1';
      replayLoop.onchange = (event) => {
        hooks.setState({ replayLoop: !!event.target.checked });
      };
    }

    if (cinematic && cinematic.dataset.boundPlayback !== '1') {
      cinematic.dataset.boundPlayback = '1';
      cinematic.onclick = () => (hooks.isCinematic() ? hooks.stopCinematic() : hooks.startCinematic());
    }
  }

  return {
    configureRuntimePlayback,
    bindPlaybackControls,
    updatePlaybackSpeedLabel,
  };
})();
