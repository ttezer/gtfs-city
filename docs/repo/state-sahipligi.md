# GTFS City - State Sahipligi

Bu belge, state fazinin ilk ciktisidir.
Amac, hangi state alaninin gercekte nerede yasadigini, kim tarafindan okundugunu, kim tarafindan yazildigini ve ana sorunun ne oldugunu gorunur kilmaktir.

Bu belge refactor plani degildir.
Ama state -> bridge -> script.js sirasinin ilk referansidir.

## State Kategorileri

### 1. Dataset state

GTFS verisinin kendisi ve ondan dogrudan uretilen temel runtime veri.

Örnek:
- `AppState.trips`
- `AppState.shapes`
- `AppState.stops`
- `AppState.stopInfo`
- `AppState.stopDeps`
- `AppState.hourlyCounts`
- `AppState.hourlyHeat`
- `AppState.baseRuntimeData`
- `AppState.routeRuntimeSource`
- `AppState.loadedRuntimeRouteIds`
- `AppState.loadingRuntimeRouteIds`
- `AppState.stopConnectivityScores`

### 2. UI state

Katman acikligi, harita gorunumu, dil ve UI gorunurluk tercihleri.

Örnek:
- `showAnim`
- `showPaths`
- `showStops`
- `showStopCoverage`
- `showConnectivityGrid`
- `showHeatmap`
- `showTrail`
- `showHeadway`
- `showBunching`
- `show3D`
- `currentMapStyle`
- `currentLanguage`

### 3. Simulation state

Saat, hiz, replay ve sim akisi ile ilgili state.

Örnek:
- `simTime`
- `simPaused`
- `simSpeed`
- `speedIdx`
- `lastTs`
- `isReplay`
- `replayLoop`

### 4. Selection state

Kullanicinin odagi, secimi ve filtreli görünüm durumu.

Örnek:
- `activeRoutes`
- `focusedRoute`
- `selectedRouteDirection`
- `selectedTripIdx`
- `followTripIdx`
- `selectedEntity`
- `routeHighlightPath`
- `typeFilter`

### 5. Session / service state

Aktif sehir, servis secimi, takvim ve yuklenmis dataset baglami.

Örnek:
- `activeCity`
- `activeServiceId`
- `activeServiceIds`
- `activeServiceOptions`
- `_calendarCache`
- `uploadedGtfsCities`
- `hiddenCities`

### 6. Analytics / transient state

Analitik hesaplar, gecici cache'ler ve yeniden hesaplanabilir ara durumlar.

Örnek:
- `heatmapHour`
- `heatmapFollowSim`
- `bunchingThreshold`
- `bunchingEvents`
- `_isochronData`
- `_isochronOriginSid`
- `stopNames`
- `_focusedStopIdsCache`
- `_filteredStopsCache`
- `_filteredStopIdSetCache`

## Kritik 20 State Alani

