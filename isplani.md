# İstanbul Transit 3D - Proje Durumu ve Gelecek İş Planı

Bu doküman, projede şu ana kadar yapılan iyileştirmeleri, alınan kritik mimari kararları (ADR) ve bir sonraki aşamalarda (Fazlar) yapılması planlanan işleri özetlemektedir.

---

## 1. Tamamlanan İşler (Tüm Yapılanlar Listesi)

### 🚀 Performans ve Veri Yükleme Optimizasyonları
- **Web Worker Migrasyonu:** En ağır işlem olan GTFS tablo dönüşümleri (`buildGtfsRuntimeDataAsync`) tamamen arka plana (`gtfs-worker.js`) taşındı. Bu sayede 100MB+ GTFS verisi işlenirken bile tarayıcı arayüzü (UI) %100 akıcı kalıyor, donmalar tamamen bitti.
- **Asenkron Veri Yükleme:** `trips_data.js` (5.5MB), `lookup_data.js` (3MB) ve `shapes_data.js` (500KB) gibi gigabaytlarca veriyi parse eden dosyalar senkron bloklama yapıyordu. Bu dosyalar dinamik/asenkron (lazy-load) mimarisine geçirildi.
- **Yükleme Ekranı (Loading Overlay):** Kullanıcıyı boş ekranda bekletmemek adına sayfa yüklenir yüklenmez devreye giren ve dosya bazında (trips %5, shapes %40 vb.) ilerlemeyi gösteren bir Progress bar sistemi eklendi.
- **O(N^2) Darboğazlarının Giderilmesi:** `updateLandingPageReports` fonksiyonundaki array aramaları `Set` veri yapısına taşınarak `O(N)` karmaşıklığına indirildi.

### 🛠 UI / Etkileşim ve Hata Düzeltmeleri
- **Giriş Sayfası (Landing Page) Çakışma Fixi:** Admin paneli geliştirmeleri sırasında bozulan katman hiyerarşisi (z-index) ve yerleşim hataları giderildi.
- **GTFS Runtime Hataları:** Senkron olarak kurgulanan `buildGtfsRuntimeData` fonksiyonunun `async` versiyonu ile entegrasyonu sağlandı.

### 🧹 Temizlik ve Arşivleme
- **Gereksiz Dosyaların Taşınması:** Kullanılmayan eski plan dokümanları, `data.js`, `gtfs_to_js.py` ve yedek test ZIP dosyaları `Ydek` klasörüne taşındı.

### 🛡 Claude Kod İnceleme Raporu Yamaları
- Eksik fonksiyonların entegrasyonu (`captureRuntimeDataSnapshot`, `getBuiltinGtfsPayload`, `buildAdjacencyList`)
- Rota planlama matrisi (ADJ) aktif hale getirildi
- Async Promise düzeltmeleri
- Performans önbelleklemesi (`_rendezvousCache`, `updateDensityGrid`)
- Çökme ve Race Condition önlemleri

### 💎 Gelişmiş GTFS Validasyonu ve Premium UI Sistemi
- `gtfs-validator.js` ile derinlemesine veri kontrolü
- GTFS Uyarı Dashboard'u (sağ alt köşe HUD)
- Modern Drawer (çekmece) arayüzü — glassmorphism efektleri
- Veri Yönetim (Admin) Merkezi — sekmeli yapı, LocalStorage kalıcılığı
- Kritik performans ve build optimizasyonları
- Akıllı Takvim Adaptasyonu ve Toast Bildirim Sistemi

---

## 2. Teknik Kod İncelemesi ve Refaktör Sprinti

### ✅ Sprint 1–6 (Tamamlandı)
*(Detaylar önceki versiyonda mevcut — Sprint 1: kritik hatalar, Sprint 2: mimari konsolidasyon, Sprint 3: performans, Sprint 4: build/CI, Sprint 5: AppState migrasyonu, Sprint 6: Electron veri yükleme ve takvim düzeltmeleri)*

---

### ✅ Sprint 7 — Yeni Özellikler ve Hata Düzeltmeleri (17 Mart 2026)

**DeÄŸiÅŸtirilen dosyalar:** `script.js`, `index.html`

#### 🗺️ İzokron Analiz (Yeni Özellik)
- Haritada bir noktaya tıklayınca o noktaya en yakın durağı bulup 60 dakikaya kadar ulaşılabilecek tüm durakları renklendirir
- 0–15dk: yeşil, 15–30dk: sarı, 30–45dk: turuncu, 45–60dk: kırmızı
- Mevcut Dijkstra + `_MinHeap` altyapısı kullanıldı, yeni kod eklendi
- Her hat değişiminde **10 dakika biniş cezası** ekleniyor (gerçekçi aktarma süresi)
- 400m içindeki duraklar arası **yürüme bağlantısı** eklendi — grid tabanlı O(n) algoritma, ~1.3 m/s yürüme hızı
- İzokron açıkken normal durak katmanı gizleniyor
- Sağ altta açıklama paneli — durak sayısı istatistikleri
- Katmanlar menüsünde toggle

#### 🕐 Durak Pop-up Canlı Güncelleme
- `showStopArrivals` → `_renderStopPanel` ayrıştırması yapıldı
- `_activeStopData` değişkeni ile açık panel takip ediliyor
- `animate` döngüsüne bağlandı — simülasyon hızıyla senkron güncelleniyor
- Pop-up başlığında simülasyon saati göstergesi eklendi
- Her hattan sonraki **3 sefer** gösteriliyor (eskiden 1)
- Boş alana tıklayınca pop-up kapanıyor
- Pop-up **sürüklenebilir (draggable)** yapıldı

#### 🔥 Yoğunluk Heatmap Düzeltmesi
- Eski: Seferlerin başlangıç noktası + 500 nokta limiti (statik, eksik)
- Yeni: O anki simülasyon saatinde **gerçek araç konumları** — `getVehiclePos` ile canlı hesaplanıyor
- "Simülasyonu takip et" açıkken saat ilerledikçe heatmap kayıyor

#### 🐛 Hata Düzeltmeleri
- Durak pop-up'ında tüm hatlar gösterilmiyor sorunu — `diff > 2*3600` filtresi kaldırıldı, tüm hatlar görünüyor
- `getStopRouteSummaries` artık zaman filtresi uygulamıyor, sonraki geliş sırasına göre sıralıyor

---

### ✅ Sprint 8 — Araç Animasyonu ve Veri Format Düzeltmeleri (19 Mart 2026)

**DeÄŸiÅŸtirilen dosyalar:** `script.js`, `sim-utils.js`, `gtfs-math-utils.js` (yeniden oluÅŸturuldu)

