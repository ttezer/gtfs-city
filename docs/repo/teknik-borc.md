# GTFS City - Teknik Borç Sıralaması

Bu belge, açık teknik borçları önem sırasına göre tutar.
Bug listesi değildir, roadmap de değildir.
Amaç, mimari ve operasyonel yükü görünür kılmak ve zaman içindeki ilerlemeyi ölçmektir.

## Nasıl Okunur

- `Kritik`: geliştirme hızını doğrudan düşüren veya sık hata üretme riski taşıyan borç
- `Yüksek`: ürün davranışını zorlaştıran, ama kısa süre daha taşınabilecek borç
- `Orta`: temizlenmesi faydalı olan, fakat ana darboğaz olmayan borç
- `Düşük`: çoğunlukla okunabilirlik, tutarlılık veya kozmetik bakım borcu

## Güncel Sıralama

| Sıra | Başlık | Öncelik | Durum | Etki | Ana yüzey |
|---|---|---|---|---|---|
| 1 | `src/runtime/script.js` dosyasının hâlâ ana orkestrasyon omurgası olması | Kritik | Azaldı ama açık | En büyük mimari yük hâlâ burada | runtime orkestrasyonu, state bağları, bridge kurulumları |
| 2 | Legacy bridge katmanlarının tam sözleşmeye inmemiş olması | Kritik | Azaldı ama açık | Modül sınırlarını bulanıklaştırıyor | `LegacyMapBridge`, `LegacyServiceBridge`, `LegacyDataBridge` |
| 3 | Dataset state'in çift yüzeyli olması | Kritik | Kapandı | `AppState.*` tek resmi kaynak; global alias'lar ve `syncRuntimeAliases` kaldırıldı | `AppState.*` ve `TRIPS/SHAPES/STOPS/...` |
| 4 | Bağlantı Kareleri ana thread performansı | Kritik | Kapandı | A+B+C uygulandı; precompute Web Worker'a taşındı | `stop-connectivity-utils.js`, `map-manager.js`, `connectivity-worker.js` |
| 5 | State akışının tek tip resmi sözleşmeye tam oturmamış olması | Yüksek | Azaldı ama açık | Yeni refactorlarda yan etki riski taşıyor | selection, session, analytics state |
| 6 | Manager sınırlarının iyileşmiş ama hâlâ geçirgen olması | Yüksek | Açık | `runtime -> manager` bağımlılık yüzeyi geniş | `ui`, `map`, `service`, `planner`, `data` |
| 7 | UTF-8 / metin standardının repo genelinde tam temiz olmaması | Orta | Açık | Güven ve bakım kalitesini düşürüyor | `.md`, yorumlar, UI metinleri |
| 8 | Runtime davranış testlerinin sınırlı kalması | Orta | Açık | Manuel test yükü yüksek | toggle, panel, web demo, map davranışı |
| 9 | `docs/app` yayın kopyasının türetilmiş ikinci ağaç olarak yaşaması | Orta | Azaldı ama açık | Senkron doğruluğu yükü taşıyor | `sync-docs-app`, root kaynaklar |
| 10 | Feature yüzeyinde çekirdek / deneysel ayrımın her yerde net olmaması | Düşük | Açık | Ürün odağını bulanıklaştırıyor | katmanlar, analiz yüzeyleri |
| 11 | CSS ve eski UI kalıntılarının parça parça temizlenmesi | Düşük | Açık | Bakım maliyeti yaratıyor | `style.css`, panel ve overlay stilleri |

## Ne Azaldı

### 1. `script.js` yüzey borcu

Bu alan hâlâ 1 numara.
Ama artık önceki kadar dağınık değil.

`script.js` içinden çıkan ana parçalar:

- `bridge-utils.js`
- `i18n-runtime.js`
- `stop-coverage-controls.js`
- `heatmap-controls.js`
- `bunching-controls.js`
- `isochron-controls.js`
- `playback-controls.js`
- `type-filter-controls.js`
- `section-collapse-controls.js`

Sonuç:

- toggle ve panel orkestrasyonunun büyük kısmı dışarı çıktı
- `script.js` artık daha çok omurga ve bağlayıcı rolünde
- küçük UI değişikliklerinin etki alanı önceye göre küçüldü

### 2. `LegacyUIBridge` borcu

Bu alan belirgin biçimde azaldı.

