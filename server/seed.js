require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (process.env.CONFIRM_DEMO_SEED !== 'yes') {
  throw new Error('Destructive demo seed refused; use scripts/seed-demo.sh with CONFIRM_DEMO_SEED=yes');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('Starting database seed...');

  // Create tables
  await pool.query(`
    DROP TABLE IF EXISTS compliance_reports CASCADE;
    DROP TABLE IF EXISTS timber_sales CASCADE;
    DROP TABLE IF EXISTS disease_reports CASCADE;
    DROP TABLE IF EXISTS workers CASCADE;
    DROP TABLE IF EXISTS equipment CASCADE;
    DROP TABLE IF EXISTS carbon_credits CASCADE;
    DROP TABLE IF EXISTS wildfire_assessments CASCADE;
    DROP TABLE IF EXISTS harvest_plans CASCADE;
    DROP TABLE IF EXISTS tree_inventory CASCADE;
    DROP TABLE IF EXISTS forest_plots CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE forest_plots (
      id SERIAL PRIMARY KEY,
      plot_name VARCHAR(255) NOT NULL,
      region VARCHAR(255),
      area_hectares DECIMAL(10,2),
      elevation_m INTEGER,
      soil_type VARCHAR(100),
      dominant_species VARCHAR(255),
      ownership VARCHAR(100),
      certification_status VARCHAR(100),
      last_survey_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE tree_inventory (
      id SERIAL PRIMARY KEY,
      species VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      latitude DECIMAL(10,6),
      longitude DECIMAL(10,6),
      height_m DECIMAL(6,2),
      diameter_cm DECIMAL(6,2),
      age_years INTEGER,
      health_status VARCHAR(50),
      canopy_cover_pct INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE harvest_plans (
      id SERIAL PRIMARY KEY,
      plan_name VARCHAR(255) NOT NULL,
      plot_id INTEGER,
      species_target VARCHAR(255),
      volume_m3 DECIMAL(10,2),
      method VARCHAR(100),
      scheduled_date DATE,
      status VARCHAR(50),
      sustainability_score INTEGER,
      environmental_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE wildfire_assessments (
      id SERIAL PRIMARY KEY,
      zone_name VARCHAR(255) NOT NULL,
      latitude DECIMAL(10,6),
      longitude DECIMAL(10,6),
      risk_level VARCHAR(50),
      vegetation_density VARCHAR(50),
      slope_degree DECIMAL(5,2),
      last_fire_date DATE,
      moisture_level VARCHAR(50),
      wind_exposure VARCHAR(50),
      mitigation_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE carbon_credits (
      id SERIAL PRIMARY KEY,
      project_name VARCHAR(255) NOT NULL,
      plot_id INTEGER,
      credits_earned DECIMAL(12,2),
      verification_status VARCHAR(50),
      methodology VARCHAR(100),
      vintage_year INTEGER,
      buyer VARCHAR(255),
      price_per_credit DECIMAL(10,2),
      registry VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE equipment (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      manufacturer VARCHAR(255),
      model_year INTEGER,
      condition VARCHAR(50),
      assigned_plot VARCHAR(255),
      last_maintenance DATE,
      next_maintenance DATE,
      hourly_rate DECIMAL(8,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE workers (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      role VARCHAR(100),
      certification VARCHAR(255),
      hire_date DATE,
      hourly_wage DECIMAL(8,2),
      assigned_plot VARCHAR(255),
      phone VARCHAR(50),
      emergency_contact VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE disease_reports (
      id SERIAL PRIMARY KEY,
      tree_species VARCHAR(255) NOT NULL,
      disease_name VARCHAR(255) NOT NULL,
      severity VARCHAR(50),
      affected_area_hectares DECIMAL(10,2),
      symptoms TEXT,
      location VARCHAR(255),
      detection_date DATE,
      treatment_status VARCHAR(50),
      treatment_method VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE timber_sales (
      id SERIAL PRIMARY KEY,
      buyer_name VARCHAR(255) NOT NULL,
      species VARCHAR(255),
      volume_m3 DECIMAL(10,2),
      grade VARCHAR(50),
      price_per_m3 DECIMAL(10,2),
      total_value DECIMAL(12,2),
      sale_date DATE,
      delivery_date DATE,
      payment_status VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE compliance_reports (
      id SERIAL PRIMARY KEY,
      report_name VARCHAR(255) NOT NULL,
      regulation VARCHAR(255),
      audit_date DATE,
      auditor VARCHAR(255),
      status VARCHAR(50),
      findings TEXT,
      corrective_actions TEXT,
      next_audit_date DATE,
      plot_id INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created.');

  // Seed users
  const passwordHash = await bcrypt.hash('admin123', 10);
  await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ('Admin User', 'admin@forestry.com', $1)",
    [passwordHash]
  );
  console.log('User seeded: admin@forestry.com / admin123');

  // Seed Forest Plots (15 items)
  const forestPlots = [
    ['Evergreen Ridge Plot A', 'Pacific Northwest', 245.5, 850, 'Loam', 'Douglas Fir', 'Company', 'FSC Certified', '2025-06-15'],
    ['Cedar Valley Block 3', 'British Columbia', 180.0, 620, 'Sandy Loam', 'Western Red Cedar', 'Company', 'FSC Certified', '2025-03-20'],
    ['Pine Highlands Unit 7', 'Sierra Nevada', 320.0, 1200, 'Clay Loam', 'Ponderosa Pine', 'Federal', 'Pending', '2024-11-10'],
    ['Maple Creek Reserve', 'Great Lakes Region', 150.0, 380, 'Silt Loam', 'Sugar Maple', 'Private', 'SFI Certified', '2025-01-22'],
    ['Redwood Coastal Strip', 'Northern California', 95.0, 120, 'Alluvial', 'Coast Redwood', 'State', 'FSC Certified', '2025-05-08'],
    ['Birch Meadow East', 'New England', 175.0, 450, 'Sandy Clay', 'Paper Birch', 'Private', 'Not Certified', '2024-09-30'],
    ['Spruce Mountain Block', 'Appalachian', 290.0, 1050, 'Rocky Loam', 'Red Spruce', 'Federal', 'FSC Certified', '2025-02-14'],
    ['Oak Flatlands South', 'Ozark Region', 210.0, 320, 'Clay', 'White Oak', 'Company', 'SFI Certified', '2025-04-18'],
    ['Hemlock Gorge Unit', 'Pacific Northwest', 130.0, 750, 'Loam', 'Western Hemlock', 'Company', 'FSC Certified', '2024-12-05'],
    ['Aspen Grove North', 'Rocky Mountains', 185.0, 2400, 'Sandy Loam', 'Quaking Aspen', 'Federal', 'Pending', '2025-07-01'],
    ['Cypress Swamp Block', 'Gulf Coast', 110.0, 15, 'Peat', 'Bald Cypress', 'State', 'Not Certified', '2024-08-22'],
    ['Teak Plantation Alpha', 'Hawaii', 85.0, 300, 'Volcanic', 'Teak', 'Private', 'PEFC Certified', '2025-03-10'],
    ['Walnut Valley Reserve', 'Midwest', 200.0, 280, 'Silt Loam', 'Black Walnut', 'Private', 'SFI Certified', '2024-10-15'],
    ['Juniper Desert Block', 'Southwest', 350.0, 1800, 'Sandy', 'Western Juniper', 'Federal', 'Not Certified', '2025-01-08'],
    ['Larch Alpine Unit', 'Northern Rockies', 160.0, 2100, 'Rocky Clay', 'Western Larch', 'Federal', 'FSC Certified', '2025-06-20']
  ];
  for (const p of forestPlots) {
    await pool.query(
      'INSERT INTO forest_plots (plot_name, region, area_hectares, elevation_m, soil_type, dominant_species, ownership, certification_status, last_survey_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      p
    );
  }
  console.log('Forest plots seeded: 15 items');

  // Seed Tree Inventory (15 items)
  const trees = [
    ['Douglas Fir', 'Evergreen Ridge Plot A', 47.6234, -122.3321, 65.0, 120.5, 180, 'Healthy', 85],
    ['Western Red Cedar', 'Cedar Valley Block 3', 49.2827, -123.1207, 55.0, 95.0, 250, 'Healthy', 90],
    ['Ponderosa Pine', 'Pine Highlands Unit 7', 38.8951, -120.0427, 45.0, 80.0, 120, 'Fair', 70],
    ['Sugar Maple', 'Maple Creek Reserve', 44.9778, -85.2135, 30.0, 65.0, 90, 'Healthy', 75],
    ['Coast Redwood', 'Redwood Coastal Strip', 41.2132, -124.0046, 95.0, 220.0, 400, 'Excellent', 95],
    ['Paper Birch', 'Birch Meadow East', 43.6532, -72.2454, 22.0, 35.0, 50, 'Fair', 60],
    ['Red Spruce', 'Spruce Mountain Block', 35.5951, -82.5515, 38.0, 55.0, 150, 'Healthy', 80],
    ['White Oak', 'Oak Flatlands South', 36.6545, -92.1535, 28.0, 90.0, 200, 'Good', 72],
    ['Western Hemlock', 'Hemlock Gorge Unit', 46.8797, -121.7270, 50.0, 75.0, 130, 'Healthy', 88],
    ['Quaking Aspen', 'Aspen Grove North', 40.5853, -105.0844, 20.0, 30.0, 60, 'Good', 65],
    ['Bald Cypress', 'Cypress Swamp Block', 30.2266, -89.8590, 35.0, 100.0, 300, 'Healthy', 78],
    ['Teak', 'Teak Plantation Alpha', 19.8968, -155.5828, 25.0, 45.0, 40, 'Excellent', 82],
    ['Black Walnut', 'Walnut Valley Reserve', 39.7817, -89.6501, 32.0, 70.0, 110, 'Good', 68],
    ['Western Juniper', 'Juniper Desert Block', 34.0522, -111.0937, 15.0, 40.0, 250, 'Fair', 45],
    ['Western Larch', 'Larch Alpine Unit', 47.0502, -114.5910, 42.0, 60.0, 160, 'Healthy', 76]
  ];
  for (const t of trees) {
    await pool.query(
      'INSERT INTO tree_inventory (species, location, latitude, longitude, height_m, diameter_cm, age_years, health_status, canopy_cover_pct) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      t
    );
  }
  console.log('Tree inventory seeded: 15 items');

  // Seed Harvest Plans (15 items)
  const harvestPlans = [
    ['Spring Selective Cut 2026', 1, 'Douglas Fir', 450.0, 'Selective Cutting', '2026-04-15', 'Approved', 88],
    ['Cedar Thinning Program', 2, 'Western Red Cedar', 280.0, 'Thinning', '2026-05-01', 'Planned', 92],
    ['Pine Salvage Operation', 3, 'Ponderosa Pine', 620.0, 'Salvage Logging', '2026-03-20', 'In Progress', 75],
    ['Maple Sustainable Harvest', 4, 'Sugar Maple', 180.0, 'Selection System', '2026-09-10', 'Planned', 95],
    ['Oak Shelterwood Cut', 8, 'White Oak', 350.0, 'Shelterwood', '2026-06-15', 'Approved', 85],
    ['Hemlock Clearcut Block C', 9, 'Western Hemlock', 800.0, 'Clearcut', '2026-07-01', 'Planned', 65],
    ['Aspen Coppice Rotation', 10, 'Quaking Aspen', 150.0, 'Coppicing', '2026-08-20', 'Approved', 90],
    ['Walnut Premium Selection', 13, 'Black Walnut', 95.0, 'Single Tree Selection', '2026-10-01', 'Planned', 98],
    ['Larch Winter Harvest', 15, 'Western Larch', 520.0, 'Strip Cutting', '2026-12-01', 'Planned', 82],
    ['Birch Improvement Cut', 6, 'Paper Birch', 200.0, 'Improvement Cutting', '2026-04-30', 'Approved', 87],
    ['Spruce Seed Tree Cut', 7, 'Red Spruce', 380.0, 'Seed Tree', '2026-05-15', 'In Progress', 80],
    ['Teak Rotation Harvest', 12, 'Teak', 120.0, 'Rotation', '2026-11-01', 'Planned', 93],
    ['Redwood Limited Select', 5, 'Coast Redwood', 50.0, 'Single Tree Selection', '2026-06-01', 'Approved', 99],
    ['Cypress Selective Thin', 11, 'Bald Cypress', 160.0, 'Thinning', '2026-09-15', 'Planned', 91],
    ['Juniper Restoration Cut', 14, 'Western Juniper', 300.0, 'Restoration Cutting', '2026-07-20', 'Approved', 78]
  ];
  for (const h of harvestPlans) {
    await pool.query(
      'INSERT INTO harvest_plans (plan_name, plot_id, species_target, volume_m3, method, scheduled_date, status, sustainability_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      h
    );
  }
  console.log('Harvest plans seeded: 15 items');

  // Seed Wildfire Assessments (15 items)
  const wildfireAssessments = [
    ['Evergreen Ridge Zone A', 47.6234, -122.3321, 'Moderate', 'Dense', 25.0, '2020-08-15', 'Medium', 'Moderate'],
    ['Cedar Valley Fire Zone', 49.2827, -123.1207, 'Low', 'Dense', 10.0, '2018-07-20', 'High', 'Low'],
    ['Pine Highlands Critical', 38.8951, -120.0427, 'Critical', 'Very Dense', 35.0, '2023-09-01', 'Low', 'High'],
    ['Maple Creek Buffer', 44.9778, -85.2135, 'Low', 'Medium', 5.0, '2015-06-10', 'High', 'Low'],
    ['Redwood Coastal Zone', 41.2132, -124.0046, 'Moderate', 'Very Dense', 15.0, '2019-10-05', 'Medium', 'Moderate'],
    ['Birch Meadow Zone', 43.6532, -72.2454, 'Low', 'Sparse', 8.0, '2016-04-22', 'High', 'Low'],
    ['Spruce Mountain Fire Risk', 35.5951, -82.5515, 'High', 'Dense', 30.0, '2021-11-15', 'Low', 'High'],
    ['Oak Flatlands Zone', 36.6545, -92.1535, 'Moderate', 'Medium', 12.0, '2022-03-18', 'Medium', 'Moderate'],
    ['Hemlock Gorge Critical', 46.8797, -121.7270, 'High', 'Very Dense', 40.0, '2024-08-30', 'Low', 'High'],
    ['Aspen Grove Fire Zone', 40.5853, -105.0844, 'High', 'Medium', 28.0, '2023-06-12', 'Low', 'High'],
    ['Cypress Swamp Zone', 30.2266, -89.8590, 'Low', 'Dense', 2.0, '2010-05-01', 'Very High', 'Low'],
    ['Teak Plantation Zone', 19.8968, -155.5828, 'Moderate', 'Medium', 18.0, '2022-01-15', 'Medium', 'Moderate'],
    ['Walnut Valley Zone', 39.7817, -89.6501, 'Moderate', 'Sparse', 6.0, '2019-07-22', 'Medium', 'Low'],
    ['Juniper Desert Critical', 34.0522, -111.0937, 'Critical', 'Sparse', 22.0, '2024-06-01', 'Very Low', 'Very High'],
    ['Larch Alpine Zone', 47.0502, -114.5910, 'High', 'Dense', 32.0, '2022-09-08', 'Low', 'High']
  ];
  for (const w of wildfireAssessments) {
    await pool.query(
      'INSERT INTO wildfire_assessments (zone_name, latitude, longitude, risk_level, vegetation_density, slope_degree, last_fire_date, moisture_level, wind_exposure) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      w
    );
  }
  console.log('Wildfire assessments seeded: 15 items');

  // Seed Carbon Credits (15 items)
  const carbonCredits = [
    ['Evergreen Carbon Offset', 1, 12500.00, 'Verified', 'VCS', 2025, 'GreenCorp Inc', 28.50, 'Verra'],
    ['Cedar Sequestration Project', 2, 8200.00, 'Verified', 'Gold Standard', 2025, 'EcoTrade Ltd', 35.00, 'Gold Standard'],
    ['Pine Reforestation Credits', 3, 15000.00, 'Pending', 'VCS', 2026, null, 25.00, 'Verra'],
    ['Maple Conservation Credit', 4, 5500.00, 'Verified', 'ACR', 2024, 'CarbonBridge', 32.00, 'ACR'],
    ['Redwood Preservation Fund', 5, 22000.00, 'Verified', 'VCS', 2025, 'TechGreen Corp', 45.00, 'Verra'],
    ['Birch Restoration Credits', 6, 3800.00, 'Under Review', 'Gold Standard', 2025, null, 30.00, 'Gold Standard'],
    ['Spruce Afforestation Project', 7, 9800.00, 'Verified', 'VCS', 2024, 'SustainFund', 27.50, 'Verra'],
    ['Oak Preservation Credits', 8, 7200.00, 'Verified', 'ACR', 2025, 'NatureBond', 33.00, 'ACR'],
    ['Hemlock Carbon Sink', 9, 11000.00, 'Pending', 'VCS', 2026, null, 26.00, 'Verra'],
    ['Aspen Regeneration Credit', 10, 4500.00, 'Verified', 'Gold Standard', 2024, 'ClimateFirst', 38.00, 'Gold Standard'],
    ['Cypress Wetland Carbon', 11, 6800.00, 'Verified', 'VCS', 2025, 'BlueCarbonInc', 40.00, 'Verra'],
    ['Teak Plantation Offset', 12, 3200.00, 'Under Review', 'Gold Standard', 2025, null, 29.00, 'Gold Standard'],
    ['Walnut Agroforestry Credit', 13, 2800.00, 'Verified', 'ACR', 2024, 'AgriCarbon', 36.00, 'ACR'],
    ['Juniper Restoration Carbon', 14, 5100.00, 'Pending', 'VCS', 2026, null, 22.00, 'Verra'],
    ['Larch Conservation Credit', 15, 8500.00, 'Verified', 'VCS', 2025, 'ForestPartners', 31.00, 'Verra']
  ];
  for (const c of carbonCredits) {
    await pool.query(
      'INSERT INTO carbon_credits (project_name, plot_id, credits_earned, verification_status, methodology, vintage_year, buyer, price_per_credit, registry) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      c
    );
  }
  console.log('Carbon credits seeded: 15 items');

  // Seed Equipment (15 items)
  const equipment = [
    ['CAT 320F Harvester', 'Harvester', 'Caterpillar', 2022, 'Excellent', 'Evergreen Ridge Plot A', '2025-11-15', '2026-05-15', 185.00],
    ['John Deere 1510G Forwarder', 'Forwarder', 'John Deere', 2021, 'Good', 'Cedar Valley Block 3', '2025-10-20', '2026-04-20', 165.00],
    ['Komatsu PC200 Excavator', 'Excavator', 'Komatsu', 2023, 'Excellent', 'Pine Highlands Unit 7', '2025-12-01', '2026-06-01', 175.00],
    ['Tigercat 635E Skidder', 'Skidder', 'Tigercat', 2020, 'Fair', 'Oak Flatlands South', '2025-09-15', '2026-03-15', 145.00],
    ['Ponsse Scorpion King', 'Harvester', 'Ponsse', 2023, 'Excellent', 'Hemlock Gorge Unit', '2025-12-10', '2026-06-10', 200.00],
    ['Bell B30E Log Truck', 'Transport', 'Bell', 2019, 'Good', null, '2025-08-20', '2026-02-20', 120.00],
    ['Husqvarna 572XP Chainsaw', 'Chainsaw', 'Husqvarna', 2024, 'Excellent', 'Maple Creek Reserve', '2026-01-05', '2026-07-05', 15.00],
    ['DJI Matrice 300 Drone', 'Drone', 'DJI', 2024, 'Excellent', null, '2026-01-15', '2026-07-15', 45.00],
    ['Trimble GeoXH GPS', 'Survey Equipment', 'Trimble', 2022, 'Good', null, '2025-11-01', '2026-05-01', 35.00],
    ['Log Max 7000C Head', 'Processor Head', 'Log Max', 2021, 'Good', 'Spruce Mountain Block', '2025-10-10', '2026-04-10', 155.00],
    ['Volvo A40G Hauler', 'Transport', 'Volvo', 2020, 'Fair', 'Larch Alpine Unit', '2025-09-25', '2026-03-25', 130.00],
    ['Stihl MS 881 Chainsaw', 'Chainsaw', 'Stihl', 2023, 'Good', 'Walnut Valley Reserve', '2025-12-20', '2026-06-20', 12.00],
    ['Komatsu D65PX Dozer', 'Bulldozer', 'Komatsu', 2021, 'Good', 'Aspen Grove North', '2025-10-30', '2026-04-30', 160.00],
    ['Prentice 2384 Loader', 'Log Loader', 'Prentice', 2019, 'Fair', 'Birch Meadow East', '2025-08-15', '2026-02-15', 140.00],
    ['Fire Boss AT802F', 'Fire Suppression', 'Air Tractor', 2022, 'Excellent', null, '2025-11-20', '2026-05-20', 500.00]
  ];
  for (const e of equipment) {
    await pool.query(
      'INSERT INTO equipment (name, type, manufacturer, model_year, condition, assigned_plot, last_maintenance, next_maintenance, hourly_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      e
    );
  }
  console.log('Equipment seeded: 15 items');

  // Seed Workers (15 items)
  const workers = [
    ['James', 'Mitchell', 'Lead Forester', 'ISA Certified Arborist', '2018-03-15', 42.00, 'Evergreen Ridge Plot A', '(503) 555-0101', 'Mary Mitchell (503) 555-0102'],
    ['Sarah', 'Chen', 'Forest Engineer', 'Professional Engineer', '2019-06-20', 48.00, 'Cedar Valley Block 3', '(604) 555-0201', 'David Chen (604) 555-0202'],
    ['Carlos', 'Rodriguez', 'Harvest Operator', 'Heavy Equipment Operator', '2020-01-10', 35.00, 'Pine Highlands Unit 7', '(530) 555-0301', 'Maria Rodriguez (530) 555-0302'],
    ['Emma', 'Thompson', 'Wildlife Biologist', 'M.Sc. Wildlife Biology', '2021-04-05', 45.00, 'Maple Creek Reserve', '(616) 555-0401', 'John Thompson (616) 555-0402'],
    ['Michael', 'Blackwood', 'Fire Management', 'Wildland Firefighter Type 1', '2017-08-22', 40.00, null, '(707) 555-0501', 'Lisa Blackwood (707) 555-0502'],
    ['Aisha', 'Patel', 'GIS Specialist', 'GISP Certified', '2022-02-14', 44.00, null, '(802) 555-0601', 'Raj Patel (802) 555-0602'],
    ['Robert', 'Olsen', 'Logging Supervisor', 'Master Logger', '2015-09-01', 38.00, 'Spruce Mountain Block', '(828) 555-0701', 'Karen Olsen (828) 555-0702'],
    ['Jennifer', 'Whitehorse', 'Sustainability Mgr', 'FSC Lead Auditor', '2020-11-15', 52.00, null, '(479) 555-0801', 'Tom Whitehorse (479) 555-0802'],
    ['David', 'Nakamura', 'Equipment Mechanic', 'Diesel Mechanic Certified', '2019-03-28', 36.00, null, '(360) 555-0901', 'Yuki Nakamura (360) 555-0902'],
    ['Lisa', 'Fernandez', 'Carbon Analyst', 'Verra Carbon Verifier', '2023-01-15', 46.00, null, '(720) 555-1001', 'Marco Fernandez (720) 555-1002'],
    ['Thomas', 'Berg', 'Timber Cruiser', 'SAF Certified Forester', '2018-07-10', 37.00, 'Oak Flatlands South', '(501) 555-1101', 'Anne Berg (501) 555-1102'],
    ['Maria', 'Kowalski', 'Drone Operator', 'FAA Part 107', '2023-06-01', 34.00, null, '(808) 555-1201', 'Jan Kowalski (808) 555-1202'],
    ['Kevin', 'O\'Brien', 'Road Engineer', 'Civil Engineer', '2021-09-20', 47.00, 'Walnut Valley Reserve', '(217) 555-1301', 'Siobhan O Brien (217) 555-1302'],
    ['Andrea', 'Morales', 'Nursery Manager', 'Horticulture Specialist', '2020-05-12', 33.00, 'Teak Plantation Alpha', '(808) 555-1401', 'Diego Morales (808) 555-1402'],
    ['William', 'Fraser', 'Safety Officer', 'OSHA 30 Certified', '2016-11-08', 41.00, null, '(406) 555-1501', 'Helen Fraser (406) 555-1502']
  ];
  for (const w of workers) {
    await pool.query(
      'INSERT INTO workers (first_name, last_name, role, certification, hire_date, hourly_wage, assigned_plot, phone, emergency_contact) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      w
    );
  }
  console.log('Workers seeded: 15 items');

  // Seed Disease Reports (15 items)
  const diseaseReports = [
    ['Douglas Fir', 'Laminated Root Rot', 'High', 12.5, 'Crown thinning, resinosis at base, windthrow of adjacent trees', 'Evergreen Ridge Plot A', '2025-08-15', 'Under Treatment', 'Stump removal and borax application'],
    ['Western Red Cedar', 'Cedar Leaf Blight', 'Moderate', 5.0, 'Browning of foliage, defoliation in lower crown', 'Cedar Valley Block 3', '2025-06-20', 'Monitoring', 'Improved air circulation through thinning'],
    ['Ponderosa Pine', 'Mountain Pine Beetle', 'Critical', 45.0, 'Pitch tubes on bark, boring dust, fading crowns', 'Pine Highlands Unit 7', '2025-09-01', 'Active Response', 'Pheromone traps and salvage logging'],
    ['Sugar Maple', 'Maple Decline', 'Moderate', 8.0, 'Dieback of upper branches, sparse canopy, epicormic shoots', 'Maple Creek Reserve', '2025-05-10', 'Under Treatment', 'Soil amendment and decompaction'],
    ['Paper Birch', 'Bronze Birch Borer', 'High', 15.0, 'D-shaped exit holes, crown dieback from top down', 'Birch Meadow East', '2025-07-22', 'Under Treatment', 'Systemic insecticide treatment'],
    ['Red Spruce', 'Spruce Budworm', 'High', 22.0, 'Defoliation of new growth, silk webbing on branches', 'Spruce Mountain Block', '2025-06-15', 'Active Response', 'Btk aerial spray application'],
    ['White Oak', 'Oak Wilt', 'Critical', 18.0, 'Rapid leaf wilting, vascular discoloration in sapwood', 'Oak Flatlands South', '2025-08-30', 'Active Response', 'Trenching and fungicide injection'],
    ['Western Hemlock', 'Hemlock Woolly Adelgid', 'Moderate', 7.5, 'White woolly masses at needle bases, needle loss', 'Hemlock Gorge Unit', '2025-04-18', 'Under Treatment', 'Predator beetle release'],
    ['Quaking Aspen', 'Sudden Aspen Decline', 'High', 30.0, 'Rapid crown loss, bark beetle galleries, cankers', 'Aspen Grove North', '2025-09-05', 'Monitoring', 'Drought stress mitigation'],
    ['Bald Cypress', 'Cypress Canker', 'Low', 2.0, 'Localized bark lesions, resin bleeding', 'Cypress Swamp Block', '2025-03-12', 'Resolved', 'Pruning of affected branches'],
    ['Teak', 'Teak Defoliator', 'Moderate', 6.0, 'Complete defoliation by larvae, reduced growth', 'Teak Plantation Alpha', '2025-10-01', 'Under Treatment', 'Neem-based biopesticide'],
    ['Black Walnut', 'Thousand Cankers Disease', 'High', 10.0, 'Numerous small cankers under bark, branch dieback', 'Walnut Valley Reserve', '2025-07-08', 'Active Response', 'Quarantine and removal of infected trees'],
    ['Western Juniper', 'Juniper Mistletoe', 'Low', 20.0, 'Dense parasitic growths, reduced vigor', 'Juniper Desert Block', '2025-02-20', 'Monitoring', 'Pruning of infected branches'],
    ['Western Larch', 'Larch Casebearer', 'Moderate', 9.0, 'Mining of needles, small cases on foliage', 'Larch Alpine Unit', '2025-05-25', 'Under Treatment', 'Parasitoid wasp introduction'],
    ['Coast Redwood', 'Sudden Oak Death (Phytophthora)', 'Low', 1.5, 'Cankers on lower trunk, leaf spots on bay laurel nearby', 'Redwood Coastal Strip', '2025-11-10', 'Monitoring', 'Phosphonate trunk injection']
  ];
  for (const d of diseaseReports) {
    await pool.query(
      'INSERT INTO disease_reports (tree_species, disease_name, severity, affected_area_hectares, symptoms, location, detection_date, treatment_status, treatment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      d
    );
  }
  console.log('Disease reports seeded: 15 items');

  // Seed Timber Sales (15 items)
  const timberSales = [
    ['Pacific Lumber Co', 'Douglas Fir', 320.0, 'Premium', 185.00, 59200.00, '2025-10-15', '2025-12-01', 'Paid'],
    ['Cascade Wood Products', 'Western Red Cedar', 180.0, 'Select', 240.00, 43200.00, '2025-09-20', '2025-11-15', 'Paid'],
    ['Sierra Forest Products', 'Ponderosa Pine', 450.0, 'Standard', 120.00, 54000.00, '2025-11-01', '2026-01-15', 'Pending'],
    ['Great Lakes Hardwoods', 'Sugar Maple', 95.0, 'Premium', 310.00, 29450.00, '2025-08-10', '2025-10-05', 'Paid'],
    ['Heritage Timber Ltd', 'Coast Redwood', 25.0, 'Ultra Premium', 850.00, 21250.00, '2025-07-15', '2025-08-30', 'Paid'],
    ['Northern Paper Mills', 'Paper Birch', 280.0, 'Pulpwood', 65.00, 18200.00, '2025-12-01', '2026-02-15', 'Invoiced'],
    ['Appalachian Woodcraft', 'Red Spruce', 210.0, 'Select', 195.00, 40950.00, '2025-10-20', '2025-12-20', 'Paid'],
    ['Ozark Barrel Company', 'White Oak', 150.0, 'Premium', 280.00, 42000.00, '2025-09-05', '2025-11-01', 'Paid'],
    ['Northwest Framing Supply', 'Western Hemlock', 520.0, 'Standard', 110.00, 57200.00, '2025-11-15', '2026-01-30', 'Pending'],
    ['Mountain Log Homes', 'Western Larch', 180.0, 'Select', 175.00, 31500.00, '2025-08-25', '2025-10-20', 'Paid'],
    ['Southern Cypress Works', 'Bald Cypress', 90.0, 'Premium', 320.00, 28800.00, '2025-07-01', '2025-09-15', 'Paid'],
    ['Tropical Hardwoods Inc', 'Teak', 60.0, 'Ultra Premium', 920.00, 55200.00, '2025-06-15', '2025-08-10', 'Paid'],
    ['Heartland Furniture Co', 'Black Walnut', 45.0, 'Premium', 650.00, 29250.00, '2025-10-01', '2025-11-25', 'Invoiced'],
    ['Western Fence Supply', 'Western Juniper', 200.0, 'Utility', 55.00, 11000.00, '2025-12-10', '2026-02-28', 'Pending'],
    ['Rocky Mountain Timber', 'Quaking Aspen', 350.0, 'Standard', 75.00, 26250.00, '2025-09-15', '2025-11-10', 'Paid']
  ];
  for (const s of timberSales) {
    await pool.query(
      'INSERT INTO timber_sales (buyer_name, species, volume_m3, grade, price_per_m3, total_value, sale_date, delivery_date, payment_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      s
    );
  }
  console.log('Timber sales seeded: 15 items');

  // Seed Compliance Reports (15 items)
  const complianceReports = [
    ['FSC Annual Audit 2025', 'FSC Principles & Criteria', '2025-06-15', 'Bureau Veritas', 'Passed', 'Minor finding: incomplete chain of custody documentation for Block 3', 'Update CoC records within 30 days', '2026-06-15', 1],
    ['SFI Fiber Sourcing', 'SFI Standard 2022', '2025-03-20', 'PricewaterhouseCoopers', 'Passed', 'All criteria met', 'Continue current practices', '2026-03-20', 4],
    ['EPA Water Quality Review', 'Clean Water Act Section 404', '2025-08-10', 'EPA Region 10', 'Passed with Conditions', 'Sedimentation noted in Creek B near harvest area', 'Install additional silt fencing and check dams', '2026-02-10', 3],
    ['OSHA Safety Inspection', 'OSHA 29 CFR 1910', '2025-05-22', 'OSHA Inspector', 'Passed', 'All safety protocols current', 'Update first aid kits quarterly', '2025-11-22', null],
    ['State Timber Harvest Permit', 'State Forest Practices Act', '2025-07-01', 'State DNR', 'Approved', 'Harvest plan meets all state requirements', 'Submit post-harvest report within 60 days of completion', '2026-07-01', 1],
    ['Endangered Species Compliance', 'Endangered Species Act', '2025-04-15', 'US Fish & Wildlife', 'Passed', 'No threatened species found in harvest zone', 'Conduct pre-harvest surveys annually', '2026-04-15', 5],
    ['PEFC Certification Audit', 'PEFC International Standard', '2025-09-30', 'SGS SA', 'Passed', 'Strong community engagement documented', 'Maintain stakeholder consultation process', '2026-09-30', 12],
    ['Fire Prevention Plan Review', 'State Fire Code', '2025-02-28', 'State Fire Marshal', 'Approved', 'Fire breaks maintained to standard', 'Update fire response plan seasonally', '2025-08-28', null],
    ['ACR Carbon Verification', 'American Carbon Registry Standard', '2025-10-15', 'SCS Global', 'Verified', 'Carbon stock measurements within 5% of projections', 'Continue annual monitoring plots', '2026-10-15', 8],
    ['Cultural Resource Survey', 'National Historic Preservation Act', '2025-01-20', 'Heritage Consultants', 'Cleared', 'No archaeological sites in proposed harvest area', 'Report any discoveries during operations', '2028-01-20', 7],
    ['Wetland Delineation Report', 'Clean Water Act Section 404', '2025-05-10', 'Environmental Consultants LLC', 'Approved', 'Wetland boundaries properly marked', 'Maintain 50m buffer zones', '2027-05-10', 11],
    ['Air Quality Permit', 'Clean Air Act', '2025-03-15', 'State DEQ', 'Approved', 'Prescribed burn emissions within limits', 'Submit burn plans 30 days in advance', '2026-03-15', null],
    ['Road Use Agreement', 'Federal Road Standards', '2025-06-30', 'USFS District Ranger', 'Active', 'Road maintenance obligations current', 'Grade and drain roads after each harvest season', '2026-06-30', 14],
    ['Herbicide Application Permit', 'FIFRA Regulations', '2025-08-20', 'State Agriculture Dept', 'Approved', 'Licensed applicators on staff', 'Maintain application records for 3 years', '2026-08-20', 6],
    ['Verra VCS Verification', 'VCS Standard v4.0', '2025-11-05', 'RINA Services', 'Verified', 'Additionality demonstrated, baselines accurate', 'Update project description document', '2026-11-05', 15]
  ];
  for (const c of complianceReports) {
    await pool.query(
      'INSERT INTO compliance_reports (report_name, regulation, audit_date, auditor, status, findings, corrective_actions, next_audit_date, plot_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      c
    );
  }
  console.log('Compliance reports seeded: 15 items');

  console.log('\nDatabase seeding complete!');
  console.log('Login: admin@forestry.com / admin123');
  pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  pool.end();
  process.exit(1);
});
