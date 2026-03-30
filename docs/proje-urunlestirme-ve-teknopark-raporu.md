# Proje Ürünleştirme ve Teknopark Uygunluk Raporu

## 1. Özet

Bu proje, GTFS verisini yalnızca harita üzerinde gösteren bir görselleştirme aracı olmaktan çıkarılıp, karar destek ve operasyon analizi üreten bir yazılım ürününe dönüştürülebilir.

Mevcut yapı şu alanlarda güçlü bir temel sunmaktadır:

- çoklu GTFS veri yükleme
- hat, durak ve sefer bazlı görselleştirme
- simülasyon zamanı ve araç hareketi
- headway, bunching ve bekleme süresi gibi analitik katmanlar
- masaüstü paketleme altyapısı

Bu çekirdek yapı, kurumsal ürün haline getirilirse belediyeler, ulaşım planlama ekipleri, danışmanlık firmaları, araştırma kurumları ve akıllı şehir uygulamaları için değerli bir çözüm haline gelebilir.

Genel değerlendirme:

- ürünleşme potansiyeli: yüksek
- kurumsal demo potansiyeli: yüksek
- Teknopark / Ar-Ge projesi olma ihtimali: yüksek
- doğrudan "hazır paket" satışı yerine "kuruma özel çözüm + lisans + danışmanlık" modeli daha gerçekçidir

## 2. Projenin Ürün Olarak Konumlandırılması

Bu proje aşağıdaki başlıklardan biri veya birkaçı ile konumlandırılabilir:

### 2.1. Toplu Taşıma Simülasyon ve Görselleştirme Platformu

Amaç:

- GTFS verisini zamansal ve mekansal olarak görünür hale getirmek
- araç hareketi, hat yoğunluğu ve durak davranışını tek ekranda izlemek

Hedef kullanıcı:

- belediyeler
- ulaşım daire başkanlıkları
- özel ulaşım işletmeleri
- planlama ve etüt firmaları

### 2.2. Operasyon Analitiği ve Karar Destek Yazılımı

Amaç:

- headway, bunching, durak yoğunluğu, transfer ve sapma analizi üretmek
- sorunlu hatları ve saatleri raporlamak

Hedef kullanıcı:

- saha operasyon ekipleri
- planlama ekipleri
- performans yönetimi ekipleri

### 2.3. Örüntü Tabanlı Güzergah Sapma Analizi

Kullanıcı ile konuşulan yeni fikir doğrultusunda, araçların başlangıçtan varışa kadar bıraktığı izlerin yön bazlı örüntüye dönüştürülmesi mümkündür.

Bu başlık ürünün en yenilikçi modüllerinden biri olabilir:

- her araç için kümülatif rota izi
- hat ve yön bazında referans örüntü
- referans dışına çıkan seferlerin işaretlenmesi
- "güzergah dışına çıktı" veya "anormal rota davranışı" raporu

Bu modül, projeyi sıradan görselleştirme aracından çıkarıp Ar-Ge niteliği daha güçlü bir analitik ürüne dönüştürür.

## 3. Ürünleşme İçin Gerekli Ana Bileşenler

### 3.1. Çekirdek Uygulama

Gerekli:

- mevcut harita ve simülasyon altyapısının korunması
- veri yükleme, görselleştirme ve analiz akışının stabil hale getirilmesi
- test kapsamının büyütülmesi
- hata ve log yönetiminin iyileştirilmesi

### 3.2. Veri Yönetimi

Gerekli:

- GTFS yükleme ve doğrulama ekranı
- veri seti versiyonlama
- şehir, kurum ve veri tarihi bazında arşivleme
- isteğe bağlı gerçek zamanlı veri desteği için GTFS-Realtime hazırlığı

### 3.3. Analitik Modüller

Gerekli modüller:

- hat bazlı performans analizi
- durak bazlı performans analizi
- headway ve bunching analizi
- bekleme süresi ve yoğunluk analizi
- örüntü tabanlı sapma analizi
- rapor üretimi

### 3.4. Raporlama ve Çıktı

Gerekli:

- PDF rapor
- Excel / CSV çıktı
- ekran görüntüsü alma
- olay listesi ve anomali raporu

### 3.5. Kullanıcı ve Yetki Yönetimi

Kurumsal sürüm için gerekli:

- kullanıcı girişi
- rol bazlı yetki
- veri erişim seviyesi
- kurum bazlı tenant yapısı

