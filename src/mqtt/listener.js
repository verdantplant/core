require('dotenv').config();
const mqtt = require('mqtt');
const supabase = require('../db/client');
const { scheduleAnalysis } = require('../ai/scheduler');

const BROKER_URL = process.env.MQTT_BROKER_URL;
const USERNAME   = process.env.MQTT_USERNAME;
const PASSWORD   = process.env.MQTT_PASSWORD;

if (!BROKER_URL) {
  console.error('[MQTT] ERROR: MQTT_BROKER_URL is not set. Check your environment variables.');
  process.exit(1);
}

console.log(`[MQTT] Connecting to ${BROKER_URL}`);

const client = mqtt.connect(BROKER_URL, {
  username: USERNAME,
  password: PASSWORD,
  reconnectPeriod: 5000,
  keepalive: 60,
  rejectUnauthorized: false,
});

client.on('connect', () => {
  console.log('[MQTT] Connected to broker');
  client.subscribe('verdantplant/+/sensors', (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
    else console.log('[MQTT] Subscribed to verdantplant/+/sensors');
  });
});

client.on('message', async (topic, message) => {
  try {
    const plantId = topic.split('/')[1];
    const data = JSON.parse(message.toString());

    console.log(`[MQTT] Data received for plant ${plantId}:`, data);

    // Save sensor reading to Supabase
    const { error } = await supabase.from('sensor_readings').insert({
      plant_id: plantId,
      temperature: data.temperature || null,
      humidity: data.humidity || null,
      soil_moisture: data.soilMoisture || null,
      light_level: data.lightLevel || null,
      co2: data.co2 || null,
    });

    if (error) {
      console.error('[DB] Insert error:', error.message);
      return;
    }

    // Trigger AI analysis check
    await scheduleAnalysis(plantId);

  } catch (err) {
    console.error('[MQTT] Message parse error:', err.message);
  }
});

client.on('error', (err) => {
  console.error('[MQTT] Connection error:', err.message);
});

client.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

module.exports = client;
