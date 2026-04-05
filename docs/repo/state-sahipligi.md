# GTFS City - State Sahipligi

Bu belge, state fazinin ilk ciktisidir.
Amac, hangi state alaninin gercekte nerede yasadigini, kim tarafindan okundugunu, kim tarafindan yazildigini ve ana sorunun ne oldugunu gorunur kilmaktir.

Bu belge refactor plani degildir.
Ama state -> bridge -> script.js sirasinin ilk referansidir.

## State Kategorileri

### 1. Dataset state

GTFS verisinin kendisi ve ondan dogrudan uretilen temel runtime veri.

Ornek:
- `AppState.trips`
- `AppState.shapes`
- `AppState.stops`
- `AppState.stopInfo`
- `AppState.stopDeps`
- `AppState.hourlyCounts`
- `AppState.hourlyHeat`
- `AppState.baseRuntimeData`
- `AppState.stopConnectivityScores`

### 2. UI state

Katman acikligi, harita gorunumu, dil ve UI gorunurluk tercihleri.

Ornek:
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

Ornek:
- `simTime`
- `simPaused`
- `simSpeed`
- `speedIdx`
- `lastTs`
- `isReplay`
- `replayLoop`

### 4. Selection state

Kullanicinin odagi, secimi ve filtreli gorunum durumu.

Ornek:
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

Ornek:
- `activeCity`
- `activeServiceId`
- `activeServiceIds`
- `activeServiceOptions`
- `_calendarCache`
- `uploadedGtfsCities`
- `hiddenCities`

### 6. Analytics / transient state

Analitik hesaplar, gecici cache'ler ve yeniden hesaplanabilir ara durumlar.

Ornek:
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
| `AppState.stopConnectivityScores` | Dataset / analytics | `script.js` runtime + `StopConnectivityUtils` akisi | `map-manager`, stop panel, legend | connectivity event zinciri, cache okuma/yazma | Uretimi event tabanli, sahipligi daginik |
| `simTime` | Simulation | `script.js` / `simulation-engine` | `map-manager`, `ui-manager`, `simulation-engine` | `simulation-engine`, slider eventleri, replay resetleri | Merkezi state nesnesi yerine local runtime degiskeni |
| `simPaused` | Simulation | `simulation-engine` | `simulation-engine`, UI kontrolleri | `simulation-engine`, playback butonlari | runtime local simulation state |
| `showConnectivityGrid` | UI | `script.js` toggle sistemi | `map-manager`, legend, viewport status | toggle map, resetViewToggles | UI state halen tamamen runtime local |
| `showHeatmap` | UI | `script.js` toggle sistemi | `map-manager`, heatmap control | toggle map, resetler | runtime local UI state |
| `showTrail` | UI | `script.js` + `app-manager` | `map-manager`, style/controls | `app-manager`, runtime resetler | Bu alan manager setter ile de yaziliyor; sahiplik yumusak |
| `currentMapStyle` | UI | `script.js` | `simulation-engine`, style butonlari | `app-manager`, runtime setter, UI aksiyonlari | UI state ama sim akisini da etkiliyor; sinir net degil |
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
`src/core/state-manager.js` yolu kapatildi; resmi yon runtime local state + `AppState` sahipligi uzerinden devam ediyor.

Bu, state fazinin bugunku ana kararidir.

Kisa sonuc:

- `StateManager` yasatilmadi
- urun state'i icin fiili kaynak runtime local state + `AppState` olarak kabul edildi
- bundan sonraki temizlik bu iki ekseni netlestirerek ilerlemeli

## Ilk Fazda Mutlaka Ele Alinmasi Gereken 5 Alan

### 1. `simTime`

Sebep:
- sistemin merkez zamani
- harita, panel, replay ve sim akisi bunu okuyor
- yerel runtime degisken olarak yasamasi dogru degil

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
