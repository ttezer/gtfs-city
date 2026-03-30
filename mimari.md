# GTFS City — Mimari

## Sistem Özeti

GTFS City, GTFS ZIP verisini çalışma anında parse edip harita, panel ve analiz katmanlarına dağıtan Electron tabanlı masaüstü uygulamadır.

Temel ilkeler:

- tek aktif GTFS veri seti
- upload-first başlangıç akışı
- preload başlangıç bağımlılığı yok
- ortak runtime state + modüler manager yapısı

## Ana Akış

1. Kullanıcı landing ekranda GTFS ZIP dosyası seçer veya HTTPS link verir.
2. `data-manager.js` ZIP içeriğini doğrular ve parse eder.
3. `gtfs-utils.js` / `gtfs-worker.js` runtime veri setini üretir.
4. Runtime veri `AppState` ve ilgili alias'lara yazılır.
5. `map-manager.js`, `ui-manager.js`, `simulation-engine.js` güncel veriyle çalışır.

## Modüller

### Çekirdek

- `script.js` — uygulama orkestrasyonu, ortak state, bridge yüzeyi
- `state-manager.js` — state yardımcıları
- `config.js` — sabitler ve tip/meta bilgileri

### Veri

- `data-manager.js` — ZIP okuma, validasyon, runtime apply, upload/link akışı
- `gtfs-utils.js` — GTFS parse ve runtime yapı üretimi
- `gtfs-worker.js` — ağır parse işlerini worker'a taşıyan katman
- `gtfs-validator.js` — temel veri doğrulama
- `city-manager.js` — aktif dataset kartı ve görünürlük akışı
- `service-manager.js` — takvim, tarih ve servis filtreleme

### Görselleştirme ve UI

- `map-manager.js` — Deck.gl katmanları, route/type/focus filtreleri
- `ui-manager.js` — route, stop ve vehicle drawer/panel yönetimi
- `app-manager.js` — landing, genel ekran akışları, logo/başlangıç görünümü
- `planner-manager.js` — nasıl giderim ve izokron akışı

### Simülasyon ve Analiz

- `simulation-engine.js` — simülasyon saati, replay, render tick
- `sim-utils.js` — araç konumu ve zaman hesapları
- `analytics-utils.js` — headway, bunching, bekleme, yoğunluk hesapları
- `render-utils.js` — renk, metin ve model yardımcıları
- `ui-utils.js` — panel state ve yardımcı formatlama

### Electron

- `electron/main.js` — pencere, IPC, güvenli HTTPS GTFS indirme
- `electron/preload.js` — renderer tarafına açılan güvenli API

## Veri Modeli

Runtime veri setinin ana parçaları:

- `TRIPS`
- `SHAPES`
- `STOPS`
- `STOP_INFO`
- `STOP_DEPS`
- `HOURLY_COUNTS`
- `HOURLY_HEAT`
- `ADJ`

Bu veri seti `AppState` üzerinde tutulur ve filtreler/katmanlar aynı kaynağı kullanır.

## Kilit Kararlar

- Aynı anda yalnızca tek yüklenmiş GTFS veri seti tutulur.
- Başlangıçta otomatik yerleşik şehir yüklenmez.
- GTFS yükleme için tek progress yüzeyi kullanılır.
- Worker tabanlı parse korunur.
- Route panel, stop panel ve odaklı hat davranışı mevcut haliyle temel kabul edilir.

## GitHub Pages Notu

Mevcut repo ana ürün olarak Electron uygulamasıdır. GitHub Pages için doğrudan tam uygulama değil, ayrı bir web vitrin veya sade demo yaklaşımı daha uygundur.
