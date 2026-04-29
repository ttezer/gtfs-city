# GTFS City - Resmi Çalışma Standardı

Bu dosya, repo içinde bir iş alınınca hangi sırayla ilerlenmesi gerektiğini tanımlar.
Amaç, tekrar eden unutmaları, kapsam kaymasını ve "hangi belge güncellenecek" belirsizliğini azaltmaktır.

## Temel İlke

- Tek iş, tek amaç, net sınır.
- Her konu için tek ana belge.
- Kök dizin ürünün kaynak noktasıdır.
- Desktop ve web birlikte düşünülür.
- Küçük, hedefli ve doğrulanabilir değişiklik tercih edilir.

## İş Türünü Önce Belirle

Bir işe başlamadan önce türü netleştir:

- `bug`
- `feature`
- `refactor`
- `repo/ci/build`
- `docs`
- `data-doğruluğu`

Tür net değilse önce problem tek cümlede yazılır, sonra işe başlanır.

## Zorunlu Başlangıç Sırası

Her iş için minimum sıralama:

1. Problemi veya hedefi tek cümlede tanımla.
2. Kapsamı yaz: ne dahil, ne dahil değil.
3. Etki alanını belirle: `desktop`, `web`, `both`.
4. İlgili belgeleri oku.
5. Etkilenen dosyaları sınırla.
6. Küçük ve hedefli değişikliği yap.
7. Gerekli doğrulamaları çalıştır.
8. Yalnızca gereken belgeleri güncelle.
9. Commit/PR özetini net yaz.

## Hangi İşte Hangi Belgeler Okunur

Her işte:

- `README.md`
- `kontrol.md`

Teknik değişiklikte:

- `mimari.md`

Repo, build, sync veya deploy işinde:

- `repo-akışı.md`

Bug işinde:

- `hata-listesi.md`

Feature veya orta vadeli gelişim işinde:

- `yol-haritası.md`

Katkı ve PR beklentisi gerekiyorsa:

- `CONTRIBUTING.md`

## Hangi Bilgi Nereye Yazılır

- ürün tanımı, kurulum, kullanıcı yönlendirmesi: `README.md`
- teknik sınırlar ve modül sorumlulukları: `mimari.md`
- repo yapısı, sync, build, release, pages akışı: `repo-akışı.md`
- iş yapma prosedürü ve kontrol sırası: `kontrol.md`
- açık bug ve veri sorunları: `hata-listesi.md`
- feature, teknik borç ve orta/uzun vade: `yol-haritası.md`
- yayınlanmış önemli sonuç: `CHANGELOG.md`
- kalıcı mimari karar: `adr/*`

Geçici tür notu için yeni `.md` dosyası açılmaz.

## Belge Güncelleme Kuralı

Her işte her belge güncellenmez.
Yalnızca değişiklikten etkilenen belge işlenir.

- Bug fix:
  - gerekirse `hata-listesi.md`
  - kullanıcıya görünen sonuç varsa `CHANGELOG.md`
- Feature:
  - gerekirse `yol-haritası.md`
  - kullanıcı akışı değiştiyse `README.md`
  - mimari karar varsa `adr/*`
- Refactor:
  - teknik sınır değiştiyse `mimari.md`
  - repo/build akışı değiştiyse `repo-akışı.md`
- Repo/CI/deploy:
  - `repo-akışı.md`
  - gerekirse `CONTRIBUTING.md`
- Sadece metin/yönlendirme düzeltmesi:
  - ilgili tek belge

## Uygulama Sırasında Dikkat Edilecekler

- Değişiklik tek konuya odaklı kalmalı.
- Kullanıcıya görünen davranış ile teknik borç aynı işte kontrolsüz karıştırılmamalı.
- Desktop'ta çalışan ama web'i kıran çözüm kabul edilmez.
- Web için eklenen çözüm desktop akışına zarar vermemelidir.
- Büyük refactor, doğrulama zemini olmadan yapılmamalıdır.
- Encoding riski olan metin dosyalarında dikkatli ilerlenmelidir.
- `docs/app/` elle ayrıştırılmamalı; kök kaynaklar esas alınmalıdır.

## Büyük Refactor İşlerinde Ajan Kullanımı

Bu bölüm, büyük kapsamlı teknik işlerde birden fazla ajan kullanılacaksa hangi rolle ilerlenmesi gerektiğini tanımlar.

Varsayılan rol dağılımı:

