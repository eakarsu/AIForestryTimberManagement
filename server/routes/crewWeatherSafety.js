const express = require('express');
const router = express.Router();

router.post('/brief', (req, res) => {
  const body = req.body || {};
  const wind = Number(body.wind_mph || 0);
  const heat = Number(body.heat_index_f || 70);
  const slope = Number(body.slope_pct || 0);
  const chainsaw = Number(body.chainsaw_crews || 0);
  const score = Math.min(100, Math.round(wind * 1.8 + Math.max(0, heat - 85) * 2 + slope * 0.8 + chainsaw * 4));
  res.json({
    block: body.block || 'harvest block',
    safety_score: score,
    band: score >= 70 ? 'stand-down review' : score >= 40 ? 'heightened controls' : 'normal controls',
    controls: [
      wind > 20 ? 'Pause felling near snags and edge trees.' : 'Wind does not trigger felling pause.',
      heat > 90 ? 'Add heat-rest cycle and water check.' : 'Standard hydration cadence.',
      slope > 35 ? 'Require slope egress briefing before shift.' : 'Slope controls standard.',
    ],
    generated_at: new Date().toISOString(),
  });
});

module.exports = router;
