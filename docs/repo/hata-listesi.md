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
| Durak Aramada Liste Kapaniyor | Bug | Yuksek | Her ikisi | Yerelde duzeltildi | Arama deneyimi bozuluyor |
| Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor | Bug / Veri kontrolu | Yuksek | Her ikisi | Inceleniyor | Secili hatta ait tum duraklarin gorunmedigi algisi olusuyor |
| VBB feed'de route search/list bazi hatlari gostermiyor | Bug | Yuksek | Her ikisi | Veri kontrolu | Buyuk GTFS feed'lerde route list ve arama eksik sonuc uretebiliyor; canli VBB feed dogrulama bekliyor |
| Buyuk GTFS feed'de WebGL context loss | Performans / Render | Yuksek | Her ikisi | Inceleniyor | Harita ilk yuklemede veya route focus sonrasi tamamen kaybolabiliyor |

## Yeni Cozulmus Kayitlar

| Baslik | Tur | Oncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| Landing acikken planner gorunuyor | UX Bug | Orta | Her ikisi | Cozuldu | Landing modunda planner ve map-only overlay'ler gizleniyor |
| Windows `npm run dev` script uyumsuzlugu | Tooling Bug | Orta | Desktop | Cozuldu | `package.json` icindeki `dev` script'i Windows uyumlu hale getirildi |
| Dev modda DevTools otomatik aciliyor | Tooling / UX | Dusuk | Desktop | Cozuldu | DevTools auto-open kaldirildi, menu uzerinden aciliyor |

## Notlar

- `Durak Aramada Liste Kapaniyor` kaydinda kok neden: sorgu yokken tum duraklardan sadece ilk 300'u alinip filtreleniyordu; 300'un otesindeki duraklar hic taranmiyordu. Duzeltme: sorgu varsa tum durakseti taranir, sonuclardan ilk 300 gosterilir. Fokuslu hat modunda limit uygulanmaz.
- `Kocaeli Verisinde Hat Seciminde Duraklar Eksik Gorunuyor` kaydinda su basliklar kontrol edilmeli:
  - `pickup_type` / `drop_off_type`
  - yon filtresi etkisi
  - odakli hat gorunurlugu
  - uygulamadaki liste kisitlama kosullari
- `VBB feed'de route search/list bazi hatlari gostermiyor` kaydinda yapilan duzeltmeler:
  - `routeCatalog` artik `route_id` ve `agency_id` tasiyor; liste dedupe `route_id` tabanli
  - `focusedRouteId` state eklendi; stop filtreleme ve cache artik `trip.rid` üzerinden calisiyor
  - Harita tiklamasinda route objesi tam olarak geçiliyor (`rid`, `aid` dahil)
  - Sonraki adim canli VBB feed ile dogrulama: `M27` aramada gorunmeli, `27` type/agency ezilmemeli, route focus ve panel akisi test edilmeli
- `Buyuk GTFS feed'de WebGL context loss` kaydinda su basliklar kontrol edilmeli:
  - runtime trip cap degerleri
  - path / shape sadeleştirme yogunlugu
  - stop deps ve stop transfer boyutu
  - route focus sonrasi layer rebuild maliyeti

## Kullanim Notu

- Cozum uygulandiginda durum guncellenir veya kayit kaldirilir.
- Yeni hata eklerken kisa baslik, etki ve veri kontrol notu birlikte yazilir.
