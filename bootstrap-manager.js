window.BootstrapManager = (function () {
  let appReady = false;

  function loadScript(src, cb) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = cb;
    script.onerror = function () {
      console.error('[DataLoad] Yüklenemedi:', src);
      if (cb) cb();
    };
    document.head.appendChild(script);
  }

  function setProgress(pct, msg) {
    const bar = document.getElementById('loader-progress-bar');
    const percent = document.getElementById('loader-percent');
    const fileList = document.getElementById('loader-file-list');
    if (bar) bar.style.width = `${pct}%`;
    if (percent) percent.textContent = `${pct}%`;
    if (msg && fileList) fileList.innerHTML = `<div class="file-item">${msg}</div>`;
  }

  function showLanding() {
    if (!appReady) return;
    const overlay = document.getElementById('loading-overlay');
    const lp = document.getElementById('landing-page');
    const sidebar = document.getElementById('sidebar');
    const homeBtn = document.getElementById('home-toggle-btn');
    if (overlay) overlay.classList.add('hidden');
    if (lp) lp.classList.remove('hidden');
    if (sidebar) sidebar.classList.remove('hidden');
    if (homeBtn) homeBtn.classList.remove('hidden');
    try {
      if (typeof updateLandingPageReports === 'function') updateLandingPageReports();
    } catch (error) {
      console.warn('[Landing] updateLandingPageReports failed:', error);
    }
  }

  function loadAllData() {
    loadScript('script.js', function () {
      window._dataLoaded = true;
    });
  }

  function onAppReady() {
    appReady = true;
    setTimeout(showLanding, 150);
  }

  function start() {
    window._dataLoaded = false;
    appReady = false;
    window.addEventListener('load', function () {
      setTimeout(loadAllData, 100);
    });
  }

  return {
    loadScript,
    setProgress,
    showLanding,
    loadAllData,
    onAppReady,
    start,
  };
})();
