# gtfs-city — Geliştirme Kuralları

Bu dosya, repoda çalışırken uyulacak kısa kurallar listesidir. Canlı iş planı için her zaman `isplani.md` esas alınır.

## 1. Öncelik Sırası

- Canlı plan ve faz durumu: `isplani.md`
- Ürün ve kurulum özeti: `README.md`
- Teknik yapı ve veri akışı: `mimari.md`

## 2. Dokümantasyon Kuralı

- Tamamlanan işleri `isplani.md` içinden silme; yeni kayıtları sona ekle.
- Her faz veya önemli düzeltme sonrası `isplani.md` güncelle.
- Yeni teknik kararlar mevcut mimariyle çelişiyorsa önce `mimari.md` ve `isplani.md` hizalanır.

## 3. Kod Yapısı

- `README.md` ürün ve kullanım belgesidir; teknik ayrıntı ile doldurma.
- `mimari.md` modüller, veri akışı ve çalışma modeli içindir.
- `script.js` ana orkestrasyon ve legacy köprü katmanıdır; yeni büyük iş mantığını buraya yığma.
- Yeni iş mantığı mümkün olduğunca ilgili manager veya util dosyasına eklenir.
- Sabitler ve tip/meta tanımları `config.js` üzerinden okunur; gereksiz hardcode ekleme.

## 4. Veri ve Performans

- Büyük preload dosyalarını (`trips_data.js`, `shapes_data.js`, `lookup_data.js`) gereksiz yere elde düzenleme.
- Preload yeniden üretimi gerektiğinde `scripts/regenerate-istanbul-preload.js` kullan.
- Simülasyon döngüsünde O(N²) maliyetli taramalardan kaçın; cache-first yaklaşımı koru.

## 5. Doğrulama

- Mantıksal değişiklik sonrası en az:
  - `node --test --test-concurrency=1 --test-isolation=none`
- Paketleme veya preload/veri değişikliği sonrası ayrıca:
  - `npm run build:win -- --dir`

## 6. Çalışma Prensibi

- Davranışı değiştiren işlerde regresyon riski açıkça değerlendirilir.
- Türkçe metinlerde UTF-8 korunur; mojibake üreten shell akışlarından kaçınılır.
- Repo içi gerçek durum anlatılır; varsayım gerekiyorsa açıkça belirtilir.
