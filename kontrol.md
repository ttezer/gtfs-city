# GTFS City — Çalışma Kuralları

## Öncelik Belgeleri

- `README.md` — ürün ve kullanım özeti
- `mimari.md` — teknik yapı
- `isplani.md` — mevcut durum, kararlar ve sonraki işler

## Çalışma İlkeleri

- Davranışı değiştiren işlerde önce etkilenmiş akış netleştirilir.
- Türkçe metinlerde UTF-8 korunur.
- `README.md`, `mimari.md`, `kontrol.md`, `isplani.md`, `docs/*.html`, `docs/*.md`, `package.json` gibi metin dosyalarına shell üzerinden here-string ile çok satırlı içerik yazılmaz.
- Türkçe içeren metin dosyalarında yalnızca güvenli yama akışı kullanılır.
- Büyük refactor yerine hedefli değişiklik tercih edilir.
- Yeni iş mantığı ilgili manager veya util dosyasına eklenir.
- `script.js` gereksiz büyütülmez; orkestrasyon ve ortak state katmanı olarak tutulur.

## Veri İlkeleri

- Tek aktif GTFS veri seti modeli korunur.
- Upload-first akış bozulmaz.
- Büyük örnek veri dump'ları repo içine yeniden sokulmaz.
- Linkten yükleme yalnızca HTTPS ile ve Electron içinde yapılır.

## Doğrulama

En az:

```bash
node --test --test-concurrency=1 --test-isolation=none
```

Paketleme veya dağıtım öncesi:

```bash
npm run build:win -- --dir
```

Ek metin doğrulaması:

```bash
npm run check:text
```
