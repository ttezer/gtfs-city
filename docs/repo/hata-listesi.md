# GTFS City - Hata Listesi

Bu belge, acik hata kayitlarini ve veri dogrulugu basliklarini toplar.
Urun gelistirme fikirleri bu dosyada degil, `yol-haritasi.md` icinde tutulur.

## Alanlar

- Oncelik: `Yuksek`, `Orta`, `Dusuk`
- Platform: `Desktop`, `Web`, `Her ikisi`
- Durum: `Acik`, `Inceleniyor`, `Yerelde duzeltildi`, `Veri kontrolu`, `Cozuldu`

## Acik Kayitlar

| Baslik | Tur | Oncelik | Platform | Durum | Etki |
|---|---|---|---|---|---|
| Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor | Bug / Veri kontrolu | Yuksek | Her ikisi | Inceleniyor | Secili hatta ait tum duraklarin gorunmedigi algisi olusuyor |
| VBB feed'de cap disi hatlar haritada shape/arac gostermiyor | Bug / Mimari | Yuksek | Her ikisi | Inceleniyor | Cap sinirini asan hatlar panel aciyor ama shape, durak ve arac animasyonu gelmiyor; route-scoped loading gerekiyor |
| Buyuk GTFS feed'de WebGL context loss | Performans / Render | Yuksek | Her ikisi | Inceleniyor | Harita ilk yuklemede veya route focus sonrasi tamamen kaybolabiliyor |

## Yeni Cozulmus Kayitlar

| Baslik | Tur | Oncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| VBB feed'de route search/list bazi hatlari gostermiyor | Bug | Yuksek | Her ikisi | Cozuldu | routeCatalog cap/runtime budamasindan cikarildi; tam routes.txt katalogu gosteriliyor |
| Durak Aramada Liste Kapaniyor | Bug | Yuksek | Her ikisi | Cozuldu | Sorgu varsa tum durakseti taranir, sonuclardan ilk 300 gosterilir |
| Landing acikken planner gorunuyor | UX Bug | Orta | Her ikisi | Cozuldu | Landing modunda planner ve map-only overlay'ler gizleniyor |
| Windows `npm run dev` script uyumsuzlugu | Tooling Bug | Orta | Desktop | Cozuldu | `package.json` icindeki `dev` script'i Windows uyumlu hale getirildi |
| Dev modda DevTools otomatik aciliyor | Tooling / UX | Dusuk | Desktop | Cozuldu | DevTools auto-open kaldirildi, menu uzerinden aciliyor |

## Notlar

- `VBB feed'de cap disi hatlar` kaydinda kok neden: AppState.trips runtime cap'e takildi; routeCatalog ve tariffIndex tam olsa da shape/stop/arac verisi runtime'a bagli. Cozum: route-scoped on-demand loading (yol-haritasi.md).
- `Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor` kaydinda su basliklar kontrol edilmeli:
  - `pickup_type` / `drop_off_type`
  - yon filtresi etkisi
  - odakli hat gorunurlugu
  - uygulamadaki liste kisitlama kosullari
- `Buyuk GTFS feed'de WebGL context loss` kaydinda su basliklar kontrol edilmeli:
  - runtime trip cap degerleri
  - path / shape sadeleştirme yogunlugu
  - stop deps ve stop transfer boyutu
  - route focus sonrasi layer rebuild maliyeti

## Kullanim Notu

- Cozum uygulandiginda durum guncellenir veya kayit kaldirilir.
- Yeni hata eklerken kisa baslik, etki ve veri kontrol notu birlikte yazilir.
