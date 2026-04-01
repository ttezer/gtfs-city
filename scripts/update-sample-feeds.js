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
  const previous = sample.remoteMeta || {};
  return previous.etag !== remoteMeta.etag
    || previous.lastModified !== remoteMeta.lastModified
    || Number(previous.contentLength || 0) !== Number(remoteMeta.contentLength || 0)
    || Number(sample.localMeta?.size || 0) !== Number(localMeta.size || 0);
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

async function main() {
  const manifest = readManifest();
  for (const sample of manifest.samples || []) {
    const remoteMeta = await getRemoteMeta(sample.remoteUrl);
    const localMeta = getLocalMeta(sample.localPath);
    if (needsUpdate(sample, remoteMeta, localMeta)) {
      console.log(`[sample-update] ${sample.city} guncel degil, guncelliyorum...`);
      const updatedLocal = await downloadSample(sample);
      sample.remoteMeta = remoteMeta;
      sample.localMeta = updatedLocal;
      continue;
    }
    console.log(`[sample-update] ${sample.city} zaten guncel.`);
    sample.remoteMeta = remoteMeta;
    sample.localMeta = localMeta;
  }
  writeManifest(manifest);
  console.log('[sample-update] Ornek veri dosyalari kontrol edildi ve manifest guncellendi.');
}

main().catch((error) => {
  console.error(`[sample-update] Hata: ${error.message}`);
  process.exitCode = 1;
});
