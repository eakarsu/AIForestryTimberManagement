import React, { useState } from 'react';

export default function CrewWeatherSafety({ token }) {
  const [payload, setPayload] = useState('{"block":"Unit 7B","wind_mph":22,"heat_index_f":88,"slope_pct":38,"chainsaw_crews":4}');
  const [result, setResult] = useState(null);
  const run = async () => {
    const res = await fetch('/api/crew-weather-safety/brief', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(JSON.parse(payload || '{}')) });
    setResult(await res.json());
  };
  return <div><h1>Crew Weather Safety</h1><textarea rows={8} value={payload} onChange={(e) => setPayload(e.target.value)} /><button onClick={run}>Generate Brief</button>{result && <pre>{JSON.stringify(result, null, 2)}</pre>}</div>;
}
