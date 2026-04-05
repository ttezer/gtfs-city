# GTFS City - Mimari

## Sistem Özeti

GTFS City, GTFS ZIP verisini çalışma anında parse edip harita, panel ve analiz katmanlarına dağıtan bir uygulamadır.

Desteklenen yüzeyler:

- Electron masaüstü
- GitHub Pages web demo

Temel ilkeler:

- tek aktif GTFS veri seti
- upload-first başlangıç akışı
- worker tabanlı parse
- ortak runtime state + modüler manager yapısı
- desktop ve web için ortak çekirdek, platforma özel ince farklar

## Ana Akış

1. Kullanıcı GTFS ZIP dosyası seçer veya uygun yüzeyde link verir.
2. `data-manager.js` içeriği doğrular ve parse akışına sokar.
3. `gtfs-utils.js` / `gtfs-worker.js` runtime veri setini üretir.
4. Runtime veri `AppState` ve ilgili bridge/context yapılarına yazılır.
5. `map-manager.js`, `ui-manager.js`, `simulation-engine.js` ve diğer manager'lar bu veriyle çalışır.

## Modül Sorumlulukları

| Modül | Sorumluluk | Not |
|---|---|---|
| `script.js` | orkestrasyon, ortak state, bridge yüzeyi | gereksiz büyütülmemeli |
| `bridge-utils.js` | bridge kurma ve ortak normalize yardımcıları | runtime yardımcı yüzeyi |
| `i18n-runtime.js` | dil sozlugu, dil secimi, statik metin uygulama | script.js'ten ayrilan ilk buyuk runtime parcasi |
| `stop-coverage-controls.js` | durak kapsama paneli ve toggle kontrol wiring'i | script.js'ten ayrilan toggle panel parcasi |
| `heatmap-controls.js` | heatmap paneli ve saat/takip kontrol wiring'i | script.js'ten ayrilan toggle panel parcasi |
| `bunching-controls.js` | bunching toggle ve esik kontrol wiring'i | script.js'ten ayrilan toggle panel parcasi |
| `section-collapse-controls.js` | katlanabilir bolum basliklari icin UI wiring | script.js'ten ayrilan kucuk DOM orkestrasyonu |
| `data-manager.js` | GTFS yükleme, doğrulama, runtime apply | veri giriş kapısı |
| `gtfs-utils.js` | parse ve runtime veri üretimi | veri çekirdeği |
| `gtfs-worker.js` | worker parse akışı | performans amaçlı |
| `service-manager.js` | servis takvimi ve tarih bağlamı | takvim sahibi |
| `city-manager.js` | aktif veri seti kartı ve görünürlük | veri seti yüzeyi |
| `map-manager.js` | katmanlar ve render | çizim sahibi |
| `ui-manager.js` | panel, liste ve etkileşim | UI sahibi |
| `planner-manager.js` | rota, isochron ve erişim hesapları | analiz sahibi |
| `simulation-engine.js` | sim saati ve replay | zaman sahibi |
| `analytics-utils.js` | headway ve bunching | hesap yardımcıları |
| `sim-utils.js` | araç konumu ve zaman yardımcıları | sim yardımcıları |
| `render-utils.js` | renk, metin ve görsel yardımcılar | sunum yardımcıları |
| `app-manager.js` | landing ve genel ekran akışı | kabuk |

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

Bu veri seti `AppState` üzerinde tutulur ve katmanlar aynı kaynağı kullanır.

## State Sahiplik Tabanı

Refactor sırası `state -> bridge -> script.js` olarak ilerleyecekse, önce sahiplik zemini net olmalıdır.

İlk ayrım:

- `dataset state`: GTFS yükü ve ondan türeyen ana veri
- `simulation state`: zaman, hız, replay ve animasyon çevrimi
- `ui state`: görünürlük, toggle, görünüm modu
- `selection state`: odak, seçim ve kullanıcı bağlamı
- `analytics state`: hesap sonucu olan ve gerektiğinde yeniden üretilebilen geçici veri
- `session state`: aktif şehir, servis, yükleme ve geçici çalışma bağlamı

### Başlangıç Sahiplik Tablosu