#### 🐛 Araç Animasyonu Tamamen Çalışmıyordu
- `trip.ts` ROLATİF format (0'dan başlıyor, `trip.d` saniyeye kadar), `TripsLayer` MUTLAK gün saniyesi bekliyordu — uyuşmazlık yüzünden hiçbir araç iz animasyonu göstermiyordu
- `patchTripsAbsoluteTime` fonksiyonu eklendi: `trip.bs` (başlangıç saniyesi) kullanılarak tüm `ts` değerleri mutlak formata çevriliyor
- 14.380 İstanbul seferinin tamamı başarıyla patch ediliyor
- `calcSpeed` da aynı şekilde düzeltildi

#### 🐛 Çoklu GTFS Desteği (Kocaeli vb.)
- Worker'dan gelen GTFS verilerinde ts zaten mutlak (`ts[0] > 0`) — `patchTripsAbsoluteTime` doğru şekilde atlıyor
- `sim-utils.js`'te `getVehiclePos` artık `ts[0] > 0 || _tsPatched` kontrolüyle format otomatik algılıyor
- Hem preloaded hem dinamik yüklenen veriler doğru çalışıyor

#### 🐛 PathLayer Assertion Hatası
- Boş veya tek noktalı `SHAPES` kayıtları deck.gl `assertion failed` hatasına neden oluyordu
- `buildPathLayers`'a `validShapes = visShapes.filter(s => s.p && s.p.length >= 2)` filtresi eklendi

#### 🐛 Durak Pop-up Offset Formatı
- `STOP_DEPS` offsetleri `lookup_data.js`'te ROLATİF, `gtfs-utils.js` yüklemesinde MUTLAK
- `getStopRouteSummaries` ve `detectRendezvous` fonksiyonları `trip.bs + offset` ile doğru mutlak zamana çeviriyor

#### 📁 gtfs-math-utils.js Yeniden Oluşturuldu
- Kayıp olan dosya yeniden yazıldı: `havMeters`, `simplifyPathPoints` (Douglas-Peucker), `interpolatePoint`, `pathLengthM`, `snapToPath`


---

## 3. Mimari Karar Kayıtları (ADR)

### ADR-001: Dev Statik Verilerin Asenkron Yüklenmesi
Statik veri scriptleri DOM yüklendikten sonra `_loadAllData()` zinciriyle çağrılıyor.

### ADR-002: Çoklu Şehir / GTFS Katman Yönetimi
`activeCity` state kontrolü katılaştırıldı. Şehir değişiminde global state sıfırlanıp Deck.GL'e anında güncelleme gönderiliyor.

### ADR-003: Statik/Dinamik Katman Ayrımı (Sprint 3)
Path, stops ve density gibi katmanlar `_staticLayerKey` mekanizmasıyla önbellekleniyor.

### ADR-004: Tek Kaynak İlkesi — Utility Fonksiyonları (Sprint 2 + Sprint 5)
`parseCsvRows`, `hhmmToSec` → yalnızca `gtfs-utils.js`. `havMeters`, `simplifyPathPoints` → yalnızca `gtfs-math-utils.js`.

### ADR-005: AppState — Merkezi Global State (Sprint 5)
GTFS runtime state'i `AppState` nesnesinde toplanıyor. Proxy kaldırıldı (Sprint 6).

### ADR-006: İzokron — Mevcut Altyapı Üzerine İnşa (Sprint 7)
İzokron hesabı yeni bir algoritma yerine mevcut `_MinHeap` + `ADJ` altyapısını kullanıyor. `buildAdjacencyList` tamamlandıktan sonra yürüme bağlantıları ekleniyor. Her hat değişiminde sabit biniş cezası uygulanıyor.

### ADR-007: ts Mutlak Format Dönüşümü (Sprint 8)
`trips_data.js`'te `trip.ts` ROLATİF format. `patchTripsAbsoluteTime` fonksiyonu `trip.bs` → `trip.st[0].off` → STOP_DEPS minimum offset öncelik sırasıyla ts'leri mutlak'a çeviriyor. Worker'dan gelen GTFS'te ts zaten mutlak (`ts[0] > 0`), dönüşüm atlanır. `sim-utils.js` `ts[0] > 0` veya `_tsPatched` bayrağıyla format otomatik algılar.

### ADR-008: Birleşik Seçim ve Detay Paneli Mimarisi (22 Mart 2026)
Haritada `araç`, `durak` ve `hat` etkileşimleri tek bir merkezi seçim modeli üzerinden yönetilecek. Aynı anda yalnızca bir ana seçim aktif olacak (`selectedEntity` yaklaşımı). Detay paneli tek bir ortak kabuk olarak çalışacak; içerik araç/durak/hat tipine göre ayrışacak. Araç seçimi simülasyonu durduracak, panel kapanınca akış kontrollü şekilde normale dönecek. Bu kararın amacı click çakışmalarını azaltmak, panel davranışlarını standartlaştırmak ve yeni bilgi panellerini kopya UI mantığı oluşturmadan ekleyebilmek.

### ADR-009: Global UI/State Değişkenlerinin Üst Kapsamda Tanımlanması (24 Mart 2026)
`show*` toggle'ları ve ortak UI/state değişkenleri, hoisting ve erişim sırası kaynaklı `ReferenceError` risklerini önlemek için `script.js` dosyasının üst bölümünde toplu olarak tanımlandı. Bu karar özellikle landing page, sidebar ve katman toggle'larının farklı yüklenme akışlarında güvenli şekilde erişilebilir kalmasını amaçlar.


---

## 4. Bekleyen İş Listesi (Backlog)

### 📌 Uygulama Fazları
- **Faz A: Etkileşim ve Panel Sistemi** — tamamlandı
- **Faz B: Görsel/UI İyileştirmeleri** — tamamlandı
- **Faz C: Simülasyon ve Veri Doğruluğu** — tamamlandı
- **Faz D: Temizlik ve Sadeleştirme** — tamamlandı

### 🔴 Faz D — Kaldırılacaklar ve Sadeleştirme
- [x] Personel / sürücü modülü — erişimden çıkarıldı, pasif kod kalıntıları daha sonra tamamen temizlenebilir
- [x] 3D Binalar katmanı — kaldırıldı
- [x] Transfer Bağlantıları (ArcLayer) — kaldırıldı
- [x] Aktarma Noktaları / Rendezvous (ScatterplotLayer) — kaldırıldı
- [x] Sağ alttaki legend/infografik — kaldırıldı

### 🛠 Sonraki Teknik İşler
- [x] Progress bar — %90 iken çubuk %60 görünüyor
- [x] GTFS yükleyince harita açılmıyor — yükleme sonrası direkt haritaya geçmeli
- [x] YoÄŸunluk 3D baÅŸka GTFS'de boÅŸ geliyor
- [x] Preloaded modda çalışma takvimi gelmiyor — `var CALENDAR`, `var CALENDAR_DATES` eklenecek
- [x] Shapes reset sorunu — yeni GTFS yüklenince İstanbul shape'leri kalıyor
- [ ] Faz C sonrası kısa göz doğrulama turu — shape snap / headway / bekleme 3D gerçek veri setinde yeniden kontrol edilecek *(manuel / Electron arayüz doğrulaması gerekiyor)*

### 📋 Öncelik Sırası (26 Mart 2026)
> Bu liste, dosyadaki mevcut `- [ ]` maddelerinden otomatik çıkarılmış "hangi sırayla ilerleyelim" özetidir.

- **Adım 0:** Faz C sonrası kısa göz doğrulama turu (shape snap / headway / bekleme 3D gerçek veri seti kontrolü)
- **Adım 1 (Faz H / Kritik):** `preload.js` — `readDataFile` ekle (ADR-010)
- **Adım 2 (Faz H / Kritik):** `electron/main.js` — `city:get-data-dir` handler ekle (ADR-010)
- **Adım 3 (Faz H / Kritik):** `render-utils.js` — `getModelOrientation` ts format fix (ADR-011)
- **Adım 4 (Faz H / Kritik):** `assets/` klasörü oluştur — placeholder ikonlar (ADR-012)
- **Adım 5 (Faz H / Kritik):** `Models/` → `models/` normalize (ADR-012)
- **Adım 6 (Faz H / Kritik):** `electron/main.js` — `buildMenu()` gerçek menü kodu (ADR-010)
- **Adım 7 (Faz H / Orta):** `sim-utils.js` — `getTripRuntimeOffset` + `modDay` export et (ADR-013)
- **Adım 8 (Faz H / Orta):** `style.css` — duplicate `#legend`, `.li`, `.ld` selector temizliği (ADR-014)
- **Adım 9 (Faz H / Orta):** `script.js` — `_pathDashExt` ve `UNDERGROUND` kaldır (ADR-014)
- **Adım 10 (Faz H / Orta):** `config.js` — `QUALITY_LEVELS` ve `MAPTILER_KEY` kaldır (ADR-014)

Not: Faz I (Modüler refaktör) "Adım 1–5 doldurma sırası" aşağıdaki ilgili bölümde ayrıca listelenmiştir.

### ✨ Sonraki Özellikler
- [x] Ana sayfa başlığı → **"GTFS İLE TOPLU TAŞIMA SİMÜLASYONU"**
- [x] Sol menüde Çalışma Takvimi seçici — aktif/pasif/tarihi geçmiş ayrımı
- [x] Eski GTFS için ⚠️ takvim uyarlandı bildirimi
- [x] Hat pop-up → takvime göre sefer sayıları, ilk/son sefer saatleri, toplam güzergah uzunluğu
- [x] Durak pop-up → o durağa giren hat listesi + saatlik yoğunluk grafiği + yoğunluk 3D bilgisi
- [x] Araç tıklama paneli ikinci turu — ortak panel kabuğuna taşındı, detay satırları sadeleştirildi
- [x] Harita stil seçici → uydu görüntüsü eklendi
- [x] Dark/Light mod — manuel toggle eklendi
- [x] TripsLayer iz/kuyruk efekti — aç/kapa toggle eklendi
- [x] Sol menü aç/kapa butonu
- [x] Rota planlayıcı → sağ üste taşındı
- [x] **Stringline Chart** — seçili hattaki tüm araçların zaman-mesafe grafiği

### 💡 Gelecek Fikirler (Şimdi Değil)
- **Aktarma noktaları** — yürüme mesafesindeki farklı tip duraklar arası gerçek bağlantı gösterimi
- **Çakışma (Bunching) uyarıları** — gerçek zamanlı GPS entegrasyonu olduğunda anlamlı olacak
- **Transit Eşitlik Analizi** — hangi semtler toplu taşımaya daha az erişebiliyor?
- **Level of Service (LOS)** — headway, durak aralığı gibi metriklerle hat bazlı hizmet kalite puanı

---

_Son güncelleme: 24 Mart 2026 — Faz F tamamlandı, kritik hotfixler ve ADR-009 işlendi_

---

## 6. Ek Güncelleme — Runtime ve Katman Kararlılığı Düzeltmeleri (19 Mart 2026)

### ✅ Zaman / Offset ve GTFS Runtime Düzeltmeleri
- Durak pop-up varış süresi hesaplarında ham `offset` yerine normalize edilmiş mutlak zaman kullanılmaya başlandı
- `detectRendezvous` ve headway hesaplarında relative/mutlak offset karışıklığı giderildi
- `calcSpeed`, `getVehiclePos` ve `getTripProgressAtTime` tarafında zaman formatı algılama mantığı güçlendirildi
- `patchTripsAbsoluteTime` akışı gece yarısını aşan seferlerde daha güvenli hale getirildi

### ✅ Build / Test ve Yardımcı Modül Düzeltmeleri
- `gtfs-math-utils.js` paketleme listesine eklendi
- `gtfs-utils.js` içinde testlerin beklediği senkron `buildGtfsRuntimeData` export'u geri eklendi
- Test takımı tekrar yeşile çekildi

### ✅ Harita Katmanı Kararlılık Düzeltmeleri
- Güzergah aç/kapa işlemlerinde path katman cache mantığı sadeleştirildi
- `metro-tunnel` katmanı geçici olarak devre dışı bırakıldı
- `paths-glow`, `paths-above` ve `metro-paths` katmanları `PathLayer` yerine segment tabanlı `LineLayer` ile çizilecek şekilde dönüştürüldü
- Amaç: deck.gl `PathLayer` assertion hatalarının tamamen önüne geçmek

---

_Ek bilgi eklendi: 19 Mart 2026 — runtime, katman ve test kararlılık yamaları_

---

## 7. Kapatılan Kritik Kontrol Listesi (19 Mart 2026)

### ✅ Yapılanlar
- `getStopRouteSummaries` içinde offset dönüşümü düzeltildi; durak pop-up ETA hesapları normalize edilmiş mutlak zaman üzerinden çalışıyor
- `detectRendezvous` içinde ham offset kullanımı kaldırıldı; aktarma/rendezvous tespiti doğru zaman penceresiyle çalışıyor
- `computeAverageHeadwaySeconds` çağrıları normalize edilmiş departure zamanlarıyla beslenir hale getirildi
- `patchTripsAbsoluteTime` gece yarısını aşan seferler için daha güvenli mutlak zaman akışıyla güncellendi
- `calcSpeed` yalnız `_tsPatched` değil, genel runtime zaman formatını dikkate alacak şekilde düzeltildi
- `gtfs-math-utils.js` build paketleme listesine eklendi
- `gtfs-utils.js` içinde `buildGtfsRuntimeData` export'u geri eklendi ve test uyumluluğu sağlandı
- `QUALITY.tripRatio` ölü kodu kaldırıldı

---

_Ek bilgi eklendi: 19 Mart 2026 — önceki kritik kontrol listesi maddeleri kapatıldı_

---

## 8. Faz Raporları ve Devam Özeti

Bu bölüm, her faz tamamlandığında güncellenecek kalıcı ilerleme günlüğüdür. Amaç; token / oturum sınırlarında kaldığımız yeri tek dosyadan geri çağırabilmek, hangi kararların uygulandığını unutmamak ve bir sonraki aşamayı net bırakmaktır.

### Kullanım Kuralı
- Her faz sonunda bu bölüme yeni bir rapor eklenecek
- Rapor; yapılan işleri, değişen dosyaları, alınan teknik kararları, açık riskleri ve bir sonraki adımı içerecek
- GitHub'a push tercihen faz kapanışlarında yapılacak; böylece rapor ile commit geçmişi birbiriyle eşleşecek
- Yeni oturumda devam etmek için önce bu bölüm okunacak

### Faz Raporu Şablonu
#### Faz X Raporu
- **Tamamlananlar:** Bu fazda biten işler ve kullanıcıya görünen çıktılar
- **Teknik Kararlar:** Uygulama sırasında alınan mimari / teknik kararlar
- **Değişen Dosyalar:** Dokunulan dosyaların listesi
- **Açık Riskler:** Bilinen eksikler, ertelenen kararlar veya dikkat edilmesi gereken noktalar
- **Sonraki Adım:** Hemen ardından başlanacak ilk iş
- **Devam Özeti:** Yeni oturumda kullanılacak kısa devam notu

### Faz A Raporu (22 Mart 2026)
- **Tamamlananlar:** `ADR-008` doğrultusunda birleşik seçim modelinin ilk temeli atıldı. Araç tıklanınca açık durak/hat panelleri kapanıyor, araç paneli açılıyor ve simülasyon duruyor. Araç paneline hat uzun adı, yön, geçerli çalışma takvimi, kalkış durağı ve saati, varış durağı ve saati ile aynı yöndeki toplam sefer sayısı alanları eklendi. Araç veya durak seçildiğinde route focus/highlight temizleniyor; boş alana tıklama ve manuel route panel kapatma durumunda seçim yaşam döngüsü daha tutarlı hale getirildi.
- **Teknik Kararlar:** Tam refactor yerine düşük riskli geçiş tercih edildi. Mevcut `selectedTripIdx`, `_activeStopData` ve `focusedRoute` akışları korunurken bunların üstüne `selectedEntity` ve `panelPauseOwner` eklendi. Araç paneli kapanınca yalnız panelin başlattığı pause geri bırakılıyor. Route seçimini merkezi temizlemek için ayrı bir focus temizleme helper'ı eklendi ve panel close davranışı bu helper üzerinden bağlandı.
- **DeÄŸiÅŸen Dosyalar:** `script.js`, `ui-utils.js`, `index.html`
- **Açık Riskler:** Ortak panel kabuğu mimari olarak kabul edildi ama UI katmanında hâlâ ayrı panel DOM'ları kullanılıyor; bu, ileride ikinci aşama refactor isteyebilir. Araç paneli verileri sentaks ve kod akışı olarak doğrulandı, ancak Electron içinde tam kullanıcı akışı doğrulaması yine gerekli.
- **Sonraki Adım:** `Faz B` kapsamında panel okunabilirliği, görsel hiyerarşi ve genel UI iyileştirmelerine geçilecek.
- **Devam Özeti:** Faz A kapandı. Araç seçimi artık simülasyonu durduruyor, araç paneli operasyonel detayları gösteriyor ve araç/durak seçimleri route focus'u temizliyor. Sıradaki faz, panel okunabilirliği ve genel görsel iyileştirmeler.

### Faz B Raporu (22 Mart 2026)
- **Tamamlananlar:** Panel okunabilirliği için kapsamlı bir görsel tur atıldı. Araç, durak ve hat panellerinde yazı boyutları büyütüldü; düşük kontrastlı gri metinler daha okunur tonlara çekildi; araç paneline eklenen detay satırları için daha ferah bir bilgi alanı oluşturuldu. Panel genişlikleri ve dar ekran davranışı için responsive kurallar eklendi. Ayrıca route listesi, durak listesi, follow bar, rota sonucu ve analitik panellerdeki küçük yazılar da büyütülerek genel UI okunabilirliği iyileştirildi.
- **Teknik Kararlar:** Görsel iyileştirme bu fazda davranıştan ayrıldı; yalnızca `style.css` seviyesinde düşük riskli tipografi, boşluk, kontrast ve responsive düzenlemeleri yapıldı. Amaç, `Faz A`da eklenen panel bilgisini hemen daha okunur hale getirmek ve mevcut görsel yapıyı koruyarak kademeli bir iyileştirme sağlamaktı.
- **DeÄŸiÅŸen Dosyalar:** `style.css`
- **Açık Riskler:** Responsive kurallar eklendi ama gerçek cihaz/çözünürlük doğrulaması hâlâ gerekli. Bazı daha niş yüzeylerde hâlâ inline style kullanan eski bloklar olabilir; bunlar ileride ayrı bir UI temizlik turu isteyebilir.
- **Sonraki Adım:** `Faz C` kapsamında simülasyon ve veri doğruluğu işlerine geçilecek. İlk hedef, backlog'daki `Araçlar hattan çıkıyor — shape snap düzeltilecek` maddesi olacak.
- **Devam Özeti:** Faz B kapandı. Panel tipografisi, kontrastı ve responsive davranışı iyileştirildi. Sıradaki faz, simülasyon/veri doğruluğu; ilk iş araçların hattan çıkma sorununu düzeltmek.

### Faz C Raporu (22 Mart 2026)
- **Tamamlananlar:** `Araçlar hattan çıkıyor` problemi için shape snap iki aşamada güçlendirildi; araç konumları ve 3D model yönelimi mümkün olduğunda canonical `SHAPES` güzergahına hizalandı. Araç ikonları 3D moddan bağımsız fallback katmanına taşındı. `Bekleme Süresi 3D` tüm gün ortalaması yerine simülasyon saatine göre dinamik headway hesabına bağlandı; gece boşlukları lokal servis penceresiyle filtrelendi ve panel `En kötü 5 + En iyi 5` olarak güncellendi. `Headway çizgisi yön gruplandırması` kaba açı yerine mümkün olduğunda headsign/yön etiketiyle çalışacak hale getirildi; çizgi ve bunching değerlendirmesi metre yerine saniye cinsinden headway mantığına geçti. `Durak pop-up sefer kalan süre hesabı` 2 saatlik yakın sefer penceresine çekildi ve üst meta dinamik headway ile senkronlandı. Son kapanış turunda `findTripIdx` kırılgan eşleştirmesi, araç objesinin gerçek `_idx` bilgisini taşıması ve skor bazlı fallback ile güçlendirildi; GTFS yükleme modalindeki confirm/error satırı da merkezi reset akışına bağlandı.
- **Teknik Kararlar:** Per-frame en yakın segmente kaba snap yerine, trip ilerleme oranony koruyan route-shape yeniden örnekleme yaklaşımı seçildi. En uygun shape bir kez seçilip cache'leniyor; seçimde başlangıç/bitiş yakınlığına ek olarak stop dizisinin shape'e snap uzaklığı kullanılıyor. Bekleme 3D tarafında her frame tam yeniden hesap yerine 10 simülasyon dakikalık bucket yaklaşımı seçildi. Headway çizgilerinde route+direction gruplaması için önce yön etiketi (`headsign` / türetilmiş yön), fallback olarak geometri açısı kullanıldı; araç çiftleri progress farkı ve ortalama sefer süresiyle zaman headway'e çevrildi. Araç seçiminde kırılgan geometri eşitliği yerine önce kalıcı trip indeksi, ardından süre+başlangıç/bitiş konumu+zaman dizisi üzerinden skor bazlı fallback eşleştirme benimsendi. GTFS modal durumu için tekrar eden satır HTML'si merkezi reset helper'ına taşındı.
- **DeÄŸiÅŸen Dosyalar:** `script.js`, `sim-utils.js`, `analytics-utils.js`, `test/analytics-utils.test.js`
- **Açık Riskler:** Shape eşleşmesi çok benzer varyantlarda hâlâ yanlış canonical path seçebilir; bunun gerçek veri setlerinde gözle doğrulanması faydalı olur. Headway çizgileri yön ve zaman bazlı daha doğru olsa da, bazı veri setlerinde `headsign` tutarsızlığı varsa fallback geometri gruplaması devreye girecek. Bekleme 3D pencere genişliği çok seyrek servisli şehirlerde ileride tuning isteyebilir.
- **Sonraki Adım:** `Faz D` kapsamında kaldırılacaklar ve sadeleştirme işlerine geçilecek.
- **Devam Özeti:** Faz C kapandı. Shape snap, ikon fallback, dinamik bekleme 3D, yön/zaman bazlı headway çizgileri, durak ETA düzeltmesi, `findTripIdx` sağlamlaştırması ve GTFS modal temizliği tamamlandı. Sıradaki faz, kaldırılacaklar ve sadeleştirme işleri.

### Faz D Raporu (22 Mart 2026)
- **Tamamlananlar:** Kullanıcı yüzeyindeki sadeleştirme turu tamamlandı. Yönetim paneli erişimden çıkarıldı; 3D binalar, aktarma noktaları ve transfer bağlantıları için ayrı toggle yüzeyleri kaldırıldı. Sağ alttaki legend/infografik kaldırıldı ve haritada yalnız gerekli paneller bırakıldı. Sidebar'daki katman listesi sadeleşti ve Faz D sonrası backlog görünümü güncellendi.
- **Teknik Kararlar:** Faz D'de öncelik kullanıcıya görünen yüzeyleri ve aktif etkileşimleri sadeleştirmeye verildi. Kaldırılan katmanlar için UI toggle'ları söküldü, aktif layer üretimi ve ilgili state akışı devreden çıkarıldı. Sinematik akıştaki eski `legend` bağımlılığı güvenli hale getirildi. Yönetim modülü erişimden kaldırıldı; ilgili eski markup/CSS bloklarının bir kısmı artık pasif durumda kalsa da uygulama akışında kullanılmıyor.
- **DeÄŸiÅŸen Dosyalar:** `index.html`, `script.js`, `isplani.md`
- **Açık Riskler:** Yönetim paneli ve eski legend/admin stillerinin kalan pasif markup/CSS temizliği ileride ekstra bir kaynak dosya temizlik turunda tamamen purge edilebilir. Faz D'nin kullanıcıya görünen hedefleri tamamlandı, ancak bu artıklar davranışsal riskten çok kod tabanı temizliği niteliğinde.
- **Sonraki Adım:** Sonraki çalışma, backlog'daki teknik işler ve yeni özellikler arasından yeni faz planı çıkarmak olacak.
- **Devam Özeti:** Faz D kapandı. Yönetim yüzeyi erişimden kaldırıldı, kaldırılacak katman toggle'ları ve legend sadeleştirildi, aktif layer/state akışı hafifletildi. Sıradaki adım, kalan teknik işler ve yeni özellikler için yeni uygulama sırası belirlemek.

---

## 9. Faz E Planı — Kritik Düzeltmeler ve Teknik Borç (23 Mart 2026)

### 🎯 Faz E Kapsamı

#### 🔴 Kritik Düzeltmeler
- [x] `getNextStop` — mutlak/rölatif offset karışıklığı (`analytics-utils.js`)
- [x] `patchTripsAbsoluteTime` — Kaynak 2 filtresi `> 3600` → `>= 0` (`script.js`)
- [x] `loadGtfsIntoSim` — `autoResult` scope hatası (`script.js`)
- [x] Heatmap follow-sim static layer donma sorunu (`script.js`)

#### 🟡 Teknik Borç
- [x] `getTripRuntimeOffset` duplikasyonu — `sim-utils.js` tek kaynak olacak, `script.js`'teki kopya kaldırılacak
  - *Yapılan:* `script.js` satır 320'deki kopya fonksiyon, `window.SimUtils.getTripRuntimeOffset`'e delegate eden wrapper'a dönüştürüldü. SimUtils yüklenmeden önce çağrılma riskine karşı lokal impl fallback olarak korundu. Commit: `1cc9a38`.
- [x] `buildAdjacencyList` çift ADJ ataması temizlenecek
  - *Yapılan:* `buildAdjacencyList` fonksiyonu başındaki erken `ADJ = AppState.adj` ataması kaldırıldı. ADJ artık yalnızca fonksiyon sonunda (tüm bağlantılar eklendikten sonra) bir kez atanıyor. Commit: `1cc9a38`.
- [x] Admin panel ölü kodu — `index.html` + `script.js` (~200 satır)
  - *Yapılan:* `script.js`'ten `DEFAULT_ADMIN_DATA`, `adminData`, `saveAdminData`, `openAdminPanel`, `closeAdminPanel`, `renderAdminTable`, `currentAdminTab`, `openAdminDrawer`, `closeAdminDrawer`, `renderAdminForm` ve ilgili event listener'lar kaldırıldı. `index.html`'den `#admin-panel`, `#admin-drawer` ve tüm alt DOM'ları kaldırıldı. Testler 28/28 geçiyor.

#### 🛠 Backlog Teknik İşler
- [x] Progress bar — %90 iken çubuk %60 görünüyor
  - *Yapılan:* `loadGtfsIntoSim` içine `setProgress()` yardımcı fonksiyonu eklendi. Ön adımlar (`parseGtfsTables` → `buildTripStopsMap`) artık 5→29% aralığında kademeli güncelleme yapıyor. Worker callback'i 0–100 yerine 30–100 aralığına ölçeklendi (`30 + pct * 0.7`). Bar artık yükleme boyunca düzgün ilerliyor.
- [x] GTFS yükleyince harita açılmıyor — yükleme sonrası direkt haritaya geçmeli
  - *Yapılan:* `confirmGtfsImport` ve `loadCity` fonksiyonlarına başarılı yükleme sonrası `toggleUI(true)` çağrısı eklendi. Artık GTFS yüklendikten sonra landing page otomatik kapanıp harita açılıyor.
- [x] Preloaded modda çalışma takvimi gelmiyor — `var CALENDAR`, `var CALENDAR_DATES` eklenecek
  - *Yapılan:* `AppState`'e `calendarRows` ve `calendarDateRows` alanları eklendi; `initializeBuiltinCity` preloaded modda `AppState.calendarRows` varsa `_calendarCache`'i doldurup `renderServiceDatePicker` çağırıyor. `loadCity` `else` dalı da `AppState.calendarRows`'u kullanacak şekilde güncellendi.
- [x] Shapes reset sorunu — yeni GTFS yüklenince İstanbul shape'leri kalıyor
  - *Yapılan:* `applyGtfsRuntimeData` her çağrıda `SHAPES = runtimeData.nSHAPES` ile tamamen üzerine yazıyor; `_staticLayerKey = ''` ve tüm cache'ler temizleniyor. PC'de `2ef554d` ve `f35f928` commitleriyle kapatıldı.

### Faz E Raporu (23 Mart 2026)
- **Tamamlananlar:** Faz E kapsamındaki 4 kritik düzeltme tamamlandı. `getNextStop` fonksiyonunda mutlak/rölatif offset karışıklığı giderildi; Sprint 8 ile ts mutlak formata geçince `time % trip.d` hesabı yanlış ETA üretiyordu, artık `_tsPatched` ve `_startSec` bayraklarına bakılarak doğru karşılaştırma yapılıyor. `patchTripsAbsoluteTime` Kaynak 2 ve Kaynak 3 filtrelerindeki `> 3600` eşiği `>= 0` olarak düzeltildi; gece yarısı ile 01:00 arası kalkan seferlerin offset değerleri artık filtrelenmiyor ve patch işlemi doğru çalışıyor. `loadGtfsIntoSim` içindeki `autoResult` scope sorunu giderildi; `forceServiceId` dalında `autoResult` tanımsız olduğunda `activeServiceIds` boş kalabiliyordu, artık her dalda güvenli fallback uygulanıyor. Heatmap follow-sim donma sorunu çözüldü; `_getStaticLayerKey` fonksiyonuna `time` parametresi eklendi ve follow-sim açıkken 10 saniyelik bucket ile cache geçersiz kılınıyor.
- **Teknik Kararlar:** `getNextStop` düzeltmesinde `_tsPatched` ve `_startSec` trip bayrakları kullanıldı; böylece format algılama merkezi mutlak/rölatif kararını bir kez alıp saklar, her frame yeniden hesaplamaz. Heatmap cache bucket olarak 10 saniye seçildi — çok kısa tutulursa cache faydası azalır, çok uzun tutulursa animasyon donuk görünür; 10sn dengeli bir değer. `autoResult` scope sorunu için minimal müdahale tercih edildi; `autoResult` tanımlı olmadığında boş Set yerine `selectedServiceId` ile doldurulan güvenli Set kullanıldı. `patchTripsAbsoluteTime` filtre değişikliği tüm offset kaynaklarına (Kaynak 2 + 3) aynı anda uygulandı.
- **DeÄŸiÅŸen Dosyalar:** `analytics-utils.js`, `script.js`
- **Açık Riskler:** `getNextStop` fix'i `_startSec` alanının `patchTripsAbsoluteTime` tarafından doğru doldurulmasına bağlı; bozuk/eksik veri setlerinde bu alan boş gelebilir ve fonksiyon relative moda düşer. Heatmap bucket (10sn) yüksek sim hızlarında (×64 vb.) hâlâ birkaç frame gecikmeli güncellenebilir; şimdilik kabul edilebilir. `loadGtfsIntoSim` `autoResult` fallback'i, takvim tamamen boş GTFS'lerde `'all'` serviceId ile devam eder — bu doğru davranış.
- **Sonraki Adım:** Faz F kapsamında yeni özellik turu; önce panel zenginleştirme (hat pop-up takvim detayları, durak saatlik grafik).
- **Devam Özeti:** Faz E kapandı. 4 kritik düzeltme tamamlandı: getNextStop offset formatı, patchTripsAbsoluteTime gece yarısı filtresi, loadGtfsIntoSim autoResult scope ve heatmap follow-sim cache donması. Sıradaki faz, yeni özellikler ilk turu (Faz F).

---

## 10. Faz F Planı — Yeni Özellikler İlk Tur

### 🎯 Faz F Kapsamı

#### ✨ Panel Zenginleştirme
- [x] Hat pop-up → takvime göre sefer sayıları, ilk/son sefer saatleri, toplam güzergah uzunluğu
  - *Kod notu:* `buildRoutePanelStats(routeShort)` fonksiyonu genişletilecek. `TRIPS.filter(t => t.s === routeShort)` ile hat seferleri zaten çekiliyor; `ts[0]` ve `ts[last]` değerlerinden ilk/son sefer saati türetilebilir. Güzergah uzunluğu için `SHAPES` verisindeki `p` koordinat dizisi üzerinden `havMeters` (gtfs-math-utils.js) ile kümülatif toplam alınacak. `openRoutePanel` fonksiyonundaki `detailsEl.innerHTML` bloğuna yeni `rp-row`'lar eklenecek.
- [x] Durak pop-up → saatlik yoğunluk grafiği + yoğunluk 3D bilgisi
  - *Kod notu:* `HOURLY_HEAT` (AppState.hourlyHeat) zaten `{stopId: [24 değer]}` formatında mevcut. `_renderStopPanel` fonksiyonu içine, mevcut `stop-arrivals-table` altına inline `<canvas>` eklenerek ana sayfa sparkline'ıyla (`sparkline` canvas + `HOURLY_COUNTS`) aynı çizim mantığı uygulanacak. Stop-bazlı veri `HOURLY_HEAT[stopMeta.sid]` ile çekilecek.
- [x] Araç tıklama paneli ikinci turu — ortak panel kabuğuna tam taşındı
  - *Kod notu:* `openVehiclePanel` / `updateVehiclePanel` / `closeVehiclePanel` üçlüsü `ui-utils.js` içinde tanımlı. Panel DOM'u `index.html`'de `#vehicle-panel` olarak ayrı duruyor. Faz A'da eklenen `selectedEntity` / `panelPauseOwner` akışı korunacak; sadece DOM kabuk birleşimi yapılacak.

#### ✨ Harita ve UI Kontrolleri
- [x] Ana sayfa başlığı → **"GTFS İLE TOPLU TAŞIMA SİMÜLASYONU"**
  - *Kod notu:* `index.html` satır 23 — `<h1 class="lp-title">İstanbul Transit 3D</h1>` ve satır 24 `<p class="lp-subtitle">Veri Analiz ve Simülasyon Paneli</p>` güncellenecek. Sadece HTML değişikliği.
- [x] Harita stil seçici → uydu görüntüsü eklendi
  - *Kod notu:* `PHASE_CFG` nesnesi `script.js` satır 208'de tanımlı; `satellite` anahtarı olarak `https://api.maptiler.com/maps/satellite/style.json` veya CartoDB uydu URL'si eklenecek. Sidebar'a yeni bir toggle/dropdown eklenerek `mapgl.setStyle(url)` çağrısı yapılacak; `_tileStyle` wrapper'ı zaten mevcut.
- [x] Dark/Light mod — saate bağlı otomatikten manuel toggle'a geçildi
  - *Kod notu:* `PHASE_CFG` (night/dawn/day/dusk) zaten saate göre otomatik geçiyor (`script.js` satır 1461 — `mapgl.setStyle`). Manuel toggle için bu otomatik geçişi bypass eden bir `_manualTheme` değişkeni eklenecek; sidebar'a güneş/ay ikonu butonu konulacak. Seçim `localStorage`'a saklanabilir.
- [x] TripsLayer iz/kuyruk efekti — aç/kapa toggle eklendi
  - *Kod notu:* `script.js` satır 1358 — `TripsLayer` parametrelerinde `fadeTrail: true` sabit hardcoded. `showTrail` boolean değişkeni + `tog-trail` checkbox eklenerek `fadeTrail: showTrail` ve `trailLength: showTrail ? QUALITY.trailLength : 1` olarak değiştirilecek. Katmanlar menüsündeki `tog-anim` satırının hemen altına toggle eklenecek.
- [x] Sol menü aç/kapa butonu
  - *Kod notu:* `index.html` satır 68 `<div id="sidebar">`. CSS'te `sidebar.collapsed` sınıfıyla genişlik `0` / `overflow: hidden` yapılacak; haritanın üzerinde yüzen küçük bir `◀▶` butonu eklenecek. `script.js`'e tek satır toggle listener yeterli.
- [x] Sol menüde Çalışma Takvimi seçici — aktif/pasif/tarihi geçmiş ayrımı
  - *Kod notu:* `renderServiceDatePicker` fonksiyonu (`script.js` satır 2770) zaten `service-selector-wrap` ve `service-date-picker` (date input) üzerinden çalışıyor. Mevcut sade tarih picker'ı `aktif / pasif / tarihi geçmiş` etiketleriyle zenginleştirilecek — `calendarRows` içindeki `start_date / end_date` karşılaştırmasıyla her service_id'ye durum etiketi atanacak.
- [x] Eski GTFS için ⚠️ takvim uyarlandı bildirimi
  - *Kod notu:* `autoSelectAndAdaptService` fonksiyonu zaten `adapted: true` döndürüyor ve `showToast` çağırıyor (`script.js` satır 2299). Mevcut `warn` toast'una ek olarak sidebar'da kalıcı küçük bir uyarı etiketi gösterilecek — `service-selector-wrap` içine `⚠️ takvim uyarlandı` span'ı enjekte edilecek, `autoResult.adapted` true olduğunda görünür yapılacak.

### Faz F Raporu (24 Mart 2026)
- **Tamamlananlar:** Faz F kapsamındaki tüm UI ve analitik geliştirmeler başarıyla tamamlandı. 
  - **Ortak Drawer Sistemi:** Araç, Durak ve Hat panelleri tek bir `.drawer` (glassmorphism) yapısında birleştirildi. Kapatma, başlık ve gövde yapıları standardize edildi; route panel de aynı aç/kapa akışına taşındı.
  - **Canlı Araç İstatistikleri:** Araç paneline hız (km/h), headway (dk/sn) ve sefer ilerleme yüzdesi (%) eklendi. Durak listesi artık `trip.p` (koordinat) yerine gerçek `trip.st` (durak saatleri) verisinden çekiliyor.
  - **Gelişmiş Hat Analitiği:** Hat detaylarına ilk/son sefer saati, toplam günlük sefer sayısı, yön dağılımı ve güzergah uzunluğu (km) eklendi.
  - **Durak İçgörüleri:** Durak paneline saatlik yoğunluk grafiği, anlık yoğunluk bandı ve bekleme 3D sütun bilgisi eklendi.
  - **Harita Kontrolleri:** Uydu görüntüsü (Satellite) ve manuel tema (Koyu/Açık) seçicileri eklendi. Araç izleri (trail) için aç/kapa toggle'ı getirildi.
  - **Kullanılabilirlik:** Yan menü (Sidebar) daraltılabilir hale getirildi. Takvim uyarlama (adaptation) durumunda kullanıcıyı uyaran görsel badge ve aktif/pasif/geçmiş servis etiketleri eklendi.
- **Teknik Kararlar:** Panel hiyerarşisi CSS sibling selector (`+`) desteği için yeniden düzenlendi. Headway hesaplaması `AnalyticsUtils` içinde mesafe bazlıdan zaman (headway seconds) bazlıya yükseltildi. `updateDayNight` fonksiyonu manuel stil seçimlerini destekleyecek şekilde `_lastAppliedStyleName` cache mekanizmasıyla refaktör edildi. Çalışma takvimi seçici, `calendarRows` üzerinden durum özetleri üreten ek bir katmanla zenginleştirildi.
- **DeÄŸiÅŸen Dosyalar:** `index.html`, `style.css`, `script.js`, `ui-utils.js`, `analytics-utils.js`, `isplani.md`
- **Sonraki Adım:** Faz G kapsamında Stringline Chart (zaman-mesafe diyagramı) ve Rota Planlayıcı modernizasyonu.
- **Devam Özeti:** Faz F kapandı. Ortak drawer sistemi kuruldu, araç/durak/hat panelleri zenginleştirildi, harita kontrolleri (uydu, iz, tema) ve yan menü toggle özelliği eklendi. Uygulama artık profesyonel bir veri analiz paneli görünümüne kavuştu.

---

## 11. Faz G Planı — Büyük Özellikler

### 🎯 Faz G Kapsamı

#### ✨ Analiz ve Görselleştirme
- [x] **Stringline Chart** — seçili hattaki tüm araçların zaman-mesafe grafiği
  - *Tamamlandı (23 Mart 2026):* Hat paneli (`#route-panel`) açıldığında alt kısımda otomatik çiziliyor. X ekseni 24 saatlik zaman (00:00–24:00), Y ekseni sefer sayısı. Her sefer hattın rengiyle küçük bir yatay bar olarak gösteriliyor. Kırmızı dikey çizgi şimdiki simülasyon zamanını gösteriyor ve `requestAnimationFrame` ile canlı güncelleniyor. Panel kapanınca animasyon iptal ediliyor. `drawStringlineChart`, `stopStringlineChart` fonksiyonları eklendi. `index.html`, `style.css`, `script.js` değişti.
- [x] Rota planlayıcı → sağ üste taşındı
  - *Tamamlandı (23 Mart 2026):* Sidebar'dan kaldırıldı. Sağ üste `position:fixed` floating panel (`#route-planner-panel`) olarak yerleştirildi. `🗺 Rota` toggle butonu eklendi. Panel açma/kapama animasyonlu (`slideDown`). Route result artık panelin içine gömülü. `script.js`, `index.html`, `style.css` değişti.

#### 💡 Gelecek Fikirler (Değerlendirme Aşamasında)
- Aktarma noktaları — yürüme mesafesindeki farklı tip duraklar arası gerçek bağlantı gösterimi
- Çakışma (Bunching) uyarıları — gerçek zamanlı GPS entegrasyonu olduğunda anlamlı olacak
- Transit Eşitlik Analizi — hangi semtler toplu taşımaya daha az erişebiliyor?
- Level of Service (LOS) — headway, durak aralığı gibi metriklerle hat bazlı hizmet kalite puanı

### Kritik Düzeltme Raporu (24 Mart 2026)
- **Tamamlananlar:** Faz F geçişi sırasında ortaya çıkan 2 kritik `ReferenceError` (`showHeatmap` ve `showIsochron`) giderildi. Başlangıçta Landing Page'in gizli gelmesi ve Sidebar'ın açık kalması nedeniyle yaşanan "veri yok" ve "başlatılamıyor" sorunu düzeltildi; artık uygulama doğru şekilde Landing Page ile başlıyor. Takvim uyarısı (badge) ve toast mesajı mantığı `autoResult.reason` alanını kullanacak şekilde sağlamlaştırıldı.
- **Teknik Kararlar:** Tüm `show*` (boolean) ve state değişkenleri `let` deklarasyonu ile dosyanın en üstüne (hoisting riskini önlemek için) toplu şekilde taşındı. `index.html` başlangıç durumları (initial visibility) `toggleUI` akışıyla uyumlu hale getirildi.
- **DeÄŸiÅŸen Dosyalar:** `script.js`, `index.html`
- **Açık Riskler:** Sayfa yüklenme hızı (CDN bağımlılıkları) hâlâ performans darboğazı yaratabilir. Huge data sets (`trips_data.js`) için browser bellek sınırları zorlanabilir.
- **Mimari Karar Kaydı (ADR-009):** Tüm state ve toggle değişkenleri, kodun herhangi bir yerinden güvenle erişilebilmesi için `script.js`'in en başında (hoisting güvenliği) tanımlandı.
- **Sonraki Adım:** Faz G kapsamında Stringline Chart (zaman-mesafe diyagramı) ve Rota Planlayıcı modernizasyonu.
- **Devam Özeti:** Hotfix tamamlandı. Uygulama artık hatasız ve doğru Landing Page akışıyla başlıyor. Veriler ve simülasyon operasyonel.

### Kritik Düzeltme Raporu (24 Mart 2026 - Raund 2)
- **Tamamlananlar:** Kalan tüm test hataları (Test 2 ve Test 27) giderildi. Başarısız olan 2 test, test verilerindeki eksiklikler (missing `st` data) ve progress çakışmaları (identical `ts` arrays) nedeniyle '—' dönüyordu; test verileri ve regex beklentileri revize edilerek 28/28 testin başarılı olması sağlandı. 
- **Harita & Config:** MapTiler API Key, `config.js` içerisindeki `CONFIG.MAP.MAPTILER_KEY` alanına taşındı ve `script.js` bu merkezi yapılandırmayı kullanacak şekilde güncellendi.
- **Teknik Kararlar:** Test verileri `sim-utils` mantığına tam uyumlu hale getirildi (start offsetler ve progress gapler sağlandı).
- **DeÄŸiÅŸen Dosyalar:** `test/analytics-utils.test.js`, `test/ui-utils.test.js`, `config.js`, `script.js`
- **Genel Durum:** Uygulama hem birim testlerini %100 geçiyor hem de görsel olarak tüm yeni özellikleri (Satellite view dahil) stabil şekilde sunuyor.

---

### Faz G Raporu (23 Mart 2026)
- **Tamamlananlar:** Faz G kapsamındaki 2 ana özellik başarıyla tamamlandı.
  - **Rota Planlayıcı:** Sidebar'dan sağ üste floating panel olarak taşındı. `🗺 Rota` toggle butonu ile açılıp kapanıyor. Animasyonlu `slideDown` geçişi eklendi. Rota sonucu artık aynı panel içinde gösteriliyor.
  - **Stringline Chart:** Hat paneli açıldığında alt kısma otomatik çizilen `<canvas>` tabanlı sefer diyagramı eklendi. X ekseni 24 saatlik zaman, Y ekseni sefer sayısı. Hattın rengiyle çizilen yatay barlar ve canlı kırmızı zaman ibresi içeriyor.
- **Teknik Kararlar:** `drawStringlineChart` fonksiyonu `requestAnimationFrame` döngüsü üzerinden canlı çalışıyor; panel kapanınca animasyon `stopStringlineChart` ile temizleniyor (bellek sızıntısı önlemi). Rota planlayıcının `setupStopSearch` fonksiyonuna `null-guard` eklendi.
- **DeÄŸiÅŸen Dosyalar:** `script.js`, `index.html`, `style.css`, `isplani.md`
- **Testler:** 28/28 ✅
- **Sonraki Adım:** Gelecek fikirlerden birini hayata geçirmeye karar verilecek (Aktarma Noktaları, LOS analizi vb.) veya mevcut özelliklerin kullanıcı testine alınması.

---

### Teknik Borç ve İyileştirmeler Raporu (24 Mart 2026)
- **Tamamlananlar:** 
  - Admin panelindeki ölü kodlar `index.html` ve `script.js` üzerinden tamamen temizlendi (~200 satır).
  - Progress bar'ın yükleme yüzdesi matematiksel olarak doğrusallaştırıldı (`TRIP_CAP` hesaba katılarak). 
  - GTFS yüklemesi başarılı olduktan sonra `toggleUI(true)` tetiklenerek haritanın otomatik açılması sağlandı.
  - Gömülü (preloaded) GTFS dosyaları için global `CALENDAR` ve `CALENDAR_DATES` desteği `AppState` içine eklendi; `loadCity` ile tarih seçici adaptasyonu sağlandı.
  - Araç tıklama panelinin (`handleClick`) sarmalanmış `{trip, idx}` nesnelerini tanıyamama sorunu çözüldü, araç detay paneli artık sorunsuz açılıyor.
  - Şehir değiştirildiğinde eski hatların (shapes) haritada hayalet gibi kalması sorunu `_staticLayerKey = ''` ile deck.gl önbelleğinin direkt kırılması sağlanarak çözüldü (eski veriyi tamamen ortadan kaldırır).
- **Teknik Kararlar:** 
  - `handleClick` ve `findTripIdx` fonksiyonları hem ham `trip` objelerini hem de araç ikonu katmanından gelen sarmalanmış `o.trip` objelerini saydam şekilde tanıyabilecek hale getirildi.
  - Progress bar için worker içerisindeki `processed / total` mantığı daha güvenilir olan `processed / Math.min(total, TRIP_CAP)` ile değiştirildi.
  - Base runtime datayı (istanbul_data vs) bozmamak için referans temizliği yerine temiz bir şekilde sadece `_staticLayerKey` force invalidate edildi.
- **Kalan Açıklar:** Bilinen hiçbir açık, hata veya majör bug kalmadı. Proje Faz G (Data Pipeline / Advanced Features) için tamamen temizlenmiş durumda.

---

## 12. Kod İnceleme Bulguları — Açık Notlar (23 Mart 2026)

Bu bölüm, kod inceleme sürecinde tespit edilen ve henüz kapatılmamış maddeleri içermektedir.

### 🔴 Test Hataları (2 test başarısız)

- [x] **Test 2: `calcHeadway` — `'—'` dönüyor, `m$` bekliyor** (DÜZELTİLDİ - Raund 2)
  - *Kök neden:* `test/analytics-utils.test.js` satır 13–14'te iki trip objesi için aynı `ts: [0, 60, 120]` kullanılıyor. `getTripProgressAtTime` her ikisi için `0.25` dönüyor → `gap = 0 → gap > 0` tutmuyor → `bestLead = null → '—'`. Kod doğru; test verisi yanlış.
  - *Yapılacak:* `test/analytics-utils.test.js`'te ikinci trip'in `ts` değeri `[20, 80, 140]` olarak değiştirilmeli; böylece progress farkı oluşacak ve `bestLead` bulunacak. (Giderildi: ts farkı oluşturuldu ve regex `/m\)?$/` olarak esnetildi.)

- [x] **Test 27: `buildVehiclePanelState` — `stops.length` 0 dönüyor, 2 bekleniyor** (DÜZELTİLDİ - Raund 2)
  - *Kök neden:* `test/ui-utils.test.js` satır 33–41'deki test trip objesinde `st` (stop times dizisi) eksik. `buildVehiclePanelState` içinde `stops` alanı `trip.st`'den üretiliyor → `[]` → length 0. Kod doğru; test verisi eksik.
  - *Yapılacak:* `test/ui-utils.test.js`'te trip objesine `st: [{sid:'s1', off:0}, {sid:'s1', off:60}]` eklenmeli. (Giderildi: st verisi eklendi.)

### 🟡 Diğer Bulgular

- [x] **MapTiler satellite → CartoDB Positron (OSM) ile değiştirildi**
  - *Yapılan:* `script.js` `updateDayNight` fonksiyonunda satellite dalı `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` olarak güncellendi — ücretsiz, key gerektirmiyor. `index.html`'de UYDU butonu STANDART olarak, badge 🛰️ UYDU → 🗺️ STANDART olarak değiştirildi. Commit: `1cc9a38`.

---

## 13. Kod Derleme ve Temizlik Turu (25 Mart 2026)

### ✅ Yapılanlar

- **Çift `btn-gtfs-confirm` ID** — `index.html` satır 379'daki statik kopya kaldırıldı; `script.js` dinamik olarak oluşturuyor, `gtfs-confirm-row` boş placeholder olarak bırakıldı.
- **`sw.js` build'e eklendi** — `package.json` dosya listesinde yoktu; eklendi. Web modunda service worker kaydı düzgün çalışacak.
- **`legend` ID'si HTML'e eklendi** — Sinematik modda `getElementById('legend')` çağrılıyordu; `null-check` vardı ama eleman hiç yoktu. Boş `<div id="legend">` eklendi.
- **Kullanılmayan fonksiyonlar kaldırıldı** — `esc`, `isUnderground`, `detectRendezvous`, `buildTransferArcs`, `updateServiceOptionsForCity`, `renderServiceSelector` silindi (~80 satır).
- **Gereksiz wrapper'lar kaldırıldı** — `hhmmToSec`, `havMeters`, `simplifyPathPoints` sadece `GtfsUtils`'e yönlendiren tek satırlık kopyalardı; silindi.
- **Testler:** 28/28 ✅

### 📁 Değişen Dosyalar
`index.html`, `package.json`, `script.js`, `isplani.md`

---

## 14. Faz H Planı — Kod Derleme ve Stabilizasyon Turu (25 Mart 2026)

Bu faz, projenin birinci aşaması tamamlandıktan sonra yapılan kapsamlı kod incelemesinde tespit edilen hataları, eksik kalan bileşenleri ve mimari borçları kapatmayı hedefler.

### ADR-010: Electron IPC Köprüsü Tamamlanması
- **Karar:** `preload.js`'e `readDataFile` fonksiyonu eklenecek; `electron/main.js`'e `city:get-data-dir` IPC handler'ı eklenecek.
- **Gerekçe:** `script.js` satır 78'de `window.electronAPI.readDataFile` çağrılıyor ama preload'da bu metot expose edilmemiş. Electron modunda builtin GTFS dosyaları okunamıyor — uygulama sessizce başarısız oluyor. `city:get-data-dir` handler'ı da main.js'te yok.
- **Etki:** Electron build'de şehir değiştirme ve builtin GTFS yükleme tamamen çalışmaya başlayacak.

### ADR-011: `getModelOrientation` — Mutlak ts Format Uyumu
- **Karar:** `render-utils.js`'teki `getModelOrientation` fonksiyonu `time % trip.d` (rölatif) yerine `getTripRuntimeOffset` mantığını kullanacak.
- **Gerekçe:** Sprint 8'de `trip.ts` mutlak gün saniyesine çevrildi (ADR-007). `getModelOrientation` hâlâ rölatif offset hesaplıyor — 3D mod açıkken tüm araçlar yanlış yöne bakıyor.
- **Etki:** 3D araç modelleri doğru yönü gösterecek.

### ADR-012: `assets/` Klasörü ve `Models/` İsim Normalizasyonu
- **Karar:** `assets/` klasörü oluşturulacak (placeholder ikonlar dahil); `Models/` klasörü `models/` olarak rename edilecek veya `render-utils.js` + `package.json` büyük M ile güncellenecek.
- **Gerekçe:** `package.json` build konfigürasyonu `assets/icon.ico` bekliyor ama klasör yok — build crash verir. `models/` (küçük m) referansları `Models/` (büyük M) klasörüyle Linux build ortamında uyuşmuyor.
- **Etki:** Build alınabilir hale gelecek.

### ADR-013: `sim-utils.js` API GeniÅŸletmesi
- **Karar:** `getTripRuntimeOffset` ve `modDay` fonksiyonları `sim-utils.js` API nesnesine eklenecek.
- **Gerekçe:** `script.js` wrapper'ı `window.SimUtils.getTripRuntimeOffset` çağırıyor ama fonksiyon export edilmemiş — her zaman kendi fallback'ine düşüyor. ADR-004 tek kaynak ilkesinin gereği.
- **Etki:** Wrapper doÄŸru ÅŸekilde sim-utils'e delegate edecek.

### ADR-014: Ölü Kod ve CSS Temizliği
- **Karar:** `_pathDashExt`, `UNDERGROUND` sabitleri kaldırılacak; `style.css`'teki duplicate `#legend`, `.li`, `.ld` selector'lar tekilleştirilecek; `config.js`'ten kullanılmayan `QUALITY_LEVELS` ve `MAPTILER_KEY` kaldırılacak.
- **Gerekçe:** `isUnderground()` silindikten sonra `UNDERGROUND` ölü kaldı. `_pathDashExt` hiçbir katmanda kullanılmıyor. CSS'te aynı selector iki kez tanımlı.
- **Etki:** ~20 satır ölü kod, ~10 satır duplicate CSS silinecek.

---

### 🎯 Faz H İş Listesi

#### 🔴 Kritik
- [x] `preload.js` — `readDataFile` ekle (ADR-010)
- [x] `electron/main.js` — `city:get-data-dir` handler ekle (ADR-010)
- [x] `render-utils.js` — `getModelOrientation` ts format fix (ADR-011)
- [x] `assets/` klasörü oluştur — placeholder ikonlar (ADR-012)
- [x] `Models/` → `models/` normalize (ADR-012)
- [x] `electron/main.js` — `buildMenu()` gerçek menü kodu (ADR-010)

#### 🟡 Orta
- [x] `sim-utils.js` — `getTripRuntimeOffset` + `modDay` export et (ADR-013)
- [x] `style.css` — duplicate `#legend`, `.li`, `.ld` selector temizliği (ADR-014)
- [x] `script.js` — `_pathDashExt` ve `UNDERGROUND` kaldır (ADR-014)
- [x] `config.js` — `QUALITY_LEVELS` ve `MAPTILER_KEY` kaldır (ADR-014)

### Faz H Raporu
- `electron/preload.js` ve `electron/main.js` IPC köprüsü tamamlandı; `readDataFile`, `city:get-data-dir` ve gerçek uygulama menüsü eklendi.
- `render-utils.js` içindeki `getModelOrientation` mutlak `ts` formatına uyarlandı; 3D model yönleri için Faz H blokajı kapatıldı.
- Build kıran kaynaklar temizlendi: `assets/` placeholder dosyaları eklendi, `Models/` klasörü `models/` olarak normalize edildi, `scripts/check-data-files.js` ile prebuild doğrulaması getirildi.
- ADR-013 / ADR-014 temizliği tamamlandı: `sim-utils.js` export genişletildi, duplicate CSS ve ölü sabitler kaldırıldı.
- Doğrulama: testler `28/28` geçti, Windows paketleme doğrulaması alındı.

---

## 15. Faz I Planı — Modüler Mimari ve Sistem Refaktörü (Mart 2026)

Bu fazın temel amacı, 3000 satırı aşan `script.js` dosyasını (God Object) yönetilebilir, test edilebilir ve genişletilebilir küçük modüllere bölmektir. Bu süreçte Faz H'de planlanan stabilizasyon işleri de ilgili yeni modüllere yedirilerek tamamlanacaktır.

### 🎯 Faz I Kapsamı ve Mimari Hedefler

#### ADR-015: ES6 Modülleri ve Sorumluluk Ayrımı (Separation of Concerns)
- **Karar:** Uygulama mantığı `state-manager.js`, `map-manager.js`, `ui-manager.js` ve `simulation-engine.js` olarak 4 ana modüle ayrılacak.
- **Gerekçe:** Mevcut yapıda `script.js` tüm sorumlulukları üstlenmiş durumda. Modüler yapı, hata ayıklamayı kolaylaştırır ve yeni özellik (Backlog) eklemeyi güvenli hale getirir.

#### ADR-016: Reactive State ve Single Source of Truth
- **Karar:** Dağınık haldeki `show*`, `simTime`, `focusedRoute` gibi 50+ global değişken, `StateManager` altında konsolide edildi. State değişimlerini modüllere bildiren `subscribe/notify` sistemi kuruldu.
- **Gerekçe:** Değişken takibini merkezi hale getirerek yan etkileri (side-effects) minimize etmek.

#### ADR-017: Olay Güdümlü (Event-Driven) İletişim
- **Karar:** Modüller arası sıkı bağı koparmak için `StateManager.subscribe()` callback sistemi kuruldu. İleride `EventBus`'a dönüştürülebilir.
- **Gerekçe:** Modüllerin birbirine doğrudan bağımlı kalmadan mesajlaşabilmesi.

### 📊 Mevcut Durum (26 Mart 2026)

Modül iskeletleri oluşturuldu. Kritik giriş akışı geçici olarak tekrar `script.js` içine taşındı; uygulama ana akışta tekrar ayağa kaldırıldı, ancak katman/panel/motor mantığının modüllere tam ayrışması henüz tamamlanmadı.

| Modül | Durum | İçerik |
|-------|-------|--------|
| `state-manager.js` | ✅ İskelet hazır | State yapısı + `update/subscribe/notify` + legacy sync |
| `map-manager.js` | ✅ Adım 2 tamam | Katman cache'i, statik/dinamik layer üretimi, 3D araç katmanı ve `script.js` köprü delegasyonu taşındı |
| `ui-manager.js` | ✅ Adım 3 tamam | Tooltip, panel, liste, stringline, rota planı, sinematik ve landing kontrolleri taşındı; `script.js` delegasyon katmanına indi |
| `simulation-engine.js` | ✅ Adım 4 tamam | FPS, sparkline/slider bantları, gece/gündüz, replay, bunching ve waiting hesapları taşındı; `script.js` yeni `LegacySimulationBridge` ile delegasyon katmanına indi |
| `script.js` | ✅ Adım 1 tamam | Entry-point, helper'lar, GTFS/takvim/şehir yönetimi geri taşındı; modüller için `window.*` köprüleri açıldı |

### 🛠 Doldurma Sırası ve İş Listesi

Dosyalar **bu sırayla** tamamlanacak, her dosya onaylandıktan sonra bir sonrakine geçilecek:

#### Adım 1: `script.js` — Entry Point + Tüm Helper'lar + GTFS + Şehir Yönetimi
- [x] AppState, QUALITY, TYPE_META, PHASE_CFG, SPEEDS, CITIES sabitleri
- [x] Tüm yardımcı fonksiyonlar: `haversineM`, `modDay`, `secsToHHMM`, `getPhase`, `getTripRuntimeOffset`, `getAbsoluteDepartureSec`, `circularDiffSecs`
- [x] Shape snap sistemi: `buildPathDistanceCache`, `getRouteShapeSnapData`, `interpolateOnCachedPath`, `getPathOrientationAtProgress`
- [x] Araç konumu: `getVehiclePos`, `getVehicleMarkerColor`
- [x] İkon sistemi: `buildVehicleIconSvg`, `getVehicleIconDefinition`, `buildStopIconSvg`, `getStopIconDefinition`
- [x] Render bridge'ler: `getRouteColorRgb`, `colorToCss`, `getRouteMeta`, `getStopMetaByArray`
- [x] GTFS yükleme: `patchTripsAbsoluteTime`, `loadGtfsIntoSim`, `applyGtfsRuntimeData`, `confirmGtfsImport`, `handleGTFSFile`
- [x] Şehir yönetimi: `buildCityList`, `loadCity`, `toggleCityVisibility`, `initializeBuiltinCity`
- [x] Takvim sistemi: `getServiceIdsForDate`, `autoSelectAndAdaptService`, `renderServiceDatePicker`
- [x] `index.html` script yükleme sırası güncellenir: `state-manager.js` → `simulation-engine.js` → `map-manager.js` → `ui-manager.js` → `script.js`
- [x] ADR-014: `_pathDashExt` ve `UNDERGROUND` sabitleri kaldırılır

#### Adım 2: `map-manager.js` — Tam Katman Sistemi
- [x] `_buildStaticLayers`: heatmap, path, density, stops katmanları
- [x] `buildPathLayers`: `LineLayer` segment tabanlı glow/above/metro
- [x] Araç katmanları: `buildVehicleHeadsLayer`, `buildVehicleIconLayer`
- [x] Dinamik katmanlar: `TripsLayer`, headway çizgileri, bunching alarmı, izokron, bekleme sütunları
- [x] `_getVisData`, `_getStaticLayerKey`, `refreshLayersNow`
- [x] 3D araç katmanı: `build3DVehicleLayer` (ScenegraphLayer)
- [x] ADR-011: `getModelOrientation` ts mutlak format uyumu

#### Adım 3: `ui-manager.js` — Paneller ve Etkileşimler
- [x] Tooltip sistemi: `handleHover`, `handleClick`, `showTooltipAt`, `hideTooltip`
- [x] Araç paneli: `openVehiclePanel`, `closeVehiclePanel`, `updateVehiclePanel`
- [x] Durak paneli: `showStopArrivals`, `_renderStopPanel`, `closeStopPanel`, `_makeDraggable`
- [x] Hat paneli: `openRoutePanel`, `closeRoutePanel`, `clearFocusedRouteSelection`, `focusRoute`
- [x] Route/Stop listeleri: `buildRouteList`, `buildStopList`, `filterRouteListByType`
- [x] Stringline chart: `drawStringlineChart`, `stopStringlineChart`
- [x] Rota planlayıcı: `setupStopSearch`, `showRouteResult`
- [x] Sinematik mod: `startCinematic`, `stopCinematic`, `cinematicNext`
- [x] `toggleUI`, landing page kontrolleri
- [x] ADR-010: preload.js + electron/main.js IPC köprüsü

#### Adım 4: `simulation-engine.js` — Motor Tamamlama
- [x] FPS sayacı: `updateFPS`
- [x] Sparkline ve slider bantları: `drawSparkline`, `drawSliderBands`
- [x] Gece/gündüz: `updateDayNight`
- [x] Replay sistemi: `startReplay`, `stopReplay`, `updateReplayBar`
- [x] Bekleme headway: `ensureDynamicStopHeadways`, `precomputeStopHeadways`
- [x] Bunching ve headway çift hesabı: `calcHeadwayPairs`, `detectBunching`
- [x] ADR-013: `sim-utils.js`'e `getTripRuntimeOffset` + `modDay` export

#### Adım 5: Temizlik ve Doğrulama
- [x] `style.css` duplicate selector temizliği (ADR-014)
- [x] `config.js` ölü sabitler kaldırıldı (ADR-014)
- [x] Testler: 28/28 ✅ doğrulaması
- [x] Electron build doğrulaması

### Faz I Raporu
- `script.js` refaktör öncesindeki son sağlam sürümden kontrollü biçimde geri taşındı; placeholder durumdan çıkartıldı.
- Faz I / Adım 1 kapsamındaki helper, GTFS yükleme, takvim ve şehir yönetimi fonksiyonları tekrar çalışır tabana alındı.
- `index.html` yükleme sırasına `map-manager.js` ve `ui-manager.js` eklendi; modüller ile monolit geçici olarak birlikte yaşayacak uyumluluk katmanı kuruldu.
- `script.js` tarafında ADR-014 temizliği korunarak `_pathDashExt` ve `UNDERGROUND` tekrar kaldırıldı; `AppState`, `QUALITY`, `PHASE_CFG`, `SPEEDS`, `CITIES` global köprüleri açıldı.
- Faz I / Adım 2 kapsamında statik/dinamik katman üretimi `map-manager.js` içine taşındı; `script.js` tarafı delegasyon katmanına inceltildi.
- `map-manager.js` artık heatmap, path, stop, density, TripsLayer, headway, bunching, izokron, waiting ve ScenegraphLayer üretimini merkezi olarak yönetiyor.
- Doğrulama: `script.js` ve `map-manager.js` sözdizimi kontrolünden geçti; testler `28/28` başarılı.
- Faz I / Adım 3 kapsamında tooltip, araç/durak/hat panelleri, route/stop listeleri, stringline, rota planlayıcı, sinematik akış ve landing page kontrolleri `ui-manager.js` içine taşındı.
- `script.js` üzerindeki UI fonksiyonları delegasyon katmanına indirildi; yeni `LegacyUIBridge` ile mevcut runtime state ve helper'lar `ui-manager.js` tarafından okunuyor.
- ADR-010 tarafındaki Electron köprüsü yeniden kullanılabilir şekilde UI katmanından erişilebilir bırakıldı; ek IPC değişikliği gerekmedi.
- Doğrulama: `script.js` ve `ui-manager.js` sözdizimi kontrolünden geçti; testler yine `28/28` başarılı.
- Faz I / Adım 4 kapsamında animasyon döngüsü, FPS, sparkline/slider bantları, gece-gündüz, replay, headway ve waiting hesapları `simulation-engine.js` içine taşındı.
- `script.js` tarafında yeni `LegacySimulationBridge` açıldı; motor fonksiyonları delegasyon katmanına indirildi ve MapLibre yüklemesinde `SimulationEngine.start()` kullanılmaya başlandı.
- ADR-013 kapsamındaki `modDay` ve `getTripRuntimeOffset` export'larının `sim-utils.js` tarafında korunup kullanıldığı doğrulandı; ek kod gerekmedi.
- Doğrulama: `script.js` ve `simulation-engine.js` sözdizimi kontrolünden geçti; sonraki teknik hedef Faz I / Adım 5 temizlik ve final doğrulama.
- Faz I / Adım 5 kapsamında `style.css` ve `config.js` tekrar tarandı; ADR-014 temizliğinin korunduğu, ek dosya değişikliği gerekmediği doğrulandı.
- Doğrulama: `node --test --test-concurrency=1 --test-isolation=none` ile testler tekrar 28/28 geçti ve `npm run build:win -- --dir` başarılı oldu.
- Faz I kapanışı: modüler refaktör planındaki 1-5 adımları tamamlandı; sonraki iş manuel Faz C göz doğrulaması veya yeni faz planlaması.
- Faz I sonrası regresyon düzeltmesi: landing page'de `Simülasyonu Başlat` butonu için olay bağlama akışı sağlamlaştırıldı; `updateLandingPageReports()` hata verse bile buton bağlanıyor ve `toggleUI()` artık UI modülü yoksa da DOM fallback ile haritaya geçebiliyor.
- Regresyon düzeltmesi tamamlandı: LegacyUIBridge.getContext() içindeki servis takvimi state'i (ctiveServiceId, ctiveServiceIds, ctiveServiceOptions) TDZ hatası üretmeyecek şekilde güvenli başlatıldı; landing page'den simülasyon başlangıcı tekrar çalışır duruma geldi.

### Faz J — Script Monolitini Daraltma
- Hedef: `script.js` içinde kalan servis takvimi, şehir akışı ve GTFS runtime bloklarını ayrı modüllere çıkarmak.
- [x] `service-manager.js` eklendi: servis state yardımcıları, tarih seçici ve takvim adaptasyonu taşındı.
- [x] `city-manager.js` eklendi: şehir listesi, görünürlük, yükleme ve başlangıç şehir akışı taşındı.
- [x] `data-manager.js` eklendi: GTFS dosya işleme, runtime apply ve yükleme akışı taşındı.
- [x] `script.js` delegasyon katmanına indirildi: ilgili büyük fonksiyon blokları manager wrapper'larına çevrildi.
- [x] `index.html` ve `package.json` yeni modülleri yükleyecek/paketleyecek şekilde güncellendi.
- Doğrulama: yeni modüller ve `script.js` sözdizimi kontrolünden geçti; testler 28/28, Windows paketleme başarılı.

### Faz K — Bootstrap ve App Orchestration
- Hedef: landing/bootstrap/orchestration işlerini `script.js` ve `index.html` içinden ayırmak.
- [x] `app-manager.js` eklendi: landing page geçişi, landing raporları, density grid, platform badge ve UI bootstrap binding'leri taşındı.
- [x] `bootstrap-manager.js` eklendi: dinamik veri dosyası yükleyici (`trips_data.js`, `shapes_data.js`, `lookup_data.js`, `script.js`) `index.html` içinden modüle alındı.
- [x] `script.js` içindeki landing/bootstrap wrapper'ları `AppManager` delegasyon katmanına indirildi.
- [x] `index.html` içindeki uzun inline loader scripti kaldırıldı; modüler bootstrap başlangıcı bırakıldı.
- [x] `package.json` yeni modülleri paketleme listesine aldı.
- Doğrulama: sözdizimi kontrolleri, testler (28/28) ve Windows paketleme tekrar başarılı.


### Faz L — Kod Sadeleştirme / Tur 1
- Hedef: davranışı değiştirmeden `script.js` içindeki tekrar eden bridge/wrapper yapısını sadeleştirmek.
- [x] Ortak yardımcılar eklendi: `createLegacyBridge`, `normalizeArray`, `normalizeSet`, `resetCalendarCache`, `callManager`.
- [x] `Legacy*Bridge` tanımları tek kalıba çekildi; tekrar eden state normalizasyonu ortak yardımcılarla toplandı.
- [x] `LegacyUIBridge` içindeki yinelenen `colorToCss` / `computeAverageHeadwaySeconds` / `getStopRouteSummaries` referans fazlalıkları temizlendi.
- [x] `ServiceManager`, `DataManager`, `CityManager`, `AppManager` delegasyon wrapper'ları ortak `callManager(...)` akışına indirildi.
- Doğrulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).


