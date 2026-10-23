'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterTrees, toCsv, renderAiSections, buildFallback, hasAiKey } = require('../domain/featurePack');
const rows = [
  { id: 1, species: 'Pine', location: 'North', height_m: 0, diameter_cm: 10, age_years: 5, health_status: 'poor', canopy_cover_pct: 20 },
  { id: 2, species: 'Oak', location: 'South', height_m: 18, diameter_cm: 40, age_years: 30, health_status: 'healthy', canopy_cover_pct: 70 },
];
test('search/filter narrows trees by text, health and species', () => {
  assert.equal(filterTrees(rows, { search: 'pin' }).length, 1);
  assert.equal(filterTrees(rows, { health_status: 'healthy' })[0].species, 'Oak');
  assert.equal(filterTrees(rows, { species: 'missing' }).length, 0);
});
test('CSV export preserves 0 and escapes commas', () => {
  assert.match(toCsv(rows), /Pine,North,0/);
  assert.equal(toCsv([{ id: 1, species: 'A,B', location: 'x', height_m: 1 }]).split('\n')[1], '1,"A,B",x,1,,,,');
});
test('fallback AI is labelled aiGenerated:false and preserves false/0', () => {
  const r = buildFallback('health-risk-summary', rows);
  assert.equal(r.source, 'fallback'); assert.equal(r.aiGenerated, false); assert.equal(r.at_risk_count, 1); assert.equal(r.has_at_risk, true);
  assert.deepEqual(renderAiSections({ ok: false, count: 0, note: '' }).map((s) => s.value), ['false', '0', '']);
  assert.equal(hasAiKey({}), false); assert.equal(hasAiKey({ OPENAI_API_KEY: 'x' }), true);
});
