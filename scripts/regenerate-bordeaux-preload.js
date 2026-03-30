const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { TextDecoder } = require('util');

const CONFIG = require('../config.js');
const {
  parseCsvRows,
  buildRouteMap,
  buildShapePoints,
  buildStopsMap,
  buildTripMetaMap,
  buildTripStopsMapFromUint8,
  buildGtfsRuntimeData,
} = require('../gtfs-utils.js');

const ROOT = path.resolve(__dirname, '..');
const ZIP_PATH = path.join(ROOT, 'Data', 'bordeaux.zip');
const OUT_TRIPS = path.join(ROOT, 'trips_data.js');
const OUT_SHAPES = path.join(ROOT, 'shapes_data.js');
const OUT_LOOKUP = path.join(ROOT, 'lookup_data.js');

function displayText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function getRouteColorRgb(routeShort, routeType, fallbackColor) {
  if (Array.isArray(fallbackColor) && fallbackColor.length >= 3) return fallbackColor;
  const meta = CONFIG.TYPE_META?.[String(routeType)];
  if (meta?.rgb) return meta.rgb;
  const palette = [
    [231, 76, 60], [52, 152, 219], [155, 89, 182], [46, 204, 113], [241, 196, 15],
    [230, 126, 34], [26, 188, 156], [211, 84, 0], [52, 73, 94], [192, 57, 43],
  ];
  const key = `${routeType || ''}:${routeShort || ''}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function decodeText(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8 && !utf8.includes('\uFFFD')) return utf8;
  return new TextDecoder('windows-1254').decode(buffer);
}

function extractZip(zipPath, destinationDir) {
  const escapedZip = zipPath.replace(/'/g, "''");
  const escapedDest = destinationDir.replace(/'/g, "''");
  const command = `Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedDest}' -Force`;
  const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'ZIP extraction failed');
  }
}

function resolveGtfsDir(baseDir) {
  const gtfsDir = path.join(baseDir, 'gtfs');
  return fs.existsSync(gtfsDir) ? gtfsDir : baseDir;
}

function readTable(baseDir, baseName) {
  const candidates = [
    path.join(baseDir, `${baseName}.txt`),
    path.join(baseDir, `${baseName}.csv`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate);
  }
  throw new Error(`Missing GTFS table: ${baseName}`);
}

function buildAdjacency(stopDeps) {
  const tripStops = new Map();
  for (const [sid, deps] of Object.entries(stopDeps)) {
    for (const [tripIdx, offsetSec, routeShort] of deps || []) {
      if (!tripStops.has(tripIdx)) tripStops.set(tripIdx, []);
      tripStops.get(tripIdx).push({ sid, offsetSec, routeShort });
    }
  }

  const adj = {};
  for (const stops of tripStops.values()) {
    stops.sort((left, right) => left.offsetSec - right.offsetSec);
    for (let index = 0; index < stops.length - 1; index += 1) {
      const current = stops[index];
      const next = stops[index + 1];
      if (!current.sid || !next.sid || current.sid === next.sid) continue;
      const seconds = Math.max(next.offsetSec - current.offsetSec, 30);
      if (!adj[current.sid]) adj[current.sid] = new Map();
      const key = `${next.sid}|${current.routeShort || ''}`;
      const existing = adj[current.sid].get(key);
      if (!existing || seconds < existing[1]) {
        adj[current.sid].set(key, [next.sid, seconds, displayText(current.routeShort || '')]);
      }
    }
  }

  return Object.fromEntries(Object.entries(adj).map(([sid, edges]) => [sid, [...edges.values()]]));
}

function normalizeTrips(trips) {
  return trips.map((trip) => {
    const startSec = Array.isArray(trip.ts) && trip.ts.length ? trip.ts[0] : 0;
    return {
      ...trip,
      s: displayText(trip.s || ''),
      h: displayText(trip.h || ''),
      ln: displayText(trip.ln || ''),
      ts: Array.isArray(trip.ts) ? trip.ts.map((value) => Math.max(0, value - startSec)) : [],
      bs: startSec,
      st: Array.isArray(trip.st)
        ? trip.st.map((entry) => ({ sid: String(entry.sid), off: Math.max(0, (Number(entry.off) || 0) - startSec) }))
        : [],
    };
  });
}