Ne değişti:

- `activeRoutes` canlı `Set` olarak sızmıyor
- `selectedEntity` snapshot yüzeyden okunuyor
- `activeStopData` getter hattına alındı
- `followTripIdx` getter/setter hattına alındı
- `focusedRoute` ve `selectedRouteDirection` okumaları getter öncelikli hale geldi
- `activeCity`, `activeServiceIds`, `activeServiceOptions` snapshot hattına çekildi
- `ui-manager.js` ve `simulation-engine.js` tarafında getter öncelikli kullanım arttı

Kısa sonuç:

- `LegacyUIBridge` artık önceki kadar ham state taşımıyor
- ama hâlâ fazla geniş

### 3. Feature yüzeyi

Bu alan da azaldı.

Kapanan veya sadeleşen yüzeyler:

- `Durak Yoğunluğu 3D` kaldırıldı
- `Bekleme Süresi 3D` kaldırıldı
- problemli panel/toggle yüzeylerinin önemli kısmı sadeleşti

Bu, ürün çekirdeğini daha net yaptı.

## Ne Değişmedi

### 1. Dataset çift kaynak modeli

Sorun hâlâ aynı:

- `AppState.trips / shapes / stops / stopInfo / stopDeps`
- ve legacy globals `TRIPS / SHAPES / STOPS / STOP_INFO / STOP_DEPS`

aynı veri için iki yüzey oluşturuyor.

Bu çözülmeden veri sahipliği tam temizlenmez.

### 2. `LegacyMapBridge` ve legacy servis/veri bridge'leri

`LegacyUIBridge` küçüldü.
`LegacyServiceBridge`, `LegacyDataBridge` ve `LegacyCityBridge` tarafında da şehir koleksiyonları, yüklenen GTFS payload'ları ve bazı session setter'ları method yüzeyine çekildi.
Ama diğer bridge'ler hâlâ geniş.

Özellikle:

- `LegacyMapBridge` çok fazla runtime bağlamı görüyor
- dataset yazımı ve takvim akışı hâlâ kökten daraltılmış değil

### 3. Runtime davranış testi

Testler temiz.
Ama hâlâ çoğunlukla utility düzeyinde.

Eksik kalan alanlar:

- map ve layer toggle davranışı
- panel görünürlüğü
- demo yüzeyi
- WebGL / map recovery gibi runtime yollar

## Bu Turda Ne Değişti (önceki tur)

- `script.js` içinden küçük ve orta ölçekli UI/runtime yüzeyleri ayrıldı
- `LegacyUIBridge` içindeki selection/session/state sızıntısı önemli ölçüde azaldı
- `ui-manager.js` ve `simulation-engine.js` getter öncelikli hale getirildi
- route-focus ve durak panel seçimi daha tek tip helper hattına bağlandı
- `activeCity`, `activeServiceIds`, `activeServiceOptions`, `selectedEntity`, `activeStopData`, `followTripIdx` gibi alanlar daha güvenli snapshot/getter hattına geçti
- `LegacyCityBridge` ve `LegacyDataBridge` içinde `CITIES`, `hiddenCities`, `uploadedGtfsCities` ve `map` erişimi daha dar method yüzeyine alındı
- `data-manager` içindeki temel runtime veri yükleme hattı `AppState` alanlarını daha çok bridge setter'ları üzerinden günceller hale geldi
- kullanılmayan `StateManager` runtime yükleme zincirinden çıkarıldı ve tasfiye edildi

## Bu Turda Ne Değişti (son tur — Bağlantı Kareleri Performans + Render Fix)

- `getWindowDepartures` sonuçları `WINDOW_DEPS_CACHE` ile önbelleğe alındı; aynı durak/profil için O(N×M) yeniden filtreleme kaldırıldı
- `getConnectivityGridCells` içindeki `getStopInfo(ctx)` döngü öncesine çekildi (her iterasyonda map lookup yapılmıyor)
- `src/runtime/connectivity-worker.js` oluşturuldu; precompute Dijkstra hesabı Web Worker'a taşındı; `file://` protokolünde blob fallback ile Electron uyumluluğu sağlandı
- `createLegacyBridge` refactor'ında (commit `23e06d6`) show* getter'ların extras'a taşınması nedeniyle `ctx.getShowPaths` vb. `undefined` kalıyordu ve `buildStaticLayers()` her zaman 0 katman üretiyordu; tüm 17 show* getter context factory'ye (1. argüman) geri eklendi
- `sync-docs-app.js`'e `connectivity-worker.js` eklendi; `docs/app/` senkronize edildi

