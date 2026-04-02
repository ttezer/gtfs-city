const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'data', 'samples.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function getRemoteMeta(url) {
  let response;
  try {
    response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  } catch (_) {
    response = null;
  }
  if (!response || !response.ok) {
    response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) throw new Error(`GET ${response.status} ${response.statusText}`.trim());
    await response.body?.cancel?.();
  }
  return {
    finalUrl: response.url,
    etag: response.headers.get('etag') || '',
    lastModified: response.headers.get('last-modified') || '',
    contentLength: Number(response.headers.get('content-length') || 0),
    checkedAt: new Date().toISOString(),
  };
}

function getLocalMeta(localPath) {
  if (!localPath) return { exists: false, size: 0, mtime: '', sha256: '' };
  const fullPath = path.join(repoRoot, localPath);
  if (!fs.existsSync(fullPath)) return { exists: false, size: 0, mtime: '', sha256: '' };
  const stats = fs.statSync(fullPath);
  const buffer = fs.readFileSync(fullPath);
  return {
    exists: true,
    size: stats.size,
    mtime: new Date(stats.mtimeMs).toISOString(),
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function needsUpdate(sample, remoteMeta, localMeta) {
  if (!localMeta.exists) return true;
  if (Number(sample.localMeta?.size || 0) !== Number(localMeta.size || 0)) return true;
  const remoteLength = Number(remoteMeta.contentLength || 0);
  if (remoteLength > 0 && remoteLength !== Number(localMeta.size || 0)) return true;
  return false;
}

async function downloadSample(sample) {
  const response = await fetch(sample.remoteUrl, { method: 'GET', redirect: 'follow' });
  if (!response.ok) throw new Error(`GET ${response.status} ${response.statusText}`.trim());
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fullPath = path.join(repoRoot, sample.localPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return {
    size: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    mtime: new Date().toISOString(),
  };
}

function isBundledSample(sample) {
  return sample?.loadStrategy === 'bundled';
}

async function main() {
  const manifest = readManifest();
  for (const sample of manifest.samples || []) {
    if (!isBundledSample(sample)) {
      console.log(`[sample-update] ${sample.city} dis kaynak karti olarak birakildi.`);
      continue;
    }
    const localMeta = getLocalMeta(sample.localPath);
    let remoteMeta;
    try {
      remoteMeta = await getRemoteMeta(sample.remoteUrl);
      sample.remoteMeta = remoteMeta;
    } catch (error) {
      if (localMeta.exists) {
        sample.localMeta = localMeta;
        console.log(`[sample-update] Uyari: ${sample.city} remote meta alinamadi, yerel paket korunuyor. (${error.message})`);
        continue;
      }
      throw error;
    }
    if (needsUpdate(sample, remoteMeta, localMeta)) {
      console.log(`[sample-update] ${sample.city} guncel degil, guncelliyorum...`);
      const updatedLocal = await downloadSample(sample);
      sample.localMeta = updatedLocal;
      continue;
    }
    console.log(`[sample-update] ${sample.city} zaten guncel.`);
    sample.localMeta = localMeta;
  }
  writeManifest(manifest);
  console.log('[sample-update] Ornek veri dosyalari kontrol edildi ve manifest guncellendi.');
}

main().catch((error) => {
  console.error(`[sample-update] Hata: ${error.message}`);
  process.exitCode = 1;
});