- `Haritalayıcı`: etki alanını, dosya yüzeyini, bağımlılıkları ve sınırı çıkarır
- `Uygulayıcı`: netleşen kapsama göre kod değişikliğini yapar
- `Doğrulayıcı`: yazılan değişikliği bağımsız gözle kontrol eder, test ve regresyon taraması yapar

Temel kural:

- Aynı dosyada iki ajan aynı anda yazma sorumluluğu almaz.
- Önce sınır çıkarılır, sonra uygulama yapılır, en son bağımsız doğrulama gelir.
- `kod yazsın / kontrol etsin / test yapsın` modeli tek başına yeterli değildir; önce doğru sınır çıkarılmış olmalıdır.

Ne zaman 3 ajan kullanılır:

- `state`, `bridge`, `script.js` parçalama gibi büyük refactor işlerinde
- birden fazla modülün bağımlılık yönü değişecekse
- yan etki riski yüksek ama iş yine de parçalanabilirse

Ne zaman gerekmez:

- tek dosyalık bug fix
- sadece metin veya belge düzeltmesi
- tek sorumluluklu ve etkisi sınırlı küçük refactor

Uygulama sırası:

1. `Haritalayıcı` dosya ve bağımlılık haritasını çıkarır.
2. Ana koordinasyon kapsam dışını netleştirir.
3. `Uygulayıcı` yalnızca verilen sınır içinde değişiklik yapar.
4. `Doğrulayıcı` diff, davranış ve test açısından bağımsız kontrol yapar.
5. Gerekirse ana koordinasyon son düzeltmeyi yapar.

Bu modelde amaç, aynı işi üçe bölmek değil; aynı işi üç farklı bakışla kontrollü ilerletmektir.

### Ajan Görev Şablonu

Büyük refactor işlerinde ajanlara görev verilirken şu kalıp korunur:

- `Rol`: `Haritalayıcı`, `Uygulayıcı`, `Doğrulayıcı`
- `Scope`: hangi alanın inceleneceği veya değiştirileceği
- `Dosyalar`: ajan hangi dosyalarda çalışacağını net bilir
- `Çıktı`: beklenen cevap formatı önceden tanımlanır
- `Sınır`: kod yazıp yazmayacağı, hangi dosyalara dokunmayacağı belirtilir

Örnek görev iskeleti:

1. `Rolün Haritalayıcı. Şu dosyaları incele. Şu alanlar için yazım/okuma noktalarını çıkar. Kod yazma.`
2. `Rolün Uygulayıcı. Yalnızca şu dosyalarda, şu write set içinde değişiklik yap. Başka dosyaya dokunma.`
3. `Rolün Doğrulayıcı. Sadece diff ve davranış riski açısından kontrol et. Yeni uygulama yapma.`

## Kod Değişikliği Sırasında Standart

1. Etkilenen ana dosyaları bul.
2. Sorunun kaynağını doğrula.
3. En küçük doğru yamayı uygula.
4. Gerekirse ilgili destek dosyasını güncelle.
5. Gereksiz yan temizlik yapma.
6. Kapsam dışı fark gördüysen not et, aynı işe gizleme.

## Doğrulama Standardı

Minimum:

```bash
npm run prebuild
npm run build:win -- --dir
```

## Seçim Kuralı

- metin, i18n, asset veya HTML/CSS/JS değişikliklerinde `npm run check:text`
- genel kod değişikliklerinde `npm test`
- `docs/app`, release, pages veya build akışı değişikliklerinde `npm run prebuild`
- desktop paketleme etkileniyorsa uygun `build:*` komutu

## PR Öncesi Çıkış Kriteri

Şu soruların cevabı net olmadan iş tamam sayılmaz:

- Kapsam tek konu mu?
- İlgili belge güncellemesi kontrol edildi mi?
- Gerekli doğrulama komutları çalıştı mı?
- Desktop/web etkisi düşünüldü mü?
- Commit ve PR özeti neden-sonuç ilişkisini anlatıyor mu?

## Kaçınılacaklar

- yeni `.md` dosyası açarak geçici not biriktirmek
- tek PR içinde bug + refactor + docs + UI temizliğini karıştırmak
- issue veya açık gerekçe olmadan büyük kapsamlı refactor yapmak
- kök kaynak yerine `docs/app/`'i doğrudan ana kaynak gibi düzenlemek
- sadece "düzeldi" diyerek doğrulama yapmadan işi kapatmak

## Tek Cümlelik Kontrol

Bir işe başlarken şu cümle kurulabiliyorsa doğru yoldayız:

`Şu problemi, şu kapsamda, şu dosyalarda çözeceğim; şu kontrolleri çalıştırıp yalnızca şu belgeleri güncelleyeceğim.`
