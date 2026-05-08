# GTFS City - Hata Listesi

Bu belge, açık hata kayıtlarını ve veri doğruluğu başlıklarını toplar.
Ürün geliştirme fikirleri bu dosyada değil, `yol-haritasi.md` içinde tutulur.

## Alanlar

- Öncelik: `Yüksek`, `Orta`, `Düşük`
- Platform: `Desktop`, `Web`, `Her ikisi`
- Durum: `Açık`, `İnceleniyor`, `Yerelde düzeltildi`, `Veri kontrolü`, `Çözüldü`

## Açık Kayıtlar

| Başlık | Tur | Öncelik | Platform | Durum | Etki |
|---|---|---|---|---|---|
| VBB feed'de büyük feed route davranışı kısmi kalıyor | Bug / Mimari | Yüksek | Her ikisi | İnceleniyor | Faz 7 ile shape + viewport + GPU bütçesi iyileşti; canlı büyük feed doğrulaması tamamlanmadan kapanmış sayılmaz |
| Büyük GTFS feed'de WebGL context loss | Performans / Render | Yüksek | Her ikisi | İnceleniyor | Harita ilk yüklemede veya route focus sonrası tamamen kaybolabiliyor |
| VBB'de araç ikonları noktaya dönüyor | Bug / Render | Yüksek | Her ikisi | Açık | `layerPolicy.allowIcons` render bütçesi aşılınca false oluyor; ScatterplotLayer devreye giriyor. Kök neden: VBB'de trip sayısı ikon katmanı için eşiği aşıyor. Çözüm: allowIcons eşiğini kalibre etmek veya her zaman icon göstermek. |
| Durak panelinde ortalama headway hesabı hatalı | Bug | Orta | Her ikisi | Açık | Durak panelinde gösterilen ortalama headway değeri yanlış; formül ve veri kaynağı kontrol edilmeli. |
| Sol menü hat listesi route_id yerine short_name ile çalışıyor | Bug / Mimari | Orta | Her ikisi | Kısmen çözüldü | Map layer tarafı rid ile çalışıyor (commit `b389ea5`). ui-manager `focusRoute()` fallback'leri hâlâ short_name kullanıyor — büyük feed'lerde yanlış seçim riski devam ediyor ama görsel etki azaldı. |

## Yeni Çözülmüş Kayıtlar (2026-05-08)

| Başlık | Tur | Öncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| Route panel'de büyük feed durak listesi 3 durağa düşüyordu | Bug | Yüksek | Her ikisi | Çözüldü | `getOrderedStopsForPattern`: `routeRuntimeSource.tripStops` boşsa `preparedGtfsSource.tripStops` fallback; commit `f6e1793` |
| Route panel durak listesi komple kayboldu (Faz 7 sonrası) | Bug / Regresyon | Yüksek | Her ikisi | Çözüldü | Worktree kopyası `ui-manager.js`'i overwrite edince "Duraklar (N)" bölümü, yön pill'leri, stop click handler silindi; geri eklendi; commit `d8d2e74` |

## Yeni Çözülmüş Kayıtlar

| Başlık | Tur | Öncelik | Platform | Durum | Not |
|---|---|---|---|---|---|
| Şekli olmayan hatların güzergah çizgisi haritada görünüyor | Bug / UX | Orta | Her ikisi | Çözüldü | `noShape` bayraklı hatlar için `nonMetroDashed` layer (alpha 70 yarı saydam çizgi) kaldırıldı; şekli olmayan hatlar artık haritada hiç çizilmiyor. commit `b389ea5` |
| Hat seçilince güzergah çizgisi çok şeffaf görünüyor | Bug / UX | Yüksek | Her ikisi | Çözüldü | Seçili hat alpha 230 (tam görünür), diğer hatlar alpha 18 (soluk). `isFocused` flag + `routeMatchesFocus` rid-aware kontrol. commit `8ed5c77` |
| Hat seçiminde yanlış güzergah vurgulanıyor (VBB aynı short_name) | Bug | Yüksek | Her ikisi | Çözüldü | Segment objesine `rid` eklendi; `getShapeColor` ve `routeMatchesFocus` artık `focusedRouteId` ile eşleştiriyor. commit `b389ea5` |
| Takvim heatmap sadece bugünkü service_id'leri gösteriyor | Bug | Yüksek | Her ikisi | Çözüldü | `tripCountBySid` `preparedSource.tripMeta`'nın tamamından hesaplanıyor; `tariffIndex` artık yalnızca çalışma takvimi için kullanılıyor; commit `f0b263f` |
| Durak panelinde eksik hat/sefer — departure board TRIP_CAP kırpılı | Bug | Yüksek | Her ikisi | Çözüldü | `renderStopPanel` / departure board `stopTariffIndex` kullanıyor; commit `040ef84` + `7120560` |
| Tarih değiştirince bazı hatlarda sefer görünmüyor (T1 örneği) | Bug | Yüksek | Her ikisi | Çözüldü | `activeServiceIds` filtrelemesi ve runtime merge akışı düzeltildi; commit `2cdce69` |
| Pattern summary tıklanınca açılmıyor | Bug / UX | Orta | Her ikisi | Çözüldü | Inspector pattern öğesi click handler bağlandı; commit `2cdce69` |
| Sefer saati gösterimi hatalı | Bug | Orta | Her ikisi | Çözüldü | Departure board sefer saatleri `stopTariffIndex`'ten alınıyor, HH:MM format düzeltildi; commit `040ef84` + `920c513` |
| GTFS parse: eksik duraklar, yanlış sefer saati, TripsLayer boş | Bug / Parse | Yüksek | Her ikisi | Çözüldü | 3 kök neden bulundu ve düzeltildi — ayrıntı aşağıda |
| Haritada TRIP_CAP sonrası duraklar görünmüyor (tip/route filtresi) | Bug | Yüksek | Her ikisi | Çözüldü | `getFocusedStopsData` + `getFilteredStopsData` stopDeps yerine stopTariffIndex kullanıyor |
| `secsToHHMM` gece seferlerinde yanlış saat (01:30 / 25:30) | Bug | Orta | Her ikisi | Çözüldü | `% 24` → `% 48` |
| VBB feed'de route search/list bazı hatları göstermiyor | Bug | Yüksek | Her ikisi | Çözüldü | routeCatalog cap/runtime budamasından çıkarıldı; tam routes.txt kataloğu gösteriliyor |
| Durak Aramada Liste Kapanıyor | Bug | Yüksek | Her ikisi | Çözüldü | Sorgu varsa tüm durak seti taranır, sonuçlardan ilk 300 gösterilir |
| Landing açıkken planner görünüyor | UX Bug | Orta | Her ikisi | Çözüldü | Landing modunda planner ve map-only overlay'ler gizleniyor |
| Windows `npm run dev` script uyumsuzluğu | Tooling Bug | Orta | Desktop | Çözüldü | `package.json` içindeki `dev` script'i Windows uyumlu hale getirildi |
| Dev modda DevTools otomatik açılıyor | Tooling / UX | Düşük | Desktop | Çözüldü | DevTools auto-open kaldırıldı, menü üzerinden açılıyor |

