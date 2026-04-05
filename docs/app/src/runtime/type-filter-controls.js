window.RuntimeTypeFilterControls = (function () {
  let hooks = {
    getState: () => ({
      typeFilter: 'all',
    }),
    applyTypeFilter: () => true,
  };

  function configureRuntimeTypeFilter(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updateTypeFilterButtons() {
    const { typeFilter } = hooks.getState();
    document.querySelectorAll('.tbtn').forEach((button) => {
      button.classList.toggle('active', button.dataset.t === typeFilter);
    });
  }

  function bindTypeFilterControls() {
    updateTypeFilterButtons();

    document.querySelectorAll('.tbtn').forEach((button) => {
      if (button.dataset.boundTypeFilter === '1') return;
      button.dataset.boundTypeFilter = '1';
      button.onclick = function () {
        hooks.applyTypeFilter(this.dataset.t);
      };
    });
  }

  return {
    configureRuntimeTypeFilter,
    bindTypeFilterControls,
    updateTypeFilterButtons,
  };
})();
