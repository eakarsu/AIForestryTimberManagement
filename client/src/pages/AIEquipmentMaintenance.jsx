import React, { useState } from 'react';
import axios from 'axios';
import { FiSend, FiLoader } from 'react-icons/fi';

/**
 * Frontend for the new endpoint:
 *   POST /api/ai/equipment-maintenance
 *
 * Mirrors the existing AIToolsPage.jsx style: page-header, ai-container,
 * ai-input-section, ai-submit-btn, ai-result, ai-analysis classNames.
 */

export default function AIEquipmentMaintenance({ token }) {
  const [form, setForm] = useState({
    equipment_id: '',
    lookback_days: 90,
    notes: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = {
        equipment_id: form.equipment_id ? Number(form.equipment_id) : undefined,
        lookback_days: form.lookback_days ? Number(form.lookback_days) : undefined,
        notes: form.notes || undefined,
      };
      const res = await axios.post(
        '/api/ai/equipment-maintenance',
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>AI Equipment Maintenance</h1>
        <p>Predicted failures, prioritized actions, spare-parts list, operator training topics, and next service date.</p>
      </div>

      <div className="ai-container">
        <div className="ai-input-section">
          <div className="form-group">
            <label>Equipment ID (optional)</label>
            <input
              type="number"
              value={form.equipment_id}
              placeholder="Leave blank to scan all equipment"
              onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Lookback (days)</label>
            <input
              type="number"
              min="1"
              value={form.lookback_days}
              onChange={(e) => setForm({ ...form, lookback_days: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Notes / known issues</label>
            <textarea
              rows={3}
              value={form.notes}
              placeholder="Symptoms, recent failures, weather conditions..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <FiLoader className="spin" /> Analyzing...
              </>
            ) : (
              <>
                <FiSend /> Run Analysis
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="ai-result">
            {result.error ? (
              <div className="ai-error">
                <h3>Error</h3>
                <p>{result.error}</p>
              </div>
            ) : (
              <div className="ai-analysis">
                <div className="ai-result-header">
                  <h3>Maintenance Recommendations</h3>
                  {result.timestamp && (
                    <span className="ai-timestamp">{new Date(result.timestamp).toLocaleString()}</span>
                  )}
                </div>
                {result.parsed ? (
                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#e2e8f0',
                      padding: 16,
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 13,
                    }}
                  >
                    {JSON.stringify(result.parsed, null, 2)}
                  </pre>
                ) : result.raw ? (
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{result.raw}</pre>
                ) : (
                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#e2e8f0',
                      padding: 16,
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 13,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