## 4. Kullanılacak Teknolojiler ve Uygulamalar

## 4.1. Mevcut Teknik Yığın

Projede şu yapı zaten var:

- `HTML`
- `CSS`
- `JavaScript`
- `MapLibre GL`
- `deck.gl`
- `JSZip`
- `Electron`
- `electron-builder`

## 4.2. Ürünleşme İçin Önerilen Ek Teknolojiler

### Arayüz ve istemci

- mevcut web arayüzü korunabilir
- orta vadede `React` veya `Vue` ile bileşen tabanlı arayüz düşünülebilir
- kurumsal raporlama ekranları için tablo ve filtre bileşenleri eklenebilir

### Sunucu tarafı

- `Node.js`
- `Express` veya `Fastify`
- veri işleme servisleri
- rapor üretim servisleri

### Veri tabanı

- `PostgreSQL`
- tercihen coğrafi sorgular için `PostGIS`

### Veri işleme ve analitik

- `Python`
- `Pandas`
- `GeoPandas`
- `Shapely`
- `scikit-learn`
- zaman serisi ve örüntü benzerlik analizleri için ek algoritmalar

### Harita ve mekânsal analiz

- `MapLibre`
- `deck.gl`
- `PostGIS`
- gerekirse `Turf.js`

### Paketleme ve dağıtım

- masaüstü sürüm için `Electron`
- web sürüm için Docker tabanlı dağıtım
- kurumsal kurulum için Windows servis / container desteği

### İzleme ve kalite

- `Vitest` veya mevcut `node:test` yapısının büyütülmesi
- `Playwright` veya `Cypress` ile temel uçtan uca test
- hata takibi için `Sentry` benzeri araçlar

## 5. Geliştirilmesi Gereken Ürün Modülleri

### Faz 1. Stabilizasyon

- mevcut simülasyon akışının sertleştirilmesi
- GTFS doğrulama iyileştirmeleri
- hata mesajları
- performans optimizasyonu
- test kapsamasının artırılması

### Faz 2. Kurumsal Analitik

- hat performans ekranı
- durak performans ekranı
- yoğunluk, headway, bunching raporları
- karşılaştırmalı veri seti analizi

### Faz 3. Sapma ve Anomali Modülü

- yön bazlı referans örüntü oluşturma
- gerçek sefer izi çıkarma
- benzerlik / sapma skoru
- sapma alarmı
- harita üstü raporlama

### Faz 4. Kurumsal Ürünleşme

- kullanıcı yönetimi
- veri seti yönetimi
- rapor merkezi
- kurum paneli
- lisans ve aktivasyon yapısı

## 6. Proje İçin Gerekli Roller

Küçük bir çekirdek ekip için öneri:

- 1 yazılım geliştirici
- 1 veri / algoritma geliştirici
- 1 harita / GIS bilgisi olan uzman
- 1 ürün geliştirme / müşteri tarafı analist

Daha güçlü kurumsal sürüm için:

- backend geliştirici
- frontend geliştirici
- veri bilimci / GIS mühendisi
- test mühendisi
- ürün yöneticisi

## 7. Gerekli Veri ve Operasyon Altyapısı

Gerekli veri kaynakları:

- GTFS statik veri
- gerekirse GTFS-Realtime
- kurum bazlı operasyon verisi
- durak, hat, yön, sefer ve zaman bilgileri
- harita altlığı ve coğrafi referans katmanları

Gerekli operasyonel çıktılar:

- sorunlu hat listesi
- gecikme / bunching eğilimleri
- yön bazlı örüntü haritaları
- durak yük ve bekleme raporları
- sefer sapma raporları

## 8. Gelir Modeli Önerisi

En gerçekçi model doğrudan repo satışı değil, çözüm satışı ve kuruma özel iş modelidir.

Olası gelir modelleri:

- PoC / demo kurulumu
- kurum bazlı lisanslama
- yıllık bakım ve destek
- veri entegrasyonu hizmeti
- özel analiz modülü geliştirme
- masaüstü uygulama teslimi

Örnek paket yaklaşımı:

- Demo paketi
- Kurumsal temel paket
- Kurumsal analitik paket
- Sapma analizi ve anomali paketi

## 9. Riskler

Başlıca riskler:

- veri lisansları
- kurum verisinin kalitesi
- GTFS ile gerçek operasyon arasında fark olması
- çok büyük veri setlerinde performans
- harita altlığı ve dağıtım lisansları
- yalnızca istemci tarafı mimaride ölçeklenme sınırı

