# GTFS City

GTFS City, GTFS ZIP verisini yükleyip toplu taşıma ağını harita üzerinde incelemek için hazırlanmış Electron tabanlı masaüstü uygulamadır.

## Kapsam

- GTFS ZIP yükleme ve doğrulama
- Hat, durak ve araç görselleştirme
- Simülasyon saati ve replay akışı
- Hat tipi filtresi ve odaklı hat görünümü
- Headway, bekleme, yoğunluk ve kapsama katmanları
- Durak, araç ve hat detay panelleri
- HTTPS GTFS ZIP linkinden yükleme (yalnızca Electron)

## Çalışma Modeli

Uygulama artık tek veri seti mantığıyla çalışır.

- Aynı anda yalnızca bir yüklenmiş GTFS veri seti tutulur.
- Başlangıç akışı upload-first modelidir.
- Veri yüklendikten sonra `Haritayı Aç` ile çalışma ekranına geçilir.
- Yerleşik preload başlangıcı kullanılmaz.

## Kurulum

Gereksinimler:

- Node.js
- npm

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
2. `GTFS ZIP YÜKLE` ile veri seç veya Electron içinde HTTPS link kullan.
3. Yükleme tamamlanınca `HARİTAYI AÇ` ile haritaya geç.
4. Sol menüden hat tipi, katmanlar ve görünürlük ayarlarını yönet.
5. Hat, durak veya araç seçerek detay panellerini incele.

## Ana Dosyalar

- `index.html` — arayüz iskeleti
- `script.js` — orkestrasyon ve ortak state
- `data-manager.js` — GTFS yükleme ve runtime apply
- `city-manager.js` — aktif veri seti ve şehir kartı akışı
- `service-manager.js` — çalışma takvimi ve servis filtresi
- `map-manager.js` — Deck.gl katmanları
- `ui-manager.js` — paneller ve kullanıcı etkileşimleri
- `simulation-engine.js` — animasyon ve simülasyon döngüsü
- `electron/main.js` / `electron/preload.js` — Electron köprüsü

## Dokümanlar

- `mimari.md` — güncel teknik yapı
- `kontrol.md` — çalışma kuralları
- `isplani.md` — güncel durum ve bundan sonrası
