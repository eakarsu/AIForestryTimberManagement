require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_dedicated_wildfire_spread_simulation_ = require('./routes/gap-no-dedicated-wildfire-spread-simulation-');
const route_gap_no_vendorsupplier_matching_ai_only_telem = require('./routes/gap-no-vendorsupplier-matching-ai-only-telem');
const route_gap_no_labor_scheduling_ai_for_field = require('./routes/gap-no-labor-scheduling-ai-for-field');
const route_gap_no_soprag_over_forestry_regulations_defe = require('./routes/gap-no-soprag-over-forestry-regulations-defe');
const route_gap_no_modular_tree_inventory_crud_only = require('./routes/gap-no-modular-tree-inventory-crud-only');
const route_gap_no_teamshift_scheduling_for_field_operat = require('./routes/gap-no-teamshift-scheduling-for-field-operat');
const route_gap_no_equipment_fleet_crud_beyond_predictiv = require('./routes/gap-no-equipment-fleet-crud-beyond-predictiv');
const route_gap_no_cost_tracking_pl_module = require('./routes/gap-no-cost-tracking-pl-module');
const route_gap_no_real_iot_mqtt_broker_telemetry = require('./routes/gap-no-real-iot-mqtt-broker-telemetry');
const route_gap_monolithic_structure_makes_route_discove = require('./routes/gap-monolithic-structure-makes-route-discove');
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Production hardening
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// AI rate limiter — 20 calls/hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id) ? `user:${req.user.id}` : (req.ip || 'anon'),
  message: { error: 'Too many AI requests; limit is 20 per hour.' }
});

// Schema bootstrap — adds ai_results table + ensures ai_analysis JSONB columns
pool.query(`
  CREATE TABLE IF NOT EXISTS ai_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    analysis_type VARCHAR(100),
    model VARCHAR(255),
    raw_response TEXT,
    parsed_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_results_entity ON ai_results(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);

  CREATE TABLE IF NOT EXISTS safety_incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(100),
    severity VARCHAR(50),
    description TEXT,
    plot_id INTEGER,
    worker_id INTEGER,
    occurred_at TIMESTAMP DEFAULT NOW(),
    near_miss BOOLEAN DEFAULT false,
    root_cause TEXT,
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS market_prices (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255),
    grade VARCHAR(100),
    price_per_m3 DECIMAL(12,2),
    region VARCHAR(255),
    recorded_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS weather_alerts (
    id SERIAL PRIMARY KEY,
    region VARCHAR(255),
    alert_type VARCHAR(100),
    severity VARCHAR(50),
    payload JSONB,
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
`).catch(err => console.warn('[Schema] bootstrap warning:', err.message));

pool.query(`
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tree_inventory') THEN
      BEGIN ALTER TABLE tree_inventory ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='harvest_plans') THEN
      BEGIN ALTER TABLE harvest_plans ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='wildfire_assessments') THEN
      BEGIN ALTER TABLE wildfire_assessments ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='carbon_credits') THEN
      BEGIN ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='disease_reports') THEN
      BEGIN ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='compliance_reports') THEN
      BEGIN ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END $$;
`).catch(err => console.warn('[Schema] Column additions warning:', err.message));

