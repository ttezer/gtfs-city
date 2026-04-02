/**
 * GTFS City - Electron Preload Script
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // ── Invoke (düğme için) ─────────────────────────────────
  openGTFSDialog: () => ipcRenderer.invoke('gtfs:open-dialog'),
  downloadGTFSFromUrl: (url) => ipcRenderer.invoke('gtfs:download-url', url),
  saveReport: (data) => ipcRenderer.invoke('gtfs:save-report-dialog', data),
  saveCapturedImage: (options) => ipcRenderer.invoke('capture:save-image', options),

  // ── Mevcut event’ler ───────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getDataDir: () => ipcRenderer.invoke('city:get-data-dir'),
  readGTFSFile: (filePath) => ipcRenderer.invoke('gtfs:read-file', filePath),
  readDataFile: (filePath) => ipcRenderer.invoke('city:read-data-file', filePath),

  // ── Event listener’lar (menü + scan) ───────────────────
  onSimControl: (callback) => {
    const channels = ['sim:toggle-play','sim:speed-up','sim:speed-down','sim:reset','sim:replay','sim:cinematic'];
    channels.forEach(ch => ipcRenderer.on(ch, (_, data) => callback(ch, data)));
  },
  onGTFSFileOpened: (callback) => ipcRenderer.on('gtfs:file-opened', (_, data) => callback(data)),
  onCityScanResult: (callback) => ipcRenderer.on('city:scan-result', (_, cities) => callback(cities)),
  onReportRequested: (callback) => ipcRenderer.on('gtfs:request-report', (_, data) => callback(data)),
  onReportSaved: (callback) => ipcRenderer.on('gtfs:report-saved', (_, result) => callback(result)),

  // ── Scan isteği (renderer’dan tetiklemek için) ────────
  scanDataFolder: () => {
    return new Promise(resolve => {
      ipcRenderer.once('city:scan-result', (_, cities) => resolve(cities));
      ipcRenderer.send('city:scan-request');
    });
  },

  sendReport: (savePath, data) => ipcRenderer.send('gtfs:save-report', { savePath, data }),
});
