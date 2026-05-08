# GTFS City - Güncel Durum

Bu dosya, aktif ürün durumunu ve kısa vadeli odakları tek yerde tutar.
Uzun tarihçe burada biriktirilmez.

## Mevcut Durum

Proje iki desteklenen yüzeyle ilerliyor:

- Electron masaüstü uygulaması
- GitHub Pages üzerinden çalışan web demo

Temel ürün ilkeleri:

- upload-first başlangıç akışı
- tek aktif GTFS veri seti
- worker tabanlı parse
- desktop ve web için ortak çekirdek

## Karar Olarak Sabitlenen Davranışlar

- GTFS yüklenmeden harita ekranına geçilmez
- tek aktif GTFS veri seti modeli korunur
- route / stop / vehicle panel akışları temel davranış kabul edilir
- headway, heatmap, bağlantı kareleri ve stop coverage katmanları çekirdek özelliktir
- web demo desteklenen ürün yüzeyidir; sadece vitrin değildir

## Güncel Açık İşler

- Tek seçili gün runtime kararı
  - Yeni yön: veri yüklendikten sonra çalışma runtime'ı varsayılan olarak seçili tek gün üzerinden kurulacak.
  - Harita, Bilgi ve Çalışma Takvimi aynı referans günü paylaşacak.
  - Bu karar büyük feed yükünü ve route/runtime tutarsızlıklarını azaltmak için Faz 7 içinde uygulanacak.
  - `activeServiceDate` artık ortak state; takvim, servis picker, Bilgi inspector ve servis özeti aynı günü okuyor.
  - Otomatik gün seçimi kuralı: bugün varsa bugün, yoksa en yakın gelecek aktif gün, o da yoksa en yakın geçmiş gün.
  - Gün değişiminde ZIP tekrar parse edilmiyor; parse-time hazırlanan GTFS kaynak verisinden runtime yeniden kuruluyor.
- Büyük feed'de seçmeli runtime yükleme
  - routeCatalog tam (cap budamasız); route ve stop tariff parse-time index'ten gelir.
  - Cap dışı bir hat seçilince artık o hat için ayrı runtime subset yüklenir ve ana runtime'a merge edilir.
  - Kalan açıklar: job iptali, cache politikası ve canlı büyük feed davranışının doğrulanması.
- Büyük GTFS feed kararlılığı / WebGL
  - Cap threshold hizalandı (30K, 4 noktada).
  - GPU crash (exit_code=34, DXGI_ERROR_DEVICE_HUNG) giderildi: use-angle=gl + disable-gpu-sandbox.
  - Viewport-scoped araç/trail/heatmap daraltması geldi.
  - TripsLayer için ayrı daha sert render bütçesi geldi.
  - Çok kalabalık durumda trail/ikon/etiket/3D katmanları koşullu kapanıyor.
  - `webglcontextlost` anında safe mode devreye giriyor: kalite düşer, trail/3D/heatmap kapanır.
- WebGL context loss kök nedeni hâlâ açık; ama artık yalnızca semptom değil, aktif yük azaltma da var.
  - Doğrulama kapsamı: harita ilk render, route focus sonrası render, context loss tekrar ediyor mu.
- stop deps / adjacency lazy build
  - adjacency listesi runtime yükleme anında otomatik kurulmaz.
  - bağlantı analizi ilk kez açılınca on-demand kurulur.
  - kalan açık: daha ince taneli route/stop/analiz modu tetikleyicileri.
- Bağlantı Kareleri performans iyileştirmesi
  - A: `getWindowDepartures` sonuçlarını precompute başında önbellekle
  - B: `getStopInfo(ctx)` çağrısını `getConnectivityGridCells` döngüsünden dışarı çek
  - C: `startStopConnectivityPrecompute` hesabını Web Worker'a taşı
- Kocaeli hat seçiminde durak eksikliği (veri kontrolü bekliyor)
- web demo olgunlaştırma
- bağlantı kareleri beta kalibrasyonu
- persisted snapshot / cache araştırması
- gerekirse GTFS-RT araştırma fazı

## Tamamlanan (son oturum)

