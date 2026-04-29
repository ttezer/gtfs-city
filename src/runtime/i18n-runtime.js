window.RuntimeI18n = (function () {
  const I18N_MESSAGES = {
  tr: {
    languageLabel: 'Dil',
    landingSubtitle: 'Transit veri analiz ve görselleştirme paneli',
    landingRoutes: 'Toplam Hat',
    landingTrips: 'Bugünkü Seferler',
    landingStops: 'Aktif Duraklar',
    uploadGtfsZip: 'GTFS ZIP Yükle',
    uploadAnother: 'Başka GTFS ZIP Yükle',
    openMap: 'Haritayı Aç',
    loadFromLink: 'Linkten Yükle',
    landingExamplesTitle: 'Örnek veriyle dene',
    landingExamplesSubtitle: 'Repo içi demo veri paketleriyle hızlı başlangıç yap veya dış kaynağı aç.',
    landingExampleLoad: 'Örneği Yükle',
    landingExampleExternal: 'Dış Kaynak',
    landingExampleSource: 'Kaynağa Git',
    sampleBadgeBundled: 'Repo Demo',
    sampleBadgeExternal: 'Dış Kaynak',
    sampleNoteBundled: 'Uygulama için repoya alınmış güncel örnek paket.',
    sampleNoteExternalElectron: 'Bu kart dış kaynaktan yüklenir.',
    sampleNoteExternalWeb: 'Bu kart yalnızca dış kaynak referansıdır; web demoda otomatik yükleme kapalı.',
    linkNote: 'Yalnızca HTTPS GTFS ZIP linkleri kabul edilir. Dış bağlantının güvenliği kullanıcı sorumluluğundadır.',
    linkNoteWeb: 'Web demosunda dış bağlantılar CORS nedeniyle engellenebilir. Hazır örnek veri kartlarını kullanın.',
    homeTitle: 'Giriş sayfasına dön',
    loading: 'Yükleniyor...',
    routePanelSummary: 'Operasyon Özeti',
    routePanelServiceCalendar: 'Çalışma Takvimi',
    routePanelTripCount: 'Sefer Sayısı',
    routePanelTripsToday: 'Bugün {count} sefer',
    routePanelServiceHours: 'Çalışma Saatleri',
    routePanelRouteLength: 'Güzergâh Uzunluğu',
    routePanelAverageHeadway: 'Ort. Sefer Sıklığı',
    routePanelDirectionDistribution: 'Yön Dağılımı',
    routePanelDirectionFilter: 'Hat Yönü',
    routePanelDirectionAll: 'Tüm Yönler',
    routePanelNoTripInfo: 'Sefer bilgisi yok',
    stopPanelSimulationTime: 'Simülasyon saati',
    stopPanelHeaderLine: 'Hat',
    stopPanelHeaderDirection: 'Varış Yönü',
    stopPanelHeaderFirstVehicle: 'İlk Araç',
    stopPanelHeaderNextVehicle: 'Sonraki Araç',
    stopPanelNoServiceData: 'Bu durak için sefer verisi yok',
    stopPanelNoServiceFound: 'Bu durağa sefer bulunamadı.',
    stopPanelSummary: '{count} hat - Ortalama headway {headway}',
    stopPanelNoDisplayRoutes: 'Bu durak için gösterilecek hat bulunamadı.',
    stopPanelAverageWait: 'Ort. Bekleme',
    stopPanelCode: 'Kod',
    serviceNoCalendarData: 'Çalışma takvimi verisi yok - Tümü',
    serviceNoCalendarShort: 'Takvim verisi yok',
    serviceStatusSummary: '{date} - {active} aktif - {future} planlı - {expired} geçmiş',
    serviceAll: 'Tümü',
    serviceBadgeFuture: 'PLANLI',
    serviceBadgeExpired: 'GEÇMİŞ',
    serviceBadgeActive: 'AKTİF',
    serviceBadgePassive: 'PASİF',
    serviceMore: 'servis',
    warningCriticalErrors: 'Kritik Hatalar',
    warningDataWarnings: 'Veri Uyarıları',
    warningErrorsPresent: 'Bazı veriler eksik veya hatalı görünüyor.',
    warningInconsistencies: 'Veriler yüklendi ancak bazı tutarsızlıklar var.',
    vehicleHeadway: 'Headway',
    vehicleProgress: 'İlerleme',
    vehicleNextStop: 'Sonraki Durak',
    vehicleEta: 'Tahmini Varış',
    vehicleFollow: 'Takip Et',
    vehicleFocusRoute: 'Hattı Odakla',
    followMode: 'Takip Modu',
    followingRoute: 'takip',
    plannerToggle: 'Nasıl Giderim',
    plannerDatasetActive: '{city} · aktif veri seti',
    plannerDatasetDefault: 'Aktif veri seti',
    plannerFromPlaceholder: 'Nereden?',
    plannerToPlaceholder: 'Nereye?',
    plannerBuildRoute: 'Yol Tarifi Oluştur →',
    plannerResultTitle: 'Rota Sonucu',
    plannerIsochronOrigin: '📍 {name}',
    plannerIsochronTitle: 'İZOKRON ANALİZ',
    plannerIsochronHint: 'Haritada bir noktaya tıklayın',
    plannerIsochronLegend15: '0 – 15 dakika',
    plannerIsochronLegend30: '15 – 30 dakika',
    plannerIsochronLegend45: '30 – 45 dakika',
    plannerIsochronLegend60: '45 – 60 dakika',
    plannerIsochronStats: '15dk: <b style=\"color:#3fb950\">{count15} durak</b> &nbsp; 30dk: <b style=\"color:#d29922\">{count30} durak</b> &nbsp; 60dk: <b style=\"color:#f85149\">{count60} durak</b>',
    plannerMessageErrorIcon: '⚠',
    plannerMessageInfoIcon: 'ℹ',
    plannerStopValidationTitle: 'Durak doğrulanamadı',
    plannerStopValidationMessage: 'Lütfen aktif şehir verisinden başlangıç ve varış durağını yeniden seçin.',
    plannerNoRouteTitle: 'Rota bulunamadı',
    plannerNoRouteMessage: 'Seçilen duraklar arasında uygun bir toplu taşıma bağlantısı hesaplanamadı.',
    plannerMissingSelectionTitle: 'Durak seçimi eksik',
    plannerMissingSelectionMessage: 'Lütfen aktif şehirden başlangıç ve varış duraklarını seçin.',
    routeWalk: 'Yürü',
    routeBoardLine: '{line} hattına bin',
    routeRideDetail: '{from} durağından bin · {to} durağında in',
    routeWalkDetail: '{from} → {to}',
    routeConnectionCount: '{count} bağlantı',
    routeStopCount: '{count} durak',
    routeTransfer: 'Aktarma',
    routeTransferDetail: '{stop} durağında inip sonraki hatta geç',
    routeSuggestedJourney: 'Önerilen yolculuk',
    routeSummaryDetail: '{legs} etap · {lines} hat',
    routeTotal: 'Toplam: {minutes} dakika',
    plannerHeaderTitle: 'Nasıl Giderim',
    heatmapFollowSimulation: 'Sim ile takip et',
    bunchingAlertsTitle: 'Bunching Uyarıları',
    bunchingThreshold: 'Eşik:',
    gtfsPreparing: 'Hazırlanıyor...',
    gtfsExpectedFiles: 'Beklenen GTFS Dosyaları',
    gtfsInfoNote: 'Simülasyon Python pipeline ile preprocess gerektirir. Bu araç validasyon + istatistik sağlar.',
    cityLoading: '{city} yükleniyor...',
    cityLoadingGeneric: 'Yükleniyor...',
    warningTitle: 'Veri Uyarıları',
    close: 'Kapat',
    loadingZipOpening: 'ZIP açılıyor...',
    loadingZipOpeningShort: 'ZIP AÇILIYOR',
    loadingFilesReading: 'Dosyalar okunuyor...',
    loadingFileReading: '{file} okunuyor...',
    loadingFilesReadingShort: 'DOSYALAR OKUNUYOR',
    loadingValidation: 'Validasyon yapılıyor...',
    loadingValidationShort: 'VALIDASYON YAPILIYOR',
    loadingDataImporting: 'Veri yükleniyor',
    loadingDataImportingShort: 'VERİ YÜKLENİYOR',
    loadingLinkCheckingShort: 'LİNK DOĞRULANIYOR',
    loadingZipDownloadedShort: 'ZIP İNDİRİLDİ',
    loadingTablesParsingShort: 'TABLOLAR AYRILIYOR',
    loadingTripsPreparingShort: 'SEFERLER HAZIRLANIYOR',
    loadingReadyShort: 'VERİ HAZIR',
    gtfsSourceUnreadable: 'GTFS ZIP kaynağı okunamadı.',
    gtfsJsZipMissing: 'JSZip kütüphanesi yüklenemedi.',
    gtfsZipParseError: 'ZIP parse hatası: {message}',
    gtfsEnterHttpsUrl: 'Önce HTTPS GTFS ZIP linki gir.',
    gtfsOnlyHttpsAllowed: 'Yalnızca HTTPS GTFS ZIP linklerine izin verilir.',
    gtfsElectronOnly: 'Linkten indirme yalnızca Electron sürümünde desteklenir.',
    gtfsUrlDownloadFailed: 'GTFS ZIP linki indirilemedi.',
    gtfsCalendarAutoSelected: 'GTFS takvimi bugüne uygun olarak otomatik seçildi.',
    gtfsLargeDataWarning: '⚠️ Büyük veri: {total} seferden {loaded} tanesi yüklendi',
    gtfsReplacingPrevious: 'Önceki yüklenen veri kaldırıldı. Yeni GTFS etkinleştiriliyor.',
    gtfsImportError: 'GTFS import hatası oluştu',
    gtfsConfirmImport: 'Sisteme Al',
    cancel: 'İptal',
    gtfsReportStatusError: '⚠️ Hatalar Tespit Edildi - Yine de Sisteme Alındı',
    gtfsReportStatusWarn: '⚠️ Uyarılar Var - Sisteme Alındı',
    gtfsReportStatusOk: '✅ Geçerli GTFS - Sisteme Alındı',
    gtfsReportNotice: 'ℹ {errors} hata ve {warnings} uyarı tespit edildi. Simülasyon mevcut verilerle çalışmaya devam ediyor.',
    gtfsReportFooter: '{errors} hata - {warnings} uyarı - {info} bilgi',
    gtfsExportJson: '⬇ JSON Rapor',
    loaderPreparingData: 'Veriler Hazırlanıyor...',
    platformElectron: 'ELECTRON',
    platformWeb: 'WEB TARAYICI',
    routeLongNameMissing: 'Uzun ad yok',
    landingUploadButton: '📂 GTFS ZIP Yükle',
    landingStartButton: '🗺️ Haritayı Aç',
    sidebarLayers: 'KATMANLAR',
    sidebarRoutes: 'HATLAR',
    sidebarStops: 'DURAKLAR',
    sidebarCities: 'ŞEHİR',
    sidebarRouteType: 'HAT TİPİ',
    sidebarMapStyle: 'HARİTA GÖRÜNÜMÜ',
    sidebarServiceCalendar: 'Çalışma Takvimi',
    sidebarRouteSearch: 'Hat ara...',
    sidebarStopSearch: 'Durak ara...',
    togglePaths: 'Güzergâh Hatları',
    toggleAnimation: 'Araç Animasyonu',
    toggleStops: 'Duraklar',
    toggleConnectivityGrid: 'Bağlantı Kareleri (Beta)',
    toggleStopCoverage: 'Durak 300 m',
    toggleStopScoreBase: 'Temel Durak Skoru',
    toggleStopScoreLive: 'Durak Anlık Servis Skoru',
    stopCoverageRadius: 'Yarıçap',
    stopCoverageMode: 'Görünüm',
    stopCoverageModeFillStroke: 'Dolgu + Çizgi',
    stopCoverageModeFill: 'Sadece Dolgu',
    stopCoverageModeStroke: 'Sadece Çizgi',
    stopCoverageFillColor: 'Dolgu rengi',
    stopCoverageFillOpacity: 'Dolgu saydamlığı',
    stopCoverageStrokeColor: 'Çizgi rengi',
    stopCoverageStrokeWidth: 'Çizgi kalınlığı',
    toggleHeadway: 'Headway Çizgileri',
    toggleBunching: 'Bunching Alarmı',
    toggleHeatmap: 'Yoğunluk Heatmap',
    toggleTrail: 'Araç İzleri (Fade)',
    toggleIsochron: 'İzokron Analiz 🗺️',
    vehicleDetailLongName: 'Hat Uzun Adı',
    vehicleDetailDirection: 'Yön',
    vehicleDetailService: 'Çalışma Takvimi',
    vehicleDetailDeparture: 'Kalkış',
    vehicleDetailArrival: 'Varış',
    vehicleDetailTripsSameDirection: 'Aynı Yönde Sefer',
    vehicleFollowStop: 'Takibi Bırak',
    routeTypeTram: 'Tramvay',
    routeTypeMetro: 'Metro',
    routeTypeTrain: 'Tren',
    routeTypeBus: 'Otobüs',
    routeTypeFerry: 'Feribot',
    routeTypeCableCar: 'Teleferik',
    routeTypeGondola: 'Gondol',
    routeTypeFunicular: 'Füniküler',
    routeTypeMinibus: 'Minibüs',
    routeTypeSharedTaxi: 'Dolmuş',
    peakMorning: 'SABAH PİK',
    peakEvening: 'AKŞAM PİK',
    activeBadge: '{active} aktif araç - {routes} hat - {trips} sefer',
    mapStyleSatellite: 'UYDU',
    mapStyleDark: 'KOYU',
    mapStyleLight: 'AÇIK',
    cityVisible: 'Görünür',
    adaptedBadge: '⚠️ UYARLANDI',
    serviceAdaptedReason: 'Bugün için servis bulunamadı, takvim geçmiş veriye uyarlandı.',
    dayNightNight: '🌙 GECE',
    dayNightDawn: '🌅 ŞAFAK',
    dayNightDay: '☀️ GÜNDÜZ',
    dayNightDusk: '🌆 AKŞAM',
    dayNightSatellite: '🛰️ UYDU',
    dayNightDark: '🌙 KOYU',
    dayNightLight: '☀️ AÇIK',
    cinematicStart: '🎬 Sinematik',
    cinematicStop: '⏹ Durdur',
    cinematicOverview: 'Genel Bakış',
    cinematicWestCorridor: 'Batı Koridoru',
    cinematicEastCorridor: 'Doğu Koridoru',
    cinematicNorthLine: 'Kuzey Hattı',
    cinematicNetworkSummary: 'Ağ Özeti',
  },
  en: {
    languageLabel: 'Language',
    landingSubtitle: 'Transit data analysis and visualization panel',
    landingRoutes: 'Total Routes',
    landingTrips: "Today's Trips",
    landingStops: 'Active Stops',
    uploadGtfsZip: 'Upload GTFS ZIP',
    uploadAnother: 'Upload Another GTFS ZIP',
    openMap: 'Open Map',
    loadFromLink: 'Load From Link',
    landingExamplesTitle: 'Try with sample data',
    landingExamplesSubtitle: 'Start with bundled demo datasets or open the external source page.',
    landingExampleLoad: 'Load Sample',
    landingExampleExternal: 'External Source',
    landingExampleSource: 'Open Source',
    sampleBadgeBundled: 'Bundled Demo',
    sampleBadgeExternal: 'External',
    sampleNoteBundled: 'Current sample package bundled into the app.',
    sampleNoteExternalElectron: 'This card loads from an external source.',
    sampleNoteExternalWeb: 'This card is reference-only in the web demo; automatic loading is disabled.',
    linkNote: 'Only HTTPS GTFS ZIP links are accepted. External link safety is the user responsibility.',
    linkNoteWeb: 'External links may be blocked by CORS in the web demo. Use the built-in sample data cards.',
    homeTitle: 'Return to landing page',
    loading: 'Loading...',
    routePanelSummary: 'Operations Summary',
    routePanelServiceCalendar: 'Service Calendar',
    routePanelTripCount: 'Trip Count',
    routePanelTripsToday: '{count} trips today',
    routePanelServiceHours: 'Service Hours',
    routePanelRouteLength: 'Route Length',
    routePanelAverageHeadway: 'Avg Headway',
    routePanelDirectionDistribution: 'Direction Distribution',
    routePanelDirectionFilter: 'Route Direction',
    routePanelDirectionAll: 'All Directions',
    routePanelNoTripInfo: 'No trip information',
    stopPanelSimulationTime: 'Simulation time',
    stopPanelHeaderLine: 'Line',
    stopPanelHeaderDirection: 'Direction',
    stopPanelHeaderFirstVehicle: 'First Vehicle',
    stopPanelHeaderNextVehicle: 'Next Vehicle',
    stopPanelNoServiceData: 'No trip data for this stop',
    stopPanelNoServiceFound: 'No trips found for this stop.',
    stopPanelSummary: '{count} routes - Average headway {headway}',
    stopPanelNoDisplayRoutes: 'No routes available to display for this stop.',
    stopPanelAverageWait: 'Avg Wait',
    stopPanelCode: 'Code',
    serviceNoCalendarData: 'No service calendar data - All',
    serviceNoCalendarShort: 'No calendar data',
    serviceStatusSummary: '{date} - {active} active - {future} scheduled - {expired} expired',
    serviceAll: 'All',
    serviceBadgeFuture: 'SCHEDULED',
    serviceBadgeExpired: 'EXPIRED',
    serviceBadgeActive: 'ACTIVE',
    serviceBadgePassive: 'PASSIVE',
    serviceMore: 'services',
    warningCriticalErrors: 'Critical Errors',
    warningDataWarnings: 'Data Warnings',
    warningErrorsPresent: 'Some data appears missing or invalid.',
    warningInconsistencies: 'Data loaded, but some inconsistencies remain.',
    vehicleHeadway: 'Headway',
    vehicleProgress: 'Progress',
    vehicleNextStop: 'Next Stop',
    vehicleEta: 'Estimated Arrival',
    vehicleFollow: 'Follow',
    vehicleFocusRoute: 'Focus Route',
    followMode: 'Follow Mode',
    followingRoute: 'follow',
    plannerToggle: 'How Do I Get There',
    plannerDatasetActive: '{city} · active dataset',
    plannerDatasetDefault: 'Active dataset',
    plannerFromPlaceholder: 'From?',
    plannerToPlaceholder: 'To?',
    plannerBuildRoute: 'Build Route →',
    plannerResultTitle: 'Route Result',
    plannerIsochronOrigin: '📍 {name}',
    plannerIsochronTitle: 'ISOCHRONE ANALYSIS',
    plannerIsochronHint: 'Click a point on the map',
    plannerIsochronLegend15: '0 – 15 minutes',
    plannerIsochronLegend30: '15 – 30 minutes',
    plannerIsochronLegend45: '30 – 45 minutes',
    plannerIsochronLegend60: '45 – 60 minutes',
    plannerIsochronStats: '15 min: <b style=\"color:#3fb950\">{count15} stops</b> &nbsp; 30 min: <b style=\"color:#d29922\">{count30} stops</b> &nbsp; 60 min: <b style=\"color:#f85149\">{count60} stops</b>',
    plannerMessageErrorIcon: '⚠',
    plannerMessageInfoIcon: 'ℹ',
    plannerStopValidationTitle: 'Stop could not be validated',
    plannerStopValidationMessage: 'Please reselect the origin and destination stops from the active city data.',
    plannerNoRouteTitle: 'Route not found',
    plannerNoRouteMessage: 'No suitable public transit connection could be calculated between the selected stops.',
    plannerMissingSelectionTitle: 'Stop selection missing',
    plannerMissingSelectionMessage: 'Please select origin and destination stops from the active city.',
    routeWalk: 'Walk',
    routeBoardLine: 'Board line {line}',
    routeRideDetail: 'Board at {from} · Get off at {to}',
    routeWalkDetail: '{from} → {to}',
    routeConnectionCount: '{count} connections',
    routeStopCount: '{count} stops',
    routeTransfer: 'Transfer',
    routeTransferDetail: 'Get off at {stop} and transfer to the next line',
    routeSuggestedJourney: 'Suggested journey',
    routeSummaryDetail: '{legs} legs · {lines} lines',
    routeTotal: 'Total: {minutes} minutes',
    plannerHeaderTitle: 'How Do I Get There',
    heatmapFollowSimulation: 'Follow sim',
    bunchingAlertsTitle: 'Bunching Alerts',
    bunchingThreshold: 'Threshold:',
    gtfsPreparing: 'Preparing...',
    gtfsExpectedFiles: 'Expected GTFS Files',
    gtfsInfoNote: 'Simulation requires Python pipeline preprocessing. This tool provides validation and statistics.',
    cityLoading: 'Loading {city}...',
    cityLoadingGeneric: 'Loading...',
    warningTitle: 'Data Warnings',
    close: 'Close',
    loadingZipOpening: 'Opening ZIP...',
    loadingZipOpeningShort: 'OPENING ZIP',
    loadingFilesReading: 'Reading files...',
    loadingFileReading: 'Reading {file}...',
    loadingFilesReadingShort: 'READING FILES',
    loadingValidation: 'Running validation...',
    loadingValidationShort: 'RUNNING VALIDATION',
    loadingDataImporting: 'Importing data',
    loadingDataImportingShort: 'IMPORTING DATA',
    loadingLinkCheckingShort: 'CHECKING LINK',
    loadingZipDownloadedShort: 'ZIP DOWNLOADED',
    loadingTablesParsingShort: 'PARSING TABLES',
    loadingTripsPreparingShort: 'PREPARING TRIPS',
    loadingReadyShort: 'DATA READY',
    gtfsSourceUnreadable: 'GTFS ZIP source could not be read.',
    gtfsJsZipMissing: 'JSZip library could not be loaded.',
    gtfsZipParseError: 'ZIP parse error: {message}',
    gtfsEnterHttpsUrl: 'Enter an HTTPS GTFS ZIP link first.',
    gtfsOnlyHttpsAllowed: 'Only HTTPS GTFS ZIP links are allowed.',
    gtfsElectronOnly: 'Downloading from link is supported only in the Electron build.',
    gtfsUrlDownloadFailed: 'GTFS ZIP link could not be downloaded.',
    gtfsCalendarAutoSelected: 'GTFS calendar was automatically selected for today.',
    gtfsLargeDataWarning: '⚠️ Large dataset: {loaded} of {total} trips were loaded',
    gtfsReplacingPrevious: 'Previous data was removed. Activating new GTFS.',
    gtfsImportError: 'A GTFS import error occurred',
    gtfsConfirmImport: 'Import to System',
    cancel: 'Cancel',
    gtfsReportStatusError: '⚠️ Errors Detected - Imported Anyway',
    gtfsReportStatusWarn: '⚠️ Warnings Present - Imported',
    gtfsReportStatusOk: '✅ Valid GTFS - Imported',
    gtfsReportNotice: 'ℹ {errors} errors and {warnings} warnings were detected. Simulation continues with the available data.',
    gtfsReportFooter: '{errors} errors - {warnings} warnings - {info} info',
    gtfsExportJson: '⬇ JSON Report',
    loaderPreparingData: 'Preparing Data...',
    platformElectron: 'ELECTRON',
    platformWeb: 'WEB BROWSER',
    routeLongNameMissing: 'No long name',
    landingUploadButton: '📂 Upload GTFS ZIP',
    landingStartButton: '🗺️ Open Map',
    sidebarLayers: 'LAYERS',
    sidebarRoutes: 'ROUTES',
    sidebarStops: 'STOPS',
    sidebarCities: 'CITY',
    sidebarRouteType: 'ROUTE TYPE',
    sidebarMapStyle: 'MAP STYLE',
    sidebarServiceCalendar: 'Service Calendar',
    sidebarRouteSearch: 'Search route...',
    sidebarStopSearch: 'Search stop...',
    togglePaths: 'Route Lines',
    toggleAnimation: 'Vehicle Animation',
    toggleStops: 'Stops',
    toggleConnectivityGrid: 'Connectivity Grid (Beta)',
    toggleStopCoverage: 'Stop 300 m',
    toggleStopScoreBase: 'Base Stop Score',
    toggleStopScoreLive: 'Live Stop Service Score',
    stopCoverageRadius: 'Radius',
    stopCoverageMode: 'Appearance',
    stopCoverageModeFillStroke: 'Fill + Stroke',
    stopCoverageModeFill: 'Fill Only',
    stopCoverageModeStroke: 'Stroke Only',
    stopCoverageFillColor: 'Fill Color',
    stopCoverageFillOpacity: 'Fill Opacity',
    stopCoverageStrokeColor: 'Stroke Color',
    stopCoverageStrokeWidth: 'Stroke Width',
    toggleHeadway: 'Headway Lines',
    toggleBunching: 'Bunching Alerts',
    toggleHeatmap: 'Density Heatmap',
    toggleTrail: 'Vehicle Trails (Fade)',
    toggleIsochron: 'Isochrone Analysis 🗺️',
    vehicleDetailLongName: 'Route Long Name',
    vehicleDetailDirection: 'Direction',
    vehicleDetailService: 'Service Calendar',
    vehicleDetailDeparture: 'Departure',
    vehicleDetailArrival: 'Arrival',
    vehicleDetailTripsSameDirection: 'Trips Same Direction',
    vehicleFollowStop: 'Stop Following',
    routeTypeTram: 'Tram',
    routeTypeMetro: 'Metro',
    routeTypeTrain: 'Train',
    routeTypeBus: 'Bus',
    routeTypeFerry: 'Ferry',
    routeTypeCableCar: 'Cable Car',
    routeTypeGondola: 'Gondola',
    routeTypeFunicular: 'Funicular',
    routeTypeMinibus: 'Minibus',
    routeTypeSharedTaxi: 'Shared Taxi',
    peakMorning: 'MORNING PEAK',
    peakEvening: 'EVENING PEAK',
    activeBadge: '{active} active vehicles - {routes} routes - {trips} trips',
    mapStyleSatellite: 'SATELLITE',
    mapStyleDark: 'DARK',
    mapStyleLight: 'LIGHT',
    cityVisible: 'Visible',
    adaptedBadge: '⚠️ ADAPTED',
    serviceAdaptedReason: 'No service was found for today, calendar was adapted from past data.',
    dayNightNight: '🌙 NIGHT',
    dayNightDawn: '🌅 DAWN',
    dayNightDay: '☀️ DAY',
    dayNightDusk: '🌆 EVENING',
    dayNightSatellite: '🛰️ SATELLITE',
    dayNightDark: '🌙 DARK',
    dayNightLight: '☀️ LIGHT',
    cinematicStart: '🎬 Cinematic',
    cinematicStop: '⏹ Stop',
    cinematicOverview: 'Overview',
    cinematicWestCorridor: 'West Corridor',
    cinematicEastCorridor: 'East Corridor',
    cinematicNorthLine: 'North Line',
    cinematicNetworkSummary: 'Network Summary',
  },
};

  let currentLanguage = (() => {
  try {
    const saved = localStorage.getItem('gtfs-city-language');
    return saved === 'en' ? 'en' : 'tr';
  } catch (_) {
    return 'tr';
  }
  })();

  let hooks = {
    getFollowTripIdx: () => null,
  };

  function configureRuntimeI18n(nextHooks = {}) {
    hooks = { ...hooks, ...nextHooks };
  }

  function getLanguage() {
    return currentLanguage;
  }

  function t(key, fallback = '') {
  return I18N_MESSAGES[currentLanguage]?.[key] || I18N_MESSAGES.tr?.[key] || fallback || key;
}

  function ensureLanguageSwitcher() {
  if (document.getElementById('language-switcher')) return;
  const wrap = document.createElement('div');
  wrap.id = 'language-switcher';
  wrap.innerHTML = `
    <label id="language-switcher-label" for="language-select">${t('languageLabel', 'Language')}</label>
    <select id="language-select" aria-label="Language">
      <option value="tr">Turkce</option>
      <option value="en">English</option>
    </select>
  `;
  document.body.appendChild(wrap);
  const select = document.getElementById('language-select');
  if (select) {
    select.value = currentLanguage;
    select.addEventListener('change', (event) => setLanguage(event.target.value));
  }
}

  function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  ensureLanguageSwitcher();
  const label = document.getElementById('language-switcher-label');
  const select = document.getElementById('language-select');
  if (label) label.textContent = t('languageLabel', 'Language');
  if (select) select.value = currentLanguage;
  const subtitle = document.querySelector('.lp-subtitle');
  if (subtitle) subtitle.textContent = t('landingSubtitle');
  const labels = document.querySelectorAll('.lp-card-lbl');
  if (labels[0]) labels[0].textContent = t('landingRoutes');
  if (labels[1]) labels[1].textContent = t('landingTrips');
  if (labels[2]) labels[2].textContent = t('landingStops');
  const uploadLink = document.getElementById('lp-btn-url');
  if (uploadLink) uploadLink.textContent = t('loadFromLink');
  const uploadBtn = document.getElementById('lp-btn-upload');
  if (uploadBtn && !uploadBtn.classList.contains('is-loading')) uploadBtn.textContent = t('landingUploadButton');
  const startBtn = document.getElementById('lp-btn-start');
  if (startBtn) startBtn.textContent = t('landingStartButton');
  const linkNote = document.getElementById('lp-link-note');
  if (linkNote) linkNote.textContent = t('linkNote');
  const examplesTitle = document.getElementById('lp-examples-title');
  if (examplesTitle) examplesTitle.textContent = t('landingExamplesTitle');
  const examplesSubtitle = document.getElementById('lp-examples-subtitle');
  if (examplesSubtitle) examplesSubtitle.textContent = t('landingExamplesSubtitle');
  document.querySelectorAll('.lp-example-load').forEach((button) => { button.textContent = t('landingExampleLoad'); });
  document.querySelectorAll('.lp-example-source').forEach((link) => { link.textContent = t('landingExampleSource'); });
  const homeBtn = document.getElementById('home-toggle-btn');
  if (homeBtn) homeBtn.title = t('homeTitle');
  const vehicleLabels = document.querySelectorAll('.vp-l');
  if (vehicleLabels[1]) vehicleLabels[1].textContent = t('vehicleHeadway');
  if (vehicleLabels[2]) vehicleLabels[2].textContent = t('vehicleProgress');
  const vehicleNextLabels = document.querySelectorAll('.vp-next-lbl');
  if (vehicleNextLabels[0]) vehicleNextLabels[0].textContent = t('vehicleNextStop');
  if (vehicleNextLabels[1]) vehicleNextLabels[1].textContent = `⏱ ${t('vehicleEta')}`;
  const followBtn = document.getElementById('vp-follow-btn');
  if (followBtn) followBtn.textContent = `📍 ${t('vehicleFollow')}`;
  const routeBtn = document.getElementById('vp-route-btn');
  if (routeBtn) routeBtn.textContent = `🗺 ${t('vehicleFocusRoute')}`;
  const followLabel = document.getElementById('follow-label');
  if (followLabel && hooks.getFollowTripIdx() === null) followLabel.textContent = `📍 ${t('followMode')}`;
  const plannerToggle = document.getElementById('route-planner-toggle');
  if (plannerToggle) {
    plannerToggle.title = t('plannerToggle');
    plannerToggle.textContent = `🧭 ${t('plannerToggle')}`;
  }
  const fromInput = document.getElementById('stop-from');
  if (fromInput) fromInput.placeholder = t('plannerFromPlaceholder');
  const toInput = document.getElementById('stop-to');
  if (toInput) toInput.placeholder = t('plannerToPlaceholder');
  const routeBuildBtn = document.getElementById('btn-route');
  if (routeBuildBtn) routeBuildBtn.textContent = t('plannerBuildRoute');
  const resultTitle = document.querySelector('#route-result-header > span');
  if (resultTitle) resultTitle.textContent = t('plannerResultTitle');
  const plannerHeaderTitle = document.querySelector('#route-planner-header > div > span');
  if (plannerHeaderTitle) plannerHeaderTitle.textContent = `🧭 ${t('plannerHeaderTitle')}`;
  const heatmapFollow = document.querySelector('label[for="heatmap-follow-sim"], #heatmap-ctrl .small-check');
  const heatmapCheckbox = document.getElementById('heatmap-follow-sim');
  if (heatmapFollow && heatmapCheckbox) heatmapFollow.lastChild.textContent = ` ${t('heatmapFollowSimulation')}`;
  const bunchingTitle = document.querySelector('#bunching-header > span');
  if (bunchingTitle) bunchingTitle.textContent = `⚠️ ${t('bunchingAlertsTitle')}`;
  const thresholdLabel = document.querySelector('#threshold-row > span');
  if (thresholdLabel) thresholdLabel.textContent = t('bunchingThreshold');
  const gtfsProgressMsg = document.getElementById('gtfs-progress-msg');
  if (gtfsProgressMsg && !gtfsProgressMsg.dataset.dynamic) gtfsProgressMsg.textContent = t('gtfsPreparing');
  const gtfsInfoTitle = document.querySelector('.gtfs-info-title');
  if (gtfsInfoTitle) gtfsInfoTitle.textContent = t('gtfsExpectedFiles');
  const gtfsNote = document.querySelector('.gtfs-note');
  if (gtfsNote) gtfsNote.textContent = t('gtfsInfoNote');
  const cityLoadingName = document.getElementById('city-loading-name');
  if (cityLoadingName && !cityLoadingName.dataset.city) cityLoadingName.textContent = t('cityLoadingGeneric');
  const warningTitle = document.querySelector('.gwd-title');
  if (warningTitle) warningTitle.textContent = t('warningTitle');
  const warningClose = document.getElementById('gwd-close');
  if (warningClose) warningClose.title = t('close');
  const loaderText = document.querySelector('.loader-text');
  if (loaderText) loaderText.textContent = t('loaderPreparingData');
  const layersLabel = document.querySelector('#section-layers .section-label');
  if (layersLabel) layersLabel.textContent = t('sidebarLayers');
  const citiesLabel = document.querySelector('#section-cities .section-label');
  if (citiesLabel) citiesLabel.textContent = t('sidebarCities');
  const routesLabel = document.querySelector('#section-routes .section-label');
  if (routesLabel) routesLabel.textContent = t('sidebarRoutes');
  const stopsLabel = document.querySelector('#section-stops-list .section-label');
  if (stopsLabel) stopsLabel.textContent = t('sidebarStops');
  const routeTypeLabel = document.getElementById('route-type-label');
  if (routeTypeLabel) routeTypeLabel.textContent = t('sidebarRouteType');
  const mapStyleLabel = document.getElementById('map-style-label');
  if (mapStyleLabel) mapStyleLabel.textContent = t('sidebarMapStyle');
  const serviceLabel = document.querySelector('.service-selector-label');
  if (serviceLabel) serviceLabel.textContent = t('sidebarServiceCalendar');
  const routeSearch = document.getElementById('route-filter-inp');
  if (routeSearch) routeSearch.placeholder = t('sidebarRouteSearch');
  const stopSearch = document.getElementById('stop-list-filter');
  if (stopSearch) stopSearch.placeholder = t('sidebarStopSearch');
  const toggleAnim = document.querySelector('label[for="tog-anim"], #tog-anim')?.closest('.tog-row');
  const togglePaths = document.querySelector('label[for="tog-paths"], #tog-paths')?.closest('.tog-row');
  const toggleStopsEl = document.querySelector('label[for="tog-stops"], #tog-stops')?.closest('.tog-row');
  const toggleConnectivityGridEl = document.querySelector('label[for="tog-connectivity-grid"], #tog-connectivity-grid')?.closest('.tog-row');
  const toggleStopCoverageEl = document.querySelector('label[for="tog-stop-coverage"], #tog-stop-coverage')?.closest('.tog-row');
  const toggleHeatmapEl = document.querySelector('label[for="tog-heatmap"], #tog-heatmap')?.closest('.tog-row');
  const toggleTrailEl = document.querySelector('label[for="tog-trail"], #tog-trail')?.closest('.tog-row');
  const toggleHeadwayEl = document.querySelector('label[for="tog-headway"], #tog-headway')?.closest('.tog-row');
  const toggleBunchingEl = document.querySelector('label[for="tog-bunching"], #tog-bunching')?.closest('.tog-row');
  const toggleIsochronEl = document.querySelector('label[for="tog-isochron"], #tog-isochron')?.closest('.tog-row');
  const isochronTitle = document.getElementById('isochron-title');
  const isochronHint = document.getElementById('isochron-hint');
  const isochronLegend15 = document.getElementById('isochron-legend-15');
  const isochronLegend30 = document.getElementById('isochron-legend-30');
  const isochronLegend45 = document.getElementById('isochron-legend-45');
  const isochronLegend60 = document.getElementById('isochron-legend-60');
  if (toggleAnim) toggleAnim.lastChild.textContent = t('toggleAnimation');
  if (togglePaths) togglePaths.lastChild.textContent = t('togglePaths');
  if (toggleStopsEl) toggleStopsEl.lastChild.textContent = t('toggleStops');
  if (toggleConnectivityGridEl) toggleConnectivityGridEl.lastChild.textContent = t('toggleConnectivityGrid');
  if (toggleStopCoverageEl) toggleStopCoverageEl.lastChild.textContent = t('toggleStopCoverage');
  const stopCoverageRadiusLabel = document.getElementById('stop-coverage-radius-label');
  if (stopCoverageRadiusLabel) stopCoverageRadiusLabel.textContent = t('stopCoverageRadius');
  const stopCoverageModeLabel = document.getElementById('stop-coverage-mode-label');
  if (stopCoverageModeLabel) stopCoverageModeLabel.textContent = t('stopCoverageMode');
  const stopCoverageFillColorLabel = document.getElementById('stop-coverage-fill-color-label');
  if (stopCoverageFillColorLabel) stopCoverageFillColorLabel.textContent = t('stopCoverageFillColor');
  const stopCoverageFillOpacityLabel = document.getElementById('stop-coverage-fill-opacity-label');
  if (stopCoverageFillOpacityLabel) stopCoverageFillOpacityLabel.textContent = t('stopCoverageFillOpacity');
  const stopCoverageStrokeColorLabel = document.getElementById('stop-coverage-stroke-color-label');
  if (stopCoverageStrokeColorLabel) stopCoverageStrokeColorLabel.textContent = t('stopCoverageStrokeColor');
  const stopCoverageStrokeWidthLabel = document.getElementById('stop-coverage-stroke-width-label');
  if (stopCoverageStrokeWidthLabel) stopCoverageStrokeWidthLabel.textContent = t('stopCoverageStrokeWidth');
  const stopCoverageModeSelect = document.getElementById('stop-coverage-mode');
  if (stopCoverageModeSelect?.options?.length >= 3) {
    stopCoverageModeSelect.options[0].textContent = t('stopCoverageModeFillStroke');
    stopCoverageModeSelect.options[1].textContent = t('stopCoverageModeFill');
    stopCoverageModeSelect.options[2].textContent = t('stopCoverageModeStroke');
  }
  if (toggleHeatmapEl) toggleHeatmapEl.lastChild.textContent = t('toggleHeatmap');
  if (toggleTrailEl) toggleTrailEl.lastChild.textContent = t('toggleTrail');
  if (toggleHeadwayEl) toggleHeadwayEl.lastChild.textContent = t('toggleHeadway');
  if (toggleBunchingEl) toggleBunchingEl.lastChild.textContent = t('toggleBunching');
  if (toggleIsochronEl) toggleIsochronEl.lastChild.textContent = t('toggleIsochron');
  if (isochronTitle) isochronTitle.textContent = t('plannerIsochronTitle');
  if (isochronHint) isochronHint.textContent = t('plannerIsochronHint');
  if (isochronLegend15) isochronLegend15.textContent = t('plannerIsochronLegend15');
  if (isochronLegend30) isochronLegend30.textContent = t('plannerIsochronLegend30');
  if (isochronLegend45) isochronLegend45.textContent = t('plannerIsochronLegend45');
  if (isochronLegend60) isochronLegend60.textContent = t('plannerIsochronLegend60');
  const peakLabels = document.querySelectorAll('#peak-labels .peak-label');
  if (peakLabels[0]) peakLabels[0].textContent = t('peakMorning');
  if (peakLabels[1]) peakLabels[1].textContent = t('peakEvening');
  const styleButtons = document.querySelectorAll('#map-style-btns .sstyle');
  if (styleButtons[1]) styleButtons[1].textContent = t('mapStyleSatellite');
  if (styleButtons[2]) styleButtons[2].textContent = t('mapStyleDark');
  if (styleButtons[3]) styleButtons[3].textContent = t('mapStyleLight');
  document.querySelectorAll('.city-visibility-toggle span').forEach((el) => { el.textContent = t('cityVisible'); });
  const adaptedBadge = document.getElementById('calendar-adapted-badge');
  if (adaptedBadge) adaptedBadge.textContent = t('adaptedBadge');
  const gtfsSidebarBtn = document.getElementById('btn-gtfs-upload');
  if (gtfsSidebarBtn) gtfsSidebarBtn.textContent = t('landingUploadButton');
  const staticStopHeader = document.querySelector('#stop-panel .sa-head');
  if (staticStopHeader) {
    const spans = staticStopHeader.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = t('stopPanelHeaderLine');
    if (spans[1]) spans[1].textContent = t('stopPanelHeaderDirection');
    if (spans[2]) spans[2].textContent = t('stopPanelHeaderNextVehicle', 'Duration');
  }
  const cinematicBtn = document.getElementById('btn-cinematic');
  if (cinematicBtn && !document.body.classList.contains('cinematic-mode')) cinematicBtn.textContent = t('cinematicStart');
}

  function setLanguage(lang) {
  currentLanguage = lang === 'en' ? 'en' : 'tr';
  try {
    localStorage.setItem('gtfs-city-language', currentLanguage);
  } catch (_) {}
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent('app-language-change', { detail: { language: currentLanguage } }));
}

  window.I18n = {
    getLanguage,
    setLanguage,
    t,
  };

  return {
    configureRuntimeI18n,
    getLanguage,
    t,
    ensureLanguageSwitcher,
    applyStaticTranslations,
    setLanguage,
  };
})();
