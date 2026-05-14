# Apply Pass 5 — AIForestryTimberManagement

- **Date:** 2026-05-08
- **Stack:** Vite-React + Express (monolithic `server/index.js` ~813 LOC). JWT bearer (`authenticateToken`); `aiRateLimiter`; `callOpenRouter` helper.
- **Audit source:** `_AUDIT/reports/batch_04.md` #1 (skeleton, 0 routes per audit — materially out of date).

## Verified present (no new work)

- `server/index.js` already has 14 AI endpoints (pass 1-4): species-identification, harvest-optimization, wildfire-risk, carbon-estimation, disease-analysis, disease-outbreak-check, growth-prediction, timber-market-alert, gis-harvest-blocks, wildfire-weather-scan, safety-incident-analysis, equipment-maintenance (pass 2), reforestation-plan (pass 4), compliance-review (pass 4).
- `server/extensions.js` (pass 5) registers under `/api/ext`:
  1. Satellite imagery (NEEDS-CREDS: SATELLITE_PROVIDER/SATELLITE_API_KEY).
  2. Real-time weather (NEEDS-CREDS: WEATHER_API_KEY).
  3. Carbon credit registries (NEEDS-CREDS: VERRA_API_KEY/GOLD_STANDARD_API_KEY).
  4. Permit / certification workflow (PRODUCT-DECISION; additive `permit_records` table).
  5. Field-to-mill traceability (PRODUCT-DECISION; SHA-256 hash chain — not real blockchain).
  6. Canopy-health CV (TOO-RISKY; gated on AI key + SATELLITE_API_KEY).
  7. Harvester telemetry ingest (PRODUCT-DECISION).
  8. Carbon credit calculator (additive deterministic).
- FE: `client/src/pages/AIToolsPage.jsx`, `AIVisionPage.jsx`, `FeaturePage.jsx`, `AIEquipmentMaintenance.jsx` cover the AI endpoints. Sidebar entries already in place.

## Implemented (this pass)

None — pass 5 already complete with 8 backlog items in `extensions.js` (above the cap of 5; documented as such by the prior pass).

## Deferred

| Item | Category | Reason |
|------|----------|--------|
| Full vector-DB SOP RAG | NEEDS-CREDS | In-memory placeholder if needed; real vector DB not in scope. |
| Real-time IoT MQTT broker | NEEDS-CREDS | Telemetry ingest endpoint stubbed; no broker integration. |
| Satellite image inference | NEEDS-CREDS | Endpoint accepts URLs but doesn't run CV without AI key. |
| FE pages for `/api/ext/*` | NEEDS-PRODUCT-DECISION | extensions.js routes not yet surfaced in FE; requires design pass. |
| Refactor 813-line monolith into routes/ | TOO-RISKY | Touches working code; deferred. |

## Smoke test

- `node --check server/index.js` PASS.
- `node --check server/extensions.js` PASS.
- Live HTTP smoke: skipped (existing `_AUDIT_NOTE.md` already records pass-4 test on port 3095 with placeholder OPENROUTER_API_KEY producing the expected 502 from upstream).

## Notes

Cap reached prior to this pass (8 items > 5). FE coverage of `/api/ext/*` flagged as backlog.
