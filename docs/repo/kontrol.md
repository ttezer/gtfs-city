# GTFS City - Resmi Calisma Standarti

Bu dosya, repo icinde bir is alininca hangi sirayla ilerlenmesi gerektigini tanimlar.
Amac, tekrar eden unutmalari, kapsam kaymasini ve "hangi belge guncellenecek" belirsizligini azaltmaktir.

## Temel Ilke

- Tek is, tek amac, net sinir.
- Her konu icin tek ana belge.
- Kok dizin urunun kaynak noktasi.
- Desktop ve web birlikte dusunulur.
- Kucuk, hedefli ve dogrulanabilir degisiklik tercih edilir.

## Is Turunu Once Belirle

Bir ise baslamadan once turu netlestir:

- `bug`
- `feature`
- `refactor`
- `repo/ci/build`
- `docs`
- `data-dogrulugu`

Tur net degilse once problem tek cumlede yazilir, sonra ise baslanir.

## Zorunlu Baslangic Sirasi

Her is icin minimum siralama:

1. Problemi veya hedefi tek cumlede tanimla.
2. Kapsami yaz: ne dahil, ne dahil degil.
3. Etki alanini belirle: `desktop`, `web`, `both`.
4. Ilgili belgeleri oku.
5. Etkilenen dosyalari sinirla.
6. Kucuk ve hedefli degisikligi yap.
7. Gerekli dogrulamalari calistir.
8. Yalnizca gereken belgeleri guncelle.
9. Commit/PR ozetini net yaz.

## Hangi Iste Hangi Belgeler Okunur

Her iste:

- `README.md`
- `kontrol.md`

Teknik degisiklikte:

- `mimari.md`

Repo, build, sync veya deploy isinde:

- `repo-akisi.md`

Bug isinde:

- `hata-listesi.md`

Feature veya orta vadeli gelisim isinde:

- `yol-haritasi.md`

Katki ve PR beklentisi gerekiyorsa:

- `CONTRIBUTING.md`

## Hangi Bilgi Nereye Yazilir

- urun tanimi, kurulum, kullanici yonlendirmesi: `README.md`
- teknik sinirlar ve modul sorumluluklari: `mimari.md`
- repo yapisi, sync, build, release, pages akisi: `repo-akisi.md`
- is yapma proseduru ve kontrol sirasi: `kontrol.md`
- acik bug ve veri sorunlari: `hata-listesi.md`
- feature, teknik borc ve orta/uzun vade: `yol-haritasi.md`
- yayinlanmis onemli sonuc: `CHANGELOG.md`
- kalici mimari karar: `adr/*`

Gecici tur notu icin yeni `.md` dosyasi acilmaz.

## Belge Guncelleme Kurali

Her iste her belge guncellenmez.
Yalnizca degisiklikten etkilenen belge islenir.

- Bug fix:
  - gerekirse `hata-listesi.md`
  - kullaniciya gorunen sonuc varsa `CHANGELOG.md`
- Feature:
  - gerekirse `yol-haritasi.md`
  - kullanici akisi degistiyse `README.md`
  - mimari karar varsa `adr/*`
- Refactor:
  - teknik sinir degistiyse `mimari.md`
  - repo/build akisi degistiyse `repo-akisi.md`
- Repo/CI/deploy:
  - `repo-akisi.md`
  - gerekirse `CONTRIBUTING.md`
- Sadece metin/yonlendirme duzeltmesi:
  - ilgili tek belge

## Uygulama Sirasinda Dikkat Edilecekler

- Degisiklik tek konuya odakli kalmali.
- Kullaniciya gorunen davranis ile teknik borc ayni iste kontrolsuz karistirilmamali.
- Desktop'ta calisan ama web'i kiran cozum kabul edilmez.
- Web icin eklenen cozum desktop akisina zarar vermemeli.
- Buyuk refactor, dogrulama zemini olmadan yapilmamali.
- Encoding riski olan metin dosyalarinda dikkatli ilerlenmeli.
- `docs/app/` elle ayrismamali; kok kaynaklar esas alinmali.

## Buyuk Refactor Islerinde Ajan Kullanimi

Bu bolum, buyuk kapsamli teknik islerde birden fazla ajan kullanilacaksa hangi rolle ilerlenmesi gerektigini tanimlar.

Varsayilan rol dagilimi:

- `Haritalayici`: etki alanini, dosya yuzeyini, bagimliliklari ve siniri cikarir
- `Uygulayici`: netlesen kapsama gore kod degisikligini yapar
- `Dogrulayici`: yazilan degisikligi bagimsiz gozle kontrol eder, test ve regresyon taramasi yapar

