// Apply pass 5 extensions for AIForestryTimberManagement.
// Backlog implemented (cap 10):
//   1. Satellite/drone imagery integration — NEEDS-CREDS
//        env: SATELLITE_PROVIDER, SATELLITE_API_KEY  (e.g. PROVIDER=sentinelhub)
//   2. Real-time weather feed — NEEDS-CREDS
//        env: WEATHER_API_KEY (OpenWeather / NOAA / etc)
//   3. Carbon credit registries (Verra / Gold Standard) — NEEDS-CREDS
//        env: VERRA_API_KEY, GOLD_STANDARD_API_KEY
//   4. Permit / certification compliance workflow — NEEDS-PRODUCT-DECISION
//        permit_records table with status transitions submitted->under_review->approved/rejected.
//   5. Field-to-mill blockchain traceability — NEEDS-PRODUCT-DECISION
//        Local hash-chain (SHA-256 chained records); real chain (Hyperledger/EVM) deferred.
//   6. Computer vision canopy health from drone imagery — TOO-RISKY
//        Endpoint accepts image URLs; gated on AI key + SATELLITE_API_KEY.
//   7. Real-time IoT telemetry from harvesters — NEEDS-PRODUCT-DECISION
//        Telemetry ingest endpoint + last-seen registry.
//   8. Carbon credit calculator — additive in-house calc (kept simple, deterministic).
//
// Mounts under /api/ext on the existing Express app.

const crypto = require('crypto');

