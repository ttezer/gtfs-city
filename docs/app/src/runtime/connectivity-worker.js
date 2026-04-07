/**
 * Connectivity Worker
 *
 * Bağlantı Kareleri precompute hesabını ana thread'den ayırır.
 * stop-connectivity-utils.js'i yükler ve tüm duraklar için skor hesabını
 * arka planda çalıştırır; ilerleme ve sonucu postMessage ile ana thread'e iletir.
 */

if (!self.StopConnectivityUtils) {
  try {
    importScripts('../utils/stop-connectivity-utils.js');
  } catch (_) {
    // Blob modunda kaynak zaten birleştirilmiş — importScripts gerekmez.
  }
}

// stop-connectivity-utils.js stop-connectivity-progress custom event'i dispatch eder.
// Worker'da bu event'leri yakalayıp postMessage ile ana thread'e iletiyoruz.
self.addEventListener('stop-connectivity-progress', (event) => {
  self.postMessage({ type: 'PROGRESS', detail: event.detail });
});

self.onmessage = function (event) {
  const msg = event.data || {};
  if (msg.type !== 'START') return;

  const utils = self.StopConnectivityUtils;
  if (!utils) {
    self.postMessage({ type: 'ERROR', error: 'StopConnectivityUtils yüklenemedi' });
    return;
  }

  const { trips, stopInfo, stopDeps, adj, feed_id, options } = msg;

  let _snapshot = null;

  const ctx = {
    activeCityId: feed_id || 'worker_feed',
    getTrips: () => trips,
    getStopInfo: () => stopInfo,
    getStopDeps: () => stopDeps,
    getAdj: () => adj,
    getStopConnectivityScores: () => _snapshot,
    setStopConnectivityScores: (value) => { _snapshot = value; },
  };

  utils.startStopConnectivityPrecompute(ctx, {
    ...(options || {}),
    onComplete: (snapshot) => {
      self.postMessage({ type: 'DONE', snapshot });
    },
  });
};
