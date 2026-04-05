const test = require('node:test');
const assert = require('node:assert/strict');

const { calcHeadway, waitingColor, calcHeadwayPairs } = require('../src/utils/analytics-utils');
const { getVehiclePos, getTripProgressAtTime, haversineM } = require('../src/utils/sim-utils');

test('waitingColor returns green for short wait', () => {
  assert.deepEqual(waitingColor(240), [34, 197, 94, 220]);
});

test('calcHeadway returns nearest distance label for same route', () => {
  const trips = [
    { s: 'M1', d: 120, ts: [0, 60, 120], p: [[28.9, 41.0], [29.0, 41.0], [29.1, 41.0]] },
    { s: 'M1', d: 120, ts: [20, 80, 140], p: [[28.92, 41.0], [29.02, 41.0], [29.12, 41.0]] },
  ];
  const result = calcHeadway(trips, 1, 30, getVehiclePos, haversineM, getTripProgressAtTime);
  assert.match(result, /m\)?$/);
});

test('calcHeadwayPairs creates at least one pair for same route direction', () => {
  const trips = [
    { s: 'M1', t: '1', h: 'Kadikoy', d: 120, ts: [0, 60, 120], p: [[28.9, 41.0], [29.0, 41.0], [29.1, 41.0]] },
    { s: 'M1', t: '1', h: 'Kadikoy', d: 120, ts: [20, 80, 140], p: [[28.91, 41.0], [29.01, 41.0], [29.11, 41.0]] },
    { s: 'M1', t: '1', h: 'Taksim', d: 120, ts: [0, 60, 120], p: [[29.11, 41.0], [29.01, 41.0], [28.91, 41.0]] },
  ];
  const result = calcHeadwayPairs({
    trips,
    time: 30,
    typeFilter: '1',
    activeRoutes: new Set(),
    bunchingThreshold: 200,
    headwayCfg: {
      minPairDistanceM: 1,
      maxPairDistanceM: 50000,
      transitionDistanceM: 3000,
      minPairSeconds: 1,
      maxPairSeconds: 600,
      transitionSeconds: 240,
      bunchingTimeThresholdSeconds: 120,
    },
    getVehiclePos,
    getTripProgressAtTime,
    inferTripDirectionLabel: (trip) => trip.h,
    haversineM,
  });

  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0].direction, 'Kadikoy');
  assert.match(String(result.lines[0].headwaySeconds), /^\d+$/);
});
