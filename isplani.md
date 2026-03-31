# GTFS City - Guncel Durum

## Mevcut Kararli Durum

Proje su anda Electron tabanli, tek GTFS veri seti mantigiyla calisan kararli bir masaustu uygulamadir.

Kararli kabul edilen temel davranislar:

- upload-first baslangic akisi
- tek aktif GTFS veri seti
- `HARITAYI AC` ile harita ekranina gecis
- route, stop ve vehicle panel akisleri
- hat tipi filtresi, odakli hat ve ilgili katman filtreleri
- headway, bekleme, yogunluk ve kapsama katmanlari
- HTTPS GTFS ZIP linkten yukleme, yalnizca Electron surumunde
- logo, landing ve temel urun kimligi

## Kilit Kararlar

### ADR-022 - Upload-first acilis akisi

Uygulama bos landing ekranla baslar. Veri yuklenmeden harita ekranina gecilmez.

### ADR-023 - Baslangic veri kaynagi

Baslangic veri kaynagi yerlestik preload degil, kullanici tarafindan yuklenen GTFS ZIP verisidir.

### ADR-024 - Tek progress yuzeyi

GTFS yukleme sirasinda tek bir progress yuzeyi kullanilir. Cift confirm/progress akisi acilmaz.

### ADR-025 - Worker tabanli parse

Agir GTFS parse islemi mumkun olan yerde worker uzerinden calistirilir; fallback yalnizca zorunlu durumda devreye girer.

### ADR-026 - Route/stop/vehicle panel davranisi

Route panel, stop panel, odakli hat gorunumu ve buna bagli filtre davranislari mevcut haliyle temel kabul edilir.

## Acik Kalan Yakin Isler

- GitHub Pages icin vitrin ve web demo olgunlastirma
- favicon ve app icon icin daha sade bir final logo surumu
- kucuk UX ve veri dogruluk duzeltmeleri
- istenirse GTFS-RT arastirma ve taslak fazi

## Planlama Belgeleri

- `yol-haritasi.md` - orta ve uzun vadeli gelistirme basliklari
- `hata-listesi.md` - acik hata ve veri dogruluk sorunlari

## Not

Bu dosya uzun tarihce degil, guncel durum belgesidir. Yeni isler buraya kisa ve guncel bicimde eklenmelidir.

### Faz R - GitHub Pages Vitrin Kurulumu (30 Mart 2026)

- `docs/index.html` ve `docs/styles.css` ile statik vitrin sayfasi olusturuldu.
- Pages icinde kullanilmak uzere `docs/logo-mark.png` ve `docs/favicon.ico` eklendi.
- Pages kaynagi olarak `main /docs` kullanilacak sekilde yapi kuruldu.

### Faz R - Kamusal Repo Kontrolu Turu 2 (30 Mart 2026)

- Acik repo taramasinda tracked gizli veri, token veya ZIP veri paketi bulunmadi.
- Electron tarafindaki eski marka kalintilari GTFS City adina temizlendi.

### Faz R - Pages ve README Gorsel Galeri Turu 3 (31 Mart 2026)

- Proje kokundeki JPEG ornekleri `docs/screens/` altina alinarak GitHub Pages vitrini baglandi.
- `README.md` icine ayni orneklerden olusan ekran goruntusu bolumu eklendi.

### Faz R - Pages Profesyonellestirme ve Preload Temizligi Turu 4 (31 Mart 2026)

- Pages vitrini daha profesyonel bir duzene gecirildi.
- README icindeki gereksiz Pages kurulum maddeleri sadelestirildi.
- Artik kullanilmayan preload kalintilari kaldirildi: `trips_data.js`, `shapes_data.js`, `lookup_data.js`, `scripts/regenerate-bordeaux-preload.js`.
- `cizim.md` kaldirildi ve `build-release.yml` preload bagimliligi olmadan yeniden yazildi.

### Faz R - Kok Gorsel Kaynaklari Ignore Turu 5 (31 Mart 2026)

- `docs/screens/` kopyalari korunurken, proje kokundeki gecici JPEG kaynaklar ve `gtfscity.png` `.gitignore` icine alindi.

### Faz S - Web MVP Hazirlik Turu 1 (31 Mart 2026)

