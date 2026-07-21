'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const{evaluateFieldPlan}=require('../domain/fieldPlan');
const valid={region:'north',season:'summer',observations:[{id:'o1',observedAt:'2026-01-01',species:'pine',sourceType:'field',sourceRef:'field:1',operatorId:'op1',confidence:.8,alertType:'disease'}],workOrders:[{id:'w1',safetyBriefingRef:'brief:1',conditions:{windKph:10,fireDanger:'low'}}],safetyLimits:{maxWindKph:30}};
test('creates traceable advisory alerts',()=>{const x=evaluateFieldPlan(valid);assert.deepEqual(x.errors,[]);assert.equal(x.result.alerts[0].advisoryOnly,true);assert.equal(x.result.decision,'reviewable')});
test('blocks unsafe field work',()=>{const x=evaluateFieldPlan({...valid,workOrders:[{id:'w',conditions:{windKph:40}}]});assert.deepEqual(x.result.blockedWorkOrderIds,['w']);assert.equal(x.result.decision,'revise')});
test('requires provenance and bounded confidence',()=>{const x=evaluateFieldPlan({...valid,observations:[{...valid.observations[0],sourceRef:null,confidence:2}]});assert.ok(x.errors.length>=2)});
