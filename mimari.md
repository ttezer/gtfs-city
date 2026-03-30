# gtfs-city — Mimari Özeti

Bu doküman, uygulamanın güncel modüler yapısını, veri akışını ve çalışma modelini özetler.

## 1. Sistem Özeti

gtfs-city, GTFS verisini runtime ZIP yükleme üzerinden alıp harita, simülasyon, panel ve analiz katmanlarına dağıtan Electron tabanlı bir masaüstü uygulamasıdır.

Ana akış:

1. Başlangıçta preload veriler (`trips_data.js`, `shapes_data.js`, `lookup_data.js`) yüklenir.
2. Uygulama modülleri başlatılır ve state oluşturulur.
3. Harita + Deck.gl katmanları kurulur.
4. Simülasyon zamanı ilerledikçe araç konumları, paneller ve analiz katmanları güncellenir.
5. İstenirse builtin veya kullanıcı GTFS ZIP verisi parse edilip mevcut runtime veri seti değiştirilir.

## 2. Modül Yapısı

### Giriş ve orkestrasyon

- `index.html`  
  Arayüz iskeleti ve script yükleme sırası.
- `bootstrap-manager.js`  
  Açılış yükleme akışı, preload script yükleme ve landing hazırlığı.
- `app-manager.js`  
  Ana ekran geçişleri, landing görünürlüğü ve bazı uygulama seviyesi UI akışları.
- `script.js`  
  Orkestrasyon, global state, legacy bridge, ortak yardımcılar ve modüller arası bağlayıcı katman.

### Veri ve şehir yönetimi

- `data-manager.js`  
  GTFS ZIP okuma, validasyon, runtime apply, preload/runtime normalizasyonu.
- `city-manager.js`  
  Şehir seçimi, builtin şehir yükleme, upload şehirleri ve görünürlük akışı.
- `service-manager.js`  
  Servis takvimi, tarih uyarlama, servis seçimi ve takvim özeti.
- `planner-manager.js`  
  Rota planlama, adjacency tabanlı arama ve izokron yardımcıları.

### Harita, UI ve simülasyon

- `map-manager.js`  
  Deck.gl katman üretimi, static/dynamic layer cache, 2D/3D araç katmanları.
- `ui-manager.js`  
  Tooltip, hat paneli, araç paneli, durak paneli, route listeleri, stringline ve seçim akışları.
- `simulation-engine.js`  
  Animasyon döngüsü, simülasyon saati, replay, performans ve zaman bağlı güncellemeler.

### Yardımcı modüller

- `sim-utils.js`  
  Araç konumu, zaman ofseti, trip progress gibi simülasyon matematiği.
- `analytics-utils.js`  
  Headway, bunching, bekleme, sonraki durak ve analiz hesapları.
- `ui-utils.js`  
  Panel state üretimi ve UI format yardımcıları.
- `render-utils.js`  
  Renk, model seçimi, yön/orientation ve metin normalizasyon yardımcıları.
- `gtfs-utils.js`  
  GTFS parse, map üretimi ve runtime veri oluşturma yardımcıları.
- `gtfs-worker.js`  
  Ağır GTFS işleme yükünü ana thread dışına taşıyan worker.
- `gtfs-validator.js`  
  Yüklenen GTFS paketlerinin temel doğrulaması.
- `config.js`  
  Tür meta bilgileri, headway eşikleri ve harita ayarları.

### Electron katmanı

- `electron/main.js`  
  Uygulama penceresi, menü ve IPC handler’ları.
- `electron/preload.js`  
  Renderer ile Electron arasında güvenli köprü.

## 3. Veri Modeli

### Preload veri seti

Başlangıçta aşağıdaki dosyalar yüklenir:

- `trips_data.js`
- `shapes_data.js`
- `lookup_data.js`

Bu dosyalar uygulamanın ilk açılışta hemen veri göstermesini sağlar. İstanbul preload verisi gerektiğinde `scripts/regenerate-istanbul-preload.js` ile `Data\İstanbul.zip` kaynağından yeniden üretilir.

### Runtime veri seti

GTFS ZIP yüklendiğinde veya builtin şehir ZIP’i parse edildiğinde `data-manager.js` şu ana yapıları üretir:

- `TRIPS`
- `SHAPES`
- `STOPS`
- `STOP_INFO`
- `STOP_DEPS`
- `HOURLY_COUNTS`
- `HOURLY_HEAT`
- `ADJ`

Bu veri `AppState` içine yazılır, alias’lar senkronize edilir ve harita/panel katmanları yeniden kurulur.

## 4. Veri Akışı

### 4.1 Başlangıç akışı

1. `bootstrap-manager.js` preload dosyalarını yükler.
2. `script.js` `AppState` ve bridge yapısını kurar.
3. `map-manager.js` katmanları üretmeye hazır hale gelir.
4. `simulation-engine.js` simülasyon döngüsünü başlatır.
5. `ui-manager.js` etkileşim ve panelleri yönetir.

### 4.2 GTFS yükleme akışı

1. ZIP dosyası `data-manager.js` tarafından okunur.
2. `gtfs-validator.js` temel kontrol yapar.
3. `gtfs-utils.js` ve gerekirse `gtfs-worker.js` parse ve runtime veri üretir.
4. Metinler normalize edilir, trip zamanları patch edilir, stop sequence bilgileri tamamlanır.
5. `AppState` güncellenir.
6. Route/stop listeleri, density, adjacency ve harita katmanları yenilenir.

### 4.3 Etkileşim akışı

- Harita hover/click olayları `script.js` üzerinden `ui-manager.js` tarafına gider.
- Seçim sonrası:
  - araç paneli
  - hat paneli
  - durak paneli
  - rota planlama/izokron
  ilgili manager ve util zinciriyle hesaplanır.

## 5. Katman Mantığı

`map-manager.js` iki ana grup katman üretir:

- Statik katmanlar  
  Hat çizgileri, duraklar, density, heatmap, izokron, route highlight
- Dinamik katmanlar  
  Araç izleri, araç ikonları, 3D modeller, headway çizgileri, bunching alarmları, bekleme sütunları

Static layer üretimi cache ile korunur; dinamik katmanlar simülasyon zamanına göre daha sık güncellenir.

## 6. State ve Bridge Yapısı

Uygulamanın merkezi state’i `script.js` içindeki `AppState` ve global seçim/toggle değişkenleridir.

Bridge nesneleri (`Legacy*Bridge`) modüllere kontrollü erişim sağlar:

- map bridge
- ui bridge
- simulation bridge
- data bridge
- city bridge
- service bridge

Bu yapı eski global akış ile yeni modüler yapının birlikte çalışmasını sağlar.

## 7. Güncel Mimari Notları

- Büyük monolit parçalama fazı tamamlanmıştır.
- `script.js` hâlâ orkestrasyon ve köprü katmanı içerir; ancak ana iş mantığı manager dosyalarına taşınmıştır.
- Preload ve runtime veri yolları birlikte yaşamaktadır; preload sadece hızlı açılış için vardır.
- Doküman ve uygulama arasında çelişki olduğunda güncel davranış için kod ve `isplani.md` esas alınır.
