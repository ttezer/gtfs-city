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
| `data-manager.js` | GTFS yükleme, doğrulama, runtime apply | veri giriş kapısı |
| `gtfs-utils.js` | parse ve runtime veri üretimi | veri çekirdeği |
| `gtfs-worker.js` | worker parse akışı | performans amaçlı |
| `service-manager.js` | servis takvimi ve tarih bağlamı | takvim sahibi |
| `city-manager.js` | aktif veri seti kartı ve görünürlük | veri seti yüzeyi |
| `map-manager.js` | katmanlar ve render | çizim sahibi |
| `ui-manager.js` | panel, liste ve etkileşim | UI sahibi |
| `planner-manager.js` | rota, isochron ve erişim hesapları | analiz sahibi |
| `simulation-engine.js` | sim saati ve replay | zaman sahibi |
| `analytics-utils.js` | headway, bunching, waiting, density | hesap yardımcıları |
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
