# GTFS City - Güncel Durum

## Mevcut Durum

Proje bugün iki yüzeyle yaşayan bir üründür:

- Electron masaüstü uygulaması
- GitHub Pages üzerinden çalışan web demo

Ana ürün mantığı:

- upload-first başlangıç akışı
- tek aktif GTFS veri seti
- route, stop ve vehicle panel akışları
- worker tabanlı parse
- desktop ve web birlikte düşünülen runtime mimarisi

## Kararlı Kabul Edilen Davranışlar

- GTFS yüklenmeden harita ekranına geçilmez
- tek aktif GTFS veri seti yaklaşımı korunur
- route / stop / vehicle panel davranışları temel kabul edilir
- headway, waiting, density ve stop coverage katmanları temel özelliklerdir
- web demo desteklenen ürün yüzeyidir; sadece vitrin değildir

## Kilit Kararlar

### ADR-022 - Upload-first açılış akışı

Uygulama boş landing ekranla başlar. Veri yüklenmeden harita ekranına geçilmez.

### ADR-023 - Başlangıç veri kaynağı

Başlangıç veri kaynağı kullanıcı tarafından yüklenen GTFS ZIP verisidir.

### ADR-024 - Tek progress yüzeyi

GTFS yükleme sırasında tek bir progress yüzeyi kullanılır.

### ADR-025 - Worker tabanlı parse

Ağır GTFS parse işlemi mümkün olduğu yerde worker üzerinden çalıştırılır.

### ADR-026 - Route/stop/vehicle panel davranışı

Route panel, stop panel, odaklı hat görünümü ve buna bağlı filtre davranışları mevcut haliyle temel kabul edilir.

### ADR-027 - Ağır ağ analizleri

Tüm ağa yayılan ağır accessibility veya connectivity hesapları UI thread üzerinde canlı toggle mantığıyla çalıştırılmaz. Öncelik:

1. offline/precompute
2. analiz modu
3. sınırlı on-demand hesap

### ADR-028 - Connectivity dili

Gerçek hedef erişilebilirliği ölçmeyen skorlar için `accessibility` yerine `connectivity / bağlantı` dili tercih edilir.

## Güncel Açık İşler

- web demo olgunlaştırma
- bağlantı kareleri beta kalibrasyonu ve görünüm ilerleme metni
- persisted snapshot / cache araştırması
- küçük UX ve veri doğruluk düzeltmeleri
- gerekirse GTFS-RT araştırma fazı

## Planlama Belgeleri

- [yol-haritasi.md](./yol-haritasi.md) - orta ve uzun vadeli geliştirme başlıkları
- [hata-listesi.md](./hata-listesi.md) - açık hata ve veri doğruluk sorunları
- [mimari.md](./mimari.md) - modüller, veri akışı ve teknik ilkeler
- [kontrol.md](./kontrol.md) - çalışma ve PR kontrol listesi

## Not

Bu dosya uzun tarihçe değil, güncel durum belgesidir. Eski detaylı tur kayıtları burada biriktirilmez; yalnız bugünkü gerçek durum tutulur.
