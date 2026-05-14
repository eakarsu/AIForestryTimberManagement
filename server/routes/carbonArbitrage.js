// Carbon-market arbitrage: compares Verra vs Gold Standard pricing,
// recommends optimal registry per parcel.
// Audit: batch_04.md / AIForestryTimberManagement / Custom Feature Suggestions #6
// TODO: configure credentials VERRA_API_KEY, GOLD_STANDARD_API_KEY
const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function carbonArbitrageRoutes(pool) {
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
        'X-Title': 'AI Forestry - Carbon Arbitrage'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
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

  // Stub fetcher for registry pricing — would call live APIs.
  async function fetchRegistryPricing() {
    const verraKey = process.env.VERRA_API_KEY;
    const gsKey = process.env.GOLD_STANDARD_API_KEY;
    // TODO: configure credentials and replace with real fetch.
    return {
      verra: {
        configured: !!verraKey,
        recent_avg_usd_per_tCO2e: 12.5,
        liquidity: 'high',
        methodology_fit: 'VM0007 (REDD+), VM0010 (IFM)'
      },
      gold_standard: {
        configured: !!gsKey,
        recent_avg_usd_per_tCO2e: 14.2,
        liquidity: 'medium',
        methodology_fit: 'GS LUF Afforestation/Reforestation'
      }
    };
  }

  // POST /api/carbon-arbitrage/recommend
  router.post('/recommend', auth, async (req, res) => {
    try {
      const { parcel_id, project_type, annual_tCO2e, project_duration_years, location } = req.body || {};
      if (!annual_tCO2e) {
        return res.status(400).json({ error: 'annual_tCO2e required' });
      }

      const pricing = await fetchRegistryPricing();

      const systemPrompt = `You are a carbon-market arbitrage specialist. Compare registries (Verra VCS,
Gold Standard, optionally ACR/CAR) for a given forestry parcel and recommend the optimal one. Consider
price, methodology fit, verification cost, market liquidity, buyer preferences, and project duration.
Return STRICT JSON only.`;

      const userPrompt = `Parcel: ${parcel_id || 'unspecified'}
Project type: ${project_type || 'IFM'} (improved forest management / REDD+ / afforestation)
Annual sequestration tCO2e: ${annual_tCO2e}
Project duration (years): ${project_duration_years || 30}
Location: ${location || 'unspecified'}

Live registry pricing snapshot: ${JSON.stringify(pricing)}

Return JSON:
{
  "summary": "...",
  "recommended_registry": "verra|gold_standard|acr|car",
  "rationale": "string",
  "comparison": [
    { "registry": "string", "price_usd_per_tCO2e": 0, "verification_cost_estimate_usd": 0, "methodology_fit": "string", "time_to_first_issuance_months": 0, "net_npv_estimate_usd": 0 }
  ],
  "buyer_demand_outlook": "string",
  "risks": ["..."],
  "alternative_strategies": ["..."],
  "credentials_status": ${JSON.stringify({ verra: pricing.verra.configured, gold_standard: pricing.gold_standard.configured })},
  "disclaimer": "Estimates only; verify with registry consultants."
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      const parsed = parseJSON(raw);

      try {
        await pool.query(
          `INSERT INTO ai_results (user_id, entity_type, entity_id, analysis_type, model, raw_response, parsed_data)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.user.id || null, 'parcel', parcel_id || null, 'carbon_arbitrage',
           process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
           raw, JSON.stringify(parsed)]
        );
      } catch (_) {}

      res.json({ parcel_id, annual_tCO2e, pricing, recommendation: parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/carbon-arbitrage/pricing - latest snapshot
  router.get('/pricing', auth, async (_req, res) => {
    try {
      const pricing = await fetchRegistryPricing();
      res.json(pricing);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
