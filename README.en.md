# GTFS City

GTFS City is an Electron-based desktop analysis and visualization app for loading GTFS ZIP data and exploring a transit network.

Turkish README: [README.md](./README.md)

## Highlights

- Single active GTFS dataset
- Upload-first startup flow
- Route, stop, and vehicle detail panels
- Headway, waiting time, density, and coverage layers
- HTTPS GTFS ZIP loading support inside Electron

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
2. Upload a GTFS ZIP file or provide an HTTPS ZIP URL inside Electron.
3. After loading finishes, open the map.
4. Use the left panel to control route types, visibility, and analysis layers.
5. Inspect route, stop, and vehicle data from the detail panels.

## Where To Look

- For bugs: check `Issues` with the `bug` label and `hata-listesi.md`.
- For fixes already shipped: check `CHANGELOG.md`.
- For feature requests: check or open an `Issue` with the `feature` label.
- For roadmap and priorities: read `yol-haritasi.md` and `isplani.md`.
- For contribution flow and PR expectations: read `CONTRIBUTING.md`.

## Core Files

- `index.html` - UI shell
- `script.js` - app orchestration and shared state
- `data-manager.js` - GTFS loading and runtime apply flow
- `city-manager.js` - active dataset card and visibility flow
- `service-manager.js` - service calendar and filtering
- `map-manager.js` - Deck.gl layers
- `ui-manager.js` - panels and user interactions
- `simulation-engine.js` - simulation and replay loop
- `electron/main.js` / `electron/preload.js` - Electron bridge
