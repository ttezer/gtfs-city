const test = require('node:test');
const assert = require('node:assert/strict');

const { secsToHHMM, getPhase, getVehiclePos } = require('../sim-utils');

test('secsToHHMM formats midnight and wraps 24h', () => {
  assert.equal(secsToHHMM(0), '00:00');
  assert.equal(secsToHHMM(23 * 3600 + 59 * 60), '23:59');
  assert.equal(secsToHHMM(25 * 3600), '01:00');
});

test('getPhase maps day segments correctly', () => {
  assert.equal(getPhase(4 * 3600), 'night');
  assert.equal(getPhase(6 * 3600), 'dawn');
  assert.equal(getPhase(12 * 3600), 'day');
  assert.equal(getPhase(20 * 3600), 'dusk');
  assert.equal(getPhase(23 * 3600), 'night');
});

test('getVehiclePos interpolates location in a segment', () => {
  const trip = {
    d: 120,
    ts: [0, 60, 120],
    p: [[28.9, 41.0], [29.0, 41.1], [29.2, 41.3]],
  };

  const pos = getVehiclePos(trip, 30);
  assert.ok(pos);
  assert.equal(pos[0], 28.95);
  assert.equal(pos[1], 41.05);
});

test('getVehiclePos returns null when outside interpolation window', () => {
  const trip = {
    d: 120,
    ts: [10, 40, 100],
    p: [[28.9, 41.0], [29.0, 41.1], [29.2, 41.3]],
  };

  assert.equal(getVehiclePos(trip, 5), null);
});
