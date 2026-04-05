# GTFS City - Katkı Rehberi

Bu repo kamuya açık ve katkıya açıktır. Amaç, çalışan masaüstü ve web akışlarını bozmadan kontrollü iyileştirme yapmaktır.

## Temel İlke

- Önce problemi netleştir.
- Sonra etkilenen akışı sınırla.
- En küçük doğru değişikliği yap.
- Değişiklikten sonra metin ve test kontrolü çalıştır.

## Katkı Türleri

- hata düzeltmesi
- veri doğruluğu düzeltmesi
- performans iyileştirmesi
- UI/UX iyileştirmesi
- yeni özellik
- dokümantasyon

## Çalışma Kuralları

- Tek aktif GTFS veri seti modeli korunur.
- Upload-first başlangıç akışı bozulmaz.
- Desktop ve Web akışları birbirine karıştırılmaz.
- Türkçe içeren metin dosyalarında güvenli yama akışı kullanılır.
- Büyük refactor yerine hedefli refactor tercih edilir.
- Yeni özellikler önce `docs/repo/yol-haritasi.md` veya `docs/repo/hata-listesi.md` içinde görünür olmalı.

## Hafif Repo Yönetimi

Bu repo için hedef, az ama net kuralla profesyonel izlenebilirlik sağlamaktır.

### Repo Dili

- Varsayılan repo dili Türkçedir.
- Issue başlıkları Türkçe yazılır.
- Issue açıklamaları Türkçe yazılır.
- PR başlıkları Türkçe yazılır.
- PR açıklamaları Türkçe yazılır.
- Commit mesajları Türkçe yazılır.
- Gerekirse ayrıca İngilizce özet veya İngilizce sürüm eklenebilir.

### Label Seti

Aşağıdaki etiketler yeterlidir. İlk etapta bunların dışına çıkmaya gerek yok.

#### Tip etiketleri

- `bug` - kırık davranış, regresyon, hata
- `enhancement` - yeni özellik veya mevcut davranışı geliştirme
- `docs` - README, roadmap, changelog, rehber, issue template
- `i18n` - dil seçeneği, çeviri, metin standardizasyonu
- `tech-debt` - refactor, ownership, adapter, temizlik
- `data` - GTFS veri doğruluğu, parse, takvim, veri tutarlılığı
- `ux` - akışları veya okunabilirliği iyileştiren arayüz işi
- `performance` - performans, render, memory, büyük veri seti iyileştirmesi

#### Öncelik etiketleri

- `P0` - release blocker, veri kaybı, uygulamanın kullanılamaz hale gelmesi
- `P1` - yakın dönemde alınması gereken ciddi sorun veya yüksek değerli iş
- `P2` - normal planlı iş
- `P3` - düşük öncelikli, polish veya sonraya bırakılabilir iş

#### Platform etiketleri

- `desktop`
- `web`
- `both`

#### Durum etiketleri

- `needs-triage` - ilk bakış bekliyor
- `ready` - kapsam net, alınabilir
- `blocked` - bağımlılık veya karar bekliyor

Bir issue için hedef maksimum 3-5 etiket kullanmaktır.

Önerilen minimum kombinasyon:

- 1 tip etiketi
- 1 öncelik etiketi
- 1 platform etiketi

## Issue Kuralları

### Ne zaman issue açılır

- kullanıcıya görünen bug varsa
- roadmap'e alınacak yeni özellik varsa
- teknik borç bir PR içinde sessizce büyümeye başladıysa
- birden fazla commit veya tartışma gerekecekse

### Issue açmadan önce

1. `README.md`, `docs/repo/hata-listesi.md`, `docs/repo/yol-haritasi.md` ve `CHANGELOG.md` kontrol edilir.
2. Benzer açık issue var mı bakılır.
3. İş tek satırlık bir typo mu, yoksa izlenmesi gereken bir iş mi karar verilir.

### İyi issue özeti nasıl olur

- problem tek cümlede net olmalı
- etkilenen akış yazılmalı
- platform yazılmalı
- varsa veri seti veya şehir bağlamı eklenmeli
- beklenen davranış ile mevcut davranış ayrılmalı