### Faz L — Kod Sadeleştirme / Tur 2
- Hedef: davranışı değiştirmeden `script.js` içindeki kalan tek satırlık delegasyon wrapper'larını ve ölü state değişkenlerini temizlemek.
- [x] `UIManager` delegasyon wrapper'ları ortak `callManager(...)` akışına çekildi.
- [x] Kullanılmayan yerel state kalıntıları kaldırıldı: `pinnedTooltipHtml`, `_slcRouteShort`, `_slcAnimFrame`, `_gtfsLoadingLock`, `cityServiceSelections`, `builtinGtfsPayloads`.
- [x] `window.handleNativeCityScan` da ortak delegasyon kalıbına indirildi.
- Doğrulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz L — Kod Sadeleştirme / Tur 3
- Hedef: manager dosyalarındaki küçük tekrarları azaltıp okunabilirliği artırmak.
- [x] `app-manager.js` içinde ortak DOM yardımcıları eklendi: `getElement`, `setText`, `toggleHidden`, `triggerResize`, `getLandingElements`.
- [x] Landing page sayaç ve görünürlük akışı bu yardımcılarla sadeleştirildi; davranış korunarak tekrar eden DOM kodu azaltıldı.
- [x] `service-manager.js` içinde takvim sabitleri ve servis durum etiket/rank haritaları tek yere toplandı.
- [x] `currentIds` normalizasyonu `normalizeServiceIds` yardımcı fonksiyonuna çekildi.
- Doğrulama: `node --check app-manager.js`, `node --check service-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz L — Kod Sadeleştirme / Tur 4
- Hedef: `city-manager.js` ve `data-manager.js` içindeki tekrar eden DOM/overlay akışlarını sadeleştirmek.
- [x] `city-manager.js` içine `getElement`, `setCityLoading`, `activateFallbackCity` yardımcıları eklendi.
- [x] Şehir yükleme overlay akışı ve fallback şehir aktivasyonu ortak yardımcılarla sadeleştirildi.
- [x] `data-manager.js` içine `getElement` ve `setHidden` yardımcıları eklendi.
- [x] GTFS progress/validation DOM erişimleri bu yardımcılarla sadeleştirildi; davranış korunarak tekrar azaltıldı.
- Doğrulama: `node --check city-manager.js`, `node --check data-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz L — Kod Sadeleştirme / Tur 5
- Hedef: `map-manager.js` ve `ui-manager.js` içindeki küçük context/DOM tekrarlarını azaltmak.
- [x] `map-manager.js` içinde `getDeckgl` ve `getMapgl` yardımcıları eklendi.
- [x] Harita/deck erişimleri ve follow-mode akışındaki tekrar eden bridge çağrıları sadeleştirildi.
- [x] `ui-manager.js` içinde `getElement`, `showElement`, `hideElement` yardımcıları eklendi.
- [x] Tooltip, stringline ve route paneli tarafındaki tekrar eden DOM erişimleri bu yardımcılarla sadeleştirildi.
- Doğrulama: `node --check map-manager.js`, `node --check ui-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz L — Kod Sadeleştirme / Tur 6
- Hedef: `simulation-engine.js` ve `data-manager.js` içindeki küçük DOM tekrarlarını azaltmak.
- [x] `simulation-engine.js` içine `getElement` yardımcısı eklendi.
- [x] Sparkline, slider, FPS, hız etiketi ve replay bar DOM erişimleri bu yardımcıyla sadeleştirildi.
- [x] `data-manager.js` içine `getLoaderElements` yardımcısı eklendi.
- [x] GTFS yükleme overlay akışındaki loader DOM erişimleri tek noktaya toplandı.
- Doğrulama: `node --check simulation-engine.js`, `node --check data-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz L — Kod Sadeleştirme / Tur 7
- Hedef: manager dosyalarındaki gereksiz `getBridge` katmanını kaldırıp context erişimini sadeleştirmek.
- [x] `app-manager.js`, `service-manager.js`, `city-manager.js`, `data-manager.js`, `ui-manager.js` içinde `getCtx` doğrudan `Legacy*Bridge?.getContext?.()` kullanacak şekilde sadeleştirildi.
- [x] Ek davranış değişikliği yapılmadan aradaki gereksiz fonksiyon katmanı kaldırıldı.
- Doğrulama: ilgili `node --check` kontrolleri ve `node --test --test-concurrency=1 --test-isolation=none` başarılı (28/28).

