# GTFS City - Yol Haritası

Bu belge ürünün orta ve uzun vadeli geliştirme başlıklarını toplar.
Hedef, desktop ve web yüzeylerini bozmadan yeni özellikleri kontrollü biçimde eklemektir.

## Alanlar

- Tür: `Yeni özellik` veya `Geliştirme`
- Öncelik: `Yüksek`, `Orta`, `Düşük`
- Platform: `Desktop`, `Web`, `Her ikisi`
- Durum: `Planlandı`, `İnceleniyor`, `Geliştiriliyor`, `Beklemede`, `Tamamlandı`

## Ürün Yol Haritası

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| GTFS-RT Entegrasyonu | Yeni özellik | Yüksek | Desktop | Planlandı | Canlı araç konumu, gecikme ve gerçek zamanlı operasyon görünürlüğü |
| Nasıl Giderim / Yol Tarifi | Geliştirme | Yüksek | Her ikisi | Planlandı | Hat ve aktarma mantığıyla çalışan anlaşılır yol tarifi üretmek |
| Hat ve Durak Bazlı Sorgulama | Yeni özellik | Yüksek | Her ikisi | Planlandı | Seçili hat, durak, yön ve zaman bağlamında hedefli sorgulama sunmak |
| Sefer Saatleri | Yeni özellik | Yüksek | Her ikisi | Planlandı | Hat bazlı sefer saatlerini okunabilir biçimde göstermek |
| Hat Seçiminde Yön Filtresi | Yeni özellik | Yüksek | Her ikisi | Tamamlandı | `direction_id` bazlı yön seçimi ile durak, araç ve panelleri birlikte filtrelemek |
| Araç İkonu Üzerinde Hat Kodu / Yön | Yeni özellik | Yüksek | Her ikisi | Tamamlandı | Araç ikonunun üstünde hat kodu ve yön bilgisini görünür kılmak |
| 3D Bina Katmanı | Yeni özellik | Orta | Desktop | Planlandı | Harita bağlamını güçlendirmek |
| Sinematik Geliştirmeleri | Geliştirme | Orta | Her ikisi | Planlandı | Açı, yön, hız ve kamera geçişlerini veri odaklı hale getirmek |
| Yoğunluk Heatmap | Geliştirme | Orta | Her ikisi | Planlandı | Çap ve renk parametrelerini kullanıcıya açmak |
| Durak 300 m Katmanı | Geliştirme | Orta | Her ikisi | Tamamlandı | 300 m kapsama katmanını ayarlanabilir sunmak |
| Bunching Alarmı | Geliştirme | Orta | Her ikisi | Planlandı | Alarmı daha anlaşılır ve daha okunur göstermek |
| Bekleme Süresi 3D | Geliştirme | Orta | Her ikisi | Planlandı | Anlık zamana göre güncelleme ve puanlama eklemek |
| Headway Çizgileri | Geliştirme | Orta | Her ikisi | Planlandı | Çizgi atılacak araç sayısını kullanıcıya seçtirmek |
| Kuyruklama Analizi | Yeni özellik | Orta | Her ikisi | Planlandı | Fade izi yerine daha anlamlı operasyon analizi sunmak |
| Durak Bağlantı Skoru | Yeni özellik | Orta | Her ikisi | Geliştiriliyor | Lokal güç ve ağ açılımını özetleyen stop-bazlı yapı skoru üretmek |
| Bağlantı Kareleri (Beta) | Yeni özellik | Orta | Her ikisi | Geliştiriliyor | Durak bağlantı skorlarını kare grid üzerinde görselleştirmek; önce performans, renk kalibrasyonu ve boş hücre sunumunu güvenilir hale getirmek |
| PTAL / Erişilebilirlik Analizi Modu | Yeni özellik | Orta | Her ikisi | İnceleniyor | Ayrık analiz modu olarak daha akademik erişilebilirlik ölçümleri sunmak |

## Web Yol Haritası

| Başlık | Tür | Öncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| Açık Kaynak GTFS Link Havuzu | Yeni özellik | Orta | Web | Geliştiriliyor | Örnek veri kartlarını güncel tutmak |
| Web Demo Olgunlaştırma | Geliştirme | Orta | Web | Geliştiriliyor | Pages demosunu daha tam özellikli ama güvenli kapsamda tutmak |
| GitHub Pages Sayfa Tasarımı | Geliştirme | Orta | Web | Planlandı | Vitrin sayfasını daha profesyonel hale getirmek |
| Web Demo Baskı ve Ekran Görüntüsü Araçları | Geliştirme | Orta | Web | Tamamlandı | Ekran görüntüsü ve baskı araçlarını webde kararlı sunmak |

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
| Tam I18n Kapsamı | Geliştirme | Orta | Her ikisi | İnceleniyor | Dinamik metinleri TR/EN destekli hale getirmek |
| Encoding Standardizasyonu | Geliştirme | Yüksek | Her ikisi | Planlandı | Metin dosyalarını tek kodlama standardına toplamak |
| Persisted Snapshot Cache | Geliştirme | Orta | Her ikisi | İnceleniyor | Ağır analiz snapshotlarını yeniden kullanılabilir hale getirmek |

Öncelikli teknik borç triage sırası:

1. `script.js` sorumluluk şişmesi ve orkestrasyon/domain/UI/platform mantığının aynı dosyada toplanması
2. Gerçek state ownership eksikliği ve geçici bridge katmanlarının kalıcılaşması
3. Desktop/web çift kopya ve senkronizasyon maliyeti

## Notlar

- `Bağlantı Kareleri (Beta)` için mevcut yön: `skipWalk/maxSecs` korunur; renk eşikleri görünüm dağılımına göre kalibre edilir, gri hücreler kontrollü geri gelir ve legend metriği açık anlatır.

- `Durak Bağlantı Skoru`, `accessibility` değil `connectivity` çizgisinde adlandırılır.
- Tüm ağa yayılan ağır analizler canlı toggle mantığıyla değil, tercihen precompute veya analiz modu ile sunulur.
- `Bağlantı Kareleri` için ilk hedef kullanıcı hissi ve performans; tam akademik doğruluk değil.
- `PTAL` veya benzeri daha akademik erişilebilirlik ölçümleri ayrı analiz modu olarak düşünülmelidir.
