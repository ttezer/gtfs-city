# GTFS City - Katki Rehberi

Bu repo kamuya acik ve katkiya aciktir. Amac, calisan masaustu ve web akislarini bozmadan kontrollu iyilestirme yapmaktir.

## Temel Ilke

- Once problemi netlestir.
- Sonra etkilenen akisi sinirla.
- En kucuk dogru degisikligi yap.
- Degisiklikten sonra metin ve test kontrolu calistir.

## Katki Turleri

- hata duzeltmesi
- veri dogrulugu duzeltmesi
- performans iyilestirmesi
- UI/UX iyilestirmesi
- yeni ozellik
- dokumantasyon

## Calisma Kurallari

- Tek aktif GTFS veri seti modeli korunur.
- Upload-first baslangic akisi bozulmaz.
- Desktop ve Web akislari birbirine karistirilmaz.
- Turkce iceren metin dosyalarinda guvenli yama akisi kullanilir.
- Buyuk refactor yerine hedefli refactor tercih edilir.
- Yeni ozellikler once `yol-haritasi.md` veya `hata-listesi.md` icinde gorunur olmali.

## Hafif Repo Yonetimi

Bu repo icin hedef, az ama net kuralla profesyonel izlenebilirlik saglamaktir.

### Label Seti

Asagidaki etiketler yeterlidir. Ilk etapta bunlarin disina cikmaya gerek yok.

#### Tip etiketleri

- `bug` - kirik davranis, regresyon, hata
- `enhancement` - yeni ozellik veya mevcut davranisi gelistirme
- `docs` - README, roadmap, changelog, rehber, issue template
- `i18n` - dil secenegi, ceviri, metin standardizasyonu
- `tech-debt` - refactor, ownership, adapter, temizlik
- `data` - GTFS veri dogrulugu, parse, takvim, veri tutarliligi
- `ux` - akislari veya okunabilirligi iyilestiren arayuz isi
- `performance` - performans, render, memory, buyuk veri seti iyilestirmesi

#### Oncelik etiketleri

- `P0` - release blocker, veri kaybi, uygulamanin kullanilamaz hale gelmesi
- `P1` - yakin donemde alinmasi gereken ciddi sorun veya yuksek degerli is
- `P2` - normal planli is
- `P3` - dusuk oncelikli, polish veya sonraya birakilabilir is

#### Platform etiketleri

- `desktop`
- `web`
- `both`

#### Durum etiketleri

- `needs-triage` - ilk bakis bekliyor
- `ready` - kapsam net, alinabilir
- `blocked` - bagimlilik veya karar bekliyor

Bir issue icin hedef maksimum 3-5 etiket kullanmaktir.

Onerilen minimum kombinasyon:

- 1 tip etiketi
- 1 oncelik etiketi
- 1 platform etiketi

## Issue Kurallari

### Ne zaman issue acilir

- kullaniciya gorunen bug varsa
- roadmap'e alinacak yeni ozellik varsa
- teknik borc bir PR icinde sessizce buyumeye basladiysa
- birden fazla commit veya tartisma gerekecekse

### Issue acmadan once

1. `README.md`, `hata-listesi.md`, `yol-haritasi.md` ve `CHANGELOG.md` kontrol edilir.
2. Benzer acik issue var mi bakilir.
3. Is tek satirlik bir typo mu, yoksa izlenmesi gereken bir is mi karar verilir.

### Iyi issue ozeti nasil olur

- problem tek cumlede net olmali
- etkilenen akis yazilmali
- platform yazilmali
- varsa veri seti veya sehir baglami eklenmeli
- beklenen davranis ile mevcut davranis ayrilmali

### Issue sinirlari

- Tek issue tek problem veya tek hedef olmali.
- "Bug fix + refactor + docs + UI cleanup" tek issue olmamali.
- Teknik borc issue'su kullanici bug'i ile karistirilmamali; bagli issue olarak ayrilabilir.

## Gelistirme Akisi

1. Ilgili sorunu veya oneriyi once issue olarak ac veya mevcut issue ile iliskilendir.
2. Etkilenen dosyalari ve akisi kisa notla netlestir.
3. Gerekirse `isplani.md`, `yol-haritasi.md` veya `hata-listesi.md` guncelle.
4. Kucuk ve odakli degisiklik yap.
5. Asagidaki dogrulamalari calistir.
6. PR acarken ilgili issue'yu bagla.

## PR Kurallari

### Kapsam

- Bir PR tek konuya odakli olmali.
- Ayrik degisiklikler ayri PR olmali.
- Kullaniciya gorunen degisiklikle alakasiz refactor ayni PR'a gizlenmemeli.

### PR basligi

Asagidaki sade form yeterlidir:

- `bug: fix stop panel empty state`
- `docs: clarify README navigation`
- `i18n: add initial English landing copy`
- `tech-debt: split service calendar helpers`

### PR aciklamasi minimumu

- ne degisti
- neden degisti
- hangi issue ile bagli
- hangi test/dogrulama calisti
- kullaniciya gorunen etkisi var mi

### PR cikis kriteri

Merge oncesi su sorularin cevabi net olmali:

- issue baglandi mi
- kapsam tek konu mu
- README / roadmap / changelog guncellemesi gerekiyor mu kontrol edildi mi
- `npm run check:text` calisti mi
- `node --test --test-concurrency=1 --test-isolation=none` veya `npm test` calisti mi
- gorsel degisiklik varsa ekran goruntusu var mi

## Zorunlu Dogrulama

En az:

```bash
npm run check:text
node --test --test-concurrency=1 --test-isolation=none
```

Pratikte su da kabul edilir:

```bash
npm test
```

Dagitim veya paketleme etkileniyorsa:

```bash
npm run build:win -- --dir
```

## Belge Kullanimi

- `README.md` - urun ozeti ve kullanim
- `mimari.md` - teknik yapi ve modul dagilimi
- `kontrol.md` - calisma kurallari
- `isplani.md` - kisa guncel durum
- `yol-haritasi.md` - ozellik ve gelistirme basliklari
- `hata-listesi.md` - acik hata ve veri dogruluk sorunlari
- `CHANGELOG.md` - kullaniciya gorunen kayda deger degisiklikler

## Hangi Dosya Ne Zaman Guncellenir

- `README.md`: kullanici ne yapacagini veya nereye bakacagini artik farkli ogreniyorsa
- `CHANGELOG.md`: kullaniciya gorunen kayda deger degisiklik varsa
- `isplani.md`: alinmis karar, tamamlanan tur veya kisa durum notu varsa
- `yol-haritasi.md`: orta/uzun vadeli is veya surec standardi tanimlaniyorsa
- `hata-listesi.md`: acik kalan bug veya veri dogrulugu sorunu varsa

## Ozellikle Kacinilacaklar

- public repo icinde buyuk veri dump dosyalari
- preload mantigini geri getiren degisiklikler
- tek seferde buyuk, aciklamasiz refactor
- Desktop calisan akisI bozan web denemeleri
- issue'suz buyuk kapsamli degisiklikler
