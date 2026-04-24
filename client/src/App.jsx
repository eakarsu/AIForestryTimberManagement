import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import Sidebar from './components/Sidebar';

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
            <Route path="/ai/species-identification" element={<FeaturePage token={token} feature="ai-species" title="AI Species Identification" isAI />} />
            <Route path="/ai/harvest-optimization" element={<FeaturePage token={token} feature="ai-harvest" title="AI Harvest Optimization" isAI />} />
            <Route path="/ai/wildfire-risk" element={<FeaturePage token={token} feature="ai-wildfire" title="AI Wildfire Risk Analysis" isAI />} />
            <Route path="/ai/carbon-estimation" element={<FeaturePage token={token} feature="ai-carbon" title="AI Carbon Credit Estimation" isAI />} />
            <Route path="/ai/disease-analysis" element={<FeaturePage token={token} feature="ai-disease" title="AI Disease Detection" isAI />} />
            <Route path="/ai/growth-prediction" element={<FeaturePage token={token} feature="ai-growth" title="AI Growth Prediction" isAI />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
