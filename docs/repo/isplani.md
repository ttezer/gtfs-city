# GTFS City - Guncel Durum

Bu dosya, aktif urun durumunu ve kisa vadeli odaklari tek yerde tutar.
Uzun tarihce burada biriktirilmez.

## Mevcut Durum

Proje iki desteklenen yuzeyle ilerliyor:

- Electron masaustu uygulamasi
- GitHub Pages uzerinden calisan web demo

Temel urun ilkeleri:

- upload-first baslangic akisi
- tek aktif GTFS veri seti
- worker tabanli parse
- desktop ve web icin ortak cekirdek

## Karar Olarak Sabitlenen Davranislar

- GTFS yuklenmeden harita ekranina gecilmez
- tek aktif GTFS veri seti modeli korunur
- route / stop / vehicle panel akislari temel davranis kabul edilir
- headway, heatmap, baglanti kareleri ve stop coverage katmanlari cekirdek ozelliktir
- web demo desteklenen urun yuzeyidir; sadece vitrin degildir

## Guncel Acik Isler

- Buyuk feed'de cap disi hat shape/arac gostergesi
  - routeCatalog tam (cap budamasiz); tariffIndex pre-cap; sefer saatleri tam calisiyor.
  - Cap disi hatlarda panel aciliyor ama shape, durak ve arac animasyonu gelmiyor.
  - Cozum: route-scoped on-demand loading — kullanici hatti secince o hattın trip/shape verisi worker'da yuklenir.
- Buyuk GTFS feed kararliligi / WebGL
  - Cap threshold hizalandi (30K, 4 noktada).
  - GPU crash (exit_code=34, DXGI_ERROR_DEVICE_HUNG) giderildi: use-angle=gl + disable-gpu-sandbox.
  - WebGL context loss kok nedeni hala acik; semptom azaltma yapildi.
  - Dogrulama kapsami: harita ilk render, route focus sonrasi render, context loss tekrar ediyor mu.
- Baglanti Kareleri performans iyilestirmesi
  - A: `getWindowDepartures` sonuclarini precompute basinda onbellekle
  - B: `getStopInfo(ctx)` cagrisini `getConnectivityGridCells` dongusunden disari cek
  - C: `startStopConnectivityPrecompute` hesabini Web Worker'a tasi
- Kocaeli hat seciminde durak eksikligi (veri kontrolu bekliyor)
- web demo olgunlastirma
- baglanti kareleri beta kalibrasyonu
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
- Durak arama 300 on-limit duzeltildi
- Windows GPU crash giderildi

## Bu Dosya Neyi Tutmaz

- detayli bug listesi tutmaz
- orta ve uzun vadeli roadmap tutmaz
- mimari detay aciklamasi tutmaz
- repo/build/deploy proseduru tutmaz

## Ilgili Belgeler

- `hata-listesi.md` - acik bug ve veri dogrulugu sorunlari
- `teknik-borc.md` - guncel teknik borc siralamasi ve degisim takibi
- `state-sahipligi.md` - state fazi icin sahiplik tabani ve ilk cakisma listesi
- `yol-haritasi.md` - orta ve uzun vadeli gelisim basliklari
- `mimari.md` - teknik sinirlar ve mimari ilkeler
- `kontrol.md` - is yapma standardi ve kontrol sirasi
- `repo-akisi.md` - repo duzeni, build, sync ve yayin akisi