- `docs/app/` altinda GitHub Pages icin ayri web giris noktasi olusturuldu.
- Web girisi, desktop akisina dokunmadan kok JS/CSS dosyalarinin Pages icin izole kopyalariyla hazirlandi.
- `bootstrap-manager.js` icine base path destegi eklendi ve Pages vitrinden `Web Demo` baglantisi verildi.

### Faz S - Web MVP Duzenleme Turu 2 (31 Mart 2026)

- Yuklenen sehir silindiginde landing ekranina guvenli donus ve yeniden GTFS yukleme akisi duzeltildi.
- Pages vitrinde giris metni, ekran goruntusu yerlestirimi ve urun anlatimi yeniden duzenlendi.
- HTTPS linkten yukleme, guvenlik ve platform sinirlari nedeniyle desktop surumunde tutuldu; web demo yerel ZIP yukleme ile sinirlandi.

### Faz S - Lisans ve Ucuncu Parti Tarama Turu 3 (31 Mart 2026)

- `package-lock.json` ve CDN bagimliliklari uzerinden ucuncu parti lisans taramasi yapildi.
- Cekirdek bagimliliklar icin lisans ozeti cikarildi ve `THIRD_PARTY_NOTICES.md` eklendi.
- npm taramasi icinde zorunlu copyleft sinifinda GPL/AGPL/LGPL bagimlilik bulunmadi; JSZip icin MIT secenegi not edildi.
- Ozel gorseller ve logo varliklarinin kaynaginin proje sahibi tarafindan ayrica dogrulanmasi gerektigi not edildi.

### Faz S - 3D Model Kaldirma Turu 4 (31 Mart 2026)

- Kullanilmayan `.glb` arac modeli yolu kaldirildi ve uygulama 2D arac gorunumune sabitlendi.
- 3D arac modelleri toggle'i arayuzden cikarildi.
- Paketleme ve ucuncu parti bildirimleri model dizini kaldirilacak sekilde guncellendi.

### Faz S - Turkce Metin Guvencesi Turu 5 (31 Mart 2026)

- Public metin dosyalari icin kalici bozulma denetimi eklendi.
- Mojibake kontrolu test akisina baglandi.
- Turkce iceren dokuman ve Pages dosyalarinda shell uzerinden here-string yazimi yasaklandi; yalnizca guvenli yama akisi kullanilacak.

### Faz S - Pages Analytics Turu 6 (31 Mart 2026)

- Google Analytics 4 olcumu Pages vitrini ve web demo girisine eklendi.
- Kullanilan olcum kimligi: `G-PRJPC1JRDH`

### Faz S - Yol Haritasi ve Hata Listesi Turu 7 (31 Mart 2026)

- Orta ve uzun vadeli gelistirmeler icin `yol-haritasi.md` eklendi.
- Acik hata ve veri dogruluk basliklari icin `hata-listesi.md` eklendi.
- `isplani.md` kisa durum belgesi olarak korunup plan belgelerine baglandi.

### Faz S - Teknik Borc ve Refactor Plani Turu 8 (31 Mart 2026)

- Mimari riskler ve performans darbozazlari `yol-haritasi.md` icine ayri baslik olarak islendi.
- State ownership, `script.js` kucultme, trip eslestirme, render ayrimi ve platform adapter isleri acik refactor planina donusturuldu.
- Hedef, urunu yeniden yazmadan kademeli iyilestirme yapmak olarak netlestirildi.

### Faz S - Repo Olgunlastirma Turu 9 (31 Mart 2026)

- `CONTRIBUTING.md` eklendi.
- GitHub issue template yapisi olusturuldu.
- `CHANGELOG.md` ve `desktop-web-notu.md` eklendi.
- `mimari.md` icine modul ownership tablosu islendi.

### Faz S - README ve Dil Secenegi Turu 10 (31 Mart 2026)

- `README.md` icinde hata, fix ve ozellik icin nereye bakilacagini aciklayan yonlendirme bolumu eklendi.
- `README.en.md` eklenerek README icin ayri bir Ingilizce surum olusturuldu.
- Uygulama arayuzune ilk etap Ingilizce dil secenegi eklendi; landing akisi ve temel giris metinleri TR/EN degistirilebilir hale getirildi.
- Sonraki adim olarak panel, servis ve ileri seviye dinamik metinlerin tam i18n kapsamina alinmasi not edildi.
