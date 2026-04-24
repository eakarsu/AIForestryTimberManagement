require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// ============ TREE INVENTORY ============
app.get('/api/tree-inventory', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tree_inventory ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tree-inventory/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tree_inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tree-inventory', authenticateToken, async (req, res) => {
  try {
    const { species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO tree_inventory (species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tree-inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct, notes } = req.body;
    const result = await pool.query(
      'UPDATE tree_inventory SET species=$1, location=$2, latitude=$3, longitude=$4, height_m=$5, diameter_cm=$6, age_years=$7, health_status=$8, canopy_cover_pct=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tree-inventory/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tree_inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ HARVEST PLANS ============
app.get('/api/harvest-plans', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM harvest_plans ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/harvest-plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM harvest_plans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/harvest-plans', authenticateToken, async (req, res) => {
  try {
    const { plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score, environmental_notes } = req.body;
    const result = await pool.query(
      'INSERT INTO harvest_plans (plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score, environmental_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score, environmental_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/harvest-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score, environmental_notes } = req.body;
    const result = await pool.query(
      'UPDATE harvest_plans SET plan_name=$1, plot_id=$2, species_target=$3, volume_m3=$4, method=$5, scheduled_date=$6, status=$7, sustainability_score=$8, environmental_notes=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score, environmental_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/harvest-plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM harvest_plans WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ WILDFIRE ASSESSMENTS ============
app.get('/api/wildfire-assessments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wildfire_assessments ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/wildfire-assessments/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wildfire_assessments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/wildfire-assessments', authenticateToken, async (req, res) => {
  try {
    const { zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure, mitigation_notes } = req.body;
    const result = await pool.query(
      'INSERT INTO wildfire_assessments (zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure, mitigation_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure, mitigation_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/wildfire-assessments/:id', authenticateToken, async (req, res) => {
  try {
    const { zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure, mitigation_notes } = req.body;
    const result = await pool.query(
      'UPDATE wildfire_assessments SET zone_name=$1, latitude=$2, longitude=$3, risk_level=$4, vegetation_density=$5, slope_degree=$6, last_fire_date=$7, moisture_level=$8, wind_exposure=$9, mitigation_notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure, mitigation_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/wildfire-assessments/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wildfire_assessments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ CARBON CREDITS ============
app.get('/api/carbon-credits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carbon_credits ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/carbon-credits/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carbon_credits WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/carbon-credits', authenticateToken, async (req, res) => {
  try {
    const { project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO carbon_credits (project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/carbon-credits/:id', authenticateToken, async (req, res) => {
  try {
    const { project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry, notes } = req.body;
    const result = await pool.query(
      'UPDATE carbon_credits SET project_name=$1, plot_id=$2, credits_earned=$3, verification_status=$4, methodology=$5, vintage_year=$6, buyer=$7, price_per_credit=$8, registry=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/carbon-credits/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM carbon_credits WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ FOREST PLOTS ============
app.get('/api/forest-plots', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forest_plots ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/forest-plots/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forest_plots WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/forest-plots', authenticateToken, async (req, res) => {
  try {
    const { plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO forest_plots (plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/forest-plots/:id', authenticateToken, async (req, res) => {
  try {
    const { plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date, notes } = req.body;
    const result = await pool.query(
      'UPDATE forest_plots SET plot_name=$1, region=$2, area_hectares=$3, elevation_m=$4, soil_type=$5, dominant_species=$6, ownership=$7, certification_status=$8, last_survey_date=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/forest-plots/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM forest_plots WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ EQUIPMENT ============
app.get('/api/equipment', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/equipment/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/equipment', authenticateToken, async (req, res) => {
  try {
    const { name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO equipment (name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/equipment/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate, notes } = req.body;
    const result = await pool.query(
      'UPDATE equipment SET name=$1, type=$2, manufacturer=$3, model_year=$4, condition=$5, assigned_plot=$6, last_maintenance=$7, next_maintenance=$8, hourly_rate=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/equipment/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ WORKERS ============
app.get('/api/workers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO workers (first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact, notes } = req.body;
    const result = await pool.query(
      'UPDATE workers SET first_name=$1, last_name=$2, role=$3, certification=$4, hire_date=$5, hourly_wage=$6, assigned_plot=$7, phone=$8, emergency_contact=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ DISEASE REPORTS ============
app.get('/api/disease-reports', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM disease_reports ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/disease-reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM disease_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/disease-reports', authenticateToken, async (req, res) => {
  try {
    const { tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO disease_reports (tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/disease-reports/:id', authenticateToken, async (req, res) => {
  try {
    const { tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method, notes } = req.body;
    const result = await pool.query(
      'UPDATE disease_reports SET tree_species=$1, disease_name=$2, severity=$3, affected_area_hectares=$4, symptoms=$5, location=$6, detection_date=$7, treatment_status=$8, treatment_method=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/disease-reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM disease_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ TIMBER SALES ============
app.get('/api/timber-sales', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM timber_sales ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/timber-sales/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM timber_sales WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/timber-sales', authenticateToken, async (req, res) => {
  try {
    const { buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO timber_sales (buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/timber-sales/:id', authenticateToken, async (req, res) => {
  try {
    const { buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status, notes } = req.body;
    const result = await pool.query(
      'UPDATE timber_sales SET buyer_name=$1, species=$2, volume_m3=$3, grade=$4, price_per_m3=$5, total_value=$6, sale_date=$7, delivery_date=$8, payment_status=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/timber-sales/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM timber_sales WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ COMPLIANCE REPORTS ============
app.get('/api/compliance-reports', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_reports ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/compliance-reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/compliance-reports', authenticateToken, async (req, res) => {
  try {
    const { report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO compliance_reports (report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/compliance-reports/:id', authenticateToken, async (req, res) => {
  try {
    const { report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id, notes } = req.body;
    const result = await pool.query(
      'UPDATE compliance_reports SET report_name=$1, regulation=$2, audit_date=$3, auditor=$4, status=$5, findings=$6, corrective_actions=$7, next_audit_date=$8, plot_id=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/compliance-reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ AI ROUTES (OpenRouter) ============
const callOpenRouter = async (prompt, systemPrompt) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Forestry Management'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
};

// AI: Tree Species Identification
app.post('/api/ai/species-identification', authenticateToken, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = `You are an expert dendrologist and forestry scientist. When given a description of a tree (bark, leaves, size, location, etc.), identify the species and provide detailed information. Always respond with a structured analysis including: Species Name, Scientific Name, Confidence Level, Key Identifying Features, Habitat, Commercial Value, Conservation Status, and Recommended Management Practices. Be specific and scientific.`;
    const result = await callOpenRouter(description, systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'species-identification' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Sustainable Harvest Planning
app.post('/api/ai/harvest-optimization', authenticateToken, async (req, res) => {
  try {
    const { plotData } = req.body;
    const systemPrompt = `You are an expert in sustainable forestry and timber harvest planning. Analyze the provided plot data and generate an optimized harvest plan that maximizes yield while maintaining ecological sustainability. Include: Recommended Harvest Volume, Optimal Timing, Species Priority, Regeneration Strategy, Environmental Impact Assessment, Sustainability Score (1-100), Buffer Zone Requirements, and Post-Harvest Management Steps. Be quantitative and specific.`;
    const result = await callOpenRouter(JSON.stringify(plotData), systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'harvest-optimization' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Wildfire Risk Assessment
app.post('/api/ai/wildfire-risk', authenticateToken, async (req, res) => {
  try {
    const { zoneData } = req.body;
    const systemPrompt = `You are a wildfire risk assessment expert with deep knowledge of fire behavior, fuel loads, and fire ecology. Analyze the provided zone data and assess wildfire risk. Provide: Overall Risk Rating (Low/Moderate/High/Critical), Fire Behavior Prediction, Fuel Load Assessment, Weather Risk Factors, Mitigation Recommendations (prioritized list), Evacuation Considerations, Firebreak Recommendations, Prescribed Burn Feasibility, and Resource Pre-positioning Strategy. Be specific and actionable.`;
    const result = await callOpenRouter(JSON.stringify(zoneData), systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'wildfire-risk' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Carbon Credit Estimation
app.post('/api/ai/carbon-estimation', authenticateToken, async (req, res) => {
  try {
    const { forestData } = req.body;
    const systemPrompt = `You are a carbon credit specialist and forest carbon sequestration expert. Analyze the provided forest data and estimate carbon credit potential. Provide: Estimated Annual Carbon Sequestration (tonnes CO2), Carbon Credit Value Projection, Methodology Recommendation (VCS, Gold Standard, etc.), Additionality Assessment, Permanence Risk Evaluation, Leakage Risk, Monitoring Requirements, Verification Timeline, and Market Price Range. Use current carbon market knowledge and be quantitative.`;
    const result = await callOpenRouter(JSON.stringify(forestData), systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'carbon-estimation' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Disease Detection Analysis
app.post('/api/ai/disease-analysis', authenticateToken, async (req, res) => {
  try {
    const { symptoms } = req.body;
    const systemPrompt = `You are a forest pathologist specializing in tree diseases and pest management. Analyze the described symptoms and provide a diagnosis. Include: Probable Disease/Pest Identification, Pathogen Type, Severity Assessment (1-10), Spread Risk (Low/Medium/High), Affected Species Susceptibility, Treatment Options (prioritized), Prevention Measures, Quarantine Recommendations, Economic Impact Estimate, and Long-term Management Strategy. Be thorough and scientific.`;
    const result = await callOpenRouter(symptoms, systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'disease-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Growth Rate Prediction
app.post('/api/ai/growth-prediction', authenticateToken, async (req, res) => {
  try {
    const { treeData } = req.body;
    const systemPrompt = `You are a forest mensuration expert specializing in tree growth modeling and yield prediction. Analyze the provided tree data and predict growth patterns. Provide: Projected Annual Height Growth, Diameter Growth Rate, Volume Growth Estimate, Site Index Assessment, Stand Density Impact, Growth Limiting Factors, Optimal Thinning Schedule, Rotation Age Recommendation, Yield Table Projections (5/10/20 year), and Silvicultural Recommendations. Use standard forestry growth models and be quantitative.`;
    const result = await callOpenRouter(JSON.stringify(treeData), systemPrompt);
    res.json({ analysis: result, timestamp: new Date().toISOString(), type: 'growth-prediction' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
