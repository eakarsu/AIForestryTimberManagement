// Buyer-demand matching: predictive marketplace pairing harvested timber to
// sawmills, paper mills, biomass plants with bid optimization.
// Audit: batch_04.md / AIForestryTimberManagement / Custom Feature Suggestions #3
const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function buyerDemandMatcherRoutes(pool) {
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
        'X-Title': 'AI Forestry - Buyer Demand Matcher'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000
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

  // POST /api/buyer-demand/match - given a parcel, recommend buyers + bids
  router.post('/match', auth, async (req, res) => {
    try {
      const { species, volume_m3, grade, location, ready_date } = req.body || {};
      if (!species || !volume_m3) {
        return res.status(400).json({ error: 'species and volume_m3 required' });
      }

      const prices = await pool.query(
        `SELECT * FROM market_prices WHERE species = $1 ORDER BY created_at DESC LIMIT 10`,
        [species]
      ).catch(() => ({ rows: [] }));

      const systemPrompt = `You are a timber marketplace optimizer. Match harvested timber to buyer categories
(sawmills, paper mills, biomass plants, OSB/plywood, exporters). Recommend optimal bid prices and timing.
Return STRICT JSON only.`;

      const userPrompt = `Parcel details:
Species: ${species}
Volume (m^3): ${volume_m3}
Grade: ${grade || 'unspecified'}
Location: ${location || 'unspecified'}
Ready date: ${ready_date || 'flexible'}

Recent market prices: ${JSON.stringify(prices.rows.slice(0, 5))}

Return JSON:
{
  "summary": "...",
  "buyer_recommendations": [
    {
      "buyer_type": "sawmill|paper_mill|biomass|exporter|osb",
      "fit_score": 0,
      "expected_bid_per_m3_usd": 0,
      "rationale": "string",
      "delivery_radius_km_max": 0,
      "contract_terms_to_request": ["..."]
    }
  ],
  "optimal_bid_strategy": "spot|sealed|auction|forward_contract",
  "timing_advice": "string",
  "price_sensitivity_analysis": [{ "scenario": "string", "expected_delta_pct": 0 }],
  "risks": ["..."],
  "disclaimer": "Market estimates only; verify with brokers."
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      const parsed = parseJSON(raw);

      try {
        await pool.query(
          `INSERT INTO ai_results (user_id, entity_type, analysis_type, model, raw_response, parsed_data)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.user.id || null, 'parcel', 'buyer_demand_match',
           process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
           raw, JSON.stringify(parsed)]
        );
      } catch (_) {}

      res.json({ parcel: { species, volume_m3, grade, location, ready_date }, recommendations: parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/buyer-demand/recent - last 20 match runs
  router.get('/recent', auth, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT id, parsed_data, created_at FROM ai_results
         WHERE analysis_type = 'buyer_demand_match' ORDER BY created_at DESC LIMIT 20`
      ).catch(() => ({ rows: [] }));
      res.json(r.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
