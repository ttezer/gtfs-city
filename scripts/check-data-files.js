const fs = require('fs');
const path = require('path');

function exists(relPath) {
  try {
    fs.accessSync(path.join(process.cwd(), relPath), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!exists('Data')) {
    console.error('[prebuild] Data/ folder not found.');
    console.error('[prebuild] Add at least one GTFS ZIP under Data/ before building.');
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), 'Data');
  const zipFiles = fs.readdirSync(dataDir).filter((name) => /\.zip$/i.test(name));
  if (!zipFiles.length) {
    console.error('[prebuild] No GTFS ZIP files found under Data/.');
    console.error('[prebuild] Add at least one GTFS ZIP under Data/ before building.');
    process.exit(1);
  }

  console.log('[prebuild] OK');
}

main();