| Alan | Kategori | Mevcut sahip | Ana okuyanlar | Ana yazanlar | Not |
|---|---|---|---|---|---|
| `AppState.trips / shapes / stops / stopInfo / stopDeps` | dataset | `AppState` | map, ui, simulation, planner, service | data-manager | tek kaynak olmaya en yakın alan |
| `TRIPS / SHAPES / STOPS / STOP_INFO / STOP_DEPS` | dataset yansıması | legacy global | runtime ve bridge yüzeyi | script.js senkronu | aynı verinin ikinci yüzeyi |
| `AppState.hourlyCounts / hourlyHeat / adj` | analytics | `AppState` | map, runtime, planner | data-manager + runtime | `adj` türetilmiş veri olduğu için ayrı dikkat ister |
| `simTime / simPaused / speedIdx / simSpeed / lastTs` | simulation | script.js local state | simulation-engine, ui, map | script.js + simulation-engine | henüz ortak state yerine local tutuluyor |
| `showAnim / showPaths / showStops / showHeatmap / showTrail / showHeadway / showBunching / showIsochron` | ui | script.js local state | map, ui, simulation bridge | toggle bağları + reset akışları | yerel runtime UI state |
| `currentMapStyle / typeFilter` | ui | script.js local state | map, ui | script.js + UI etkileşimleri | çekirdek UI state ama tek merkezde değil |
| `showConnectivityGrid / connectivityGridSelectedCell / stop coverage ayarları` | ui | script.js local state | map, runtime legend, ui | toggle bağları + event akışı | henüz özel-case state olarak yaşıyor |
| `focusedRoute / selectedRouteDirection / activeRoutes` | selection | script.js local state | map, ui | ui-manager + runtime reset | `activeRoutes` mutable `Set` olduğu için riskli |
| `selectedTripIdx / followTripIdx / selectedEntity / panelPauseOwner` | selection | script.js local state | ui, map, simulation | ui-manager + runtime kontrolleri | panel davranışı ile sıkı bağlı |
| `activeCity / activeServiceId / activeServiceIds / activeServiceOptions` | session | script.js local state | service, city, data, ui | city-manager + service-manager + data-manager | servis akışı güçlü ama state merkezi değil |
| `uploadedGtfsCities / hiddenCities` | session | script.js local state | city, data | data-manager + city-manager | veri seti yönetimi için ayrı sahiplik ister |
| `AppState.stopNames` ve `stopNames` | dataset türevi / selection desteği | iki ayrı yüzey | ui | data-manager + script.js | açık duplicate state |
| `_isochronData / _isochronOriginSid` | analytics / selection | script.js local state | map, planner | planner bridge | analitik çıktı ama session gibi taşınıyor |
| `AppState.stopConnectivityScores` | analytics | `AppState` | map, runtime legend | runtime warmup + cache yükleme | hesap sonucu olduğu için türetilmiş state |
| `bunchingThreshold / bunchingEvents` | analytics | script.js local state | simulation, map, ui | runtime + simulation | hesap ve görünüm beraber taşınıyor |
### Açık State Çatışmaları

- `AppState` ile legacy globals aynı dataset'i iki ayrı yüzeyde taşıyor.
- `AppState.stopNames` ve yerel `stopNames` aynı bilginin iki kopyası.
- `activeRoutes` gibi mutable koleksiyonlar bridge üzerinden doğrudan dolaşıyor.

### İlk Fazda Dokunulacak En Küçük Alan

İlk fazın amacı bütün state'i taşımak değil, sahiplik zeminini netlemektir.

İlk güvenli hedefler:

1. runtime local state ile `AppState` arasında resmi sahiplik yönünü netleştirmek
2. `AppState.stopNames` ile yerel `stopNames` çiftini tek kaynağa indirmek
3. `currentMapStyle`, `typeFilter` ve temel UI toggle alanlarını tek kategori olarak belgelemek
4. `activeRoutes`, `focusedRoute`, `selectedRouteDirection` için selection sahipliğini açıklaştırmak
5. bridge'lere taşınan state alanlarını sahiplik tablosuna göre daraltmak

## Mimari Kurallar

- Aynı anda yalnızca tek yüklenmiş GTFS veri seti tutulur.
- Başlangıçta otomatik preload dataset açılmaz.
- GTFS yükleme için tek progress yüzeyi kullanılır.
- Worker tabanlı parse korunur.
- Route, stop ve vehicle panel davranışları mevcut haliyle temel kabul edilir.
- Desktop ve web birlikte düşünülür; desktop için çalışan ama webde kırılan çözüm varsayılan kabul edilmez.

## Erişilebilirlik ve Bağlantı

- `accessibility` ve `connectivity` aynı şey değildir.
- GTFS verisiyle her zaman gerçek hedef erişilebilirliği ölçülmez.
- Hedef/POI/nüfus bilgisi yoksa çıktı daha çok `connectivity / bağlantı` proxy'sidir.
- Bu ayrım adlandırmada ve UI metinlerinde korunur.

## Performans İlkeleri

- Tüm ağa yayılan ağır analizler UI thread üzerinde canlı tüm şehir toggle mantığıyla çalıştırılmaz.
- Ağır skor veya ağ erişim hesaplarında öncelik:
  1. offline/precompute
  2. analiz modu
  3. on-demand ve sınırlı hesap
- Runtime katmanlarında hesap ile render ayrımı korunur.
- Viewport'a bağlı görselleştirmelerde viewport değişimi cache anahtarına dahil edilir.
- `Bağlantı Kareleri` gibi beta durumundaki katmanlarda hesap metodunu sık değiştirmek yerine önce görsel kalibrasyon, legend ve boş hücre sunumu düzeltilir.

## Web Demo Notu

Web demo ikincil değil, desteklenen ürün yüzeyidir. Ancak desktop ile aynı rahatlıkta dosya sistemi, local API veya platform davranışı varsayılmaz.

Platform sınırları için `desktop-web-notu.md` dikkate alınmalıdır.

## Belge ve Karar Kaydı

- Mimari kararlar bu dosyada kısa ve uygulanabilir şekilde tutulur.
- Uygulama davranışını değiştiren büyük kararlar için `isplani.md` ve `yol-haritasi.md` ile tutarlılık korunur.
- Ürün hissini bozan ama teknik olarak doğru görünen çözüm, önce bu çerçevede tartılır.
