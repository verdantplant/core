const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const { analyzePlant } = require('../ai/analyzer');
const { publishAction } = require('../mqtt/publisher');

// GET /plants
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('plants').select('*').order('created_at');
    if (error) throw error;
    res.json({ plants: data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /plants
router.post('/', async (req, res) => {
  try {
    const { name, species, growth_stage, care_preset } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const plantId = crypto.randomUUID();
    const { data, error } = await supabase.from('plants').insert({
      id: plantId,
      name,
      species: species || null,
      growth_stage: growth_stage || 'vegetative',
      care_preset: care_preset || 'tropical',
      mqtt_topic: `verdantplant/${plantId}/sensors`,
    }).select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /plants/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('plants')
      .select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Plant not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /plants/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('plants').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /plants/:id/sensors
router.get('/:id/sensors', async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    let query = supabase.from('sensor_readings')
      .select('*').eq('plant_id', req.params.id)
      .order('recorded_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 1000));
    if (from) query = query.gte('recorded_at', from);
    if (to) query = query.lte('recorded_at', to);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ readings: data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /plants/:id/sensors — HTTP alternative to MQTT
router.post('/:id/sensors', async (req, res) => {
  try {
    const { temperature, humidity, soilMoisture, lightLevel, co2 } = req.body;
    const { data, error } = await supabase.from('sensor_readings').insert({
      plant_id: req.params.id,
      temperature, humidity,
      soil_moisture: soilMoisture,
      light_level: lightLevel,
      co2,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /plants/:id/actions
router.post('/:id/actions', async (req, res) => {
  try {
    const { action, duration, level } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });

    await publishAction(req.params.id, action, duration);
    await supabase.from('actions_log').insert({
      plant_id: req.params.id,
      action_type: action,
      duration: duration || null,
      triggered_by: 'manual',
    });
    res.json({ success: true, action, duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /plants/:id/analyze
router.post('/:id/analyze', async (req, res) => {
  try {
    const result = await analyzePlant(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /plants/:id/logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { data, error } = await supabase.from('actions_log')
      .select('*').eq('plant_id', req.params.id)
      .order('executed_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) throw error;
    res.json({ logs: data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
