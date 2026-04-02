# GTFS City

GTFS City, GTFS ZIP verisini yükleyip toplu taşıma ağını incelemek için geliştirilen bir GTFS viewer ve analiz aracıdır. Masaüstünde tam Electron akışını, web tarafında ise ücretsiz demo deneyimini sunar.

English README: [README.en.md](./README.en.md)

## Öne Çıkanlar

- tek aktif GTFS veri seti
- upload-first başlangıç akışı
- hat, durak ve araç detay panelleri
- headway, bekleme, yoğunluk ve kapsama katmanları
- HTTPS GTFS ZIP linkinden yükleme (`Electron` içinde)
- ekran görüntüsü aracı ve çoklu çıktı stili
- hat baskısı ve durak baskısı için önizleme / A4 çıktısı
- bundled örnek veri kartları: Konya, İzmir ESHOT, Bordeaux, Gaziantep, Houston
- Durak 300 m için yarıçap, görünüm ve stil kontrolleri

## Son Güncellemeler

- Electron için ekran görüntüsü akışı geliştirildi.
- Ekran görüntüsü stilleri genişletildi: `Orijinal`, `Kurumsal`, `Poster`, `Blueprint`, `Yüksek Kontrast`, `Transit Poster`, `Cartoon Map`, `Minimal White`, `Schematic`, `Print Friendly`, `Neo Transit`, `Vintage Metro`, `Heat Poster`, `Comic Panel`.
- Ekran görüntüsüne çözünürlük seçeneği eklendi.
- Çıktılara marka metni eklendi: `© GTFS City tarafından üretilmiştir • https://ttezer.github.io/gtfs-city/app/`
- Hat ve durak baskı araçları ayrı butonlar olarak eklendi.
- Hat ve durak baskı önizleme / A4 çıktısı akışı eklendi.
- Hat baskısında başlık, görsel düzen ve `Gidiş` bölüm sırası güncellendi.
- Durak baskısında tabela tarzı görünüm, özel ikon, başlık ve metin düzeltmeleri yapıldı.
- ZIP değiştiğinde hat/durak baskı ekranlarında eski verinin kalması sorunu düzeltildi.
- `Haritayı Aç` sonrası boş harita sorunu için resize ve toparlama düzeltmesi yapıldı.
- Print preview sırasında oluşan WebGL context kaybı için toparlama eklendi.
- Genel WebGL context loss sonrası harita ve deck toparlama mantığı eklendi.
- GTFS worker tarafında gereksiz `gtfs-math-utils.js` import fallback uyarısı temizlendi.
- Durak 300 m katmanı için yarıçap, görünüm modu, dolgu rengi, dolgu saydamlığı, çizgi rengi ve çizgi kalınlığı kontrolleri eklendi.
- `300 m` değerinin yarıçap olduğu netleştirildi, katman izokrondan bağımsız hale getirildi ve `radiusMinPixels` ayarı iyileştirildi.
- Web demo tarafına `Durak 300 m`, ekran görüntüsü aracı, hat/durak baskı araçları ve örnek veri kartları taşındı.
- Canlı web demo kontrol edildi; yeni HTML'in yayında olduğu ve normal sekmede görülen farkın cache kaynaklı olduğu doğrulandı.
- Web demo cache kırma için `index.html` ve `docs/app/index.html` içinde `style.css`, `favicon.ico` ve yerel JS dosyalarına sürüm parametresi eklendi.

## Ekran Görüntüleri

### Giriş ekranı

![Giriş sayfası](./docs/screens/giris_sayfasi.jpg)

### GTFS yükleme örneği

![GTFS yükleme örneği](./docs/screens/ornek_GTFS_Konya.jpg)

### Hat paneli

![Hat bilgi paneli](./docs/screens/hat_bilgi.jpg)

### Durak paneli

![Durak bilgi paneli](./docs/screens/durak_bilgi.jpg)

### Araç paneli

![Araç bilgi paneli](./docs/screens/arac_bilgi.jpg)

### İzokron analizi

![Durak bazlı izokron analizi](./docs/screens/durak_bazli_izokran.jpg)

## Çalışma Modeli

- Uygulama boş landing ekranla açılır.
- Kullanıcı GTFS ZIP yükler veya HTTPS ZIP linki verir.
- Veri hazır olunca `Haritayı Aç` ile çalışma ekranına geçilir.
- Aynı anda yalnızca tek yüklenmiş veri seti tutulur.

## Dil Seçeneği

