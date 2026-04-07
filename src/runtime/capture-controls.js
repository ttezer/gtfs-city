window.RuntimeCaptureControls = (function () {
  const CAPTURE_PRESET_CLASSES = [
    'capture-preset-official',
    'capture-preset-poster',
    'capture-preset-blueprint',
    'capture-preset-mono',
    'capture-preset-transit-poster',
    'capture-preset-cartoon-map',
    'capture-preset-minimal-white',
    'capture-preset-schematic',
    'capture-preset-print-friendly',
    'capture-preset-neo-transit',
    'capture-preset-vintage-metro',
    'capture-preset-heat-poster',
    'capture-preset-comic-panel',
  ];

  let activeCapturePreset = 'original';

  let hooks = {
    getTypeFilter: () => 'all',
    showToast: () => {},
  };

  function configureRuntimeCapture(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function getCaptureDefaultFileName() {
    const typeFilter = hooks.getTypeFilter();
    const filterLabel = typeFilter === 'all'
      ? 'tum-ag'
      : ({
        '1': 'metro',
        '3': 'otobus',
        '0': 'tramvay',
        '4': 'feribot',
        '7': 'funicular',
        '9': 'minibus',
        '10': 'dolmus',
      }[String(typeFilter)] || 'secim');
    return `gtfs-city-${filterLabel}-${activeCapturePreset}`;
  }

  function setActiveCapturePreset(preset) {
    activeCapturePreset = preset || 'original';
    document.querySelectorAll('.capture-preset-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.preset === activeCapturePreset);
    });
  }

  function openCaptureModal() {
    const modal = document.getElementById('capture-modal');
    const fileNameInput = document.getElementById('capture-file-name');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('capture-modal-open');
    setActiveCapturePreset(activeCapturePreset || 'original');
    if (fileNameInput) {
      fileNameInput.value = getCaptureDefaultFileName();
      fileNameInput.focus();
      fileNameInput.select();
    }
  }

  function closeCaptureModal() {
    const modal = document.getElementById('capture-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('capture-modal-open');
  }

  function applyCaptureClasses({ includeSidebar, includeOverlays, preset }) {
    document.body.classList.remove(...CAPTURE_PRESET_CLASSES);
    document.body.classList.toggle('capture-hide-sidebar', !includeSidebar);
    document.body.classList.toggle('capture-hide-overlays', !includeOverlays);
    if (preset === 'official') document.body.classList.add('capture-preset-official');
    if (preset === 'poster') document.body.classList.add('capture-preset-poster');
    if (preset === 'blueprint') document.body.classList.add('capture-preset-blueprint');
    if (preset === 'mono') document.body.classList.add('capture-preset-mono');
    if (preset === 'transit-poster') document.body.classList.add('capture-preset-transit-poster');
    if (preset === 'cartoon-map') document.body.classList.add('capture-preset-cartoon-map');
    if (preset === 'minimal-white') document.body.classList.add('capture-preset-minimal-white');
    if (preset === 'schematic') document.body.classList.add('capture-preset-schematic');
    if (preset === 'print-friendly') document.body.classList.add('capture-preset-print-friendly');
    if (preset === 'neo-transit') document.body.classList.add('capture-preset-neo-transit');
    if (preset === 'vintage-metro') document.body.classList.add('capture-preset-vintage-metro');
    if (preset === 'heat-poster') document.body.classList.add('capture-preset-heat-poster');
    if (preset === 'comic-panel') document.body.classList.add('capture-preset-comic-panel');
  }

  function resetCaptureClasses() {
    document.body.classList.remove('capture-hide-sidebar', 'capture-hide-overlays', ...CAPTURE_PRESET_CLASSES);
  }

  async function saveCurrentViewportCapture() {
    const includeSidebar = document.getElementById('capture-include-sidebar')?.checked !== false;
    const includeOverlays = document.getElementById('capture-include-overlays')?.checked !== false;
    const fileName = document.getElementById('capture-file-name')?.value?.trim() || getCaptureDefaultFileName();
    const scale = Number.parseInt(document.getElementById('capture-resolution')?.value || '2', 10) || 2;

    applyCaptureClasses({ includeSidebar, includeOverlays, preset: activeCapturePreset });
    document.body.classList.add('capture-watermark');

    try {
      closeCaptureModal();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (window.IS_ELECTRON && typeof window.electronAPI?.saveCapturedImage === 'function') {
        const result = await window.electronAPI.saveCapturedImage({ fileName, scale });
        if (result?.success) {
          hooks.showToast(`Ekran görüntüsü kaydedildi: ${result.path}`, 'ok');
        } else if (!result?.canceled) {
          hooks.showToast(result?.error || 'Ekran görüntüsü kaydedilemedi.', 'err');
        }
        return;
      }

      if (typeof window.html2canvas !== 'function') {
        hooks.showToast('Ekran görüntüsü aracı yüklenemedi.', 'err');
        return;
      }

      const canvas = await window.html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        hooks.showToast('Ekran görüntüsü kaydedilemedi.', 'err');
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = /\.png$/i.test(fileName) ? fileName : `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      hooks.showToast('Ekran görüntüsü indirildi.', 'ok');
    } catch (err) {
      hooks.showToast(err?.message || 'Ekran görüntüsü kaydedilemedi.', 'err');
    } finally {
      document.body.classList.remove('capture-watermark');
      resetCaptureClasses();
    }
  }

  function bindCaptureControls() {
    const toggleButton = document.getElementById('capture-toggle-btn');
    const closeButton = document.getElementById('capture-modal-close');
    const cancelButton = document.getElementById('capture-cancel-btn');
    const confirmButton = document.getElementById('capture-confirm-btn');
    const modal = document.getElementById('capture-modal');
    const fileNameInput = document.getElementById('capture-file-name');

    toggleButton?.classList.remove('hidden');
    toggleButton?.addEventListener('click', openCaptureModal);
    closeButton?.addEventListener('click', closeCaptureModal);
    cancelButton?.addEventListener('click', closeCaptureModal);
    confirmButton?.addEventListener('click', saveCurrentViewportCapture);
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeCaptureModal();
    });
    document.querySelectorAll('.capture-preset-btn').forEach((button) => {
      button.addEventListener('click', () => {
        setActiveCapturePreset(button.dataset.preset || 'original');
        if (fileNameInput) fileNameInput.value = getCaptureDefaultFileName();
      });
    });
    fileNameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') saveCurrentViewportCapture();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal?.classList.contains('hidden')) closeCaptureModal();
    });
  }

  return {
    configureRuntimeCapture,
    bindCaptureControls,
    openCaptureModal,
    closeCaptureModal,
    getCaptureDefaultFileName,
  };
})();
