/**
 * GTFS City - Electron Main Process
 */

const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ── ORTAM ────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isMac = process.platform === 'darwin';

// ── PENCERE ───────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    title: 'GTFS City',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: true,
    backgroundColor: '#080c12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // file:// protokolünde Worker'ların çalışması için gerekli
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
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'GTFS ZIP Aç…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await openGTFSDialog();
            if (result) sendToRenderer('gtfs:file-opened', result);
          },
        },
        {
          label: 'Data Klasörünü Tara',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => scanDataFolder(),
        },
        { type: 'separator' },
        {
          label: 'Validasyon Raporu Kaydet…',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => saveValidationReport(),
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit', label: 'Çıkış' }]),
      ],
    },
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
          accelerator: 'CmdOrCtrl+=',
          click: () => sendToRenderer('sim:speed-up'),
        },
        {
          label: 'Yavaşlat',
          accelerator: 'CmdOrCtrl+-',
          click: () => sendToRenderer('sim:speed-down'),
        },
        { type: 'separator' },
        {
          label: 'Reset',
          accelerator: 'CmdOrCtrl+R',
          click: () => sendToRenderer('sim:reset'),
        },
        {
          label: 'Replay',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendToRenderer('sim:replay'),
        },
        {
          label: 'Sinematik Mod',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => sendToRenderer('sim:cinematic'),
        },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
      ],
    },
    {
      role: 'help',
      label: 'Yardım',
      submenu: [
        {
          label: 'Proje Klasörünü Aç',
          click: async () => {
            await shell.openPath(path.join(__dirname, '..'));
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── YARDIMCI ──────────────────────────────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ── DOSYA İŞLEMLERİ (Menü + Preload için) ─────────────────
function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase().trim();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }
  return false;
}

function validateGtfsUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(String(urlString || '').trim());
  } catch (_) {
    return { ok: false, error: 'Geçersiz URL.' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Yalnızca HTTPS linklerine izin verilir.' };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'Yerel / özel ağ adreslerine izin verilmiyor.' };
  }
  return { ok: true, parsed };
}

function requestUrl(targetUrl, method = 'GET', redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const validation = validateGtfsUrl(targetUrl);
    if (!validation.ok) {
      reject(new Error(validation.error));
      return;
    }
    const req = https.request(validation.parsed, { method, timeout: 15000 }, (res) => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error('Çok fazla yönlendirme var.'));
          return;
        }
        const nextUrl = new URL(res.headers.location, validation.parsed).toString();
        requestUrl(nextUrl, method === 'HEAD' ? 'HEAD' : 'GET', redirectsLeft - 1).then(resolve).catch(reject);
        return;
      }
      resolve({ res, finalUrl: validation.parsed.toString() });
    });
    req.on('timeout', () => req.destroy(new Error('İndirme zaman aşımına uğradı.')));
    req.on('error', reject);
    req.end();
  });
}

