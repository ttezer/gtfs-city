window.RuntimeBridgeUtils = (function () {
  function createLegacyBridge(contextFactory, extras = {}) {
    return { ...extras, getContext: contextFactory };
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeSet(value) {
    return value instanceof Set ? value : new Set(value || []);
  }

  function resetCalendarCache(value) {
    return value || { rows: [], dateRows: [] };
  }

  return {
    createLegacyBridge,
    normalizeArray,
    normalizeSet,
    resetCalendarCache,
  };
})();