## Bu Turda Yapılacaklar (aktif tur — Bağlantı Kareleri Performans)

### Sorun
Büyük beslemelerde (örn. IETT, Kocaeli) Bağlantı Kareleri bölümü dakikalarca yükleniyor ve harita kasıyor. Üç kök neden:

1. `getWindowDepartures` her durak için precompute sırasında defalarca (O(N×M)) yeniden filtreleniyor
2. `getStopInfo(ctx)` `getConnectivityGridCells` içindeki forEach döngüsünde her iterasyonda çağrılıyor
3. `startStopConnectivityPrecompute` `requestIdleCallback` ile ana thread'de çalışıyor; büyük Dijkstra hesapları UI'ı bloke ediyor

### Yapılacaklar

- **A** (`stop-connectivity-utils.js`): Precompute başlamadan tüm durakların zaman penceresi kalkışlarını tek bir `Map` olarak hesapla; `getWindowDepartures` bu cache'i kullansın
- **B** (`map-manager.js`): `getConnectivityGridCells` içinde `getStopInfo(ctx)` çağrısını döngü öncesine çek
- **C** (`src/runtime/`): Connectivity precompute hesabını ayrı bir Web Worker'a (`connectivity-worker.js`) taşı; `importScripts` ile `stop-connectivity-utils.js` yüklesin; tamamlandığında `postMessage` ile ana thread'e sonuç döndürsün; `script.js` worker'ı yönetsin

### Beklenen Etki
- A+B: hesap 3–5× hızlanır
- C: ana thread kasması tamamen biter; progress event'leri hâlâ çalışır

---

## Bu Turda Ne Değişti (son tur — script.js modülarizasyonu)

- `cinematic-controls.js` oluşturuldu: `getCinematicWaypoints` taşındı (−52 satır)
- `adjacency-builder.js` oluşturuldu: `buildAdjacencyList` + yürüme bağlantısı taşındı (−70 satır)
- `connectivity-grid-controls.js` oluşturuldu: legend + camera fonksiyonları taşındı; `cameraRestore`/`styleRestore` state modüle alındı (−74 satır)
- `capture-controls.js` oluşturuldu: ekran görüntüsü bloğu taşındı; `CAPTURE_PRESET_CLASSES` + `activeCapturePreset` modüle alındı (−164 satır)
- Vehicle/stop icon fonksiyonları `map-manager.js`'e taşındı; 3 bridge prop kaldırıldı (−73 satır)
- GTFS parse delegate wrapper'ları (`parseCsvRows` vb.) kaldırıldı; `LegacyDataBridge` doğrudan `window.GtfsUtils` kullanıyor (−11 satır)
- Bağlantı Kareleri rengi viewport normalizasyonundan bağımsız hale getirildi (zoom'da renk değişmiyordu)
- `script.js` bu turda 3169 → **2725** satıra indi (−444 satır)

## Bu Turda Ne Değişmedi

- ana mimari yük hâlâ `src/runtime/script.js` üzerinde (~2725 satır)
- `LegacyMapBridge` Faz 3 açık (QUALITY/TYPE_META ham erişim)
- `LegacyDataBridge` tam daraltılmadı
- encoding temizliği tamamlanmış değil
- runtime davranış testleri hâlâ sınırlı

## Sonraki En Doğru Sıra

1. Yeni özellik geliştirme (spreading animasyonu, hız çizgisi, vb.)
2. `LegacyMapBridge` Faz 3: QUALITY/TYPE_META için getter ekle
3. `LegacyDataBridge` yazma yüzeyini daralt
4. encoding / metin temizliğini dosya dosya tamamla
5. runtime davranış testlerini kritik akışlar için artır

## Kısa Hüküm

Yüzey borcu ciddi biçimde azaldı.
Çekirdek borç ise artık daha net görünür hale geldi.

Dataset tek kaynak sorunu kapandı. Kalan yük: bridge yüzey daralması ve `script.js` blok ayrıştırması.

`bridge getter standardizasyonu büyük ölçüde tamamlandı, kalan yük LegacyMapBridge Faz 3 ve script.js blok ayrıştırmasıdır`
