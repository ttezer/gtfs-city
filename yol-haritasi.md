# GTFS City — Yol Haritası

Bu belge, ürünün orta ve uzun vadeli geliştirme başlıklarını toplar. Hedef, kararlı masaüstü ve web sürümünü bozmadan yeni özellikleri kontrollü biçimde eklemektir.

## Öncelik Düzeyi

- **Yüksek** — ürün davranışını doğrudan güçlendiren işler
- **Orta** — deneyimi belirgin iyileştiren işler
- **Düşük** — değerli ama çekirdek akışı bloklamayan işler

## Durum Düzeyi

- **Planlandı** — fikir net, geliştirme başlamadı
- **İnceleniyor** — kapsam veya teknik yaklaşım değerlendiriliyor
- **Geliştiriliyor** — aktif çalışma var
- **Beklemede** — daha sonra ele alınacak
- **Tamamlandı** — ürün içine alındı

## Yüksek Öncelik

### GTFS-RT Entegrasyonu
- **Tür:** Yeni özellik
- **Öncelik:** Yüksek
- **Platform:** Desktop
- **Durum:** Planlandı
- **Hedef:** canlı araç konumu, canlı gecikme ve gerçek zamanlı operasyon görünürlüğü
- **İlk kapsam:** `VehiclePositions`
- **İkinci faz:** `TripUpdates`
- **Not:** masaüstü sürümünde başlatılmalı; web sürümü daha sonra değerlendirilir

### Nasıl Giderim / Yol Tarifi
- **Tür:** Geliştirme
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** mevcut akışı gerçek hat ve aktarma mantığıyla çalışır hale getirmek
- **Beklenen çıktı:** durak listesi yerine anlaşılır adımlar
- **Örnek:** `Şu hatta bin → şu durakta in → aktarma yap`

### Hat Seçiminde Yön Filtresi
- **Tür:** Yeni özellik
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** hat seçimine `direction_id` bazlı yön eklemek
- **Beklenen çıktı:** yön seçilince durak, araç, panel ve ilgili katmanların birlikte filtrelenmesi

### Hat ve Durak Bazlı Sorgulama
- **Tür:** Yeni özellik
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** kullanıcıya daha hedefli veri sorgulama ekranları sunmak
- **Kapsam:** seçili hat, seçili durak, seçili yön ve seçili zaman bağlamı

### Sefer Saatleri
- **Tür:** Yeni özellik
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** hat bazlı sefer saatlerini okunabilir tablolar veya zaman bloklarıyla göstermek

### Araç İkonu Üzerinde Hat Kodu / Yön
- **Tür:** Yeni özellik
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** araç ikonunun üzerinde hat kodu ve yön bilgisini görünür kılmak
- **Not:** yoğun sahnelerde okunabilirlik ve çakışma yönetimi birlikte ele alınmalı

## Orta Öncelik

### 3D Bina Katmanı
- **Tür:** Yeni özellik
- **Öncelik:** Orta
- **Platform:** Desktop
- **Durum:** Planlandı
- **Hedef:** harita bağlamını güçlendirmek
- **Not:** performans etkisi nedeniyle aç/kapa kontrollü olmalı

### Sinematik Geliştirmeleri
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** açı, yön, hız, geçiş süresi ve kamera davranışını veri odaklı hale getirmek

### Yoğunluk Heatmap
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** çap ve renk parametrelerini kullanıcıya açmak

### Durak 300 mt Katmanı
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** mesafe, çizgi rengi ve dolgu rengini ayarlanabilir yapmak

### Bunching Alarmı
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** mevcut alarmı daha anlaşılır ve daha okunur göstermek

### Bekleme Süresi 3D
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** anlık zamana göre güncelleme ve puanlama eklemek

### Headway Çizgileri
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** çizgi atılacak araç sayısını kullanıcıya seçtirmek
- **Not:** yön bazlı yorumlama korunmalı

### Araç İzleri Yerine Kuyruklama Analizi
- **Tür:** Yeni özellik
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** `Araç İzleri Fade` yerine daha anlamlı operasyon analizi sunmak

### İzokron Analizi Puanlama
- **Tür:** Yeni özellik
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** veriye göre seçili durağa skor üretmek

## Web Yol Haritası

### Açık Kaynak GTFS Link Havuzu
- **Tür:** Yeni özellik
- **Öncelik:** Orta
- **Platform:** Web
- **Durum:** Planlandı
- **Hedef:** web sürümünde örnek açık veri bağlantıları sunmak
- **Not:** yalnızca güvenilir ve açık kaynak veri sağlayıcıları listelenmeli

### Web Demo Olgunlaştırma
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Web
- **Durum:** Geliştiriliyor
- **Hedef:** mevcut Pages demosunu daha tam özellikli ama güvenli kapsamda tutmak
- **İlkeler:** masaüstü akışını bozmadan ilerlemek

### GitHub Pages Sayfa Tasarımı
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Web
- **Durum:** Planlandı
- **Hedef:** vitrin sayfasını daha profesyonel, dengeli ve ürün kimliğine uygun hale getirmek

## Teknik Borç ve Refactor Planı

### State Ownership Temizliği
- **Tür:** Geliştirme
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** `state-manager.js` dosyasını gerçek merkezi durum katmanına dönüştürmek
- **Kapsam:** `focusedRoute`, `typeFilter`, toggle durumları, seçim ve panel bağlamı

### `script.js` Sorumluluk Azaltma
- **Tür:** Geliştirme
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** ana dosyayı orkestrasyon katmanı olarak tutmak
- **Kapsam:** veri hesapları, panel yardımcıları ve eşleştirme mantığını ilgili modüllere ayırmak

### Trip Eşleştirme ve Picking Zinciri
- **Tür:** Geliştirme
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** araç tıklama ve panel eşleşmesini daha deterministik hale getirmek
- **Not:** `findTripIdx` mantığı daha küçük ve indeks tabanlı hale getirilmeli

### Durak Paneli Hesaplarını Ayrıştırma
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** durak özetleri ve varış hesaplarını ayrı util katmanına taşımak

### Katman Hesabı ve Render Ayrımı
- **Tür:** Geliştirme
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** `map-manager.js` içinde hesaplama ile çizim sorumluluğunu daha net ayırmak
- **Kapsam:** yoğunluk, bekleme, headway ve kapsama katmanları

### Toggle Spam ve UI Kilitlenmesi
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** art arda aç/kapa işlemlerinde yaşanan kilitlenmeleri azaltmak
- **Not:** debounce, frame batching veya hesap geciktirme stratejileri değerlendirilecek

### Web ve Desktop Adapter Ayrımı
- **Tür:** Geliştirme
- **Öncelik:** Orta
- **Platform:** Her ikisi
- **Durum:** Planlandı
- **Hedef:** platforma özel akışları adapter katmanında toplamak
- **Not:** linkten yükleme, dosya erişimi ve worker davranışları burada ayrıştırılmalı

## Planlama Notu

- Yeni maddeler önce burada sınıflandırılır.
- Hata ve veri doğruluğu sorunları `hata-listesi.md` içinde tutulur.
- Aktif, kısa vadeli durum özeti `isplani.md` içinde kalır.
