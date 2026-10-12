import React, { useState } from 'react';
import AIReport from '../components/AIReport';

export default function CrewWeatherSafety({ token }) {
  const [payload, setPayload] = useState('{"block":"Unit 7B","wind_mph":22,"heat_index_f":88,"slope_pct":38,"chainsaw_crews":4}');
  const [result, setResult] = useState(null);
  const examples = [
    { label: 'Wind exposure', fields: { block: 'Ridge thinning unit', wind_mph: 28, heat_index_f: 79, slope_pct: 42, chainsaw_crews: 3 } },
    { label: 'Heat and crew load', fields: { block: 'South harvest block', wind_mph: 9, heat_index_f: 101, slope_pct: 18, chainsaw_crews: 5 } },
    { label: 'Steep terrain', fields: { block: 'Creekside restoration unit', wind_mph: 16, heat_index_f: 86, slope_pct: 55, chainsaw_crews: 2 } },
  ];
  const run = async () => {
    const res = await fetch('/api/crew-weather-safety/brief', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(JSON.parse(payload || '{}')) });
    setResult(await res.json());
  };
  return <div><h1>Crew Weather Safety</h1><div className="ai-preset-bar"><strong>Example scenarios</strong><div className="ai-actions">{examples.map((example) => <button key={example.label} type="button" className="btn btn-secondary" onClick={() => setPayload(JSON.stringify(example.fields, null, 2))}>Fill {example.label}</button>)}</div></div><label htmlFor="crew-weather-payload">Crew and weather observations</label><textarea id="crew-weather-payload" rows={8} value={payload} onChange={(e) => setPayload(e.target.value)} /><button type="button" onClick={run}>Generate Brief</button><AIReport response={result} title="Crew weather safety brief" /></div>;
}
