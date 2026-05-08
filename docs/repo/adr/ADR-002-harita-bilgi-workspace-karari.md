# ADR-002: Harita / Bilgi Workspace Karari

## Durum

Kabul edildi

## Tarih

2026-04-30

## Baglam

Urun buyudukce sol panel icinde su farkli sorumluluklar birikmistir:

- veri yukleme ve veri seti secimi
- harita katmanlari ve gorsel toggle'lar
- route / stop / vehicle secimi
- sefer saatleri ve tablo sorgulari
- takvim ve analiz ekranlari

Bu yapi kucuk feed ve az ozellikli donemde yeterliydi. Ancak buyuk feed, route kimligi, timetable dogrulugu ve inspector derinligi arttikca ayni panel icinde her seyi tasimak karar ve state karmasina yol aciyor.

Ozellikle su gerilimler artik ayni akis icinde saglikli ilerlemiyor:

- harita ustunde kesif yapmak ile veri sorgulamak ayni is degil
- route kimligi, pattern ve service-day baglami sadece harita secimi ile tasinamiyor
- tablo, takvim ve inspector yuzeyleri haritadan bagimsiz da kullanilabilmeli

Bu nedenle urunun ust seviye kullanim yolunun netlestirilmesi gerekir.

## Karar

Urun iki ana workspace etrafinda kurgulanacaktir:

1. `Harita`
2. `Bilgi`

Bu karar asagidaki alt kararlarla birlikte kabul edilir:

### K-W1. Sol rail yapisi sabittir

Sol rail ust seviye bolumleri sabit sirada tutulur:

- `Data`
- `Harita`
- `Bilgi`
- `Analiz`
- `Ayarlar`

Bu bolumler gecici olarak cogaltilmaz veya sirasi degistirilmez.

Icerigi henuz acilmamis bolumler gizlenmez; `yakinda` veya disabled durumuyla gosterilir.

### K-W2. Aktif workspace AppState'te yasar

Aktif workspace URL hash uzerinden degil, uygulama state'i uzerinden tutulur.

Ornek:

- `AppState.activeWorkspace = 'harita' | 'bilgi' | 'analiz'`

Deep link ihtiyaci dogarsa ayri karar olarak ele alinacaktir; bu ADR kapsaminda zorunlu kabul edilmez.

### K-W3. Harita workspace'inde inspector sag paneldir

Harita workspace'inde inspector, haritanin baglaminda sag panel olarak yasar.

- inspector acildiginda harita temel yuzey olarak kalir
- inspector haritayi degistiren ikinci bir sayfa olmaz
- harita tile ve katman mantigi inspector acik/kapali olmasindan bagimsiz kalir

### K-W4. Harita ve Bilgi tam gecistir

`Harita` ve `Bilgi` ayni anda ekranda acik iki esit ana yuzey olmayacaktir.

- `Bilgi` workspace'i acikken ana odak tablo / takvim / inspector bilgi akisidir
- `Harita` workspace'i acikken ana odak gorsel kesif ve katmanlardir

Gelecekte ozel split-view ihtiyaci cikarsa ayri karar gerekir.

### K-W5. Secim globaldir, inspector contract'i globaldir, gorunum workspace'e gore render edilir

Secili entity global state'te yasar.

Ornek:

- route secimi
- stop secimi
- service-day baglami

Inspector da ayni secimin ustunde calisan global bir contract olarak ele alinir.

Ancak inspector ve yardimci paneller bu secimi workspace baglamina uygun bicimde render eder.

Yani:

- secim ayni kalabilir
- gorunum workspace'e gore degisebilir

Bu sayede ayni entity hem harita hem bilgi akisinda tekrar uretilmez.

### K-W6. Bilgi workspace'inde inspector, Harita'ya zorlamadan sag panel shell icinde yasar

Bilgi workspace'inde route veya stop secildiginde kullanici otomatik olarak Harita workspace'ine tasinmaz.

Onun yerine:

- ayni `selectedEntity` korunur
- inspector Bilgi workspace'inin sag panel shell'i icinde acilir
- Harita workspace'ine gecilirse ayni secim harita baglaminda yeniden render edilir

Bu karar, `selection globaldir` ilkesini korur ama UI gecisini kullanicinin kontrolunde tutar.

## Gerekce

Bu karar, UI duzeninden once bilgi mimarisini netlestirmek icin alinmistir.

Beklenen faydalar:

- harita kesfi ile veri sorgulama ayni panelde birbirini ezmez
- route / pattern / service-day inspector kurgusu daha temiz ilerler
- tablo ve takvim ekranlari haritaya mecbur kalmadan tasarlanabilir
- buyuk feed icin route-scoped loading ve secmeli runtime stratejisi daha net yerlestirilir
- gelecekte acilacak workspace'ler planli bosluk olarak gosterilebilir; kirik gorunum hissi azaltilir

Bu karar ozellikle su teknik isleri destekler:

1. stop tariff ve route tariff tarafinin runtime'dan ayrilmasi
2. route identity'nin `route_id` ekseninde tamamlanmasi
3. route / pattern / service-day inspector yapisinin kurulmasi
4. tablo ve takvim modullerinin bagimsiz ama ortak secim modeliyle calismasi

## Sonuclar

Olumlu sonuclar:

- sol panel artik "her sey burada" mantigindan cikabilir
- feature gruplari kullanici zihnine daha uygun ayrilir
- harita ve bilgi akislarinin test edilmesi kolaylasir
- ayni secimin farkli yuzeylerde tutarli gosterilmesi mumkun olur

Maliyetler:

- mevcut panel ve toggle akislarinin yeniden yerlestirilmesi gerekir
- `AppState` icinde workspace ve secim sahibi alanlar daha acik tanimlanmalidir
- inspector'in bagimli oldugu state ve render zinciri yeniden duzenlenecektir

## Alternatifler

### Alternatif 1: Mevcut tek panel akisina devam etmek

Reddedildi.

Sebep:

- buyuyen ozellik setinde ayni panel veri yukleme, harita kontrolu, timetable, route secimi ve analiz akislarini ayni anda tasiyamiyor

### Alternatif 2: Harita ve Bilgi split-view olarak ayni anda acik olsun

Simdilik reddedildi.

Sebep:

- ilk asamada state ve render karmasini arttirir
- bilgi mimarisi netlesmeden split-view eklemek yanlis soyutlamayi kalici hale getirebilir

## Uygulama Notu

Bu ADR bir UI redesign karari degil, bilgi mimarisi kararidir.

Uygulama sirasinda:

1. once workspace state modeli netlestirilir
2. sonra sol rail ve gecis kabugu uygulanir
3. inspector, tablo ve takvim bu modele gore tek tek tasinir
