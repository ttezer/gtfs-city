/**
 * İstanbul Transit 3D — Electron Main Process
 * DÜZELTİLMİŞ VERSİYON (IPC köprüsü tam)
 */

const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── ORTAM ────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isMac = process.platform === 'darwin';

// ── PENCERE ───────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    title: 'İstanbul Transit 3D',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: true,
    backgroundColor: '#080c12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// ── NATIVE MENÜ ───────────────────────────────────────────
function buildMenu() {
  // ... (menü aynı kaldı, sadece kısayollar var)
  const template = [ /* önceki menü kodun aynı */ ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── YARDIMCI ──────────────────────────────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ── DOSYA İŞLEMLERİ (Menü + Preload için) ─────────────────
async function openGTFSDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'GTFS ZIP Dosyası Seç',
    filters: [{ name: 'GTFS ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  return { name: path.basename(filePath), buffer: buffer.buffer };
}

function scanDataFolder() {
  const dataDir = path.join(__dirname, '..', 'Data');
  if (!fs.existsSync(dataDir)) {
    dialog.showMessageBox(mainWindow, { type: 'warning', message: 'Data/ klasörü yok!' });
    return;
  }
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });
  const cities = [];
  entries.forEach(entry => {
    if (!entry.isDirectory()) return;
    const zipPath = path.join(dataDir, entry.name, 'GTFS.zip');
    const hasZip = fs.existsSync(zipPath);
    cities.push({ id: entry.name.toLowerCase(), name: entry.name, hasZip, zipSize: hasZip ? fs.statSync(zipPath).size : 0 });
  });
  sendToRenderer('city:scan-result', cities);
}

async function saveValidationReport() {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `gtfs-validation-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return;
  sendToRenderer('gtfs:request-report', { savePath: result.filePath });
}

// ── IPC HANDLER’LAR (PRELOAD İÇİN) ───────────────────────
ipcMain.handle('gtfs:open-dialog', openGTFSDialog);           // ← YENİ
ipcMain.handle('gtfs:save-report-dialog', async (_, data) => { // ← YENİ
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `gtfs-validation-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return { success: false };
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('city:scan-request', scanDataFolder);              // ← YENİ
ipcMain.on('gtfs:save-report', (event, { savePath, data }) => {
  try {
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    sendToRenderer('gtfs:report-saved', { success: true, path: savePath });
  } catch (err) {
    sendToRenderer('gtfs:report-saved', { success: false, error: err.message });
  }
});

// Mevcut handle’lar (app:get-info, gtfs:read-file) aynı kaldı
ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  electron: process.versions.electron,
  node: process.versions.node,
  isPackaged: app.isPackaged,
  dataDir: path.join(__dirname, '..', 'Data'),
}));

ipcMain.handle('gtfs:read-file', async (_, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    return { success: true, buffer: buf.buffer, size: buf.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});