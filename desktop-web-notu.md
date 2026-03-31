# GTFS City — Desktop ve Web Teknik Sınırları

Bu belge, masaüstü ve web sürümünün ortak ve ayrışan davranışlarını özetler.

## Desktop

- Ana ürün hedefidir.
- Electron üzerinde çalışır.
- Yerel dosya erişimi güvenli IPC üzerinden yapılır.
- HTTPS GTFS ZIP linkten yükleme yalnızca burada desteklenir.
- Paketleme ve dağıtım akışı masaüstü sürüme aittir.

## Web

- GitHub Pages altında vitrin ve sade demo olarak çalışır.
- Kullanıcı yerel GTFS ZIP seçerek veri yükler.
- Electron API, yerel dosya sistemi ve güvenli link indirme desteği yoktur.
- Kapsam bilinçli olarak daha dardır.

## Ortak Alanlar

- aynı temel arayüz mantığı
- aynı GTFS parse ve runtime üretim çekirdeği
- aynı route, stop, vehicle ve filtre davranışlarının ana hatları

## Temel Ayrım Kuralları

- Desktop akışını bozacak web denemeleri yapılmaz.
- Web için eklenen kod, Desktop davranışını değiştirmemelidir.
- Platforma özel davranışlar zamanla adapter katmanına taşınmalıdır.

## Yol

- Desktop ürün kalbi olarak korunur.
- Web sürümü kontrollü ve güvenli kapsamda büyütülür.
- Ortak kod korunur, platform farkları açık tutulur.
