const test = require('node:test');
const assert = require('node:assert/strict');

const {
  displayText,
  getRouteColorRgb,
  getRouteMeta,
  getModelNotice,
  getModelOrientation,
} = require('../render-utils');

test('displayText repairs mojibake fragments', () => {
  assert.equal(displayText('MinibÃ¼s'), 'Minibüs');
});

test('getRouteColorRgb is deterministic for same route', () => {
  assert.deepEqual(getRouteColorRgb('M2', '1'), getRouteColorRgb('M2', '1'));
});

test('getRouteMeta returns route display values', () => {
  const meta = getRouteMeta('M4', '1', null, 'Kadıköy - Sabiha', [], []);
  assert.equal(meta.short, 'M4');
  assert.equal(meta.longName, 'Kadıköy - Sabiha');
});

test('getModelNotice marks metro as fallback with tram model', () => {
  assert.equal(getModelNotice('1'), 'fallback');
});

test('getModelOrientation returns yaw from trip shape', () => {
  const trip = { d: 120, ts: [0, 60], p: [[28.9, 41.0], [29.0, 41.0]] };
  const orientation = getModelOrientation(trip, 30);
  assert.equal(Array.isArray(orientation), true);
  assert.equal(orientation.length, 3);
});
