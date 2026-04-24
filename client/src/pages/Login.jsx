import React, { useState } from 'react';
import axios from 'axios';
import { GiPineTree } from 'react-icons/gi';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const populateCredentials = () => {
    setEmail('admin@forestry.com');
    setPassword('admin123');
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-overlay"></div>
      </div>
      <div className="login-card">
        <div className="login-header">
          <GiPineTree size={48} color="#16a34a" />
          <h1>ForestAI</h1>
          <p>AI Forestry & Timber Management Platform</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" className="demo-btn" onClick={populateCredentials}>
            Use Demo Credentials
          </button>
        </form>
      </div>
    </div>
  );
}
