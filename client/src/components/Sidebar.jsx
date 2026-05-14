import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiLogOut, FiChevronDown, FiChevronRight, FiDatabase, FiCpu } from 'react-icons/fi';
import { GiPineTree, GiAxeInLog, GiFireZone, GiTreeGrowth, GiForest, GiMagnifyingGlass } from 'react-icons/gi';
import { MdOutlineInventory, MdOutlinePeople, MdOutlineBugReport, MdOutlineSell, MdOutlineVerifiedUser, MdOutlineEnergySavingsLeaf } from 'react-icons/md';
import { TbDrone } from 'react-icons/tb';

const menuItems = [
  { type: 'header', label: 'Management' },
  { path: '/tree-inventory', label: 'Tree Inventory', icon: <GiPineTree /> },
  { path: '/harvest-plans', label: 'Harvest Plans', icon: <GiAxeInLog /> },
  { path: '/wildfire-assessments', label: 'Wildfire Assessments', icon: <GiFireZone /> },
  { path: '/carbon-credits', label: 'Carbon Credits', icon: <MdOutlineEnergySavingsLeaf /> },
  { path: '/forest-plots', label: 'Forest Plots', icon: <GiForest /> },
  { path: '/equipment', label: 'Equipment', icon: <MdOutlineInventory /> },
  { path: '/workers', label: 'Workers', icon: <MdOutlinePeople /> },
  { path: '/disease-reports', label: 'Disease Reports', icon: <MdOutlineBugReport /> },
  { path: '/timber-sales', label: 'Timber Sales', icon: <MdOutlineSell /> },
  { path: '/compliance-reports', label: 'Compliance Reports', icon: <MdOutlineVerifiedUser /> },
  { type: 'header', label: 'AI Analytics' },
  { path: '/ai/species-identification', label: 'Species Identification', icon: <GiMagnifyingGlass />, ai: true },
  { path: '/ai/harvest-optimization', label: 'Harvest Optimization', icon: <FiCpu />, ai: true },
  { path: '/ai/wildfire-risk', label: 'Wildfire Risk Analysis', icon: <GiFireZone />, ai: true },
  { path: '/ai/carbon-estimation', label: 'Carbon Estimation', icon: <MdOutlineEnergySavingsLeaf />, ai: true },
  { path: '/ai/disease-analysis', label: 'Disease Detection', icon: <MdOutlineBugReport />, ai: true },
  { path: '/ai/growth-prediction', label: 'Growth Prediction', icon: <GiTreeGrowth />, ai: true },
  { path: '/ai/disease-outbreak', label: 'Outbreak Check', icon: <MdOutlineBugReport />, ai: true },
  { path: '/ai/timber-market-alert', label: 'Market Alerts', icon: <MdOutlineSell />, ai: true },
  { path: '/ai/gis-harvest-blocks', label: 'GIS Harvest Planner', icon: <GiForest />, ai: true },
  { path: '/ai/wildfire-weather-scan', label: 'Weather Scan', icon: <GiFireZone />, ai: true },
  { path: '/ai/safety-incident-analysis', label: 'Safety Analyser', icon: <MdOutlinePeople />, ai: true },
  { path: '/ai/equipment-maintenance', label: 'Equipment Maintenance', icon: <MdOutlineInventory />, ai: true },
  { path: '/ai/reforestation-plan', label: 'Reforestation Plan', icon: <GiTreeGrowth />, ai: true },
  { path: '/ai/compliance-review', label: 'Compliance Review', icon: <MdOutlineVerifiedUser />, ai: true },
  { type: 'header', label: 'Operations' },
  { path: '/safety-incidents', label: 'Safety Incidents', icon: <MdOutlinePeople /> },
  { path: '/market-prices', label: 'Market Prices', icon: <MdOutlineSell /> },
  { path: '/ai-results', label: 'AI Results', icon: <FiCpu /> },
];

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <GiPineTree size={28} />
          <div>
            <h1>ForestAI</h1>
            <span>Timber Management</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <FiHome /> <span>Dashboard</span>
        </div>

        {menuItems.map((item, i) => {
          if (item.type === 'header') {
            return <div key={i} className="nav-header">{item.label}</div>;
          }
          return (
            <div
              key={item.path}
              className={`nav-item ${item.ai ? 'ai-item' : ''} ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon} <span>{item.label}</span>
            </div>
          );
        })}
      
        {/* // === Batch 04 Gaps & Frontend Mounts === */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <a href="/cf-agentic-forest-planning-multi-agent-syst" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Agentic forest planning</a>
        <a href="/cf-drone-fused-canopy-cv-extend-canopy" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Drone-fused canopy CV</a>
        <a href="/cf-buyer-demand-matching-predictive-marketp" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Buyer-demand matching</a>
        <a href="/cf-real-time-mqtt-broker-integration-for" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Real-time MQTT broker integration for ha</a>
        <a href="/cf-regulatory-rag-assistant-over-usfsstate-" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Regulatory RAG assistant over USFS/state</a>
        <a href="/cf-carbon-market-arbitrage-compares-verra-v" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Carbon-market arbitrage</a>
        <a href="/gap-no-dedicated-wildfire-spread-simulation-" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No dedicated wildfire-spread-simulation </a>
        <a href="/gap-no-vendorsupplier-matching-ai-only-telem" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No vendor/supplier matching AI (only tel</a>
        <a href="/gap-no-labor-scheduling-ai-for-field" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No labor scheduling AI for field crews</a>
        <a href="/gap-no-soprag-over-forestry-regulations-defe" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No SOP/RAG over forestry regulations (de</a>
        <a href="/gap-no-modular-tree-inventory-crud-only" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No modular tree-inventory CRUD (only inf</a>
        <a href="/gap-no-teamshift-scheduling-for-field-operat" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No team/shift scheduling for field opera</a>
        <a href="/gap-no-equipment-fleet-crud-beyond-predictiv" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No equipment-fleet CRUD beyond predictiv</a>
        <a href="/gap-no-cost-tracking-pl-module" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No cost tracking / P&L module</a>
        <a href="/gap-no-real-iot-mqtt-broker-telemetry" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No real IoT MQTT broker — telemetry endp</a>
        <a href="/gap-monolithic-structure-makes-route-discove" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Monolithic structure makes route discove</a>
        </div>
</nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <FiLogOut /> Logout
        </button>
      </div>
    </aside>
  );
}
