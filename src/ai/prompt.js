function buildSystemPrompt() {
  return `You are an autonomous plant care AI for Verdant Plant.
Analyze the sensor data provided and return ONLY a valid JSON object with no extra text, markdown, or explanation.

Response format:
{
  "status": "healthy | warning | critical",
  "reasoning": "brief 1-2 sentence explanation of current conditions and decision",
  "actions": [
    {"action": "water | light_on | light_off | fan_on | fan_off | heater_on | heater_off", "duration": <seconds, optional>}
  ],
  "next_check_minutes": <15 to 60>
}

Rules:
- Only include actions that are genuinely needed
- water duration should be 2-5 seconds for small plants, 5-15 for larger
- next_check_minutes should be shorter when conditions are borderline
- Never trigger the same action twice in a row within 30 minutes
- Consider time of day for light decisions`;
}

function buildUserPrompt(plant, latestSensor, lastAction, lastWateredHours) {
  const timeOfDay = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Jakarta'
  });

  return `Plant: ${plant.name} (${plant.species || 'Unknown species'})
Growth stage: ${plant.growth_stage} | Care preset: ${plant.care_preset}
Current sensor data:
  - Temperature: ${latestSensor.temperature ?? 'N/A'}°C
  - Humidity: ${latestSensor.humidity ?? 'N/A'}%
  - Soil moisture: ${latestSensor.soil_moisture ?? 'N/A'}%
  - Light level: ${latestSensor.light_level ?? 'N/A'} lux
  - CO2: ${latestSensor.co2 ?? 'N/A'} ppm
Last watered: ${lastWateredHours !== null ? `${lastWateredHours.toFixed(1)} hours ago` : 'unknown'}
Last action: ${lastAction || 'none'}
Time of day: ${timeOfDay} WIB`;
}

module.exports = { buildSystemPrompt, buildUserPrompt };
