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
| Headway Çizgileri | Geliştirme | Orta | Her ikisi | Planlandı | Çizgi atılacak araç sayısını kullanıcıya seçtirmek |
| Kuyruklama Analizi | Yeni özellik | Orta | Her ikisi | Planlandı | Fade izi yerine daha anlamlı operasyon analizi sunmak |
| Durak Bağlantı Skoru | Yeni özellik | Orta | Her ikisi | Geliştiriliyor | Lokal güç ve ağ açılımını özetleyen stop-bazlı yapı skoru üretmek |
| Bağlantı Kareleri (Beta) | Yeni özellik | Orta | Her ikisi | Geliştiriliyor | Durak bağlantı skorlarını kare grid üzerinde görselleştirmek; önce performans, renk kalibrasyonu ve boş hücre sunumunu güvenilir hale getirmek |
| PTAL / Erişilebilirlik Analizi Modu | Yeni özellik | Orta | Her ikisi | İnceleniyor | Ayrık analiz modu olarak daha akademik erişilebilirlik ölçümleri sunmak |
| GTFS Özet & Takvim Sayfası | Yeni özellik | Yüksek | Her ikisi | Planlandı | Veri yüklendikten sonra haritaya geçmeden önce özet ekranı göster: rota/sefer/durak sayıları, tarih aralığı, heatmap takvim (günlük sefer yoğunluğu renk skalasıyla); hover'da gün detayı; buradan takvim seçimi yapılabilir, haritaya veya başka veri yüklemeye geçilebilir |

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
| State Ownership Temizliği | Geliştirme | Yüksek | Her ikisi | Planlandı | Runtime local state ile `AppState` sahipliğini netleştirip tek resmi model belirlemek |
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

## Keşif Havuzu — Rakip Analizinden Gelen Başlıklar

Rakip araçların incelenmesinden çıkan, henüz planlanmamış veya yüzeysel kalmış başlıklar.
Bu başlıklar şu an iş listesinde değil; öncelik kararı ayrıca verilecek.
Her başlıkta kısa bir uygulama notu var.

| Başlık | Öncelik | Platform | Durum | Uygulama Notu |
|---|---|---|---|---|
| GTFS Veri Kalitesi Raporu | Yüksek | Her ikisi | Keşif | GTFS feed yüklendiğinde `gtfs-validator.js` çıktısını bir rapor panelinde göster; eksik `shape_id`, geçersiz koordinat, sıfır süreli sefer gibi hataları sayılı ve filtrelenebilir listele. Kullanıcı her hataya tıklayınca haritada konuma odaklan. |
| Shape Hata Tespiti ve Geometri Uyarıları | Yüksek | Her ikisi | Keşif | `shapes.txt` boyunca ardışık noktalar arasındaki mesafeyi ve yönü kontrol et; segment başına Haversine sapma eşiği aş veya `shape_dist_traveled` monoton değilse uyarı üret. Uyarıları harita üzerinde kırmızı segment olarak göster, `shape_id` panelinde listele. |
| Headway İstatistik Paneli | Orta | Her ikisi | Keşif | Seçili hat veya durak için seçili zaman penceresinde seferleri grupla; medyan, p90, p95 headway ve güvenilirlik skoru (geciken sefer oranı) hesapla. Sonuçları hat panelinde küçük bir istatistik satırı olarak göster. `gtfs-math-utils.js`'e `computeHeadwayStats(trips, windowStart, windowEnd)` ekle. |
| Sefer Saatleri PDF / Tablo Dışa Aktarımı | Orta | Desktop | Keşif | Mevcut "Sefer Saatleri" görünümüne "Dışa Aktar" butonu ekle; tarayıcı `print` API'si veya `jsPDF` ile seçili hat + yön + günün seferlerini tablolu PDF olarak üret. Kolon: durak adı, planlanan varış, planlanan kalkış. |
| Çoklu GTFS Feed Desteği (Multimodal) | Orta | Desktop | Keşif | `AppState`'e `feeds: Map<feedId, {trips, shapes, stops, ...}>` ekle; mevcut tekil `trips/shapes/stops` yapısını feed-aware hale getir. Her feed ayrı renk grubuyla haritada gösterilebilir. İlk aşama: iki feed aynı anda yüklenip çakışma olmadan render edilmeli; planlama ve analiz entegrasyonu sonraki aşama. |
| Yoğun Saat / Peak Raporu | Orta | Her ikisi | Keşif | Seçili hat veya ağ genelinde 15'er dakikalık zaman dilimlerine göre aktif sefer sayısını hesapla; en yoğun 3 pencereyi peak olarak işaretle. Sonuçları bar chart veya tablolu metin panelde göster; `gtfs-math-utils.js`'e `computePeakWindows(trips, date, windowMinutes)` ekle. |
| OD Matrisi (Origin-Destination) Analizi | Düşük | Her ikisi | Keşif | Seçili güzergah çifti veya durak kümeleri için teorik OD matrisini hesapla; aktarma sayısı ve toplam süre bazında matris göster. İlk sürüm statik (GTFS'ten timetable-based), canlı veri gerekmez. `planner-manager.js`'teki mevcut Dijkstra altyapısını OD döngüsüne sar. |
| Senaryolama / What-If Analizi | Düşük | Desktop | Keşif | Kullanıcının sefer sıklığını veya yeni bir hat güzergahını geçici olarak değiştirip bağlantı skoru veya izokron üzerindeki etkiyi görmesine izin ver. Mimari: `AppState` üzerine geçici override katmanı ekle; analiz tamamlanınca override kaldır; orijinal state bozulmaz. |

## Notlar

- `Bağlantı Kareleri (Beta)` için mevcut yön: `skipWalk/maxSecs` korunur; renk eşikleri görünüm dağılımına göre kalibre edilir, gri hücreler kontrollü geri gelir ve legend metriği açık anlatır.

- `Durak Bağlantı Skoru`, `accessibility` değil `connectivity` çizgisinde adlandırılır.
- Tüm ağa yayılan ağır analizler canlı toggle mantığıyla değil, tercihen precompute veya analiz modu ile sunulur.
- `Bağlantı Kareleri` için ilk hedef kullanıcı hissi ve performans; tam akademik doğruluk değil.
- `PTAL` veya benzeri daha akademik erişilebilirlik ölçümleri ayrı analiz modu olarak düşünülmelidir.