| Alan | Kategori | Sahip | Okuyanlar | Yazanlar | Sorun |
|---|---|---|---|---|---|
| `AppState.trips` | Dataset | `data-manager` yukleme akisi | `city-manager`, `app-manager`, `map-manager`, `ui-manager` | `data-manager`, `city bridge clearRuntimeData` | Hem `AppState.trips` hem `TRIPS` tutuluyor; cift kaynak riski var |
| `AppState.shapes` | Dataset | `data-manager` | `city-manager`, `map-manager` | `data-manager`, `city bridge clearRuntimeData` | `SHAPES` ile ayni verinin ikizi var |
| `AppState.stops` | Dataset | `data-manager` | `city-manager`, `app-manager`, `map-manager`, `ui-manager` | `data-manager`, `city bridge clearRuntimeData` | `STOPS` ile ayni veri iki yerden tasiniyor |
| `AppState.stopInfo` | Dataset | `data-manager` | `map-manager`, `ui-manager`, `planner-manager`, `city-manager` | `data-manager`, `city bridge clearRuntimeData` | `STOP_INFO` globali ile paralel yasiyor |
| `AppState.stopDeps` | Dataset | `data-manager` | `map-manager`, `ui-manager`, `simulation-engine`, `planner-manager` | `data-manager`, `city bridge clearRuntimeData` | `STOP_DEPS` globali ile paralel yasiyor |
| `AppState.routeRuntimeSource` | Dataset / session | `data-manager` yukleme akisi | `ui-manager`, `data-manager` | `data-manager`, `clearRuntimeData` | Buyuk feed icin route-scoped subset yuklemenin kaynak paketi; buyuk ama tek sahipli olmali |
| `AppState.loadedRuntimeRouteIds` | Dataset / selection yardimcisi | runtime merge akisi | `ui-manager`, `map-manager` | `setRuntimeCollections`, `mergeRuntimeCollections`, `clearRuntimeData` | Runtime'da hangi route'larin gercekten yasadigini ayri tasiyor |
| `AppState.loadingRuntimeRouteIds` | Session / transient | route-scoped loading akisi | `ui-manager` | `data-manager`, `clearRuntimeData` | Asenkron route subset job'lari icin gecici set |
| `AppState.stopConnectivityScores` | Dataset / analytics | `script.js` runtime + `StopConnectivityUtils` akisi | `map-manager`, stop panel, legend | connectivity event zinciri, cache okuma/yazma | Uretimi event tabanli, sahipligi daginik |
| `simTime` | Simulation | `script.js` / `simulation-engine` | `map-manager`, `ui-manager`, `simulation-engine` | `simulation-engine`, slider eventleri, replay resetleri | Merkezi state nesnesi yerine local runtime degiskeni |
| `simPaused` | Simulation | `simulation-engine` | `simulation-engine`, UI kontrolleri | `simulation-engine`, playback butonlari | runtime local simulation state |
| `showConnectivityGrid` | UI | `script.js` toggle sistemi | `map-manager`, legend, viewport status | toggle map, resetViewToggles | UI state halen tamamen runtime local |
| `showHeatmap` | UI | `script.js` toggle sistemi | `map-manager`, heatmap control | toggle map, resetler | runtime local UI state |
| `showTrail` | UI | `script.js` + `app-manager` | `map-manager`, style/controls | `app-manager`, runtime resetler | Bu alan manager setter ile de yaziliyor; sahiplik yumusak |
| `currentMapStyle` | UI | `script.js` | `simulation-engine`, style butonlari | `app-manager`, runtime setter, UI aksiyonlari | UI state ama sim akisini da etkiliyor; sınır net degil |
| `typeFilter` | Selection / UI | `script.js` | `map-manager`, `ui-manager`, `simulation-engine` | `setTypeFilter`, resetRuntimeCaches | UI filtresi ve secim state'i ayni alanda birlesmis |
| `activeRoutes` | Selection | `ui-manager` etkileşimi uzerinden runtime | `map-manager`, `simulation-engine`, `ui-manager` | route list checkbox akisi | Mutable `Set`; dogrudan degistiriliyor, merkezi mutation yok |
| `focusedRoute` | Selection | `ui-manager` / route focus akisi | `map-manager`, `simulation-engine`, `ui-manager` | `focusRoute`, clear selection, stop/vehicle secimi | Kritik secim state'i ama runtime global |
| `selectedTripIdx` | Selection | `ui-manager` / vehicle panel | `ui-manager`, `simulation-engine` | stop/vehicle etkileşimi, close panel | `selectedEntity` ile birlikte cift temsil uretiyor |
| `selectedEntity` | Selection / session | `ui-manager` | route/stop/vehicle panel akislari | `setSelectedEntity`, close panel akislari | Tur bazli secim modeli var ama diger secim alanlariyla ayri tutuluyor |
| `activeCity` | Session | `city-manager` | `service-manager`, `planner-manager`, `data-manager` | `city-manager`, upload akisi | runtime local session state |
| `activeServiceId` / `activeServiceIds` | Session | `service-manager` / `city-manager` | `service-manager`, `city-manager`, `data-manager` | `service-manager`, `city-manager`, `data-manager` | Birden fazla bridge uzerinden yaziliyor; sahiplik daginik |
| `_calendarCache` | Session / transient | `service-manager` | `service-manager`, `city-manager`, `data-manager` | `service-manager`, `city-manager`, `data-manager` | Bir cache ama state gibi tasiniyor; yazan sayisi fazla |

## Ana Gozlem

Bugunku yapida gercek state'in ana sahibi `src/runtime/script.js`.
`src/core/state-manager.js` yolu kapatıldı; resmi yon runtime local state + `AppState` sahipligi uzerinden devam ediyor.

Bu, state fazinin bugunku ana kararidir.

Kisa sonuç:

- `StateManager` yasatilmadi
- ürün state'i icin fiili kaynak runtime local state + `AppState` olarak kabul edildi
- bundan sonraki temizlik bu iki ekseni netlestirerek ilerlemeli

## Ilk Fazda Mutlaka Ele Alinmasi Gereken 5 Alan

### 1. `simTime`

