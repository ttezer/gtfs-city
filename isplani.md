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
- HTTPS GTFS ZIP linkten yükleme, yalnızca Electron sürümünde
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

- GitHub Pages için vitrin ve web demo olgunlaştırma
- favicon ve app icon için daha sade bir final logo sürümü
- küçük UX ve veri doğruluk düzeltmeleri
- istenirse GTFS-RT araştırma ve taslak fazı

## Planlama Belgeleri

- `yol-haritasi.md` — orta ve uzun vadeli geliştirme başlıkları
- `hata-listesi.md` — açık hata ve veri doğruluk sorunları

## Not

Bu dosya uzun tarihçe değil, güncel durum belgesidir. Yeni işler buraya kısa ve güncel biçimde eklenmelidir.

### Faz R — GitHub Pages Vitrin Kurulumu (30 Mart 2026)

- `docs/index.html` ve `docs/styles.css` ile statik vitrin sayfası oluşturuldu.
- Pages içinde kullanılmak üzere `docs/logo-mark.png` ve `docs/favicon.ico` eklendi.
- Pages kaynağı olarak `main /docs` kullanılacak şekilde yapı kuruldu.

### Faz R — Kamusal Repo Kontrolü Turu 2 (30 Mart 2026)

- Açık repo taramasında tracked gizli veri, token veya ZIP veri paketi bulunmadı.
- Electron tarafındaki eski marka kalıntıları GTFS City adına temizlendi.

### Faz R — Pages ve README Görsel Galeri Turu 3 (31 Mart 2026)

- Proje kökündeki JPEG örnekleri `docs/screens/` altına alınarak GitHub Pages vitrinine bağlandı.
- `README.md` içine aynı örneklerden oluşan ekran görüntüsü bölümü eklendi.

### Faz R — Pages Profesyonelleştirme ve Preload Temizliği Turu 4 (31 Mart 2026)

- Pages vitrini daha profesyonel bir düzene geçirildi.
- README içindeki gereksiz Pages kurulum maddeleri sadeleştirildi.
- Artık kullanılmayan preload kalıntıları kaldırıldı: `trips_data.js`, `shapes_data.js`, `lookup_data.js`, `scripts/regenerate-bordeaux-preload.js`.
- `cizim.md` kaldırıldı ve `build-release.yml` preload bağımlılığı olmadan yeniden yazıldı.

### Faz R — Kök Görsel Kaynakları Ignore Turu 5 (31 Mart 2026)

- `docs/screens/` kopyaları korunurken, proje kökündeki geçici JPEG kaynaklar ve `gtfscity.png` `.gitignore` içine alındı.

### Faz S — Web MVP Hazırlık Turu 1 (31 Mart 2026)

- `docs/app/` altında GitHub Pages için ayrı web giriş noktası oluşturuldu.
- Web girişi, desktop akışına dokunmadan kök JS/CSS dosyalarının Pages için izole kopyalarıyla hazırlandı.
- `bootstrap-manager.js` içine base path desteği eklendi ve Pages vitrinden `Web Demo` bağlantısı verildi.

### Faz S — Web MVP Düzenleme Turu 2 (31 Mart 2026)

- Yüklenen şehir silindiğinde landing ekranına güvenli dönüş ve yeniden GTFS yükleme akışı düzeltildi.
- Pages vitrinde giriş metni, ekran görüntüsü yerleşimi ve ürün anlatımı yeniden düzenlendi.
- HTTPS linkten yükleme, güvenlik ve platform sınırları nedeniyle desktop sürümünde tutuldu; web demo yerel ZIP yükleme ile sınırlandı.

### Faz S — Lisans ve Üçüncü Parti Tarama Turu 3 (31 Mart 2026)

- `package-lock.json` ve CDN bağımlılıkları üzerinden üçüncü parti lisans taraması yapıldı.
- Çekirdek bağımlılıklar için lisans özeti çıkarıldı ve `THIRD_PARTY_NOTICES.md` eklendi.
- npm taraması içinde zorunlu copyleft sınıfında GPL/AGPL/LGPL bağımlılık bulunmadı; JSZip için MIT seçeneği not edildi.
- Özel görseller ve logo varlıklarının kaynağının proje sahibi tarafından ayrıca doğrulanması gerektiği not edildi.

### Faz S — 3D Model Kaldırma Turu 4 (31 Mart 2026)

- Kullanılmayan `.glb` araç modeli yolu kaldırıldı ve uygulama 2D araç görünümüne sabitlendi.
- 3D araç modelleri toggle’ı arayüzden çıkarıldı.
- Paketleme ve üçüncü parti bildirimleri model dizini kaldırılacak şekilde güncellendi.

### Faz S — Türkçe Metin Güvencesi Turu 5 (31 Mart 2026)

- Public metin dosyaları için kalıcı bozulma denetimi eklendi.
- Mojibake kontrolü test akışına bağlandı.
- Türkçe içeren doküman ve Pages dosyalarında shell üzerinden here-string yazımı yasaklandı; yalnızca güvenli yama akışı kullanılacak.

### Faz S — Pages Analytics Turu 6 (31 Mart 2026)

- Google Analytics 4 ölçümü Pages vitrini ve web demo girişine eklendi.
- Kullanılan ölçüm kimliği: `G-PRJPC1JRDH`

### Faz S — Yol Haritası ve Hata Listesi Turu 7 (31 Mart 2026)

- Orta ve uzun vadeli geliştirmeler için `yol-haritasi.md` eklendi.
- Açık hata ve veri doğruluk başlıkları için `hata-listesi.md` eklendi.
- `isplani.md` kısa durum belgesi olarak korunup plan belgelerine bağlandı.

### Faz S — Teknik Borç ve Refactor Planı Turu 8 (31 Mart 2026)

- Mimari riskler ve performans darboğazları `yol-haritasi.md` içine ayrı başlık olarak işlendi.
- State ownership, `script.js` küçültme, trip eşleştirme, render ayrımı ve platform adapter işleri açık refactor planına dönüştürüldü.
- Hedef, ürünü yeniden yazmadan kademeli iyileştirme yapmak olarak netleştirildi.

### Faz S — Repo Olgunlaştırma Turu 9 (31 Mart 2026)

- `CONTRIBUTING.md` eklendi.
- GitHub issue template yapısı oluşturuldu.
- `CHANGELOG.md` ve `desktop-web-notu.md` eklendi.
- `mimari.md` içine modül ownership tablosu işlendi.
