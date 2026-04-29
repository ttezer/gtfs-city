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

- Büyük feed'de cap dışı hat shape/araç göstergesi
  - routeCatalog tam (cap budamasız); tariffIndex pre-cap; sefer saatleri tam çalışıyor.
  - Cap dışı hatlar listede görünür; seçilirse panel açmak yerine açık bilgilendirme veriliyor.
  - Route tariff tam veriyle çalışır; stop tariff halen runtime stopDeps/trips zincirine bağlıdır.
  - Çözüm: route-scoped on-demand loading — kullanıcı hattı seçince o hattın trip/shape verisi worker'da yüklenir.
- Büyük GTFS feed kararlılığı / WebGL
  - Cap threshold hizalandı (30K, 4 noktada).
  - GPU crash (exit_code=34, DXGI_ERROR_DEVICE_HUNG) giderildi: use-angle=gl + disable-gpu-sandbox.
- WebGL context loss kök nedeni hâlâ açık; semptom azaltma yapıldı.
  - Doğrulama kapsamı: harita ilk render, route focus sonrası render, context loss tekrar ediyor mu.
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

- routeCatalog cap/runtime budamasından çıkarıldı; allRouteCatalog tam set ediliyor
- tariffIndex: pre-cap, servis filtreli tam trip schedule; AppState.tariffIndex olarak saklanıyor
- tariff-sheets.js route tariff tarafında AppState.trips yerine tariffIndex kullanıyor; stop tariff halen runtime bağımlı
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