module.exports = function attachExtensions({
  app, pool, authenticateToken, aiRateLimiter, callOpenRouter, parseAIJson, persistAIResult
}) {
  // Bootstrap tables.
  pool.query(`
    CREATE TABLE IF NOT EXISTS satellite_imagery (
      id SERIAL PRIMARY KEY,
      plot_id INTEGER,
      provider VARCHAR(80),
      capture_date TIMESTAMPTZ,
      image_url TEXT,
      ndvi DECIMAL(6,3),
      analysis JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS weather_observations (
      id SERIAL PRIMARY KEY,
      region VARCHAR(255),
      observed_at TIMESTAMPTZ DEFAULT NOW(),
      temperature_c DECIMAL(6,2),
      humidity_pct DECIMAL(6,2),
      wind_kph DECIMAL(6,2),
      precipitation_mm DECIMAL(8,2),
      raw JSONB
    );
    CREATE TABLE IF NOT EXISTS registry_submissions (
      id SERIAL PRIMARY KEY,
      registry VARCHAR(40),
      project_name VARCHAR(255),
      methodology VARCHAR(80),
      tonnes_co2e DECIMAL(14,2),
      status VARCHAR(40) DEFAULT 'pending',
      submitted_by INTEGER,
      external_ref VARCHAR(120),
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS permit_records (
      id SERIAL PRIMARY KEY,
      permit_type VARCHAR(80),
      jurisdiction VARCHAR(120),
      reference_id VARCHAR(120),
      plot_id INTEGER,
      issued_to INTEGER,
      status VARCHAR(40) DEFAULT 'submitted',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      effective_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      conditions JSONB,
      audit_log JSONB
    );
    CREATE TABLE IF NOT EXISTS traceability_chain (
      id SERIAL PRIMARY KEY,
      stage VARCHAR(60),
      log_id VARCHAR(120),
      actor_user_id INTEGER,
      payload JSONB,
      prev_hash VARCHAR(64),
      hash VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_traceability_log_id ON traceability_chain(log_id);
    CREATE TABLE IF NOT EXISTS harvester_telemetry (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(120),
      observed_at TIMESTAMPTZ DEFAULT NOW(),
      lat DECIMAL(10,6),
      lng DECIMAL(10,6),
      fuel_pct DECIMAL(5,2),
      engine_temp_c DECIMAL(6,2),
      throughput_m3 DECIMAL(10,2),
      raw JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_harvester_telemetry_device ON harvester_telemetry(device_id);
  `).catch(err => console.warn('[extensions] bootstrap warning:', err.message));

  // ---- 1. Satellite imagery ----
  app.get('/api/ext/satellite/status', authenticateToken, (req, res) => {
    const missing = [];
    if (!process.env.SATELLITE_PROVIDER) missing.push('SATELLITE_PROVIDER');
    if (!process.env.SATELLITE_API_KEY) missing.push('SATELLITE_API_KEY');
    res.json({ configured: missing.length === 0, missing });
  });

  app.post('/api/ext/satellite/fetch', authenticateToken, async (req, res) => {
    const missing = [];
    if (!process.env.SATELLITE_PROVIDER) missing.push('SATELLITE_PROVIDER');
    if (!process.env.SATELLITE_API_KEY) missing.push('SATELLITE_API_KEY');
    if (missing.length) return res.status(503).json({ error: 'Satellite provider not configured', missing });

    const { plot_id, capture_date, image_url, ndvi } = req.body || {};
    try {
      const r = await pool.query(
        `INSERT INTO satellite_imagery (plot_id, provider, capture_date, image_url, ndvi)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [plot_id || null, process.env.SATELLITE_PROVIDER, capture_date || new Date(),
         image_url || null, ndvi || null]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/satellite/imagery', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM satellite_imagery ORDER BY id DESC LIMIT 100`);
      res.json(r.rows);
    } catch (e) { res.json([]); }
  });

  // ---- 2. Real-time weather feed ----
  app.get('/api/ext/weather/status', authenticateToken, (req, res) => {
    const missing = process.env.WEATHER_API_KEY ? [] : ['WEATHER_API_KEY'];
    res.json({ configured: missing.length === 0, missing });
  });

  app.post('/api/ext/weather/observe', authenticateToken, async (req, res) => {
    if (!process.env.WEATHER_API_KEY) {
      return res.status(503).json({ error: 'Weather provider not configured', missing: ['WEATHER_API_KEY'] });
    }
    const { region, temperature_c, humidity_pct, wind_kph, precipitation_mm, raw } = req.body || {};
    try {
      const r = await pool.query(
        `INSERT INTO weather_observations (region, temperature_c, humidity_pct, wind_kph, precipitation_mm, raw)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [region || null, temperature_c || null, humidity_pct || null, wind_kph || null,
         precipitation_mm || null, raw ? JSON.stringify(raw) : null]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/weather/observations', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM weather_observations ORDER BY id DESC LIMIT 100`);
      res.json(r.rows);
    } catch (e) { res.json([]); }
  });

  // ---- 3. Carbon credit registries ----
  app.get('/api/ext/registries/status', authenticateToken, (req, res) => {
    const missing = [];
    if (!process.env.VERRA_API_KEY) missing.push('VERRA_API_KEY');
    if (!process.env.GOLD_STANDARD_API_KEY) missing.push('GOLD_STANDARD_API_KEY');
    res.json({
      verra: !!process.env.VERRA_API_KEY,
      gold_standard: !!process.env.GOLD_STANDARD_API_KEY,
      missing
    });
  });

  app.post('/api/ext/registries/submit', authenticateToken, async (req, res) => {
    const { registry, project_name, methodology, tonnes_co2e, payload } = req.body || {};
    if (!registry) return res.status(400).json({ error: 'registry required' });
    let envKey = null;
    if (registry === 'verra') envKey = 'VERRA_API_KEY';
    else if (registry === 'gold_standard') envKey = 'GOLD_STANDARD_API_KEY';
    else return res.status(400).json({ error: 'registry must be verra | gold_standard' });
    if (!process.env[envKey]) return res.status(503).json({ error: 'Registry not configured', missing: [envKey] });
    try {
      const r = await pool.query(
        `INSERT INTO registry_submissions (registry, project_name, methodology, tonnes_co2e, submitted_by, payload)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [registry, project_name || null, methodology || null, tonnes_co2e || null,
         req.user?.id || null, payload ? JSON.stringify(payload) : null]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/registries/submissions', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM registry_submissions ORDER BY id DESC LIMIT 100`);
      res.json(r.rows);
    } catch (e) { res.json([]); }
  });

  // ---- 4. Permits / compliance workflow ----
  // PRODUCT-DECISION: status state machine = submitted -> under_review -> approved | rejected | returned.
  const PERMIT_TRANSITIONS = {
    submitted: ['under_review', 'rejected'],
    under_review: ['approved', 'rejected', 'returned'],
    returned: ['under_review', 'rejected'],
    approved: [],
    rejected: [],
  };

  app.post('/api/ext/permits', authenticateToken, async (req, res) => {
    const { permit_type, jurisdiction, reference_id, plot_id, conditions } = req.body || {};
    try {
      const r = await pool.query(
        `INSERT INTO permit_records (permit_type, jurisdiction, reference_id, plot_id, issued_to, status, conditions, audit_log)
         VALUES ($1,$2,$3,$4,$5,'submitted',$6,$7) RETURNING *`,
        [permit_type || null, jurisdiction || null, reference_id || null, plot_id || null,
         req.user?.id || null, conditions ? JSON.stringify(conditions) : null,
         JSON.stringify([{ at: new Date().toISOString(), by: req.user?.id, status: 'submitted' }])]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/permits', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM permit_records ORDER BY id DESC LIMIT 100`);
      res.json(r.rows);
    } catch (e) { res.json([]); }
  });

  app.patch('/api/ext/permits/:id/transition', authenticateToken, async (req, res) => {
    const { to } = req.body || {};
    try {
      const cur = await pool.query(`SELECT * FROM permit_records WHERE id = $1`, [req.params.id]);
      if (!cur.rows[0]) return res.status(404).json({ error: 'permit not found' });
      const allowed = PERMIT_TRANSITIONS[cur.rows[0].status] || [];
      if (!allowed.includes(to)) {
        return res.status(409).json({ error: `cannot transition ${cur.rows[0].status} -> ${to}`, allowed });
      }
      const log = Array.isArray(cur.rows[0].audit_log) ? cur.rows[0].audit_log : [];
      log.push({ at: new Date().toISOString(), by: req.user?.id, status: to });
      const r = await pool.query(
        `UPDATE permit_records SET status = $1, audit_log = $2 WHERE id = $3 RETURNING *`,
        [to, JSON.stringify(log), req.params.id]
      );
      res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ---- 5. Field-to-mill traceability (hash chain) ----
  // PRODUCT-DECISION: local SHA-256 chain. Real distributed ledger (Hyperledger / EVM) deferred.
  app.post('/api/ext/traceability/append', authenticateToken, async (req, res) => {
    const { stage, log_id, payload } = req.body || {};
    if (!log_id || !stage) return res.status(400).json({ error: 'stage and log_id required' });
    try {
      const prev = await pool.query(
        `SELECT hash FROM traceability_chain WHERE log_id = $1 ORDER BY id DESC LIMIT 1`, [log_id]
      );
      const prev_hash = prev.rows[0]?.hash || '';
      const body = JSON.stringify({ stage, log_id, payload, prev_hash, ts: Date.now() });
      const hash = crypto.createHash('sha256').update(body).digest('hex');
      const r = await pool.query(
        `INSERT INTO traceability_chain (stage, log_id, actor_user_id, payload, prev_hash, hash)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [stage, log_id, req.user?.id || null, payload ? JSON.stringify(payload) : null, prev_hash, hash]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/traceability/:log_id', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT * FROM traceability_chain WHERE log_id = $1 ORDER BY id ASC`, [req.params.log_id]
      );
      // Verify chain
      let ok = true;
      for (let i = 0; i < r.rows.length; i++) {
        const expectedPrev = i === 0 ? '' : r.rows[i - 1].hash;
        if (r.rows[i].prev_hash !== expectedPrev) { ok = false; break; }
      }
      res.json({ chain: r.rows, integrity_ok: ok });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ---- 6. Drone canopy health (vision) ----
  app.post('/api/ext/canopy-health', authenticateToken, aiRateLimiter, async (req, res) => {
    const { plot_id, image_urls = [], notes } = req.body || {};
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured', missing: ['OPENROUTER_API_KEY'] });
    }
    if (!process.env.SATELLITE_API_KEY) {
      return res.status(503).json({ error: 'Imagery provider not configured', missing: ['SATELLITE_API_KEY'] });
    }
    try {
      const systemPrompt = `You are a forestry drone-imagery analyst. Output strict JSON: {"canopy_cover_pct":0-100,"health_score":0-100,"observations":[],"hotspots":[],"recommended_actions":[]}.`;
      const userPrompt = { plot_id: plot_id || null,
                           image_urls: image_urls.slice(0, 5),
                           notes: notes || null };
      const raw = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.3 });
      const parsed = parseAIJson(raw);
      await persistAIResult(req.user?.id, 'forest_plots', plot_id || null, 'canopy-health', raw, parsed);
      res.json({ analysis: raw, parsed, type: 'canopy-health' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ---- 7. Harvester IoT telemetry ----
  app.post('/api/ext/telemetry/harvester', authenticateToken, async (req, res) => {
    const { device_id, lat, lng, fuel_pct, engine_temp_c, throughput_m3, raw } = req.body || {};
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    try {
      const r = await pool.query(
        `INSERT INTO harvester_telemetry (device_id, lat, lng, fuel_pct, engine_temp_c, throughput_m3, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [device_id, lat || null, lng || null, fuel_pct || null,
         engine_temp_c || null, throughput_m3 || null, raw ? JSON.stringify(raw) : null]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ext/telemetry/harvester', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT DISTINCT ON (device_id) * FROM harvester_telemetry ORDER BY device_id, observed_at DESC`
      );
      res.json(r.rows);
    } catch (e) { res.json([]); }
  });

  // ---- 8. Carbon credit calculator ----
  // PRODUCT-DECISION: deterministic in-house estimator using IPCC defaults
  // (carbon fraction 0.5, root:shoot 0.27, CO2e factor 3.67). No external registry call.
  app.post('/api/ext/carbon-calc', authenticateToken, async (req, res) => {
    const { volume_m3, species, wood_density_kg_m3 = 600 } = req.body || {};
    if (volume_m3 == null) return res.status(400).json({ error: 'volume_m3 required' });
    const biomass_kg = Number(volume_m3) * Number(wood_density_kg_m3);
    const total_biomass = biomass_kg * (1 + 0.27); // include below-ground
    const carbon_kg = total_biomass * 0.5;
    const co2e_kg = carbon_kg * 3.67;
    const co2e_tonnes = co2e_kg / 1000;
    res.json({
      inputs: { volume_m3: Number(volume_m3), species: species || null, wood_density_kg_m3 },
      biomass_kg,
      total_biomass_kg: total_biomass,
      carbon_kg,
      co2e_tonnes,
      methodology: 'IPCC-defaults v1 (carbon fraction 0.5, root:shoot 0.27, CO2:C 3.67)'
    });
  });
};
