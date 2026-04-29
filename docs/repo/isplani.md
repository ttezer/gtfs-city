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

- Route list / route search dogrulugu <- VBB canli dogrulama bekliyor
  - `routeCatalog` artik `route_id` ve `agency_id` tasiyor; liste dedupe `route_id` tabanli.
  - `focusedRoute` yarım geçişi giderildi: `focusedRouteId` state eklendi, harita tiklamasinda artik tam obje geçiyor, stop filtreleme `trip.rid` üzerinden calisiyor.
  - Cap threshold uyumsuzlugu giderildi: `data-manager.js`, `gtfs-worker.js` ve fallback yolu hizalandi (esik: 30K).
  - Kalan: resmi VBB feed ile route list, route focus, panel akisi ve agency ayrimi gorsel dogrulama.
- Buyuk GTFS feed kararliligi / WebGL
  - Cap threshold uyumsuzlugu giderildi; 3 yerde farkli esik degeri kullaniliyordu.
  - Runtime cap, geometri ve stop-deps yogunlugu daha once dusurulmustu.
  - WebGL context loss kok nedeni hala acik; semptom azaltma yapildi.
  - Dogrulama kapsami: harita ilk render, route focus sonrasi render, context loss tekrar ediyor mu.
- Landing / map-only UI ayrimi
  - Landing acikken planner ve harita ustu overlay'ler gorunmemeli.
  - Landing'e donuste planner sonucu, route highlight ve panel state'i temiz kalmali.
  - Logo / baslik gorunurlugu masaustu pencerede korunmali.
- Desktop dev ergonomisi
  - Windows `npm run dev` akisi duzeltildi; kalici davranis dogrulanmali.
  - DevTools auto-open kapatildi; gelistirici araclari menuden acilir durumda kalmali.
- Baglanti Kareleri performans iyilestirmesi
  - A: `getWindowDepartures` sonuclarini precompute basinda onbellekle
  - B: `getStopInfo(ctx)` cagrisini `getConnectivityGridCells` dongusunden disari cek
  - C: `startStopConnectivityPrecompute` hesabini Web Worker'a tasi
- web demo olgunlastirma
- baglanti kareleri beta kalibrasyonu
- persisted snapshot / cache arastirmasi
- kucuk UX ve veri dogrulugu duzeltmeleri
- gerekirse GTFS-RT arastirma fazi

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
