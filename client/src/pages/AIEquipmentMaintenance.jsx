
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import NativeAIControls from "../components/NativeAIControls";
import useNativeAIRequest from "../components/useNativeAIRequest";
import FormattedAIReport from "../components/FormattedAIReport";
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
  const fullAIExamples = useFullAIExamples();

  const nativeAIRequest = useNativeAIRequest();

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
      const res = await nativeAIRequest.run((signal) => axios.post('/api/ai/equipment-maintenance', body, { ...({ headers: { Authorization: `Bearer ${token}` } }), ...({ signal }) }));
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  return (
    <NativeAIControls busy={nativeAIRequest.busy} onCancel={nativeAIRequest.cancel} context="Forestry Timber Management"><div data-full-ai-workspace="AIEquipmentMaintenance"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} /><div className="feature-page">
      <div className="page-header">
        <h1>AI Equipment Maintenance</h1>
        <p>Predicted failures, prioritized actions, spare-parts list, operator training topics, and next service date.</p>
      </div>

      <div className="ai-container">
        <div className="ai-input-section">
          <div className="form-group">
            <label>Equipment ID (optional)</label>
            <input data-ai-field="equipment_id"
              type="number"
              value={form.equipment_id}
              placeholder="Leave blank to scan all equipment"
              onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: form.equipment_id, change: (e) => setForm({ ...form, equipment_id: e.target.value }), label: "form.equipment_id", manual: false, json: false, sample: '' }, "p1-2076", undefined)}
            />
          </div>

          <div className="form-group">
            <label>Lookback (days)</label>
            <input data-ai-field="lookback_days"
              type="number"
              min="1"
              value={form.lookback_days}
              onChange={(e) => setForm({ ...form, lookback_days: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: form.lookback_days, change: (e) => setForm({ ...form, lookback_days: e.target.value }), label: "form.lookback_days", manual: false, json: false, sample: 90 }, "p1-2452", undefined)}
            />
          </div>

          <div className="form-group">
            <label>Notes / known issues</label>
            <textarea data-ai-field="notes"
              rows={3}
              value={form.notes}
              placeholder="Symptoms, recent failures, weather conditions..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: form.notes, change: (e) => setForm({ ...form, notes: e.target.value }), label: "form.notes", manual: false, json: false, sample: '' }, "p1-2796", undefined)}
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
                  <FormattedAIReport response={result.parsed} />
                ) : <FormattedAIReport response={result} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div></div></NativeAIControls>
  );
}
