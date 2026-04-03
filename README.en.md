# GTFS City

GTFS City is a GTFS viewer and transit analysis tool for loading GTFS ZIP data and exploring a transit network. It provides the full Electron desktop workflow and a free web demo for lightweight access in the browser.

Turkish README: [README.md](./README.md)

## Highlights

- single active GTFS dataset
- upload-first startup flow
- route, stop, and vehicle detail panels
- headway, waiting time, density, and coverage layers
- HTTPS GTFS ZIP loading support inside `Electron`
- screenshot tool with multiple export styles
- route print and stop print flows with preview / A4 output
- bundled sample dataset cards: Konya, Izmir ESHOT, Bordeaux, Gaziantep, Houston
- configurable 300 m stop coverage controls

## Recent Updates

- The `Connectivity Grid` layer was moved to the end of the toggle list and marked as beta.
- The first performance package for `Connectivity Grid` is in place: `skipWalk=true`, `maxSecs=1800`, and viewport-aware grid cache.
- The `Connectivity Grid` visual calibration was updated: colors are rescaled to the visible score distribution, and gray cells represent `not computed yet / no data`.
- Legend and status copy now explain the stricter connectivity metric and the viewport-based preparation flow more clearly.
- The Electron screenshot flow was expanded.
- Screenshot styles now include: `Original`, `Official`, `Poster`, `Blueprint`, `High Contrast`, `Transit Poster`, `Cartoon Map`, `Minimal White`, `Schematic`, `Print Friendly`, `Neo Transit`, `Vintage Metro`, `Heat Poster`, `Comic Panel`.
- Resolution selection was added to screenshot export.
- Output branding was added: `© GTFS City tarafından üretilmiştir • https://ttezer.github.io/gtfs-city/app/`
- Route print and stop print tools were added as separate buttons.
- Route print and stop print preview / A4 export flows were added.
- Route print header, visual layout, and outbound-first ordering were updated.
- Stop print layout was improved with a stop-sign style presentation, custom icon, header, and text fixes.
- The issue where old data remained in route/stop print screens after ZIP changes was fixed.
- The empty map after `Open Map` was addressed with resize and recovery logic.
- Recovery was added for WebGL context loss during print preview.
- General map/deck recovery logic was added for broader WebGL context loss scenarios.
- The unnecessary `gtfs-math-utils.js` worker import fallback warning was removed.
- The 300 m stop coverage layer now includes controls for radius, render mode, fill color, fill opacity, stroke color, and stroke width.
- The `300 m` value was clarified as radius, the layer was separated from the isochrone flow, and `radiusMinPixels` was tuned to avoid oversized circles.
- `Stop Coverage 300 m`, the screenshot tool, route/stop print tools, and sample data cards were carried into the live web demo code.
- The live web demo was checked directly; the new HTML was confirmed to be deployed, and the difference seen in a normal tab was confirmed to be a cache issue.
- The web demo cache-busting update added version parameters to `style.css`, `favicon.ico`, and local JS files in `index.html` and `docs/app/index.html`.

## Screenshots

### Landing screen

![Landing screen](./docs/screens/giris_sayfasi.jpg)

### GTFS loading example

![GTFS loading example](./docs/screens/ornek_GTFS_Konya.jpg)

### Route panel

![Route detail panel](./docs/screens/hat_bilgi.jpg)

### Stop panel

![Stop detail panel](./docs/screens/durak_bilgi.jpg)

### Vehicle panel

![Vehicle detail panel](./docs/screens/arac_bilgi.jpg)

### Isochrone analysis

![Stop-based isochrone analysis](./docs/screens/durak_bazli_izokran.jpg)

## Operating Model

- The app opens on an empty landing screen.
- The user uploads a GTFS ZIP or provides an HTTPS ZIP link.
- When the data is ready, the app moves to the workspace through `Open Map`.
- Only one loaded dataset is kept active at a time.

## Language Option

- The app opens in Turkish by default.
- To use English, select `English` from the language switcher at the top right of the landing screen.
- The language choice is stored locally and reused on the next launch.

## Setup

Requirements:

- `Node.js`
- `npm`

Install:

```bash
npm install
```

## Run

Development:

```bash
npm start
```

Tests:

```bash
npm test
```

Windows package:

```bash
npm run build:win -- --dir
```

## Usage

1. Open the app.
2. Use `Upload GTFS ZIP` to select a file, or use an HTTPS link inside Electron.
3. After loading completes, continue with `Open Map`.
4. Manage route types, visibility, and analysis layers from the left sidebar.
5. Inspect the data through route, stop, and vehicle panels.

The `Try with sample data` cards on the landing screen use bundled sample packages. Current sample set:

- Konya
- Izmir ESHOT
- Bordeaux
- Gaziantep
- Houston

## Where Should I Look?

- For bug reports: open a new record in `Issues` with the `bug` label.
- If you are looking for an existing fix: first check `hata-listesi.md`, then `CHANGELOG.md`, then related `Issues`.
- For new features: open a request in `Issues` with the `feature` label or review existing requests.
- For priorities and upcoming work: read `isplani.md` and `yol-haritasi.md`.
- For contribution and PR flow: follow `CONTRIBUTING.md`.

## Core Files

- `index.html` - UI shell
- `script.js` - orchestration and shared state
- `data-manager.js` - GTFS loading and runtime apply flow
- `city-manager.js` - active dataset card and visibility flow
- `service-manager.js` - service calendar and service filtering
- `map-manager.js` - Deck.gl layers
- `ui-manager.js` - panels and user interactions
- `simulation-engine.js` - simulation and replay loop
- `electron/main.js` / `electron/preload.js` - Electron bridge

## Documents

- `mimari.md` - technical structure
- `kontrol.md` - working rules
- `isplani.md` - current status and next work
- `yol-haritasi.md` - mid and long term roadmap headings
- `hata-listesi.md` - open bugs and data correctness issues
- `desktop-web-notu.md` - platform limitations
- `CHANGELOG.md` - short product milestones
- `CONTRIBUTING.md` - contribution flow
- `docs/` - GitHub Pages showcase files

## GitHub Pages

The static showcase page lives in the `docs/` directory.

> Note: Pages is used for the product showcase; the README does not duplicate Pages content beyond repeated setup guidance.

## Document Hierarchy

- `AGENTS.md` - workflow rules and decision memory
- `kontrol.md` - operational checklist
- `mimari.md` - technical context
- `isplani.md` - current status
- `yol-haritasi.md` - mid and long term direction
