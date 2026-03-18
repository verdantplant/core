require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Start MQTT listener
require('../mqtt/listener');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/plants', require('./plants'));
app.use('/treasury', require('./treasury'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'verdantplant-core', version: '0.1.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] Verdant Plant Core running on port ${PORT}`);
});
