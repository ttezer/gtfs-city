const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const docsAppDir = path.join(rootDir, 'docs', 'app');

const fileCopies = [
  'src/utils/analytics-utils.js',
  'src/managers/app-manager.js',
  'src/core/bootstrap-manager.js',
  'src/managers/city-manager.js',
  'src/core/config.js',
  'src/managers/data-manager.js',
  'favicon.ico',
  'src/utils/gtfs-math-utils.js',
  'src/utils/gtfs-utils.js',
  'src/utils/gtfs-validator.js',
  'src/runtime/gtfs-worker.js',
  'src/runtime/connectivity-worker.js',
  'index.html',
  'src/managers/map-manager.js',
  'src/managers/planner-manager.js',
  'src/utils/render-utils.js',
  'src/runtime/i18n-runtime.js',
  'src/runtime/stop-coverage-controls.js',
  'src/runtime/heatmap-controls.js',
  'src/runtime/bunching-controls.js',
  'src/runtime/isochron-controls.js',
  'src/runtime/playback-controls.js',
  'src/runtime/type-filter-controls.js',
  'src/runtime/section-collapse-controls.js',
  'src/runtime/tariff-sheets.js',
  'src/runtime/adjacency-builder.js',
  'src/runtime/capture-controls.js',
  'src/runtime/metro-map-controls.js',
  'src/runtime/connectivity-grid-controls.js',
  'src/runtime/cinematic-controls.js',
  'src/runtime/script.js',
  'src/managers/service-manager.js',
  'src/utils/sim-utils.js',
  'src/runtime/simulation-engine.js',
  'src/runtime/bridge-utils.js',
  'src/utils/stop-connectivity-utils.js',
  'style.css',
  'src/managers/ui-manager.js',
  'src/utils/ui-utils.js',
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
