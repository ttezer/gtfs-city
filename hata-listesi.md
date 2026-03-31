# GTFS City — Hata Listesi

Bu belge, açık hata kayıtlarını ve veri doğruluğu başlıklarını toplar. Ürün geliştirme fikirleri bu dosyada değil, `yol-haritasi.md` içinde tutulur.

## Alanlar

- **Öncelik:** `🔴 Yüksek`, `🟠 Orta`, `🟡 Düşük`
- **Platform:** `Desktop`, `Web`, `Her ikisi`
- **Durum:** `Açık`, `İnceleniyor`, `Veri kontrolü`, `Çözüldü`

## Açık Kayıtlar

| Başlık | Tür | Öncelik | Platform | Durum | Etki |
|---|---|---|---|---|---|
| Durak Aramada Liste Kapanıyor | Bug | 🔴 Yüksek | Her ikisi | Açık | Arama deneyimi bozuluyor |
| Kocaeli Verisinde Hat Seçiminde Duraklar Eksik Görünüyor | Bug / Veri kontrolü | 🔴 Yüksek | Her ikisi | İnceleniyor | Seçili hatta ait tüm durakların görünmediği algısı oluşuyor |

## Notlar

- `Durak Aramada Liste Kapanıyor` kaydında arama kutusu ve sonuç listesinin etkileşim akışı yeniden gözden geçirilmeli.
- `Kocaeli Verisinde Hat Seçiminde Duraklar Eksik Görünüyor` kaydında şu başlıklar kontrol edilmeli:
  - `pickup_type` / `drop_off_type`
  - yön filtresi etkisi
  - odaklı hat görünürlüğü
  - uygulamadaki liste kısıtlama koşulları

## Kullanım Notu

- Çözüm uygulandığında durum güncellenir veya kayıt kaldırılır.
- Yeni hata eklerken kısa başlık, etki ve veri kontrol notu birlikte yazılır.
