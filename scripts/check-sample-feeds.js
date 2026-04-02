const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'data', 'samples.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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
  if (!localPath) return { exists: false, size: 0, mtime: '' };
  const fullPath = path.join(repoRoot, localPath);
  if (!fs.existsSync(fullPath)) return { exists: false, size: 0, mtime: '' };
  const stats = fs.statSync(fullPath);
  return {
    exists: true,
    size: stats.size,
    mtime: new Date(stats.mtimeMs).toISOString(),
  };
}

function isBundledSample(sample) {
  return sample?.loadStrategy === 'bundled';
}

function isSampleStale(sample, remoteMeta, localMeta) {
  if (!localMeta.exists) return true;
  if (Number(sample.localMeta?.size || 0) !== Number(localMeta.size || 0)) return true;
  const remoteLength = Number(remoteMeta.contentLength || 0);
  if (remoteLength > 0 && remoteLength !== Number(localMeta.size || 0)) return true;
  return false;
}

async function main() {
  const manifest = readManifest();
  let staleCount = 0;
  for (const sample of manifest.samples || []) {
    if (!isBundledSample(sample)) {
      console.log(`[sample-check] Dis kaynak referansi: ${sample.city}`);
      continue;
    }
    const localMeta = getLocalMeta(sample.localPath);
    let remoteMeta;
    try {
      remoteMeta = await getRemoteMeta(sample.remoteUrl);
    } catch (error) {
      if (localMeta.exists) {
        console.log(`[sample-check] Uyari: ${sample.city} remote meta alinamadi, yerel paket korunuyor. (${error.message})`);
        continue;
      }
      throw error;
    }
    const stale = isSampleStale(sample, remoteMeta, localMeta);
    if (stale) {
      staleCount += 1;
      console.log(`[sample-check] Guncelleme gerekli: ${sample.city}`);
    } else {
      console.log(`[sample-check] Guncel: ${sample.city}`);
    }
  }
  if (staleCount > 0) {
    console.log(`[sample-check] ${staleCount} repo ici ornek veri guncellemesi gerekiyor. "npm run update:samples" calistirin.`);
    process.exitCode = 1;
    return;
  }
  console.log('[sample-check] Tum repo ici ornek veri dosyalari guncel.');
}

main().catch((error) => {
  console.error(`[sample-check] Hata: ${error.message}`);
  process.exitCode = 1;
});