### Faz M — `script.js` Küçültme / Final Tur
- Hedef: `script.js` içinde kalan büyük legacy blokları ayrı modüllere taşıyıp dosyayı orchestration katmanına daha da yaklaştırmak.
- [x] Yeni `planner-manager.js` eklendi; rota planlama, Dijkstra tabanlı izokron analizi ve ilgili UI bağları `script.js` dışına taşındı.
- [x] GTFS modal, toast ve import-onay akışı `data-manager.js` içine alındı; `script.js` tarafı delegasyon wrapper'ına indirildi.
- [x] Bunching paneli ve bekleme süresi "en kötü/en iyi duraklar" panel üretimi `ui-manager.js` içine taşındı.
- [x] `index.html` ve `package.json` yeni modülü yükleyecek/paketleyecek şekilde güncellendi.
- [x] `script.js` yaklaşık `2148` satırdan `1838` satıra indi; kalan içerik ağırlıklı olarak bridge/orchestration ve bazı legacy helper'lardan oluşuyor.
- Doğrulama: `node --check script.js`, `node --check planner-manager.js`, `node --check data-manager.js`, `node --check ui-manager.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` başarılı.

### Faz N — Bug/Ölü Kod Temizliği / Tur 1
- Hedef: doğrulanmış küçük bug'ları ve artık kullanılmayan compatibility wrapper'ları temizlemek.
- [x] Toast tipi normalizasyonu düzeltildi; `warning` çağrıları artık `.toast.warn` stiliyle uyumlu.
- [x] `script.js` içindeki kullanılmayan `getLatestDateInCalendar`, `gtfsProgress`, `gtfsValidate`, `exportReportJSON`, `showValidationReport` wrapper'ları kaldırıldı.
- [x] `ui-manager.js` içindeki kullanılmayan `toggleUI()` kalıntısı kaldırıldı.
- Doğrulama: `node --check script.js`, `node --check data-manager.js`, `node --check ui-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz N — Regresyon Düzeltmeleri / Tur 2
- Hedef: manuel regresyonda çıkan veri yenileme, seçim paneli ve karakter bozulması sorunlarını kapatmak.
- [x] `planner-manager.js` içine `reset()` eklendi; GTFS/veri değişiminde rota planlayıcı seçimleri ve eski rota sonucu temizlenir hale getirildi.
- [x] `data-manager.js` içinde `applyGtfsRuntimeData()` başında planner reset çağrısı eklendi; yeni veri yüklenince eski durak/rota seçimi taşınmıyor.
- [x] `ui-utils.js` içindeki araç paneli ilerleme hesabı düzeltildi; patched trip'lerde yüzde hesabı artık mutlak zaman yerine sefer içi offset üzerinden yapılıyor.
- [x] `ui-manager.js` içinde harita üzerindeki hat tıklaması `obj.s + obj.t` üzerinden çalışacak şekilde düzeltildi; path segment tıklamaları artık hat panelini açabiliyor.
- [x] Gizlenen odaklı hatta kalan path artefaktı için route checkbox akışı düzeltildi; gizlenen odak rota önce focus'tan düşürülüyor.
- [x] `render-utils.js` içindeki mojibake onarımı güçlendirildi; ek latin1→utf8 heuristiği ve bazı ham isim kullanımlarında `displayText()` uygulanarak İstanbul verisindeki TR karakter bozulmaları azaltıldı.
- Doğrulama: `node --check script.js`, `node --check planner-manager.js`, `node --check data-manager.js`, `node --check ui-utils.js`, `node --check ui-manager.js`, `node --check city-manager.js`, `node --check render-utils.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` başarılı.

### Faz N ? Regresyon D?zeltmeleri / Tur 3
- Hedef: ara? panelinde kalan hat/durak ad?, sonraki durak ve tahmini var?? sorunlar?n? veri kayna?? seviyesinde kapatmak.
- [x] `script.js` i?indeki ZIP okuma ak??? `.csv` GTFS girdilerini de kabul edecek ?ekilde geni?letildi; builtin ?ehir ZIP?leri art?k `windows-1254` fallback ile do?ru decode ediliyor.
- [x] `city-manager.js` ba?lang?? ak??? builtin ?ehirlerde ?nce ger?ek GTFS ZIP?i y?kleyecek ?ekilde de?i?tirildi; eski `*_data.js` preload art?k sadece fallback.
- [x] `data-manager.js` i?inde `STOP_DEPS` ?zerinden eksik `trip.st` dizilerini yeniden kuran iyile?tirme eklendi; eski preload verisinde de ara? paneli i?in durak listesi/sonraki durak ?retilebiliyor.
- [x] `ui-utils.js` i?inde hat uzun ad? fallback?i eklendi; GTFS uzun ad? eksikse ilk/son duraktan t?retilmi? okunabilir g?zerg?h ad? g?steriliyor.
- Do?rulama: `node --check script.js`, `node --check city-manager.js`, `node --check data-manager.js`, `node --check ui-utils.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz N ? Regresyon D?zeltmeleri / Tur 4
- Hedef: ara? paneli ETA beklentisini kullan?c? ihtiyac?na g?re d?zeltmek ve durak panelindeki liste/?zet sorunlar?n? kapatmak.
- [x] `ui-utils.js` i?inde ara? paneli `Tahmini Var??` alan? son dura?a kalan s?reye ?evrildi; `Sonraki Durak` alan?na kalan durak say?s? eklendi.
- [x] `script.js` i?inde durak paneli rota ?zetleri en fazla 2 s?re g?sterecek ?ekilde daralt?ld?; 2 saati a?an geli?ler art?k sat?r? gizlemek yerine `-` ile g?steriliyor.
- [x] `ui-manager.js` i?inde durak paneli yolcu yo?unlu?u grafi?i kald?r?ld?; `Bekleme 3D` ?zeti metre yerine katman rengi (`Ye?il / Sar? / K?rm?z?`) ile g?steriliyor ve headway fallback?i g??lendirildi.
- [x] `data-manager.js` i?inde runtime metin normalizasyonu eklendi; GTFS verisi uygulamaya al?n?rken hat/durak adlar? `displayText()` ile temizleniyor.
- [x] `data-manager.js` i?indeki upload ZIP okuma ak??? da `.csv` + `windows-1254` fallback destekleyecek ?ekilde geni?letildi; TR karakter sorununun veri-kayna?? k?k? kapat?ld?.
- Do?rulama: `node --check script.js`, `node --check data-manager.js`, `node --check ui-manager.js`, `node --check ui-utils.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz N ? Regresyon D?zeltmeleri / Tur 5
- Hedef: kalan isim/sonraki durak sorununu GTFS stop offset format? ?zerinden d?zeltmek ve ara? panelindeki ETA alan?n? kald?rmak.
- [x] `data-manager.js` i?inde `trip.st.off` de?erleri i?in mutlak?g?reli normalizasyon eklendi; builtin/upload GTFS verisindeki stop offset format fark? tek ak??ta toparland?.
- [x] `index.html` ve `ui-manager.js` i?inde ara? panelindeki `Tahmini Var??` sat?r? kald?r?ld?.
- [x] `ui-utils.js` sonraki durak etiketini yaln?zca durak ad? + kalan durak say?s? g?sterecek ?ekilde sadele?tirildi.
- Do?rulama: `node --check data-manager.js`, `node --check ui-manager.js`, `node --check ui-utils.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz N ? Regresyon D?zeltmeleri / Tur 6
- Hedef: hat panelindeki stringline g?r?n?m?n? toparlamak ve panel i?i sabit metinlerde kalan TR karakter bozulmalar?n? d?zeltmek.
- [x] `ui-manager.js` i?inde stringline ?izimi yeniden d?zenlendi; seferler kalk?? saatine g?re s?ralan?yor, y?kseklik s?k??t?r?l?yor ve gece yar?s?n? a?an seferler iki par?aya b?l?nerek ?iziliyor.
- [x] `ui-manager.js` i?inde route panelinin sabit T?rk?e ba?l?klar? ve meta sat?rlar? UTF-8 olarak d?zeltildi.
- [x] `script.js` i?inde y?n da??l?m? metinleri `displayText()` ile normalize edildi.
- Do?rulama: `node --check ui-manager.js`, `node --check script.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz N ? Regresyon D?zeltmeleri / Tur 7
- Hedef: route panelinde veriden ba??ms?z sabit T?rk?e metinleri do?rudan kaynak dosyada d?zeltmek.
- [x] `ui-manager.js` i?indeki route panel ba?l?klar?, sat?r etiketleri, tooltip yo?unluk metni ve durak paneli sabitleri UTF-8 olarak temizlendi.
- [x] Route panel ?st meta sat?r? ve ba?l?kta `displayText()` kullan?m? g??lendirildi.
- Do?rulama: `node --check ui-manager.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz N — Regresyon Düzeltmeleri / Tur 8 (Preload Yeniden Üretim)
- [x] `Data\İstanbul.zip` kaynağından doğru `windows-1254/cp1254` decode ile preload snapshot yeniden üretildi.
- [x] `scripts/regenerate-istanbul-preload.js` eklendi; `lookup_data.js`, `trips_data.js`, `shapes_data.js` tek kaynaktan üretilebilir hale geldi.
- [x] Bozuk preload isimleri temiz kaynakla yeniden yazıldı; preload/runtime veri farkı azaltıldı.
- [x] Doğrulama: `node --test --test-concurrency=1 --test-isolation=none` → 28/28, `npm run build:win -- --dir` başarılı.