Temel kural:

- Ayni dosyada iki ajan ayni anda yazma sorumlulugu almaz.
- Once sinir cikarilir, sonra uygulama yapilir, en son bagimsiz dogrulama gelir.
- `kod yazsin / kontrol etsin / test yapsin` modeli tek basina yeterli degildir; once dogru sinir cikarilmis olmalidir.

Ne zaman 3 ajan kullanilir:

- `state`, `bridge`, `script.js` parcala gibi buyuk refactor islerinde
- birden fazla modulun bagimlilik yonu degisecekse
- yan etki riski yuksek ama is yine de parcalanabilirse

Ne zaman gerekmez:

- tek dosyalik bug fix
- sadece metin veya belge duzeltmesi
- tek sorumluluklu ve etkisi sinirli kucuk refactor

Uygulama sirasi:

1. `Haritalayici` dosya ve bagimlilik haritasini cikarir.
2. Ana koordinasyon kapsam disini netlestirir.
3. `Uygulayici` yalnizca verilen sinir icinde degisiklik yapar.
4. `Dogrulayici` diff, davranis ve test acisindan bagimsiz kontrol yapar.
5. Gerekirse ana koordinasyon son duzeltmeyi yapar.

Bu modelde amac, ayni isi uce bolmek degil; ayni isi uc farkli bakisla kontrollu ilerletmektir.

### Ajan Gorev Sablonu

Buyuk refactor islerinde ajanlara gorev verilirken su kalip korunur:

- `Rol`: `Haritalayici`, `Uygulayici`, `Dogrulayici`
- `Scope`: hangi alanin incelenecegi veya degistirilecegi
- `Dosyalar`: ajan hangi dosyalarda calisacagini net bilir
- `Cikti`: beklenen cevap formati onceden tanimlanir
- `Sinir`: kod yazip yazmayacagi, hangi dosyalara dokunmayacagi belirtilir

Ornek gorev iskeleti:

1. `Rolun Haritalayici. Su dosyalari incele. Su alanlar icin yazim/okuma noktalarini cikar. Kod yazma.`
2. `Rolun Uygulayici. Yalnizca su dosyalarda, su write set icinde degisiklik yap. Baska dosyaya dokunma.`
3. `Rolun Dogrulayici. Sadece diff ve davranis riski acisindan kontrol et. Yeni uygulama yapma.`

Bu sablonun amaci:

- gorevi olculebilir yapmak
- write set cakismasini azaltmak
- paralel calisirken baglami korumak

## Kod Degisikligi Sirasinda Standart

1. Etkilenen ana dosyalari bul.
2. Sorunun kaynagini dogrula.
3. En kucuk dogru yamayi uygula.
4. Gerekirse ilgili destek dosyasini guncelle.
5. Gereksiz yan temizlik yapma.
6. Kapsam disi fark gorduysen not et, ayni ise gizleme.

## Dogrulama Standardi

Minimum:

```bash
npm run check:text
npm test
```

Gerekirse ek olarak:

```bash
npm run prebuild
npm run build:win -- --dir
```

Secim kurali:

- metin, i18n, asset veya HTML/CSS/JS degisikliklerinde `npm run check:text`
- genel kod degisikliklerinde `npm test`
- `docs/app`, release, pages veya build akisi degisikliklerinde `npm run prebuild`
- desktop paketleme etkileniyorsa uygun `build:*` komutu

## PR Oncesi Cikis Kriteri

Su sorularin cevabi net olmadan is tamam sayilmaz:

- Kapsam tek konu mu?
- Ilgili belge guncellemesi kontrol edildi mi?
- Gerekli dogrulama komutlari calisti mi?
- Desktop/web etkisi dusunuldu mu?
- Commit ve PR ozeti neden-sonuc iliskisini anlatiyor mu?

## Kacinilacaklar

- yeni `.md` dosyasi acarak gecici not biriktirmek
- tek PR icinde bug + refactor + docs + UI temizligini karistirmak
- issue veya acik gerekce olmadan buyuk kapsamli refactor yapmak
- kok kaynak yerine `docs/app/` u dogrudan ana kaynak gibi duzenlemek
- sadece "duzeldi" diyerek dogrulama yapmadan isi kapatmak

## Tek Cumlelik Kontrol

Bir ise baslarken su cumle kurulabiliyorsa dogru yoldayiz:

`Su problemi, su kapsamda, su dosyalarda cozecegim; su kontrolleri calistirip yalnizca su belgeleri guncelleyecegim.`
