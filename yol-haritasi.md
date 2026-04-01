# GTFS City - Yol Haritası

Bu belge, ürünün orta ve uzun vadeli geliştirme başlıklarını toplar. Hedef, kararlı masaüstü ve web sürümünü bozmadan yeni özellikleri kontrollü biçimde eklemektir.

## Alanlar

- **Tür:** `Yeni özellik` veya `Geliştirme`
- **Öncelik:** `Yüksek`, `Orta`, `Düşük`
- **Platform:** `Desktop`, `Web`, `Her ikisi`
- **Durum:** `Planlandı`, `İnceleniyor`, `Geliştiriliyor`, `Beklemede`, `Tamamlandı`

## Ürün Yol Haritası

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| GTFS-RT Entegrasyonu | Yeni özellik | Yüksek | Desktop | Planlandı | Canlı araç konumu, gecikme ve gerçek zamanlı operasyon görünürlüğü |
| Nasıl Giderim / Yol Tarifi | Geliştirme | Yüksek | Her ikisi | Planlandı | Hat ve aktarma mantığıyla çalışan anlaşılır yol tarifi üretmek |
| Hat Seçiminde Yön Filtresi | Yeni özellik | Yüksek | Her ikisi | Planlandı | `direction_id` bazlı yön seçimi ile durak, araç ve panelleri birlikte filtrelemek |
| Hat ve Durak Bazlı Sorgulama | Yeni özellik | Yüksek | Her ikisi | Planlandı | Seçili hat, durak, yön ve zaman bağlamında hedefli sorgulama sunmak |
| Sefer Saatleri | Yeni özellik | Yüksek | Her ikisi | Planlandı | Hat bazlı sefer saatlerini okunabilir biçimde göstermek |
| Araç İkonu Üzerinde Hat Kodu / Yön | Yeni özellik | Yüksek | Her ikisi | Planlandı | Araç ikonunun üstünde hat kodu ve yön bilgisini görünür kılmak |
| 3D Bina Katmanı | Yeni özellik | Orta | Desktop | Planlandı | Harita bağlamını güçlendirmek |
| Sinematik Geliştirmeleri | Geliştirme | Orta | Her ikisi | Planlandı | Açı, yön, hız ve kamera geçişlerini veri odaklı hale getirmek |
| Yoğunluk Heatmap | Geliştirme | Orta | Her ikisi | Planlandı | Çap ve renk parametrelerini kullanıcıya açmak |
| Durak 300 m Katmanı | Geliştirme | Orta | Her ikisi | Planlandı | Mesafe, çizgi rengi ve dolgu rengini ayarlanabilir yapmak |
| Bunching Alarmı | Geliştirme | Orta | Her ikisi | Planlandı | Alarmı daha anlaşılır ve daha okunur göstermek |
| Bekleme Süresi 3D | Geliştirme | Orta | Her ikisi | Planlandı | Anlık zamana göre güncelleme ve puanlama eklemek |
| Headway Çizgileri | Geliştirme | Orta | Her ikisi | Planlandı | Çizgi atılacak araç sayısını kullanıcıya seçtirmek |
| Araç İzleri Yerine Kuyruklama Analizi | Yeni özellik | Orta | Her ikisi | Planlandı | Fade iz yerine daha anlamlı operasyon analizi sunmak |
| İzokron Analizi Puanlama | Yeni özellik | Orta | Her ikisi | Planlandı | Veriye göre seçili durağa skor üretmek |

## Web Yol Haritası

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| Açık Kaynak GTFS Link Havuzu | Yeni özellik | Orta | Web | Tamamlandı | Web sürümünde Konya ve İzmir ESHOT için örnek açık veri kartları sunmak |
| Web Demo Olgunlaştırma | Geliştirme | Orta | Web | Geliştiriliyor | Pages demosunu daha tam özellikli ama güvenli kapsamda tutmak |
| GitHub Pages Sayfa Tasarımı | Geliştirme | Orta | Web | Planlandı | Vitrin sayfasını daha profesyonel ve ürün kimliğine uygun hale getirmek |

