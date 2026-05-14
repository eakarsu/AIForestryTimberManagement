import React, { useState } from 'react';
import axios from 'axios';
import { GiPineTree } from 'react-icons/gi';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' ? { name, email, password } : { email, password };
      const res = await axios.post(url, body);
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || `${mode === 'register' ? 'Registration' : 'Login'} failed`);
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
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}
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
              minLength={6}
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create Account' : 'Sign In')}
          </button>
          {mode === 'login' && (
            <button type="button" className="demo-btn" onClick={populateCredentials}>
              Use Demo Credentials
            </button>
          )}
          <button type="button" className="demo-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
