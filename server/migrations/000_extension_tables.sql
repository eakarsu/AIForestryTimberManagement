BEGIN;
CREATE TABLE IF NOT EXISTS ai_results (
 id SERIAL PRIMARY KEY, user_id INTEGER, entity_type VARCHAR(100), entity_id INTEGER,
 analysis_type VARCHAR(100), model VARCHAR(255), raw_response TEXT, parsed_data JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_entity ON ai_results(entity_type,entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);
CREATE TABLE IF NOT EXISTS safety_incidents (
 id SERIAL PRIMARY KEY, incident_type VARCHAR(100), severity VARCHAR(50), description TEXT,
 plot_id INTEGER, worker_id INTEGER, occurred_at TIMESTAMPTZ DEFAULT NOW(), near_miss BOOLEAN DEFAULT FALSE,
 root_cause TEXT, ai_analysis JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS market_prices (
 id SERIAL PRIMARY KEY, species VARCHAR(255), grade VARCHAR(100), price_per_m3 DECIMAL(12,2),
 region VARCHAR(255), recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weather_alerts (
 id SERIAL PRIMARY KEY, region VARCHAR(255), alert_type VARCHAR(100), severity VARCHAR(50),
 payload JSONB, ai_analysis JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tree_inventory') THEN ALTER TABLE tree_inventory ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='harvest_plans') THEN ALTER TABLE harvest_plans ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='wildfire_assessments') THEN ALTER TABLE wildfire_assessments ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='carbon_credits') THEN ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='disease_reports') THEN ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='compliance_reports') THEN ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB; END IF;
END $$;
COMMIT;