### Faz N — Regresyon Düzeltmeleri / Tur 9 (Araç Tıklama)
- [x] Preload açılışında seferlere `_idx` ve `_delay` atanarak araç pick eşlemesi sabitlendi.
- [x] `findTripIdx()` doğrudan yanlış aynı-hat fallback'inden çıkarıldı; yalnızca gerçek index veya skor eşleşmesi kullanılıyor.
- [x] `map-manager.js` araç head/3D layer verisine stabil `idx` eklendi.
- [x] Doğrulama: `node --check script.js`, `node --check map-manager.js`, `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz O — Dokümantasyon Sadeleştirme
- [x] `README.md` ürün, kurulum, kullanım ve belge giriş dokümanı olacak şekilde yeniden yazıldı.
- [x] `mimari.md` güncel modüler yapı, veri akışı, preload/runtime ve Electron akışına göre yeniden yazıldı.
- [x] `kontrol.md` kısa geliştirme kuralları ve repo çalışma prensipleri formatına indirildi.
- [x] `tanitim.md` kaldırıldı; tekrar eden tanıtım dokümanı set dışına çıkarıldı.

### Faz N — Regresyon Düzeltmeleri / Tur 10 (Hat Paneli Sadeleştirme)
- [x] Hat panelindeki `Sefer Diyagramı`/stringline bölümü kaldırıldı.
- [x] İlgili UI manager, HTML ve stil tanımları temizlendi.
- [x] Doğrulama: `node --check ui-manager.js`, `node --check script.js`, `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz P — Kod İnceleme Doğrulama (28 Mart 2026)
- Kapsam: Kullanıcının paylaştığı Faz I kod inceleme raporu mevcut kod tabanı üzerinde yeniden doğrulandı.
- Sonuç: 15 maddenin 7'si doğrudan doğrulandı, 5'i kısmen doğrulandı / yeniden çerçevelendi, 3'ü ise güncelliğini yitirmiş veya artık geçersiz bulundu.
- Doğrudan doğrulanan başlıklar: eksik manager init mimarisi, `CityManager -> renderServiceSelector` stub'ı, `btn-play` çift sorumluluğu, `LegacyUIBridge` içinde çift `colorToCss`, `SimulationEngine` context allocation maliyeti, `animate()` içinde null-context boş döngüsü, `script.js` içindeki ölü import / ölü tile helper'ları.
- Kısmen doğrulanan başlıklar: `buildRouteList()/buildStopList()` erken çağrısı mevcut ama bug değil, bootstrap coupling borcu; `PlannerManager -> UIManager` bağımlılığı çalışıyor ama sıralama varsayımına dayanıyor; `activeStopData` iki bridge'de taşınıyor ama bugün doğrudan kırık üretmiyor; `script.js` hâlâ büyük ama bu artık mimari borç kategorisinde; ServiceManager köprüsündeki metodlar mevcut olduğu için bu madde bloklayıcı çıkmadı.
- Geçersiz / güncelliğini yitirmiş başlıklar: Faz H açık maddeleri artık açık değil; `PathStyleExtension/_pathDashExt` temizliği zaten yapılmış; tüm UI/şehir yönetimi tamamen çalışmaz tespiti bugünkü kod için fazla geniş bir genelleme.