## Notlar

### GTFS parse: 3 kök neden (2026-05-02)

Benzer diğer araç worker kodları incelenerek karşılaştırma yapıldı. Üç bağımsız bug tespit edildi:

**Bug 1 — `% 86400` zehiri (yanlış sefer saati)**
`gtfs-worker.js` ve `gtfs-utils.js` async fallback'te `ts` dizisi `% 86400` ile hesaplanıyordu. Gece yarısı geçen seferler (örn. 23:00→01:00) non-monotonic timestamp üretiyor, araçlar gece 3-4'te görünüyordu. Düzeltme: `% 86400` kaldırıldı; `st.off` da artık mutlak saniye.

**Bug 2 — TRIP_CAP sonrası eksik duraklar**
`nSTOP_INFO` yalnızca cap içinde kalan seferlerin duraklarıyla dolduruluyordu. >10K seferli feedlerde (Kocaeli dahil) kap'a düşen seferlerin durakları haritada görünmüyordu. Düzeltme: trip loop sonunda tüm `stopsMap` taranarak eksik duraklar ekleniyor (MAX_STOPS limiti hâlâ geçerli).

**Bug 3 — TripsLayer her zaman boştu (`_tsPatched` hiç set edilmiyordu)**
`map-manager.js` animated trail layer'ı için yalnızca `_tsPatched: true` olan trip'leri kullanıyor. `patchTripsAbsoluteTime()` bu flag'i yalnızca `ts[0] === 0` koşulunda set ediyordu; tüm seferler `ts[0] = startSec > 0` ile başladığından hiçbiri patch edilmiyordu. Düzeltme: flag artık builder'da (`gtfs-utils.js` + `gtfs-worker.js`) doğrudan set ediliyor.

Commit: `360d34d` — `fix(gtfs): 3 kritik parse hatası`

- `VBB feed'de büyük feed route davranışı` kaydında kök neden tek katmanlı değil:
  - routeCatalog ve timetable artık tam veriyle çalışır
  - ama harita/shape/araç davranışı seçmeli runtime subset ve render bütçesine bağlıdır
  - route-scoped loading ilk çalışan sürüme ulaştı; üretim kalitesi için cache + job iptali + canlı doğrulama gerekir
- route ve stop tariff tam veriden gelir; harita/shape/araç tarafı halen runtime alt kümesine ve render bütçesine bağlıdır.
- `Durak panelinde eksik hat/sefer` kaydında kök neden: `stopDeps` TRIP_CAP ile kırpılıyor, `stopTariffIndex` kullanılmalı. Harita katmanı düzeltildi ama departure board henüz düzeltilmedi.
- `Tarih değiştirince sefer görünmüyor` kaydında T1 örneği doğrulandı; `activeServiceIds` veya runtime merge akışında filtreleme sorunu araştırılacak.
- `Büyük GTFS feed'de WebGL context loss` kaydında şu başlıklar kontrol edilmeli:
  - route-scoped yükleme sonrası layer rebuild maliyeti
  - viewport daraltması ve render bütçesi eşikleri
  - `TripsLayer` / icon / text / 3D katmanlarının birlikte açık kaldığı senaryolar
  - safe mode sonrasında context restore davranışı

## Kullanim Notu

- Çözüm uygulandığında durum güncellenir veya kayıt kaldırılır.
- Yeni hata eklerken kısa başlık, etki ve veri kontrol notu birlikte yazılır.
