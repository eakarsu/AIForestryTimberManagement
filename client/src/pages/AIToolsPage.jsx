import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FiSend, FiLoader, FiImage, FiX } from 'react-icons/fi';

const toolConfigs = {
  'disease-outbreak': {
    title: 'Disease Outbreak Check',
    endpoint: '/api/ai/disease-outbreak-check',
    description: 'Scans recent disease reports and assesses outbreak risk across your operation.',
    inputs: [],
  },
  'timber-market-alert': {
    title: 'Timber Market Alert',
    endpoint: '/api/ai/timber-market-alert',
    description: 'Best-time-to-sell recommendation per harvest plan using recent market prices and sales history.',
    inputs: [
      { name: 'harvest_plan_id', label: 'Harvest Plan ID', type: 'number', placeholder: 'optional' },
    ],
  },
  'gis-harvest-blocks': {
    title: 'GIS Harvest Block Planner',
    endpoint: '/api/ai/gis-harvest-blocks',
    description: 'Designs harvest blocks respecting buffer zones and constraints. Provide plot polygon as GeoJSON.',
    inputs: [
      { name: 'plot_id', label: 'Plot ID', type: 'number' },
      { name: 'polygon_geojson', label: 'Polygon GeoJSON', type: 'textarea' },
      { name: 'buffer_zones', label: 'Buffer zones (text)', type: 'textarea' },
      { name: 'constraints', label: 'Constraints (text)', type: 'textarea' },
    ],
  },
  'wildfire-weather-scan': {
    title: 'Wildfire Weather Scan',
    endpoint: '/api/ai/wildfire-weather-scan',
    description: 'Cross-references current weather/forecast against high-risk fire zones.',
    inputs: [
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'weather', label: 'Weather payload (JSON or text)', type: 'textarea' },
    ],
  },
  'safety-incident-analysis': {
    title: 'Safety Incident Analyser',
    endpoint: '/api/ai/safety-incident-analysis',
    description: 'Clusters worker safety incidents by root cause and proposes training topics.',
    inputs: [],
  },
  'reforestation-plan': {
    title: 'Reforestation Plan',
    endpoint: '/api/ai/reforestation-plan',
    description: 'Designs a science-based replanting plan for a harvested plot, including species mix, planting phases, and monitoring schedule.',
    inputs: [
      { name: 'plot_id', label: 'Plot ID', type: 'number', placeholder: 'optional' },
      { name: 'target_year', label: 'Target completion year', type: 'number', placeholder: 'optional' },
      { name: 'climate_notes', label: 'Climate notes', type: 'textarea', placeholder: 'e.g. drought-prone, late frost risk' },
    ],
  },
  'compliance-review': {
    title: 'Compliance Review',
    endpoint: '/api/ai/compliance-review',
    description: 'Reviews compliance reports against FSC/PEFC/SFI and local regulations, classifying findings by severity and proposing remediation actions.',
    inputs: [
      { name: 'report_id', label: 'Report ID', type: 'number', placeholder: 'optional' },
      { name: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'e.g. British Columbia, EU' },
    ],
  },
};