## Teknik Borç ve Refactor Planı

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| State Ownership Temizliği | Geliştirme | Yüksek | Her ikisi | Planlandı | `state-manager.js` dosyasını gerçek merkezi durum katmanına dönüştürmek |
| `script.js` Sorumluluk Azaltma | Geliştirme | Yüksek | Her ikisi | Planlandı | Ana dosyayı orkestrasyon katmanı olarak tutmak |
| Trip Eşleştirme ve Picking Zinciri | Geliştirme | Yüksek | Her ikisi | Planlandı | Araç tıklama ve panel eşleşmesini daha deterministik hale getirmek |
| Durak Paneli Hesaplarını Ayrıştırma | Geliştirme | Orta | Her ikisi | Planlandı | Durak özetleri ve varış hesaplarını ayrı util katmanına taşımak |
| Katman Hesabı ve Render Ayrımı | Geliştirme | Yüksek | Her ikisi | Planlandı | `map-manager.js` içinde hesaplama ile çizim sorumluluğunu ayırmak |
| Toggle Spam ve UI Kilitlenmesi | Geliştirme | Orta | Her ikisi | Planlandı | Art arda aç/kapa işlemlerinde yaşanan kilitlenmeleri azaltmak |
| Web ve Desktop Adapter Ayrımı | Geliştirme | Orta | Her ikisi | Planlandı | Platforma özel akışları adapter katmanında toplamak |
| Tam I18n Kapsamı | Geliştirme | Orta | Her ikisi | İnceleniyor | Landing dışındaki panel, servis, uyarılar ve dinamik metinleri TR/EN destekli hale getirmek |
| Encoding Standardizasyonu | Geliştirme | Yüksek | Her ikisi | Planlandı | Metin dosyalarını tek kodlama standardına toplamak, bozuk karakter riskini ve yama kırılmalarını kaldırmak |

## Repo Yönetimi ve Kalite

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| Issue Tabanlı Çalışma | Geliştirme | Yüksek | Her ikisi | İnceleniyor | Her kullanıcı görünür değişiklik veya teknik borç işini issue ile izlenebilir hale getirmek |
| Değişiklik Kaydı Disiplini | Geliştirme | Orta | Her ikisi | İnceleniyor | README, `CHANGELOG.md`, `isplani.md` ve gerekiyorsa roadmap kayıtlarını tutarlı hale getirmek |
| PR Şablonu ve Çıkış Kriterleri | Geliştirme | Orta | Her ikisi | Planlandı | Test, metin kontrolü, ekran görüntüsü ve issue bağını zorunlu kontrol listesine dönüştürmek |

## Notlar

- `GTFS-RT Entegrasyonu` ilk fazda `VehiclePositions`, ikinci fazda `TripUpdates` ile ele alınmalı.
- `Araç İkonu Üzerinde Hat Kodu / Yön` yoğun sahnelerde okunabilirlik ve çakışma yönetimiyle birlikte tasarlanmalı.
- `3D Bina Katmanı` performans etkisi nedeniyle aç/kapa kontrollü olmalı.
- `Headway Çizgileri` yön bazlı yorumlamayı korumalı.
- `Açık Kaynak GTFS Link Havuzu` yalnızca güvenilir ve açık kaynak veri sağlayıcıları içermeli.
- `Web Demo Olgunlaştırma` masaüstü akışını bozmadan ilerlemeli.
- `Trip Eşleştirme ve Picking Zinciri` işinde `findTripIdx` mantığı daha küçük ve indeks tabanlı hale getirilmeli.
- `Web ve Desktop Adapter Ayrımı` linkten yükleme, dosya erişimi ve worker davranışlarını temiz biçimde ayırmalı.
- `Tam I18n Kapsamı` issue bazlı parçalı rollout ile ilerlemeli; tek seferde tüm repo çevirisine girilmemeli.
- `Encoding Standardizasyonu` tamamlanmadan metin ağırlıklı refactor ve toplu doküman düzenlemelerinde dikkatli olunmalı.
