/**
 * İstanbul Transit 3D — Electron Preload Script
 * contextIsolation: true → renderer'a sadece açıkça expose edilen API'lar ulaşır
 * Node.js / Electron API'larına doğrudan erişim YOK (güvenlik)
 */

const { contextBridge, ipcRenderer } = require('electron');

// ── ELECTRON BRIDGE API ───────────────────────────────────
// window.electronAPI olarak renderer'a açılır
contextBridge.exposeInMainWorld('electronAPI', {

  // Platform bilgisi
  platform: process.platform,   // 'win32' | 'darwin' | 'linux'
  isElectron: true,

  // ── Uygulama ─────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  // ── GTFS Dosya İşlemleri ──────────────────────────────
  /** Native file dialog ile GTFS ZIP aç */
  openGTFSDialog: () => ipcRenderer.invoke('gtfs:open-dialog'),

  /** Dosya yolundan GTFS ZIP buffer oku */
  readGTFSFile: (filePath) => ipcRenderer.invoke('gtfs:read-file', filePath),

  /** Validation raporunu diske kaydet */
  saveReport: (data) => ipcRenderer.invoke('gtfs:save-report-dialog', data),

  // ── City / Data Klasörü ───────────────────────────────
  /** Data/ dizin yolunu al */
  getDataDir: () => ipcRenderer.invoke('city:get-data-dir'),

  /** Data/ klasörünü tara → [{id, name, hasZip, zipSize}] */
  scanDataFolder: () => new Promise(resolve => {
    ipcRenderer.once('city:scan-result', (_, cities) => resolve(cities));
    ipcRenderer.send('city:scan-request');
  }),

  // ── Main Process'ten Gelen Olaylar ────────────────────
  /** Simülasyon kontrol olaylarını dinle (menü kısayolları) */
  onSimControl: (callback) => {
    const channels = [
      'sim:toggle-play', 'sim:speed-up', 'sim:speed-down',
      'sim:reset', 'sim:replay', 'sim:cinematic',
    ];
    const handlers = channels.map(ch => {
      const handler = (_, data) => callback(ch, data);
      ipcRenderer.on(ch, handler);
      return { ch, handler };
    });
    // Cleanup fonksiyonu döndür
    return () => handlers.forEach(({ ch, handler }) =>
      ipcRenderer.removeListener(ch, handler)
    );
  },

  /** Native file dialog'dan açılan GTFS dosyasını al */
  onGTFSFileOpened: (callback) => {
    ipcRenderer.on('gtfs:file-opened', (_, data) => callback(data));
  },

  /** City scan sonucunu al */
  onCityScanResult: (callback) => {
    ipcRenderer.on('city:scan-result', (_, cities) => callback(cities));
  },

  /** Rapor kaydedildi bildirimi */
  onReportSaved: (callback) => {
    ipcRenderer.on('gtfs:report-saved', (_, result) => callback(result));
  },

  /** Validasyon raporu istendi (menüden Kaydet tıklandı) */
  onReportRequested: (callback) => {
    ipcRenderer.on('gtfs:request-report', (_, data) => callback(data));
  },

  // ── Rapor Gönder (renderer → main → disk) ────────────
  sendReport: (savePath, data) => {
    ipcRenderer.send('gtfs:save-report', { savePath, data });
  },
});