export default function AIToolsPage({ token, tool }) {
  const cfg = toolConfigs[tool];
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = { ...form };
      if (body.weather && typeof body.weather === 'string') {
        try { body.weather = JSON.parse(body.weather); } catch (_) {}
      }
      if (body.polygon_geojson && typeof body.polygon_geojson === 'string') {
        try { body.polygon_geojson = JSON.parse(body.polygon_geojson); } catch (_) {}
      }
      const res = await axios.post(cfg.endpoint, body, { headers: { Authorization: `Bearer ${token}` } });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  if (!cfg) return <div className="feature-page"><h1>Unknown tool</h1></div>;

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{cfg.title}</h1>
        <p>{cfg.description}</p>
      </div>
      <div className="ai-container">
        <div className="ai-input-section">
          {cfg.inputs.map(input => (
            <div key={input.name} className="form-group">
              <label>{input.label}</label>
              {input.type === 'textarea' ? (
                <textarea
                  rows={4}
                  value={form[input.name] || ''}
                  placeholder={input.placeholder || ''}
                  onChange={(e) => setForm({ ...form, [input.name]: e.target.value })}
                />
              ) : (
                <input
                  type={input.type}
                  value={form[input.name] || ''}
                  placeholder={input.placeholder || ''}
                  onChange={(e) => setForm({ ...form, [input.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <><FiLoader className="spin" /> Analyzing...</> : <><FiSend /> Run Analysis</>}
          </button>
        </div>
        {result && (
          <div className="ai-result">
            {result.error ? (
              <div className="ai-error"><h3>Error</h3><p>{result.error}</p></div>
            ) : (
              <div className="ai-analysis">
                <div className="ai-result-header">
                  <h3>AI Analysis</h3>
                  {result.timestamp && <span className="ai-timestamp">{new Date(result.timestamp).toLocaleString()}</span>}
                </div>
                {result.parsed && (
                  <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                    {JSON.stringify(result.parsed, null, 2)}
                  </pre>
                )}
                {result.analysis && (
                  <div className="ai-result-content">
                    <ReactMarkdown>{result.analysis}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Vision-capable AI page (species & disease) supporting image URL list
export function AIVisionPage({ token, kind }) {
  const cfg = kind === 'species'
    ? {
        title: 'AI Species Identification (Vision)',
        endpoint: '/api/ai/species-identification',
        descLabel: 'Tree Description',
        textField: 'description',
      }
    : {
        title: 'AI Disease Detection (Vision)',
        endpoint: '/api/ai/disease-analysis',
        descLabel: 'Symptom Description',
        textField: 'symptoms',
      };

  const [text, setText] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [imageInput, setImageInput] = useState('');
  const [linkedId, setLinkedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const addUrl = () => {
    if (!imageInput.trim()) return;
    setImageUrls([...imageUrls, imageInput.trim()]);
    setImageInput('');
  };

  const removeUrl = (i) => setImageUrls(imageUrls.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body = { [cfg.textField]: text, image_urls: imageUrls };
      if (kind === 'species' && linkedId) body.tree_id = parseInt(linkedId);
      if (kind === 'disease' && linkedId) body.disease_report_id = parseInt(linkedId);
      const res = await axios.post(cfg.endpoint, body, { headers: { Authorization: `Bearer ${token}` } });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{cfg.title}</h1>
        <p>Drone or handheld photos welcome — provide image URLs and optional descriptive text.</p>
      </div>
      <div className="ai-container">
        <div className="ai-input-section">
          <div className="form-group">
            <label>{cfg.descLabel}</label>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Linked record ID (optional)</label>
            <input type="number" value={linkedId} onChange={(e) => setLinkedId(e.target.value)} />
          </div>
          <div className="form-group">
            <label><FiImage /> Image URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={imageInput} onChange={(e) => setImageInput(e.target.value)} placeholder="https://..." />
              <button type="button" onClick={addUrl}>Add</button>
            </div>
            {imageUrls.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                {imageUrls.map((u, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 4 }}>
                    <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{u}</span>
                    <button type="button" onClick={() => removeUrl(i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FiX /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading || (!text && imageUrls.length === 0)}>
            {loading ? <><FiLoader className="spin" /> Analyzing...</> : <><FiSend /> Analyze</>}
          </button>
        </div>
        {result && (
          <div className="ai-result">
            {result.error ? (
              <div className="ai-error"><h3>Error</h3><p>{result.error}</p></div>
            ) : (
              <div className="ai-analysis">
                <div className="ai-result-header">
                  <h3>Result</h3>
                  {result.timestamp && <span className="ai-timestamp">{new Date(result.timestamp).toLocaleString()}</span>}
                </div>
                {result.parsed && (
                  <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                    {JSON.stringify(result.parsed, null, 2)}
                  </pre>
                )}
                {result.analysis && (
                  <div className="ai-result-content">
                    <ReactMarkdown>{result.analysis}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
