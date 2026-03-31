# GTFS City — Hata Listesi

Bu belge, açık hata kayıtlarını ve veri doğruluğu başlıklarını toplar. Ürün geliştirme fikirleri bu dosyada değil, `yol-haritasi.md` içinde tutulur.

## Durum Alanları

- **Açık** — doğrulandı, çözüm bekliyor
- **İnceleniyor** — nedeni araştırılıyor
- **Veri kontrolü** — uygulama yerine veri kaynağı veya veri yorumu kontrol ediliyor

## Öncelik Düzeyi

- **Yüksek** — ürün kullanımını doğrudan bozan sorun
- **Orta** — kullanıcı deneyimini belirgin etkileyen sorun
- **Düşük** — çekirdek akışı bozmayan sorun

## Açık Kayıtlar

### Durak Aramada Liste Kapanıyor
- **Tür:** Bug
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** Açık
- **Etki:** arama deneyimi bozuluyor
- **Not:** arama kutusu ve sonuç listesinin etkileşim akışı yeniden gözden geçirilmeli

### Kocaeli Verisinde Hat Seçiminde Duraklar Eksik Görünüyor
- **Tür:** Bug / Veri kontrolü
- **Öncelik:** Yüksek
- **Platform:** Her ikisi
- **Durum:** İnceleniyor
- **Etki:** seçili hatta ait tüm durakların görünmediği algısı oluşuyor
- **Kontrol başlıkları:**
  - veri içindeki `pickup_type` / `drop_off_type`
  - yön filtresi etkisi
  - odaklı hat görünürlüğü
  - uygulamadaki liste kısıtlama koşulları

## Kullanım Notu

- Çözüm uygulandığında durum güncellenir veya kayıt kaldırılır.
- Yeni hata eklerken kısa başlık, etki ve veri kontrol notu birlikte yazılır.