### Issue sınırları

- Tek issue tek problem veya tek hedef olmalı.
- "Bug fix + refactor + docs + UI cleanup" tek issue olmamalı.
- Teknik borç issue'su kullanıcı bug'ı ile karıştırılmamalı; bağlı issue olarak ayrılabilir.

## Geliştirme Akışı

1. İlgili sorunu veya öneriyi önce issue olarak aç veya mevcut issue ile ilişkilendir.
2. Etkilenen dosyaları ve akışı kısa notla netleştir.
3. Gerekirse `docs/repo/isplani.md`, `docs/repo/yol-haritasi.md`, `docs/repo/hata-listesi.md`, `docs/repo/repo-akisi.md` veya `docs/repo/kontrol.md` güncelle.
4. Küçük ve odaklı değişiklik yap.
5. Aşağıdaki doğrulamaları çalıştır.
6. PR açarken ilgili issue'yu bağla.

## PR Kuralları

### Kapsam

- Bir PR tek konuya odaklı olmalı.
- Ayrık değişiklikler ayrı PR olmalı.
- Kullanıcıya görünen değişiklikle alakasız refactor aynı PR'a gizlenmemeli.

### PR başlığı

Aşağıdaki sade form yeterlidir:

- `bug: fix stop panel empty state`
- `docs: clarify README navigation`
- `i18n: add initial English landing copy`
- `tech-debt: split service calendar helpers`

### PR açıklaması minimumu

- ne değişti
- neden değişti
- hangi issue ile bağlı
- hangi test/doğrulama çalıştı
- kullanıcıya görünen etkisi var mı

### PR çıkış kriteri

Merge öncesi şu soruların cevabı net olmalı:

- issue bağlandı mı
- kapsam tek konu mu
- README / roadmap / changelog güncellemesi gerekiyor mu kontrol edildi mi
- `npm run check:text` çalıştı mı
- `node --test --test-concurrency=1 --test-isolation=none` veya `npm test` çalıştı mı
- görsel değişiklik varsa ekran görüntüsü var mı

## Zorunlu Doğrulama

En az:

```bash
npm run check:text
node --test --test-concurrency=1 --test-isolation=none
```

Pratikte şu da kabul edilir:

```bash
npm test
```

Dağıtım veya paketleme etkileniyorsa:

```bash
npm run build:win -- --dir
```

## Belge Kullanımı

- `README.md` - ürün özeti ve kullanım
- `docs/repo/mimari.md` - teknik yapı ve modül dağılımı
- `docs/repo/kontrol.md` - resmi çalışma standardı
- `docs/repo/isplani.md` - kısa güncel durum
- `docs/repo/yol-haritasi.md` - özellik ve geliştirme başlıkları
- `docs/repo/hata-listesi.md` - açık hata ve veri doğruluk sorunları
- `docs/repo/repo-akisi.md` - repo düzeni, build ve yayın akışı
- `CHANGELOG.md` - kullanıcıya görünen kayda değer değişiklikler

## Hangi Dosya Ne Zaman Güncellenir

- `README.md`: kullanıcı ne yapacağını veya nereye bakacağını artık farklı öğreniyorsa
- `CHANGELOG.md`: kullanıcıya görünen kayda değer değişiklik varsa
- `docs/repo/isplani.md`: alınmış karar, tamamlanan tur veya kısa durum notu varsa
- `docs/repo/yol-haritasi.md`: orta/uzun vadeli iş veya süreç standardı tanımlanıyorsa
- `docs/repo/hata-listesi.md`: açık kalan bug veya veri doğruluğu sorunu varsa
- `docs/repo/repo-akisi.md`: repo düzeni, sync, build, release veya Pages akışı değiştiyse
- `docs/repo/kontrol.md`: iş yapma standardı veya kontrol sırası değiştiyse

## Özellikle Kaçınılacaklar

- public repo içinde büyük veri dump dosyaları
- preload mantığını geri getiren değişiklikler
- tek seferde büyük, açıklamasız refactor
- Desktop çalışan akışı bozan web denemeleri
- issue'suz büyük kapsamlı değişiklikler
