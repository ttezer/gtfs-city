/**
 * İstanbul Transit 3D — Electron Main Process
 * ADR-001: Web + Electron ortak codebase
 * İş-15: Cross-platform binary dağıtım
 */

const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path  = require('path');
const fs    = require('fs');
const https = require('https');

// ── ORTAM ────────────────────────────────────────────────
const isDev  = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isMac  = process.platform === 'darwin';
const isWin  = process.platform === 'win32';

// ── PENCERE ───────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'İstanbul Transit 3D',
    // macOS: tam ekran traffic-light düğmeleri
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    // Windows/Linux: özel frame yok, native title bar
    frame: true,
    backgroundColor: '#080c12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // güvenlik: renderer sandbox
      nodeIntegration:  false,  // renderer'da Node.js yok
      webSecurity:      true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false, // beyaz flash önle
  });

  // Hazır olunca göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Ana sayfa yükle
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Dış linkleri tarayıcıda aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── UYGULAMA YAŞAM DÖNGÜSÜ ───────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  // macOS: dock'a tıklanınca yeniden aç
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// ── NATIVE MENÜ ───────────────────────────────────────────
function buildMenu() {
  const template = [
    // macOS app menüsü
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // Dosya
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'GTFS ZIP Aç…',
          accelerator: 'CmdOrCtrl+O',
          click: openGTFSDialog,
        },
        {
          label: 'Şehir Klasörünü Tara',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: scanDataFolder,
        },
        { type: 'separator' },
        {
          label: 'Validasyon Raporunu Kaydet…',
          accelerator: 'CmdOrCtrl+S',
          click: saveValidationReport,
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Çıkış' },
      ],
    },

    // Görünüm
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Büyüt' },
        { role: 'zoomOut', label: 'Küçült' },
        { role: 'resetZoom', label: 'Varsayılan Zoom' },
        { type: 'separator' },
        ...(isDev ? [{ role: 'toggleDevTools', label: 'DevTools' }] : []),
      ],
    },

    // Simülasyon kısayolları (renderer'a mesaj gönder)
    {
      label: 'Simülasyon',
      submenu: [
        {
          label: 'Oynat / Duraklat',
          accelerator: 'Space',
          click: () => sendToRenderer('sim:toggle-play'),
        },
        {
          label: 'Hızlandır',
          accelerator: 'CmdOrCtrl+Right',
          click: () => sendToRenderer('sim:speed-up'),
        },
        {
          label: 'Yavaşlat',
          accelerator: 'CmdOrCtrl+Left',
          click: () => sendToRenderer('sim:speed-down'),
        },
        {
          label: '06:00\'a Sıfırla',
          accelerator: 'CmdOrCtrl+R',
          click: () => sendToRenderer('sim:reset'),
        },
        { type: 'separator' },
        {
          label: '24 Saati Oynat (Replay)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => sendToRenderer('sim:replay'),
        },
        {
          label: 'Sinematik Mod',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => sendToRenderer('sim:cinematic'),
        },
      ],
    },

    // Yardım
    {
      role: 'help',
      label: 'Yardım',
      submenu: [
        {
          label: 'GitHub\'da Aç',
          click: () => shell.openExternal('https://github.com/istanbul-transit-3d'),
        },
        {
          label: 'GTFS Referans Belgeleri',
          click: () => shell.openExternal('https://gtfs.org/documentation/schedule/reference/'),
        },
        { type: 'separator' },
        {
          label: 'Sürüm Bilgisi',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'İstanbul Transit 3D',
              message: 'İstanbul Transit 3D',
              detail: `Sürüm: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChromium: ${process.versions.chrome}`,
              buttons: ['Tamam'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── YARDIMCI: renderer'a mesaj gönder ────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ── IPC: DOSYA SİSTEMİ KÖPRÜSÜ ───────────────────────────

/**
 * GTFS ZIP dialog — native file picker
 */
async function openGTFSDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'GTFS ZIP Dosyası Seç',
    filters: [{ name: 'GTFS ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const buffer   = fs.readFileSync(filePath);
    // ArrayBuffer olarak renderer'a ilet
    sendToRenderer('gtfs:file-opened', {
      name: path.basename(filePath),
      buffer: buffer.buffer,
    });
  }
}

/**
 * Data/ klasörünü tara — GTFS.zip'leri listele
 */
function scanDataFolder() {
  const dataDir = path.join(__dirname, '..', 'Data');
  if (!fs.existsSync(dataDir)) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Klasör Bulunamadı',
      message: 'Data/ klasörü mevcut değil.',
      detail: `Beklenen konum: ${dataDir}`,
      buttons: ['Tamam'],
    });
    return;
  }
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });
  const cities  = [];
  entries.forEach(entry => {
    if (!entry.isDirectory()) return;
    const zipPath = path.join(dataDir, entry.name, 'GTFS.zip');
    const hasZip  = fs.existsSync(zipPath);
    const stat    = hasZip ? fs.statSync(zipPath) : null;
    cities.push({
      id:      entry.name.toLowerCase(),
      name:    entry.name,
      hasZip,
      zipSize: stat ? stat.size : 0,
      zipPath: hasZip ? zipPath : null,
    });
  });
  sendToRenderer('city:scan-result', cities);
}

/**
 * Validation raporu kaydet — native save dialog
 */
async function saveValidationReport() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Validasyon Raporunu Kaydet',
    defaultPath: `gtfs-validation-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!result.canceled && result.filePath) {
    // Renderer'dan raporu iste, gelince yaz
    sendToRenderer('gtfs:request-report', { savePath: result.filePath });
  }
}

// ── IPC HANDLERS (renderer → main) ───────────────────────

// Renderer validation raporunu gönderdi → diske yaz
ipcMain.on('gtfs:save-report', (event, { savePath, data }) => {
  try {
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf8');
    sendToRenderer('gtfs:report-saved', { success: true, path: savePath });
  } catch (err) {
    sendToRenderer('gtfs:report-saved', { success: false, error: err.message });
  }
});

// Data/ klasörü dizini iste
ipcMain.handle('city:get-data-dir', () => {
  return path.join(__dirname, '..', 'Data');
});

// GTFS ZIP dosyasını oku (renderer'dan yol alır)
ipcMain.handle('gtfs:read-file', async (event, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    return { success: true, buffer: buf.buffer, size: buf.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Uygulama bilgisi
ipcMain.handle('app:get-info', () => ({
  version:    app.getVersion(),
  platform:   process.platform,
  electron:   process.versions.electron,
  node:       process.versions.node,
  isPackaged: app.isPackaged,
  dataDir:    path.join(__dirname, '..', 'Data'),
}));

// Renderer'ın platform-specific davranış için hazır olduğunu bildir
app.whenReady().then(() => {
  // Kısayol: Space tuşu global olarak oynat/duraklat
  // Not: BrowserWindow focus'tayken sadece menü accelerator çalışır
});
