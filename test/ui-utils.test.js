const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStopTooltipHtml,
  buildRouteTooltipHtml,
  findNearestStopName,
  buildVehiclePanelState,
} = require('../ui-utils');

test('buildStopTooltipHtml includes stop name and code', () => {
  const html = buildStopTooltipHtml({ name: 'Ayrılık Çeşmesi', code: '1234' });
  assert.match(html, /Ayrılık Çeşmesi/);
  assert.match(html, /1234/);
});

test('buildRouteTooltipHtml includes short and long route names', () => {
  const html = buildRouteTooltipHtml({ short: 'M4', longName: 'Kadıköy - Sabiha' }, { i: '🚇', n: 'Metro' }, (text) => text);
  assert.match(html, /M4/);
  assert.match(html, /Kadıköy - Sabiha/);
});

test('findNearestStopName returns closest stop label', () => {
  const stopInfo = {
    s1: [29.0, 41.0, 'Bir'],
    s2: [29.5, 41.5, 'İki'],
  };
  const name = findNearestStopName([29.01, 41.01], stopInfo, () => 1, (text) => text);
  assert.equal(name, 'Bir');
});

test('buildVehiclePanelState returns formatted panel model', () => {
  const trip = {
    s: 'M4',
    t: '1',
    c: [10, 20, 30],
    ln: 'Kadıköy - Sabiha',
    d: 120,
    ts: [0, 60],
    p: [[29.0, 41.0], [29.1, 41.1]],
    st: [{ sid: 's1', off: 0 }, { sid: 's1', off: 60 }],
  };
  const state = buildVehiclePanelState({
    trip,
    selectedTripIdx: 2,
    simTime: 30,
    stopInfo: { s1: [29.0, 41.0, 'Bir'] },
    typeMeta: { '1': { i: '🚇', n: 'Metro' } },
    followTripIdx: 2,
    getRouteMeta: () => ({ short: 'M4', longName: 'Kadıköy - Sabiha', type: '1', color: [10, 20, 30] }),
    calcSpeed: () => 42,
    calcHeadway: () => '180 m',
    getNextStop: () => ({ name: 'Bir', eta: '2 dk' }),
    haversineM: () => 0,
    displayText: (text) => text,
  });

  assert.equal(state.title, 'M4');
  assert.equal(state.subtitle, 'Kadıköy - Sabiha');
  assert.equal(state.followLabel, '📍 Takibi Bırak');
  assert.equal(state.stops.length, 2);
});

test('buildVehiclePanelState safely handles zero duration and missing next stop', () => {
  const trip = {
    s: 'M4',
    t: '1',
    c: [10, 20, 30],
    ln: 'Kadıköy - Sabiha',
    d: 0,
    ts: [0],
    p: [[29.0, 41.0]],
  };
  const state = buildVehiclePanelState({
    trip,
    selectedTripIdx: 1,
    simTime: 30,
    stopInfo: {},
    typeMeta: { '1': { i: '🚇', n: 'Metro' } },
    followTripIdx: null,
    getRouteMeta: () => ({ short: 'M4', longName: 'Kadıköy - Sabiha', type: '1', color: [10, 20, 30] }),
    calcSpeed: () => 0,
    calcHeadway: () => '-',
    getNextStop: () => null,
    haversineM: () => 0,
    displayText: (text) => text,
  });

  assert.equal(state.progress, '0%');
  assert.equal(state.nextStopName, '-');
  assert.equal(state.eta, '-');
});
