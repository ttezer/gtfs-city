# İstanbul Transit 3D - Proje Durumu ve Gelecek İş Planı

Bu doküman, projede şu ana kadar yapılan iyileştirmeleri, alınan kritik mimari kararları (ADR) ve bir sonraki aşamalarda (Fazlar) yapılması planlanan işleri özetlemektedir.

## 1. Tamamlanan İşler (Tüm Yapılanlar Listesi)

### 🚀 Performans ve Veri Yükleme Optimizasyonları
- **Asenkron Veri Yükleme:** `trips_data.js` (5.5MB), `lookup_data.js` (3MB) ve `shapes_data.js` (500KB) gibi gigabaytlarca veriyi parse eden dosyalar senkron bloklama yapıyordu. Bu dosyalar dinamik/asenkron (lazy-load) mimarisine geçirildi.
- **Yükleme Ekranı (Loading Overlay):** Kullanıcıyı boş ekranda bekletmemek adına sayfa yüklenir yüklenmez devreye giren ve dosya bazında (trips %5, shapes %40 vb.) ilerlemeyi gösteren bir Progress bar sistemi eklendi.
- **O(N^2) Darboğazlarının Giderilmesi:** `updateLandingPageReports` fonksiyonundaki array aramaları `Set` veri yapısına taşınarak `O(N)` karmaşıklığına indirildi.

### 🛠 UI / Etkileşim ve Hata Düzeltmeleri
- **Tıklanamaz Buton Sorunları:** `loading-overlay` katmanının görünmez haldeyken bile (z-index: 10000) `landing-page` (z-index: 1000) üzerindeki tıklamaları engellemesi sorunu (pointer-events/z-index hiyerarşisi) çözüldü.
- **Durak Yoğunluğu 3D (DensityGrid):** Yalnızca ilk açılışta hesaplanan durak yoğunluğu, her GTFS yüklendiğinde ya da şehir değiştirildiğinde dinamik olarak (`updateDensityGrid()`) baştan hesaplanacak şekilde revize edildi.
- **Şehir ve Katman Temizliği:** Aktif bir şehrin tiki kaldırıldığında, eski verilerin haritada kalması engellendi. Gözüken hiçbir şehir yoksa `TRIPS`, `SHAPES` ve `STOPS` tamamen temizleniyor.
- **Geçersiz Toggle'lar:** Türkiye verisinde çalışmayan "3D Binalar" filtresi arayüzden ve kod mantığından temizlendi.
- **GTFS Runtime Hataları:** Senkron olarak kurgulanan `buildGtfsRuntimeData` fonksiyonunun `async` versiyonu ile (`buildGtfsRuntimeDataAsync`) entegrasyonu sağlandı.

### 🧹 Temizlik ve Arşivleme (Dosya Yönetimi)
- **Gereksiz Dosyaların Taşınması:** Proje ana dizininde bulunan ve sunumda veya core web arayüzünde aktif rol oynamayan eski plan dokümanları (`istanbul_transit_3d_plan.docx`, `istanbul_transit_3d_plan_v2.docx`), artık kullanılmayan static veri dosyası (`data.js`), pre-process scripti (`gtfs_to_js.py`) ve yedek test ZIP dosyaları (`gtfs.zip`, `files.zip`), çalışma alanını sadeleştirmek adına `Ydek` (Yedek) adlı arşiv klasörüne taşındı.

---

## 2. Mimari Karar Kayıtları (ADR - Architecture Decision Records)

### ADR-001: Dev Statik Verilerin Asenkron Yüklenmesi
- **Bağlam:** Uygulama içerisinde gömülü gelen GTFS JS parçaları (trips_data vs.) 10 MB'ı buluyordu ve `<script>` etiketleriyle ana iş parçacığını (main thread) kitliyordu.
- **Karar:** Statik veri scriptleri HTML `head` veya `body` içerisinde senkron çağrılmak yerine, `_loadAllData()` adında bir Promise/Callback zinciri ile arkaplanda DOM yüklendikten (load event) sonra çağrıldı.
- **Sonuç:** İlk boyama (First Paint) anında gerçekleşiyor, kullanıcı tarayıcı donması yaşamıyor ve yükleme yüzdesi şeffafça izlenebiliyor.

### ADR-002: Çoklu Şehir / GTFS Katman Yönetimi
- **Bağlam:** Farklı şehirlerin zip dosyaları yüklendiğinde veya varolan bir şehrin profili kapatıldığında eski değişkenler RAM'de kalabiliyordu.
- **Karar:** `activeCity` state kontrolü katılaştırıldı. Bir şehir inaktif olduğunda `window.TRIPS`, `window.STOP_INFO` gibi global state'ler sıfırlanıp, `buildLayers()` ve Deck.GL instance'ına anında update (`setProps`) gönderildi.
- **Sonuç:** Memory leak engellendi, ekranda "hayalet" duraklar veya rotalar çıkması sorunu çözüldü.

---

## 3. Gelecek Fazlar ve Devam İş Planı