- route-scoped runtime source ve runtime merge akışı eklendi
- `loadedRuntimeRouteIds`, `loadingRuntimeRouteIds` ve request-seq koruması eklendi
- cap dışı route seçilince `loadRouteRuntimeSubset(routeId)` çalışıyor
- worker ve runtime builder sözleşmesi `routeIds` ve opsiyonel build seçenekleri kabul ediyor
- route-scoped job'larda gereksiz `hourlyCounts/hourlyHeat` üretimi kapatıldı
- viewport-scoped araç/trail/heatmap daraltması eklendi
- TripsLayer için ayrı render bütçesi eklendi
- ağır katman politikası geldi: kalabalık durumda trail, ikon, etiket ve 3D koşullu kapanıyor
- `webglcontextlost` anında safe mode devreye giriyor
- adjacency eager değil, on-demand kurulur hale geldi
- Runtime varsayılanının tek seçili güne çekilmesi, Faz 7'nin yeni ana omurgası olarak not edildi
- routeCatalog cap/runtime budamasından çıkarıldı; allRouteCatalog tam set ediliyor
- tariffIndex: pre-cap, servis filtreli tam trip schedule; AppState.tariffIndex olarak saklanıyor
- stopTariffIndex: pre-cap, servis filtreli stop bazlı timetable index; AppState.stopTariffIndex olarak saklanıyor
- tariff-sheets.js route ve stop tariff tarafında AppState.trips yerine parse-time index kullanıyor
- activeWorkspace state iskeleti eklendi; Harita/Bilgi geçişi için bridge ve AppManager kabuğu hazırlandı
- Bilgi workspace artık boş kabuk değil; veri özeti, hat listesi, durak listesi ve sağ inspector ile çalışıyor
- Bilgi workspace route/durak listeleri arama ve sıralama destekli mini tablo düzenine geçti
- Bilgi inspector route, durak ve araç seçimi için özet bloklar ve hızlı aksiyonlar gösteriyor
- focusedRouteId state tam geçişi: panel, hide/show, stop filtreleme, cache key
- buildRoutePanelStats route_id bazlı
- selectedEntity routeId taşıyor
- cap bilgisi UI'da gösteriliyor (sidebar notu + AppState.capped/totalTrips/tripCap)
- cap dışı hat seçiminde sessiz yarım panel yerine açık bilgi mesajı veriliyor
- Durak arama 300 on-limit düzeltildi
- Windows GPU crash giderildi

## Bu Dosya Neyi Tutmaz

- detaylı bug listesi tutmaz
- orta ve uzun vadeli roadmap tutmaz
- mimari detay açıklaması tutmaz
- repo/build/deploy prosedürü tutmaz

## İlgili Belgeler

- `hata-listesi.md` - açık bug ve veri doğruluğu sorunları
- `teknik-borc.md` - güncel teknik borç sıralaması ve değişim takibi
- `state-sahipligi.md` - state fazı için sahiplik tabanı ve ilk çakışma listesi
- `yol-haritasi.md` - orta ve uzun vadeli gelişim başlıkları
- `mimari.md` - teknik sınırlar ve mimari ilkeler
- `kontrol.md` - iş yapma standardı ve kontrol sırası
- `repo-akisi.md` - repo düzeni, build, sync ve yayın akışı

## Ara Durum Notu - 2026-05-01

- Haritada Aç route ve stop için gerçek harita focus/panel akışına bağlandı.
- Harita üzerinde Çalışma günü badge'i eklendi.
- Bilgi workspace dili tek gün runtime kararına göre sadeleşti (Seçili gün, Yüklü sefer, Servis aralığı).
- 24 saati aşan saatler artık kullanıcı dostu gösteriliyor (HH:MM +1).
- Araç ikon regresyonu kapatıldı; ikon katmanı açıkken nokta fallback görünmüyor.
- Durak tablosu sadeleşti; kod ve konum kaldırıldı.
- Hat tablosu sadeleşti; işletmeci kaldırıldı, boş ad alanları için headsign/varyant fallback'i eklendi.
- Varyant listesi artık tam ve tıklanabilir; direction focus akışına bağlandı.
- short_name bazlı route family modelinin ilk çalışan sürümü başlatıldı.
- Landing akışında artık iki net giriş var: Takvimi Aç ve Haritayı Aç; harita butonu altında yüklü çalışma günü gösteriliyor.
- Route family modelinin ilk ürünleşmiş sürümü geldi: aynı short_name listede tek girişe toplanıyor, inspector içinde alt kayıtlar ayrı açılabiliyor.
