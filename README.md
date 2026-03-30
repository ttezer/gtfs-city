# GTFS City

GTFS City, GTFS ZIP verisini yükleyip toplu taşıma ağını masaüstünde incelemek için hazırlanmış Electron tabanlı analiz ve görselleştirme uygulamasıdır.

## Öne Çıkanlar

- tek aktif GTFS veri seti
- upload-first başlangıç akışı
- hat, durak ve araç detay panelleri
- headway, bekleme, yoğunluk ve kapsama katmanları
- HTTPS GTFS ZIP linkinden yükleme (`Electron` içinde)

## Çalışma Modeli

- Uygulama boş landing ekranla açılır.
- Kullanıcı GTFS ZIP yükler veya HTTPS ZIP linki verir.
- Veri hazır olunca `HARİTAYI AÇ` ile çalışma ekranına geçilir.
- Aynı anda yalnızca tek yüklenmiş veri seti tutulur.

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
2. `GTFS ZIP YÜKLE` ile dosya seç veya Electron içinde HTTPS link kullan.
3. Yükleme tamamlanınca `HARİTAYI AÇ` ile haritaya geç.
4. Sol menüden hat tipleri, görünürlük ve analiz katmanlarını yönet.
5. Hat, durak ve araç panellerini kullanarak veri incelemesi yap.

## Ana Dosyalar

- `index.html` — arayüz iskeleti
- `script.js` — orkestrasyon ve ortak state
- `data-manager.js` — GTFS yükleme ve runtime apply
- `city-manager.js` — aktif veri seti kartı ve görünürlük akışı
- `service-manager.js` — çalışma takvimi ve servis filtresi
- `map-manager.js` — Deck.gl katmanları
- `ui-manager.js` — paneller ve kullanıcı etkileşimleri
- `simulation-engine.js` — simülasyon ve replay döngüsü
- `electron/main.js` / `electron/preload.js` — Electron köprüsü

## Dokümanlar

- `mimari.md` — teknik yapı
- `kontrol.md` — çalışma kuralları
- `isplani.md` — güncel durum ve sonraki işler
- `docs/` — GitHub Pages vitrin dosyaları

## GitHub Pages

Statik vitrin sayfası `docs/` klasöründedir.

GitHub Pages açmak için:

1. GitHub repo ayarlarına gir.
2. `Pages` bölümünde `Deploy from a branch` seç.
3. Branch olarak `main`, klasör olarak `/docs` seç.