### BÖLÜM 1: Veri Doğrulama (Validation) İyileştirmeleri
- **[ ] Gelişmiş GTFS Validatörü:** Zip yükleme anında sadece ana dosyaların varlığına bakmak yerine, zaman aşımı mantık hatalarını (örneğin varış zamanının kalkıştan önce olması) veya şekil detayına uymayan noktaları tespit eden detaylı bir doğrulayıcı modül (`gtfs-validator.js`).
- **[ ] Uyarı Dashboard'u:** GTFS hatalarını sadece modal içinde değil, ana simülasyon ekranında küçük bir bilgi panelinde "X hatası atlandı" şeklinde gösterebilme.

### BÖLÜM 2: UI / UX Modernizasyonları
- **[ ] Admin / Veri Yönetim Paneli Overhaul'u:** Tıklanan duraklar veya otobüsler için sağdan açılan sliding drawer tipli daha temiz, karmaşadan uzak detay sayfaları.
- **[ ] Dinamik Renklendirme:** Otobüs ikonlarının, o anki gecikme oranına (delay) veya doluluk oranına göre (renk interpolasyonu ile) dinamik değişimi. (Yeşil: Zamanında, Kırmızı: Gecikmeli).
- **[ ] Gelişmiş Kamera Açıları:** Seçilen hatta veya araca akıllı kilitlenme ve pürüzsüz takip modu animasyonları (bezier interpolation ile daha akıcı kamera geçişleri).

### BÖLÜM 3: Performans ve Veri Yönetimi
- **[ ] Web Worker Kullanımı:** `gtfs-utils.js` içindeki ağır array dönüşümleri (`buildGtfsRuntimeDataAsync`) şu anda `setTimeout` ile event loop'u rahatlatarak çalışıyor. Gelecek planda bu işlemler `Web Worker` içine taşınarak Main Thread sıfır yük ile çalıştırılacak.
- **[ ] Veritabanı (IndexedDB) Entegrasyonu:** Özellikle gömülü gelen büyük veri setleri için tarayıcının IndexedDB hafızası kullanılarak `trips_data.js`'nin sadece güncelleme geldiğinde fetch edilmesi sağlanacak. Böylece sayfa ikinci açılışta 10x daha hızlı yüklenecek.

---
_Not: Bu belge bir taslak yol haritası niteliğindedir. İş önceliklerine göre sıralamalar değişebilir._

---

## 4. Kod İnceleme Raporu — Claude Analizi (Mart 2026)

Bu bölüm, Claude tarafından yapılan kapsamlı kod incelemesinin bulgularını ve yapılan/planlanan düzeltmeleri özetlemektedir.

### 🔴 Kritik Hatalar (Uygulamanın Çalışmasını Engeller)

#### KH-001: `captureRuntimeDataSnapshot` tanımsız — **DÜZELTME UYGULANDIKTAN SONRA KAPATILACAK**
- **Sorun:** `script.js`'de 4 farklı yerde çağrılıyor ancak hiçbir yerde tanımlanmamış. Sayfa ilk açıldığında `ReferenceError` ile çöküyor.
- **Etkilenen satırlar:** `baseRuntimeData = captureRuntimeDataSnapshot()` ve `applyGtfsRuntimeData(captureRuntimeDataSnapshot(baseRuntimeData))`
- **Düzeltme:** `script.js`'e aşağıdaki fonksiyon eklenmeli:

```javascript
function captureRuntimeDataSnapshot(existing) {
  return existing || {
    nTRIPS: window.TRIPS || [],
    nSHAPES: window.SHAPES || [],
    nSTOPS: window.STOPS || [],
    nSTOP_INFO: window.STOP_INFO || {},
    nSTOP_DEPS: window.STOP_DEPS || {},
    nHOURLY_COUNTS: window.HOURLY_COUNTS || new Array(24).fill(0),
    nHOURLY_HEAT: window.HOURLY_HEAT || {}
  };
}
```

#### KH-002: `getBuiltinGtfsPayload` tanımsız — **DÜZELTME UYGULANDIKTAN SONRA KAPATILACAK**
- **Sorun:** `loadCity()` ve `initializeBuiltinCity()` bu fonksiyonu çağırıyor. İstanbul dahil tüm builtin şehirler yüklenemiyor.
- **Düzeltme:** `script.js`'e eklenmesi gereken implementasyon:

```javascript
async function getBuiltinGtfsPayload(city) {
  if (!city || !city.gtfsZip) return null;
  try {
    if (window.IS_ELECTRON && window.electronAPI?.readDataFile) {
      const buffer = await window.electronAPI.readDataFile(city.gtfsZip);
      if (buffer) return { files: await parseZipBuffer(buffer), fileName: city.gtfsZip };
    }
    const response = await fetch(city.gtfsZip);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return { files: await parseZipBuffer(buffer), fileName: city.gtfsZip };
  } catch (err) {
    console.warn('[getBuiltinGtfsPayload] yüklenemedi:', err);
    return null;
  }
}

async function parseZipBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = {};
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith('.txt')) {
      files[name.split('/').pop()] = await zip.files[name].async('string');
    }
  }
  return files;
}
```

