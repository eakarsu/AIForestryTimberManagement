// Agentic forest planning: multi-agent coordination across harvest scheduling,
// equipment routing, and environmental compliance.
// Audit: batch_04.md / AIForestryTimberManagement / Custom Feature Suggestions #1
const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function agenticForestPlannerRoutes(pool) {
  const router = express.Router();

  const auth = (req, res, next) => {
    const h = req.headers['authorization'];
    const token = h && h.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      next();
    } catch { return res.status(403).json({ error: 'Invalid token' }); }
  };

  async function callAI(systemPrompt, userPrompt) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
        'X-Title': 'AI Forestry Management - Agentic Planner'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || 'AI failed');
    return data.choices[0].message.content;
  }

  function parseJSON(text) {
    try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {}
    return { notes: text };
  }

  // POST /api/agentic-forest-plan - coordinates harvest, routing, compliance
  router.post('/', auth, async (req, res) => {
    try {
      const { region, horizon_days = 30, constraints = {} } = req.body || {};

      const incidents = await pool.query(
        `SELECT * FROM safety_incidents ORDER BY created_at DESC LIMIT 20`
      ).catch(() => ({ rows: [] }));
      const weather = await pool.query(
        `SELECT * FROM weather_alerts ORDER BY created_at DESC LIMIT 20`
      ).catch(() => ({ rows: [] }));
      const market = await pool.query(
        `SELECT * FROM market_prices ORDER BY created_at DESC LIMIT 20`
      ).catch(() => ({ rows: [] }));

      const systemPrompt = `You are a multi-agent forestry orchestrator. Coordinate three agents:
1. HarvestAgent — schedules cuts based on yield + market.
2. RoutingAgent — sequences equipment moves to minimize fuel + soil compaction.
3. ComplianceAgent — verifies buffer zones, permits, wildlife windows.
Return STRICT JSON.`;

      const userPrompt = `Region: ${region || 'unspecified'}
Horizon (days): ${horizon_days}
User constraints: ${JSON.stringify(constraints)}
Recent safety incidents: ${JSON.stringify(incidents.rows.slice(0, 5))}
Recent weather alerts: ${JSON.stringify(weather.rows.slice(0, 5))}
Recent market prices: ${JSON.stringify(market.rows.slice(0, 5))}

Return JSON:
{
  "plan_summary": "...",
  "harvest_agent": { "schedule": [{ "block_id": "string", "day_offset": 0, "species": "string", "volume_m3": 0 }], "rationale": "string" },
  "routing_agent": { "equipment_moves": [{ "asset": "string", "from": "string", "to": "string", "day_offset": 0 }], "rationale": "string" },
  "compliance_agent": { "checks": [{ "rule": "string", "status": "pass|warn|fail", "note": "string" }], "blockers": ["..."] },
  "coordination_conflicts": ["..."],
  "next_actions": ["..."],
  "disclaimer": "AI-generated plan; verify with licensed forester."
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      const parsed = parseJSON(raw);

      try {
        await pool.query(
          `INSERT INTO ai_results (user_id, entity_type, analysis_type, model, raw_response, parsed_data)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.user.id || null, 'forest_plan', 'agentic_planning',
           process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
           raw, JSON.stringify(parsed)]
        );
      } catch (_) {}

      res.json({ region, horizon_days, plan: parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agentic-forest-plan/history - last 20 agentic plans
  router.get('/history', auth, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT id, analysis_type, parsed_data, created_at FROM ai_results
         WHERE analysis_type = 'agentic_planning' ORDER BY created_at DESC LIMIT 20`
      ).catch(() => ({ rows: [] }));
      res.json(r.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
