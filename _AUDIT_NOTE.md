# Audit Apply Notes — AIForestryTimberManagement

Audit source: `_AUDIT/reports/batch_04.md` (#1). Audit verdict: skeleton, 0 routes, 0 AI endpoints.

## Reality check

Audit is materially out of date. `server/index.js` already has 12+ AI endpoints:
- `/ai/species-identification`
- `/ai/harvest-optimization`
- `/ai/wildfire-risk`
- `/ai/wildfire-weather-scan`
- `/ai/carbon-estimation`
- `/ai/disease-analysis`
- `/ai/disease-outbreak-check`
- `/ai/growth-prediction`
- `/ai/timber-market-alert`
- `/ai/gis-harvest-blocks`
- `/ai/safety-incident-analysis`

So all four audit gaps are effectively present except `/equipment-maintenance-ai`.

## Implementation applied

1. Added `POST /api/ai/equipment-maintenance` to `server/index.js`.
   - Pulls equipment + recent maintenance + downtime; AI returns predicted failures, prioritized actions, spare-parts list, operator training topics, next service date.
   - DB queries are `.catch`-wrapped to be schema-tolerant.
   - Persists via existing `persistAIResult`.
   - Syntax-checked.

## Backlog (prioritized)

### Mechanical
- Refactor monolithic `server/index.js` (666 lines) into a `routes/` directory for maintainability.
- Add CRUD endpoints for tree_inventory, harvest_plans (some exist via `app.post(...)` factory).

### Needs creds / external
- Satellite/drone imagery integration (multi-modal AI).
- Real-time weather feed.
- Verra/Gold Standard carbon credit registries.

### Needs product decision
- Permit/certification compliance workflow.
- Field-to-mill blockchain traceability.

### Custom features
- Computer vision canopy health from drone imagery.
- Real-time IoT telemetry from harvesters.
- Carbon credit calculator backed by registry APIs.

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- **Stack:** Vite-React + Express (monolithic `server/index.js`).
- `client/src/App.jsx` already maps every backend AI endpoint to a route:
  - `AIVisionPage` for `/ai/species-identification` and `/ai/disease-analysis`.
  - `FeaturePage` (with `isAI` flag) for `/ai/harvest-optimization`, `/ai/wildfire-risk`, `/ai/carbon-estimation`, `/ai/growth-prediction`.
  - `AIToolsPage` for `/ai/disease-outbreak`, `/ai/timber-market-alert`, `/ai/gis-harvest-blocks`, `/ai/wildfire-weather-scan`, `/ai/safety-incident-analysis`.
  - `AIEquipmentMaintenance` for the apply-pass-2 endpoint `/ai/equipment-maintenance`.
- All pages call axios with `Authorization: Bearer ${localStorage.getItem('token')}`.

## Apply pass 4 (mechanical backlog)

Two additional AI endpoints added to `server/index.js`. Both:
- 503 short-circuit when `OPENROUTER_API_KEY` is unset
- `authenticateToken` + `aiRateLimiter` middleware (existing pattern)
- DB queries `.catch`-wrapped to be schema-tolerant
- Use existing `callOpenRouter` + `parseAIJson` + `persistAIResult` helpers

1. `POST /api/ai/reforestation-plan` — input `{ plot_id?, target_year?, climate_notes? }`. Reads `forest_plots`, `harvest_plans`, `tree_inventory` species mix; LLM returns species mix, planting phases, monitoring schedule, biodiversity targets, carbon sequestration estimate.
2. `POST /api/ai/compliance-review` — input `{ report_id?, jurisdiction? }`. Reads target `compliance_reports` row plus recent reports and 180-day safety incidents; LLM returns findings (with severity), missing documents, regulatory risks, next audit actions.

Frontend:
- `client/src/pages/AIToolsPage.jsx` extended with two new entries in `toolConfigs` (`reforestation-plan`, `compliance-review`).
- `client/src/App.jsx` — two new `<Route>` entries (`/ai/reforestation-plan`, `/ai/compliance-review`) using existing `AIToolsPage` component.
- `client/src/components/Sidebar.jsx` — two new nav items under "AI Analytics".

Smoke test: server started on port 3095 (helmet/express-rate-limit stubbed via `--require` because `node_modules` for those two deps is incomplete and pass forbids `npm install`). Logged in as `admin@forestry.com / admin123` (HTTP 200, JWT received). `POST /api/ai/reforestation-plan` reached the new handler (passed auth + rate-limit), then OpenRouter rejected the placeholder API key in the project `.env` (`OPENROUTER_API_KEY=your_…`) — returned upstream "Missing Authentication header". Route is correctly registered (verified by both static grep and live HTTP routing).

Constraints honored: no `npm install`, no new deps, no edits to working code outside the additions. Syntax-checked: `node --check` (server) and `@babel/parser` with `jsx` plugin (App.jsx, AIToolsPage.jsx, Sidebar.jsx).
