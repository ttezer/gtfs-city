/**
 * 3D GTFS - Merkezi Yapılandırma Dosyası
 * Tüm sihirli sayılar, renkler ve eşik değerleri burada toplanır.
 */
const CONFIG = {
  HEADWAY: {
    minPairDistanceM: 10,
    maxPairDistanceM: 15000,
    transitionDistanceM: 3000,
    minGapSeconds: 60,
    maxGapSeconds: 7200,
    bunchingThreshold: 200,
  },

  TYPE_META: {
    '0': { n: 'Tramvay',   c: '#E74C3C', rgb: [231, 76, 60],   i: '🚋', w: 4 },
    '1': { n: 'Metro',     c: '#8E44AD', rgb: [142, 68, 173],  i: '🚇', w: 5 },
    '2': { n: 'Tren',      c: '#2980B9', rgb: [41, 128, 185],  i: '🚆', w: 5 },
    '3': { n: 'Otobüs',    c: '#27AE60', rgb: [39, 174, 96],   i: '🚌', w: 3 },
    '4': { n: 'Feribot',   c: '#1ABC9C', rgb: [26, 188, 156],  i: '⛴️', w: 3 },
    '5': { n: 'Teleferik', c: '#F39C12', rgb: [243, 156, 18],  i: '🚡', w: 3 },
    '6': { n: 'Gondol',    c: '#E67E22', rgb: [230, 126, 34],  i: '🚡', w: 3 },
    '7': { n: 'Funicular', c: '#D35400', rgb: [211, 84, 0],    i: '🚠', w: 3 },
    '9': { n: 'Minibüs',   c: '#7F8C8D', rgb: [127, 140, 141], i: '🚐', w: 2 },
    '10': { n: 'Dolmuş',   c: '#95A5A6', rgb: [149, 165, 166], i: '🚖', w: 2 },
  },

  MAP: {
    DEFAULT_CENTER: [28.9784, 41.0082],
    DEFAULT_ZOOM: 11.5,
    DEFAULT_PITCH: 52,
    DEFAULT_BEARING: -14
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
