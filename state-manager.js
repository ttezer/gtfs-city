/**
 * ═══════════════════════════════════════════════════════════
 * state-manager.js — Merkezi Uygulama Durum Yönetimi
 * ═══════════════════════════════════════════════════════════
 * Bu modül, uygulamadaki tüm global değişkenleri tek bir merkezi
 * yapı altında toplar ve değişimleri modüllere bildirir.
 */

window.StateManager = (function() {
    // 1. Dinleyici Listesi (Callback'ler)
    const listeners = [];

    // 2. Merkezi State Nesnesi
    const state = {
        // Simülasyon State
        sim: {
            time: 6 * 3600,
            paused: false,
            speed: 60,
            speedIdx: 3,
            isReplay: false,
            replayLoop: false,
            lastTs: null
        },
        // UI Toggle/Görünürlük State
        ui: {
            showAnim: true,
            showPaths: true,
            showDensity: true,
            showStops: true,
            showHeatmap: false,
            showTrail: true,
            show3D: false,
            showHeadway: false,
            showBunching: false,
            showWaiting: false,
            showIsochron: false,
            currentMapStyle: 'auto',
            typeFilter: 'all',
            isCinematic: false
        },
        // Seçim ve Odak State
        selection: {
            focusedRoute: null,
            activeRoutes: new Set(),
            followTripIdx: null,
            selectedTripIdx: null,
            selectedEntity: null,
            panelPauseOwner: null,
            fromStopId: null,
            toStopId: null,
            routeHighlightPath: null
        },
        // Analitik ve Geçici State
        analytics: {
            heatmapHour: 8,
            heatmapFollowSim: false,
            bunchingThreshold: 200,
            isochronData: null,
            isochronOriginSid: null
        }
    };

    /**
     * State güncelleme fonksiyonu.
     * Örn: update('ui.showAnim', false)
     */
    function update(path, value) {
        const parts = path.split('.');
        let current = state;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }

        const lastPart = parts[parts.length - 1];
        const oldValue = current[lastPart];

        if (oldValue !== value) {
            current[lastPart] = value;
            notify(path, value, oldValue);

            // Geriye dönük uyumluluk için global değişkenleri de senkronize et
            syncToLegacyGlobals(lastPart, value);
        }
    }

    /**
     * Değişiklikleri dinleyen modüllere bildirir.
     */
    function subscribe(callback) {
        listeners.push(callback);
    }

    function notify(path, newValue, oldValue) {
        listeners.forEach(cb => {
            try {
                cb(path, newValue, oldValue);
            } catch (e) {
                console.error('[StateManager] Listener error:', e);
            }
        });
    }

    /**
     * Refaktör süresince script.js içindeki eski global değişkenlerin
     * kırılmaması için geçici senkronizasyon sağlar.
     */
    function syncToLegacyGlobals(key, value) {
        if (Object.prototype.hasOwnProperty.call(window, key)) {
            window[key] = value;
        }
    }

    return {
        state,
        update,
        subscribe
    };
})();
