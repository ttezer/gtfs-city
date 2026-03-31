# GTFS City

GTFS City, GTFS ZIP verisini yukleyip toplu tasima agini masaustunde incelemek icin hazirlanmis Electron tabanli analiz ve gorsellestirme uygulamasidir.

English README: [README.en.md](./README.en.md)

## One Cikanlar

- tek aktif GTFS veri seti
- upload-first baslangic akisi
- hat, durak ve arac detay panelleri
- headway, bekleme, yogunluk ve kapsama katmanlari
- HTTPS GTFS ZIP linkinden yukleme (`Electron` icinde)

## Ekran Goruntuleri

### Giris ekrani

![Giris sayfasi](./docs/screens/giris_sayfasi.jpg)

### GTFS yukleme ornegi

![GTFS yukleme ornegi](./docs/screens/ornek_GTFS_Konya.jpg)

### Hat paneli

![Hat bilgi paneli](./docs/screens/hat_bilgi.jpg)

### Durak paneli

![Durak bilgi paneli](./docs/screens/durak_bilgi.jpg)

### Arac paneli

![Arac bilgi paneli](./docs/screens/arac_bilgi.jpg)

### Izokron analizi

![Durak bazli izokron analizi](./docs/screens/durak_bazli_izokran.jpg)

## Calisma Modeli

- Uygulama bos landing ekranla acilir.
- Kullanici GTFS ZIP yukler veya HTTPS ZIP linki verir.
- Veri hazir olunca `HARITAYI AC` ile calisma ekranina gecilir.
- Ayni anda yalnizca tek yuklenmis veri seti tutulur.

## Kurulum

Gereksinimler:

- `Node.js`
- `npm`

Kurulum:

```bash
npm install
```

## Calistirma

Gelistirme:

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

## Kullanim

1. Uygulamayi ac.
2. `GTFS ZIP YUKLE` ile dosya sec veya Electron icinde HTTPS link kullan.
3. Yukleme tamamlaninca `HARITAYI AC` ile haritaya gec.
4. Sol menuden hat tipleri, gorunurluk ve analiz katmanlarini yonet.
5. Hat, durak ve arac panellerini kullanarak veri incelemesi yap.

## Nereye Bakmaliyim?

- Hata raporu icin: `Issues` uzerinde `bug` etiketiyle yeni kayit acin.
- Bir fix ariyorsaniz: once `hata-listesi.md`, sonra `CHANGELOG.md` ve ilgili `Issues` kayitlarini kontrol edin.
- Yeni ozellik icin: `Issues` uzerinde `feature` etiketiyle talep acin veya mevcut talepleri inceleyin.
- Oncelikler ve sonraki isler icin: `isplani.md` ve `yol-haritasi.md` dosyalarina bakin.
- Katki ve PR akisi icin: `CONTRIBUTING.md` dosyasini izleyin.

## Ana Dosyalar

- `index.html` - arayuz iskeleti
- `script.js` - orkestrasyon ve ortak state
- `data-manager.js` - GTFS yukleme ve runtime apply
- `city-manager.js` - aktif veri seti karti ve gorunurluk akisi
- `service-manager.js` - calisma takvimi ve servis filtresi
- `map-manager.js` - Deck.gl katmanlari
- `ui-manager.js` - paneller ve kullanici etkilesimleri
- `simulation-engine.js` - simulasyon ve replay dongusu
- `electron/main.js` / `electron/preload.js` - Electron koprusu

## Dokumanlar

- `mimari.md` - teknik yapi
- `kontrol.md` - calisma kurallari
- `isplani.md` - guncel durum ve sonraki isler
- `yol-haritasi.md` - orta ve uzun vadeli gelistirme basliklari
- `hata-listesi.md` - acik hata ve veri dogruluk sorunlari
- `desktop-web-notu.md` - platform sinirlari
- `CHANGELOG.md` - kisa urun kilometre taslari
- `CONTRIBUTING.md` - katki akisi
- `docs/` - GitHub Pages vitrin dosyalari

## GitHub Pages

Statik vitrin sayfasi `docs/` klasorundedir.

> Not: Urun vitrini icin Pages kullanilir; README tekrar eden kurulum talimati disinda Pages icerigini kopyalamaz.