// 3-strategy AI JSON parser
function parseAIJson(text) {
  if (!text || typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'name, email, password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const trees = await pool.query('SELECT COUNT(*) FROM tree_inventory');
    const harvests = await pool.query('SELECT COUNT(*) FROM harvest_plans');
    const wildfireHigh = await pool.query("SELECT COUNT(*) FROM wildfire_assessments WHERE risk_level IN ('High', 'Critical')");
    const credits = await pool.query('SELECT COALESCE(SUM(credits_earned), 0) as total FROM carbon_credits');
    const plots = await pool.query('SELECT COUNT(*) FROM forest_plots');
    const equipment = await pool.query('SELECT COUNT(*) FROM equipment');
    const workers = await pool.query('SELECT COUNT(*) FROM workers');
    const diseases = await pool.query('SELECT COUNT(*) FROM disease_reports');
    res.json({
      totalTrees: parseInt(trees.rows[0].count),
      totalHarvestPlans: parseInt(harvests.rows[0].count),
      highRiskWildfires: parseInt(wildfireHigh.rows[0].count),
      totalCarbonCredits: parseFloat(credits.rows[0].total),
      totalPlots: parseInt(plots.rows[0].count),
      totalEquipment: parseInt(equipment.rows[0].count),
      totalWorkers: parseInt(workers.rows[0].count),
      totalDiseaseReports: parseInt(diseases.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: paginated query
async function paginatedQuery(table, req, res, orderCol = 'id') {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const [dataResult, countResult] = await Promise.all([
    pool.query(`SELECT * FROM ${table} ORDER BY ${orderCol} DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    pool.query(`SELECT COUNT(*) FROM ${table}`)
  ]);
  const total = parseInt(countResult.rows[0].count);
  res.json({ data: dataResult.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// CRUD Generator: simpler way to register entity routes
function registerCrud(path, table, fields) {
  app.get(`/api/${path}`, authenticateToken, async (req, res) => {
    try { await paginatedQuery(table, req, res); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.get(`/api/${path}/:id`, authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post(`/api/${path}`, authenticateToken, async (req, res) => {
    try {
      const cols = fields.join(', ');
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const values = fields.map(f => req.body[f] === undefined ? null : req.body[f]);
      const r = await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, values);
      res.status(201).json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.put(`/api/${path}/:id`, authenticateToken, async (req, res) => {
    try {
      const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = fields.map(f => req.body[f] === undefined ? null : req.body[f]);
      values.push(req.params.id);
      const r = await pool.query(`UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`, values);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.delete(`/api/${path}/:id`, authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}

registerCrud('tree-inventory', 'tree_inventory',
  ['species','location','latitude','longitude','height_m','diameter_cm','age_years','health_status','canopy_cover_pct','notes']);
registerCrud('harvest-plans', 'harvest_plans',
  ['plan_name','plot_id','species_target','volume_m3','method','scheduled_date','status','sustainability_score','environmental_notes']);
registerCrud('wildfire-assessments', 'wildfire_assessments',
  ['zone_name','latitude','longitude','risk_level','vegetation_density','slope_degree','last_fire_date','moisture_level','wind_exposure','mitigation_notes']);
registerCrud('carbon-credits', 'carbon_credits',
  ['project_name','plot_id','credits_earned','verification_status','methodology','vintage_year','buyer','price_per_credit','registry','notes']);
registerCrud('forest-plots', 'forest_plots',
  ['plot_name','region','area_hectares','elevation_m','soil_type','dominant_species','ownership','certification_status','last_survey_date','notes']);
registerCrud('equipment', 'equipment',
  ['name','type','manufacturer','model_year','condition','assigned_plot','last_maintenance','next_maintenance','hourly_rate','notes']);
registerCrud('workers', 'workers',
  ['first_name','last_name','role','certification','hire_date','hourly_wage','assigned_plot','phone','emergency_contact','notes']);
registerCrud('disease-reports', 'disease_reports',
  ['tree_species','disease_name','severity','affected_area_hectares','symptoms','location','detection_date','treatment_status','treatment_method','notes']);
registerCrud('timber-sales', 'timber_sales',
  ['buyer_name','species','volume_m3','grade','price_per_m3','total_value','sale_date','delivery_date','payment_status','notes']);
registerCrud('compliance-reports', 'compliance_reports',
  ['report_name','regulation','audit_date','auditor','status','findings','corrective_actions','next_audit_date','plot_id','notes']);

// NEW: safety incidents (root-cause analyser fuel)
app.get('/api/safety-incidents', authenticateToken, async (req, res) => {
  try { await paginatedQuery('safety_incidents', req, res, 'occurred_at'); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/safety-incidents', authenticateToken, async (req, res) => {
  try {
    const { incident_type, severity, description, plot_id, worker_id, near_miss, root_cause } = req.body;
    const r = await pool.query(
      `INSERT INTO safety_incidents (incident_type, severity, description, plot_id, worker_id, near_miss, root_cause)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [incident_type, severity, description, plot_id || null, worker_id || null, near_miss || false, root_cause || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/safety-incidents/:id', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM safety_incidents WHERE id = $1 RETURNING *', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: market prices
app.get('/api/market-prices', authenticateToken, async (req, res) => {
  try { await paginatedQuery('market_prices', req, res, 'recorded_at'); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/market-prices', authenticateToken, async (req, res) => {
  try {
    const { species, grade, price_per_m3, region } = req.body;
    const r = await pool.query(
      'INSERT INTO market_prices (species, grade, price_per_m3, region) VALUES ($1,$2,$3,$4) RETURNING *',
      [species, grade, price_per_m3, region]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: weather alerts
app.get('/api/weather-alerts', authenticateToken, async (req, res) => {
  try { await paginatedQuery('weather_alerts', req, res, 'created_at'); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: ai results listing
app.get('/api/ai-results', authenticateToken, async (req, res) => {
  try { await paginatedQuery('ai_results', req, res, 'created_at'); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ AI HELPERS ============
const callOpenRouter = async (prompt, systemPrompt, options = {}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
      'X-Title': 'AI Forestry Management'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.4
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
};

async function persistAIResult(userId, entityType, entityId, type, raw, parsed) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, entity_type, entity_id, analysis_type, model, raw_response, parsed_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId || null, entityType || null, entityId || null, type || null,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
       raw, parsed ? JSON.stringify(parsed) : null]
    );
  } catch (e) { console.warn('[ai_results] persist failed:', e.message); }
}

// AI: Tree Species Identification (with optional vision images)
app.post('/api/ai/species-identification', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { description, tree_id, image_urls } = req.body;
    const systemPrompt = `You are an expert dendrologist and forestry scientist. Given a description (and optionally images) of a tree, identify the species. Return ONLY valid JSON with fields: species_name, scientific_name, confidence_level (0-100), key_features (array), habitat, commercial_value, conservation_status, management_recommendations (array), analysis_summary.`;

    let userContent;
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      userContent = [
        { type: 'text', text: description || 'Identify this tree species.' },
        ...image_urls.map(url => ({ type: 'image_url', image_url: { url } }))
      ];
    } else {
      userContent = description;
    }

    let result;
    if (Array.isArray(userContent)) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
          'X-Title': 'AI Forestry Management'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: 4096
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      result = data.choices[0].message.content;
    } else {
      result = await callOpenRouter(description, systemPrompt);
    }

    const parsed = parseAIJson(result);
    if (tree_id) {
      try {
        await pool.query('UPDATE tree_inventory SET ai_analysis = $1 WHERE id = $2',
          [parsed ? JSON.stringify(parsed) : JSON.stringify({ raw: result }), tree_id]);
      } catch (e) { console.warn('[species-id] persist failed:', e.message); }
    }
    await persistAIResult(req.user.id, 'tree_inventory', tree_id || null, 'species-identification', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'species-identification' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Sustainable Harvest Planning
app.post('/api/ai/harvest-optimization', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { plotData, harvest_plan_id } = req.body;
    const systemPrompt = `You are an expert in sustainable forestry. Analyze plot data and produce an optimized harvest plan. Return ONLY valid JSON with: recommended_volume_m3, optimal_timing, species_priority (array), regeneration_strategy, environmental_impact, sustainability_score (0-100), buffer_zone_requirements, post_harvest_steps (array), analysis_summary.`;
    const result = await callOpenRouter(plotData, systemPrompt);
    const parsed = parseAIJson(result);
    if (harvest_plan_id) {
      try {
        await pool.query('UPDATE harvest_plans SET ai_analysis = $1 WHERE id = $2',
          [parsed ? JSON.stringify(parsed) : JSON.stringify({ raw: result }), harvest_plan_id]);
      } catch (e) { console.warn('[harvest-opt] persist failed:', e.message); }
    }
    await persistAIResult(req.user.id, 'harvest_plans', harvest_plan_id || null, 'harvest-optimization', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'harvest-optimization' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Wildfire Risk
app.post('/api/ai/wildfire-risk', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { zoneData, assessment_id } = req.body;
    const systemPrompt = `You are a wildfire risk expert. Analyze zone data and return ONLY JSON: {overall_risk: Low|Moderate|High|Critical, fire_behavior_prediction, fuel_load_assessment, weather_risk_factors (array), mitigation_recommendations (array), evacuation_considerations, firebreak_recommendations, prescribed_burn_feasibility, resource_pre_positioning, summary}.`;
    const result = await callOpenRouter(zoneData, systemPrompt);
    const parsed = parseAIJson(result);
    if (assessment_id) {
      try {
        await pool.query('UPDATE wildfire_assessments SET ai_analysis = $1 WHERE id = $2',
          [parsed ? JSON.stringify(parsed) : JSON.stringify({ raw: result }), assessment_id]);
      } catch (e) { console.warn('[wildfire] persist failed:', e.message); }
    }
    await persistAIResult(req.user.id, 'wildfire_assessments', assessment_id || null, 'wildfire-risk', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'wildfire-risk' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Carbon estimation (auto-creates draft credit if requested)
app.post('/api/ai/carbon-estimation', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { forestData, plot_id } = req.body;
    const systemPrompt = `You are a carbon credit specialist. Return ONLY valid JSON: {annual_sequestration_tonnes (number), credit_value_usd (number), methodology_recommendation, additionality_assessment, permanence_risk, leakage_risk, monitoring_requirements, verification_timeline_months (number), market_price_range, analysis_summary}.`;
    const result = await callOpenRouter(forestData, systemPrompt);
    const parsed = parseAIJson(result);

    let createdCredit = null;
    if (plot_id && parsed && parsed.annual_sequestration_tonnes) {
      try {
        const r = await pool.query(
          `INSERT INTO carbon_credits (project_name, plot_id, credits_earned, verification_status, methodology, notes)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [`Auto-estimated for plot ${plot_id}`, plot_id, parsed.annual_sequestration_tonnes, 'Pending',
           parsed.methodology_recommendation || 'VCS', parsed.analysis_summary || result.slice(0, 1000)]
        );
        createdCredit = r.rows[0];
      } catch (e) { console.warn('[carbon] auto-credit failed:', e.message); }
    }

    await persistAIResult(req.user.id, 'carbon_credits', createdCredit?.id || null, 'carbon-estimation', result, parsed);
    res.json({ analysis: result, parsed, createdCredit, timestamp: new Date().toISOString(), type: 'carbon-estimation' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Disease analysis
app.post('/api/ai/disease-analysis', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { symptoms, disease_report_id, image_urls } = req.body;
    const systemPrompt = `You are a forest pathologist. Return ONLY valid JSON: {disease_name, pathogen_type, severity_score (1-10), spread_risk (Low|Medium|High), affected_species (array), treatment_options (array), prevention_measures (array), quarantine_recommendations, economic_impact_estimate, long_term_management, analysis_summary}.`;

    let result;
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
          'X-Title': 'AI Forestry Management'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: [
              { type: 'text', text: symptoms || 'Diagnose the visible tree disease.' },
              ...image_urls.map(url => ({ type: 'image_url', image_url: { url } }))
            ]}
          ],
          max_tokens: 4096
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      result = data.choices[0].message.content;
    } else {
      result = await callOpenRouter(symptoms, systemPrompt);
    }

    const parsed = parseAIJson(result);
    if (disease_report_id) {
      try {
        await pool.query('UPDATE disease_reports SET ai_analysis = $1 WHERE id = $2',
          [parsed ? JSON.stringify(parsed) : JSON.stringify({ raw: result }), disease_report_id]);
      } catch (e) { console.warn('[disease] persist failed:', e.message); }
    }
    await persistAIResult(req.user.id, 'disease_reports', disease_report_id || null, 'disease-analysis', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'disease-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Disease outbreak check
app.post('/api/ai/disease-outbreak-check', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const recentDiseases = await pool.query(
      `SELECT * FROM disease_reports WHERE detection_date >= NOW() - INTERVAL '90 days' ORDER BY detection_date DESC LIMIT 200`
    );

    if (recentDiseases.rows.length === 0) {
      return res.json({ outbreak_risk: 'low', message: 'No recent disease reports found.', alert: null });
    }

    const severeReports = recentDiseases.rows.filter(r => ['High', 'Critical', 'Severe'].includes(r.severity));
    const systemPrompt = `You are a forest epidemiologist. Return ONLY valid JSON: {outbreak_risk: critical|high|medium|low, potential_outbreak: boolean, affected_species (array), transmission_vectors (array), geographic_spread_risk: high|medium|low, estimated_affected_area_hectares (number), recommended_quarantine_zones (array), emergency_actions (array), investigation_priority: immediate|urgent|normal, summary}.`;
    const userMessage = `Analyze ${recentDiseases.rows.length} disease reports (${severeReports.length} severe) from the last 90 days:\n${recentDiseases.rows.map(r => `- ${r.disease_name} (${r.severity}): ${r.tree_species} at ${r.location}, ${r.affected_area_hectares || 0} hectares, detected ${r.detection_date}`).join('\n')}`;

    const analysis = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(analysis);

    await persistAIResult(req.user.id, 'disease_reports', null, 'disease-outbreak-check', analysis, parsed);
    res.json({
      analysis, parsed,
      reports_analyzed: recentDiseases.rows.length,
      severe_reports: severeReports.length,
      outbreak_risk: parsed?.outbreak_risk || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Growth prediction
app.post('/api/ai/growth-prediction', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { treeData } = req.body;
    const systemPrompt = `You are a forest mensuration expert. Return ONLY valid JSON: {projected_annual_height_growth_m, diameter_growth_rate_cm, volume_growth_estimate_m3, site_index, stand_density_impact, growth_limiting_factors (array), optimal_thinning_schedule (array), rotation_age_years (number), yield_table: {five_yr, ten_yr, twenty_yr}, silvicultural_recommendations (array), analysis_summary}.`;
    const result = await callOpenRouter(treeData, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'tree_inventory', null, 'growth-prediction', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'growth-prediction' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: Best-time-to-sell market alerts (per harvest plan)
app.post('/api/ai/timber-market-alert', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { harvest_plan_id } = req.body;
    let plan = null;
    if (harvest_plan_id) {
      const r = await pool.query('SELECT * FROM harvest_plans WHERE id = $1', [harvest_plan_id]);
      plan = r.rows[0];
    }
    const prices = await pool.query('SELECT * FROM market_prices ORDER BY recorded_at DESC LIMIT 50');
    const sales = await pool.query('SELECT * FROM timber_sales ORDER BY sale_date DESC LIMIT 30');

    const systemPrompt = `You are a timber market analyst. Given a harvest plan and recent market prices + sales history, recommend best-time-to-sell with explicit price targets. Return ONLY JSON: {recommendation: sell_now|wait_short|wait_long, target_price_per_m3, expected_revenue_usd, confidence (0-100), supporting_factors (array), risks (array), suggested_window, summary}.`;
    const userMessage = JSON.stringify({ harvest_plan: plan, recent_market_prices: prices.rows, recent_sales: sales.rows });
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'harvest_plans', harvest_plan_id || null, 'timber-market-alert', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: GIS-aware harvest block planner
app.post('/api/ai/gis-harvest-blocks', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { plot_id, polygon_geojson, buffer_zones, constraints } = req.body;
    const systemPrompt = `You are a forest operations planner with GIS expertise. Given a plot polygon and constraints, design harvest blocks respecting buffer zones, slopes, riparian corridors. Return ONLY JSON: {blocks: [{block_id, area_hectares, recommended_method, priority, buffer_compliance, notes}], total_area, exclusion_zones (array), summary}.`;
    const userMessage = JSON.stringify({ plot_id, polygon: polygon_geojson, buffer_zones, constraints });
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'forest_plots', plot_id || null, 'gis-harvest-blocks', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: Wildfire weather-feed cron equivalent (manual trigger / cron-callable)
app.post('/api/ai/wildfire-weather-scan', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { region, weather } = req.body; // weather is an injected forecast payload
    const assessments = await pool.query(
      `SELECT * FROM wildfire_assessments WHERE risk_level IN ('High','Critical') ORDER BY id DESC LIMIT 50`
    );
    const systemPrompt = `You are a wildfire forecaster. Cross-reference current weather (red-flag conditions) with high-risk zones. Return ONLY JSON: {alerts: [{zone_name, severity, action_required, evacuation_radius_km}], region_risk_summary, immediate_actions (array), summary}.`;
    const userMessage = JSON.stringify({ region, weather, high_risk_zones: assessments.rows });
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);

    try {
      await pool.query(
        `INSERT INTO weather_alerts (region, alert_type, severity, payload, ai_analysis)
         VALUES ($1,$2,$3,$4,$5)`,
        [region || null, 'wildfire-weather', parsed?.region_risk_summary?.severity || 'unknown',
         JSON.stringify(weather || {}), parsed ? JSON.stringify(parsed) : JSON.stringify({ raw: result })]
      );
    } catch (e) { console.warn('[weather] persist failed:', e.message); }

    await persistAIResult(req.user.id, 'wildfire_assessments', null, 'wildfire-weather-scan', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: Worker safety incident analyser (clusters root causes)
app.post('/api/ai/safety-incident-analysis', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const incidents = await pool.query(
      `SELECT * FROM safety_incidents WHERE occurred_at >= NOW() - INTERVAL '180 days' ORDER BY occurred_at DESC LIMIT 200`
    );
    if (incidents.rows.length === 0) {
      return res.json({ message: 'No incidents in the last 180 days.', clusters: [] });
    }
    const systemPrompt = `You are a workplace safety analyst for forestry operations. Cluster these incidents by root cause and recommend training / mitigations. Return ONLY JSON: {clusters: [{cause, count, severity_distribution, recommended_training, mitigation_steps (array)}], top_priorities (array), training_topics (array), summary}.`;
    const userMessage = JSON.stringify(incidents.rows);
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'safety_incidents', null, 'safety-incident-analysis', result, parsed);
    res.json({ analysis: result, parsed, incidents_analysed: incidents.rows.length, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: Predictive maintenance for logging equipment
app.post('/api/ai/equipment-maintenance', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { equipment_id } = req.body || {};

    let equipment = null;
    let history = [];
    let downtime = [];
    if (equipment_id) {
      const eq = await pool.query('SELECT * FROM equipment WHERE id = $1', [equipment_id]).catch(() => ({ rows: [] }));
      equipment = eq.rows[0] || null;
      const h = await pool.query(
        `SELECT * FROM maintenance_records WHERE equipment_id = $1 ORDER BY scheduled_date DESC LIMIT 25`,
        [equipment_id]
      ).catch(() => ({ rows: [] }));
      history = h.rows;
      const dt = await pool.query(
        `SELECT * FROM downtime_records WHERE equipment_id = $1 ORDER BY start_date DESC LIMIT 15`,
        [equipment_id]
      ).catch(() => ({ rows: [] }));
      downtime = dt.rows;
    } else {
      const all = await pool.query('SELECT * FROM equipment ORDER BY id ASC LIMIT 50').catch(() => ({ rows: [] }));
      equipment = { fleet: all.rows };
    }

    const systemPrompt = `You are a predictive-maintenance engineer for forestry equipment (skidders, harvesters, loaders, chainsaws). Predict failures, recommend interventions, and estimate cost impact. Return ONLY JSON.`;
    const userMessage = `Equipment: ${JSON.stringify(equipment, null, 2)}
Recent maintenance: ${JSON.stringify(history, null, 2)}
Recent downtime: ${JSON.stringify(downtime, null, 2)}

Return JSON:
{
  "summary": "...",
  "predicted_failures": [
    { "component": "string", "probability_pct": 0, "expected_in_days": 0, "severity": "low|medium|high" }
  ],
  "recommended_actions": [
    { "action": "string", "priority": "low|medium|high", "estimated_cost_usd": 0, "expected_downtime_avoided_hours": 0 }
  ],
  "spare_parts_to_stock": ["..."],
  "operator_training_topics": ["..."],
  "next_service_due_date": "YYYY-MM-DD",
  "disclaimer": "Predictions only; verify with manufacturer service intervals."
}`;
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'equipment', equipment_id || null, 'equipment-maintenance', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW (apply pass 4): Reforestation plan from harvested plots
app.post('/api/ai/reforestation-plan', authenticateToken, aiRateLimiter, async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI temporarily unavailable: OPENROUTER_API_KEY not configured.' });
  }
  try {
    const { plot_id, target_year, climate_notes } = req.body || {};

    let plot = null;
    if (plot_id) {
      const r = await pool.query('SELECT * FROM forest_plots WHERE id = $1', [plot_id]).catch(() => ({ rows: [] }));
      plot = r.rows[0] || null;
    }
    const harvests = plot_id
      ? await pool.query('SELECT * FROM harvest_plans WHERE plot_id = $1 ORDER BY id DESC LIMIT 25', [plot_id]).catch(() => ({ rows: [] }))
      : await pool.query('SELECT * FROM harvest_plans ORDER BY id DESC LIMIT 25').catch(() => ({ rows: [] }));
    const inventory = plot_id
      ? await pool.query('SELECT species, COUNT(*) AS cnt FROM tree_inventory WHERE plot_id = $1 GROUP BY species', [plot_id]).catch(() => ({ rows: [] }))
      : await pool.query('SELECT species, COUNT(*) AS cnt FROM tree_inventory GROUP BY species LIMIT 50').catch(() => ({ rows: [] }));

    const systemPrompt = `You are a reforestation specialist. Design a science-based replanting plan for a harvested forest plot. Mix species for biodiversity and resilience. Consider the climate notes and target completion year. Return ONLY valid JSON.`;
    const userMessage = `Plot: ${JSON.stringify(plot, null, 2)}
Recent harvest plans on this plot: ${JSON.stringify(harvests.rows, null, 2)}
Existing species mix: ${JSON.stringify(inventory.rows, null, 2)}
Target year: ${target_year || 'unspecified'}
Climate notes: ${climate_notes || 'unspecified'}

Return JSON:
{
  "summary": "...",
  "recommended_species_mix": [
    { "species": "string", "scientific_name": "string", "percent_of_total": 0, "rationale": "string" }
  ],
  "seedlings_per_hectare": 0,
  "planting_phases": [
    { "phase": "string", "year": 0, "actions": ["..."] }
  ],
  "monitoring_schedule": ["..."],
  "expected_canopy_year": 0,
  "biodiversity_score_target": 0,
  "carbon_sequestration_t_per_ha_per_year": 0,
  "risks": ["..."],
  "disclaimer": "Plan only; verify with local silviculture standards."
}`;
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'forest_plots', plot_id || null, 'reforestation-plan', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'reforestation-plan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW (apply pass 4): Compliance review across reports
app.post('/api/ai/compliance-review', authenticateToken, aiRateLimiter, async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI temporarily unavailable: OPENROUTER_API_KEY not configured.' });
  }
  try {
    const { report_id, jurisdiction } = req.body || {};

    let target = null;
    if (report_id) {
      const r = await pool.query('SELECT * FROM compliance_reports WHERE id = $1', [report_id]).catch(() => ({ rows: [] }));
      target = r.rows[0] || null;
    }
    const recent = await pool.query(
      'SELECT * FROM compliance_reports ORDER BY id DESC LIMIT 25'
    ).catch(() => ({ rows: [] }));
    const incidents = await pool.query(
      `SELECT * FROM safety_incidents WHERE occurred_at >= NOW() - INTERVAL '180 days' ORDER BY occurred_at DESC LIMIT 50`
    ).catch(() => ({ rows: [] }));

    const systemPrompt = `You are a forestry compliance auditor familiar with FSC, PEFC, SFI, and regional regulations. Identify gaps, classify findings by severity, and propose remediation steps. Return ONLY valid JSON.`;
    const userMessage = `Target report: ${JSON.stringify(target, null, 2)}
Recent reports: ${JSON.stringify(recent.rows, null, 2)}
Recent safety incidents: ${JSON.stringify(incidents.rows, null, 2)}
Jurisdiction: ${jurisdiction || 'unspecified'}

Return JSON:
{
  "summary": "...",
  "overall_status": "compliant|partial|non_compliant",
  "findings": [
    { "code": "string", "title": "string", "severity": "low|medium|high|critical", "evidence": "string", "remediation": "string" }
  ],
  "missing_documents": ["..."],
  "regulatory_risks": ["..."],
  "next_audit_actions": [
    { "action": "string", "owner_role": "string", "due_in_days": 0 }
  ],
  "disclaimer": "AI-assisted compliance review; final certification requires accredited auditor."
}`;
    const result = await callOpenRouter(userMessage, systemPrompt);
    const parsed = parseAIJson(result);
    await persistAIResult(req.user.id, 'compliance_reports', report_id || null, 'compliance-review', result, parsed);
    res.json({ analysis: result, parsed, timestamp: new Date().toISOString(), type: 'compliance-review' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Apply pass 5 extensions (additive endpoints under /api/ext)
try {
  require('./extensions')({
    app, pool, authenticateToken, aiRateLimiter, callOpenRouter, parseAIJson, persistAIResult
  });
} catch (e) { console.warn('[extensions] mount warning:', e.message); }
app.use('/api/agentic-forest-plan', require('./routes/agenticForestPlanner')(pool));
app.use('/api/buyer-demand', require('./routes/buyerDemandMatcher')(pool));
app.use('/api/carbon-arbitrage', require('./routes/carbonArbitrage')(pool));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message });
});


app.use('/api/gap-no-dedicated-wildfire-spread-simulation-', route_gap_no_dedicated_wildfire_spread_simulation_);
app.use('/api/gap-no-vendorsupplier-matching-ai-only-telem', route_gap_no_vendorsupplier_matching_ai_only_telem);
app.use('/api/gap-no-labor-scheduling-ai-for-field', route_gap_no_labor_scheduling_ai_for_field);
app.use('/api/gap-no-soprag-over-forestry-regulations-defe', route_gap_no_soprag_over_forestry_regulations_defe);
app.use('/api/gap-no-modular-tree-inventory-crud-only', route_gap_no_modular_tree_inventory_crud_only);
app.use('/api/gap-no-teamshift-scheduling-for-field-operat', route_gap_no_teamshift_scheduling_for_field_operat);
app.use('/api/gap-no-equipment-fleet-crud-beyond-predictiv', route_gap_no_equipment_fleet_crud_beyond_predictiv);
app.use('/api/gap-no-cost-tracking-pl-module', route_gap_no_cost_tracking_pl_module);
app.use('/api/gap-no-real-iot-mqtt-broker-telemetry', route_gap_no_real_iot_mqtt_broker_telemetry);
app.use('/api/gap-monolithic-structure-makes-route-discove', route_gap_monolithic_structure_makes_route_discove);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
