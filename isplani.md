# GTFS City ? G?ncel Durum

## Mevcut Kararl? Durum

Proje ?u anda Electron tabanl?, tek GTFS veri seti mant???yla ?al??an kararl? bir masa?st? uygulamad?r.

Kararl? kabul edilen temel davran??lar:

- upload-first ba?lang?? ak???
- tek aktif GTFS veri seti
- `HAR?TAYI A?` ile harita ekran?na ge?i?
- route, stop ve vehicle panel ak??lar?
- hat tipi filtresi, odakl? hat ve ilgili katman filtreleri
- headway, bekleme, yo?unluk ve kapsama katmanlar?
- HTTPS GTFS ZIP linkten y?kleme (yaln?zca Electron)
- logo, landing ve temel ?r?n kimli?i

## Kilit Kararlar

### ADR-022 ? Upload-first a??l?? ak???
Uygulama bo? landing ekranla ba?lar. Veri y?klenmeden harita ekran?na ge?ilmez.

### ADR-023 ? Ba?lang?? veri kayna??
Ba?lang?? veri kayna?? yerle?ik preload de?il, kullan?c? taraf?ndan y?klenen GTFS ZIP verisidir.

### ADR-024 ? Tek progress y?zeyi
GTFS y?kleme s?ras?nda tek bir progress y?zeyi kullan?l?r. ?ift confirm/progress ak??? a??lmaz.

### ADR-025 ? Worker tabanl? parse
A??r GTFS parse i?lemi m?mk?n olan yerde worker ?zerinden ?al??t?r?l?r; fallback yaln?zca zorunlu durumda devreye girer.

### ADR-026 ? Route/stop/vehicle panel davran???
Route panel, stop panel, odakl? hat g?r?n?m? ve buna ba?l? filtre davran??lar? mevcut haliyle temel kabul edilir.

## A??k Kalan Yak?n ??ler

- GitHub Pages i?in vitrin ve web demo olgunla?t?rma
- favicon ve app icon i?in daha sade bir final logo s?r?m?
- k???k UX ve veri do?ruluk d?zeltmeleri
- istenirse GTFS-RT ara?t?rma ve taslak faz?

## Not

Bu dosya uzun tarih?e de?il, g?ncel durum belgesidir. Yeni i?ler buraya k?sa ve g?ncel bi?imde eklenmelidir.

### Faz R ? GitHub Pages Vitrin Kurulumu (30 Mart 2026)

- `docs/index.html` ve `docs/styles.css` ile statik vitrin sayfas? olu?turuldu.
- Pages i?inde kullan?lmak ?zere `docs/logo-mark.png` ve `docs/favicon.ico` eklendi.
- Pages kayna?? olarak `main /docs` kullan?lacak ?ekilde yap? kuruldu.

### Faz R ? Kamusal Repo Kontrol? Turu 2 (30 Mart 2026)

- A??k repo taramas?nda tracked gizli veri, token veya ZIP veri paketi bulunmad?.
- Electron taraf?ndaki eski marka kal?nt?lar? GTFS City ad?na temizlendi.

### Faz R ? Pages ve README G?rsel Galeri Turu 3 (31 Mart 2026)

- Proje k?k?ndeki JPEG ?rnekleri `docs/screens/` alt?na al?narak GitHub Pages vitrinine ba?land?.
- `README.md` i?ine ayn? ?rneklerden olu?an ekran g?r?nt?s? b?l?m? eklendi.

### Faz R ? Pages Profesyonelle?tirme ve Preload Temizli?i Turu 4 (31 Mart 2026)

- Pages vitrini daha profesyonel bir d?zene ge?irildi.
- README i?indeki gereksiz Pages kurulum maddeleri sadele?tirildi.
- Art?k kullan?lmayan preload kal?nt?lar? kald?r?ld?: `trips_data.js`, `shapes_data.js`, `lookup_data.js`, `scripts/regenerate-bordeaux-preload.js`.
- `cizim.md` kald?r?ld? ve `build-release.yml` preload ba??ml?l??? olmadan yeniden yaz?ld?.

### Faz R ? K?k G?rsel Kaynaklar? Ignore Turu 5 (31 Mart 2026)

- `docs/screens/` kopyalar? korunurken, proje k?k?ndeki ge?ici JPEG kaynaklar ve `gtfscity.png` `.gitignore` i?ine al?nd?.

### Faz S ? Web MVP Haz?rl?k Turu 1 (31 Mart 2026)

- `docs/app/` alt?nda GitHub Pages i?in ayr? web giri? noktas? olu?turuldu.
- Web giri?i, desktop ak???na dokunmadan k?k JS/CSS dosyalar?n?n Pages i?in izole kopyalar?yla haz?rland?.
- `bootstrap-manager.js` i?ine base path deste?i eklendi ve Pages vitrinden `Web Demo` ba?lant?s? verildi.

### Faz S ? Web MVP D?zenleme Turu 2 (31 Mart 2026)

- Y?klenen ?ehir silindi?inde landing ekran?na g?venli d?n?? ve yeniden GTFS y?kleme ak??? d?zeltildi.
- Pages vitrinde giri? metni, ekran g?r?nt?s? yerle?imi ve ?r?n anlat?m? yeniden d?zenlendi.
- HTTPS linkten y?kleme, g?venlik ve platform s?n?rlar? nedeniyle desktop s?r?m?nde tutuldu; web demo yerel ZIP y?kleme ile s?n?rland?.

### Faz S ? Lisans ve ???nc? Parti Tarama Turu 3 (31 Mart 2026)

- `package-lock.json` ve CDN ba??ml?l?klar? ?zerinden ???nc? parti lisans taramas? yap?ld?.
- ?ekirdek ba??ml?l?klar i?in lisans ?zeti ??kar?ld? ve `THIRD_PARTY_NOTICES.md` eklendi.
- npm taramas? i?inde zorunlu copyleft s?n?f?nda GPL/AGPL/LGPL ba??ml?l?k bulunmad?; JSZip i?in MIT se?ene?i not edildi.
- `models/` alt?ndaki GLB varl?klar?n kayna?? otomatik tarama d???nda b?rak?ld? ve ayr?ca do?rulama gerektirdi?i not edildi.