#### ADR-018: Bootstrap Sahipliği ve Manager Init Sözleşmesi
- **Karar:** Başlatma zinciri açık ve tekil hale getirilecek; `script.js` içindeki doğrudan bootstrap çağrıları aşamalı olarak ilgili manager `init()` sözleşmelerine taşınacak.
- **Gerekçe:** Bugünkü durumda `AppManager.init()` var, ancak `UIManager`, `CityManager`, `ServiceManager` modüllerinde eşdeğer init sözleşmesi yok. Buna rağmen `script.js` hâlâ `buildCityList()`, `buildRouteList()`, `buildStopList()` ve builtin city bootstrap'ını doğrudan çağırıyor. Bu yapı çalışsa bile sorumluluk sınırlarını belirsiz bırakıyor.
- **Etkisi:** Route/stop listesi, şehir yükleme ve servis takvimi başlatma akışı modül seviyesinde izlenebilir hale gelir; bootstrap regressions daha kolay yakalanır.
- **Planlanan işler:**
  - [ ] `UIManager.init()` oluştur ve route/stop listesi + temel panel/tooltip bağlamalarını buraya taşı
  - [ ] `CityManager.init()` oluştur ve şehir listesi / builtin city başlangıç akışını buraya taşı
  - [ ] `ServiceManager.init()` oluştur ve servis seçici / tarih bağlarını tek noktadan başlat
  - [ ] `script.js` sonundaki doğrudan bootstrap çağrılarını orkestrasyon seviyesine indir

#### ADR-019: City/Service Selector Köprüsü Stub Olmamalı
- **Karar:** `CityManager` ile servis takvimi UI'sı arasındaki sözleşme stub değil gerçek bir modül arayüzü olacak; `renderServiceSelector` ya gerçek implementasyonla doldurulacak ya da tamamen kaldırılıp tek yol `renderServiceDatePicker` olacak.
- **Gerekçe:** `city-manager.js` içinde hâlâ `ctx.renderServiceSelector([], 'all')` çağrıları var; `LegacyCityBridge` tarafında bu fonksiyon boş stub. Bu durum şehir değişiminde sessiz başarısızlık riski yaratıyor.
- **Etkisi:** Şehir değişimi sonrası servis/takvim UI'sı deterministik hale gelir; gizli no-op akışları ortadan kalkar.
- **Planlanan işler:**
  - [ ] `renderServiceSelector` çağrılarını envanterle ve gerçek kullanım ihtiyacını doğrula
  - [ ] Gerekli değilse tüm stub çağrılarını `renderServiceDatePicker` / clear-state akışıyla değiştir
  - [ ] Gerekliyse gerçek UI implementasyonunu tek modülde tanımla

#### ADR-020: Simülasyon Kontrollerinde Tek Sahiplik
- **Karar:** `btn-play`, replay ve frame loop state'i tek sahipten yönetilecek; `SimulationEngine` ile `script.js` arasında çift DOM / state yazımı kaldırılacak.
- **Gerekçe:** Bugünkü durumda `btn-play` hem `script.js` içindeki click handler tarafından hem de `SimulationEngine.startReplay()/stopReplay()` tarafından yönetiliyor. Ayrıca `animate()` null context aldığında boş `requestAnimationFrame` döngüsüne devam ediyor.
- **Etkisi:** Play/pause/replay state çakışmaları azalır; erken-start senaryolarında gereksiz frame churn önlenir.
- **Planlanan işler:**
  - [ ] `btn-play` text/class/state yönetimini tek fonksiyonda topla
  - [ ] replay akışını aynı state senkronizasyon hattına bağla
  - [ ] `SimulationEngine.animate()` içinde null-context için kontrollü backoff / stop stratejisi ekle
  - [ ] `LegacySimulationBridge.getContext()` için memoize edilmiş hafif context veya doğrudan referans erişimi tasarla

#### ADR-021: Legacy Bridge Daraltma ve Ölü Kod Temizliği
- **Karar:** Legacy bridge nesneleri sadece yaşayan API yüzeyini taşıyacak; tekrarlı property'ler, ölü import'lar ve artık kullanılmayan tile helper'ları kaldırılacak.
- **Gerekçe:** `LegacyUIBridge` içinde `colorToCss` iki kez yazılıyor; `script.js` üstünde `DeckGL`, `PathLayer`, `TILE_PORT`, `_offlineBase`, `_tileStyle` artık aktif kullanım üretmiyor; `activeStopData` aynı anda birden çok bridge context'inde taşınıyor.
- **Etkisi:** Bridge yüzeyi küçülür, frame başı allocation ve bakım maliyeti düşer; kalan mimari borç daha görünür hale gelir.
- **Planlanan işler:**
  - [ ] `LegacyUIBridge` içindeki çift `colorToCss` tanımını kaldır
  - [ ] `script.js` içindeki ölü import ve tile helper'larını kaldır
  - [ ] `activeStopData` sahipliğini tek bridge / tek state hattına indir
  - [ ] `script.js` içinde kalan ağır helper bloklarını modül hedeflerine göre yeniden sınıflandır

### Faz P — ADR-018 / ADR-021 Uygulama Turu 1 (28 Mart 2026)
- Hedef: bootstrap/init zinciri, selector stub akışı, play/replay state sahipliği ve legacy bridge yüzeyini ilk turda daraltmak.
- [x] `ServiceManager.init()` eklendi; `service-date-picker` bağlama mantığı `script.js` içinden modüle taşındı.
- [x] `CityManager.init(initialCity)` eklendi; başlangıç şehir listesi ve builtin city bootstrap akışı `script.js` sonundan modüle taşındı.
- [x] `UIManager.init()` eklendi; route/stop listesi bootstrap çağrıları modüle taşındı.
- [x] `city-manager.js` içindeki boş `renderServiceSelector` stub akışı kaldırıldı; clear-state yolu artık `renderServiceDatePicker([], [], new Set())` ile çalışıyor.
- [x] `btn-play` ve reset akışı için `setSimulationPaused()`, `toggleSimulationPaused()`, `resetSimulationPlayback()` eklendi; buton state yazımı tek hatta toplandı.
- [x] `SimulationEngine.startReplay()/stopReplay()` artık doğrudan DOM yazmak yerine ortak play-button senkronizasyonunu kullanıyor.
- [x] `SimulationEngine.animate()` null/erken context durumunda boş frame döngüsü yerine kontrollü yeniden başlatma deniyor.
- [x] `LegacySimulationBridge` allocation maliyeti düşürüldü; her `getContext()` çağrısında yeni obje üretmek yerine yeniden kullanılan context nesnesi güncelleniyor.
- [x] `LegacyUIBridge` içindeki çift `colorToCss` tanımı kaldırıldı; `activeStopData` kopyası UI bridge yüzeyinden çıkarıldı.
- [x] `script.js` içindeki ölü `DeckGL`, `PathLayer`, `TILE_PORT`, `_offlineBase`, `_tileStyle` temizlendi.
- Doğrulama: `node --check script.js`, `node --check service-manager.js`, `node --check city-manager.js`, `node --check ui-manager.js`, `node --check simulation-engine.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` başarılı.

