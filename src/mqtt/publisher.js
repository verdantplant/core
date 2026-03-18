const mqttClient = require('./listener');

async function publishAction(plantId, action, duration = null) {
  const topic = `verdantplant/${plantId}/actions`;
  const payload = JSON.stringify({
    action,
    ...(duration && { duration }),
    timestamp: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Publish error for ${plantId}:`, err.message);
        reject(err);
      } else {
        console.log(`[MQTT] Action published to ${topic}:`, payload);
        resolve();
      }
    });
  });
}

module.exports = { publishAction };
