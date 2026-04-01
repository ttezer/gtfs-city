# GTFS City - Çalışma Kontrol Listesi

Bu dosya, repo içinde tekrar eden unutmaları azaltmak için tutulur. Her iş turunda önce bu dosya, sonra ilgili issue ve plan belgeleri kontrol edilir.

## Tur Öncesi

- `README.md`, `isplani.md`, `yol-haritasi.md`, `CHANGELOG.md` ve gerekirse `hata-listesi.md` kontrol edilir.
- İş zaten tamamlandıysa yeniden açılmaz.
- Yol haritasındaki ilgili başlığın durumu doğrulanır.

## Uygulama Sırasında

- Değişiklik odaklı ve küçük tutulur.
- Desktop ve web etkisi birlikte düşünülür.
- Web demo kopyaları gerekiyorsa senkronlanır.
- Türkçe karakter ve encoding riski olan dosyalarda dikkatli ilerlenir.

## PR Öncesi

- Gerekli kayıtlar işlenir:
  - `isplani.md`
  - `yol-haritasi.md`
  - `CHANGELOG.md`
- Gerekirse README veya CONTRIBUTING güncellenir.
- Testler çalıştırılır.

## PR Mesajı İçin Zorunlu Hatırlatma

- PR linki verilir.
- Önerilen label'lar mutlaka yazılır.
- Merge öncesi hangi testlerin geçtiği belirtilir.

## Merge Sonrası

- `main` branch güncellenir.
- Merge sonrası `main` üzerinde tekrar çalıştırılır:
  - `npm run check:text`
  - `npm test`
  - gerekiyorsa ilgili ek kontrol komutu
- Lokal çalışma branch'i silinir.
- Yol haritasında tamamlanan iş varsa `Tamamlandı` durumuna çekilir.

## Örnek Veri Bakımı

- `npm run check:samples` ile örnek veri güncelliği kontrol edilir.
- Fark varsa `npm run update:samples` çalıştırılır.
- Script fark gördüğünde kullanıcıdan ayrıca onay istemeden log ile bilgi verir ve günceller.
