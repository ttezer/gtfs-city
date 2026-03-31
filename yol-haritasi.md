# GTFS City - Yol Haritasi

Bu belge, urunun orta ve uzun vadeli gelistirme basliklarini toplar. Hedef, kararli masaustu ve web surumunu bozmadan yeni ozellikleri kontrollu bicimde eklemektir.

## Alanlar

- **Tur:** `Yeni ozellik` veya `Gelistirme`
- **Oncelik:** `Yuksek`, `Orta`, `Dusuk`
- **Platform:** `Desktop`, `Web`, `Her ikisi`
- **Durum:** `Planlandi`, `Inceleniyor`, `Gelistiriliyor`, `Beklemede`, `Tamamlandi`

## Urun Yol Haritasi

| Baslik | Tur | Oncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| GTFS-RT Entegrasyonu | Yeni ozellik | Yuksek | Desktop | Planlandi | Canli arac konumu, gecikme ve gercek zamanli operasyon gorunurlugu |
| Nasil Giderim / Yol Tarifi | Gelistirme | Yuksek | Her ikisi | Planlandi | Hat ve aktarma mantigiyla calisan anlasilir yol tarifi uretmek |
| Hat Seciminde Yon Filtresi | Yeni ozellik | Yuksek | Her ikisi | Planlandi | `direction_id` bazli yon secimi ile durak, arac ve panelleri birlikte filtrelemek |
| Hat ve Durak Bazli Sorgulama | Yeni ozellik | Yuksek | Her ikisi | Planlandi | Secili hat, durak, yon ve zaman baglaminda hedefli sorgulama sunmak |
| Sefer Saatleri | Yeni ozellik | Yuksek | Her ikisi | Planlandi | Hat bazli sefer saatlerini okunabilir bicimde gostermek |
| Arac Ikonu Uzerinde Hat Kodu / Yon | Yeni ozellik | Yuksek | Her ikisi | Planlandi | Arac ikonunun ustunde hat kodu ve yon bilgisini gorunur kilmak |
| 3D Bina Katmani | Yeni ozellik | Orta | Desktop | Planlandi | Harita baglamini guclendirmek |
| Sinematik Gelistirmeleri | Gelistirme | Orta | Her ikisi | Planlandi | Aci, yon, hiz ve kamera gecislerini veri odakli hale getirmek |
| Yogunluk Heatmap | Gelistirme | Orta | Her ikisi | Planlandi | Cap ve renk parametrelerini kullaniciya acmak |
| Durak 300 mt Katmani | Gelistirme | Orta | Her ikisi | Planlandi | Mesafe, cizgi rengi ve dolgu rengini ayarlanabilir yapmak |
| Bunching Alarmi | Gelistirme | Orta | Her ikisi | Planlandi | Alarmi daha anlasilir ve daha okunur gostermek |
| Bekleme Suresi 3D | Gelistirme | Orta | Her ikisi | Planlandi | Anlik zamana gore guncelleme ve puanlama eklemek |
| Headway Cizgileri | Gelistirme | Orta | Her ikisi | Planlandi | Cizgi atilacak arac sayisini kullaniciya sectirmek |
| Arac Izleri Yerine Kuyruklama Analizi | Yeni ozellik | Orta | Her ikisi | Planlandi | Fade iz yerine daha anlamli operasyon analizi sunmak |
| Izokron Analizi Puanlama | Yeni ozellik | Orta | Her ikisi | Planlandi | Veriye gore secili duraga skor uretmek |

## Web Yol Haritasi

| Baslik | Tur | Oncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| Acik Kaynak GTFS Link Havuzu | Yeni ozellik | Orta | Web | Planlandi | Web surumunde ornek acik veri baglantilari sunmak |
| Web Demo Olgunlastirma | Gelistirme | Orta | Web | Gelistiriliyor | Pages demosunu daha tam ozellikli ama guvenli kapsamda tutmak |
| GitHub Pages Sayfa Tasarimi | Gelistirme | Orta | Web | Planlandi | Vitrin sayfasini daha profesyonel ve urun kimligine uygun hale getirmek |

