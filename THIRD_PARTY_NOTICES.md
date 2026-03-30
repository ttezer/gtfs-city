# Third-Party Notices

Bu proje, aşağıdaki üçüncü parti yazılım ve kütüphaneleri kullanır veya dağıtım sürecinde bunlardan yararlanır.

## Lisans Tarama Özeti

Yerel `package-lock.json` taramasında aşağıdaki lisans aileleri bulundu:

- MIT
- ISC
- BSD-2-Clause
- BSD-3-Clause
- Apache-2.0
- BlueOak-1.0.0
- Python-2.0
- WTFPL / çoklu lisans varyantları

Tarama sırasında **GPL / AGPL / LGPL zorunlu copyleft** lisansına sahip bağımlılık tespit edilmedi.

> Not: `jszip@3.10.1` paketi `MIT OR GPL-3.0-or-later` olarak yayınlanır. Bu projede kullanım tercihi MIT lisansı yönündedir.

## Başlıca Üçüncü Parti Bileşenler

### Runtime / CDN

1. **MapLibre GL JS**
   - Sürüm: `4.1.2`
   - Lisans: `BSD-3-Clause`
   - Kaynak: <https://github.com/maplibre/maplibre-gl-js>

2. **deck.gl**
   - Sürüm: `9.0.3`
   - Lisans: `MIT`
   - Kaynak: <https://github.com/visgl/deck.gl>

3. **JSZip**
   - Sürüm: `3.10.1`
   - Lisans: `MIT OR GPL-3.0-or-later`
   - Kaynak: <https://github.com/Stuk/jszip>
   - Bu projede MIT lisans seçeneği esas alınır.

### Masaüstü / Paketleme

4. **Electron**
   - Sürüm: `30.5.1`
   - Lisans: `MIT`
   - Kaynak: <https://github.com/electron/electron>

5. **electron-builder**
   - Sürüm: `24.13.3`
   - Lisans: `MIT`
   - Kaynak: <https://github.com/electron-userland/electron-builder>

## Dağıtım Notları

- Electron paket çıktılarında Electron lisans metni ayrıca üretilebilir (`LICENSE.electron.txt`).
- npm bağımlılık ağacında yer alan alt bağımlılıkların lisansları `package-lock.json` üzerinden denetlenmiştir.
- Üçüncü parti kütüphanelerin telif ve lisans metinleri kendi kaynak depolarında yer alır.

## Kapsam Dışı / Elle Doğrulanması Gerekenler

Aşağıdaki varlıklar otomatik npm lisans taramasına dahil değildir ve kaynak/provenance kontrolü ayrıca yapılmalıdır:

- `models/bus.glb`
- `models/tram.glb`
- proje içinde kullanılan özel logo ve ekran görüntüsü varlıkları

Bu dosyalar için lisans veya üretim kaynağı proje sahibi tarafından ayrıca doğrulanmalıdır.
