# gtfs-city

GTFS verisini 2D ve 3D harita üzerinde simüle eden, analiz katmanları ve GTFS yükleme akışı içeren Electron tabanlı toplu taşıma uygulaması.

## Ne Yapar?

- hatları ve durakları harita üzerinde gösterir
- araçları zaman tabanlı olarak simüle eder
- 2D ve 3D araç gösterimi sunar
- headway, bunching, bekleme ve yoğunluk katmanları üretir
- şehir ve servis takvimi yönetir
- GTFS ZIP yükleyip runtime veri setini değiştirebilir

## Kurulum

Gereksinimler:

- Node.js
- npm

Kurulum:

```bash
npm install
```

## Çalıştırma

Geliştirme / masaüstü uygulama:

```bash
npm start
```

Ek komutlar:

```bash
npm test
npm run build:win
npm run build:mac
npm run build:linux
```

## Kullanım

Temel akış:

1. Uygulamayı aç.
2. Landing ekrandan simülasyonu başlat.
3. Hat, durak veya araca tıklayarak detay panellerini aç.
4. Gerekirse şehir seç veya GTFS ZIP yükle.
5. Analiz katmanlarını açıp kapatarak headway, bekleme ve yoğunluğu incele.

## Veri Kaynakları

Başlangıç preload verileri:

- `trips_data.js`
- `shapes_data.js`
- `lookup_data.js`

Ek kaynaklar:

- `Data\*.zip` builtin şehir paketleri
- kullanıcı tarafından yüklenen GTFS ZIP dosyaları

İstanbul preload verisi gerektiğinde şu script ile yeniden üretilebilir:

```bash
node scripts/regenerate-istanbul-preload.js
```

## Paketleme

Windows dizin çıktısı:

```bash
npm run build:win -- --dir
```

## Proje Yapısı

Ana dosyalar:

- `index.html` — arayüz iskeleti
- `script.js` — orkestrasyon ve köprü katmanı
- `map-manager.js` — harita katmanları
- `ui-manager.js` — panel ve etkileşim yönetimi
- `simulation-engine.js` — simülasyon döngüsü
- `data-manager.js` — GTFS veri yükleme ve runtime apply
- `city-manager.js` — şehir yönetimi
- `service-manager.js` — servis/takvim yönetimi
- `planner-manager.js` — rota planlama ve izokron
- `electron/main.js` — Electron ana süreç
- `electron/preload.js` — IPC köprüsü

## Belgeler

- `isplani.md` — canlı plan, fazlar ve geçmiş kayıtlar
- `mimari.md` — modüller, veri akışı ve sistem haritası
- `kontrol.md` — geliştirme kuralları ve repo çalışma prensipleri

## Notlar

- Uygulama preload veri ile hızlı açılır, ancak runtime GTFS yükleme ile veri seti değiştirilebilir.
- Büyük preload dosyaları repoda tutulur; yeniden üretim için generator script kullanılır.
- Teknik değişikliklerden sonra minimum doğrulama olarak test ve gerekirse build alınmalıdır.
