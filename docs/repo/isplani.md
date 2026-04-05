# GTFS City - Güncel Durum

Bu dosya, aktif ürün durumunu ve kısa vadeli odakları tek yerde tutar.
Uzun tarihçe burada biriktirilmez.

## Mevcut Durum

Proje iki desteklenen yüzeyle ilerliyor:

- Electron masaüstü uygulaması
- GitHub Pages üzerinden çalışan web demo

Temel ürün ilkeleri:

- upload-first başlangıç akışı
- tek aktif GTFS veri seti
- worker tabanlı parse
- desktop ve web için ortak çekirdek

## Karar Olarak Sabitlenen Davranışlar

- GTFS yüklenmeden harita ekranına geçilmez
- tek aktif GTFS veri seti modeli korunur
- route / stop / vehicle panel akışları temel davranış kabul edilir
- headway, heatmap, bağlantı kareleri ve stop coverage katmanları çekirdek özelliktir
- web demo desteklenen ürün yüzeyidir; sadece vitrin değildir

## Güncel Açık İşler

- web demo olgunlaştırma
- bağlantı kareleri beta kalibrasyonu
- persisted snapshot / cache araştırması
- küçük UX ve veri doğruluğu düzeltmeleri
- gerekirse GTFS-RT araştırma fazı

## Bu Dosya Neyi Tutmaz

- detaylı bug listesi tutmaz
- orta ve uzun vadeli roadmap tutmaz
- mimari detay açıklaması tutmaz
- repo/build/deploy prosedürü tutmaz

## İlgili Belgeler

- `hata-listesi.md` - açık bug ve veri doğruluğu sorunları
- `teknik-borc.md` - güncel teknik borç sıralaması ve değişim takibi
- `state-sahipligi.md` - state fazı için sahiplik tabanı ve ilk çakışma listesi
- `yol-haritasi.md` - orta ve uzun vadeli gelişim başlıkları
- `mimari.md` - teknik sınırlar ve mimari ilkeler
- `kontrol.md` - iş yapma standardı ve kontrol sırası
- `repo-akisi.md` - repo düzeni, build, sync ve yayın akışı