## Teknik Borc ve Refactor Plani

| Baslik | Tur | Oncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| State Ownership Temizligi | Gelistirme | Yuksek | Her ikisi | Planlandi | `state-manager.js` dosyasini gercek merkezi durum katmanina donusturmek |
| `script.js` Sorumluluk Azaltma | Gelistirme | Yuksek | Her ikisi | Planlandi | Ana dosyayi orkestrasyon katmani olarak tutmak |
| Trip Eslestirme ve Picking Zinciri | Gelistirme | Yuksek | Her ikisi | Planlandi | Arac tiklama ve panel eslesmesini daha deterministik hale getirmek |
| Durak Paneli Hesaplarini Ayristirma | Gelistirme | Orta | Her ikisi | Planlandi | Durak ozetleri ve varis hesaplarini ayri util katmanina tasimak |
| Katman Hesabi ve Render Ayrimi | Gelistirme | Yuksek | Her ikisi | Planlandi | `map-manager.js` icinde hesaplama ile cizim sorumlulugunu ayirmak |
| Toggle Spam ve UI Kilitlenmesi | Gelistirme | Orta | Her ikisi | Planlandi | Art arda ac/kapa islemlerinde yasanan kilitlenmeleri azaltmak |
| Web ve Desktop Adapter Ayrimi | Gelistirme | Orta | Her ikisi | Planlandi | Platforma ozel akislarI adapter katmaninda toplamak |
| Tam I18n Kapsami | Gelistirme | Orta | Her ikisi | Inceleniyor | Landing disindaki panel, servis, uyarilar ve dinamik metinleri TR/EN destekli hale getirmek |
| Encoding Standardizasyonu | Gelistirme | Yuksek | Her ikisi | Planlandi | Metin dosyalarini tek kodlama standardina toplamak, bozuk karakter riskini ve yama kirilmalarini kaldirmak |

## Repo Yonetimi ve Kalite

| Baslik | Tur | Oncelik | Platform | Durum | Hedef |
|---|---|---|---|---|---|
| Issue Tabanli Calisma | Gelistirme | Yuksek | Her ikisi | Inceleniyor | Her kullanici gorunur degisiklik veya teknik borc isini issue ile izlenebilir hale getirmek |
| Degisiklik Kaydi Disiplini | Gelistirme | Orta | Her ikisi | Inceleniyor | README, `CHANGELOG.md`, `isplani.md` ve gerekiyorsa roadmap kayitlarini tutarli hale getirmek |
| PR Sablonu ve Cikis Kriterleri | Gelistirme | Orta | Her ikisi | Planlandi | Test, metin kontrolu, ekran goruntusu ve issue bagini zorunlu kontrol listesine donusturmek |

## Notlar

- `GTFS-RT Entegrasyonu` ilk fazda `VehiclePositions`, ikinci fazda `TripUpdates` ile ele alinmali.
- `Arac Ikonu Uzerinde Hat Kodu / Yon` yogun sahnelerde okunabilirlik ve cakisma yonetimiyle birlikte tasarlanmali.
- `3D Bina Katmani` performans etkisi nedeniyle ac/kapa kontrollu olmali.
- `Headway Cizgileri` yon bazli yorumlamayi korumali.
- `Acik Kaynak GTFS Link Havuzu` yalnizca guvenilir ve acik kaynak veri saglayicilari icermeli.
- `Web Demo Olgunlastirma` masaustu akisina bozmadan ilerlemeli.
- `Trip Eslestirme ve Picking Zinciri` isinde `findTripIdx` mantigi daha kucuk ve indeks tabanli hale getirilmeli.
- `Web ve Desktop Adapter Ayrimi` linkten yukleme, dosya erisimi ve worker davranislarini temiz bicimde ayirmali.
- `Tam I18n Kapsami` issue bazli parcali rollout ile ilerlemeli; tek seferde tum repo cevirisine girilmemeli.
- `Encoding Standardizasyonu` tamamlanmadan metin agirlikli refactor ve toplu dokuman duzenlemelerinde dikkatli olunmali.
