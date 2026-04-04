const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const desktopDataDir = path.join(rootDir, 'Data');
const docsDataDir = path.join(rootDir, 'docs', 'data');

function getZipFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((name) => /\.zip$/i.test(name));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfMissing(sourcePath, destinationPath) {
  if (fs.existsSync(destinationPath)) return false;
  fs.copyFileSync(sourcePath, destinationPath);
  return true;
}

function main() {
  const existingDesktopZips = getZipFiles(desktopDataDir);
  if (existingDesktopZips.length) {
    console.log(`[prepare-desktop-data] Using existing Data/ ZIP files (${existingDesktopZips.length}).`);
    return;
  }

  const docsZips = getZipFiles(docsDataDir);
  if (!docsZips.length) {
    console.error('[prepare-desktop-data] No ZIP files found in docs/data/.');
    console.error('[prepare-desktop-data] Desktop packaging requires at least one GTFS ZIP.');
    process.exit(1);
  }

  ensureDir(desktopDataDir);
  let copied = 0;
  for (const fileName of docsZips) {
    const sourcePath = path.join(docsDataDir, fileName);
    const destinationPath = path.join(desktopDataDir, fileName);
    if (copyIfMissing(sourcePath, destinationPath)) copied += 1;
  }

  console.log(`[prepare-desktop-data] Seeded Data/ from docs/data/ (${copied} copied, ${docsZips.length} available).`);
}

main();
