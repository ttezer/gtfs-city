# ADR-001: Kod Inceleme Sonrasi Teknik Onceliklendirme

## Durum

Kabul edildi

## Tarih

2026-03-10

## Baglam

Proje, GTFS verilerini harita uzerinde canli olarak gosteren ve Electron ile masaustu ortama da tasinabilen bir simulasyon uygulamasidir.

Son incelemede su noktalar one cikmistir:

- headway ve bunching hesaplarinda sabit esiklere dayali kirilgan kisimlar bulunuyor
- GTFS yukleme ve parse akislarinda temel dogrulama var, ancak daha sistemli hata yonetimi gerekiyor
- kritik hesaplama fonksiyonlari icin test kapsami sinirli
- `script.js` icinde birikmis buyuk akislar bakimi zorlastiriyor
- 3D model katmaninda fallback davranisi mevcut, ancak kullanici bildirimi daha acik olmali

## Karar

Gelisim sirasi asagidaki sekilde onceliklendirilecektir:

1. once simulasyon dogrulugunu etkileyen headway ve bunching hesaplari ele alinacak
2. sonra GTFS yukleme ve validasyon akislarinda hata yonetimi guclendirilecek
3. bu iki alanin etrafina test katmani eklenecek
4. ardindan `script.js` icindeki buyuk akislar parcali hale getirilecek
5. son olarak 3D model fallback ve kullanici bildirimi iyilestirilecek

## Gerekce

Bu siralama, kullaniciya dogrudan yanlis bilgi gosterebilecek alanlari once ele almak icin secilmistir.

Headway ve GTFS yukleme taraflari, uygulamanin guvenilirligini dogrudan etkiler. Bu iki alan duzeltilmeden yapisal refactor veya 3D iyilestirmeleri yapmak, temel sorunu geciktirir.

Test katmani, bu iyilestirmelerin korunmasi icin ucuncu asamada konumlandirilmistir. Refactor ise bu dogrulama zemini olustuktan sonra daha guvenli hale gelir.

## Sonuclar

Olumlu sonuclar:

- kullaniciya giden kritik simulasyon bilgilerinin dogrulugu artar
- GTFS kaynakli hatalari ayiklamak kolaylasir
- sonraki refactor daha guvenli yapilir

Olasi maliyetler:

- kisa vadede yeni ozellik gelistirme hizi bir miktar yavaslayabilir
- test ve validasyon altyapisi icin ek efor gerekir

## Alternatifler

### Alternatif 1: Once Kod Refactor Yapmak

Reddedildi.

Sebep:

- temel hesap ve veri dogrulama sorunlari cozulmeden yapilacak refactor, var olan mantik sorunlarini sadece farkli yere tasiyabilir

### Alternatif 2: Once 3D ve Arayuz Iyilestirmelerine Gitmek

Reddedildi.

Sebep:

- bunlar kullanici deneyimini iyilestirir, ancak temel veri dogrulugu ve hata riski kadar kritik degildir

## Uygulama Notu

Bu ADR, [isplani.md](../isplani.md) belgesi ile birlikte okunmalidir.
