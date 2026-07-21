'use strict';

function evaluateFieldPlan(input = {}) {
  const errors = [];
  const observations = Array.isArray(input.observations) ? input.observations : [];
  const workOrders = Array.isArray(input.workOrders) ? input.workOrders : [];
  if (!input.region || !input.season) errors.push('region and season are required');
  if (!observations.length) errors.push('observations is required');
  const allowedSources = new Set(['field', 'sensor', 'lab', 'gis', 'weather', 'remote-sensing']);
  const trace = observations.map((observation) => {
    const issues = [];
    if (!observation.id || !observation.observedAt || !observation.species) issues.push('id, observedAt, and species are required');
    if (!allowedSources.has(observation.sourceType)) issues.push('sourceType is not recognized');
    if (!observation.sourceRef || !observation.operatorId) issues.push('sourceRef and operatorId are required');
    const confidence = Number(observation.confidence);
    if (!(confidence >= 0 && confidence <= 1)) issues.push('confidence must be between 0 and 1');
    errors.push(...issues.map((issue) => `observation ${observation.id || '?'}: ${issue}`));
    return { observationId: observation.id, sourceRef: observation.sourceRef, issues };
  });
  const safetyBlocks = workOrders.filter((order) => {
    const wind = Number(order.conditions?.windKph || 0);
    const fireDanger = String(order.conditions?.fireDanger || '').toLowerCase();
    return wind > Number(input.safetyLimits?.maxWindKph ?? 30) || ['extreme', 'catastrophic'].includes(fireDanger) || !order.safetyBriefingRef;
  }).map((order) => order.id);
  const alerts = observations.filter((observation) => Number(observation.confidence) >= 0.7 && observation.alertType)
    .map((observation) => ({ observationId: observation.id, alertType: observation.alertType, advisoryOnly: true }));
  return {
    errors,
    result: {
      trace,
      alerts,
      blockedWorkOrderIds: safetyBlocks,
      workOrderCount: workOrders.length,
      decision: !errors.length && !safetyBlocks.length ? 'reviewable' : 'revise'
    },
    assumptions: ['regional rules must be supplied as versioned references', 'alerts are advisory until expert review'],
    uncertainty: { regionValidated: false, seasonalOutcomeMonitoringRequired: true, expertApprovalRequired: true }
  };
}

module.exports = { evaluateFieldPlan };
