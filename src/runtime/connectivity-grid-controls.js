window.RuntimeConnectivityGridControls = (function () {
  let cameraRestore = null;
  let styleRestore = null;

  let hooks = {
    getMap: () => null,
    getShowConnectivityGrid: () => false,
    getSelectedCell: () => null,
    getConnectivityScores: () => null,
    getCurrentMapStyle: () => 'auto',
    setCurrentMapStyle: () => {},
    updateDayNight: () => {},
    t: (key, fallback) => fallback || key,
  };

  function configureRuntimeConnectivityGrid(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function updateConnectivityGridToggleLabel(progress = null) {
    const row = document.querySelector('label[for="tog-connectivity-grid"], #tog-connectivity-grid')?.closest('.tog-row');
    if (!row) return;
    const baseLabel = hooks.t('toggleConnectivityGrid');
    let label = baseLabel;
    if (Number.isFinite(progress) && progress >= 0 && progress < 100) {
      label = `${baseLabel} (%${Math.round(progress)})`;
    }
    row.lastChild.textContent = label;
  }

  function updateConnectivityLegend(progress = null) {
    const legend = document.getElementById('legend');
    if (!legend) return;
    if (!hooks.getShowConnectivityGrid()) {
      legend.style.display = 'none';
      legend.innerHTML = '';
      return;
    }
    const scores = hooks.getConnectivityScores();
    const selectedCell = hooks.getSelectedCell();
    const snapshotComplete = !!scores?.meta?.validation_summary;
    const statusText = Number.isFinite(progress) && progress >= 0 && progress < 100
      ? `Bu görünüm hazırlanıyor: %${Math.round(progress)}`
      : snapshotComplete
        ? 'Hazır'
        : 'Bu görünüm hazır, yeni alanlar kaydırdıkça hazırlanır.';
    const selectedCellState = !selectedCell
      ? ''
      : Number.isFinite(selectedCell.score)
        ? `${selectedCell.score}/100`
        : selectedCell.pending
          ? 'Henüz hesaplanmadı'
          : 'Veri yok';
    legend.style.display = 'block';
    legend.innerHTML = `
    <div class="li" style="padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px;">${hooks.t('toggleConnectivityGrid')}</div>
    <div class="li"><span class="ld" style="background:#ef4444"></span><span>Düşük bağlantı</span></div>
    <div class="li"><span class="ld" style="background:#f97316"></span><span>Sınırlı bağlantı</span></div>
    <div class="li"><span class="ld" style="background:#eab308"></span><span>Dengeli bağlantı</span></div>
    <div class="li"><span class="ld" style="background:#22c55e"></span><span>Görece güçlü bağlantı</span></div>
    <div class="li"><span class="ld" style="background:#747c8a"></span><span>Henüz hesaplanmadı / veri yok</span></div>
    <div class="legend-note">Bu görünüm daha sert bir bağlantı metriği kullanır. Yürüme kenarları hariç tutulur, üst süre sınırı 30 dakikadır ve renkler görünümdeki skor dağılımına göre yeniden kalibre edilir.</div>
    <div class="legend-note">Gri kareler veri yok veya henüz hesaplanmadı anlamına gelir; pan ve zoom sırasında kareler kademeli tamamlanabilir.</div>
    <div class="legend-status">${statusText}</div>
    ${selectedCell ? `
      <div class="legend-note" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)">
        <strong>Seçili Kare</strong><br>
        Skor: ${selectedCellState}<br>
        Durak: ${selectedCell.count || 0}
      </div>
    ` : ''}
  `;
  }

  function setConnectivityGridCamera(enabled) {
    const mapgl = hooks.getMap();
    if (!mapgl?.easeTo || !mapgl?.getPitch || !mapgl?.getBearing) return;
    if (enabled) {
      if (!cameraRestore) {
        cameraRestore = { pitch: mapgl.getPitch(), bearing: mapgl.getBearing() };
      }
      mapgl.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      return;
    }
    if (!cameraRestore) return;
    mapgl.easeTo({ pitch: cameraRestore.pitch, bearing: cameraRestore.bearing, duration: 500 });
    cameraRestore = null;
  }

  function setConnectivityGridMapStyle(enabled) {
    if (enabled) {
      if (styleRestore == null) {
        styleRestore = hooks.getCurrentMapStyle() || 'auto';
      }
      if (hooks.getCurrentMapStyle() !== 'dark') {
        hooks.setCurrentMapStyle('dark');
        hooks.updateDayNight();
      }
      return;
    }
    if (styleRestore == null) return;
    hooks.setCurrentMapStyle(styleRestore || 'auto');
    styleRestore = null;
    hooks.updateDayNight();
  }

  return {
    configureRuntimeConnectivityGrid,
    updateConnectivityGridToggleLabel,
    updateConnectivityLegend,
    setConnectivityGridCamera,
    setConnectivityGridMapStyle,
  };
})();
