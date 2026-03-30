# GTFS City — Güncel Durum

## Mevcut Kararlı Durum

Proje şu anda Electron tabanlı, tek GTFS veri seti mantığıyla çalışan kararlı bir masaüstü uygulamadır.

Kararlı kabul edilen temel davranışlar:

- upload-first başlangıç akışı
- tek aktif GTFS veri seti
- `HARİTAYI AÇ` ile harita ekranına geçiş
- route, stop ve vehicle panel akışları
- hat tipi filtresi, odaklı hat ve ilgili katman filtreleri
- headway, bekleme, yoğunluk ve kapsama katmanları
- HTTPS GTFS ZIP linkten yükleme (yalnızca Electron)
- logo, landing ve temel ürün kimliği

## Kilit Kararlar

### ADR-022 — Upload-first açılış akışı
Uygulama boş landing ekranla başlar. Veri yüklenmeden harita ekranına geçilmez.

### ADR-023 — Başlangıç veri kaynağı
Başlangıç veri kaynağı yerleşik preload değil, kullanıcı tarafından yüklenen GTFS ZIP verisidir.

### ADR-024 — Tek progress yüzeyi
GTFS yükleme sırasında tek bir progress yüzeyi kullanılır. Çift confirm/progress akışı açılmaz.

### ADR-025 — Worker tabanlı parse
Ağır GTFS parse işlemi mümkün olan yerde worker üzerinden çalıştırılır; fallback yalnızca zorunlu durumda devreye girer.

### ADR-026 — Route/stop/vehicle panel davranışı
Route panel, stop panel, odaklı hat görünümü ve buna bağlı filtre davranışları mevcut haliyle temel kabul edilir.

## Açık Kalan Yakın İşler

- GitHub Pages için vitrin/dokümantasyon yapısı
- favicon ve app icon için daha sade bir final logo sürümü
- küçük UX ve veri doğruluk düzeltmeleri
- istenirse GTFS-RT araştırma ve taslak fazı

## Not

Bu dosya artık uzun tarihçe değil, güncel durum belgesidir. Yeni işler buraya kısa ve güncel biçimde eklenmelidir.
