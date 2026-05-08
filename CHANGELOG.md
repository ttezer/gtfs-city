# Değişiklik Günlüğü

Bu dosya, büyük ürün dönüm noktalarını kısa biçimde özetler.

## 2026-05-08

### Faz 7 — Büyük Feed Mimarisi + Route Panel + Tarife İyileştirmeleri

- **Büyük feed mimarisi:** Shape building trip loop'undan ayrıldı; tüm route shape'leri TRIP_CAP'ten bağımsız yükleniyor. Viewport-scoped animation ve shape point budget (60K/120K/240K) ile GPU baskısı azaltıldı.
- **Route panel:** Yön (G/D) ve varyant seçimi harita filtresiyle senkronize. Durak listesi büyük feed'lerde de tam görünüyor (timepoint olmayan duraklar dahil). Durak sayısı özet kutusunda yön/varyant değişiminde güncelleniyor.
- **Sefer saatleri çıktısı:** Her açılışta önceki seçim sıfırlanıyor. Tablo yön kodu (G/D) + yön adı + varyant sütunuyla zenginleştirildi; her (yön, headsign) kombinasyonu ayrı satır.
- **Metro diyagramı:** 2 hat zorunluluğu kaldırıldı, 1 hat ile de diyagram oluşturuluyor.

## 2026-05-03

### Varyant seçimi, Çalışma Takvimi ve heatmap düzeltmesi

- Yön filtresi `direction_id` → `direction_id + headsign` bazlı varyant seçimine dönüştürüldü. Harita ve Bilgi panellerinde "G > İstanbul / D > Kartal" formatında tıklanabilir varyant listesi. Aynı varyanta tekrar tıklayınca seçim kalkıyor; seçili varyantın sefer ve güzergahları haritada filtreleniyor.
- "Analiz" sayfası "Çalışma Takvimi (Beta)" olarak yeniden adlandırıldı. Yıl görünümünde ısı haritası tam sayfa genişliğinde. Ay görünümünde 3 ay yan yana gösterim + ◀/▶ navigasyon. Gün görünümünde hat adı eksikse headsign kullanılıyor.
- Takvim heatmap yoğunluk hatası düzeltildi: `tripCountBySid` artık `preparedSource.tripMeta` tamamından hesaplanıyor; önceki sürüm yalnızca bugünkü aktif service_id'lerini yansıtıyordu ve hafta içi günler boş görünüyordu.

## 2026-04-30

### Büyük feed desteği ve route kimliği iyileştirmeleri

- `routeCatalog` artık cap/runtime budamasından bağımsız; `routes.txt` tam kataloğu sidebar'da gösteriliyor. VBB gibi büyük feed'lerde cap sınırını aşan hatlar da listede görünüyor.
- `tariffIndex` eklendi: cap uygulanmadan önce, servis filtreli tam sefer verisi saklanıyor. Sefer saatleri sayfası artık animasyon cap'inden etkilenmiyor.
- `focusedRouteId` ile route kimliği `route_short_name` yerine `route_id` tabanlı hale getirildi; çakışan hat adları (ör. VBB `27` / `M27`) doğru ayrımlandı.
- Route tariff önizlemesindeki kalan `sampleTrip` bağımlılığı temizlendi.
- Cap dışı hat seçimi artık yarım route panel açmıyor; açık bilgi mesajı verip seçimi geri alıyor.
- Cap dışı hatlar tıklandığında panel katalog verisiyle açılıyor; shape ve araç animasyonu için route-scoped loading gerekiyor (açık iş).
- Durak aramasında 300 ön-limit kaldırıldı: sorgu varken tüm duraklar taranıyor.
- Electron GPU crash (DXGI_ERROR_DEVICE_HUNG, exit_code=34) `use-angle=gl` ile giderildi.
- Sidebar ve tariff sayfasında cap durumu kullanıcıya gösteriliyor.
- Not: stop tariff tarafı halen runtime `stopDeps/trips` zincirine bağlı; tam cap bağımsızlığı yalnızca route tariff için geçerli.

## 2026-04-04

### Bağlantı Kareleri beta turu

- `Bağlantı Kareleri` katmanı beta etiketiyle en sona alındı.
- İlk performans paketi eklendi: `skipWalk=true`, `maxSecs=1800`, viewport odaklı grid cache.
- Görsel kalibrasyon güncellendi; renkler görünümdeki skor dağılımına göre yeniden ölçeklenir.
- Gri hücreler `henüz hesaplanmadı / veri yok` durumunu gösterecek şekilde geri getirildi.
- Legend ve durum metni, daha sert bağlantı metriğini ve görünüm bazlı hazırlık akışını daha açık anlatır hale getirildi.

## 2026-03-31

### Stabil temel sürüm

- Tek aktif GTFS veri seti modeli netleştirildi.
- Upload-first başlangıç akışı kalıcı hale getirildi.
- Electron masaüstü akışı ve GitHub Pages vitrini birlikte çalışır duruma getirildi.
- Web demo girişi `docs/app/` altında açıldı.
- Türkçe metin bozulmalarına karşı otomatik metin denetimi eklendi.
- Üçüncü parti lisans özeti `THIRD_PARTY_NOTICES.md` ile belgelendi.
- Kullanılmayan `.glb` model yolu kaldırıldı, 2D araç görünümüne sabitlendi.

### README ve dil seçeneği

- README içine hata, fix ve özellik için nereye bakılacağını açıklayan yönlendirmeler eklendi.
- `README.en.md` ile İngilizce README sürümü eklendi.
- Uygulamaya ilk etap TR/EN dil seçeneği eklendi; landing ve temel onboarding metinleri değiştirilebilir hale getirildi.

## 2026-04-01

### Yön seçimi ve araç görünürlüğü

- Hat seçiminde `Hat Yönü` seçici eklendi.
- Seçili hatta yön bazlı renk ayrımı görünür hale getirildi.
- Araç üstünde hat kodu ve yön etiketi gösterimi eklendi.
- Electron ve web demo arayüzleri bu yeni yön akışıyla senkronlandı.

### İngilizce kapsamı ve arayüz temizliği

- Route, stop, service, planner, araç, warning ve loading metinlerinin büyük kısmı TR/EN desteğine bağlandı.
- Kalan sabit arayüz metinleri, harita stil etiketleri ve panel başlıkları yerelleştirildi.
- README ve repo dokümanlarında Türkçe karakter ve encoding bozulmaları temizlendi.

### Örnek veriyle başlama akışı

- Landing ekrana `Örnek veriyle dene` alanı eklendi.
- Konya, İzmir ESHOT ve Bordeaux için hazır örnek veri kartları eklendi.
- Örnek veri kartlarına SVG ülke bayrakları eklendi.
- `Linkten Yükle` akışı Electron tarafında aktif tutuldu; web demo için güvenli örnek veri akışı korundu.

### Web demo veri kararlılığı

- Web demodaki `Failed to fetch` sorunu CORS kaynaklı olacak şekilde netleştirildi.
- Web demo örnek verileri `docs/data/` altında aynı origin üzerinden yayınlanır hale getirildi.
- `docs/data/samples.json`, `npm run check:samples` ve `npm run update:samples` ile örnek veri bakım altyapısı eklendi.

## Not

- Ayrıntılı günlük yerine kısa ürün kilometre taşları tutulur.
- Açık işler `docs/repo/yol-haritasi.md` ve `docs/repo/hata-listesi.md` içinde izlenir.
