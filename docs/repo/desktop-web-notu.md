# GTFS City - Desktop ve Web Teknik Sınırları

Bu belge, masaustu ve web surumunun ortak ve ayrışan davranislarini kisa şekilde ozetler.
Bu dosya mimari belgesi degildir; yalnızca platform farklarini netlestirir.

## Desktop

- Ana ürün hedefidir.
- Electron üzerinde çalışır.
- Yerel dosya erişimi güvenli IPC üzerinden yapılır.
- HTTPS GTFS ZIP linkinden yükleme yalnızca burada desteklenir.
- Paketleme ve dağıtım akışı masaüstü sürüme aittir.

## Web

- GitHub Pages altında vitrin ve sade demo olarak çalışır.
- Kullanıcı yerel GTFS ZIP seçerek veri yükler.
- Electron API, yerel dosya sistemi ve güvenli link indirme desteği yoktur.
- Kapsam bilinçli olarak daha dardır.

## Ortak Alanlar

- Aynı temel arayüz mantığı
- Aynı GTFS parse ve runtime üretim çekirdeği
- Aynı route, stop, vehicle ve filtre davranışlarının ana hatları

## Temel Ayrım Kuralları

- Desktop akışına zarar verecek web denemeleri yapılmaz.
- Web için eklenen kod, desktop davranışını değiştirmemelidir.
- Platforma özel davranışlar zamanla adapter katmanına taşınmalıdır.

## Sonuç

- Desktop ürün kalbi olarak korunur.
- Web sürümü kontrollü ve güvenli kapsamda büyütülür.
- Ortak kod korunur, platform farkları açık tutulur.
