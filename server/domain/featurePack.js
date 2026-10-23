'use strict';
// Feature pack wave 35B — pure helpers (no DB/network), unit-testable.
const TREE_COLUMNS = ['id', 'species', 'location', 'height_m', 'diameter_cm', 'age_years', 'health_status', 'canopy_cover_pct'];
const norm = (v) => String(v ?? '').trim().toLowerCase();
function filterTrees(records, filters = {}) {
  const list = Array.isArray(records) ? records : [];
  const search = norm(filters.search); const health = norm(filters.health_status); const species = norm(filters.species);
  return list.filter((r) => {
    if (health && norm(r.health_status) !== health) return false;
    if (species && norm(r.species) !== species) return false;
    if (search && ![r.species, r.location, r.health_status].map(norm).join(' ').includes(search)) return false;
    return true;
  });
}
function esc(v) { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(records, columns = TREE_COLUMNS) { const list = Array.isArray(records) ? records : []; return [columns.join(','), ...list.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n'); }
function toJsonExport(records) { return { exported_at: new Date().toISOString(), count: (records || []).length, data: records || [] }; }
function renderAiSections(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result).filter(([k]) => k !== 'source' && k !== 'label').map(([key, value]) => {
    let display;
    if (value === null || value === undefined) display = '';
    else if (Array.isArray(value)) display = value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(none)';
    else if (typeof value === 'object') display = JSON.stringify(value);
    else display = String(value);
    return { label: key, value: display };
  });
}
function hasAiKey(env = process.env) { return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY); }
function buildFallback(feature, records) {
  const list = Array.isArray(records) ? records : [];
  const base = { source: 'fallback', aiGenerated: false, label: 'Deterministic fallback (no AI provider configured)' };
  if (feature === 'health-risk-summary') {
    const poor = list.filter((r) => ['poor', 'diseased', 'dead'].includes(norm(r.health_status)));
    return { ...base, feature, total_trees: list.length, at_risk_count: poor.length, has_at_risk: poor.length > 0, items: poor.map((r) => `${r.species} at ${r.location ?? ''} (${r.health_status ?? ''})`) };
  }
  if (feature === 'harvest-readiness') {
    const mature = list.filter((r) => Number(r.age_years || 0) >= 20);
    return { ...base, feature, total_trees: list.length, mature_count: mature.length, has_mature: mature.length > 0, candidates: mature.map((r) => `${r.species} age ${r.age_years ?? 0}`) };
  }
  const bySpecies = {}; for (const r of list) bySpecies[r.species || 'unknown'] = (bySpecies[r.species || 'unknown'] || 0) + 1;
  return { ...base, feature: 'stand-summary', total_trees: list.length, zero_height_count: list.filter((r) => Number(r.height_m || 0) === 0).length, average_height_m: list.length ? list.reduce((s, r) => s + Number(r.height_m || 0), 0) / list.length : 0, by_species: bySpecies };
}
module.exports = { TREE_COLUMNS, filterTrees, toCsv, toJsonExport, renderAiSections, hasAiKey, buildFallback, AI_FEATURES: ['stand-summary', 'health-risk-summary', 'harvest-readiness'] };