## 10. Teknopark Projesi Olur mu?

Kısa cevap: büyük olasılıkla evet.

Gerekçe:

- yazılım tabanlıdır
- veri işleme ve analitik içerir
- karar destek niteliği taşır
- görselleştirme ile sınırlı kalmayıp operasyon analitiği üretir
- örüntü tabanlı güzergah sapma analizi gibi Ar-Ge niteliği taşıyan yeni modüller eklenebilir

Ancak Teknopark kabulü için yalnızca "uygulama geliştirdim" demek yetmez. Projenin şu dil ile yazılması gerekir:

- hangi teknik problemi çözüyor
- mevcut yöntemlerden farkı ne
- hangi Ar-Ge belirsizliği var
- hangi algoritmik veya analitik yenilik geliştirilecek
- ölçülebilir çıktı nedir

Bu proje Teknopark başvurusu için şu başlıklarla daha güçlü hale gelir:

- anomali ve sapma analizi
- örüntü öğrenme
- yön bazlı rota davranışı çıkarımı
- GTFS ile gerçek operasyon uyum skoru
- ulaşım planlama için karar destek motoru

### Teknopark açısından önerilen proje adı

Öneri:

`GTFS Tabanlı Toplu Taşıma Simülasyonu, Operasyon Analitiği ve Örüntü Tabanlı Güzergah Sapma Tespit Platformu`

Bu isim Ar-Ge boyutunu daha güçlü gösterir.

## 11. Teknopark Başvurusu İçin Gerekli Belgeler ve Hazırlıklar

Hazırlanması gereken başlıklar:

- problem tanımı
- yenilikçi yön
- teknik yöntem
- hedef kullanıcı
- pazar ve rakip analizi
- proje takvimi
- insan kaynağı planı
- bütçe planı
- beklenen çıktılar
- fikri mülkiyet stratejisi

Hazırlanması yararlı ek materyaller:

- ekran görüntüleri
- kısa demo videosu
- mimari diyagram
- örnek rapor ekranları
- kullanım senaryoları

## 12. Sonuç

Bu proje yalnızca harita üstü animasyon gösteren bir çalışma olmaktan çıkarılıp, kurumsal ölçekte kullanılabilecek bir toplu taşıma analitik platformuna dönüştürülebilir.

En güçlü potansiyel başlıklar:

- simülasyon
- görselleştirme
- performans analitiği
- anomali tespiti
- güzergah sapma analizi

Teknopark açısından değerlendirme:

- yazılım niteliği güçlü
- Ar-Ge genişlemesi mümkündür
- ulaşım teknolojileri ve karar destek alanına oturur
- doğru proje dili ile başvuruya uygundur

Bu nedenle proje, doğru teknik paketleme ve doğru başvuru dili ile hem ürünleşebilir hem de Teknopark / destek programı başvurularına uygun hale getirilebilir.

## 13. Resmî Çerçeve ve Kaynaklar

Bu değerlendirme hazırlanırken aşağıdaki resmî ve birincil kaynaklardan yararlanılmıştır:

- [4691 sayılı Teknoloji Geliştirme Bölgeleri Kanunu](https://www.sanayi.gov.tr/assets/pdf/mevzuat/4691SayiliKanun.pdf)
- [Sanayi ve Teknoloji Bakanlığı Teknoloji Geliştirme Bölgeleri istatistikleri](https://www.sanayi.gov.tr/assets/pdf/istatistik/TGBIstatistikiBilgiler2025.pdf)
- [TÜBİTAK 1501 Sanayi Ar-Ge Projeleri Destekleme Programı](https://tubitak.gov.tr/tr/destekler/sanayi/ulusal-destek-programlari/1501-tubitak-sanayi-ar-ge-projeleri-destekleme-programi)
- [TÜBİTAK 1507 KOBİ Ar-Ge Başlangıç Destek Programı](https://tubitak.gov.tr/tr/destekler/sanayi/ulusal-destek-programlari/1507-tubitak-kobi-ar-ge-baslangic-destek-programi)

Not:

Teknopark kabul kararı ve destek uygunluğu proje yazım dili, şirket yapısı, başvuru dönemi, bölge kriterleri ve hakem değerlendirmesine göre değişebilir. Buradaki "olur" değerlendirmesi bir çıkarımdır; resmî ön onay yerine geçmez.
