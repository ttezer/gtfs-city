# GTFS City - Hata Listesi

Bu belge, açık hata kayitlarini ve veri dogrulugu basliklarini toplar.
Ürün gelistirme fikirleri bu dosyada degil, `yol-haritasi.md` icinde tutulur.

## Alanlar

- Öncelik: `Yuksek`, `Orta`, `Düşük`
- Platform: `Desktop`, `Web`, `Her ikisi`
- Durum: `Açık`, `Inceleniyor`, `Yerelde düzeltildi`, `Veri kontrolu`, `Çözüldü`

## Açık Kayitlar

| Başlık | Tur | Öncelik | Platform | Durum | Etki |
|---|---|---|---|---|---|
| Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor | Bug / Veri kontrolu | Yuksek | Her ikisi | Inceleniyor | Secili hatta ait tum duraklarin gorunmedigi algisi olusuyor |
| VBB feed'de cap disi hatlar haritada shape/arac gostermiyor | Bug / Mimari | Yuksek | Her ikisi | Inceleniyor | Cap sinirini asan hatlar panel aciyor ama shape, durak ve arac animasyonu gelmiyor; route-scoped loading gerekiyor |
| Büyük GTFS feed'de WebGL context loss | Performans / Render | Yuksek | Her ikisi | Inceleniyor | Harita ilk yuklemede veya route focus sonrasi tamamen kaybolabiliyor |

## Yeni Çözülmüş Kayitlar

| Başlık | Tur | Öncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| VBB feed'de route search/list bazi hatlari gostermiyor | Bug | Yuksek | Her ikisi | Çözüldü | routeCatalog cap/runtime budamasindan cikarildi; tam routes.txt katalogu gosteriliyor |
| Durak Aramada Liste Kapaniyor | Bug | Yuksek | Her ikisi | Çözüldü | Sorgu varsa tum durakseti taranir, sonuclardan ilk 300 gösterilir |
| Landing acikken planner gorunuyor | UX Bug | Orta | Her ikisi | Çözüldü | Landing modunda planner ve map-only overlay'ler gizleniyor |
| Windows `npm run dev` script uyumsuzlugu | Tooling Bug | Orta | Desktop | Çözüldü | `package.json` icindeki `dev` script'i Windows uyumlu hale getirildi |
| Dev modda DevTools otomatik aciliyor | Tooling / UX | Düşük | Desktop | Çözüldü | DevTools auto-open kaldırıldı, menu uzerinden aciliyor |

## Notlar

- `VBB feed'de cap disi hatlar` kaydinda kök neden: AppState.trips runtime cap'e takildi; routeCatalog ve tariffIndex tam olsa da shape/stop/arac verisi runtime'a bagli. Çözüm: route-scoped on-demand loading (yol-haritasi.md).
- `Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor` kaydinda su başlıklar kontrol edilmeli:
  - `pickup_type` / `drop_off_type`
  - yon filtresi etkisi
  - odakli hat gorunurlugu
  - uygulamadaki liste kısıtlama kosullari
- `Büyük GTFS feed'de WebGL context loss` kaydinda su başlıklar kontrol edilmeli:
  - runtime trip cap degerleri
  - path / shape sadeleştirme yogunlugu
  - stop deps ve stop transfer boyutu
  - route focus sonrasi layer rebuild maliyeti

## Kullanim Notu

- Çözüm uygulandiginda durum guncellenir veya kayit kaldirilir.
- Yeni hata eklerken kisa başlık, etki ve veri kontrol notu birlikte yazilir.
