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
