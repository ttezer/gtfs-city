# 3D GTFS Is Plani

Bu belge, son kod inceleme ve proje gozlemleri sonrasinda onceliklendirilmis gelistirme islerini toplar.

## Amac

Projenin ilk odagi:

- hata riskini azaltmak
- GTFS yukleme akislarini daha guvenilir hale getirmek
- simulasyon hesaplarini daha dogru ve test edilebilir yapmak
- bakimi kolaylastiran bir yapiya gecmek

## Oncelik Sirasi

1. Headway ve bunching hesaplarini dogrulamak
2. GTFS yukleme ve dogrulama akislarini guclendirmek
3. Kritik simulasyon fonksiyonlari icin test eklemek
4. `script.js` icindeki buyuk akis fonksiyonlarini parcali hale getirmek
5. 3D model ve hata/fallback bildirimlerini netlestirmek

## Is Paketleri

### 1. Headway ve Bunching Dogrulama

Hedef:

- headway cizgilerinin daha tutarli sonuc vermesi
- sabit esiklerin merkezi hale getirilmesi
- sinir durumlarinin daha acik yonetilmesi

Yapilacaklar:

- `dist < 10`, `dist > 15000`, `dist < 3000` gibi esikleri ayri sabitler altina tasimak
- bu sabitleri tek bir ayar bolumunde toplamak
- `calcHeadwayPairs`, `calcHeadway`, `computeAverageHeadwaySeconds` akisini yeniden gozden gecirmek
- bos veri, tek arac, ust uste sefer ve uc degerli araliklar icin test senaryolari yazmak

Beklenen cikti:

- daha kararlı headway gostergeleri
- yanlis alarm ve yanlis mesafe yorumlarinin azalmasi

### 2. GTFS Yukleme ve Dogrulama Guclendirme

Hedef:

- bozuk veya eksik GTFS dosyalarinda daha acik hata davranisi
- kullaniciya daha anlasilir geri bildirim

Yapilacaklar:

- zorunlu GTFS kolonlari icin baslik dogrulama eklemek
- `routes.txt`, `trips.txt`, `stop_times.txt`, `stops.txt` icin minimum sema kontrolu yapmak
- parse basarisizliginda hata siniflari veya kodlari tanimlamak
- hata detaylarini sadece `console.error` yerine kayit altina alinabilecek bir yapiya tasimak
- Electron modunda ayrica dosyaya loglama secenegini degerlendirmek

Beklenen cikti:

- yukleme hatalarinda daha net mesajlar
- saha kullaniminda daha kolay hata ayiklama

### 3. Kritik Fonksiyonlar Icin Test Katmani

Hedef:

- hesaplama tarafindaki kirilganligi azaltmak
- degisiklik yaptikca sistemin dogrulugunu korumak

Yapilacaklar:

- asagidaki fonksiyonlar icin birim test eklemek:
- `getVehiclePos`
- `getTripProgressAtTime`
- `computeAverageHeadwaySeconds`
- `calcHeadwayPairs`
- GTFS yukleme icin en az bir kucuk ornek veri seti ile dogrulama testi eklemek

Beklenen cikti:

- refactor sonrasi guven kaybi yasamamak
- hatali simulasyon degisikliklerini erken yakalamak

### 4. Kod Organizasyonunu Iyilestirme

Hedef:

- buyuk ve tek parca fonksiyonlari daha yonetilebilir hale getirmek
- tekrar eden sabit ve esleme yapilarini merkezilestirmek

Yapilacaklar:

- `loadGtfsIntoSim` fonksiyonunu alt adimlara bolmek
- renk, tur, esik ve model esleme sabitlerini tek yerde toplamak
- harita katmanlari, GTFS parse islemleri ve simulasyon hesaplarini ayri mantiksal bolumlere ayirmak

Beklenen cikti:

- daha okunur kod
- daha kolay bakim
- daha guvenli degisiklik yapabilme

### 5. 3D Model ve Kullanici Bildirimi Iyilestirmesi

Hedef:

- 3D arac katmaninda daha net fallback davranisi
- eksik model veya desteklenmeyen ortam durumunda kullaniciyi bilgilendirmek

Yapilacaklar:

- model dosyasi bulunamazsa acik durum bildirimi eklemek
- `ScenegraphLayer` kullanimi basarisiz olursa sessiz dusmek yerine acik bir mesaj vermek
- hangi turlerin gercek model, hangilerinin fallback kullandigini dokumante etmek

Beklenen cikti:

- 3D modda daha anlasilir davranis
- kullanicinin "neden calismiyor" sorusuna daha hizli cevap

## Kisa Uygulama Takvimi

### Faz 1

- headway ve bunching sabitlerini toplamak
- kritik testleri eklemek

### Faz 2

- GTFS dogrulama akislarini genisletmek
- hata yonetimini netlestirmek

### Faz 3

- `script.js` refactor
- 3D model bildirimleri ve fallback temizligi

## Basari Kriterleri

- GTFS yukleme hatalari daha acik raporlanmali
- headway hesaplari tekrar eden hatali degerler uretmemeli
- en az temel simulasyon fonksiyonlari test ile korunmali
- `script.js` icindeki buyuk akislar daha okunur hale gelmeli