- Uygulama varsayılan olarak Türkçe açılır.
- İngilizce kullanmak için landing ekranının sağ üstündeki dil seçiciden `English` seçin.
- Dil seçimi yerel olarak saklanır ve sonraki açılışlarda korunur.

## Kurulum

Gereksinimler:

- `Node.js`
- `npm`

Kurulum:

```bash
npm install
```

## Çalıştırma

Geliştirme:

```bash
npm start
```

Test:

```bash
npm test
```

Windows paketleme:

```bash
npm run build:win -- --dir
```

## Kullanım

1. Uygulamayı aç.
2. `GTFS ZIP Yükle` ile dosya seç veya Electron içinde HTTPS link kullan.
3. Yükleme tamamlanınca `Haritayı Aç` ile haritaya geç.
4. Sol menüden hat tipleri, görünürlük ve analiz katmanlarını yönet.
5. Hat, durak ve araç panellerini kullanarak veri incelemesi yap.

Landing ekranındaki `Örnek veriyle dene` kartları bundled örnek paketleri kullanır. Güncel örnek setleri:

- Konya
- İzmir ESHOT
- Bordeaux
- Gaziantep
- Houston

## Nereye Bakmalıyım?

- Hata raporu için: `Issues` üzerinde `bug` etiketiyle yeni kayıt açın.
- Bir fix arıyorsanız: önce `hata-listesi.md`, sonra `CHANGELOG.md` ve ilgili `Issues` kayıtlarını kontrol edin.
- Yeni özellik için: `Issues` üzerinde `feature` etiketiyle talep açın veya mevcut talepleri inceleyin.
- Öncelikler ve sonraki işler için: `isplani.md` ve `yol-haritasi.md` dosyalarına bakın.
- Katkı ve PR akışı için: `CONTRIBUTING.md` dosyasını izleyin.

## Ana Dosyalar

- `index.html` - arayüz iskeleti
- `script.js` - orkestrasyon ve ortak state
- `data-manager.js` - GTFS yükleme ve runtime apply
- `city-manager.js` - aktif veri seti kartı ve görünürlük akışı
- `service-manager.js` - çalışma takvimi ve servis filtresi
- `map-manager.js` - Deck.gl katmanları
- `ui-manager.js` - paneller ve kullanıcı etkileşimleri
- `simulation-engine.js` - simülasyon ve replay döngüsü
- `electron/main.js` / `electron/preload.js` - Electron köprüsü

## Dokümanlar

- `mimari.md` - teknik yapı
- `kontrol.md` - çalışma kuralları
- `isplani.md` - güncel durum ve sonraki işler
- `yol-haritasi.md` - orta ve uzun vadeli geliştirme başlıkları
- `hata-listesi.md` - açık hata ve veri doğruluk sorunları
- `desktop-web-notu.md` - platform sınırları
- `CHANGELOG.md` - kısa ürün kilometre taşları
- `CONTRIBUTING.md` - katkı akışı
- `docs/` - GitHub Pages vitrin dosyaları

## Türkiye'deki Açık Veri GTFS Kaynakları

- Konya Büyükşehir Belediyesi: [Toplu Taşıma GTFS Verileri](https://acikveri.konya.bel.tr/tr/dataset/toplu-tasima-gtfs-verileri)
- İzmir Büyükşehir Belediyesi: [Toplu Ulaşım GTFS Verileri](https://acikveri.bizizmir.com/tr/dataset/toplu-ulasim-gtfs-verileri)
- Gaziantep Büyükşehir Belediyesi: [Toplu Ulaşım GTFS Verileri](https://acikveri.gaziantep.bel.tr/dataset/toplu-ulasim-gtfs-verileri)
- Kocaeli Büyükşehir Belediyesi: [GTFS veri kaynağı](https://veri.kocaeli.bel.tr/datasets/e2a87342-d39a-4742-ae25-165e10d2bc72)
- İETT: [GTFS Verisi](https://data.ibb.gov.tr/dataset/iett-gtfs-verisi)
- İstanbul Büyükşehir Belediyesi: [Public Transport GTFS Data](https://data.ibb.gov.tr/dataset/public-transport-gtfs-data)

> Not: Bu bağlantılar dış açık veri portallarına aittir. Erişilebilirlik, dosya formatı ve güncellik ilgili kurumların sorumluluğundadır.

## GitHub Pages

Statik vitrin sayfası `docs/` klasöründedir.

> Not: Ürün vitrini için Pages kullanılır; README tekrar eden kurulum talimatı dışında Pages içeriğini kopyalamaz.
