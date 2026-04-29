const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hhmmToSec,
  simplifyPathPoints,
  buildRouteMap,
  buildTripStopsMap,
  buildGtfsRuntimeData,
} = require('../src/utils/gtfs-utils');

test('hhmmToSec parses GTFS time strings', () => {
  assert.equal(hhmmToSec('06:45:30'), 24330);
  assert.equal(hhmmToSec(''), null);
});

test('simplifyPathPoints preserves endpoints under limit', () => {
  const path = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
  const simplified = simplifyPathPoints(path, 3);
  assert.equal(simplified.length, 3);
  assert.deepEqual(simplified[0], [0, 0]);
  assert.deepEqual(simplified[2], [3, 3]);
});

test('buildRouteMap creates deterministic route metadata', () => {
  const routeMap = buildRouteMap(
    [{ route_id: 'm4', route_type: '1', route_short_name: 'M4', route_long_name: 'Kadıköy - Sabiha' }],
    () => [10, 20, 30],
    { '1': { rgb: [1, 2, 3] } }
  );

  assert.deepEqual(routeMap.m4, {
    routeId: 'm4',
    agencyId: '',
    short: 'M4',
    type: '1',
    color: [10, 20, 30],
    longName: 'Kadıköy - Sabiha',
  });
});

test('buildTripStopsMap sorts stop_times by sequence', () => {
  const tripStops = buildTripStopsMap([
    { trip_id: 't1', departure_time: '06:10:00', stop_id: 's2', stop_sequence: '2' },
    { trip_id: 't1', departure_time: '06:00:00', stop_id: 's1', stop_sequence: '1' },
  ]);

  assert.deepEqual(tripStops.t1, [
    [1, 21600, 's1'],
    [2, 22200, 's2'],
  ]);
});

test('buildTripMetaMap keeps service id', () => {
const { buildTripMetaMap } = require('../src/utils/gtfs-utils');
  const tripMeta = buildTripMetaMap([
    { trip_id: 't1', route_id: 'r1', shape_id: 'sh1', trip_headsign: 'Merkez', service_id: 'weekday' },
  ]);

  assert.equal(tripMeta.t1.service_id, 'weekday');
});

test('buildGtfsRuntimeData creates trips, shapes and stop departures', () => {
  const routeMap = {
    r1: { short: 'M4', type: '1', color: [10, 20, 30], longName: 'Kadıköy - Sabiha' },
  };
  const shapePts = {
    shp1: [[29.0, 41.0], [29.1, 41.01], [29.2, 41.02]],
  };
  const stopsMap = {
    s1: [29.0, 41.0, 'Bir', '001'],
    s2: [29.2, 41.02, 'İki', '002'],
  };
  const tripMeta = {
    t1: { route_id: 'r1', shape_id: 'shp1', head: 'Merkez' },
  };
  const tripStops = {
    t1: [[1, 21600, 's1'], [2, 22200, 's2']],
  };

  const runtime = buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops);

  assert.equal(runtime.nTRIPS.length, 1);
  assert.equal(runtime.nSHAPES.length, 1);
  assert.equal(runtime.nSTOPS.length, 2);
  assert.equal(runtime.nSTOP_DEPS.s1.length, 1);
  assert.equal(runtime.nTRIPS[0].ln, 'Kadıköy - Sabiha');
});

test('buildGtfsRuntimeData keeps multiple shapes for same route short name', () => {
  const routeMap = {
    r1: { short: 'M4', type: '1', color: [10, 20, 30], longName: 'Kadıköy - Sabiha' },
  };
  const shapePts = {
    shp1: [[29.0, 41.0], [29.1, 41.01]],
    shp2: [[29.2, 41.0], [29.3, 41.01]],
  };
  const stopsMap = {
    s1: [29.0, 41.0, 'Bir', '001'],
    s2: [29.1, 41.01, 'İki', '002'],
    s3: [29.2, 41.0, 'Üç', '003'],
    s4: [29.3, 41.01, 'Dört', '004'],
  };
  const tripMeta = {
    t1: { route_id: 'r1', shape_id: 'shp1', head: 'A' },
    t2: { route_id: 'r1', shape_id: 'shp2', head: 'B' },
  };
  const tripStops = {
    t1: [[1, 21600, 's1'], [2, 22200, 's2']],
    t2: [[1, 21600, 's3'], [2, 22200, 's4']],
  };

  const runtime = buildGtfsRuntimeData(routeMap, shapePts, stopsMap, tripMeta, tripStops);

  assert.equal(runtime.nSHAPES.length, 2);
});
