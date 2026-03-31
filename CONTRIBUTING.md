# GTFS City — Katkı Rehberi

Bu repo kamuya açık ve katkıya açıktır. Amaç, çalışan masaüstü ve web akışını bozmadan kontrollü iyileştirme yapmaktır.

## Temel İlke

- Önce problemi netleştir.
- Sonra etkilenen akışı sınırla.
- En küçük doğru değişikliği yap.
- Değişiklikten sonra metin ve test kontrolü çalıştır.

## Katkı Türleri

- hata düzeltmesi
- veri doğruluğu düzeltmesi
- performans iyileştirmesi
- UI/UX iyileştirmesi
- yeni özellik
- dokümantasyon

## Çalışma Kuralları

- Tek aktif GTFS veri seti modeli korunur.
- Upload-first başlangıç akışı bozulmaz.
- Desktop ve Web akışları birbirine karıştırılmaz.
- Türkçe içeren metin dosyalarında güvenli yama akışı kullanılır.
- Büyük refactor yerine hedefli refactor tercih edilir.
- Yeni özellikler önce `yol-haritasi.md` veya `hata-listesi.md` içinde görünür olmalıdır.

## Geliştirme Akışı

1. İlgili sorunu veya öneriyi önce issue olarak aç veya mevcut issue ile ilişkilendir.
2. Etkilenen dosyaları ve akışı kısa notla netleştir.
3. Gerekirse `isplani.md` yerine `yol-haritasi.md` veya `hata-listesi.md` güncelle.
4. Küçük ve odaklı değişiklik yap.
5. Aşağıdaki doğrulamaları çalıştır.

## Zorunlu Doğrulama

En az:

```bash
npm run check:text
node --test --test-concurrency=1 --test-isolation=none
```

Dağıtım veya paketleme etkileniyorsa:

```bash
npm run build:win -- --dir
```

## Belge Kullanımı

- `README.md` — ürün özeti ve kullanım
- `mimari.md` — teknik yapı ve modül dağılımı
- `kontrol.md` — çalışma kuralları
- `isplani.md` — kısa güncel durum
- `yol-haritasi.md` — özellik ve geliştirme başlıkları
- `hata-listesi.md` — açık hata ve veri doğruluk sorunları

## Pull Request Beklentisi

- Başlık kısa ve açık olmalı.
- Değişiklik kapsamı tek konuya odaklı olmalı.
- Kullanıcı davranışını etkileyen işlerde kısa açıklama eklenmeli.
- Görsel değişiklik varsa ekran görüntüsü eklenmeli.

## Özellikle Kaçınılacaklar

- public repo içinde büyük veri dump dosyaları
- preload mantığını geri getiren değişiklikler
- tek seferde büyük, açıklamasız refactor
- Desktop çalışan akışı bozan web denemeleri
