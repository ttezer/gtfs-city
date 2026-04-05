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
| 4 | State akışının tek tip resmi sözleşmeye tam oturmamış olması | Yüksek | Azaldı ama açık | Yeni refactorlarda yan etki riski taşıyor | selection, session, analytics state |
| 5 | Manager sınırlarının iyileşmiş ama hâlâ geçirgen olması | Yüksek | Açık | `runtime -> manager` bağımlılık yüzeyi geniş | `ui`, `map`, `service`, `planner`, `data` |
| 6 | UTF-8 / metin standardının repo genelinde tam temiz olmaması | Orta | Açık | Güven ve bakım kalitesini düşürüyor | `.md`, yorumlar, UI metinleri |
| 7 | Runtime davranış testlerinin sınırlı kalması | Orta | Açık | Manuel test yükü yüksek | toggle, panel, web demo, map davranışı |
| 8 | `docs/app` yayın kopyasının türetilmiş ikinci ağaç olarak yaşaması | Orta | Azaldı ama açık | Senkron doğruluğu yükü taşıyor | `sync-docs-app`, root kaynaklar |
| 9 | Feature yüzeyinde çekirdek / deneysel ayrımın her yerde net olmaması | Düşük | Açık | Ürün odağını bulanıklaştırıyor | katmanlar, analiz yüzeyleri |
| 10 | CSS ve eski UI kalıntılarının parça parça temizlenmesi | Düşük | Açık | Bakım maliyeti yaratıyor | `style.css`, panel ve overlay stilleri |

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

## Bu Turda Ne Değişti

- `script.js` içinden küçük ve orta ölçekli UI/runtime yüzeyleri ayrıldı
- `LegacyUIBridge` içindeki selection/session/state sızıntısı önemli ölçüde azaldı
- `ui-manager.js` ve `simulation-engine.js` getter öncelikli hale getirildi
- route-focus ve durak panel seçimi daha tek tip helper hattına bağlandı
- `activeCity`, `activeServiceIds`, `activeServiceOptions`, `selectedEntity`, `activeStopData`, `followTripIdx` gibi alanlar daha güvenli snapshot/getter hattına geçti
- `LegacyCityBridge` ve `LegacyDataBridge` içinde `CITIES`, `hiddenCities`, `uploadedGtfsCities` ve `map` erişimi daha dar method yüzeyine alındı
- `data-manager` içindeki temel runtime veri yükleme hattı `AppState` alanlarını daha çok bridge setter'ları üzerinden günceller hale geldi
- kullanılmayan `StateManager` runtime yükleme zincirinden çıkarıldı ve tasfiye edildi

## Bu Turda Ne Değişmedi

- ana mimari yük hâlâ `src/runtime/script.js` üzerinde
- dataset için tek resmi kaynak belirlenmiş değil
- `LegacyMapBridge` ve `LegacyServiceBridge` hâlâ tam daraltılmış değil
- encoding temizliği tamamlanmış değil
- runtime davranış testleri hâlâ sınırlı

## Sonraki En Doğru Sıra

1. dataset state için tek kaynak yönünü belirle
2. `LegacyMapBridge` yüzeyini daralt
3. `LegacyServiceBridge` ve `LegacyDataBridge` yazma yüzeyini daralt
4. `script.js` üzerinde kalan ana orkestrasyon bloklarını daha sert ayır
5. encoding / metin temizliğini dosya dosya tamamla
6. runtime davranış testlerini kritik akışlar için artır

## Kısa Hüküm

Yüzey borcu ciddi biçimde azaldı.
Çekirdek borç ise artık daha net görünür hale geldi.

Bugünkü durumda en doğru cümle şu:

`küçük ve orta refactor borcu büyük ölçüde temizlendi, kalan yük artık doğrudan çekirdek mimari borçtur`
