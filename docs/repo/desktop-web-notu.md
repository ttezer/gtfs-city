# GTFS City - Desktop ve Web Teknik Sinirlari

Bu belge, masaustu ve web surumunun ortak ve ayrisan davranislarini kisa sekilde ozetler.
Bu dosya mimari belgesi degildir; yalnizca platform farklarini netlestirir.

## Desktop

- Ana urun hedefidir.
- Electron uzerinde calisir.
- Yerel dosya erisimi guvenli IPC uzerinden yapilir.
- HTTPS GTFS ZIP linkten yukleme yalnizca burada desteklenir.
- Paketleme ve dagitim akisi masaustu surume aittir.

## Web

- GitHub Pages altinda vitrin ve sade demo olarak calisir.
- Kullanici yerel GTFS ZIP secerek veri yukler.
- Electron API, yerel dosya sistemi ve guvenli link indirme destegi yoktur.
- Kapsam bilincli olarak daha dardir.

## Ortak Alanlar

- ayni temel arayuz mantigi
- ayni GTFS parse ve runtime uretim cekirdegi
- ayni route, stop, vehicle ve filtre davranislarinin ana hatlari

## Temel Ayrim Kurallari

- Desktop akisina zarar verecek web denemeleri yapilmaz.
- Web icin eklenen kod, desktop davranisini degistirmemelidir.
- Platforma ozel davranislar zamanla adapter katmanina tasinmalidir.

## Sonuc

- Desktop urun kalbi olarak korunur.
- Web surumu kontrollu ve guvenli kapsamda buyutulur.
- Ortak kod korunur, platform farklari acik tutulur.
