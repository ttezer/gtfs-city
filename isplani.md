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

### Faz R — GitHub Pages Vitrin Kurulumu (30 Mart 2026)

- `docs/index.html` ve `docs/styles.css` ile statik vitrin sayfası oluşturuldu.
- Pages içinde kullanılmak üzere `docs/logo-mark.png` ve `docs/favicon.ico` eklendi.
- `README.md` GitHub Pages açma adımlarını içerecek şekilde güncellendi.
- Pages kaynağı olarak `main /docs` kullanılacak.
### Faz R — Kamusal Repo Kontrolü Turu 2 (30 Mart 2026)

- Açık repo taramasında tracked gizli veri, token veya ZIP veri paketi bulunmadı.
- electron/main.js ve electron/preload.js içindeki eski İstanbul marka kalıntıları GTFS City olarak temizlendi.

### Faz R — Pages ve README Görsel Galeri Turu 3 (31 Mart 2026)

- Proje kökündeki JPEG örnekleri docs/screens/ altına kopyalanarak GitHub Pages vitrinine bağlandı.
- docs/index.html içeriği giriş ekranı, GTFS yükleme, hat paneli, durak paneli, araç paneli ve izokron görselleriyle genişletildi.
- README.md içine aynı örneklerden oluşan ekran görüntüsü bölümü eklendi.

### Faz R — Pages Profesyonelleştirme ve Preload Temizliği Turu 4 (31 Mart 2026)

- docs/index.html ve docs/styles.css daha profesyonel bir vitrin düzenine geçirildi; alt kısma Vatan'ın Babası Tacettin TEZER notu eklendi.
- README.md içindeki gereksiz Pages kurulum maddeleri sadeleştirildi.
- Artık kullanılmayan preload kalıntıları kaldırıldı: 	rips_data.js, shapes_data.js, lookup_data.js, scripts/regenerate-bordeaux-preload.js.
- Eski cizim.md kaldırıldı ve uild-release.yml preload bağımlılığı olmadan yeniden yazıldı.

### Faz R — Kök Görsel Kaynakları Ignore Turu 5 (31 Mart 2026)

- Pages için kullanılan docs/screens/ kopyaları korunurken, proje kökündeki geçici JPEG kaynaklar ve gtfscity.png .gitignore içine alındı.


### Faz S ? Web MVP Haz?rl?k Turu 1 (31 Mart 2026)

- `docs/app/` alt?nda GitHub Pages i?in ayr? web giri? noktas? olu?turuldu.
- Web giri?i, desktop ak???na dokunmadan k?k JS/CSS dosyalar?n?n Pages i?in izole kopyalar?yla haz?rland?.
- `bootstrap-manager.js` i?ine base path deste?i eklendi ve Pages vitrinden `Web Demo` ba?lant?s? verildi.
