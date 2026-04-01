const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'data', 'samples.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

async function getRemoteMeta(url) {
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (!response.ok) throw new Error(`HEAD ${response.status} ${response.statusText}`.trim());
  return {
    finalUrl: response.url,
    etag: response.headers.get('etag') || '',
    lastModified: response.headers.get('last-modified') || '',
    contentLength: Number(response.headers.get('content-length') || 0),
    checkedAt: new Date().toISOString(),
  };
}

function getLocalMeta(localPath) {
  const fullPath = path.join(repoRoot, localPath);
  if (!fs.existsSync(fullPath)) return { exists: false, size: 0, mtime: '' };
  const stats = fs.statSync(fullPath);
  return {
    exists: true,
    size: stats.size,
    mtime: new Date(stats.mtimeMs).toISOString(),
  };
}

function isSampleStale(sample, remoteMeta, localMeta) {
  if (!localMeta.exists) return true;
  const previous = sample.remoteMeta || {};
  if (!previous.etag && !previous.lastModified && !previous.contentLength) return true;
  return previous.etag !== remoteMeta.etag
    || previous.lastModified !== remoteMeta.lastModified
    || Number(previous.contentLength || 0) !== Number(remoteMeta.contentLength || 0)
    || Number(sample.localMeta?.size || 0) !== Number(localMeta.size || 0);
}

async function main() {
  const manifest = readManifest();
  let staleCount = 0;
  for (const sample of manifest.samples || []) {
    const remoteMeta = await getRemoteMeta(sample.remoteUrl);
    const localMeta = getLocalMeta(sample.localPath);
    const stale = isSampleStale(sample, remoteMeta, localMeta);
    if (stale) {
      staleCount += 1;
      console.log(`[sample-check] Guncelleme gerekli: ${sample.city}`);
    } else {
      console.log(`[sample-check] Guncel: ${sample.city}`);
    }
  }
  if (staleCount > 0) {
    console.log(`[sample-check] ${staleCount} ornek veri guncellemesi gerekiyor. "npm run update:samples" calistirin.`);
    process.exitCode = 1;
    return;
  }
  console.log('[sample-check] Tum ornek veri dosyalari guncel.');
}

main().catch((error) => {
  console.error(`[sample-check] Hata: ${error.message}`);
  process.exitCode = 1;
});
