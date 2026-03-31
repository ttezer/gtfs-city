# GTFS City

GTFS City is a GTFS viewer and transit analysis tool for loading GTFS ZIP data and exploring a transit network. It provides the full Electron desktop workflow and a free web demo for lightweight access in the browser.

Turkish README: [README.md](./README.md)

## Highlights

- single active GTFS dataset
- upload-first startup flow
- route, stop, and vehicle detail panels
- headway, waiting time, density, and coverage layers
- HTTPS GTFS ZIP loading support inside `Electron`

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
