const express = require('express');
const router = express.Router();
const supabase = require('../db/client');

// GET /treasury — public endpoint
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('treasury_log').select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const inflows = data.filter(t => t.type === 'inflow');
    const outflows = data.filter(t => t.type === 'outflow');
    const totalIn = inflows.reduce((sum, t) => sum + (t.amount_usd || 0), 0);
    const totalOut = outflows.reduce((sum, t) => sum + (t.amount_usd || 0), 0);

    res.json({
      balance_usd: parseFloat((totalIn - totalOut).toFixed(2)),
      total_inflow_usd: parseFloat(totalIn.toFixed(2)),
      total_outflow_usd: parseFloat(totalOut.toFixed(2)),
      wallet_address: process.env.TREASURY_WALLET || 'TBD',
      solana_explorer: process.env.TREASURY_WALLET
        ? `https://solana.fm/address/${process.env.TREASURY_WALLET}`
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /treasury/transactions — public endpoint
router.get('/transactions', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { data, error } = await supabase
      .from('treasury_log').select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) throw error;
    res.json({ transactions: data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
