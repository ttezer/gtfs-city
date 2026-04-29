# GTFS City - Hata Listesi

Bu belge, açık hata kayıtlarını ve veri doğruluğu başlıklarını toplar.
Ürün geliştirme fikirleri bu dosyada değil, `yol-haritasi.md` içinde tutulur.

## Alanlar

- Öncelik: `Yüksek`, `Orta`, `Düşük`
- Platform: `Desktop`, `Web`, `Her ikisi`
- Durum: `Açık`, `İnceleniyor`, `Yerelde düzeltildi`, `Veri kontrolü`, `Çözüldü`

## Açık Kayıtlar

| Başlık | Tur | Öncelik | Platform | Durum | Etki |
|---|---|---|---|---|---|
| Kocaeli Verisinde Hat Seçiminde Duraklar Eksik Görünüyor | Bug / Veri kontrolü | Yüksek | Her ikisi | İnceleniyor | Seçili hatta ait tüm durakların görünmediği algısı oluşuyor |
| VBB feed'de cap dışı hatlar haritada shape/araç göstermiyor | Bug / Mimari | Yüksek | Her ikisi | İnceleniyor | Cap sınırını aşan hatlar listede görünür ama runtime verisi olmadığı için harita/panel yüklenmez; route-scoped loading gerekiyor |
| Büyük GTFS feed'de WebGL context loss | Performans / Render | Yüksek | Her ikisi | İnceleniyor | Harita ilk yüklemede veya route focus sonrası tamamen kaybolabiliyor |

## Yeni Çözülmüş Kayıtlar

| Başlık | Tur | Öncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| VBB feed'de route search/list bazı hatları göstermiyor | Bug | Yüksek | Her ikisi | Çözüldü | routeCatalog cap/runtime budamasından çıkarıldı; tam routes.txt kataloğu gösteriliyor |
| Durak Aramada Liste Kapanıyor | Bug | Yüksek | Her ikisi | Çözüldü | Sorgu varsa tüm durak seti taranır, sonuçlardan ilk 300 gösterilir |
| Landing açıkken planner görünüyor | UX Bug | Orta | Her ikisi | Çözüldü | Landing modunda planner ve map-only overlay'ler gizleniyor |
| Windows `npm run dev` script uyumsuzluğu | Tooling Bug | Orta | Desktop | Çözüldü | `package.json` içindeki `dev` script'i Windows uyumlu hale getirildi |
| Dev modda DevTools otomatik açılıyor | Tooling / UX | Düşük | Desktop | Çözüldü | DevTools auto-open kaldırıldı, menü üzerinden açılıyor |

## Notlar

- `VBB feed'de cap dışı hatlar` kaydında kök neden: AppState.trips runtime cap'e takıldı; routeCatalog ve tariffIndex tam olsa da shape/stop/araç verisi runtime'a bağlı. Çözüm: route-scoped on-demand loading (yol-haritasi.md).
- route tariff tam veriden gelir; stop tariff halen runtime stopDeps/trips zincirine bağlıdır.
- `Kocaeli Verisinde Hat Seçiminde Duraklar Eksik Görünüyor` kaydında şu başlıklar kontrol edilmeli:
  - `pickup_type` / `drop_off_type`
  - yön filtresi etkisi
  - odaklı hat görünürlüğü
  - uygulamadaki liste kısıtlama koşulları
- `Büyük GTFS feed'de WebGL context loss` kaydında şu başlıklar kontrol edilmeli:
  - runtime trip cap değerleri
  - path / shape sadeleştirme yoğunluğu
  - stop deps ve stop transfer boyutu
  - route focus sonrası layer rebuild maliyeti

## Kullanim Notu

- Çözüm uygulandığında durum güncellenir veya kayıt kaldırılır.
- Yeni hata eklerken kısa başlık, etki ve veri kontrol notu birlikte yazılır.