async function downloadGTFSFromUrl(urlString) {
  const MAX_BYTES = 200 * 1024 * 1024;
  const validation = validateGtfsUrl(urlString);
  if (!validation.ok) return { success: false, error: validation.error };

  try {
    let headInfo = null;
    try {
      headInfo = await requestUrl(urlString, 'HEAD');
    } catch (_) {
      headInfo = null;
    }
    if (headInfo?.res) {
      const contentType = String(headInfo.res.headers['content-type'] || '').toLowerCase();
      const disposition = String(headInfo.res.headers['content-disposition'] || '').toLowerCase();
      const length = Number.parseInt(headInfo.res.headers['content-length'] || '0', 10);
      headInfo.res.resume();
      const looksZip = validation.parsed.pathname.toLowerCase().endsWith('.zip')
        || disposition.includes('.zip')
        || contentType.includes('zip');
      if (!looksZip) {
        return { success: false, error: 'Link doğrudan bir GTFS ZIP dosyasına gitmiyor.' };
      }
      if (Number.isFinite(length) && length > MAX_BYTES) {
        return { success: false, error: 'ZIP dosyası çok büyük.' };
      }
    }

    const { res, finalUrl } = await requestUrl(urlString, 'GET');
    const contentType = String(res.headers['content-type'] || '').toLowerCase();
    const disposition = String(res.headers['content-disposition'] || '');
    const length = Number.parseInt(res.headers['content-length'] || '0', 10);
    const finalParsed = new URL(finalUrl);
    const looksZip = finalParsed.pathname.toLowerCase().endsWith('.zip')
      || disposition.toLowerCase().includes('.zip')
      || contentType.includes('zip');
    if (!looksZip) {
      res.resume();
      return { success: false, error: 'İndirilen içerik ZIP görünmüyor.' };
    }
    if (Number.isFinite(length) && length > MAX_BYTES) {
      res.resume();
      return { success: false, error: 'ZIP dosyası çok büyük.' };
    }

    const chunks = [];
    let received = 0;
    await new Promise((resolve, reject) => {
      res.on('data', (chunk) => {
        received += chunk.length;
        if (received > MAX_BYTES) {
          res.destroy(new Error('ZIP dosyası çok büyük.'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', resolve);
      res.on('error', reject);
    });
    const buf = Buffer.concat(chunks);
    const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    const inferredName = fileNameMatch?.[1]
      ? decodeURIComponent(fileNameMatch[1].replace(/"/g, ''))
      : path.basename(finalParsed.pathname || 'download.zip');
    const safeName = /\.zip$/i.test(inferredName) ? inferredName : `${inferredName || 'download'}.zip`;
    return { success: true, name: safeName, buffer: toArrayBuffer(buf), size: buf.length, url: finalUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openGTFSDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'GTFS ZIP Dosyası Seç',
    filters: [{ name: 'GTFS ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  return { name: path.basename(filePath), buffer: toArrayBuffer(buffer), size: buffer.length, path: filePath };
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
    if (!entry.isFile()) return;
    if (!/\.zip$/i.test(entry.name)) return;
    const fileName = entry.name.replace(/\.zip$/i, '');
    const zipPath = path.join(dataDir, entry.name);
    const stat = fs.statSync(zipPath);
    cities.push({
      id: fileName.toLowerCase().replace(/[^a-z0-9ığüşöçİĞÜŞÖÇ]+/gi, '-').replace(/^-+|-+$/g, ''),
      name: fileName,
      gtfsZip: `Data/${entry.name}`,
      source: 'builtin',
      hasZip: true,
      zipSize: stat.size,
    });
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

async function saveCapturedImage(options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { success: false, error: 'Ana pencere bulunamadi.' };
  }

  try {
    const image = await mainWindow.webContents.capturePage();
    const scale = Math.max(1, Math.min(3, Number.parseInt(options.scale, 10) || 1));
    const resizedImage = scale > 1
      ? image.resize({
        width: Math.round(image.getSize().width * scale),
        height: Math.round(image.getSize().height * scale),
        quality: 'best',
      })
      : image;
    const pngBuffer = resizedImage.toPNG();
    const suggestedName = String(options.fileName || '').trim() || `gtfs-city-capture-${Date.now()}.png`;
    const defaultFileName = /\.png$/i.test(suggestedName) ? suggestedName : `${suggestedName}.png`;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Ekran Goruntusunu Kaydet',
      defaultPath: defaultFileName,
      filters: [{ name: 'PNG Gorseli', extensions: ['png'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    fs.writeFileSync(result.filePath, pngBuffer);
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── IPC HANDLER’LAR (PRELOAD İÇİN) ───────────────────────
ipcMain.handle('gtfs:open-dialog', openGTFSDialog);           // ← YENİ
ipcMain.handle('gtfs:download-url', async (_, url) => downloadGTFSFromUrl(url));
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

ipcMain.handle('city:get-data-dir', () => {
  return path.join(__dirname, '..', 'Data');
});

ipcMain.handle('city:read-data-file', async (_, filePath) => {
  try {
    const dataDir = path.join(__dirname, '..', 'Data');
    const normalizedPath = String(filePath || '')
      .replace(/\\/g, '/')
      .replace(/^\.?\//, '')
      .replace(/^Data\//i, '');
    const resolved = path.resolve(dataDir, normalizedPath);
    const allowedPrefix = dataDir + path.sep;
    if (!(resolved === dataDir || resolved.startsWith(allowedPrefix))) {
      return { success: false, error: 'Erişim reddedildi (Data/ dışı yol).' };
    }
    const buf = fs.readFileSync(resolved);
    return { success: true, buffer: toArrayBuffer(buf), size: buf.length, path: resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('capture:save-image', async (_, options) => saveCapturedImage(options));

ipcMain.handle('gtfs:read-file', async (_, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    return { success: true, buffer: toArrayBuffer(buf), size: buf.length, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
