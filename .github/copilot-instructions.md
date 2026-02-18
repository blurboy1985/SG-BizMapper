# SG BizMapper — Copilot Instructions

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build (output: dist/)
npm run preview  # preview the production build locally
```

No test or lint scripts are configured.

## Architecture

Single-page React 18 app built with Vite. The flow is:

1. **`App.jsx`** — root; owns all shared state (`pin`, `planningArea`, `demographics`, `areaSource`, `flyTo`, `isLoading`, `error`) and coordinates the two async workflows: map-click (`handlePin`) and search (`handleSearch`).
2. **`src/components/`** — three display components, each paired with a `.css` file:
   - `Map.jsx` — react-leaflet map with OneMap tiles; emits click events up to App
   - `Dashboard.jsx` — sidebar with KPI cards, Recharts pie/bar charts, and generated SME insights
   - `Header.jsx` — app bar with search input
3. **`src/services/`** — two service modules:
   - `onemap.js` — wraps OneMap API calls (`reverseGeocode`, `searchPlace`); exports tile URL/options for Leaflet
   - `singstat.js` — all demographic data and geo-utilities; primarily offline/embedded

### Data resolution strategy (two-tier)

Every pin drop follows this chain in `App.jsx`:

1. **OneMap reverse-geocode** (`/onemap-api/…`) → extract postal code → map to planning area via `getAreaFromPostalCode`
2. If that fails (network error, expired token, no addresses in buffer): **centroid fallback** (`getNearestPlanningArea`) using Euclidean distance to hardcoded WGS-84 centroids
3. `areaSource` state tracks which path was used (`'onemap'` | `'centroid'`); `'centroid'` shows an "⚠️ Estimated area (offline mode)" warning in the Dashboard

### External API proxying

Both external APIs are proxied through Vite's dev server (configured in `vite.config.js`):

| Prefix | Target |
|---|---|
| `/onemap-api` | `https://www.onemap.gov.sg` |
| `/singstat-api` | `https://tablebuilder.singstat.gov.sg` |

In production these proxies are not present — the app must be served behind a reverse proxy or the API calls adapted.

## Key Conventions

- **Planning area names are always UPPERCASE** — all comparisons, lookups, and the `PLANNING_AREA_DATA` / `PLANNING_AREA_CENTROIDS` / `POSTAL_PREFIX_TO_AREA` constants use uppercase keys. Normalise with `.toUpperCase().trim()` before any lookup.
- **OneMap token management** — tokens expire: dev ~3 days, prod ~30 days. Renew at `https://developers.onemap.sg/`. Set via `.env`:
  - `VITE_ONEMAP_DEV_KEY` (used when `MODE !== 'production'`)
  - `VITE_ONEMAP_PROD_KEY` (used in production builds)
  - The `/search` endpoint is public (no token); only `/revgeocode` requires one.
- **Leaflet + Vite icon fix** — Leaflet's default marker icons break with Vite's asset pipeline. The fix is in `Map.jsx`: delete `L.Icon.Default.prototype._getIconUrl` and point icons at CDN URLs. Replicate this pattern for any new custom icons.
- **Embedded 2020 Census data** — demographic data lives directly in `singstat.js` (`PLANNING_AREA_DATA`). The `getDemographics` function currently returns embedded data only (a live SingStat API path is stubbed but not active). Update the embedded object when refreshing data.
- **CSS per component** — each component has a sibling `.css` file (no CSS modules, no styled-components). Global resets and CSS variables are in `src/index.css`.
- **No TypeScript** — plain `.jsx` files throughout.
