import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GiPineTree, GiAxeInLog, GiFireZone, GiForest, GiTreeGrowth, GiMagnifyingGlass } from 'react-icons/gi';
import { MdOutlineInventory, MdOutlinePeople, MdOutlineBugReport, MdOutlineSell, MdOutlineVerifiedUser, MdOutlineEnergySavingsLeaf } from 'react-icons/md';
import { FiCpu, FiTrendingUp } from 'react-icons/fi';

const featureCards = [
  { path: '/tree-inventory', title: 'Tree Inventory', desc: 'Track and manage tree species across all forest plots', icon: <GiPineTree size={32} />, color: '#16a34a', stat: 'totalTrees' },
  { path: '/harvest-plans', title: 'Harvest Plans', desc: 'Sustainable timber harvest planning and scheduling', icon: <GiAxeInLog size={32} />, color: '#ca8a04', stat: 'totalHarvestPlans' },
  { path: '/wildfire-assessments', title: 'Wildfire Assessments', desc: 'Risk modeling and fire prevention strategies', icon: <GiFireZone size={32} />, color: '#dc2626', stat: 'highRiskWildfires' },
  { path: '/carbon-credits', title: 'Carbon Credits', desc: 'Carbon sequestration tracking and credit management', icon: <MdOutlineEnergySavingsLeaf size={32} />, color: '#0891b2', stat: 'totalCarbonCredits' },
  { path: '/forest-plots', title: 'Forest Plots', desc: 'Manage forest regions, plots, and land surveys', icon: <GiForest size={32} />, color: '#15803d', stat: 'totalPlots' },
  { path: '/equipment', title: 'Equipment', desc: 'Track forestry equipment, maintenance, and assignments', icon: <MdOutlineInventory size={32} />, color: '#7c3aed', stat: 'totalEquipment' },
  { path: '/workers', title: 'Workers', desc: 'Manage crew assignments, certifications, and safety', icon: <MdOutlinePeople size={32} />, color: '#2563eb', stat: 'totalWorkers' },
  { path: '/disease-reports', title: 'Disease Reports', desc: 'Monitor tree diseases, pests, and treatment plans', icon: <MdOutlineBugReport size={32} />, color: '#ea580c', stat: 'totalDiseaseReports' },
  { path: '/timber-sales', title: 'Timber Sales', desc: 'Sales records, buyer management, and revenue tracking', icon: <MdOutlineSell size={32} />, color: '#0d9488', stat: null },
  { path: '/compliance-reports', title: 'Compliance', desc: 'Regulatory compliance, certifications, and audits', icon: <MdOutlineVerifiedUser size={32} />, color: '#4f46e5', stat: null },
];

const aiCards = [
  { path: '/ai/species-identification', title: 'AI Species Identification', desc: 'Identify tree species from descriptions using AI analysis', icon: <GiMagnifyingGlass size={32} />, color: '#16a34a' },
  { path: '/ai/harvest-optimization', title: 'AI Harvest Optimization', desc: 'AI-powered sustainable harvest planning and yield optimization', icon: <FiCpu size={32} />, color: '#ca8a04' },
  { path: '/ai/wildfire-risk', title: 'AI Wildfire Analysis', desc: 'Advanced AI risk assessment and prevention strategies', icon: <GiFireZone size={32} />, color: '#dc2626' },
  { path: '/ai/carbon-estimation', title: 'AI Carbon Estimation', desc: 'Estimate carbon sequestration and credit potential with AI', icon: <MdOutlineEnergySavingsLeaf size={32} />, color: '#0891b2' },
  { path: '/ai/disease-analysis', title: 'AI Disease Detection', desc: 'AI-powered tree disease diagnosis and treatment recommendations', icon: <MdOutlineBugReport size={32} />, color: '#ea580c' },
  { path: '/ai/growth-prediction', title: 'AI Growth Prediction', desc: 'Predict tree growth patterns and optimal rotation timing', icon: <GiTreeGrowth size={32} />, color: '#7c3aed' },
];

export default function Dashboard({ token }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});

  useEffect(() => {
    axios.get('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setStats(res.data)).catch(console.error);
  }, [token]);

  const formatStat = (key) => {
    if (!key || !stats[key]) return null;
    const val = stats[key];
    if (key === 'totalCarbonCredits') return `${val.toLocaleString()} tCO2`;
    if (key === 'highRiskWildfires') return `${val} High Risk`;
    return val.toLocaleString();
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>AI-Powered Forestry & Timber Management Platform</p>
      </div>

      <div className="section-title">
        <FiDatabase size={20} /> Management Features
      </div>
      <div className="card-grid">
        {featureCards.map(card => (
          <div key={card.path} className="feature-card" onClick={() => navigate(card.path)}>
            <div className="card-icon" style={{ background: `${card.color}15`, color: card.color }}>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            {card.stat && stats[card.stat] !== undefined && (
              <div className="card-stat" style={{ color: card.color }}>
                {formatStat(card.stat)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="section-title ai-section-title">
        <FiCpu size={20} /> AI-Powered Analytics
      </div>
      <div className="card-grid">
        {aiCards.map(card => (
          <div key={card.path} className="feature-card ai-card" onClick={() => navigate(card.path)}>
            <div className="ai-badge">AI</div>
            <div className="card-icon" style={{ background: `${card.color}15`, color: card.color }}>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiDatabase(props) {
  return <MdOutlineInventory {...props} />;
}
