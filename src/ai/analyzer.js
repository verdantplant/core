require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../db/client');
const { publishAction } = require('../mqtt/publisher');
const { buildSystemPrompt, buildUserPrompt } = require('./prompt');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzePlant(plantId) {
  try {
    console.log(`[AI] Starting analysis for plant ${plantId}`);

    // Fetch plant profile
    const { data: plant, error: plantErr } = await supabase
      .from('plants').select('*').eq('id', plantId).single();
    if (plantErr || !plant) throw new Error(`Plant not found: ${plantId}`);

    // Fetch latest sensor reading
    const { data: sensors } = await supabase
      .from('sensor_readings')
      .select('*').eq('plant_id', plantId)
      .order('recorded_at', { ascending: false }).limit(1);
    if (!sensors || sensors.length === 0) {
      console.log(`[AI] No sensor data for plant ${plantId}, skipping`);
      return;
    }

    // Fetch last watering time
    const { data: lastWater } = await supabase
      .from('actions_log')
      .select('executed_at').eq('plant_id', plantId).eq('action_type', 'water')
      .order('executed_at', { ascending: false }).limit(1);

    const lastWateredHours = lastWater && lastWater.length > 0
      ? (Date.now() - new Date(lastWater[0].executed_at).getTime()) / 3600000
      : null;

    // Fetch last action
    const { data: lastActionRow } = await supabase
      .from('actions_log').select('action_type, executed_at')
      .eq('plant_id', plantId).order('executed_at', { ascending: false }).limit(1);
    const lastAction = lastActionRow && lastActionRow.length > 0
      ? `${lastActionRow[0].action_type} (${new Date(lastActionRow[0].executed_at).toLocaleTimeString()})`
      : null;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(plant, sensors[0], lastAction, lastWateredHours) }],
    });

    const rawText = response.content[0].text.trim();
    const result = JSON.parse(rawText);

    console.log(`[AI] Analysis result for ${plant.name}:`, result);

    // Save analysis to DB
    await supabase.from('ai_analyses').insert({
      plant_id: plantId,
      status: result.status,
      reasoning: result.reasoning,
      actions_taken: result.actions || [],
      raw_response: rawText,
    });

    // Execute actions
    if (result.actions && result.actions.length > 0) {
      for (const action of result.actions) {
        await publishAction(plantId, action.action, action.duration);
        await supabase.from('actions_log').insert({
          plant_id: plantId,
          action_type: action.action,
          duration: action.duration || null,
          triggered_by: 'ai',
        });
        // Small delay between actions
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return result;

  } catch (err) {
    console.error(`[AI] Analysis error for plant ${plantId}:`, err.message);
    throw err;
  }
}

module.exports = { analyzePlant };