#### KH-003: `ADJ` komşuluk listesi hiç doldurulmuyor — rota planlama her zaman boş
- **Sorun:** Dijkstra algoritması `ADJ[sid]` kullanıyor ama bu nesne hiçbir yerde oluşturulmuyor. Rota Planlama butonu her zaman "Rota bulunamadı" döndürüyor.
- **Düzeltme:** Aşağıdaki fonksiyonlar eklenip `applyGtfsRuntimeData()` sonunda `buildAdjacencyList()` çağrılmalı:

```javascript
function buildAdjacencyList() {
  window.ADJ = {};
  for (const [sid, deps] of Object.entries(STOP_DEPS)) {
    for (const [tripIdx, offset, routeShort] of deps) {
      const trip = TRIPS[tripIdx];
      if (!trip) continue;
      for (let i = 0; i < trip.ts.length - 1; i++) {
        const fromSid = findStopIdByPos(trip.p[i]);
        const toSid   = findStopIdByPos(trip.p[i + 1]);
        if (!fromSid || !toSid) continue;
        const travelSecs = Math.max(trip.ts[i + 1] - trip.ts[i], 60);
        if (!ADJ[fromSid]) ADJ[fromSid] = [];
        ADJ[fromSid].push([toSid, travelSecs, routeShort || trip.s]);
      }
    }
  }
}

function findStopIdByPos(pos) {
  if (!pos) return null;
  for (const [sid, info] of Object.entries(STOP_INFO)) {
    if (Math.abs(info[0] - pos[0]) < 0.0002 && Math.abs(info[1] - pos[1]) < 0.0002) return sid;
  }
  return null;
}
```

#### KH-004: `confirmGtfsImport` async sonucu senkron kontrol ediyor
- **Sorun:** `loadGtfsIntoSim` bir `Promise<boolean>` döndürüyor ama `if(!ok)` ile senkron kontrol ediliyor. Promise her zaman truthy olduğundan hata durumu asla yakalanmıyor.
- **Düzeltme:** `confirmGtfsImport` fonksiyonu `async` yapılarak tüm `loadGtfsIntoSim` çağrıları `await` ile sarmalandı.

#### KH-005: `window.showTrips` / `window.showShapes` yanlış değişken adları
- **Sorun:** `loadGtfsIntoSim` içinde `window.showTrips = true` ve `window.showShapes = true` yazılıyor ama bu isimde global değişkenler mevcut değil.
- **Düzeltme:** `showAnim = true` ve `showPaths = true` olarak düzeltildi.

---

### 🟡 Mimari Sorunlar

| # | Sorun | Durum |
|---|-------|-------|
| MS-001 | `repairMojibake`, `displayText` vb. 7 fonksiyon `script.js`'de iki kez tanımlı (ölü kod) | Düzeltilmeli |
| MS-002 | `build3DVehicleLayer` ve `updateVehiclePanel` kullanılmadan önce tanımlanıyor (hoisting sorunu) | Düzeltilmeli |
| MS-003 | `TYPE_META` hem `config.js`'de hem `script.js`'de tanımlı, senkronize değil | Düzeltilmeli |
| MS-004 | `trips_data.js` ve `lookup_data.js` `.gitignore`'a dahil oluyor, deploy'da çalışmıyor | Düzeltilmeli |
| MS-005 | `script.js` 1100+ satır tek dosya, modüler ayrım yarım bırakılmış | Uzun vade |

---

### 🔵 Performans Notları

| # | Sorun | Etki | Çözüm |
|---|-------|------|-------|
| PI-001 | `updateDensityGrid` her 3 animation frame'de tüm STOPS'u yeniden gruplayarak çalışıyor | Orta | Sadece veri değiştiğinde çalıştır |
| PI-002 | `detectRendezvous` her frame O(N×M) tarama yapıyor | Yüksek (14K+ sefer) | 10sn önbellek ekle |
| PI-003 | `VEHICLE_ICON_CACHE` GTFS değişiminde temizlenmiyor | Düşük | `applyGtfsRuntimeData` içinde sıfırla |
| PI-004 | `buildGtfsRuntimeDataAsync` hâlâ ana thread'de çalışıyor | Yüksek | Web Worker'a taşı (BÖLÜM 3'te planlandı) |

---

### 📋 Öncelik Sırası (Sonraki Sprint)

1. KH-001: `captureRuntimeDataSnapshot` ekle → uygulama açılır hale gelir
2. KH-002: `getBuiltinGtfsPayload` ekle → İstanbul verisi yüklenir
3. KH-003: `buildAdjacencyList` + `ADJ` → Rota Planlama çalışır
4. KH-004: `confirmGtfsImport` async düzeltmesi → GTFS upload hata yönetimi düzelir
5. KH-005: Değişken adı düzeltmeleri → GTFS yüklenince UI state doğru setlenir
6. MS-004: `.gitignore` düzeltmesi → GitHub Pages / deploy'da veri görünür

---
_Kod incelemesi tarihi: Mart 2026. Claude (Sonnet 4.6) tarafından otomatik analiz ile üretilmiştir._
