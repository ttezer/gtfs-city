# Değişiklik Günlüğü

Bu dosya, büyük ürün dönüm noktalarını kısa biçimde özetler.

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
- Açık işler `yol-haritasi.md` ve `hata-listesi.md` içinde izlenir.