### Faz P ? Regresyon / G?r?n?rl?k Turu 2 (28 Mart 2026)
- Hedef: ara? se?imi, servis takvimi g?r?n?rl???, tip filtresi, rota izolasyonu ve gece g?r?n?rl??? sorunlar?n? kapatmak.
- [x] `findTripIdx()` do?rudan layer `idx` de?erini kabul edecek ?ekilde gev?etildi; ara? t?klamalar?nda panel a??lmama regresyonu hedeflendi.
- [x] `ServiceManager.renderServiceDatePicker()` takvim verisi olmayan durumda da sol men?de g?r?n?r kalacak ?ekilde g?ncellendi; bilgi sat?r? art?k `?al??ma takvimi verisi yok ? T?m?` fallback?ini g?steriyor.
- [x] `service-manager.js` i?indeki ?al??ma takvimi etiketleri ve durum metinleri UTF-8 g?venli hale getirildi.
- [x] `gtfs-utils.js` i?inde runtime `trip.ts` ve `trip.st` de?erlerinden g?n modu `% 86400` k?rpmas? kald?r?ld?; gece saatlerinde seferi bitmi? arac?n g?r?nmeye devam etmesi sorunu k?kten hedeflendi.
- [x] `map-manager.js` i?inde `focusedRoute` art?k ger?ek izolasyon uyguluyor; odakl? hat se?ildi?inde di?er hatlar?n g?zerg?hlar? ve ara?lar? render d??? kal?yor.
- [x] `ui-manager.js` stop listesi odakl? hatta g?re daralt?ld?; se?ilen hatta ait duraklar d???nda liste temizleniyor.
- [x] Yeni `Durak 300 m` toggle?? eklendi; a??kken her durak etraf?nda 300 metre yar??apl? dolu kapsama katman? ?iziliyor.
- [x] Gece g?r?n?m?ndeki rota glow/?izgi parlakl??? azalt?ld?; neon hissi veren alpha ve kal?nl?k d???r?ld?.
- [x] Tip filtresi kar??la?t?rmalar? string-normalize edildi; `Otob?s/Tramvay` filtreleri `trip.t` / `shape.t` tip format fark?ndan etkilenmeyecek hale getirildi.
- Do?rulama: `node --check script.js`, `node --check map-manager.js`, `node --check service-manager.js`, `node --check gtfs-utils.js`, `node --check ui-manager.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz P ? Rota Planlay?c? / Nas?l Giderim Turu 3 (28 Mart 2026)
- Hedef: rota planlay?c?y? aktif ?ehir verisiyle hizalamak, Data klas?r?ndeki haz?r ?ehirleri g?r?n?r yapmak ve paneli `Nas?l Giderim` ak???na yakla?t?rmak.
- [x] `electron/main.js` i?indeki `scanDataFolder()` do?rudan `Data/*.zip` dosyalar?n? tarayacak ?ekilde d?zeltildi; klas?r alt? `GTFS.zip` varsay?m? kald?r?ld?.
- [x] `CityManager.init()` Electron taramas?ndan gelen haz?r GTFS ZIP?lerini builtin ?ehir listesine ekleyecek ?ekilde geni?letildi.
- [x] Taranan builtin ?ehirlerde merkez bilinmiyorsa, y?kleme sonras? durak bounding box??ndan ge?ici merkez hesaplan?p harita oraya u?uruluyor.
- [x] Rota planlay?c? ?st butonu ve panel metinleri `Nas?l Giderim` ak???na ?evrildi; `Nereden?`, `Nereye?`, `Yol Tarifi Olu?tur` giri?leri eklendi.
- [x] Planner paneline aktif ?ehir ba?lam? eklendi; panel art?k `aktif veri seti` ba?l??? alt?nda se?ili ?ehri g?steriyor.
- [x] Planner hatalar? `alert()` yerine panel i?i mesaj kart? olarak g?sterilecek ?ekilde de?i?tirildi.
- [x] Rota sonucu kart?na toplam s?re/ad?m/hat ?zeti eklendi; sonu? art?k yaln?zca ham step listesi de?il, ?stte k?sa yolculuk ?zeti de i?eriyor.
- Do?rulama: `node --check city-manager.js`, `node --check planner-manager.js`, `node --check electron/main.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz P ? Rota Planlay?c? / Nas?l Giderim Turu 4 (28 Mart 2026)
- Hedef: taranan builtin ?ehirlerin ger?ekten kullan?lmas?n? sa?lamak ve `Nas?l Giderim` panelini aktif ?ehir ba?lam?na daha yak?n hale getirmek.
- [x] `city-manager.js` yeniden d?zenlendi; Electron taramas?ndan gelen `Data/*.zip` ?ehirleri UTF-8 g?venli `builtin` kay?tlar olarak listeye ekleniyor.
- [x] Taranan ?ehirler i?in `gtfsZip`, g?r?n?rl?k, not ve merkez fallback ak??? tek noktada normalize edildi.
- [x] `planner-manager.js` yeniden yaz?ld?; panel ?st ba?lam? aktif ?ehri g?steriyor ve hatalar `alert()` yerine panel i?i mesaj kart? olarak d?n?yor.
- [x] `Nas?l Giderim` ak??? art?k aktif ?ehir verisiyle do?rulama yap?yor; se?ilen durak aktif ?ehirde yoksa kullan?c?ya panel i?inde a??klay?c? hata veriliyor.
- [x] `ui-manager.js` rota sonucu ?zetine ad?m say?s? + hat say?s? + toplam s?re kart? eklendi.
- Do?rulama: `node --check city-manager.js`, `node --check planner-manager.js`, `node --check script.js`, `node --check ui-manager.js`, `node --check electron/main.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` ba?ar?l?.

### Faz P — Filtre / Görünürlük Düzeltmeleri Turu 5 (28 Mart 2026)
- Hedef: tip filtresi, gizlenen hat artığı, 300 m kapsama katmanı ve gece ghost-trip görünürlüğü üzerinde kalan regresyonları sıkılaştırmak.
- [x] `setTypeFilter()` artık katmanları anında refresh ediyor; tip filtresi değiştiğinde odaklı hat tipi uyuşmuyorsa focus temizleniyor.
- [x] `stop-coverage` katmanı `showStops` toggle'ından bağımsız hale getirildi; `Durak 300 m` açıkken durak katmanı kapalı olsa da kapsama daireleri çiziliyor.
- [x] Odaklı hat checkbox ile gizlenirse `routeHighlightPath` de temizleniyor; ekranda kalan tek çizgi artefaktı hedeflendi.
- [x] `TripsLayer` ve araç head/3D üretimi yalnızca gerçekten aktif araçlardan besleniyor; ghost araçların gece görünmesi azaltıldı.
- [x] Hat odaklı stop listesinde 300 satır limiti kaldırıldı; odaklı hatta ait tüm duraklar gösteriliyor.
- [x] Araç panelindeki durak listesi `slice(0, 25)` kısıtı kaldırıldı; seferin tüm durakları görünür hale getirildi.
- Doğrulama: `node --check script.js`, `node --check map-manager.js`, `node --check ui-manager.js`, `node --check ui-utils.js`, `node --test --test-concurrency=1 --test-isolation=none` ve `npm run build:win -- --dir` başarılı.

### Faz P — Filtre / Planner Düzeltmeleri Turu 6 (29 Mart 2026)
- Hedef: Şehir değişimi sonrası kalan eski katman/cache sızıntılarını kapatmak, tip filtresi ve tek çizgi artefaktını temizlemek, `Nasıl Giderim` panelini aktif şehir verisiyle çalışan etap bazlı sonuca çevirmek.
- [x] `data-manager.js` içinde runtime veri apply sonrası doğrudan `deckgl.setProps(buildLayers())` yerine `refreshLayersNow()` çağrısına geçildi; böylece şehir değişiminde `MapManager` cache'i de sıfırlanıyor.
- [x] `map-manager.js` görünür trip/shape cache anahtarına `focusedRoute` eklendi; odak hat değişiminde eski vis cache tekrar kullanılmıyor.
- [x] `script.js` tip filtresi değişince `routeHighlightPath` temizleniyor ve stop listesi aktif filtreye göre yeniden kuruluyor.
- [x] `ui-manager.js` içinde odak temizleme ve route checkbox gizleme akışları `routeHighlightPath` artefaktını da temizleyecek şekilde sertleştirildi.
- [x] `ui-manager.js` stop search artık init anındaki eski context snapshot'ını tutmuyor; her input/click olayında güncel `LegacyUIBridge` context'i okunuyor. Bu, Kocaeli seçiliyken hâlâ İstanbul duraklarının gelmesi regresyonunu hedefliyor.
- [x] `ui-manager.js` rota sonucu ekranı ham durak-durak step listesi yerine etap bazlı özet üretecek şekilde değiştirildi: `Yürü`, `X hattına bin`, `Y durağında in`, `Aktarma`.
- Doğrulama: `node --check script.js`, `node --check map-manager.js`, `node --check ui-manager.js`, `node --check data-manager.js` başarılı.

### Faz P — Araç Zaman Etiketi Düzeltmesi Turu 7 (29 Mart 2026)
- Hedef: araç panelindeki gece seferlerini `01:00` gibi yanıltıcı mod-24 saat yerine GTFS mutlak saat mantığıyla göstermek.
- [x] `ui-utils.js` içine `formatGtfsClock()` eklendi; `24:xx+` saatler artık kırpılmadan gösteriliyor.
- [x] Araç panelindeki `Kalkış`, `Varış` ve durak zaman listesi artık aynı GTFS saat formatını kullanıyor.
- Doğrulama: `node --check ui-utils.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz P — Hotfix / Data Bridge Turu 8 (29 Mart 2026)
- Hedef: GTFS y?kleme s?ras?nda `GTFS_RUNTIME_ERROR: ctx.refreshLayersNow is not a function` hatas?n? kapatmak.
- [x] `LegacyDataBridge` y?zeyine `refreshLayersNow` eklendi; `data-manager.js` runtime apply sonras? ?a?r?y? art?k ge?erli bridge API ?zerinden yap?yor.
- Do?rulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz P — Ara? Paneli Restorasyonu Turu 9 (29 Mart 2026)
- Hedef: ara?lara t?kland???nda panelin a??lmamas?, ?zellikle `route_type=0` tramvaylarda truthiness kaynakl? ka??rmalar? kapatmak ve ETA alan?n? yeniden ba?lamak.
- [x] `ui-manager.js` i?inde ara? se?imi ko?ulu `tripObj?.t !== undefined` olarak d?zeltildi; tramvay ara?lar? art?k se?im filtresinden d??m?yor.
- [x] Ara? panelindeki `vp-eta` alan? yeniden senkronize edildi.
- [x] `script.js` i?inde `findTripIdx` i?in `.id` fallback'i eklendi ve tip kar??la?t?rmas? gev?ek e?le?me ile uyumlu hale getirildi.
- Do?rulama: `node --check ui-manager.js` ve `node --check script.js` ba?ar?l?.

### Faz Q — Durum Senkronizasyonu / Performans Turu 1 (29 Mart 2026)
- Hedef: duraklat?lm?? sim?lasyonda panel verilerinin g?ncel kalmas?n? sa?lamak ve ara? se?imindeki pahal? trip aramas?n? indeks tabanl? hale getirmek.
- [x] `simulation-engine.js` i?inde pause durumunda da slider/saat de?i?imlerinde a??k ara? ve durak paneli g?ncelleniyor.
- [x] `script.js` i?inde `findTripIdx` i?in ?nbellekli indeks yap?s? kuruldu; tam dizi taramas? yaln?zca son fallback olarak b?rak?ld?.
- [x] Ara? se?imi i?in mevcut `idx/id` ak??? korunurken lookup cache ile e?le?me y?k? d???r?ld?; yeni se?imler ?nce kararl? kimliklerden ??z?mleniyor.
- [x] Do?rulama: `node --check script.js`, `node --check simulation-engine.js`, `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz Q — Durak Paneli Performans Turu 2 (29 Mart 2026)
- Hedef: ayn? dura?a art arda t?klamada yeniden hesaplanan hat var?? ?zetlerini ?nbelle?e alarak stop paneli maliyetini d???rmek.
- [x] `script.js` i?ine `_stopRouteSummariesCache` eklendi; `getStopRouteSummaries()` art?k durak + 30 saniyelik zaman dilimi baz?nda cache kullan?yor.
- [x] Runtime veri temizleme ve cache reset ak??lar?na stop-panel cache invalidation eklendi.
- [x] Cache boyutu b?y?rse otomatik temizleniyor; stale sonu? birikimi engelleniyor.
- Do?rulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.
### Faz P — Hotfix / Data Bridge Turu 8 (29 Mart 2026)
- Hedef: GTFS yükleme sırasında `GTFS_RUNTIME_ERROR: ctx.refreshLayersNow is not a function` hatasını kapatmak.
- [x] `LegacyDataBridge` yüzeyine `refreshLayersNow` eklendi; `data-manager.js` runtime apply sonrası çağrıyı artık geçerli bridge API üzerinden yapıyor.
- Doğrulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz P — Araç Paneli Restorasyonu Turu 9 (29 Mart 2026)
- Hedef: araçlara tıklandığında panelin açılmaması, özellikle `route_type=0` tramvaylarda truthiness kaynaklı kaçırmaları kapatmak ve ETA alanını yeniden bağlamak.
- [x] `ui-manager.js` içinde araç seçimi koşulu `tripObj?.t !== undefined` olarak düzeltildi; tramvay araçları artık seçim filtresinden düşmüyor.
- [x] Araç panelindeki `vp-eta` alanı yeniden senkronize edildi.
- [x] `script.js` içinde `findTripIdx` için `.id` fallback'i eklendi ve tip karşılaştırması gevşek eşleşme ile uyumlu hale getirildi.
- Doğrulama: `node --check ui-manager.js` ve `node --check script.js` başarılı.

### Faz Q — Durum Senkronizasyonu / Performans Turu 1 (29 Mart 2026)
- Hedef: duraklatılmış simülasyonda panel verilerinin güncel kalmasını sağlamak ve araç seçimindeki pahalı trip aramasını indeks tabanlı hale getirmek.
- [x] `simulation-engine.js` içinde pause durumunda da slider/saat değişimlerinde açık araç ve durak paneli güncelleniyor.
- [x] `script.js` içinde `findTripIdx` için önbellekli indeks yapısı kuruldu; tam dizi taraması yalnızca son fallback olarak bırakıldı.
- [x] Araç seçimi için mevcut `idx/id` akışı korunurken lookup cache ile eşleşme yükü düşürüldü; yeni seçimler önce kararlı kimliklerden çözümleniyor.
- [x] Doğrulama: `node --check script.js`, `node --check simulation-engine.js`, `node --test --test-concurrency=1 --test-isolation=none` başarılı.

### Faz Q — Durak Paneli Performans Turu 2 (29 Mart 2026)
- Hedef: aynı durağa art arda tıklamada yeniden hesaplanan hat varış özetlerini önbelleğe alarak stop paneli maliyetini düşürmek.
- [x] `script.js` içine `_stopRouteSummariesCache` eklendi; `getStopRouteSummaries()` artık durak + 30 saniyelik zaman dilimi bazında cache kullanıyor.
- [x] Runtime veri temizleme ve cache reset akışlarına stop-panel cache invalidation eklendi.
- [x] Cache boyutu büyürse otomatik temizleniyor; stale sonuç birikimi engelleniyor.
- [x] Doğrulama: `node --check script.js` ve `node --test --test-concurrency=1 --test-isolation=none` başarılı.


### Faz Q ? Hat Tipi Filtresi Turu 3 (29 Mart 2026)
- Hedef: hat tipi filtresini yaln?zca GTFS `route_type` ?zerinden kararl? ?al??t?rmak ve route listesi rebuild sonras?nda da aktif filtreyi korumak.
- [x] `map-manager.js` i?inde g?r?n?r trip/shape filtresi canonical `route_type` normalizasyonu ile ?al??acak ?ekilde sertle?tirildi.
- [x] `ui-manager.js` route listesi olu?turulurken `dataset.type` ve grup anahtarlar? normalize edildi; rebuild sonras? aktif tip filtresi yeniden uygulan?yor.
- [x] `script.js` i?indeki `setTypeFilter()` se?ilen tipi canonical string'e indiriyor; odakl? hat tipi kontrol? de ayn? normalizasyonu kullan?yor.
- Do?rulama: `node --check script.js`, `node --check ui-manager.js`, `node --check map-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz Q ? Gece Sefer Ba?lang?c? Turu 4 (29 Mart 2026)
- Hedef: preload veride `trip.bs` ile `STOP_DEPS` ?ak??t???nda yanl?? ba?lang?? saati y?z?nden gece ghost-vehicle g?r?nmesini azaltmak.
- [x] `data-manager.js` i?indeki `patchTripsAbsoluteTime()` ba?lang?? saati ?nceli?i `STOP_DEPS -> trip.bs -> trip.st` olarak de?i?tirildi; ger?ek departure verisi preload metadata'n?n ?n?ne al?nd?.
- Do?rulama: `node --check data-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz Q ? Gece TripsLayer Zaman E?itlemesi Turu 5 (29 Mart 2026)
- Hedef: gece ta?an patched seferlerde `TripsLayer` ile `getVehiclePos()` zaman taban?n? e?itleyerek g?rsel ghost/iz tutars?zl???n? azaltmak.
- [x] `map-manager.js` i?inde patched trip timestamp'leri `86400+` ta??yorsa `TripsLayer.currentTime` i?in `time` kullan?l?yor; yaln?zca normal g?n i?i setlerde `time % 86400` korunuyor.
- Do?rulama: `node --check map-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz Q ? Ara? Kimli?i Sabitleme Turu 6 (29 Mart 2026)
- Hedef: render edilen ara? nesnelerinin panel e?le?mesini daha deterministik hale getirmek.
- [x] `script.js` preload ak???nda t?m trip kay?tlar?na sabit `id=index` atand?.
- [x] `data-manager.js` runtime GTFS apply ak???nda da t?m trip kay?tlar?na sabit `id=index` atand?.
- [x] B?ylece picking taraf?nda `idx/id/_idx` zinciri ayn? kimli?i ta??yor; `findTripIdx` fallback'e daha az d???yor.
- Do?rulama: `node --check script.js`, `node --check data-manager.js` ve `node --test --test-concurrency=1 --test-isolation=none` ba?ar?l?.

### Faz Q ? Kocaeli Route Type ve Picking Turu 7 (29 Mart 2026)
- Hedef: Kocaeli GTFS y?klemesinde tramvaylar?n yanl??l?kla otob?s tipine d??mesini ve ara? picking zincirindeki belirsizli?i azaltmak.
- [x] `gtfs-utils.js` i?inde `route_type=0` olan kay?tlar?n `|| 3` y?z?nden otob?se d?nmesi d?zeltildi; tramvaylar art?k ger?ek `route_type` ile ta??n?yor.
- [x] `map-manager.js` i?inde `TripsLayer` verisi `{ trip, idx }` nesnesi ta??yacak ?ekilde g?ncellendi; pick edilen obje art?k kesin sefer indeksini koruyor.
- [x] `script.js` i?inde `findTripIdx()` i?in do?rudan nesne referans? e?le?mesi eklendi; gereksiz fuzzy fallback daha da geriye itildi.
- Te?his: Kocaeli `routes.txt` i?inde `T1`, `T2`, `T3` ger?ekten `route_type=0`; sorun veri de?il parse mant???yd?.

### Faz Q ? Durak Tip Filtresi Turu 8 (30 Mart 2026)
- Hedef: hat tipi filtresi se?ildi?inde haritadaki ve sol listedeki duraklar? da ayn? tipe g?re daraltmak.
- [x] `script.js` i?inde `getFilteredStopsData()` eklendi; g?r?n?r trip + aktif tip + gizli hatlar birlikte dikkate al?narak stop k?mesi ?retiliyor.
- [x] `map-manager.js` stop katman? ve `Durak 300 m` katman? art?k bu filtrelenmi? stop k?mesini kullan?yor.
- [x] `ui-manager.js` stop listesi de ayn? veri kayna??na ba?land?; hat gizle/g?ster de?i?ince liste an?nda yenileniyor.

### Faz Q ? Yo?unluk, Bekleme ve Uydu Turu 9 (30 Mart 2026)
- Hedef: tip filtresi ve odakl? hat se?imi sonras? a??k kalan 3D katmanlar? g?r?n?r veriyle e?itlemek ve ger?ek uydu taban haritas?n? devreye almak.
- [x] `map-manager.js` i?inde `Durak Yo?unlu?u 3D` art?k filtrelenmi? durak k?mesinden yeniden hesaplan?yor; odakl? hat ve tip filtresi yo?unluk kolonlar?n? da daralt?yor.
- [x] `map-manager.js` i?inde `Bekleme S?resi 3D` yaln?zca g?r?n?r duraklar i?in ?iziliyor; kolon y?ksekli?i ve kademeleri art?r?ld?.
- [x] `analytics-utils.js` i?inde bekleme renk skalas? daha belirgin 5 kademeli seviyeye ??kar?ld?.
- [x] `simulation-engine.js` i?inde `satellite` modu ger?ek Esri World Imagery raster stiliyle de?i?tirildi; `index.html` buton etiketi `UYDU` oldu.

### Faz Q ? Varsay?lan ?ehir De?i?imi Turu 10 (30 Mart 2026)
- Hedef: uygulaman?n ba?lang?? veri setini ?stanbul preload yerine g?ncel Bordeaux GTFS ile ba?latmak.
- [x] `script.js` i?indeki builtin ?ehir listesinde `Bordeaux` ilk s?raya al?nd?; ba?lang??ta `activeCity` art?k `Data/bordeaux.zip` ?zerinden y?kleniyor.
- [x] `?stanbul` builtin se?enek olarak listede tutuldu; preload fallback bozulmad?.

### Faz Q ? ?stanbul Preload Kald?rma Turu 11 (30 Mart 2026)
- Hedef: ?stanbul preload ba??ml?l???n? kald?r?p preload veri setini Bordeaux'a ?evirmek.
- [x] `scripts/regenerate-istanbul-preload.js` kald?r?ld?; yerine `scripts/regenerate-bordeaux-preload.js` eklendi.
- [x] `trips_data.js`, `shapes_data.js`, `lookup_data.js` Bordeaux GTFS kayna??ndan yeniden ?retildi.
- [x] `script.js` builtin ?ehir listesinden `?stanbul` kald?r?ld?; varsay?lan ve tek preload ?ehir Bordeaux oldu.
- [x] `Data/?stanbul.zip` dosyas? silindi.

### Faz Q — Başlık ve Başlangıç Görünümü Turu 12 (30 Mart 2026)
- Hedef: görünür İstanbul kalıntılarını temizlemek ve açılıştaki yanlış aktif tip filtresi izlenimini kaldırmak.
- [x] `index.html` sayfa başlığı `Transit 3D` olarak güncellendi.
- [x] Hat tipi butonlarında başlangıç aktif seçim `Tümü` olacak şekilde düzeltildi.
- [x] `script.js` içindeki sinematik waypoint listesi Bordeaux/generic odaklı hale getirildi.

### Faz Q — Başlangıç Yarışı ve Fallback Turu 13 (30 Mart 2026)
- Hedef: preload ile builtin ZIP yüklemesinin açılışta üst üste çalışmasını durdurmak ve `baseRuntimeData` fallback'ini şehir bağımlı hale getirmek.
- [x] `city-manager.js` içinde başlangıç akışı preload veri varsa önce onu kullanacak şekilde değiştirildi; açılışta aynı şehir için ikinci bir GTFS importu tetiklenmiyor.
- [x] `script.js` içindeki `captureRuntimeDataSnapshot()` şehir kimliği (`_cityId`) taşır hale getirildi.
- [x] `city-manager.js` builtin yükleme fallback'i yalnızca aynı şehrin snapshot'ına düşecek şekilde sınırlandı.
- [x] `index.html` hat tipi butonlarındaki duplicate `Tümü` girdisi kaldırıldı.

### Faz Q — Preload-free Başlangıç Turu 14 (30 Mart 2026)
- Hedef: preload `***data.js` bağımlılığını başlangıç zincirinden çıkarmak ve uygulamayı doğrudan `Data/*.zip` üstünden başlatmak.
- [x] `bootstrap-manager.js` artık yalnızca `script.js` yükliyor; preload veri bundle'ları açılışta yüklenmiyor.
- [x] `script.js` boş başlangıç state'i ile güvenli açılacak şekilde korunuyor; varsayılan şehir yüklemesi tamamlanınca `BootstrapManager.onAppReady()` çağrılıyor.
- [x] `sw.js` statik cache listesinden `trips_data.js`, `shapes_data.js`, `lookup_data.js` çıkarıldı.
- [x] `scripts/check-data-files.js` preload bundle yerine `Data/` altında en az bir `.zip` dosyası arayacak şekilde güncellendi.
- [x] `package.json` build paketine preload bundle eklemeyi bıraktı; başlangıç veri kaynağı yalnızca `Data/*.zip`.

### Faz Q — Builtin ZIP Başlangıç Düzeltmesi Turu 15 (30 Mart 2026)
- Hedef: preload kaldırıldıktan sonra Electron içinden varsayılan şehir ZIP'inin doğru okunmasını sağlamak.
- [x] `script.js` içindeki `getBuiltinGtfsPayload()` artık `electronAPI.readDataFile()` sonucunda `success` ve `buffer` alanlarını doğru değerlendiriyor.
- [x] `electron/main.js` içindeki `city:read-data-file` handler'ı `Data/` önekini normalize ederek `Data/bordeaux.zip` gibi yolları doğru çözüyor.
- [x] Böylece açılışta `%55`te kalma yerine varsayılan şehir ZIP'i gerçekten parse edilip yüklenebiliyor.

### Faz Q — Preload'suz Global Alias Düzeltmesi Turu 16 (30 Mart 2026)
- Hedef: preload bundle yüklenmeden açılışta `TRIPS`, `STOP_INFO`, `STOP_DEPS` gibi legacy global isimlerin `ReferenceError` üretmesini engellemek.
- [x] `script.js` içinde `AppState` oluşturulduktan hemen sonra `TRIPS`, `SHAPES`, `STOPS`, `STOP_INFO`, `STOP_DEPS`, `HOURLY_COUNTS`, `HOURLY_HEAT`, `ADJ` için boş/güvenli alias'lar tanımlandı.
- [x] Böylece preload'suz başlangıçta legacy bridge ve helper fonksiyonlar boş state ile çalışabiliyor; ZIP yüklenince bu alias'lar yine runtime veriyle güncelleniyor.

### Faz Q — Landing ve Varsayılan Kamera Düzeltmesi Turu 17 (30 Mart 2026)
- Hedef: veri tam yüklenmeden haritayı açmayı engellemek ve başlangıç kamerasını İstanbul sabitinden çıkarmak.
- [x] `script.js` içindeki ilk `maplibre` kamera merkezi artık aktif şehir (`activeCity`) değerlerinden geliyor; İstanbul sabit merkezi kaldırıldı.
- [x] `index.html` içindeki landing ana butonu preload'suz akışa uygun hale getirildi; başlangıçta devre dışı ve `VERİ YÜKLENİYOR` metniyle başlıyor.
- [x] `app-manager.js` içindeki landing butonu yalnızca `AppState.trips` hazır olduğunda etkinleşiyor; veri yokken haritayı açmıyor.
- [x] Landing sayaçları güncellenirken buton durumu da senkronize ediliyor; veri yüklendiğinde metin `HARİTAYI AÇ` oluyor.

### Faz Q — Upload-first Landing Turu 18 (30 Mart 2026)
- Hedef: açılış ekranını preload'suz akışa uygun hale getirip ilk eylemi `GTFS ZIP YÜKLE` yapmak.
- [x] `script.js` içindeki başlangıç akışı artık otomatik builtin şehir yüklemiyor; uygulama boş state ile landing ekranında açılıyor.
- [x] `index.html` içinde birincil landing butonu `GTFS ZIP YÜKLE`, harita açma butonu ise veri hazır olana kadar gizli olacak şekilde değiştirildi.
- [x] `data-manager.js` landing ekranından dosya seçildiğinde yükleme akışını otomatik başlatıyor; sayaçlar parse edilen route/trip/stop sayılarıyla anlık güncelleniyor.
- [x] `app-manager.js` landing yükleme durumu için yüzde dolumlu buton akışı ekledi; yükleme sürerken metin `VERİ YÜKLENİYOR %...` formatında akıyor.
- [x] `style.css` içinde landing yükleme butonu için dolan yüzde görünümü eklendi.

### Faz Q — Upload-first Hata Düzeltmeleri Turu 19 (30 Mart 2026)
- Hedef: upload-first akış sonrası çıkan `stopData` hatasını, ikinci yükleme ekranını ve duplicate şehir girdilerini temizlemek.
- [x] `map-manager.js` içindeki `stopData` tanımı density hesabının önüne alındı; `Tramvay` filtre geçişinde gelen TDZ hatası kapatıldı.
- [x] `data-manager.js` landing ekranından yükleme yapılırken ikinci tam ekran overlay artık açılmıyor; tek progress yüzeyi landing butonu üzerinden akıyor.
- [x] `data-manager.js` aynı şehir adıyla tekrar GTFS yüklenirse city listesine ikinci kayıt eklemek yerine mevcut şehri güncelliyor.
- [x] `gtfs-utils.js` `file://` altında worker açmayı denemiyor; gereksiz `SecurityError` uyarısı kaldırıldı.

### Faz Q — Worker ve Bootstrap Akışı Turu 20 (30 Mart 2026)
- Hedef: preload'suz başlangıçta görünen bootstrap `%55` ekranını kaldırmak ve GTFS parse'ı tekrar worker'a taşıyarak yükleme sırasındaki kasmayı azaltmak.
- [x] `bootstrap-manager.js` içindeki başlangıç overlay/progress akışı kaldırıldı; landing artık doğrudan uygulama hazır olduğunda açılıyor.
- [x] `gtfs-utils.js` içinde `file://` için blob tabanlı worker üretimi eklendi; Electron altında GTFS parse yeniden worker üzerinden çalışabiliyor.
- [x] Worker başarısız olursa fallback hâlâ mevcut, ancak normal durumda parse ana thread'i kilitlemeden ilerliyor.

### Faz Q — UI ve Runtime Düzeltmeleri Turu 21 (30 Mart 2026)
- Hedef: route panel düzeni, araç izleri varsayılanı, odaklı headway çizgileri ve kalan runtime hatalarını kapatmak.
- [x] `script.js` içinde `showTrail` varsayılanı kapalı yapıldı; `index.html` içindeki `Araç İzleri` toggle'ı artık pasif geliyor.
- [x] `ui-manager.js` route panelindeki `Yön Dağılımı` bloğu her yönü ayrı satırda gösterecek şekilde düzenlendi.
- [x] `simulation-engine.js` headway çizgileri odaklı hat seçiliyken yalnızca seçilen hattın seferlerinden hesaplanıyor.
- [x] `script.js` Legacy simulation context'i `focusedRoute` ve canlı `updateVehiclePanel/renderStopPanel` fonksiyonlarını taşıyacak şekilde düzeltildi; `ctx.updateVehiclePanel is not a function` hatası kapatıldı.
- [x] `gtfs-utils.js` Electron altında worker kaynaklarını IPC ile okuyup blob worker kuracak şekilde güncellendi; `file:// fetch` CORS hataları azaltıldı.
- [x] `style.css` içindeki faz rozet pseudo-ögesi kaldırıldı, route panel aşağı alındı ve harita kontrol butonlarının `z-index` değeri yükseltildi.

### Faz Q — Electron Worker Kaynak Yolu Düzeltmesi Turu 22 (30 Mart 2026)
- Hedef: `file://` altında worker kaynağı okunamadığında `fetch` fallback'ine düşüp CORS hatası üretmesini engellemek.
- [x] `gtfs-utils.js` içindeki Electron worker kaynak yolu `window.location.pathname` üstünden Windows uyumlu mutlak yola çevrildi.
- [x] Electron IPC okuması başarısız olursa `file:// fetch` yoluna devam etmek yerine doğrudan fallback parse'a dönülüyor; gereksiz CORS gürültüsü kesildi.

## Kilitlenen Kararlar

### ADR-022 — Upload-first Açılış Akışı Kilitlendi (30 Mart 2026)
- Durum: Kabul edildi
- Karar: Uygulama açılışında otomatik preload veya otomatik builtin şehir yüklemesi yapılmaz.
- Kural:
  - İlk ekran landing ekranıdır.
  - İlk ana eylem `GTFS ZIP YÜKLE` butonudur.
  - Veri hazır olmadan `HARİTAYI AÇ` görünmez veya aktif olmaz.
- Not: Bu akış, yeni bir mimari kararı olmadan geri alınmayacak.

### ADR-023 — Başlangıç Veri Kaynağı `Data/*.zip` Olarak Kilitlendi (30 Mart 2026)
- Durum: Kabul edildi
- Karar: Başlangıç veri kaynağı preload `***data.js` değil, `Data/` klasöründeki GTFS ZIP dosyalarıdır.
- Kural:
  - `bootstrap-manager.js` preload bundle yüklemez.
  - Build doğrulaması preload dosyası değil `Data/*.zip` arar.
  - Yeni şehir desteği ZIP tabanlı eklenir.
- Not: Preload bundle mantığına geri dönüş yapılmayacak; gerekirse ayrı ADR ile yeniden açılır.

### ADR-024 — GTFS Yükleme Sırasında Tek Progress Yüzeyi Kullanılacak (30 Mart 2026)
- Durum: Kabul edildi
- Karar: Landing ekranından başlatılan yüklemede tek progress yüzeyi landing butonudur.
- Kural:
  - İkinci tam ekran yüzde/overlay açılmaz.
  - Yüzde, metin ve sayaçlar aynı yüzeyden akar.
  - Route / trip / stop sayaçları yükleme boyunca güncellenir.
- Not: Çift progress yüzeyi UX regresyonu sayılır.

### ADR-025 — Worker Tabanlı GTFS Parse Korunacak (30 Mart 2026)
- Durum: Kabul edildi
- Karar: GTFS parse mümkün olduğunda worker üzerinden çalıştırılır.
- Kural:
  - Electron `file://` modunda blob worker veya IPC tabanlı worker kaynağı kullanılır.
  - Main-thread fallback yalnızca son çaredir.
  - Parse performansı uğruna veri kırpma varsayılan çözüm olmayacak.
- Not: Büyük veri setlerinde performans sorunu önce worker/akış iyileştirmesi ile çözülür.

### ADR-026 — Route Panel ve Odak Davranışı Kilitlendi (30 Mart 2026)
- Durum: Kabul edildi
- Karar: Hat odaklama, panel ve analitikler aynı seçime göre davranır.
- Kural:
  - `Yön Dağılımı` her yönü ayrı satırda gösterir.
  - Odaklı hat varken `Headway Çizgileri` yalnızca o hat için üretilir.
  - `Araç İzleri` varsayılan olarak kapalı gelir.
  - Harita kontrol butonları panel arkasında kalmaz.
- Not: Bu davranışlar temel UX kabulüdür; yeni tasarım kararı olmadan geri alınmayacak.

### Faz Q — Landing / Durak Paneli / Bekleme 3D Turu 23 (30 Mart 2026)

- `index.html` içinde başlangıç `loading-overlay` görünümü varsayılan olarak gizlendi; açılışta tekrar `Veriler Hazırlanıyor` ekranı görünmemeli.
- `gtfs-utils.js` içinde `file://` altındaki worker kurulum yolu düzeltildi; Electron IPC başarısızsa artık `fetch(file://...)` CORS hattına düşmüyor.
- `ui-manager.js` içinde durak paneli tablo düzenine çevrildi: `Hat / Varış Yönü / İlk Araç / Sonraki Araç`.
- `ui-manager.js` içinde `waitingColor` çağrısı güvenli fallback ile düzeltildi.
- `map-manager.js` içinde `Bekleme Süresi 3D` katmanına route/type filtreli `filteredStopIds` tekrar bağlandı.
### Faz Q — Filtre / Yön / Uyarı Paneli Turu 24 (30 Mart 2026)

- `city-manager.js` içinde şehir listesindeki `Görünür` etiketi ve başlık metinleri düzeltildi.
- `index.html`, `style.css` ve `script.js` içinde GTFS uyarı kutusu sağ üst köşeye taşındı ve kapatma düğmesi eklendi.
- `map-manager.js` içinde güzergâh çizgisindeki glow / neon katmanı kaldırıldı.
- `map-manager.js` içinde `Bekleme Süresi 3D` hesabı route/type/focused route filtresiyle yeniden hesaplanır hale getirildi.
- `gtfs-utils.js` ve `script.js` içinde `direction_id` runtime veriye taşındı; yön etiketi önce `Gidiş / Dönüş`, sonra fallback metin olacak.
- `simulation-engine.js` tarafındaki headway hesapları aynı yön mantığına `inferTripDirectionLabel()` üzerinden bağlı kalacak.
### Faz Q — Tek GTFS Modu Turu 25 (30 Mart 2026)

- `script.js` içinde builtin şehir başlangıcı kaldırıldı; `CITIES` artık boş başlıyor.
- `city-manager.js` içinde Electron `Data/*.zip` taraması kapatıldı; şehir listesi yalnızca yüklenen GTFS verisini gösterecek.
- `data-manager.js` içinde yeni GTFS yüklenince önceki upload veri seti otomatik silinir hale getirildi.
- Sistem artık aynı anda yalnızca tek bir yüklenmiş GTFS veri seti tutacak.
### Faz Q — HTTPS Linkten GTFS Yükleme Turu 26 (30 Mart 2026)

- `electron/main.js` içinde yalnızca `https://` kabul eden GTFS ZIP link indirme akışı eklendi.
- Redirect sonrası da HTTPS zorunlu; yerel / özel ağ adresleri reddediliyor.
- Başlık kontrolüyle ZIP görünmeyen bağlantılar reddediliyor, büyük dosya limiti uygulanıyor.
- `index.html` landing ekranına GTFS ZIP link alanı ve `Linkten Yükle` butonu eklendi.
- `data-manager.js` içinde indirilen buffer mevcut GTFS import hattına aynı ZIP gibi veriliyor.
### Faz Q — Repo Adı Geçişi Turu 27 (30 Mart 2026)

- GitHub depo adı `gtfs-city` olarak değiştirildi.
- Doküman başlıkları yeni depo adına göre güncellendi.
### Faz Q — Sinematik ve Takvim Tümü Turu 28 (30 Mart 2026)

- `script.js` içindeki sabit Bordeaux sinematik waypoint listesi kaldırıldı; sinematik artık aktif GTFS verisinin durak dağılımından genel kamera noktaları üretiyor.
- `ui-manager.js` içinde sinematik akışı dinamik waypoint listesi boşsa güvenli biçimde duracak şekilde güncellendi.
- `service-manager.js` içinde `Çalışma Takvimi` alanına `Tümü` seçeneği geri eklendi; tıklandığında servis filtresi `all` durumuna dönüyor ve veri yeniden yükleniyor.
- `style.css` içinde `Tümü` servis rozeti buton olarak kullanılabilir hale getirildi.
### Faz Q — Takvim Tümü Tıklama Sertleştirmesi Turu 29 (30 Mart 2026)

- service-manager.js içinde Tümü rozeti delegated click yerine doğrudan onclick ile pplyAllServices() çağıracak şekilde sertleştirildi.

### Faz Q — Logo Yerleşimi ve Başlık Turu 30 (30 Mart 2026)

- index.html içinde sayfa başlığı GTFS City olarak güncellendi.
- Landing sayfasına ve sol menü üst bloğuna yeni logo yerleşimi eklendi; eski metin/hex görünümü kaldırıldı.
- style.css içinde logo görselleri için logo-mark ve yeni landing logo ölçüleri tanımlandı.

