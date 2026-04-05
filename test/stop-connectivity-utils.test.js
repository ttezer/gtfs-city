const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCorridorKey,
  generateStopConnectivitySnapshot,
} = require('../src/utils/stop-connectivity-utils');

test('buildCorridorKey uses direction when available', () => {
  assert.equal(buildCorridorKey({ s: '34', dir: 1, h: 'Downtown' }), '34::dir:1');
});

test('buildCorridorKey falls back to normalized headsign', () => {
  assert.equal(
    buildCorridorKey({ s: '10A', h: '  Mecidiyekoy  ' }),
    '10A::head:mecidiyekoy'
  );
});

test('generateStopConnectivitySnapshot produces schema-shaped stop scores', () => {
  const reachabilityCalls = [];
  const ctx = {
    feed_id: 'test_feed',
    TRIPS: [
      { s: 'M1', dir: 0, h: 'Center' },
      { s: 'M1', dir: 1, h: 'Return' },
      { s: '10', dir: 0, h: 'Park' },
      { s: '20', h: 'Downtown' },
    ],
    STOP_INFO: {
      stop_a: [29.0, 41.0, 'A'],
      stop_b: [29.1, 41.1, 'B'],
      stop_c: [29.2, 41.2, 'C'],
    },
    STOP_DEPS: {
      stop_a: [
        [0, 7 * 3600 + 40 * 60, 'M1'],
        [2, 7 * 3600 + 50 * 60, '10'],
        [0, 8 * 3600 + 0 * 60, 'M1'],
      ],
      stop_b: [
        [3, 8 * 3600 + 5 * 60, '20'],
      ],
      stop_c: [
        [1, 8 * 3600 + 20 * 60, 'M1'],
      ],
    },
    calcReachabilityFromStop: (stopId, maxSecs, options) => {
      reachabilityCalls.push({ stopId, maxSecs, options });
      if (stopId !== 'stop_a') return [{ stopId, seconds: 0 }];
      return [
        { stopId: 'stop_a', seconds: 0 },
        { stopId: 'stop_b', seconds: 600 },
        { stopId: 'stop_c', seconds: 2000 },
      ];
    },
  };

  const snapshot = generateStopConnectivitySnapshot(ctx);
  assert.equal(snapshot.meta.feed_id, 'test_feed');
  assert.equal(snapshot.meta.profile.id, 'weekday_peak');
  assert.ok(snapshot.meta.gtfs_hash);
  assert.equal(snapshot.meta.validation_summary.stop_count, 3);

  const record = snapshot.stops.stop_a;
  assert.ok(record);
  assert.equal(record.local.corridor_count, 2);
  assert.equal(record.local.median_headway_seconds, 600);
  assert.deepEqual(record.network.band_counts, { b15: 3, b30: 0, b45: 1 });
  assert.equal(record.network.unique_corridor_count_total, 4);
  assert.equal(typeof record.final_score, 'number');
  assert.deepEqual(reachabilityCalls[0], {
    stopId: 'stop_a',
    maxSecs: 1800,
    options: { skipWalk: true },
  });
});
