const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const docsAppDir = path.join(rootDir, 'docs', 'app');

const fileCopies = [
  'analytics-utils.js',
  'bootstrap-manager.js',
  'city-manager.js',
  'config.js',
  'data-manager.js',
  'favicon.ico',
  'gtfs-math-utils.js',
  'gtfs-utils.js',
  'gtfs-validator.js',
  'gtfs-worker.js',
  'index.html',
  'map-manager.js',
  'planner-manager.js',
  'render-utils.js',
  'script.js',
  'service-manager.js',
  'sim-utils.js',
  'simulation-engine.js',
  'state-manager.js',
  'stop-connectivity-utils.js',
  'style.css',
  'ui-manager.js',
  'ui-utils.js',
];

const assetCopies = [
  ['assets/logo-mark.png', 'assets/logo-mark.png'],
  ['assets/flags/fr.svg', 'assets/flags/fr.svg'],
  ['assets/flags/tr.svg', 'assets/flags/tr.svg'],
  ['assets/flags/us.svg', 'assets/flags/us.svg'],
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileFromSource(sourceRelativePath, destinationRelativePath) {
  const sourcePath = path.join(rootDir, sourceRelativePath);
  const destinationPath = path.join(docsAppDir, destinationRelativePath);
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
  console.log(`[sync-docs-app] copied ${sourceRelativePath} -> docs/app/${destinationRelativePath}`);
}

function main() {
  ensureDir(docsAppDir);

  for (const relativePath of fileCopies) {
    writeFileFromSource(relativePath, relativePath);
  }

  for (const [sourceRelativePath, destinationRelativePath] of assetCopies) {
    writeFileFromSource(sourceRelativePath, destinationRelativePath);
  }
}

main();
