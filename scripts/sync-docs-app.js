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

function buildDocsAppManager(sourceText) {
  return sourceText
    .replace("return new URL('./docs/data/samples.json', window.location.href).toString();", "return new URL('../data/samples.json', window.location.href).toString();")
    .replace(
      /if \(sample\.loadStrategy === 'bundled'\) \{\r?\n\s+if \(!sample\.localPath\) return null;\r?\n\s+return \{\r?\n\s+kind: 'local',\r?\n\s+path: new URL\(`\.\/\$\{sample\.localPath\}`, window\.location\.href\)\.toString\(\),\r?\n\s+fileName: sample\.fileName \|\| `\$\{sample\.city \|\| 'sample'\}\.zip`,\r?\n\s+\};\r?\n\s+\}\r?\n\s+if \(sample\.loadStrategy === 'remote' && window\.IS_ELECTRON && sample\.remoteUrl\) \{\r?\n\s+return \{\r?\n\s+kind: 'remote',\r?\n\s+url: sample\.remoteUrl,\r?\n\s+fileName: sample\.fileName \|\| `\$\{sample\.city \|\| 'sample'\}\.zip`,\r?\n\s+\};\r?\n\s+\}/,
      `const isElectron = !!window.IS_ELECTRON;\n    if (sample.loadStrategy === 'bundled') {\n      if (!sample.localPath) return null;\n      return {\n        url: new URL(\`../\${sample.localPath.replace(/^docs\\//, '')}\`, window.location.href).toString(),\n        fileName: sample.fileName || \`\${sample.city || 'sample'}.zip\`,\n      };\n    }\n    if (sample.loadStrategy === 'remote' && isElectron && sample.remoteUrl) {\n      return {\n        url: sample.remoteUrl,\n        fileName: sample.fileName || \`\${sample.city || 'sample'}.zip\`,\n      };\n    }`
    )
    .replace("return sample.note || translate('sampleNoteBundled', 'Bundled sample package for the app.');", "return sample.note || translate('sampleNoteBundled', 'Bundled sample package for the web demo.');")
    .replace(
      /return `\r?\n\s+<article class="lp-example-card">[\s\S]*?<\/article>\r?\n\s+`;/,
      `const safeCity = escapeHtml(sample.city);\n      const safeAgency = escapeHtml(sample.agency);\n      const safeFileName = escapeHtml(sample.fileName || \`\${sample.city || 'sample'}.zip\`);\n      const safeSourcePage = escapeHtml(sample.sourcePage || '#');\n      const safeUrl = escapeHtml(config?.url || '');\n      const safeNote = escapeHtml(getSampleNote(sample));\n      const safeFlag = escapeHtml(resolveFlagPath(sample.countryCode));\n      const safeAlt = escapeHtml(\`\${sample.countryCode || ''} flag\`);\n      return \`\n        <article class="lp-example-card">\n          <div class="lp-example-top">\n            <div class="lp-example-place">\n              <img class="lp-example-flag" src="\${safeFlag}" alt="\${safeAlt}">\n              <span class="lp-example-city">\${safeCity}</span>\n            </div>\n            <span class="lp-example-badge">\${escapeHtml(badgeLabel)}</span>\n          </div>\n          <div class="lp-example-org">\${safeAgency}</div>\n          <div class="lp-example-note">\${safeNote}</div>\n          <div class="lp-example-actions">\n            <button class="lp-btn outline lp-example-load" \${config ? \`data-url="\${safeUrl}" data-name="\${safeFileName}"\` : 'disabled'}>\${escapeHtml(buttonLabel)}</button>\n            <a class="lp-example-source" href="\${safeSourcePage}" target="_blank" rel="noreferrer">\${escapeHtml(translate('landingExampleSource', 'Open Source'))}</a>\n          </div>\n        </article>\n      \`;`
    )
    .replace(
      /const kind = button\.dataset\.kind \|\| 'remote';\r?\n\s+const url = button\.dataset\.url \|\| '';\r?\n\s+const path = button\.dataset\.path \|\| '';\r?\n\s+const fileName = button\.dataset\.name \|\| '';\r?\n\s+if \(kind === 'local'\) \{\r?\n\s+window\.DataManager\?\.handleGTFSLocalPath\?\.\(path, \{ fileName \}\);\r?\n\s+return;\r?\n\s+\}\r?\n\s+window\.DataManager\?\.handleGTFSUrl\?\.\(url, \{ fileName \}\);/,
      `const url = button.dataset.url || '';\n        const fileName = button.dataset.name || '';\n        window.DataManager?.handleGTFSUrl?.(url, { fileName });`
    );
}

function writeTransformedAppManager() {
  const sourcePath = path.join(rootDir, 'app-manager.js');
  const destinationPath = path.join(docsAppDir, 'app-manager.js');
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const transformed = buildDocsAppManager(sourceText);
  ensureDir(path.dirname(destinationPath));
  fs.writeFileSync(destinationPath, transformed, 'utf8');
  console.log('[sync-docs-app] transformed app-manager.js -> docs/app/app-manager.js');
}

function main() {
  ensureDir(docsAppDir);

  for (const relativePath of fileCopies) {
    writeFileFromSource(relativePath, relativePath);
  }

  for (const [sourceRelativePath, destinationRelativePath] of assetCopies) {
    writeFileFromSource(sourceRelativePath, destinationRelativePath);
  }

  writeTransformedAppManager();
}

main();
