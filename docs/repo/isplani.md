# GTFS City - Güncel Durum

Bu dosya, aktif ürün durumunu ve kisa vadeli odaklari tek yerde tutar.
Uzun tarihce burada biriktirilmez.

## Mevcut Durum

Proje iki desteklenen yuzeyle ilerliyor:

- Electron masaustu uygulamasi
- GitHub Pages uzerinden çalışan web demo

Temel ürün ilkeleri:

- upload-first baslangic akisi
- tek aktif GTFS veri seti
- worker tabanli parse
- desktop ve web icin ortak çekirdek

## Karar Olarak Sabitlenen Davranislar

- GTFS yuklenmeden harita ekranina gecilmez
- tek aktif GTFS veri seti modeli korunur
- route / stop / vehicle panel akislari temel davranis kabul edilir
- headway, heatmap, bağlantı kareleri ve stop coverage katmanlari çekirdek ozelliktir
- web demo desteklenen ürün yuzeyidir; sadece vitrin degildir

## Güncel Açık Isler

- Büyük feed'de cap disi hat shape/arac gostergesi
  - routeCatalog tam (cap budamasiz); tariffIndex pre-cap; sefer saatleri tam çalışıyor.
  - Cap disi hatlarda panel aciliyor ama shape, durak ve arac animasyonu gelmiyor.
  - Çözüm: route-scoped on-demand loading — kullanıcı hatti secince o hattın trip/shape verisi worker'da yuklenir.
- Büyük GTFS feed kararliligi / WebGL
  - Cap threshold hizalandi (30K, 4 noktada).
  - GPU crash (exit_code=34, DXGI_ERROR_DEVICE_HUNG) giderildi: use-angle=gl + disable-gpu-sandbox.
  - WebGL context loss kok nedeni hala açık; semptom azaltma yapıldı.
  - Doğrulama kapsami: harita ilk render, route focus sonrasi render, context loss tekrar ediyor mu.
- Bağlantı Kareleri performans iyilestirmesi
  - A: `getWindowDepartures` sonuclarini precompute basinda onbellekle
  - B: `getStopInfo(ctx)` cagrisini `getConnectivityGridCells` dongusunden disari cek
  - C: `startStopConnectivityPrecompute` hesabini Web Worker'a tasi
- Kocaeli hat seciminde durak eksikligi (veri kontrolu bekliyor)
- web demo olgunlastirma
- bağlantı kareleri beta kalibrasyonu
- persisted snapshot / cache arastirmasi
- gerekirse GTFS-RT arastirma fazi

## Tamamlanan (son oturum)

- routeCatalog cap/runtime budamasindan cikarildi; allRouteCatalog tam set ediliyor
- tariffIndex: pre-cap, servis filtreli tam trip schedule; AppState.tariffIndex olarak saklanıyor
- tariff-sheets.js AppState.trips yerine tariffIndex kullanıyor
- focusedRouteId state tam gecisi: panel, hide/show, stop filtreleme, cache key
- buildRoutePanelStats route_id bazli
- selectedEntity routeId tasiyor
- cap bilgisi UI'da gosteriliyor (sidebar notu + AppState.capped/totalTrips/tripCap)
- Durak arama 300 on-limit düzeltildi
- Windows GPU crash giderildi

## Bu Dosya Neyi Tutmaz

- detayli bug listesi tutmaz
- orta ve uzun vadeli roadmap tutmaz
- mimari detay açıklaması tutmaz
- repo/build/deploy proseduru tutmaz

## Ilgili Belgeler

- `hata-listesi.md` - açık bug ve veri dogrulugu sorunlari
- `teknik-borc.md` - güncel teknik borc siralamasi ve değişim takibi
- `state-sahipligi.md` - state fazi icin sahiplik tabani ve ilk cakisma listesi
- `yol-haritasi.md` - orta ve uzun vadeli gelisim basliklari
- `mimari.md` - teknik sınırlar ve mimari ilkeler
- `kontrol.md` - is yapma standardi ve kontrol sirasi
- `repo-akisi.md` - repo duzeni, build, sync ve yayin akisi
