import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIToolsPage, { AIVisionPage } from './pages/AIToolsPage';
import AIEquipmentMaintenance from './pages/AIEquipmentMaintenance';
import CrewWeatherSafety from './pages/CrewWeatherSafety';
import Sidebar from './components/Sidebar';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticForestPlanningMultiAgentSyst from './pages/CfAgenticForestPlanningMultiAgentSyst';
import CfDroneFusedCanopyCvExtendCanopy from './pages/CfDroneFusedCanopyCvExtendCanopy';
import CfBuyerDemandMatchingPredictiveMarketp from './pages/CfBuyerDemandMatchingPredictiveMarketp';
import CfRealTimeMqttBrokerIntegrationFor from './pages/CfRealTimeMqttBrokerIntegrationFor';
import CfRegulatoryRagAssistantOverUsfsstate from './pages/CfRegulatoryRagAssistantOverUsfsstate';
import CfCarbonMarketArbitrageComparesVerraV from './pages/CfCarbonMarketArbitrageComparesVerraV';
import GapNoDedicatedWildfireSpreadSimulation from './pages/GapNoDedicatedWildfireSpreadSimulation';
import GapNoVendorsupplierMatchingAiOnlyTelem from './pages/GapNoVendorsupplierMatchingAiOnlyTelem';
import GapNoLaborSchedulingAiForField from './pages/GapNoLaborSchedulingAiForField';
import GapNoSopragOverForestryRegulationsDefe from './pages/GapNoSopragOverForestryRegulationsDefe';
import GapNoModularTreeInventoryCrudOnly from './pages/GapNoModularTreeInventoryCrudOnly';
import GapNoTeamshiftSchedulingForFieldOperat from './pages/GapNoTeamshiftSchedulingForFieldOperat';
import GapNoEquipmentFleetCrudBeyondPredictiv from './pages/GapNoEquipmentFleetCrudBeyondPredictiv';
import GapNoCostTrackingPlModule from './pages/GapNoCostTrackingPlModule';
import GapNoRealIotMqttBrokerTelemetry from './pages/GapNoRealIotMqttBrokerTelemetry';
import GapMonolithicStructureMakesRouteDiscove from './pages/GapMonolithicStructureMakesRouteDiscove';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/tree-inventory" element={<FeaturePage token={token} feature="tree-inventory" title="Tree Inventory" />} />
            <Route path="/harvest-plans" element={<FeaturePage token={token} feature="harvest-plans" title="Sustainable Harvest Plans" />} />
            <Route path="/wildfire-assessments" element={<FeaturePage token={token} feature="wildfire-assessments" title="Wildfire Risk Assessments" />} />
            <Route path="/carbon-credits" element={<FeaturePage token={token} feature="carbon-credits" title="Carbon Credit Tracking" />} />
            <Route path="/forest-plots" element={<FeaturePage token={token} feature="forest-plots" title="Forest Plot Management" />} />
            <Route path="/equipment" element={<FeaturePage token={token} feature="equipment" title="Equipment Management" />} />
            <Route path="/workers" element={<FeaturePage token={token} feature="workers" title="Worker Management" />} />
            <Route path="/disease-reports" element={<FeaturePage token={token} feature="disease-reports" title="Disease Reports" />} />
            <Route path="/timber-sales" element={<FeaturePage token={token} feature="timber-sales" title="Timber Sales" />} />
            <Route path="/compliance-reports" element={<FeaturePage token={token} feature="compliance-reports" title="Compliance Reports" />} />
            <Route path="/safety-incidents" element={<FeaturePage token={token} feature="safety-incidents" title="Safety Incidents" />} />
            <Route path="/market-prices" element={<FeaturePage token={token} feature="market-prices" title="Market Prices" />} />
            <Route path="/ai-results" element={<FeaturePage token={token} feature="ai-results" title="AI Results Audit" />} />
            <Route path="/ai/species-identification" element={<AIVisionPage token={token} kind="species" />} />
            <Route path="/ai/harvest-optimization" element={<FeaturePage token={token} feature="ai-harvest" title="AI Harvest Optimization" isAI />} />
            <Route path="/ai/wildfire-risk" element={<FeaturePage token={token} feature="ai-wildfire" title="AI Wildfire Risk Analysis" isAI />} />
            <Route path="/ai/carbon-estimation" element={<FeaturePage token={token} feature="ai-carbon" title="AI Carbon Credit Estimation" isAI />} />
            <Route path="/ai/disease-analysis" element={<AIVisionPage token={token} kind="disease" />} />
            <Route path="/ai/growth-prediction" element={<FeaturePage token={token} feature="ai-growth" title="AI Growth Prediction" isAI />} />
            <Route path="/ai/disease-outbreak" element={<AIToolsPage token={token} tool="disease-outbreak" />} />
            <Route path="/ai/timber-market-alert" element={<AIToolsPage token={token} tool="timber-market-alert" />} />
            <Route path="/ai/gis-harvest-blocks" element={<AIToolsPage token={token} tool="gis-harvest-blocks" />} />
            <Route path="/ai/wildfire-weather-scan" element={<AIToolsPage token={token} tool="wildfire-weather-scan" />} />
            <Route path="/ai/safety-incident-analysis" element={<AIToolsPage token={token} tool="safety-incident-analysis" />} />
            <Route path="/ai/equipment-maintenance" element={<AIEquipmentMaintenance token={token} />} />
            <Route path="/ai/reforestation-plan" element={<AIToolsPage token={token} tool="reforestation-plan" />} />
            <Route path="/ai/compliance-review" element={<AIToolsPage token={token} tool="compliance-review" />} />
            <Route path="/crew-weather-safety" element={<CrewWeatherSafety token={token} />} />
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-forest-planning-multi-agent-syst" element={<CfAgenticForestPlanningMultiAgentSyst />} />
          <Route path="/cf-drone-fused-canopy-cv-extend-canopy" element={<CfDroneFusedCanopyCvExtendCanopy />} />
          <Route path="/cf-buyer-demand-matching-predictive-marketp" element={<CfBuyerDemandMatchingPredictiveMarketp />} />
          <Route path="/cf-real-time-mqtt-broker-integration-for" element={<CfRealTimeMqttBrokerIntegrationFor />} />
          <Route path="/cf-regulatory-rag-assistant-over-usfsstate-" element={<CfRegulatoryRagAssistantOverUsfsstate />} />
          <Route path="/cf-carbon-market-arbitrage-compares-verra-v" element={<CfCarbonMarketArbitrageComparesVerraV />} />
          <Route path="/gap-no-dedicated-wildfire-spread-simulation-" element={<GapNoDedicatedWildfireSpreadSimulation />} />
          <Route path="/gap-no-vendorsupplier-matching-ai-only-telem" element={<GapNoVendorsupplierMatchingAiOnlyTelem />} />
          <Route path="/gap-no-labor-scheduling-ai-for-field" element={<GapNoLaborSchedulingAiForField />} />
          <Route path="/gap-no-soprag-over-forestry-regulations-defe" element={<GapNoSopragOverForestryRegulationsDefe />} />
          <Route path="/gap-no-modular-tree-inventory-crud-only" element={<GapNoModularTreeInventoryCrudOnly />} />
          <Route path="/gap-no-teamshift-scheduling-for-field-operat" element={<GapNoTeamshiftSchedulingForFieldOperat />} />
          <Route path="/gap-no-equipment-fleet-crud-beyond-predictiv" element={<GapNoEquipmentFleetCrudBeyondPredictiv />} />
          <Route path="/gap-no-cost-tracking-pl-module" element={<GapNoCostTrackingPlModule />} />
          <Route path="/gap-no-real-iot-mqtt-broker-telemetry" element={<GapNoRealIotMqttBrokerTelemetry />} />
          <Route path="/gap-monolithic-structure-makes-route-discove" element={<GapMonolithicStructureMakesRouteDiscove />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