Sebep:
- sistemin merkez zamani
- harita, panel, replay ve sim akisi bunu okuyor
- yerel runtime değişken olarak yasamasi doğru degil

### 2. `activeRoutes`

Sebep:
- dogrudan mutable `Set`
- birden fazla akista yan etki uretiyor
- secim state'inin en kirilgan parcalarindan biri

### 3. `focusedRoute`

Sebep:
- UI, harita ve sim arasinda ana odak alanı
- secim modeli bunun uzerinden kuruluyor
- route odak davranislarinin merkezi

### 4. `activeCity` + `activeServiceId` + `activeServiceIds`

Sebep:
- sehir ve servis baglami urunun veri baglamini belirliyor
- birden fazla bridge ve manager tarafindan yaziliyor
- session sahipligi netlestirilmeden bridge daraltmak saglikli olmaz

### 5. `AppState.trips/stops/stopInfo/stopDeps` ile `TRIPS/STOPS/STOP_INFO/STOP_DEPS`

Sebep:
- bunlar tek tek ayri alanlar degil, ayni yapisal sorunun cekirdegi
- cift kaynak modeli var
- dataset state icin resmi tek kaynak belirlenmeli

## Faz 1 Sonucu Olarak Cikarilan Kural

State fazinin bu turdaki resmi karari sunudur:

`Gercek state kaynagi AppState + runtime local sahiplik eksenidir; yeni bir merkezi state katmani acilmadan bu iki eksen sertlestirilir.`

Bu karar verilmeden bridge daraltma ve `script.js` parcala isi guvenli ilerlemez.

## ADR-002 Sonrasi Workspace State Notu

`Harita / Bilgi workspace` karari alindiktan sonra state fazina iki yeni zorunlu alan girdi:

### 1. `activeWorkspace`

- onerilen resmi sahip: `AppState`
- beklenen degerler: `harita | bilgi | analiz`
- amac: ust seviye kullanim yolunu UI toggle'larindan ayirmak

Bu alan, `workspace` secimini UI detayindan ayri bir urun state'i olarak ele almak icin gerekir.

### 2. `inspectorContext`

`selectedEntity` secilen nesneyi tutar; `inspectorContext` ise bu secimin hangi workspace baglaminda nasil render edilecegini tanimlar.

Ilk onerilen model:

- `entityType`
- `entityId`
- `workspace`
- `viewMode`

Bu alan ayri tanimlanmazsa su sorunlar buyur:

- Bilgi workspace'inde yapilan secim Harita'ya gecince stale kalabilir
- ayni secim iki farkli panel mantiginda tekrar yorumlanir
- `selectedEntity` ile gorunum baglami birbirine karisir

### Kisa Kural

- `selectedEntity` global secim state'idir
- `focusedRouteId` harita focus state'idir
- `activeWorkspace` ust seviye yuzey secimidir
- `inspectorContext` secimin hangi workspace sunumuyla gosterilecegini belirler

Bu dort alan birbirine karistirilirsa Faz 3 sonrasi workspace gecislerinde sessiz secim bug'lari olusur.

## Faz 7 Sonrasi Buyuk Feed State Notu

Buyuk feed mimarisi ile birlikte dataset state'e uc yeni alan fiilen girdi:

- `routeRuntimeSource`
- `loadedRuntimeRouteIds`
- `loadingRuntimeRouteIds`

Bu alanlar gecici degil; route-scoped loading davranisinin cekirdegi.

### Kisa anlamlari

- `routeRuntimeSource`
  - servis filtreli ama pre-cap tam trip/shape/stop kaynagi
  - route subset worker job'u bunun uzerinden kurulur

- `loadedRuntimeRouteIds`
  - ana runtime veya merge edilmis subset icinde gercekten yasayan route kimlikleri
  - UI tarafinda "katalogda var ama runtime'da yok" ayrimini yapar

- `loadingRuntimeRouteIds`
  - o anda subset yuklenen route'lari izler
  - ayni route icin tekrar tekrar job acilmasini engeller

### Yeni risk

`AppState.trips/shapes/stops/stopDeps` artik sadece tam yukleme ile degil, merge ile de buyuyor.

Bu nedenle:

- `runtime collections` tek seferlik set degil, kademeli genisleyebilir veri kabul edilmeli
- cache anahtarlari sadece `trips.length` gibi kaba olculere dayanirsa sessiz stale-state bug'lari uretebilir
- Faz 7 sonrasi state sahipliginde asil yeni baski `kademeli runtime buyumesi`dir