function normalizeShapes(shapes) {
  return shapes.map((shape) => ({
    ...shape,
    s: displayText(shape.s || ''),
    ln: displayText(shape.ln || ''),
  }));
}

function normalizeStopInfo(stopInfo) {
  return Object.fromEntries(
    Object.entries(stopInfo).map(([sid, info]) => [
      sid,
      [info[0], info[1], displayText(info[2] || sid), displayText(info[3] || sid)],
    ]),
  );
}

function normalizeStopDeps(stopDeps) {
  return Object.fromEntries(
    Object.entries(stopDeps).map(([sid, deps]) => [
      sid,
      deps.map(([tripIdx, offsetSec, routeShort]) => [tripIdx, offsetSec, displayText(routeShort || '')]),
    ]),
  );
}

function normalizeStops(stops) {
  return stops.map((stop) => [
    stop[0],
    stop[1],
    displayText(stop[2] || ''),
    String(stop[3] || ''),
    displayText(stop[4] || stop[2] || ''),
  ]);
}

function writeVarFile(filePath, varName, value) {
  fs.writeFileSync(filePath, `var ${varName}=${JSON.stringify(value)};\n`, 'utf8');
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bordeaux-gtfs-'));
  try {
    extractZip(ZIP_PATH, tempDir);
    const gtfsDir = resolveGtfsDir(tempDir);

    const routes = parseCsvRows(decodeText(readTable(gtfsDir, 'routes')));
    const trips = parseCsvRows(decodeText(readTable(gtfsDir, 'trips')));
    const stops = parseCsvRows(decodeText(readTable(gtfsDir, 'stops')));
    const shapes = parseCsvRows(decodeText(readTable(gtfsDir, 'shapes')));
    const stopTimesBytes = new Uint8Array(readTable(gtfsDir, 'stop_times'));

    const routeMap = buildRouteMap(routes, getRouteColorRgb, CONFIG.TYPE_META);
    const shapePts = buildShapePoints(shapes);
    const stopsMap = buildStopsMap(stops);
    const tripMeta = buildTripMetaMap(trips);
    const tripStops = buildTripStopsMapFromUint8(stopTimesBytes);
    const runtime = await buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops);

    const normalizedTrips = normalizeTrips(runtime.nTRIPS);
    const normalizedShapes = normalizeShapes(runtime.nSHAPES);
    const stopInfo = normalizeStopInfo(runtime.nSTOP_INFO);
    const stopDeps = normalizeStopDeps(runtime.nSTOP_DEPS);
    const normalizedStops = normalizeStops(runtime.nSTOPS);
    const adj = buildAdjacency(stopDeps);

    writeVarFile(OUT_TRIPS, 'TRIPS', normalizedTrips);
    writeVarFile(OUT_SHAPES, 'SHAPES', normalizedShapes);
    fs.writeFileSync(OUT_LOOKUP, [
      `var STOPS=${JSON.stringify(normalizedStops)};`,
      `var STOP_INFO=${JSON.stringify(stopInfo)};`,
      `var STOP_DEPS=${JSON.stringify(stopDeps)};`,
      `var HOURLY_COUNTS=${JSON.stringify(runtime.nHOURLY_COUNTS)};`,
      `var HOURLY_HEAT=${JSON.stringify(runtime.nHOURLY_HEAT)};`,
      `var ADJ=${JSON.stringify(adj)};`,
      '',
    ].join('\n'), 'utf8');

    console.log(`Regenerated preload files from ${ZIP_PATH}`);
    console.log(`TRIPS=${normalizedTrips.length}, SHAPES=${normalizedShapes.length}, STOPS=${normalizedStops.length}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
