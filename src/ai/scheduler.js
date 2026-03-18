const supabase = require('../db/client');
const { analyzePlant } = require('./analyzer');

// Track last analysis time per plant in memory
const lastAnalysisTime = new Map();
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function scheduleAnalysis(plantId) {
  const now = Date.now();
  const lastTime = lastAnalysisTime.get(plantId) || 0;

  // Get last analysis interval from DB
  const { data: lastAnalysis } = await supabase
    .from('ai_analyses').select('created_at')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false }).limit(1);

  const lastAnalysisMs = lastAnalysis && lastAnalysis.length > 0
    ? new Date(lastAnalysis[0].created_at).getTime()
    : 0;

  const elapsed = now - Math.max(lastTime, lastAnalysisMs);

  if (elapsed >= DEFAULT_INTERVAL_MS) {
    console.log(`[Scheduler] Triggering analysis for plant ${plantId}`);
    lastAnalysisTime.set(plantId, now);
    await analyzePlant(plantId);
  } else {
    const remainingMin = Math.round((DEFAULT_INTERVAL_MS - elapsed) / 60000);
    console.log(`[Scheduler] Plant ${plantId} — next analysis in ${remainingMin} min`);
  }
}

module.exports = { scheduleAnalysis };
